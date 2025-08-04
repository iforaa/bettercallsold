import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

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

		// Check if waitlist item exists
		const checkQuery = `
			SELECT id FROM waitlist 
			WHERE id = $1 AND tenant_id = $2
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