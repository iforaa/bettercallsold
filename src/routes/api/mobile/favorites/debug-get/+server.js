import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function GET() {
	try {
		console.log('🔗 Debug: Fetching favorites for user:', DEFAULT_MOBILE_USER_ID);

		// Simple query first
		const simpleFavoritesQuery = `
			SELECT 
				f.id as favorite_id,
				f.product_id,
				f.created_at
			FROM favorites f
			WHERE f.tenant_id = $1 AND f.user_id = $2
			ORDER BY f.created_at DESC
		`;

		const simpleResult = await query(simpleFavoritesQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		console.log('✅ Simple favorites query result:', simpleResult.rows);

		// Now try with product join
		const productJoinQuery = `
			SELECT 
				f.id as favorite_id,
				f.product_id,
				f.created_at,
				p.name as product_name,
				p.price
			FROM favorites f
			LEFT JOIN products p ON f.product_id = p.id AND f.tenant_id = p.tenant_id
			WHERE f.tenant_id = $1 AND f.user_id = $2
			ORDER BY f.created_at DESC
		`;

		const joinResult = await query(productJoinQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		console.log('✅ Product join query result:', joinResult.rows);

		return jsonResponse({
			success: true,
			simpleQuery: simpleResult.rows,
			joinQuery: joinResult.rows
		});

	} catch (error) {
		console.error('❌ Error in debug favorites:', error);
		return internalServerErrorResponse('Debug error: ' + error.message);
	}
}