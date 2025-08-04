import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function GET() {
	try {
		console.log('🔗 Debugging database schema...');

		// Check what's in the products table
		const productsQuery = `
			SELECT id, name, price, created_at 
			FROM products 
			WHERE tenant_id = $1 
			LIMIT 5
		`;
		
		const productsResult = await query(productsQuery, [DEFAULT_TENANT_ID]);
		console.log('Products found:', productsResult.rows.length);

		// Check what's in the inventory table
		const inventoryQuery = `
			SELECT id, product_id, quantity, color, size 
			FROM inventory 
			WHERE tenant_id = $1 
			LIMIT 5
		`;
		
		const inventoryResult = await query(inventoryQuery, [DEFAULT_TENANT_ID]);
		console.log('Inventory items found:', inventoryResult.rows.length);

		// Check what's in the cart_items table
		const cartQuery = `
			SELECT id, product_id, quantity, variant_data 
			FROM cart_items 
			WHERE tenant_id = $1 AND user_id = $2
			LIMIT 5
		`;
		
		const cartResult = await query(cartQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		console.log('Cart items found:', cartResult.rows.length);

		// Check data types of product_id columns
		const schemaQuery = `
			SELECT 
				table_name, 
				column_name, 
				data_type, 
				is_nullable,
				column_default
			FROM information_schema.columns 
			WHERE table_name IN ('products', 'inventory', 'cart_items', 'favorites') 
			AND column_name = 'product_id'
			ORDER BY table_name
		`;
		
		const schemaResult = await query(schemaQuery);

		return jsonResponse({
			success: true,
			products: productsResult.rows,
			inventory: inventoryResult.rows,
			cart: cartResult.rows,
			schema: schemaResult.rows,
			constants: {
				DEFAULT_TENANT_ID,
				DEFAULT_MOBILE_USER_ID
			}
		});

	} catch (error) {
		console.error('❌ Error debugging database:', error);
		return internalServerErrorResponse('Failed to debug database: ' + error.message);
	}
}