import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse, badRequestResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { FeatureFlags } from '$lib/services/FeatureFlags.js';

// Get specific inventory record
export async function GET({ params }) {
  try {
    const inventoryId = params.id;
    
    // Check if we should use the new inventory tracking system
    const useNewInventory = await FeatureFlags.isEnabled(FeatureFlags.FLAGS.USE_NEW_INVENTORY_TRACKING);
    
    if (useNewInventory) {
      // Use new Shopify-style inventory system - get by variant ID
      const result = await query(`
        SELECT 
          pv.id,
          pv.title as variant_title,
          pv.sku,
          pv.price,
          pv.cost,
          pv.position,
          pv.option1,
          pv.option2,
          pv.option3,
          p.id as product_id,
          p.title as product_name,
          il.available,
          il.on_hand,
          il.committed,
          il.reserved,
          l.name as location_name,
          pv.created_at,
          pv.updated_at
        FROM product_variants_new pv
        JOIN products_new p ON p.id = pv.product_id
        LEFT JOIN inventory_levels_new il ON il.variant_id = pv.id
        LEFT JOIN locations l ON l.id = il.location_id
        WHERE pv.id = $1 AND p.tenant_id = $2
      `, [inventoryId, DEFAULT_TENANT_ID]);
      
      if (result.rows.length === 0) {
        return notFoundResponse('Inventory record not found');
      }
      
      return jsonResponse(result.rows[0]);
    } else {
      // Use old inventory system
      const result = await query(`
        SELECT 
          i.*,
          p.name as product_name,
          p.price as base_price
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.id = $1 AND i.tenant_id = $2
      `, [inventoryId, DEFAULT_TENANT_ID]);
      
      if (result.rows.length === 0) {
        return notFoundResponse('Inventory record not found');
      }
      
      return jsonResponse(result.rows[0]);
    }
  } catch (error) {
    console.error('Get inventory record error:', error);
    return internalServerErrorResponse('Failed to fetch inventory record');
  }
}

// Update inventory record
export async function PUT({ params, request }) {
  try {
    const inventoryId = params.id;
    const updateData = await request.json();
    
    // Check if we should use the new inventory tracking system
    const useNewInventory = await FeatureFlags.isEnabled(FeatureFlags.FLAGS.USE_NEW_INVENTORY_TRACKING);
    
    if (updateData.quantity !== undefined || updateData.available !== undefined) {
      // Update quantity/inventory levels
      if (useNewInventory) {
        // Update new inventory levels system
        const quantity = updateData.available || updateData.quantity;
        const result = await query(`
          UPDATE inventory_levels_new
          SET available = $1, on_hand = $1, updated_at = NOW()
          WHERE variant_id = $2
          RETURNING *
        `, [quantity, inventoryId]);
        
        if (result.rows.length === 0) {
          return notFoundResponse('Inventory record not found');
        }
        
        return jsonResponse({
          message: 'Inventory levels updated successfully',
          data: result.rows[0]
        });
      } else {
        // Update old inventory system
        const quantity = updateData.quantity;
        const result = await query(`
          UPDATE inventory 
          SET quantity = $1, updated_at = NOW()
          WHERE id = $2 AND tenant_id = $3
          RETURNING *
        `, [quantity, inventoryId, DEFAULT_TENANT_ID]);
        
        if (result.rows.length === 0) {
          return notFoundResponse('Inventory record not found');
        }
        
        return jsonResponse({
          message: 'Inventory quantity updated successfully',
          data: result.rows[0]
        });
      }
    } else {
      // Update other fields
      if (useNewInventory) {
        // Update variant fields in new system
        const allowedFields = ['price', 'cost', 'sku', 'position'];
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        for (const field of allowedFields) {
          if (updateData[field] !== undefined) {
            updates.push(`${field} = $${paramIndex}`);
            values.push(updateData[field]);
            paramIndex++;
          }
        }
        
        if (updates.length === 0) {
          return badRequestResponse('No valid fields to update');
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(inventoryId);
        
        const result = await query(`
          UPDATE product_variants_new 
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `, values);
        
        if (result.rows.length === 0) {
          return notFoundResponse('Inventory record not found');
        }
        
        return jsonResponse({
          message: 'Inventory record updated successfully',
          data: result.rows[0]
        });
      } else {
        // Update old inventory system fields
        const allowedFields = ['price', 'cost', 'sku', 'location', 'position'];
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        for (const field of allowedFields) {
          if (updateData[field] !== undefined) {
            updates.push(`${field} = $${paramIndex}`);
            values.push(updateData[field]);
            paramIndex++;
          }
        }
        
        if (updates.length === 0) {
          return badRequestResponse('No valid fields to update');
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(inventoryId, DEFAULT_TENANT_ID);
        
        const result = await query(`
          UPDATE inventory 
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
          RETURNING *
        `, values);
        
        if (result.rows.length === 0) {
          return notFoundResponse('Inventory record not found');
        }
        
        return jsonResponse({
          message: 'Inventory record updated successfully',
          data: result.rows[0]
        });
      }
    }
  } catch (error) {
    console.error('Update inventory record error:', error);
    return internalServerErrorResponse('Failed to update inventory record');
  }
}

// Delete inventory record
export async function DELETE({ params }) {
  try {
    const inventoryId = params.id;
    
    // Check if we should use the new inventory tracking system
    const useNewInventory = await FeatureFlags.isEnabled(FeatureFlags.FLAGS.USE_NEW_INVENTORY_TRACKING);
    
    if (useNewInventory) {
      // Delete from new system - remove inventory levels (variant remains)
      const result = await query(`
        DELETE FROM inventory_levels_new
        WHERE variant_id = $1
        RETURNING variant_id as id
      `, [inventoryId]);
      
      const deleted = result.rows.length > 0;
      
      if (!deleted) {
        return notFoundResponse('Inventory record not found');
      }
      
      return successResponse('Inventory levels deleted successfully');
    } else {
      // Delete from old system
      const result = await query(`
        DELETE FROM inventory 
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `, [inventoryId, DEFAULT_TENANT_ID]);
      
      const deleted = result.rows.length > 0;
      
      if (!deleted) {
        return notFoundResponse('Inventory record not found');
      }
      
      return successResponse('Inventory record deleted successfully');
    }
  } catch (error) {
    console.error('Delete inventory record error:', error);
    return internalServerErrorResponse('Failed to delete inventory record');
  }
}