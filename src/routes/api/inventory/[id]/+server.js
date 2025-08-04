import { 
  updateInventoryQuantity, 
  deleteInventoryRecord,
  createInventoryRecord 
} from '$lib/inventory-db.js';
import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse, badRequestResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// Get specific inventory record
export async function GET({ params }) {
  try {
    const inventoryId = params.id;
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
    
    if (updateData.quantity !== undefined) {
      // Update quantity
      const updatedRecord = await updateInventoryQuantity(
        inventoryId, 
        updateData.quantity, 
        DEFAULT_TENANT_ID
      );
      
      if (!updatedRecord) {
        return notFoundResponse('Inventory record not found');
      }
      
      return jsonResponse({
        message: 'Inventory quantity updated successfully',
        data: updatedRecord
      });
    } else {
      // Update other fields
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
  } catch (error) {
    console.error('Update inventory record error:', error);
    return internalServerErrorResponse('Failed to update inventory record');
  }
}

// Delete inventory record
export async function DELETE({ params }) {
  try {
    const inventoryId = params.id;
    const deleted = await deleteInventoryRecord(inventoryId, DEFAULT_TENANT_ID);
    
    if (!deleted) {
      return notFoundResponse('Inventory record not found');
    }
    
    return successResponse('Inventory record deleted successfully');
  } catch (error) {
    console.error('Delete inventory record error:', error);
    return internalServerErrorResponse('Failed to delete inventory record');
  }
}