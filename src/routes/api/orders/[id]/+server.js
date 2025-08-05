import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), { 
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Add timeout to database queries
    const orderQueryPromise = query(QUERIES.GET_ORDER_BY_ID, [id, DEFAULT_TENANT_ID]);
    const itemsQueryPromise = query(QUERIES.GET_ORDER_ITEMS, [id]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );
    
    const orderResult = await Promise.race([orderQueryPromise, timeoutPromise]);
    
    if (orderResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { 
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Get order items
    const itemsResult = await Promise.race([itemsQueryPromise, timeoutPromise]);
    
    // Combine order data with items
    const orderData = {
      ...orderResult.rows[0],
      items: itemsResult.rows
    };

    return jsonResponse(orderData);
  } catch (error) {
    console.error('Get order by ID error:', error);
    
    if (error.message === 'Query timeout') {
      return new Response(JSON.stringify({ error: 'Database timeout' }), { 
        status: 504,
        headers: { 'content-type': 'application/json' }
      });
    }
    
    return internalServerErrorResponse();
  }
}