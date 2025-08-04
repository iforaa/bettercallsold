import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function POST() {
	try {
		console.log('Updating favorites table...');

		// Drop the existing favorites table
		await query('DROP TABLE IF EXISTS favorites CASCADE;');
		console.log('✅ Dropped existing favorites table');

		// Create the new favorites table without inventory_id
		const createTableQuery = `
			CREATE TABLE IF NOT EXISTS favorites (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				tenant_id UUID NOT NULL,
				user_id UUID NOT NULL,
				product_id UUID NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(tenant_id, user_id, product_id)
			);
		`;

		await query(createTableQuery);
		console.log('✅ Favorites table recreated successfully');

		// Create indexes for better performance
		const indexQueries = [
			'CREATE INDEX IF NOT EXISTS idx_favorites_tenant_id ON favorites(tenant_id);',
			'CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);',
			'CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);',
			'CREATE INDEX IF NOT EXISTS idx_favorites_tenant_user ON favorites(tenant_id, user_id);'
		];

		for (const indexQuery of indexQueries) {
			await query(indexQuery);
		}
		console.log('✅ Favorites table indexes created successfully');

		return jsonResponse({
			success: true,
			message: 'Favorites table updated successfully (removed inventory_id, using UUID for product_id)'
		});

	} catch (error) {
		console.error('❌ Error updating favorites table:', error);
		return internalServerErrorResponse('Failed to update favorites table');
	}
}