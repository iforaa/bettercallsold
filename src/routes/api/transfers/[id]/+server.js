import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse, badRequestResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// Get specific transfer with line items
export async function GET({ params }) {
  try {
    const { id: transferId } = params;

    // Get transfer details
    const transferResult = await query(`
      SELECT 
        it.id,
        it.transfer_number,
        it.status,
        it.reason,
        it.notes,
        it.total_quantity,
        it.created_at,
        it.updated_at,
        it.shipped_at,
        it.received_at,
        fl.name as from_location_name,
        fl.id as from_location_id,
        tl.name as to_location_name,
        tl.id as to_location_id
      FROM inventory_transfers it
      LEFT JOIN locations fl ON it.from_location_id = fl.id
      LEFT JOIN locations tl ON it.to_location_id = tl.id
      WHERE it.id = $1 AND it.tenant_id = $2
    `, [transferId, DEFAULT_TENANT_ID]);

    if (transferResult.rows.length === 0) {
      return notFoundResponse('Transfer not found');
    }

    const transfer = transferResult.rows[0];

    // Get line items with product/variant details
    const lineItemsResult = await query(`
      SELECT 
        itli.id,
        itli.quantity,
        itli.received_quantity,
        pv.id as variant_id,
        pv.sku,
        pv.price,
        pv.option1,
        pv.option2,
        pv.option3,
        p.title as product_name,
        p.images as product_images
      FROM inventory_transfer_line_items itli
      JOIN product_variants_new pv ON itli.variant_id = pv.id
      JOIN products_new p ON pv.product_id = p.id
      WHERE itli.transfer_id = $1
      ORDER BY p.title, pv.sku
    `, [transferId]);

    const lineItems = lineItemsResult.rows.map(row => ({
      id: row.id,
      variant_id: row.variant_id,
      quantity: row.quantity,
      received_quantity: row.received_quantity,
      variant: {
        id: row.variant_id,
        sku: row.sku,
        price: row.price,
        title: [row.option1, row.option2, row.option3].filter(Boolean).join(' / ') || 'Default Title',
        options: {
          option1: row.option1,
          option2: row.option2,
          option3: row.option3
        }
      },
      product: {
        name: row.product_name,
        images: row.product_images
      }
    }));

    const transferData = {
      id: transfer.id,
      transfer_number: transfer.transfer_number,
      status: transfer.status,
      reason: transfer.reason,
      notes: transfer.notes,
      total_quantity: transfer.total_quantity,
      from_location: {
        id: transfer.from_location_id,
        name: transfer.from_location_name
      },
      to_location: {
        id: transfer.to_location_id,
        name: transfer.to_location_name
      },
      created_at: transfer.created_at,
      updated_at: transfer.updated_at,
      shipped_at: transfer.shipped_at,
      received_at: transfer.received_at,
      line_items: lineItems
    };

    return jsonResponse(transferData);
  } catch (error) {
    console.error('Get transfer error:', error);
    return internalServerErrorResponse('Failed to fetch transfer');
  }
}

// Update transfer status
export async function PUT({ params, request }) {
  try {
    const { id: transferId } = params;
    const data = await request.json();
    const { status, notes, received_quantities } = data;

    // Verify transfer exists
    const transferCheck = await query(`
      SELECT status FROM inventory_transfers 
      WHERE id = $1 AND tenant_id = $2
    `, [transferId, DEFAULT_TENANT_ID]);

    if (transferCheck.rows.length === 0) {
      return notFoundResponse('Transfer not found');
    }

    const currentStatus = transferCheck.rows[0].status;

    // Status transition validation
    const validTransitions = {
      'pending': ['in_transit', 'cancelled'],
      'in_transit': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (status && !validTransitions[currentStatus].includes(status)) {
      return badRequestResponse(`Cannot change status from ${currentStatus} to ${status}`);
    }

    // Update transfer
    let updateFields = ['updated_at = NOW()'];
    let updateValues = [];
    let paramIndex = 1;

    if (status) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;

      // Set timestamps based on status
      if (status === 'in_transit') {
        updateFields.push(`shipped_at = NOW()`);
      } else if (status === 'completed') {
        updateFields.push(`received_at = NOW()`);
      }
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(notes);
      paramIndex++;
    }

    updateValues.push(transferId);
    
    await query(`
      UPDATE inventory_transfers 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `, updateValues);

    // Handle inventory movements based on status change
    if (status) {
      // Get transfer details and line items
      const transfer = await query(`
        SELECT from_location_id, to_location_id, status
        FROM inventory_transfers 
        WHERE id = $1
      `, [transferId]);

      const { from_location_id, to_location_id } = transfer.rows[0];

      const lineItems = await query(`
        SELECT variant_id, quantity, received_quantity
        FROM inventory_transfer_line_items 
        WHERE transfer_id = $1
      `, [transferId]);

      if (status === 'in_transit') {
        // When shipping: reduce on_hand at origin, reduce committed
        for (const item of lineItems.rows) {
          await query(`
            UPDATE inventory_levels_new 
            SET 
              on_hand = on_hand - $3,
              committed = committed - $3,
              updated_at = NOW()
            WHERE variant_id = $1 AND location_id = $2
          `, [item.variant_id, from_location_id, item.quantity]);
        }
      } else if (status === 'completed') {
        // When completing: add inventory to destination
        for (const item of lineItems.rows) {
          const quantityToMove = received_quantities?.[item.variant_id] || item.quantity;
          
          // Add inventory at destination location
          await query(`
            INSERT INTO inventory_levels_new (id, variant_id, location_id, available, on_hand, committed, reserved, created_at, updated_at)
            VALUES (uuid_generate_v4(), $1, $2, $3, $3, 0, 0, NOW(), NOW())
            ON CONFLICT (variant_id, location_id)
            DO UPDATE SET 
              available = inventory_levels_new.available + $3,
              on_hand = inventory_levels_new.on_hand + $3,
              updated_at = NOW()
          `, [item.variant_id, to_location_id, quantityToMove]);

          // Update received quantity in line item
          if (received_quantities?.[item.variant_id] !== undefined) {
            await query(`
              UPDATE inventory_transfer_line_items 
              SET received_quantity = $1, updated_at = NOW()
              WHERE transfer_id = $2 AND variant_id = $3
            `, [quantityToMove, transferId, item.variant_id]);
          }
        }
      } else if (status === 'cancelled') {
        // When cancelling: reverse the committed inventory at origin
        for (const item of lineItems.rows) {
          await query(`
            UPDATE inventory_levels_new 
            SET 
              available = available + $3,
              committed = committed - $3,
              updated_at = NOW()
            WHERE variant_id = $1 AND location_id = $2
          `, [item.variant_id, from_location_id, item.quantity]);
        }
      }
    }

    return successResponse('Transfer updated successfully');
  } catch (error) {
    console.error('Update transfer error:', error);
    return internalServerErrorResponse('Failed to update transfer');
  }
}

// Delete transfer (only if pending)
export async function DELETE({ params }) {
  try {
    const { id: transferId } = params;

    // Check if transfer can be deleted
    const transferCheck = await query(`
      SELECT status FROM inventory_transfers 
      WHERE id = $1 AND tenant_id = $2
    `, [transferId, DEFAULT_TENANT_ID]);

    if (transferCheck.rows.length === 0) {
      return notFoundResponse('Transfer not found');
    }

    if (transferCheck.rows[0].status !== 'pending') {
      return badRequestResponse('Can only delete pending transfers');
    }

    // Delete transfer (line items will be cascade deleted)
    await query(`
      DELETE FROM inventory_transfers 
      WHERE id = $1 AND tenant_id = $2
    `, [transferId, DEFAULT_TENANT_ID]);

    return successResponse('Transfer deleted successfully');
  } catch (error) {
    console.error('Delete transfer error:', error);
    return internalServerErrorResponse('Failed to delete transfer');
  }
}