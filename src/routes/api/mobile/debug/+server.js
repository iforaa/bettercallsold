import { query } from '$lib/database.js';
import { jsonResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
	try {
		const productId = url.searchParams.get('product_id') || '88888888-8888-8888-8888-888888888888';
		
		// Test direct query - support both product structures
		const result = await query(`
			SELECT 
				COALESCE(p_new.id, p_old.id) as id,
				COALESCE(p_new.title, p_old.name) as name,
				COALESCE(p_old.inventory_count, 0) as inventory_count,
				COALESCE(p_old.variants, '[]') as variants,
				CASE WHEN p_new.id IS NOT NULL THEN 'new' ELSE 'old' END as table_source
			FROM products_new p_new
			FULL OUTER JOIN products_old p_old ON p_new.id = p_old.id
			WHERE (p_new.id = $1 OR p_old.id = $1) 
			AND (p_new.tenant_id = $2 OR p_old.tenant_id = $2)
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