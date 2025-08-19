import { query, getCached, setCache, deleteCache } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse, badRequestResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';
import { CacheService } from '$lib/services/CacheService.js';

export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    
    // Try to get from cache first using new CacheService
    const cachedLocations = await CacheService.getLocations(DEFAULT_TENANT_ID);
    if (cachedLocations) {
      return jsonResponse(cachedLocations);
    }
    
    // Build query based on filters
    let queryText = QUERIES.GET_LOCATIONS;
    let queryParams = [DEFAULT_TENANT_ID];
    let paramIndex = 2;
    
    const conditions = [];
    
    // Filter by status
    const status = searchParams.get('status');
    if (status && status !== 'all') {
      conditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    // Filter by search term
    const search = searchParams.get('q');
    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1} OR city ILIKE $${paramIndex + 2} OR address_line_1 ILIKE $${paramIndex + 3})`);
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      paramIndex += 4;
    }
    
    // Filter by country
    const country = searchParams.get('country');
    if (country) {
      conditions.push(`country = $${paramIndex}`);
      queryParams.push(country);
      paramIndex++;
    }
    
    // Filter by pickup location
    const isPickupLocation = searchParams.get('is_pickup_location');
    if (isPickupLocation !== null) {
      conditions.push(`is_pickup_location = $${paramIndex}`);
      queryParams.push(isPickupLocation === 'true');
      paramIndex++;
    }
    
    // Filter by fulfillment center
    const isFulfillmentCenter = searchParams.get('is_fulfillment_center');
    if (isFulfillmentCenter !== null) {
      conditions.push(`is_fulfillment_center = $${paramIndex}`);
      queryParams.push(isFulfillmentCenter === 'true');
      paramIndex++;
    }
    
    // Add conditions to query
    if (conditions.length > 0) {
      queryText = queryText.replace('ORDER BY', `AND ${conditions.join(' AND ')} ORDER BY`);
    }
    
    const result = await query(queryText, queryParams);
    const locations = result.rows || [];
    
    // Cache the result using CacheService
    await CacheService.setLocations(DEFAULT_TENANT_ID, locations);
    
    return jsonResponse(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    return internalServerErrorResponse('Failed to fetch locations');
  }
}

export async function POST({ request }) {
  try {
    const locationData = await request.json();
    
    // Validate required fields
    if (!locationData.name || !locationData.address_line_1 || !locationData.city || !locationData.country) {
      return badRequestResponse('Missing required fields: name, address_line_1, city, country');
    }
    
    // If setting as default, first remove default from all other locations
    if (locationData.is_default) {
      await query(
        'UPDATE locations SET is_default = false WHERE tenant_id = $1',
        [DEFAULT_TENANT_ID]
      );
    }
    
    // Create location
    const result = await query(QUERIES.CREATE_LOCATION, [
      DEFAULT_TENANT_ID,
      locationData.name,
      locationData.description || '',
      locationData.location_type || 'store',
      locationData.address_line_1,
      locationData.address_line_2 || '',
      locationData.city,
      locationData.state_province || '',
      locationData.postal_code || '',
      locationData.country,
      locationData.phone || '',
      locationData.email || '',
      locationData.status || 'active',
      Boolean(locationData.is_default),
      locationData.is_pickup_location !== undefined ? Boolean(locationData.is_pickup_location) : true,
      locationData.is_fulfillment_center !== undefined ? Boolean(locationData.is_fulfillment_center) : false,
      JSON.stringify(locationData.business_hours || getDefaultBusinessHours()),
      JSON.stringify(locationData.metadata || {})
    ]);
    
    if (result.rowCount === 0) {
      return internalServerErrorResponse('Failed to create location');
    }
    
    // Get the created location
    const locationId = result.rows[0].id;
    const createdLocation = await query(QUERIES.GET_LOCATION_BY_ID, [locationId, DEFAULT_TENANT_ID]);
    
    // Clear cache
    const cachePattern = `locations_${DEFAULT_TENANT_ID}*`;
    try {
      await deleteCache(cachePattern);
      console.log(`Cache cleared for pattern ${cachePattern}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
    
    return jsonResponse({ data: createdLocation.rows[0] });
  } catch (error) {
    console.error('Create location error:', error);
    return internalServerErrorResponse(`Failed to create location: ${error.message}`);
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