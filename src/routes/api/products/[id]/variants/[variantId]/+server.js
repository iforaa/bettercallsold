import { query } from '$lib/database.js';
import { updateInventoryQuantity } from '$lib/inventory-db.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse, badRequestResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const { id: productId, variantId } = params;
    
    // Get specific inventory record (real variant ID)
    const inventoryResult = await query(`
      SELECT 
        inv.id,
        inv.product_id,
        inv.quantity,
        inv.variant_combination,
        inv.sku,
        inv.shopify_barcode as barcode,
        inv.location,
        inv.price as variant_price,
        inv.cost,
        inv.position,
        inv.weight,
        inv.created_at,
        inv.updated_at,
        p.name as product_name,
        p.description,
        p.price as base_price,
        p.images,
        p.status
      FROM inventory inv
      INNER JOIN products p ON inv.product_id = p.id
      WHERE inv.id = $1 AND inv.product_id = $2 AND inv.tenant_id = $3
    `, [variantId, productId, DEFAULT_TENANT_ID]);
    
    if (inventoryResult.rows.length === 0) {
      return notFoundResponse('Variant not found');
    }
    
    const record = inventoryResult.rows[0];
    
    let variantTitle = 'Default Title';
    let color = '';
    let size = '';
    
    // Parse variant combination
    if (record.variant_combination) {
      try {
        const combo = typeof record.variant_combination === 'string' 
          ? JSON.parse(record.variant_combination) 
          : record.variant_combination;
        
        color = combo.color || '';
        size = combo.size || '';
        
        if (color || size) {
          const parts = [];
          if (color) parts.push(color);
          if (size) parts.push(size);
          variantTitle = parts.join(' / ');
        }
      } catch (error) {
        console.error('Error parsing variant_combination:', error);
      }
    }
    
    const variantData = {
      id: record.id, // Real inventory record ID
      product_id: record.product_id,
      color,
      size,
      title: variantTitle,
      price: record.variant_price || record.base_price,
      compare_at_price: null,
      sku: record.sku || '',
      barcode: record.barcode || '',
      inventory_quantity: record.quantity || 0,
      available: record.quantity || 0,
      on_hand: record.quantity || 0,
      committed: 0,
      unavailable: 0,
      track_quantity: true,
      continue_selling_when_out_of_stock: false,
      requires_shipping: true,
      weight: record.weight || 0,
      weight_unit: 'lb',
      location: record.location || '',
      created_at: record.created_at,
      updated_at: record.updated_at,
      // Include product info
      product: {
        id: record.product_id,
        name: record.product_name,
        description: record.description,
        images: record.images,
        status: record.status
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
    
    // Verify inventory record exists
    const inventoryResult = await query(`
      SELECT id, product_id, quantity, variant_combination, sku, shopify_barcode as barcode, location
      FROM inventory
      WHERE id = $1 AND product_id = $2 AND tenant_id = $3
    `, [variantId, productId, DEFAULT_TENANT_ID]);
    
    if (inventoryResult.rows.length === 0) {
      return notFoundResponse('Variant not found');
    }
    
    const currentRecord = inventoryResult.rows[0];
    
    // Handle inventory quantity update
    if (updateData.inventory_quantity !== undefined) {
      const newQuantity = parseInt(updateData.inventory_quantity) || 0;
      await updateInventoryQuantity(variantId, newQuantity, DEFAULT_TENANT_ID);
    }
    
    // Handle variant attribute updates (color, size, sku, barcode)
    const updateFields = [];
    const updateValues = [];
    
    if (updateData.color !== undefined || updateData.size !== undefined) {
      // Parse current variant combination
      let variantCombo = {};
      if (currentRecord.variant_combination) {
        try {
          variantCombo = typeof currentRecord.variant_combination === 'string' 
            ? JSON.parse(currentRecord.variant_combination)
            : currentRecord.variant_combination;
        } catch (error) {
          console.error('Error parsing variant_combination:', error);
        }
      }
      
      // Update variant combination
      if (updateData.color !== undefined) variantCombo.color = updateData.color;
      if (updateData.size !== undefined) variantCombo.size = updateData.size;
      
      updateFields.push('variant_combination = $' + (updateValues.length + 1));
      updateValues.push(JSON.stringify(variantCombo));
    }
    
    if (updateData.sku !== undefined) {
      updateFields.push('sku = $' + (updateValues.length + 1));
      updateValues.push(updateData.sku);
    }
    
    if (updateData.barcode !== undefined) {
      updateFields.push('shopify_barcode = $' + (updateValues.length + 1));
      updateValues.push(updateData.barcode);
    }
    
    if (updateData.location !== undefined) {
      updateFields.push('location = $' + (updateValues.length + 1));
      updateValues.push(updateData.location);
    }
    
    if (updateData.price !== undefined) {
      updateFields.push('price = $' + (updateValues.length + 1));
      updateValues.push(updateData.price);
    }
    
    // Update inventory record if there are fields to update
    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(variantId, DEFAULT_TENANT_ID);
      
      await query(`
        UPDATE inventory 
        SET ${updateFields.join(', ')}
        WHERE id = $${updateValues.length - 1} AND tenant_id = $${updateValues.length}
      `, updateValues);
    }
    
    // Note: Individual variant prices are updated in the inventory record above
    
    return successResponse('Variant updated successfully');
  } catch (error) {
    console.error('Update variant error:', error);
    return internalServerErrorResponse(`Failed to update variant: ${error.message}`);
  }
}