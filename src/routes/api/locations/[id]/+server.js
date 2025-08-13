import { query, getCached, setCache, deleteCache } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse, badRequestResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const locationId = params.id;
    
    // Create cache key for individual location
    const cacheKey = `location_${locationId}_${DEFAULT_TENANT_ID}`;
    
    // Try to get from cache first
    const cachedLocation = await getCached(cacheKey);
    if (cachedLocation) {
      console.log(`🚀 Cache hit for ${cacheKey}`);
      return jsonResponse(cachedLocation);
    }
    
    console.log(`🔍 Cache miss for ${cacheKey}, fetching from database`);
    
    const result = await query(QUERIES.GET_LOCATION_BY_ID, [locationId, DEFAULT_TENANT_ID]);
    
    if (result.rows.length === 0) {
      return notFoundResponse('Location not found');
    }
    
    const location = result.rows[0];
    
    // Cache the result for 5 minutes (300 seconds)
    await setCache(cacheKey, location, 300);
    
    return jsonResponse(location);
  } catch (error) {
    console.error('Get location error:', error);
    return internalServerErrorResponse('Failed to fetch location');
  }
}

export async function PUT({ params, request }) {
  return handleLocationUpdate({ params, request });
}

export async function PATCH({ params, request }) {
  return handleLocationUpdate({ params, request });
}

async function handleLocationUpdate({ params, request }) {
  try {
    const locationId = params.id;
    const locationData = await request.json();
    
    // Get current location data for partial updates
    const currentLocationResult = await query(QUERIES.GET_LOCATION_BY_ID, [locationId, DEFAULT_TENANT_ID]);
    
    if (currentLocationResult.rows.length === 0) {
      return notFoundResponse('Location not found');
    }
    
    const currentLocation = currentLocationResult.rows[0];
    
    // Merge updates with current data to ensure required fields are present
    const mergedData = {
      name: locationData.name ?? currentLocation.name,
      description: locationData.description ?? currentLocation.description,
      location_type: locationData.location_type ?? currentLocation.location_type,
      address_line_1: locationData.address_line_1 ?? currentLocation.address_line_1,
      address_line_2: locationData.address_line_2 ?? currentLocation.address_line_2,
      city: locationData.city ?? currentLocation.city,
      state_province: locationData.state_province ?? currentLocation.state_province,
      postal_code: locationData.postal_code ?? currentLocation.postal_code,
      country: locationData.country ?? currentLocation.country,
      phone: locationData.phone ?? currentLocation.phone,
      email: locationData.email ?? currentLocation.email,
      status: locationData.status ?? currentLocation.status,
      is_default: locationData.is_default ?? currentLocation.is_default,
      is_pickup_location: locationData.is_pickup_location ?? currentLocation.is_pickup_location,
      is_fulfillment_center: locationData.is_fulfillment_center ?? currentLocation.is_fulfillment_center,
      business_hours: locationData.business_hours ?? currentLocation.business_hours,
      metadata: locationData.metadata ?? currentLocation.metadata
    };
    
    // Validate required fields on merged data
    if (!mergedData.name || !mergedData.address_line_1 || !mergedData.city || !mergedData.country) {
      return badRequestResponse('Missing required fields: name, address_line_1, city, country');
    }
    
    // If setting as default, first remove default from all other locations
    if (mergedData.is_default) {
      await query(
        'UPDATE locations SET is_default = false WHERE tenant_id = $1 AND id != $2',
        [DEFAULT_TENANT_ID, locationId]
      );
    }
    
    console.log(`Updating location ${locationId}...`);
    
    // Update location details using merged data
    const result = await query(QUERIES.UPDATE_LOCATION, [
      locationId,
      DEFAULT_TENANT_ID,
      mergedData.name,
      mergedData.description || '',
      mergedData.location_type || 'store',
      mergedData.address_line_1,
      mergedData.address_line_2 || '',
      mergedData.city,
      mergedData.state_province || '',
      mergedData.postal_code || '',
      mergedData.country,
      mergedData.phone || '',
      mergedData.email || '',
      mergedData.status || 'active',
      Boolean(mergedData.is_default),
      Boolean(mergedData.is_pickup_location),
      Boolean(mergedData.is_fulfillment_center),
      JSON.stringify(mergedData.business_hours || getDefaultBusinessHours()),
      JSON.stringify(mergedData.metadata || {})
    ]);
    
    if (result.rowCount === 0) {
      return notFoundResponse('Location not found');
    }
    
    // Get the updated location
    const updatedLocation = await query(QUERIES.GET_LOCATION_BY_ID, [locationId, DEFAULT_TENANT_ID]);
    
    // Clear cache for this location and list cache
    const locationCacheKey = `location_${locationId}_${DEFAULT_TENANT_ID}`;
    try {
      await deleteCache(locationCacheKey);
      // Clear list cache too
      const listCachePattern = `locations_${DEFAULT_TENANT_ID}*`;
      await deleteCache(listCachePattern);
      console.log(`Cache cleared for ${locationCacheKey} and ${listCachePattern}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
    
    return jsonResponse(updatedLocation.rows[0]);
  } catch (error) {
    console.error('Update location error:', error);
    return internalServerErrorResponse(`Failed to update location: ${error.message}`);
  }
}

export async function DELETE({ params }) {
  try {
    const locationId = params.id;
    
    // Check if this is the default location
    const checkDefault = await query(
      'SELECT is_default FROM locations WHERE id = $1 AND tenant_id = $2',
      [locationId, DEFAULT_TENANT_ID]
    );
    
    if (checkDefault.rows.length > 0 && checkDefault.rows[0].is_default) {
      return badRequestResponse('Cannot delete the default location. Please set another location as default first.');
    }
    
    const result = await query(QUERIES.DELETE_LOCATION, [locationId, DEFAULT_TENANT_ID]);
    
    if (result.rowCount === 0) {
      return notFoundResponse('Location not found');
    }
    
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
    
    return successResponse('Location deleted successfully');
  } catch (error) {
    console.error('Delete location error:', error);
    return internalServerErrorResponse('Failed to delete location');
  }
}

// Helper function for default business hours
function getDefaultBusinessHours() {
  return {
    monday: { open: '09:00', close: '18:00', closed: false },
    tuesday: { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday: { open: '09:00', close: '18:00', closed: false },
    friday: { open: '09:00', close: '18:00', closed: false },
    saturday: { open: '10:00', close: '16:00', closed: false },
    sunday: { open: '12:00', close: '16:00', closed: false }
  };
}