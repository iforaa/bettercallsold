import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { FeatureFlags } from '$lib/services/FeatureFlags.js';

export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const locationId = searchParams.get('location_id');

    // Check if we should use the new inventory tracking system
    const useNewInventory = await FeatureFlags.isEnabled(FeatureFlags.FLAGS.USE_NEW_INVENTORY_TRACKING);

    if (useNewInventory) {
      // Use new Shopify-style inventory system with location-based inventory
      let whereClause = 'WHERE p.tenant_id = $1';
      let queryParams = [DEFAULT_TENANT_ID];
      let paramIndex = 2;

      // Filter by specific location if provided
      if (locationId) {
        whereClause += ` AND l.id = $${paramIndex}`;
        queryParams.push(locationId);
        paramIndex++;
      }

      const inventoryQuery = `
        SELECT 
          l.id as location_id,
          l.name as location_name,
          l.is_default,
          l.is_fulfillment_center,
          l.is_pickup_location,
          COALESCE(ARRAY_AGG(
            json_build_object(
              'id', pv.id,
              'product_id', p.id,
              'product_name', p.title,
              'variant_title', pv.title,
              'sku', pv.sku,
              'price', pv.price,
              'cost', pv.cost,
              'position', pv.position,
              'option1', pv.option1,
              'option2', pv.option2,
              'option3', pv.option3,
              'available', COALESCE(il.available, 0),
              'on_hand', COALESCE(il.on_hand, 0),
              'committed', COALESCE(il.committed, 0),
              'reserved', COALESCE(il.reserved, 0),
              'product_images', p.images,
              'product_status', p.status,
              'created_at', pv.created_at,
              'updated_at', COALESCE(il.updated_at, pv.updated_at)
            ) ORDER BY pv.position, pv.created_at
          ) FILTER (WHERE pv.id IS NOT NULL AND COALESCE(il.available, 0) > 0), 
          ARRAY[]::json[]) as inventory_items,
          COUNT(DISTINCT pv.id) FILTER (WHERE COALESCE(il.available, 0) > 0) as product_count,
          COALESCE(SUM(il.available), 0) as total_available,
          COALESCE(SUM(il.on_hand), 0) as total_on_hand,
          COALESCE(SUM(il.committed), 0) as total_committed
        FROM locations l
        LEFT JOIN inventory_levels_new il ON il.location_id = l.id
        LEFT JOIN product_variants_new pv ON pv.id = il.variant_id
        LEFT JOIN products_new p ON p.id = pv.product_id AND p.tenant_id = $1
        ${whereClause}
        GROUP BY l.id, l.name, l.is_default, l.is_fulfillment_center, l.is_pickup_location
        ORDER BY l.is_default DESC, l.name
      `;

      const result = await query(inventoryQuery, queryParams);

      // Transform the result into a location-keyed object
      const inventoryByLocation = {};
      
      result.rows.forEach(row => {
        // Transform inventory items to match expected format
        const transformedItems = row.inventory_items.map(item => ({
          ...item,
          formattedTitle: item.product_name + (item.variant_title ? ` | ${item.variant_title}` : ''),
          formattedSKU: item.sku || '-',
          formattedLocation: row.location_name,
          availableCount: item.available || 0,
          onHandCount: item.on_hand || 0,
          committedCount: item.committed || 0,
          unavailableCount: (item.on_hand || 0) - (item.available || 0),
          stockStatus: {
            status: item.available === 0 ? 'out_of_stock' : (item.available <= 5 ? 'low_stock' : 'in_stock'),
            label: item.available === 0 ? 'Out of stock' : (item.available <= 5 ? 'Low stock' : 'In stock'),
            color: item.available === 0 ? 'error' : (item.available <= 5 ? 'warning' : 'success'),
            class: item.available === 0 ? 'status-error' : (item.available <= 5 ? 'status-warning' : 'status-success')
          },
          isLowStock: item.available > 0 && item.available <= 5,
          isOutOfStock: item.available === 0,
          hasVariants: !!(item.option1 || item.option2 || item.option3),
          formattedPrice: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.price || 0),
          formattedCost: item.cost ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.cost) : null,
          totalValue: (item.available || 0) * (item.cost || item.price || 0),
          formattedTotalValue: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((item.available || 0) * (item.cost || item.price || 0))
        }));

        inventoryByLocation[row.location_id] = transformedItems;
      });

      return jsonResponse(inventoryByLocation);

    } else {
      // Use old inventory system - group by location field
      let whereClause = 'WHERE p.tenant_id = $1';
      let queryParams = [DEFAULT_TENANT_ID];
      let paramIndex = 2;

      // Filter by specific location if provided
      if (locationId) {
        whereClause += ` AND i.location = $${paramIndex}`;
        queryParams.push(locationId);
        paramIndex++;
      }

      const inventoryQuery = `
        SELECT 
          COALESCE(i.location, 'Default Location') as location_name,
          COALESCE(ARRAY_AGG(
            json_build_object(
              'id', i.id,
              'product_id', i.product_id,
              'product_name', p.name,
              'quantity', i.quantity,
              'variant_combination', i.variant_combination,
              'price', COALESCE(i.price, p.price),
              'cost', i.cost,
              'sku', i.sku,
              'position', i.position,
              'product_images', p.images,
              'product_status', p.status,
              'base_price', p.price,
              'created_at', i.created_at,
              'updated_at', i.updated_at
            ) ORDER BY i.position, i.created_at
          ) FILTER (WHERE i.id IS NOT NULL), 
          ARRAY[]::json[]) as inventory_items,
          COUNT(DISTINCT i.id) as product_count,
          COALESCE(SUM(i.quantity), 0) as total_quantity
        FROM inventory i
        JOIN products p ON i.product_id = p.id AND p.tenant_id = $1
        ${whereClause}
        GROUP BY COALESCE(i.location, 'Default Location')
        ORDER BY COALESCE(i.location, 'Default Location')
      `;

      const result = await query(inventoryQuery, queryParams);

      // Transform the result into a location-keyed object (using location name as key for old system)
      const inventoryByLocation = {};
      
      result.rows.forEach(row => {
        // Transform inventory items to match expected format
        const transformedItems = row.inventory_items.map(item => ({
          ...item,
          formattedTitle: item.product_name,
          formattedSKU: item.sku || '-',
          formattedLocation: row.location_name,
          availableCount: item.quantity || 0,
          onHandCount: item.quantity || 0,
          committedCount: 0,
          unavailableCount: 0,
          stockStatus: {
            status: item.quantity === 0 ? 'out_of_stock' : (item.quantity <= 5 ? 'low_stock' : 'in_stock'),
            label: item.quantity === 0 ? 'Out of stock' : (item.quantity <= 5 ? 'Low stock' : 'In stock'),
            color: item.quantity === 0 ? 'error' : (item.quantity <= 5 ? 'warning' : 'success'),
            class: item.quantity === 0 ? 'status-error' : (item.quantity <= 5 ? 'status-warning' : 'status-success')
          },
          isLowStock: item.quantity > 0 && item.quantity <= 5,
          isOutOfStock: item.quantity === 0,
          hasVariants: !!(item.variant_combination && Object.keys(item.variant_combination).length > 0),
          formattedPrice: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.price || 0),
          formattedCost: item.cost ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.cost) : null,
          totalValue: (item.quantity || 0) * (item.cost || item.price || 0),
          formattedTotalValue: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((item.quantity || 0) * (item.cost || item.price || 0))
        }));

        // Use location name as key for old system (no location IDs)
        inventoryByLocation[row.location_name] = transformedItems;
      });

      return jsonResponse(inventoryByLocation);
    }

  } catch (error) {
    console.error('Get inventory by location error:', error);
    return internalServerErrorResponse('Failed to fetch inventory by location');
  }
}