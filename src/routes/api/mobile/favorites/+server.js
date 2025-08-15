import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID, PLUGIN_EVENTS } from '$lib/constants.js';
import { PluginService } from '$lib/services/PluginService.js';

export async function GET() {
	try {
		console.log('🔗 Fetching favorites for user:', DEFAULT_MOBILE_USER_ID);

		// Get favorites with product details including images
		const favoritesQuery = `
			SELECT 
				f.id as favorite_id,
				f.product_id,
				f.created_at,
				p.name as product_name,
				p.price,
				p.images
			FROM favorites f
			LEFT JOIN products p ON f.product_id = p.id AND f.tenant_id = p.tenant_id
			WHERE f.tenant_id = $1 AND f.user_id = $2
			ORDER BY f.created_at DESC
		`;

		const result = await query(favoritesQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		// Convert rows to match expected mobile app format
		const favorites = result.rows.map(row => {
			// Parse images JSONB field safely (similar to other mobile APIs)
			let images = [];
			try {
				images = row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : [];
			} catch (e) {
				images = [];
			}
			
			// Extract thumbnail using same logic as other mobile APIs
			let thumbnail = '';
			let image_width = null;
			let image_height = null;
			
			if (images.length > 0) {
				const firstImage = images[0];
				// Handle both string URLs and object format
				thumbnail = typeof firstImage === 'string' ? firstImage : (firstImage?.url || firstImage);
				
				// Try to extract dimensions if available (objects only)
				if (typeof firstImage === 'object' && firstImage) {
					image_width = firstImage.width || null;
					image_height = firstImage.height || null;
				}
			}
			
			return {
				favorite_id: row.favorite_id,
				product_id: row.product_id,
				product_name: row.product_name || 'Unknown Product',
				price: parseFloat(row.price) || 0,
				price_label: row.price ? `$${parseFloat(row.price).toFixed(2)}` : '$0.00',
				thumbnail: thumbnail,
				image_width: image_width,
				image_height: image_height,
				created_at: row.created_at
			};
		});

		console.log('✅ Favorites fetched successfully:', favorites.length, 'items');

		return jsonResponse({
			favorites: favorites,
			count: favorites.length
		});

	} catch (error) {
		console.error('❌ Error fetching favorites:', error);
		return internalServerErrorResponse('Failed to fetch favorites: ' + error.message);
	}
}

export async function POST({ request }) {
	try {
		const { product_id } = await request.json();
		
		if (!product_id) {
			return badRequestResponse('Missing required field: product_id');
		}

		console.log('🔗 Adding product to favorites:', product_id);

		// Check if already in favorites (prevent duplicates)
		const checkQuery = `
			SELECT id FROM favorites 
			WHERE tenant_id = $1 AND user_id = $2 AND product_id = $3
		`;
		
		const existingResult = await query(checkQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID, product_id]);
		
		if (existingResult.rows.length > 0) {
			return jsonResponse({
				success: true,
				message: 'Product already in favorites',
				favorite_id: existingResult.rows[0].id
			});
		}

		// Add to favorites
		const insertQuery = `
			INSERT INTO favorites (tenant_id, user_id, product_id)
			VALUES ($1, $2, $3)
			RETURNING id, created_at
		`;
		
		const insertResult = await query(insertQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID, product_id]);
		
		// Get product details for plugin event
		const productQuery = `
			SELECT name, price, images 
			FROM products 
			WHERE id = $1 AND tenant_id = $2
		`;
		
		const productResult = await query(productQuery, [product_id, DEFAULT_TENANT_ID]);
		const productData = productResult.rows[0];
		
		// Trigger favorite added event
		try {
			const favoriteAddedPayload = {
				favorite_id: insertResult.rows[0].id,
				product_id: product_id,
				product_name: productData?.name || 'Unknown Product',
				price: productData?.price || 0,
				user_id: DEFAULT_MOBILE_USER_ID,
				added_at: insertResult.rows[0].created_at
			};
			
			await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.FAVORITE_ADDED, favoriteAddedPayload);
			console.log('📤 Favorite added event triggered for product:', product_id);
		} catch (pluginError) {
			console.error('Error triggering favorite added plugin event:', pluginError);
		}
		
		console.log('✅ Product added to favorites successfully');

		return jsonResponse({
			success: true,
			message: 'Added to favorites',
			favorite_id: insertResult.rows[0].id,
			created_at: insertResult.rows[0].created_at
		});

	} catch (error) {
		console.error('❌ Error adding to favorites:', error);
		return internalServerErrorResponse('Failed to add to favorites');
	}
}