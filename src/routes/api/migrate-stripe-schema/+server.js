import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function POST() {
  try {
    console.log('🔧 Starting Stripe schema migration...');

    // Add Stripe-specific columns to orders table (check existence first)
    try {
      await query(`ALTER TABLE orders ADD COLUMN stripe_payment_intent_id VARCHAR(255)`);
      console.log('✅ Added stripe_payment_intent_id column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ stripe_payment_intent_id column already exists');
      } else {
        throw error;
      }
    }

    try {
      await query(`ALTER TABLE orders ADD COLUMN stripe_customer_id VARCHAR(255)`);
      console.log('✅ Added stripe_customer_id column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ stripe_customer_id column already exists');
      } else {
        throw error;
      }
    }

    try {
      await query(`ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending'`);
      console.log('✅ Added payment_status column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ payment_status column already exists');
      } else {
        throw error;
      }
    }

    // Create indexes for Stripe fields
    await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent 
      ON orders(stripe_payment_intent_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_stripe_customer 
      ON orders(stripe_customer_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
      ON orders(payment_status)
    `);

    // Create customer_payment_methods table for saved cards
    await query(`
      CREATE TABLE IF NOT EXISTS customer_payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        stripe_customer_id VARCHAR(255) NOT NULL,
        stripe_payment_method_id VARCHAR(255) NOT NULL,
        card_brand VARCHAR(50),
        card_last4 VARCHAR(4),
        card_exp_month INTEGER,
        card_exp_year INTEGER,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_customer_payment_methods_tenant 
          FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_customer_payment_methods_user 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for customer_payment_methods
    await query(`
      CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_tenant_id 
      ON customer_payment_methods(tenant_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_user_id 
      ON customer_payment_methods(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_stripe_customer 
      ON customer_payment_methods(stripe_customer_id)
    `);

    // Add tenant isolation policy for customer_payment_methods
    await query(`
      DROP POLICY IF EXISTS tenant_isolation_customer_payment_methods ON customer_payment_methods
    `);

    await query(`
      CREATE POLICY tenant_isolation_customer_payment_methods ON customer_payment_methods
      USING (tenant_id::text = current_setting('app.current_tenant_id', true))
    `);

    // Add updated_at trigger for customer_payment_methods
    await query(`
      CREATE TRIGGER IF NOT EXISTS update_customer_payment_methods_updated_at
      BEFORE UPDATE ON customer_payment_methods
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // Create stripe_transactions table for detailed transaction logging
    await query(`
      CREATE TABLE IF NOT EXISTS stripe_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        order_id UUID,
        stripe_payment_intent_id VARCHAR(255) NOT NULL,
        stripe_charge_id VARCHAR(255),
        amount_cents INTEGER NOT NULL,
        currency VARCHAR(3) DEFAULT 'usd',
        status VARCHAR(50) NOT NULL,
        payment_method_type VARCHAR(50),
        receipt_url TEXT,
        failure_reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_stripe_transactions_tenant 
          FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_stripe_transactions_order 
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for stripe_transactions
    await query(`
      CREATE INDEX IF NOT EXISTS idx_stripe_transactions_tenant_id 
      ON stripe_transactions(tenant_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_stripe_transactions_order_id 
      ON stripe_transactions(order_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_stripe_transactions_payment_intent 
      ON stripe_transactions(stripe_payment_intent_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_stripe_transactions_status 
      ON stripe_transactions(status)
    `);

    // Add tenant isolation policy for stripe_transactions
    await query(`
      DROP POLICY IF EXISTS tenant_isolation_stripe_transactions ON stripe_transactions
    `);

    await query(`
      CREATE POLICY tenant_isolation_stripe_transactions ON stripe_transactions
      USING (tenant_id::text = current_setting('app.current_tenant_id', true))
    `);

    // Add updated_at trigger for stripe_transactions
    await query(`
      CREATE TRIGGER IF NOT EXISTS update_stripe_transactions_updated_at
      BEFORE UPDATE ON stripe_transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log('✅ Stripe schema migration completed successfully');

    return jsonResponse({
      success: true,
      message: 'Stripe schema migration completed successfully',
      changes: [
        'Added stripe_payment_intent_id, stripe_customer_id, payment_status to orders table',
        'Created customer_payment_methods table for saved cards',
        'Created stripe_transactions table for detailed transaction logging',
        'Added all necessary indexes and constraints',
        'Added tenant isolation policies',
        'Added updated_at triggers'
      ]
    });

  } catch (error) {
    console.error('❌ Failed to migrate Stripe schema:', error);
    return internalServerErrorResponse(`Stripe schema migration failed: ${error.message}`);
  }
}