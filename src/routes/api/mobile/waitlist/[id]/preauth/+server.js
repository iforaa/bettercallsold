import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, PLUGIN_EVENTS } from '$lib/constants.js';
import { PluginService } from '$lib/services/PluginService.js';

export async function POST({ params, request }) {
	try {
		const waitlistId = params.id;
		
		// Validate UUID format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(waitlistId)) {
			return badRequestResponse('Invalid waitlist ID format');
		}

		// Parse request body for preauth details (optional)
		let preauthData = {};
		try {
			preauthData = await request.json();
		} catch {
			// Default empty object if no body
		}

		// Get waitlist item data for plugin event using new table structure
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

		// Update waitlist item with preauthorization
		const updateQuery = `
			UPDATE waitlist 
			SET 
				authorized_at = CURRENT_TIMESTAMP,
				card_id = COALESCE($3, card_id),
				coupon_id = COALESCE($4, coupon_id),
				local_pickup = COALESCE($5, local_pickup),
				location_id = COALESCE($6, location_id),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND tenant_id = $2
			RETURNING id, authorized_at
		`;
		
		const result = await query(updateQuery, [
			waitlistId,
			DEFAULT_TENANT_ID,
			preauthData.card_id || null,
			preauthData.coupon_id || null,
			preauthData.local_pickup || false,
			preauthData.location_id || null
		]);
		
		if (result.rows.length > 0) {
			// Trigger plugin event for waitlist preauthorization
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
					card_id: preauthData.card_id,
					coupon_id: preauthData.coupon_id,
					local_pickup: preauthData.local_pickup || false,
					location_id: preauthData.location_id,
					authorized_at: result.rows[0].authorized_at
				};

				await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.WAITLIST_ITEM_PREAUTHORIZED, eventPayload);
				console.log(`📤 Waitlist item preauthorized event triggered for product: ${waitlistData.product_id}`);
			} catch (pluginError) {
				console.error('Error triggering waitlist preauth plugin event:', pluginError);
			}

			return jsonResponse({
				message: 'Waitlist item preauthorized successfully',
				waitlist_id: waitlistId,
				authorized_at: Math.floor(new Date(result.rows[0].authorized_at).getTime() / 1000)
			});
		} else {
			return internalServerErrorResponse('Failed to preauthorize waitlist item');
		}
	} catch (error) {
		console.error('Preauthorize waitlist error:', error);
		return internalServerErrorResponse('Failed to preauthorize waitlist item');
	}
}