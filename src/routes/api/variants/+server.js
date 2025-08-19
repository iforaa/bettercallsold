/**
 * Product Variants API - Shopify-style variant management
 * Handles product variants with location-based inventory tracking
 */

import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { FeatureFlags } from '$lib/services/FeatureFlags.js';

export async function GET({ url }) {
  try {
    // Check if new variants system is enabled
    const useNewVariants = await FeatureFlags.isEnabled(FeatureFlags.FLAGS.USE_PRODUCT_VARIANTS);
    if (!useNewVariants) {
      return badRequestResponse('Product variants system is not enabled');
    }

    const searchParams = url.searchParams;
    const productId = searchParams.get('product_id');
    const variantId = searchParams.get('variant_id');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    if (variantId) {
      // Get single variant with inventory levels
      const variantResult = await query(`
        SELECT pv.*,
               COALESCE(ARRAY_AGG(
                 json_build_object(
                   'location_id', l.id,
                   'location_name', l.name,
                   'available', il.available,
                   'committed', il.committed,
                   'on_hand', il.on_hand,
                   'reserved', il.reserved,
                   'damage', il.damage,
                   'is_default', l.is_default
                 ) ORDER BY l.is_default DESC, l.name
               ) FILTER (WHERE il.id IS NOT NULL), ARRAY[]::json[]) as inventory_levels
        FROM product_variants_new pv
        LEFT JOIN inventory_levels_new il ON il.variant_id = pv.id
        LEFT JOIN locations l ON l.id = il.location_id
        WHERE pv.id = $1
        GROUP BY pv.id
      `, [variantId]);

      if (variantResult.rows.length === 0) {
        return badRequestResponse('Variant not found');
      }

      return jsonResponse(variantResult.rows[0]);
    }

    if (productId) {
      // Get all variants for a product
      const variantsResult = await query(`
        SELECT pv.*,
               COALESCE(SUM(il.available), 0) as total_available,
               COUNT(DISTINCT il.location_id) as location_count,
               COALESCE(ARRAY_AGG(
                 json_build_object(
                   'location_id', l.id,
                   'location_name', l.name,
                   'available', il.available,
                   'committed', il.committed,
                   'on_hand', il.on_hand
                 ) ORDER BY l.name
               ) FILTER (WHERE il.id IS NOT NULL), ARRAY[]::json[]) as inventory_levels
        FROM product_variants_new pv
        LEFT JOIN inventory_levels_new il ON il.variant_id = pv.id
        LEFT JOIN locations l ON l.id = il.location_id
        INNER JOIN products_new p ON p.id = pv.product_id
        WHERE pv.product_id = $1 AND p.tenant_id = $2
        GROUP BY pv.id
        ORDER BY pv.position, pv.created_at
        LIMIT $3 OFFSET $4
      `, [productId, DEFAULT_TENANT_ID, limit, offset]);

      return jsonResponse(variantsResult.rows);
    }

    // Get all variants (paginated)
    const allVariantsResult = await query(`
      SELECT pv.*,
             p.title as product_title,
             COALESCE(SUM(il.available), 0) as total_available,
             COUNT(DISTINCT il.location_id) as location_count
      FROM product_variants_new pv
      INNER JOIN products_new p ON p.id = pv.product_id
      LEFT JOIN inventory_levels_new il ON il.variant_id = pv.id
      WHERE p.tenant_id = $1
      GROUP BY pv.id, p.title
      ORDER BY p.title, pv.position
      LIMIT $2 OFFSET $3
    `, [DEFAULT_TENANT_ID, limit, offset]);

    return jsonResponse(allVariantsResult.rows);

  } catch (error) {
    console.error('Get variants error:', error);
    return internalServerErrorResponse('Failed to fetch variants');
  }
}

export async function POST({ request }) {
  try {
    // Check if new variants system is enabled
    const useNewVariants = await FeatureFlags.isEnabled(FeatureFlags.FLAGS.USE_PRODUCT_VARIANTS);
    if (!useNewVariants) {
      return badRequestResponse('Product variants system is not enabled');
    }

    const variantData = await request.json();

    // Validate required fields
    if (!variantData.product_id || !variantData.title) {
      return badRequestResponse('product_id and title are required');
    }

    // Create the variant
    const variantResult = await query(`
      INSERT INTO product_variants_new (
        product_id, title, sku, barcode, price, compare_at_price, cost,
        position, weight, weight_unit, requires_shipping, taxable,
        option1, option2, option3, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      ) RETURNING *
    `, [
      variantData.product_id,
      variantData.title,
      variantData.sku || null,
      variantData.barcode || null,
      parseFloat(variantData.price) || null,
      parseFloat(variantData.compare_at_price) || null,
      parseFloat(variantData.cost) || null,
      parseInt(variantData.position) || 1,
      parseFloat(variantData.weight) || null,
      variantData.weight_unit || 'kg',
      variantData.requires_shipping !== false,
      variantData.taxable !== false,
      variantData.option1 || null,
      variantData.option2 || null,
      variantData.option3 || null
    ]);

    const newVariant = variantResult.rows[0];

    // Create inventory levels for all locations if inventory data provided
    if (variantData.inventory_levels) {
      const locations = await query('SELECT id FROM locations WHERE tenant_id = $1', [DEFAULT_TENANT_ID]);
      
      for (const location of locations.rows) {
        const locationInventory = variantData.inventory_levels[location.id] || { available: 0 };
        
        await query(`
          INSERT INTO inventory_levels_new (
            variant_id, location_id, available, committed, on_hand, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [
          newVariant.id,
          location.id,
          parseInt(locationInventory.available) || 0,
          parseInt(locationInventory.committed) || 0,
          parseInt(locationInventory.on_hand) || parseInt(locationInventory.available) || 0
        ]);
      }
    }

    return jsonResponse({
      message: 'Variant created successfully',
      data: newVariant
    });

  } catch (error) {
    console.error('Create variant error:', error);
    return internalServerErrorResponse('Failed to create variant');
  }
}

export async function PUT({ request }) {
  try {
    // Check if new variants system is enabled
    const useNewVariants = await FeatureFlags.isEnabled(FeatureFlags.FLAGS.USE_PRODUCT_VARIANTS);
    if (!useNewVariants) {
      return badRequestResponse('Product variants system is not enabled');
    }

    const data = await request.json();

    // Validate required fields
    if (!data.variant_id) {
      return badRequestResponse('variant_id is required');
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(data.title);
      paramIndex++;
    }
    if (data.sku !== undefined) {
      updateFields.push(`sku = $${paramIndex}`);
      values.push(data.sku);
      paramIndex++;
    }
    if (data.barcode !== undefined) {
      updateFields.push(`barcode = $${paramIndex}`);
      values.push(data.barcode);
      paramIndex++;
    }
    if (data.price !== undefined) {
      updateFields.push(`price = $${paramIndex}`);
      values.push(parseFloat(data.price));
      paramIndex++;
    }
    if (data.cost !== undefined) {
      updateFields.push(`cost = $${paramIndex}`);
      values.push(parseFloat(data.cost));
      paramIndex++;
    }
    if (data.weight !== undefined) {
      updateFields.push(`weight = $${paramIndex}`);
      values.push(parseFloat(data.weight));
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return badRequestResponse('No fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(data.variant_id);

    const result = await query(`
      UPDATE product_variants_new 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return badRequestResponse('Variant not found');
    }

    return jsonResponse({
      message: 'Variant updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update variant error:', error);
    return internalServerErrorResponse('Failed to update variant');
  }
}

export async function DELETE({ request }) {
  try {
    // Check if new variants system is enabled
    const useNewVariants = await FeatureFlags.isEnabled(FeatureFlags.FLAGS.USE_PRODUCT_VARIANTS);
    if (!useNewVariants) {
      return badRequestResponse('Product variants system is not enabled');
    }

    const data = await request.json();

    if (!data.variant_id) {
      return badRequestResponse('variant_id is required');
    }

    // Delete the variant (cascade will handle inventory levels)
    const result = await query(`
      DELETE FROM product_variants_new 
      WHERE id = $1
      RETURNING id
    `, [data.variant_id]);

    if (result.rows.length === 0) {
      return badRequestResponse('Variant not found');
    }

    return jsonResponse({
      message: 'Variant deleted successfully'
    });

  } catch (error) {
    console.error('Delete variant error:', error);
    return internalServerErrorResponse('Failed to delete variant');
  }
}