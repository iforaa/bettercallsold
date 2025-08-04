import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function GET() {
	try {
		// Query waitlist items with product and inventory info for mobile format
		const waitlistQuery = `
			SELECT 
				w.id as waitlist_id,
				w.product_id,
				w.inventory_id,
				w.created_at,
				w.authorized_at,
				w.card_id,
				w.coupon_id,
				w.local_pickup,
				w.location_id,
				p.name as product_name,
				p.price,
				p.images,
				i.color,
				i.size,
				i.quantity as stock_quantity
			FROM waitlist w
			LEFT JOIN products p ON w.product_id = p.id
			LEFT JOIN inventory i ON w.inventory_id = i.id
			WHERE w.tenant_id = $1 AND w.user_id = $2
			ORDER BY w.created_at DESC
		`;
		
		const result = await query(waitlistQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		// Transform waitlist data to match mobile app expectations
		const waitlistItems = result.rows.map(item => {
			// Parse images JSON safely, similar to product detail API
			let images = [];
			try {
				images = item.images ? (typeof item.images === 'string' ? JSON.parse(item.images) : item.images) : [];
			} catch (e) {
				images = [];
			}
			
			// Extract thumbnail URL properly - handle both string URLs and objects with url property
			const thumbnail = images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : '';
			
			return {
				waitlist_id: item.waitlist_id,
				product_id: item.product_id,
				product_name: item.product_name || '',
				price: item.price || 0,
				price_label: `$${item.price || 0}`,
				thumbnail: thumbnail,
				filename: thumbnail,
				size: item.size || '',
				color: item.color || '',
				created_at: Math.floor(new Date(item.created_at).getTime() / 1000),
				allow_waitlist: true,
				badge_label: item.stock_quantity > 0 ? 'Available' : null,
				has_video: false,
				image_height: 400,
				image_width: 400,
				is_favorite: 0,
				preauthorized: !!item.authorized_at,
				preauthorized_card_id: item.card_id,
				preauthorized_coupon_id: item.coupon_id,
				preauthorized_local_pickup: !!item.local_pickup,
				preauthorized_location_id: item.location_id,
				strikethrough_label: null
			};
		});
		
		return jsonResponse(waitlistItems);
	} catch (error) {
		console.error('Get waitlist error:', error);
		return internalServerErrorResponse('Failed to fetch waitlist');
	}
}