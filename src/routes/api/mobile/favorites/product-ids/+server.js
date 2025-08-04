import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function GET() {
	try {
		console.log('🔗 Fetching favorite product IDs for user:', DEFAULT_MOBILE_USER_ID);

		// Get just the product IDs from favorites
		const productIdsQuery = `
			SELECT DISTINCT product_id 
			FROM favorites 
			WHERE tenant_id = $1 AND user_id = $2
			ORDER BY product_id
		`;

		const result = await query(productIdsQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		// Extract product IDs as array of strings (UUIDs)
		const productIds = result.rows.map(row => row.product_id);

		console.log('✅ Favorite product IDs fetched successfully:', productIds.length, 'items');

		return jsonResponse(productIds);

	} catch (error) {
		console.error('❌ Error fetching favorite product IDs:', error);
		return internalServerErrorResponse('Failed to fetch favorite product IDs');
	}
}