import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const { id: customerId } = params;
    
    if (!customerId) {
      return new Response(JSON.stringify({ error: 'Customer ID is required' }), { 
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Query to get customer's waitlist entries with product and inventory details
    const waitlistQuery = `
      SELECT 
        w.id, w.tenant_id, w.user_id, w.product_id, w.inventory_id,
        w.order_source, w.comment_id, w.instagram_comment_id, w.card_id,
        w.authorized_at, w.coupon_id, w.local_pickup, w.location_id,
        w.position, w.created_at, w.updated_at,
        p.name as product_name, p.description as product_description,
        p.price as product_price, p.images as product_images,
        i.quantity as inventory_quantity, i.color, i.size
      FROM waitlist w
      LEFT JOIN products p ON w.product_id = p.id
      LEFT JOIN inventory i ON w.inventory_id = i.id
      WHERE w.user_id = $1 AND w.tenant_id = $2
      ORDER BY w.created_at DESC
    `;
    
    // Add timeout to database query
    const queryPromise = query(waitlistQuery, [customerId, DEFAULT_TENANT_ID]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    return jsonResponse(result.rows || []);
  } catch (error) {
    console.error('Get customer waitlists error:', error);
    
    if (error.message === 'Query timeout') {
      return new Response(JSON.stringify({ error: 'Database timeout' }), { 
        status: 504,
        headers: { 'content-type': 'application/json' }
      });
    }
    
    return internalServerErrorResponse();
  }
}