import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID, PLUGIN_EVENTS } from '$lib/constants.js';
import { PluginService } from '$lib/services/PluginService.js';

export async function POST({ request }) {
	try {
		const { product_id, inventory_id } = await request.json();
		
		if (!product_id || !inventory_id) {
			return badRequestResponse('Missing required fields: product_id, inventory_id');
		}

		// Get inventory record directly - sum across all locations
		const inventoryQuery = `
			SELECT 
				pv.id as inventory_id,
				pv.product_id,
				COALESCE(SUM(il.available), 0) as quantity,
				pv.option1 as color,
				pv.option2 as size,
				pv.price,
				p.title as product_name
			FROM product_variants_new pv
			LEFT JOIN inventory_levels_new il ON pv.id = il.variant_id
			LEFT JOIN products_new p ON pv.product_id = p.id
			WHERE pv.id = $1 AND p.tenant_id = $2
			GROUP BY pv.id, pv.product_id, pv.option1, pv.option2, pv.price, p.title
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

			// Trigger plugin event for waitlist addition
			try {
				const eventPayload = {
					waitlist_id: waitlistResult.rows[0].id,
					product_id: product_id,
					product_name: inventory.product_name,
					inventory_id: inventory_id,
					user_id: DEFAULT_MOBILE_USER_ID,
					size: inventory.size || 'One Size',
					color: inventory.color || 'Default',
					price: inventory.price || inventory.product_price || 0,
					available_quantity: 0,
					added_at: new Date().toISOString()
				};

				await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.WAITLIST_ITEM_ADDED, eventPayload);
				console.log(`📤 Waitlist item added event triggered for product: ${product_id}`);
			} catch (pluginError) {
				console.error('Error triggering waitlist plugin event:', pluginError);
			}
			
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

			// Reduce inventory quantity by 1 from the first available location
			const updateInventoryQuery = `
				UPDATE inventory_levels_new 
				SET available = available - 1, updated_at = CURRENT_TIMESTAMP
				WHERE id = (
					SELECT id FROM inventory_levels_new
					WHERE variant_id = $1 AND available > 0
					ORDER BY available DESC
					LIMIT 1
				)
				RETURNING available
			`;
			
			const inventoryUpdateResult = await query(updateInventoryQuery, [inventory_id]);
			
			// Get new total quantity across all locations
			const totalQuantityQuery = `
				SELECT COALESCE(SUM(available), 0) as total_quantity
				FROM inventory_levels_new
				WHERE variant_id = $1
			`;
			const totalQuantityResult = await query(totalQuantityQuery, [inventory_id]);
			const newQuantity = totalQuantityResult.rows[0]?.total_quantity || 0;

			// Trigger plugin event for cart addition
			try {
				const eventPayload = {
					cart_id: cartResult.rows[0].id,
					product_id: product_id,
					product_name: inventory.product_name,
					inventory_id: inventory_id,
					user_id: DEFAULT_MOBILE_USER_ID,
					quantity: 1,
					size: inventory.size || 'One Size',
					color: inventory.color || 'Default',
					price: inventory.price || inventory.product_price || 0,
					available_quantity: newQuantity,
					added_at: new Date().toISOString()
				};

				await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.CART_ITEM_ADDED, eventPayload);
				console.log(`📤 Cart item added event triggered for product: ${product_id}`);
			} catch (pluginError) {
				console.error('Error triggering cart plugin event:', pluginError);
			}
			
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