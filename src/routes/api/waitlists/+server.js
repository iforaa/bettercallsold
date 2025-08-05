import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
	try {
		const searchParams = url.searchParams;
		const limit = parseInt(searchParams.get('limit')) || 50;
		const offset = parseInt(searchParams.get('offset')) || 0;
		
		// Query waitlists with user, product, and inventory info
		const waitlistsQuery = `
			SELECT 
				w.id, w.tenant_id, w.user_id, w.product_id, w.inventory_id,
				w.order_source, w.comment_id, w.instagram_comment_id, w.card_id,
				w.authorized_at, w.coupon_id, w.local_pickup, w.location_id,
				w.position, w.created_at, w.updated_at,
				u.name as user_name, u.email as user_email,
				p.name as product_name, p.description as product_description,
				p.price as product_price, p.images as product_images,
				i.quantity as inventory_quantity, i.color, i.size
			FROM waitlist w
			LEFT JOIN users u ON w.user_id = u.id
			LEFT JOIN products p ON w.product_id = p.id
			LEFT JOIN inventory i ON w.inventory_id = i.id
			WHERE w.tenant_id = $1
			ORDER BY w.created_at DESC
			LIMIT $2 OFFSET $3
		`;
		
		const result = await query(waitlistsQuery, [DEFAULT_TENANT_ID, limit, offset]);
		return jsonResponse(result.rows);
	} catch (error) {
		console.error('Get waitlists error:', error);
		return internalServerErrorResponse('Failed to fetch waitlists');
	}
}

export async function POST({ request }) {
	try {
		const waitlistData = await request.json();
		
		if (!waitlistData.user_id || !waitlistData.inventory_id) {
			return badRequestResponse('Missing required fields: user_id, inventory_id');
		}
		
		// Insert new waitlist entry
		const insertQuery = `
			INSERT INTO waitlist (
				tenant_id, user_id, product_id, inventory_id, order_source,
				comment_id, instagram_comment_id, card_id, authorized_at,
				coupon_id, local_pickup, location_id, position
			) VALUES (
				$1, $2, $3, $4, COALESCE($5, 0),
				$6, $7, $8, $9,
				$10, COALESCE($11, false), $12, $13
			)
			RETURNING id
		`;
		
		const result = await query(insertQuery, [
			DEFAULT_TENANT_ID,
			waitlistData.user_id,
			waitlistData.product_id,
			waitlistData.inventory_id,
			waitlistData.order_source,
			waitlistData.comment_id,
			waitlistData.instagram_comment_id,
			waitlistData.card_id,
			waitlistData.authorized_at,
			waitlistData.coupon_id,
			waitlistData.local_pickup,
			waitlistData.location_id,
			waitlistData.position
		]);
		
		if (result.rows.length > 0) {
			return jsonResponse({
				message: 'Waitlist entry created successfully',
				data: { id: result.rows[0].id }
			});
		} else {
			return internalServerErrorResponse('Failed to create waitlist entry');
		}
	} catch (error) {
		console.error('Create waitlist error:', error);
		return internalServerErrorResponse('Failed to create waitlist entry');
	}
}