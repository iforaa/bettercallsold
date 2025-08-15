import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const search = searchParams.get('search');

    let whereClause = 'WHERE i.tenant_id = $1';
    let queryParams = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    // Add search filter if provided
    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR i.sku ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const inventoryQuery = `
      SELECT 
        i.id,
        i.product_id,
        i.quantity,
        i.variant_combination,
        i.price,
        i.cost,
        i.sku,
        i.location,
        i.position,
        i.created_at,
        i.updated_at,
        p.name as product_name,
        p.price as base_price,
        p.images as product_images,
        p.status as product_status
      FROM inventory i
      JOIN products p ON i.product_id = p.id AND p.tenant_id = $1
      ${whereClause}
      ORDER BY p.name, i.position, i.created_at
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await query(inventoryQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM inventory i
      JOIN products p ON i.product_id = p.id AND p.tenant_id = $1
      ${whereClause}
    `;
    const countParams = queryParams.slice(0, -2); // Remove limit and offset params
    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);

    // Transform the data for the frontend
    const inventoryItems = result.rows.map(row => ({
      id: row.id,
      product_id: row.product_id,
      product_name: row.product_name,
      quantity: row.quantity,
      variant_combination: row.variant_combination,
      // Extract size and color from variant_combination for backward compatibility
      size: row.variant_combination?.size ? { Valid: true, String: row.variant_combination.size } : { Valid: false, String: '' },
      color: row.variant_combination?.color ? { Valid: true, String: row.variant_combination.color } : { Valid: false, String: '' },
      price: row.price || row.base_price,
      cost: row.cost,
      sku: row.sku ? { Valid: true, String: row.sku } : { Valid: false, String: '' },
      location: row.location ? { Valid: true, String: row.location } : { Valid: false, String: '' },
      position: row.position,
      product_images: row.product_images,
      product_status: row.product_status,
      base_price: row.base_price,
      unavailable: 0, // Could be calculated if needed
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    // Return paginated response with metadata
    return jsonResponse({
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
    });
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

    // Update the inventory record
    const result = await query(`
      UPDATE inventory 
      SET quantity = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [quantity, id, DEFAULT_TENANT_ID]);

    if (result.rows.length === 0) {
      return jsonResponse({ error: 'Inventory item not found' }, { status: 404 });
    }

    const updatedItem = result.rows[0];

    // Get product info for the response
    const productResult = await query(`
      SELECT name, price FROM products WHERE id = $1 AND tenant_id = $2
    `, [updatedItem.product_id, DEFAULT_TENANT_ID]);

    const productInfo = productResult.rows[0];

    return jsonResponse({
      success: true,
      item: {
        id: updatedItem.id,
        product_name: productInfo?.name,
        quantity: updatedItem.quantity,
        variant_combination: updatedItem.variant_combination,
        price: updatedItem.price || productInfo?.price,
        sku: updatedItem.sku,
        updated_at: updatedItem.updated_at
      }
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    return internalServerErrorResponse('Failed to update inventory');
  }
}