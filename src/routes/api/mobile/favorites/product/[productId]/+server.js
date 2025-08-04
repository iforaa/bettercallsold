import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function DELETE({ params }) {
	try {
		const productId = params.productId;
		
		if (!productId) {
			return badRequestResponse('Missing product ID');
		}

		console.log('🔗 Removing favorite by product ID:', productId);

		// Delete favorite items by product ID
		const deleteQuery = `
			DELETE FROM favorites 
			WHERE product_id = $1 AND tenant_id = $2 AND user_id = $3
			RETURNING id, product_id
		`;
		
		const result = await query(deleteQuery, [productId, DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		if (result.rows.length === 0) {
			return notFoundResponse('No favorites found for this product');
		}

		console.log('✅ Favorites removed successfully for product:', productId, '- removed', result.rows.length, 'items');

		return jsonResponse({
			success: true,
			message: 'Removed from favorites',
			product_id: productId,
			removed_count: result.rows.length,
			removed_favorites: result.rows.map(row => row.id)
		});

	} catch (error) {
		console.error('❌ Error removing favorite by product ID:', error);
		return internalServerErrorResponse('Failed to remove favorite');
	}
}