import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function GET() {
	try {
		// Get total count of items in cart for the mobile user (count items, not sum quantities)
		const countQuery = `
			SELECT COUNT(*) as count
			FROM cart_items 
			WHERE tenant_id = $1 AND user_id = $2
		`;
		
		const result = await query(countQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		const count = parseInt(result.rows[0].count) || 0;
		
		return jsonResponse({ count });
	} catch (error) {
		console.error('Get cart count error:', error);
		return internalServerErrorResponse('Failed to get cart count');
	}
}