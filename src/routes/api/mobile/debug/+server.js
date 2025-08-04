import { query } from '$lib/database.js';
import { jsonResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
	try {
		const productId = url.searchParams.get('product_id') || '88888888-8888-8888-8888-888888888888';
		
		// Test direct query
		const result = await query(`
			SELECT id, name, inventory_count, variants 
			FROM products 
			WHERE id = $1 AND tenant_id = $2
		`, [productId, DEFAULT_TENANT_ID]);
		
		return jsonResponse({
			product_id: productId,
			tenant_id: DEFAULT_TENANT_ID,
			query_result: result.rows[0] || null,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return jsonResponse({
			error: error.message,
			timestamp: new Date().toISOString()
		});
	}
}