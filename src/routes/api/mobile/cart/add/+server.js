import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function POST({ request }) {
	try {
		const { product_id, inventory_id } = await request.json();
		
		if (!product_id || !inventory_id) {
			return badRequestResponse('Missing required fields: product_id, inventory_id');
		}

		// Get inventory record directly - this is the source of truth
		const inventoryQuery = `
			SELECT 
				i.id as inventory_id,
				i.product_id,
				i.quantity,
				i.color,
				i.size,
				i.price,
				p.name as product_name,
				p.price as product_price
			FROM inventory i
			LEFT JOIN products p ON i.product_id = p.id
			WHERE i.id = $1 AND i.tenant_id = $2
		`;
		
		const inventoryResult = await query(inventoryQuery, [inventory_id, DEFAULT_TENANT_ID]);
		
		if (inventoryResult.rows.length === 0) {
			return badRequestResponse('Inventory item not found');
		}
		
		const inventory = inventoryResult.rows[0];
		// Verify the product_id matches what was requested
		if (inventory.product_id !== product_id) {
			return badRequestResponse('Product ID mismatch');
		}
		
		const variantQuantity = inventory.quantity || 0;
		
		// If inventory quantity is 0 or less, add to waitlist instead
		if (variantQuantity <= 0) {
			// Add to waitlist using constant mobile user ID
			const waitlistQuery = `
				INSERT INTO waitlist (
					tenant_id, user_id, product_id, inventory_id, order_source, position
				) VALUES (
					$1, $2, $3, $4, 0, 1
				)
				RETURNING id
			`;
			
			const waitlistResult = await query(waitlistQuery, [
				DEFAULT_TENANT_ID,
				DEFAULT_MOBILE_USER_ID,
				product_id,
				inventory_id
			]);
			
			return jsonResponse({
				message: 'Added to Waitlist',
				waitlist_id: waitlistResult.rows[0].id,
				available_quantity: 0
			});
		}

		// Always add as new item to cart - each cart item should be unique with quantity 1
		{
			// Add new item to cart using constant mobile user ID
			const insertCartQuery = `
				INSERT INTO cart_items (
					tenant_id, user_id, product_id, quantity, variant_data
				) VALUES (
					$1, $2, $3, 1, $4
				)
				RETURNING id
			`;
			
			const variantData = JSON.stringify({
				inventory_id: inventory_id,
				size: inventory.size || 'One Size',
				color: inventory.color || 'Default',
				price: inventory.price || inventory.product_price || 0
			});
			
			const cartResult = await query(insertCartQuery, [
				DEFAULT_TENANT_ID, 
				DEFAULT_MOBILE_USER_ID,
				product_id, 
				variantData
			]);

			// Reduce inventory quantity by 1
			const updateInventoryQuery = `
				UPDATE inventory 
				SET quantity = quantity - 1, updated_at = CURRENT_TIMESTAMP
				WHERE id = $1 AND tenant_id = $2
				RETURNING quantity
			`;
			
			const inventoryUpdateResult = await query(updateInventoryQuery, [inventory_id, DEFAULT_TENANT_ID]);
			const newQuantity = inventoryUpdateResult.rows[0]?.quantity || 0;
			
			return jsonResponse({
				message: 'Added to Cart',
				cart_id: cartResult.rows[0].id,
				available_quantity: newQuantity
			});
		}
		
	} catch (error) {
		console.error('Add to cart error:', error);
		return internalServerErrorResponse('Failed to add item to cart');
	}
}