import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, PLUGIN_EVENTS } from '$lib/constants.js';
import { PluginService } from '$lib/services/PluginService.js';

export async function DELETE({ params }) {
	try {
		const waitlistId = params.id;
		
		// Validate UUID format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(waitlistId)) {
			return badRequestResponse('Invalid waitlist ID format');
		}

		// Get waitlist item data before deletion for plugin event using new table structure
		const checkQuery = `
			SELECT w.id, w.product_id, w.inventory_id, w.user_id,
			       p.title as product_name, pv.option2 as size, pv.option1 as color, pv.price,
			       pv.price as product_price
			FROM waitlist w
			LEFT JOIN products_new p ON w.product_id = p.id
			LEFT JOIN product_variants_new pv ON p.id = pv.product_id
			WHERE w.id = $1 AND w.tenant_id = $2
			LIMIT 1
		`;
		
		const checkResult = await query(checkQuery, [waitlistId, DEFAULT_TENANT_ID]);
		
		if (checkResult.rows.length === 0) {
			return notFoundResponse('Waitlist item not found');
		}

		// Delete waitlist item
		const deleteQuery = `
			DELETE FROM waitlist 
			WHERE id = $1 AND tenant_id = $2
			RETURNING id
		`;
		
		const result = await query(deleteQuery, [waitlistId, DEFAULT_TENANT_ID]);
		
		if (result.rows.length > 0) {
			// Trigger plugin event for waitlist removal
			try {
				const waitlistData = checkResult.rows[0];
				const eventPayload = {
					waitlist_id: waitlistId,
					product_id: waitlistData.product_id,
					product_name: waitlistData.product_name,
					inventory_id: waitlistData.inventory_id,
					user_id: waitlistData.user_id,
					size: waitlistData.size || 'One Size',
					color: waitlistData.color || 'Default',
					price: waitlistData.price || waitlistData.product_price || 0,
					removed_at: new Date().toISOString()
				};

				await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.WAITLIST_ITEM_REMOVED, eventPayload);
				console.log(`📤 Waitlist item removed event triggered for product: ${waitlistData.product_id}`);
			} catch (pluginError) {
				console.error('Error triggering waitlist removal plugin event:', pluginError);
			}

			return jsonResponse({
				message: 'Waitlist item removed successfully',
				waitlist_id: waitlistId
			});
		} else {
			return internalServerErrorResponse('Failed to remove waitlist item');
		}
	} catch (error) {
		console.error('Delete waitlist error:', error);
		return internalServerErrorResponse('Failed to remove waitlist item');
	}
}