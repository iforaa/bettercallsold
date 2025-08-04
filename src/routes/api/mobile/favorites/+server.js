import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function GET() {
	try {
		console.log('🔗 Fetching favorites for user:', DEFAULT_MOBILE_USER_ID);

		// Get favorites with product details
		const favoritesQuery = `
			SELECT 
				f.id as favorite_id,
				f.product_id,
				f.created_at,
				p.name as product_name,
				p.price
			FROM favorites f
			LEFT JOIN products p ON f.product_id = p.id AND f.tenant_id = p.tenant_id
			WHERE f.tenant_id = $1 AND f.user_id = $2
			ORDER BY f.created_at DESC
		`;

		const result = await query(favoritesQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		// Convert rows to match expected mobile app format
		const favorites = result.rows.map(row => ({
			favorite_id: row.favorite_id,
			product_id: row.product_id,
			product_name: row.product_name || 'Unknown Product',
			price: parseFloat(row.price) || 0,
			price_label: row.price ? `$${parseFloat(row.price).toFixed(2)}` : '$0.00',
			thumbnail: '', // Default empty string until we have image support
			image_width: null, // Default null until we have image support
			image_height: null, // Default null until we have image support
			created_at: row.created_at
		}));

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