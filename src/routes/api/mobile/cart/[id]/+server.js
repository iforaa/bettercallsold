import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function DELETE({ params }) {
	try {
		const cartId = params.id;
		
		// Validate UUID format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(cartId)) {
			return badRequestResponse('Invalid cart item ID format');
		}

		// Get cart item details including inventory_id before deletion
		const getCartItemQuery = `
			SELECT id, variant_data FROM cart_items 
			WHERE id = $1 AND tenant_id = $2 AND user_id = $3
		`;
		
		const cartItemResult = await query(getCartItemQuery, [cartId, DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		if (cartItemResult.rows.length === 0) {
			return notFoundResponse('Cart item not found');
		}

		const cartItem = cartItemResult.rows[0];
		let inventoryId = null;
		
		// Extract inventory_id from variant_data
		try {
			const variantData = typeof cartItem.variant_data === 'string' ? 
				JSON.parse(cartItem.variant_data) : cartItem.variant_data;
			inventoryId = variantData?.inventory_id;
		} catch (e) {
			console.log('Could not parse variant_data for inventory restoration');
		}

		// Delete cart item
		const deleteQuery = `
			DELETE FROM cart_items 
			WHERE id = $1 AND tenant_id = $2 AND user_id = $3
			RETURNING id
		`;
		
		const result = await query(deleteQuery, [cartId, DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		if (result.rows.length > 0) {
			// Restore inventory quantity by 1 if we have inventory_id
			if (inventoryId) {
				const restoreInventoryQuery = `
					UPDATE inventory 
					SET quantity = quantity + 1, updated_at = CURRENT_TIMESTAMP
					WHERE id = $1 AND tenant_id = $2
				`;
				
				try {
					await query(restoreInventoryQuery, [inventoryId, DEFAULT_TENANT_ID]);
					console.log('Inventory restored for item:', inventoryId);
				} catch (e) {
					console.error('Failed to restore inventory:', e);
					// Don't fail the deletion if inventory restoration fails
				}
			}
			
			return jsonResponse({
				message: 'Cart item removed successfully',
				cart_id: cartId
			});
		} else {
			return internalServerErrorResponse('Failed to remove cart item');
		}
	} catch (error) {
		console.error('Delete cart item error:', error);
		return internalServerErrorResponse('Failed to remove cart item');
	}
}