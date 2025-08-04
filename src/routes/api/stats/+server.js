import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

export async function GET() {
  try {
    const result = await query(QUERIES.STATS_QUERY, [DEFAULT_TENANT_ID]);
    
    if (result.rows.length > 0) {
      const stats = result.rows[0];
      return jsonResponse({
        total_products: parseInt(stats.total_products),
        total_customers: parseInt(stats.total_customers),
        total_orders: parseInt(stats.total_orders),
        total_revenue: parseFloat(stats.total_revenue),
        active_streams: parseInt(stats.active_streams)
      });
    } else {
      return jsonResponse({
        total_products: 0,
        total_customers: 0,
        total_orders: 0,
        total_revenue: 0,
        active_streams: 0
      });
    }
  } catch (error) {
    console.error('Stats endpoint error:', error);
    return internalServerErrorResponse('Failed to fetch stats');
  }
}