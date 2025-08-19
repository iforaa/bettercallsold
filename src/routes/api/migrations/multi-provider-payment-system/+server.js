import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

/**
 * Migration: Multi-Provider Payment System
 * 
 * This migration transforms the payment system from Stripe-only to support
 * multiple payment providers (Stripe, PayPal, Klarna, etc.)
 */
export async function POST() {
  try {
    console.log('🚀 Starting Multi-Provider Payment System migration...');

    // Begin transaction for atomic migration
    await query('BEGIN');

    try {
      // ==========================================
      // STEP 1: Create provider-agnostic tables
      // ==========================================
      
      console.log('📋 Step 1: Creating provider-agnostic payment tables...');

      // Create payment_providers table
      await query(`
        CREATE TABLE IF NOT EXISTS payment_providers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          provider_name VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'klarna'
          provider_config JSONB NOT NULL DEFAULT '{}', -- Provider-specific configuration
          is_enabled BOOLEAN DEFAULT true,
          is_test_mode BOOLEAN DEFAULT true,
          supported_methods TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['card', 'apple_pay', 'google_pay']
          supported_currencies TEXT[] DEFAULT ARRAY['usd']::TEXT[],
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT fk_payment_providers_tenant 
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT unique_tenant_provider 
            UNIQUE (tenant_id, provider_name)
        )
      `);

      // Create indexes for payment_providers
      await query(`CREATE INDEX IF NOT EXISTS idx_payment_providers_tenant_id ON payment_providers(tenant_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_payment_providers_name ON payment_providers(provider_name)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_payment_providers_enabled ON payment_providers(is_enabled)`);

      // Create payment_transactions table (replaces stripe_transactions)
      await query(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          order_id UUID,
          payment_provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'klarna'
          provider_payment_id VARCHAR(255) NOT NULL, -- Provider's payment/transaction ID
          provider_customer_id VARCHAR(255), -- Provider's customer ID
          amount_cents INTEGER NOT NULL,
          currency VARCHAR(3) DEFAULT 'usd',
          status VARCHAR(50) NOT NULL, -- 'pending', 'succeeded', 'failed', 'canceled', 'refunded'
          payment_method_type VARCHAR(50), -- 'card', 'apple_pay', 'paypal', 'klarna_pay_later'
          failure_reason TEXT,
          provider_data JSONB DEFAULT '{}', -- Full provider response data
          metadata JSONB DEFAULT '{}', -- Custom metadata
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT fk_payment_transactions_tenant 
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT fk_payment_transactions_order 
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          CONSTRAINT unique_provider_payment 
            UNIQUE (payment_provider, provider_payment_id)
        )
      `);

      // Create indexes for payment_transactions
      await query(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id ON payment_transactions(tenant_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(payment_provider)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_payment_id ON payment_transactions(provider_payment_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC)`);

      // Create customer_payment_methods_v2 table (replaces customer_payment_methods)
      await query(`
        CREATE TABLE IF NOT EXISTS customer_payment_methods_v2 (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          user_id UUID NOT NULL,
          payment_provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'klarna'
          provider_customer_id VARCHAR(255), -- Provider's customer ID
          provider_payment_method_id VARCHAR(255) NOT NULL, -- Provider's payment method ID
          payment_method_type VARCHAR(50) NOT NULL, -- 'card', 'paypal', 'bank_account'
          display_name VARCHAR(255), -- "Visa ****1234" or "PayPal john@example.com"
          card_brand VARCHAR(50), -- For card payments only
          card_last4 VARCHAR(4), -- For card payments only
          card_exp_month INTEGER, -- For card payments only
          card_exp_year INTEGER, -- For card payments only
          is_default BOOLEAN DEFAULT false,
          provider_data JSONB DEFAULT '{}', -- Full provider payment method data
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT fk_customer_payment_methods_v2_tenant 
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT fk_customer_payment_methods_v2_user 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT unique_provider_payment_method 
            UNIQUE (payment_provider, provider_payment_method_id)
        )
      `);

      // Create indexes for customer_payment_methods_v2
      await query(`CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_v2_tenant_id ON customer_payment_methods_v2(tenant_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_v2_user_id ON customer_payment_methods_v2(user_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_v2_provider ON customer_payment_methods_v2(payment_provider)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_v2_provider_customer ON customer_payment_methods_v2(provider_customer_id)`);

      // ==========================================
      // STEP 2: Extend orders table for multi-provider support
      // ==========================================
      
      console.log('📋 Step 2: Extending orders table for multi-provider support...');

      // Add new provider-agnostic columns to orders table
      const orderColumns = [
        { name: 'payment_provider', type: 'VARCHAR(50)', comment: 'Payment provider used (stripe, paypal, klarna)' },
        { name: 'provider_payment_id', type: 'VARCHAR(255)', comment: 'Provider-specific payment ID' },
        { name: 'provider_customer_id', type: 'VARCHAR(255)', comment: 'Provider-specific customer ID' },
        { name: 'provider_data', type: 'JSONB DEFAULT \'{}\'', comment: 'Provider-specific data and metadata' }
      ];

      for (const column of orderColumns) {
        try {
          await query(`ALTER TABLE orders ADD COLUMN ${column.name} ${column.type}`);
          await query(`COMMENT ON COLUMN orders.${column.name} IS '${column.comment}'`);
          console.log(`✅ Added column: orders.${column.name}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`ℹ️ Column orders.${column.name} already exists`);
          } else {
            throw error;
          }
        }
      }

      // Create indexes for new columns
      await query(`CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON orders(payment_provider)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_orders_provider_payment_id ON orders(provider_payment_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_orders_provider_customer_id ON orders(provider_customer_id)`);

      // ==========================================
      // STEP 3: Migrate existing Stripe data
      // ==========================================
      
      console.log('📋 Step 3: Migrating existing Stripe data...');

      // Insert Stripe as a payment provider (for existing tenants with orders)
      await query(`
        INSERT INTO payment_providers (tenant_id, provider_name, provider_config, is_enabled, is_test_mode, supported_methods, supported_currencies)
        SELECT DISTINCT 
          o.tenant_id,
          'stripe' as provider_name,
          '{"api_version": "2024-09-30.acacia"}'::jsonb as provider_config,
          true as is_enabled,
          true as is_test_mode, -- Assume test mode for existing data
          ARRAY['card', 'apple_pay', 'google_pay'] as supported_methods,
          ARRAY['usd'] as supported_currencies
        FROM orders o 
        WHERE o.stripe_payment_intent_id IS NOT NULL
        ON CONFLICT (tenant_id, provider_name) DO NOTHING
      `);

      // Update orders table with provider information for existing Stripe orders
      await query(`
        UPDATE orders 
        SET 
          payment_provider = 'stripe',
          provider_payment_id = stripe_payment_intent_id,
          provider_customer_id = stripe_customer_id,
          provider_data = jsonb_build_object(
            'stripe_payment_intent_id', stripe_payment_intent_id,
            'stripe_customer_id', stripe_customer_id,
            'migrated_from_stripe', true,
            'migration_date', CURRENT_TIMESTAMP
          )
        WHERE stripe_payment_intent_id IS NOT NULL
          AND payment_provider IS NULL
      `);

      // Migrate stripe_transactions to payment_transactions
      await query(`
        INSERT INTO payment_transactions (
          tenant_id, order_id, payment_provider, provider_payment_id, provider_customer_id,
          amount_cents, currency, status, payment_method_type, failure_reason, provider_data, metadata
        )
        SELECT 
          st.tenant_id,
          st.order_id,
          'stripe' as payment_provider,
          st.stripe_payment_intent_id as provider_payment_id,
          o.stripe_customer_id as provider_customer_id,
          st.amount_cents,
          st.currency,
          st.status,
          st.payment_method_type,
          st.failure_reason,
          jsonb_build_object(
            'stripe_charge_id', st.stripe_charge_id,
            'receipt_url', st.receipt_url,
            'original_stripe_data', true,
            'migrated_from', 'stripe_transactions'
          ) as provider_data,
          st.metadata
        FROM stripe_transactions st
        LEFT JOIN orders o ON st.order_id = o.id
        ON CONFLICT (payment_provider, provider_payment_id) DO NOTHING
      `);

      // Migrate customer_payment_methods to customer_payment_methods_v2
      await query(`
        INSERT INTO customer_payment_methods_v2 (
          tenant_id, user_id, payment_provider, provider_customer_id, provider_payment_method_id,
          payment_method_type, display_name, card_brand, card_last4, card_exp_month, card_exp_year,
          is_default, provider_data
        )
        SELECT 
          cpm.tenant_id,
          cpm.user_id,
          'stripe' as payment_provider,
          cpm.stripe_customer_id as provider_customer_id,
          cpm.stripe_payment_method_id as provider_payment_method_id,
          'card' as payment_method_type,
          CONCAT(INITCAP(cpm.card_brand), ' ****', cpm.card_last4) as display_name,
          cpm.card_brand,
          cpm.card_last4,
          cpm.card_exp_month,
          cpm.card_exp_year,
          cpm.is_default,
          jsonb_build_object(
            'migrated_from_stripe', true,
            'migration_date', CURRENT_TIMESTAMP
          ) as provider_data
        FROM customer_payment_methods cpm
        ON CONFLICT (payment_provider, provider_payment_method_id) DO NOTHING
      `);

      // ==========================================
      // STEP 4: Create Row Level Security policies
      // ==========================================
      
      console.log('📋 Step 4: Creating Row Level Security policies...');

      // Enable RLS and create policies for new tables
      const rlsTables = ['payment_providers', 'payment_transactions', 'customer_payment_methods_v2'];
      
      for (const tableName of rlsTables) {
        await query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
        
        await query(`
          DROP POLICY IF EXISTS tenant_isolation_${tableName} ON ${tableName}
        `);
        
        await query(`
          CREATE POLICY tenant_isolation_${tableName} ON ${tableName}
          USING (tenant_id::text = current_setting('app.current_tenant_id', true))
        `);
        
        console.log(`✅ Created RLS policy for ${tableName}`);
      }

      // ==========================================
      // STEP 5: Create updated_at triggers
      // ==========================================
      
      console.log('📋 Step 5: Creating updated_at triggers...');

      const triggerTables = ['payment_providers', 'payment_transactions', 'customer_payment_methods_v2'];
      
      for (const tableName of triggerTables) {
        await query(`
          CREATE OR REPLACE TRIGGER update_${tableName}_updated_at
          BEFORE UPDATE ON ${tableName}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
        
        console.log(`✅ Created updated_at trigger for ${tableName}`);
      }

      // ==========================================
      // STEP 6: Create migration summary
      // ==========================================
      
      // Get migration statistics
      const stats = await query(`
        SELECT 
          (SELECT COUNT(*) FROM payment_providers WHERE provider_name = 'stripe') as stripe_providers_created,
          (SELECT COUNT(*) FROM payment_transactions WHERE payment_provider = 'stripe') as stripe_transactions_migrated,
          (SELECT COUNT(*) FROM customer_payment_methods_v2 WHERE payment_provider = 'stripe') as stripe_payment_methods_migrated,
          (SELECT COUNT(*) FROM orders WHERE payment_provider = 'stripe') as orders_updated_with_provider
      `);

      const migrationStats = stats.rows[0];

      // Commit transaction
      await query('COMMIT');
      
      console.log('✅ Multi-Provider Payment System migration completed successfully!');
      console.log('📊 Migration Statistics:', migrationStats);

      return jsonResponse({
        success: true,
        message: 'Multi-Provider Payment System migration completed successfully',
        statistics: migrationStats,
        changes: [
          'Created payment_providers table for managing multiple payment providers',
          'Created payment_transactions table (replaces stripe_transactions)',
          'Created customer_payment_methods_v2 table (replaces customer_payment_methods)',
          'Extended orders table with provider-agnostic columns',
          'Migrated all existing Stripe data to new tables',
          'Created proper indexes for performance',
          'Added Row Level Security policies for tenant isolation',
          'Created updated_at triggers for data consistency'
        ],
        next_steps: [
          'Update application code to use new payment provider abstraction',
          'Test existing Stripe integration with new schema',
          'Implement additional payment providers (PayPal, Klarna)',
          'Gradually deprecate old Stripe-specific tables'
        ]
      });

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Multi-Provider Payment System migration failed:', error);
    return internalServerErrorResponse(`Migration failed: ${error.message}`);
  }
}