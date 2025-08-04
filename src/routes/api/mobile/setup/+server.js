import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function POST() {
	try {
		// Ensure waitlist table exists with all required columns
		await query(`
			CREATE TABLE IF NOT EXISTS waitlist (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				tenant_id UUID NOT NULL,
				user_id UUID,
				product_id UUID,
				inventory_id INTEGER,
				order_source INTEGER DEFAULT 0,
				comment_id TEXT,
				instagram_comment_id TEXT,
				card_id TEXT,
				authorized_at TIMESTAMP,
				coupon_id TEXT,
				local_pickup BOOLEAN DEFAULT false,
				location_id TEXT,
				position INTEGER,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Create indexes for better performance
		await query(`
			CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_id ON waitlist(tenant_id);
		`);
		
		await query(`
			CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON waitlist(user_id);
		`);
		
		await query(`
			CREATE INDEX IF NOT EXISTS idx_waitlist_product_id ON waitlist(product_id);
		`);

		return jsonResponse({
			message: 'Mobile API database setup completed successfully',
			tables_created: ['waitlist'],
			indexes_created: [
				'idx_waitlist_tenant_id',
				'idx_waitlist_user_id',
				'idx_waitlist_product_id'
			],
			note: 'cart_items and users tables already exist'
		});
	} catch (error) {
		console.error('Mobile API setup error:', error);
		return internalServerErrorResponse('Failed to setup mobile API database');
	}
}