import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function DELETE({ params }) {
	try {
		const waitlistId = params.id;
		
		// Validate UUID format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(waitlistId)) {
			return badRequestResponse('Invalid waitlist ID format');
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

		// Delete waitlist item
		const deleteQuery = `
			DELETE FROM waitlist 
			WHERE id = $1 AND tenant_id = $2
			RETURNING id
		`;
		
		const result = await query(deleteQuery, [waitlistId, DEFAULT_TENANT_ID]);
		
		if (result.rows.length > 0) {
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