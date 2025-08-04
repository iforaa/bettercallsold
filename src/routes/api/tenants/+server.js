import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { QUERIES } from '$lib/constants.js';

export async function GET() {
  try {
    const result = await query(QUERIES.GET_TENANTS);
    return jsonResponse(result.rows);
  } catch (error) {
    console.error('Get tenants error:', error);
    return internalServerErrorResponse('Failed to fetch tenants');
  }
}