import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

export async function GET({ url }) {
  try {
    const limit = url.searchParams.get('limit') || '50';
    
    // Add timeout to database query
    const queryPromise = query(QUERIES.GET_ORDERS_WITH_CUSTOMERS + ` LIMIT ${limit}`, [DEFAULT_TENANT_ID]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    return jsonResponse(result.rows);
  } catch (error) {
    console.error('Get orders error:', error);
    
    // Return empty array instead of error for dashboard compatibility
    if (error.message === 'Query timeout') {
      console.log('Orders query timed out, returning empty array');
      return jsonResponse([]);
    }
    
    return jsonResponse([]);
  }
}