import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function DELETE({ params }) {
	try {
		const favoriteId = params.id;
		
		// Validate UUID format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(favoriteId)) {
			return badRequestResponse('Invalid favorite ID format');
		}

		console.log('🔗 Removing favorite by ID:', favoriteId);

		// Delete the favorite item
		const deleteQuery = `
			DELETE FROM favorites 
			WHERE id = $1 AND tenant_id = $2 AND user_id = $3
			RETURNING id, product_id
		`;
		
		const result = await query(deleteQuery, [favoriteId, DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		if (result.rows.length === 0) {
			return notFoundResponse('Favorite item not found');
		}

		console.log('✅ Favorite removed successfully:', favoriteId);

		return jsonResponse({
			success: true,
			message: 'Removed from favorites',
			favorite_id: favoriteId,
			product_id: result.rows[0].product_id
		});

	} catch (error) {
		console.error('❌ Error removing favorite:', error);
		return internalServerErrorResponse('Failed to remove favorite');
	}
}