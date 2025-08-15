import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const action = searchParams.get('action');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const threshold = parseInt(searchParams.get('threshold')) || 5;

    switch (action) {
      case 'low_stock':
        const lowStockProducts = await query(`
          SELECT p.id, p.name, p.price, p.images, p.status,
                 COALESCE(SUM(i.quantity), 0) as total_quantity,
                 COUNT(i.id) as variant_count
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id AND i.tenant_id = p.tenant_id
          WHERE p.tenant_id = $1
          GROUP BY p.id, p.name, p.price, p.images, p.status
          HAVING COALESCE(SUM(i.quantity), 0) <= $2
          ORDER BY total_quantity ASC
        `, [DEFAULT_TENANT_ID, threshold]);
        return jsonResponse(lowStockProducts.rows);

      case 'value':
        const inventoryValue = await query(`
          SELECT 
            COUNT(DISTINCT p.id) as total_products,
            COUNT(i.id) as total_variants,
            COALESCE(SUM(i.quantity), 0) as total_quantity,
            COALESCE(SUM(i.quantity * COALESCE(i.price, p.price)), 0) as total_value,
            COALESCE(SUM(i.quantity * COALESCE(i.cost, 0)), 0) as total_cost
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id AND i.tenant_id = p.tenant_id
          WHERE p.tenant_id = $1
        `, [DEFAULT_TENANT_ID]);
        return jsonResponse(inventoryValue.rows[0] || {});

      case 'search':
        if (!search) {
          return jsonResponse([]);
        }
        const searchResults = await query(`
          SELECT p.id, p.name, p.description, p.price, p.images, p.status,
                 COALESCE(SUM(i.quantity), 0) as total_quantity,
                 COUNT(i.id) as variant_count,
                 COALESCE(ARRAY_AGG(
                   json_build_object(
                     'id', i.id,
                     'quantity', i.quantity,
                     'variant_combination', i.variant_combination,
                     'price', i.price,
                     'sku', i.sku,
                     'cost', i.cost,
                     'location', i.location,
                     'position', i.position
                   ) ORDER BY i.position
                 ) FILTER (WHERE i.id IS NOT NULL), ARRAY[]::json[]) as inventory
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id AND i.tenant_id = p.tenant_id
          WHERE p.tenant_id = $1 AND p.name ILIKE $2
          GROUP BY p.id, p.name, p.description, p.price, p.images, p.status
          ORDER BY p.created_at DESC
          LIMIT $3
        `, [DEFAULT_TENANT_ID, `%${search}%`, limit]);
        return jsonResponse(searchResults.rows);

      case 'product':
        const productId = searchParams.get('product_id');
        if (!productId) {
          return badRequestResponse('product_id is required for product action');
        }
        const productWithInventory = await query(`
          SELECT p.*, 
                 COALESCE(ARRAY_AGG(
                   json_build_object(
                     'id', i.id,
                     'quantity', i.quantity,
                     'variant_combination', i.variant_combination,
                     'price', i.price,
                     'sku', i.sku,
                     'cost', i.cost,
                     'location', i.location,
                     'position', i.position
                   ) ORDER BY i.position
                 ) FILTER (WHERE i.id IS NOT NULL), ARRAY[]::json[]) as inventory
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id AND i.tenant_id = p.tenant_id
          WHERE p.id = $1 AND p.tenant_id = $2
          GROUP BY p.id
        `, [productId, DEFAULT_TENANT_ID]);
        if (productWithInventory.rows.length === 0) {
          return badRequestResponse('Product not found');
        }
        return jsonResponse(productWithInventory.rows[0]);

      case 'variant':
        const productIdVariant = searchParams.get('product_id');
        const variantCombination = searchParams.get('variant_combination');
        if (!productIdVariant || !variantCombination) {
          return badRequestResponse('product_id and variant_combination are required for variant action');
        }
        try {
          const parsedVariant = JSON.parse(variantCombination);
          const inventoryByVariant = await query(`
            SELECT * FROM inventory 
            WHERE product_id = $1 AND variant_combination = $2 AND tenant_id = $3
          `, [productIdVariant, JSON.stringify(parsedVariant), DEFAULT_TENANT_ID]);
          return jsonResponse(inventoryByVariant.rows);
        } catch (error) {
          return badRequestResponse('Invalid variant_combination JSON format');
        }

      default:
        // Default: get all products with inventory
        const products = await query(`
          SELECT p.*, 
                 COALESCE(SUM(i.quantity), 0) as total_quantity,
                 COUNT(i.id) as variant_count,
                 COALESCE(ARRAY_AGG(
                   json_build_object(
                     'id', i.id,
                     'quantity', i.quantity,
                     'variant_combination', i.variant_combination,
                     'price', i.price,
                     'sku', i.sku,
                     'cost', i.cost,
                     'location', i.location,
                     'position', i.position
                   ) ORDER BY i.position
                 ) FILTER (WHERE i.id IS NOT NULL), ARRAY[]::json[]) as inventory
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id AND i.tenant_id = p.tenant_id
          WHERE p.tenant_id = $1
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT $2 OFFSET $3
        `, [DEFAULT_TENANT_ID, limit, offset]);
        return jsonResponse(products.rows);
    }
  } catch (error) {
    console.error('Get inventory error:', error);
    return internalServerErrorResponse('Failed to fetch inventory data');
  }
}

// POST /api/inventory - Create inventory record(s) for a product
export async function POST({ request }) {
  try {
    const data = await request.json();
    const tenantId = data.tenant_id || DEFAULT_TENANT_ID;
    
    // Validate required fields
    if (!data.product_id) {
      return badRequestResponse('product_id is required');
    }

    // Handle both single inventory item and array of items
    const inventoryItems = Array.isArray(data.inventory_items) ? data.inventory_items : [data];
    
    const createdRecords = [];
    const errors = [];

    for (const inventoryData of inventoryItems) {
      try {
        // Validate individual inventory item
        if (inventoryData.quantity === undefined) {
          errors.push('quantity is required for each inventory item');
          continue;
        }

        const inventoryRecord = {
          quantity: parseInt(inventoryData.quantity) || 0,
          variant_combination: inventoryData.variant_combination || {},
          price: parseFloat(inventoryData.price) || null,
          sku: inventoryData.sku || '',
          cost: parseFloat(inventoryData.cost) || null,
          location: inventoryData.location || '',
          position: parseInt(inventoryData.position) || 1
        };

        const result = await query(`
          INSERT INTO inventory (
            id, product_id, tenant_id, quantity, variant_combination, 
            price, sku, cost, location, position, created_at, updated_at
          ) VALUES (
            uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
          ) RETURNING *
        `, [
          data.product_id, tenantId, inventoryRecord.quantity, 
          JSON.stringify(inventoryRecord.variant_combination),
          inventoryRecord.price, inventoryRecord.sku, inventoryRecord.cost,
          inventoryRecord.location, inventoryRecord.position
        ]);
        createdRecords.push(result.rows[0]);
        
      } catch (error) {
        console.error('Error creating inventory record:', error);
        errors.push(`Failed to create inventory record: ${error.message}`);
      }
    }

    if (createdRecords.length === 0 && errors.length > 0) {
      return badRequestResponse(`Failed to create any inventory records: ${errors.join(', ')}`);
    }

    return jsonResponse({
      message: `Successfully created ${createdRecords.length} inventory record(s)`,
      created_records: createdRecords.length,
      errors: errors.length > 0 ? errors : undefined,
      data: createdRecords
    });

  } catch (error) {
    console.error('Create inventory error:', error);
    return internalServerErrorResponse('Failed to create inventory records');
  }
}

// PUT /api/inventory - Update inventory quantity
export async function PUT({ request }) {
  try {
    const data = await request.json();
    const tenantId = data.tenant_id || DEFAULT_TENANT_ID;
    
    // Validate required fields
    if (!data.inventory_id || data.quantity === undefined) {
      return badRequestResponse('inventory_id and quantity are required');
    }

    const result = await query(`
      UPDATE inventory 
      SET quantity = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [parseInt(data.quantity), data.inventory_id, tenantId]);
    const updatedRecord = result.rows[0];

    if (!updatedRecord) {
      return badRequestResponse('Inventory record not found');
    }

    return jsonResponse({
      message: 'Inventory updated successfully',
      data: updatedRecord
    });

  } catch (error) {
    console.error('Update inventory error:', error);
    return internalServerErrorResponse('Failed to update inventory');
  }
}

// DELETE /api/inventory - Delete inventory record
export async function DELETE({ request }) {
  try {
    const data = await request.json();
    const tenantId = data.tenant_id || DEFAULT_TENANT_ID;
    
    // Validate required fields
    if (!data.inventory_id) {
      return badRequestResponse('inventory_id is required');
    }

    const result = await query(`
      DELETE FROM inventory 
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [data.inventory_id, tenantId]);
    const deleted = result.rows.length > 0;

    if (!deleted) {
      return badRequestResponse('Inventory record not found');
    }

    return jsonResponse({
      message: 'Inventory record deleted successfully'
    });

  } catch (error) {
    console.error('Delete inventory error:', error);
    return internalServerErrorResponse('Failed to delete inventory record');
  }
}