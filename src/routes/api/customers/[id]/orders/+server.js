import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Customer ID is required' }), { 
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Query to get customer orders with basic order information
    const ordersQuery = `
      SELECT 
        o.id, o.status, o.total_amount, o.payment_method,
        o.created_at, o.updated_at,
        (
          SELECT COUNT(*) 
          FROM order_items oi 
          WHERE oi.order_id = o.id
        ) as items_count
      FROM orders o
      WHERE o.user_id = $1 AND o.tenant_id = $2
      ORDER BY o.created_at DESC
    `;
    
    // Add timeout to database query
    const queryPromise = query(ordersQuery, [id, DEFAULT_TENANT_ID]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    return jsonResponse(result.rows);
  } catch (error) {
    console.error('Get customer orders error:', error);
    
    if (error.message === 'Query timeout') {
      return new Response(JSON.stringify({ error: 'Database timeout' }), { 
        status: 504,
        headers: { 'content-type': 'application/json' }
      });
    }
    
    return internalServerErrorResponse();
  }
}