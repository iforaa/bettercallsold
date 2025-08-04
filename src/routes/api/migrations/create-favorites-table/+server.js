import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function POST() {
	try {
		console.log('Creating favorites table...');

		// Create the favorites table
		const createTableQuery = `
			CREATE TABLE IF NOT EXISTS favorites (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				tenant_id UUID NOT NULL,
				user_id UUID NOT NULL,
				product_id UUID NOT NULL,
				inventory_id INTEGER,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(tenant_id, user_id, product_id, inventory_id)
			);
		`;

		await query(createTableQuery);
		console.log('✅ Favorites table created successfully');

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
			message: 'Favorites table and indexes created successfully'
		});

	} catch (error) {
		console.error('❌ Error creating favorites table:', error);
		return internalServerErrorResponse('Failed to create favorites table');
	}
}