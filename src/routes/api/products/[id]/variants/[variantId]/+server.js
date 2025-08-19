import { query, deleteCache } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse, badRequestResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const { id: productId, variantId } = params;
    
    // Get specific variant from new database structure
    const variantResult = await query(`
      SELECT 
        pv.id,
        pv.product_id,
        pv.title as variant_title,
        pv.sku,
        pv.barcode,
        pv.price as variant_price,
        pv.cost,
        pv.position,
        pv.weight,
        pv.weight_unit,
        pv.option1,
        pv.option2,
        pv.option3,
        pv.requires_shipping,
        pv.created_at,
        pv.updated_at,
        p.title as product_name,
        p.description,
        p.images,
        p.status,
        -- Get inventory levels across all locations
        COALESCE(ARRAY_AGG(
          json_build_object(
            'location_id', l.id,
            'location_name', l.name,
            'available', COALESCE(il.available, 0),
            'on_hand', COALESCE(il.on_hand, 0),
            'committed', COALESCE(il.committed, 0),
            'reserved', COALESCE(il.reserved, 0)
          ) ORDER BY l.name
        ) FILTER (WHERE l.id IS NOT NULL), ARRAY[]::json[]) as inventory_levels
      FROM product_variants_new pv
      INNER JOIN products_new p ON pv.product_id = p.id
      LEFT JOIN inventory_levels_new il ON il.variant_id = pv.id
      LEFT JOIN locations l ON l.id = il.location_id
      WHERE pv.id = $1 AND pv.product_id = $2 AND p.tenant_id = $3
      GROUP BY pv.id, p.id
    `, [variantId, productId, DEFAULT_TENANT_ID]);
    
    if (variantResult.rows.length === 0) {
      return notFoundResponse('Variant not found');
    }
    
    const variant = variantResult.rows[0];
    
    // Build variant title from options
    let variantTitle = variant.variant_title || 'Default Title';
    if (!variantTitle || variantTitle === 'Default Title') {
      const options = [variant.option1, variant.option2, variant.option3].filter(Boolean);
      variantTitle = options.length > 0 ? options.join(' / ') : 'Default Title';
    }
    
    // Calculate totals across all locations
    let totalAvailable = 0;
    let totalOnHand = 0;
    let totalCommitted = 0;
    
    variant.inventory_levels.forEach(level => {
      totalAvailable += level.available || 0;
      totalOnHand += level.on_hand || 0;
      totalCommitted += level.committed || 0;
    });
    
    const variantData = {
      id: variant.id,
      product_id: variant.product_id,
      color: variant.option1 || '', // Use option1 as color for simplicity
      size: variant.option2 || '',  // Use option2 as size for simplicity
      // Include actual option fields for frontend compatibility
      option1: variant.option1 || null,
      option2: variant.option2 || null,
      option3: variant.option3 || null,
      title: variantTitle,
      price: variant.variant_price || 0,
      compare_at_price: null,
      cost: variant.cost || 0,
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      inventory_quantity: totalAvailable, // Total available across all locations
      available: totalAvailable,
      on_hand: totalOnHand,
      committed: totalCommitted,
      unavailable: totalOnHand - totalAvailable,
      track_quantity: true, // Default to true for Shopify-style variants
      continue_selling_when_out_of_stock: false,
      requires_shipping: variant.requires_shipping !== false,
      weight: variant.weight || 0,
      weight_unit: variant.weight_unit || 'lb',
      inventory_levels: variant.inventory_levels, // Include per-location inventory
      created_at: variant.created_at,
      updated_at: variant.updated_at,
      // Include product info
      product: {
        id: variant.product_id,
        name: variant.product_name,
        description: variant.description,
        images: variant.images,
        status: variant.status
      }
    };
    
    return jsonResponse(variantData);
  } catch (error) {
    console.error('Get variant error:', error);
    return internalServerErrorResponse('Failed to fetch variant');
  }
}

export async function PUT({ params, request }) {
  try {
    const { id: productId, variantId } = params;
    const updateData = await request.json();
    const { location_id } = updateData; // Optional location filter for inventory updates
    
    // Verify variant exists
    const variantResult = await query(`
      SELECT id, product_id, sku, barcode, option1, option2, option3
      FROM product_variants_new
      WHERE id = $1 AND product_id = $2
    `, [variantId, productId]);
    
    if (variantResult.rows.length === 0) {
      return notFoundResponse('Variant not found');
    }
    
    // Handle inventory quantity update
    if (updateData.inventory_quantity !== undefined) {
      const newQuantity = parseInt(updateData.inventory_quantity) || 0;
      
      if (location_id) {
        // Update specific location inventory
        const existingInventory = await query(`
          SELECT id FROM inventory_levels_new 
          WHERE variant_id = $1 AND location_id = $2
        `, [variantId, location_id]);
        
        if (existingInventory.rows.length > 0) {
          // Update existing inventory
          await query(`
            UPDATE inventory_levels_new 
            SET available = $1, on_hand = $1, updated_at = NOW()
            WHERE variant_id = $2 AND location_id = $3
          `, [newQuantity, variantId, location_id]);
        } else {
          // Create new inventory level for this location
          await query(`
            INSERT INTO inventory_levels_new (id, variant_id, location_id, available, on_hand, committed, reserved, created_at, updated_at)
            VALUES (uuid_generate_v4(), $1, $2, $3, $3, 0, 0, NOW(), NOW())
          `, [variantId, location_id, newQuantity]);
        }
      } else {
        // Update all locations (or default location if none specified)
        const defaultLocation = await query(`
          SELECT id FROM locations WHERE is_default = true LIMIT 1
        `);
        
        if (defaultLocation.rows.length > 0) {
          const defaultLocationId = defaultLocation.rows[0].id;
          
          const existingInventory = await query(`
            SELECT id FROM inventory_levels_new 
            WHERE variant_id = $1 AND location_id = $2
          `, [variantId, defaultLocationId]);
          
          if (existingInventory.rows.length > 0) {
            await query(`
              UPDATE inventory_levels_new 
              SET available = $1, on_hand = $1, updated_at = NOW()
              WHERE variant_id = $2 AND location_id = $3
            `, [newQuantity, variantId, defaultLocationId]);
          } else {
            await query(`
              INSERT INTO inventory_levels_new (id, variant_id, location_id, available, on_hand, committed, reserved, created_at, updated_at)
              VALUES (uuid_generate_v4(), $1, $2, $3, $3, 0, 0, NOW(), NOW())
            `, [variantId, defaultLocationId, newQuantity]);
          }
        }
      }
    }
    
    // Handle variant attribute updates
    const updateFields = [];
    const updateValues = [];
    
    // Track if any options are being updated so we can update title
    let optionsUpdated = false;
    let newOption1 = null;
    let newOption2 = null; 
    let newOption3 = null;

    // Handle variant attributes update in new database structure
    if (updateData.color !== undefined || updateData.size !== undefined) {
      // Update option1 (color) and option2 (size) in product_variants_new
      if (updateData.color !== undefined) {
        updateFields.push('option1 = $' + (updateValues.length + 1));
        updateValues.push(updateData.color);
        newOption1 = updateData.color;
        optionsUpdated = true;
      }
      if (updateData.size !== undefined) {
        updateFields.push('option2 = $' + (updateValues.length + 1));
        updateValues.push(updateData.size);
        newOption2 = updateData.size;
        optionsUpdated = true;
      }
    }
    
    // Handle direct option updates (option1, option2, option3)
    if (updateData.option1 !== undefined) {
      updateFields.push('option1 = $' + (updateValues.length + 1));
      updateValues.push(updateData.option1);
      newOption1 = updateData.option1;
      optionsUpdated = true;
    }
    
    if (updateData.option2 !== undefined) {
      updateFields.push('option2 = $' + (updateValues.length + 1));
      updateValues.push(updateData.option2);
      newOption2 = updateData.option2;
      optionsUpdated = true;
    }
    
    if (updateData.option3 !== undefined) {
      updateFields.push('option3 = $' + (updateValues.length + 1));
      updateValues.push(updateData.option3);
      newOption3 = updateData.option3;
      optionsUpdated = true;
    }
    
    if (updateData.sku !== undefined) {
      updateFields.push('sku = $' + (updateValues.length + 1));
      updateValues.push(updateData.sku);
    }
    
    if (updateData.barcode !== undefined) {
      updateFields.push('barcode = $' + (updateValues.length + 1));
      updateValues.push(updateData.barcode);
    }
    
    if (updateData.price !== undefined) {
      updateFields.push('price = $' + (updateValues.length + 1));
      updateValues.push(updateData.price);
    }
    
    if (updateData.cost !== undefined) {
      updateFields.push('cost = $' + (updateValues.length + 1));
      updateValues.push(updateData.cost);
    }
    
    if (updateData.weight !== undefined) {
      updateFields.push('weight = $' + (updateValues.length + 1));
      updateValues.push(updateData.weight);
    }
    
    if (updateData.weight_unit !== undefined) {
      updateFields.push('weight_unit = $' + (updateValues.length + 1));
      updateValues.push(updateData.weight_unit);
    }
    
    if (updateData.requires_shipping !== undefined) {
      updateFields.push('requires_shipping = $' + (updateValues.length + 1));
      updateValues.push(updateData.requires_shipping);
    }
    
    // Note: track_quantity not supported in Shopify-style schema
    
    // If options were updated, we need to auto-update the title
    if (optionsUpdated) {
      // Get current option values to merge with updates
      const currentVariant = await query(`
        SELECT option1, option2, option3 FROM product_variants_new WHERE id = $1
      `, [variantId]);
      
      if (currentVariant.rows.length > 0) {
        const current = currentVariant.rows[0];
        
        // Use new values if provided, otherwise keep current values
        const finalOption1 = newOption1 !== null ? newOption1 : current.option1;
        const finalOption2 = newOption2 !== null ? newOption2 : current.option2;
        const finalOption3 = newOption3 !== null ? newOption3 : current.option3;
        
        // Build new title from final option values
        const titleParts = [finalOption1, finalOption2, finalOption3].filter(opt => opt && opt.trim());
        const newTitle = titleParts.length > 0 ? titleParts.join(' / ') : 'Default Title';
        
        // Add title update to the fields
        updateFields.push('title = $' + (updateValues.length + 1));
        updateValues.push(newTitle);
      }
    }

    // Update variant record if there are fields to update
    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(variantId);
      
      await query(`
        UPDATE product_variants_new 
        SET ${updateFields.join(', ')}
        WHERE id = $${updateValues.length}
      `, updateValues);
    }
    
    // Invalidate product cache since variant data has changed
    const productCacheKey = `product_${productId}_${DEFAULT_TENANT_ID}`;
    try {
      const cacheDeleted = await deleteCache(productCacheKey);
      console.log(`Product cache ${cacheDeleted ? 'invalidated' : 'not found'} for ${productCacheKey} after variant update`);
    } catch (error) {
      console.error('Failed to invalidate product cache:', error);
    }
    
    return successResponse('Variant updated successfully');
  } catch (error) {
    console.error('Update variant error:', error);
    return internalServerErrorResponse(`Failed to update variant: ${error.message}`);
  }
}