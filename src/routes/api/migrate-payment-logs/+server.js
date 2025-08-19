import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function POST() {
  try {
    // Create payment_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'usd',
        status VARCHAR(50) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_payment_logs_tenant_id 
      ON payment_logs(tenant_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_payment_logs_status 
      ON payment_logs(status)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at 
      ON payment_logs(created_at)
    `);

    console.log('✅ Payment logs table created successfully');

    return jsonResponse({
      success: true,
      message: 'Payment logs table created successfully'
    });

  } catch (error) {
    console.error('❌ Failed to create payment logs table:', error);
    return internalServerErrorResponse(`Database migration failed: ${error.message}`);
  }
}