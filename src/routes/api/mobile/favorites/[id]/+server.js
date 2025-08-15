import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID, PLUGIN_EVENTS } from '$lib/constants.js';
import { PluginService } from '$lib/services/PluginService.js';

export async function DELETE({ params }) {
	try {
		const favoriteId = params.id;
		
		// Validate UUID format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(favoriteId)) {
			return badRequestResponse('Invalid favorite ID format');
		}

		console.log('🔗 Removing favorite by ID:', favoriteId);

		// Get favorite and product details before deletion for plugin event
		const favoriteQuery = `
			SELECT f.id, f.product_id, f.created_at, p.name as product_name, p.price
			FROM favorites f
			LEFT JOIN products p ON f.product_id = p.id
			WHERE f.id = $1 AND f.tenant_id = $2 AND f.user_id = $3
		`;
		
		const favoriteResult = await query(favoriteQuery, [favoriteId, DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		if (favoriteResult.rows.length === 0) {
			return notFoundResponse('Favorite item not found');
		}
		
		const favoriteData = favoriteResult.rows[0];

		// Delete the favorite item
		const deleteQuery = `
			DELETE FROM favorites 
			WHERE id = $1 AND tenant_id = $2 AND user_id = $3
			RETURNING id, product_id
		`;
		
		const result = await query(deleteQuery, [favoriteId, DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		// Trigger favorite removed event
		try {
			const favoriteRemovedPayload = {
				favorite_id: favoriteId,
				product_id: favoriteData.product_id,
				product_name: favoriteData.product_name || 'Unknown Product',
				price: favoriteData.price || 0,
				user_id: DEFAULT_MOBILE_USER_ID,
				removed_at: new Date().toISOString()
			};
			
			await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.FAVORITE_REMOVED, favoriteRemovedPayload);
			console.log('📤 Favorite removed event triggered for product:', favoriteData.product_id);
		} catch (pluginError) {
			console.error('Error triggering favorite removed plugin event:', pluginError);
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