import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const variantId = searchParams.get('variant_id');
    const locationId = searchParams.get('location_id');

    // Validation
    if (!variantId) {
      return badRequestResponse('variant_id is required');
    }

    let queryText = `
      SELECT 
        il.variant_id,
        il.location_id,
        l.name as location_name,
        COALESCE(il.available, 0) as available,
        COALESCE(il.on_hand, 0) as on_hand,
        COALESCE(il.committed, 0) as committed,
        COALESCE(il.reserved, 0) as reserved
      FROM inventory_levels_new il
      LEFT JOIN locations l ON il.location_id = l.id
      WHERE il.variant_id = $1
    `;

    let params = [variantId];
    let paramIndex = 2;

    // Add location filter if specified
    if (locationId) {
      queryText += ` AND il.location_id = $${paramIndex}`;
      params.push(locationId);
      paramIndex++;
    }

    queryText += ` ORDER BY l.name`;

    const result = await query(queryText, params);

    // If no location specified, return all locations for this variant
    if (!locationId) {
      return jsonResponse(result.rows);
    }

    // If location specified, return single record or default values
    if (result.rows.length > 0) {
      return jsonResponse(result.rows[0]);
    } else {
      // Return default empty inventory for the requested location
      const locationResult = await query(`
        SELECT id, name FROM locations WHERE id = $1
      `, [locationId]);
      
      const location = locationResult.rows[0];
      return jsonResponse({
        variant_id: variantId,
        location_id: locationId,
        location_name: location?.name || 'Unknown Location',
        available: 0,
        on_hand: 0,
        committed: 0,
        reserved: 0
      });
    }

  } catch (error) {
    console.error('Get inventory levels error:', error);
    return internalServerErrorResponse('Failed to fetch inventory levels');
  }
}