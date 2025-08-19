import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function POST() {
  try {
    console.log('🔧 Creating stripe_transactions table...');

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
      DROP TRIGGER IF EXISTS update_stripe_transactions_updated_at ON stripe_transactions
    `);

    await query(`
      CREATE TRIGGER update_stripe_transactions_updated_at
      BEFORE UPDATE ON stripe_transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log('✅ stripe_transactions table created successfully');

    return jsonResponse({
      success: true,
      message: 'stripe_transactions table created successfully',
      note: 'orders table already has Stripe columns, customer_payment_methods table already exists'
    });

  } catch (error) {
    console.error('❌ Failed to create stripe_transactions table:', error);
    return internalServerErrorResponse(`stripe_transactions migration failed: ${error.message}`);
  }
}