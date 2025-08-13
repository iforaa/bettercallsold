import { query, deleteCache } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

export async function POST({ params }) {
  try {
    const locationId = params.id;
    
    // Verify location exists
    const checkLocation = await query(QUERIES.GET_LOCATION_BY_ID, [locationId, DEFAULT_TENANT_ID]);
    
    if (checkLocation.rows.length === 0) {
      return notFoundResponse('Location not found');
    }
    
    // Remove default from all locations first
    await query(
      'UPDATE locations SET is_default = false WHERE tenant_id = $1',
      [DEFAULT_TENANT_ID]
    );
    
    // Set this location as default
    const result = await query(
      'UPDATE locations SET is_default = true, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
      [locationId, DEFAULT_TENANT_ID]
    );
    
    if (result.rowCount === 0) {
      return notFoundResponse('Location not found');
    }
    
    // Get the updated location
    const updatedLocation = await query(QUERIES.GET_LOCATION_BY_ID, [locationId, DEFAULT_TENANT_ID]);
    
    // Clear cache
    const locationCacheKey = `location_${locationId}_${DEFAULT_TENANT_ID}`;
    const listCachePattern = `locations_${DEFAULT_TENANT_ID}*`;
    try {
      await deleteCache(locationCacheKey);
      await deleteCache(listCachePattern);
      console.log(`Cache cleared for ${locationCacheKey} and ${listCachePattern}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
    
    return jsonResponse({ 
      data: updatedLocation.rows[0],
      message: 'Default location updated successfully'
    });
  } catch (error) {
    console.error('Set default location error:', error);
    return internalServerErrorResponse('Failed to set default location');
  }
}