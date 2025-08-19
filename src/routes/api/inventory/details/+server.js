import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { CacheService } from '$lib/services/CacheService.js';

export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const search = searchParams.get('search');
    const locationFilter = searchParams.get('location');

    // Create cache key from filters
    const filters = {
      limit,
      offset,
      search: search || '',
      location: locationFilter || 'all'
    };

    // Try to get from cache first
    const cachedData = await CacheService.getInventory(DEFAULT_TENANT_ID, filters);
    if (cachedData) {
      return jsonResponse(cachedData);
    }

    let result, countResult, totalCount;
    // Use new Shopify-style inventory system
    let whereClause = 'WHERE p.tenant_id = $1';
    let queryParams = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    // Add location filter if provided
    if (locationFilter && locationFilter !== 'all') {
      whereClause += ` AND l.name = $${paramIndex}`;
      queryParams.push(locationFilter);
      paramIndex++;
    }

    // Add search filter if provided
    if (search) {
      whereClause += ` AND (p.title ILIKE $${paramIndex} OR pv.sku ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

      const inventoryQuery = `
        SELECT 
          pv.id,
          p.id as product_id,
          p.title as product_name,
          pv.title as variant_title,
          pv.sku,
          pv.price,
          pv.cost,
          pv.position,
          pv.option1,
          pv.option2,
          pv.option3,
          pv.created_at,
          pv.updated_at,
          p.images as product_images,
          p.status as product_status,
          l.name as location_name,
          il.available,
          il.committed,
          il.on_hand,
          il.reserved
        FROM products_new p
        INNER JOIN product_variants_new pv ON pv.product_id = p.id
        LEFT JOIN inventory_levels_new il ON il.variant_id = pv.id
        LEFT JOIN locations l ON l.id = il.location_id
        ${whereClause}
        ORDER BY p.title, pv.position, pv.created_at
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

    queryParams.push(limit, offset);
    result = await query(inventoryQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products_new p
      INNER JOIN product_variants_new pv ON pv.product_id = p.id
      LEFT JOIN inventory_levels_new il ON il.variant_id = pv.id
      LEFT JOIN locations l ON l.id = il.location_id
      ${whereClause}
    `;
    const countParams = queryParams.slice(0, -2);
    countResult = await query(countQuery, countParams);
    totalCount = parseInt(countResult.rows[0].total);

    // Transform the data for the frontend using new Shopify-style structure
    const inventoryItems = result.rows.map(row => ({
      id: row.id,
      product_id: row.product_id,
      product_name: row.product_name,
      quantity: row.available || 0, // Use available for backward compatibility
      available: row.available || 0,
      on_hand: row.on_hand || 0,
      committed: row.committed || 0,
      unavailable: (row.on_hand || 0) - (row.available || 0), // Calculated from on_hand - available
      variant_title: row.variant_title,
      // Create variant_combination from Shopify options for backward compatibility
      variant_combination: row.option1 || row.option2 || row.option3 ? {
        option1: row.option1,
        option2: row.option2,
        option3: row.option3
      } : null,
      // Map all options to size and color dynamically (we'll fix this in InventoryService)
      option1: row.option1,
      option2: row.option2, 
      option3: row.option3,
      // Keep original logic for now, but we'll improve it in the service layer
      size: row.option1 ? { Valid: true, String: row.option1 } : { Valid: false, String: '' },
      color: row.option2 ? { Valid: true, String: row.option2 } : { Valid: false, String: '' },
      price: row.price,
      cost: row.cost,
      sku: row.sku ? { Valid: true, String: row.sku } : { Valid: false, String: '' },
      location: row.location_name ? { Valid: true, String: row.location_name } : { Valid: false, String: '' },
      position: row.position,
      product_images: row.product_images,
      product_status: row.product_status,
      base_price: row.price, // In new structure, price is the base price
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    // Prepare response data
    const responseData = {
      items: inventoryItems,
      pagination: {
        total: totalCount,
        limit: limit,
        offset: offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + inventoryItems.length < totalCount,
        hasPrev: offset > 0
      }
    };

    // Cache the result for faster subsequent requests
    await CacheService.setInventory(DEFAULT_TENANT_ID, filters, responseData);

    return jsonResponse(responseData);
  } catch (error) {
    console.error('Get inventory details error:', error);
    return internalServerErrorResponse('Failed to fetch inventory details');
  }
}

// Update inventory quantity
export async function PATCH({ request }) {
  try {
    const { id, quantity, reason = 'Manual adjustment' } = await request.json();

    if (!id || quantity === undefined) {
      return jsonResponse({ error: 'ID and quantity are required' }, { status: 400 });
    }

    // Update new inventory system - update inventory_levels table
    const result = await query(`
      UPDATE inventory_levels_new
      SET available = $1, on_hand = $1, updated_at = NOW()
      WHERE variant_id = $2
      RETURNING *
    `, [quantity, id]);

    if (result.rows.length === 0) {
      return jsonResponse({ error: 'Inventory item not found' }, { status: 404 });
    }

    const updatedItem = result.rows[0];

    // Get variant and product info for the response
    const productResult = await query(`
      SELECT pv.sku, pv.price, p.title as product_name
      FROM product_variants_new pv
      JOIN products_new p ON p.id = pv.product_id
      WHERE pv.id = $1 AND p.tenant_id = $2
    `, [id, DEFAULT_TENANT_ID]);

    const productInfo = productResult.rows[0];

    // Invalidate relevant caches after inventory update
    await CacheService.invalidateInventory(DEFAULT_TENANT_ID, id);
    await CacheService.invalidateVariant(id);

    return jsonResponse({
      success: true,
      item: {
        id: updatedItem.variant_id,
        product_name: productInfo?.product_name,
        quantity: updatedItem.available,
        available: updatedItem.available,
        on_hand: updatedItem.on_hand,
        committed: updatedItem.committed || 0,
        price: productInfo?.price,
        sku: productInfo?.sku,
        updated_at: updatedItem.updated_at
      }
    });

  } catch (error) {
    console.error('Update inventory error:', error);
    return internalServerErrorResponse('Failed to update inventory');
  }
}