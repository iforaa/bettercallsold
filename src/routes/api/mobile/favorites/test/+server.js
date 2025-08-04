import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function POST() {
	try {
		console.log('🔗 Testing favorites table with direct insert...');

		// Test inserting a simple favorite record
		const insertQuery = `
			INSERT INTO favorites (tenant_id, user_id, product_id)
			VALUES ($1, $2, $3)
			RETURNING id, product_id, created_at
		`;
		
		const result = await query(insertQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID, '123']);
		
		console.log('✅ Test favorite inserted successfully:', result.rows[0]);

		// Now test reading it back
		const selectQuery = `
			SELECT * FROM favorites 
			WHERE tenant_id = $1 AND user_id = $2
		`;
		
		const selectResult = await query(selectQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		console.log('✅ Test favorite read back:', selectResult.rows);

		return jsonResponse({
			success: true,
			message: 'Favorites table test successful',
			inserted: result.rows[0],
			allFavorites: selectResult.rows
		});

	} catch (error) {
		console.error('❌ Error testing favorites table:', error);
		return internalServerErrorResponse('Failed to test favorites table: ' + error.message);
	}
}