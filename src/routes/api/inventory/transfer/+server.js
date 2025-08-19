import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { FeatureFlags } from '$lib/services/FeatureFlags.js';

export async function POST({ request }) {
  try {
    const data = await request.json();
    const {
      sourceLocationId,
      targetLocationId,
      items = [],
      reason = 'Stock transfer'
    } = data;

    // Validate required fields
    if (!sourceLocationId || !targetLocationId || items.length === 0) {
      return badRequestResponse('Source location, target location, and items are required');
    }

    if (sourceLocationId === targetLocationId) {
      return badRequestResponse('Source and target locations must be different');
    }

    // Check if we should use the new inventory tracking system
    const useNewInventory = await FeatureFlags.isEnabled(FeatureFlags.FLAGS.USE_NEW_INVENTORY_TRACKING);

    if (!useNewInventory) {
      return badRequestResponse('Stock transfers are only supported with the new inventory system');
    }

    // Start database transaction for atomic transfer
    await query('BEGIN');

    try {
      const transferResults = [];
      const errors = [];

      // Verify locations exist
      const locationsResult = await query(`
        SELECT id, name FROM locations 
        WHERE id = ANY($1::uuid[])
      `, [[sourceLocationId, targetLocationId]]);

      if (locationsResult.rows.length !== 2) {
        throw new Error('One or both locations not found');
      }

      const sourceLocation = locationsResult.rows.find(loc => loc.id === sourceLocationId);
      const targetLocation = locationsResult.rows.find(loc => loc.id === targetLocationId);

      // Process each item transfer
      for (const transferItem of items) {
        const { variantId, quantity } = transferItem;

        if (!variantId || !quantity || quantity <= 0) {
          errors.push(`Invalid item: ${variantId} - quantity must be positive`);
          continue;
        }

        try {
          // Check current inventory at source location
          const sourceInventoryResult = await query(`
            SELECT il.available, il.on_hand, pv.sku, p.title as product_title
            FROM inventory_levels_new il
            JOIN product_variants_new pv ON pv.id = il.variant_id
            JOIN products_new p ON p.id = pv.product_id
            WHERE il.variant_id = $1 AND il.location_id = $2
          `, [variantId, sourceLocationId]);

          if (sourceInventoryResult.rows.length === 0) {
            errors.push(`No inventory found for variant ${variantId} at source location`);
            continue;
          }

          const sourceInventory = sourceInventoryResult.rows[0];
          const availableAtSource = sourceInventory.available || 0;

          if (availableAtSource < quantity) {
            errors.push(`Insufficient inventory for ${sourceInventory.sku || sourceInventory.product_title}: ${availableAtSource} available, ${quantity} requested`);
            continue;
          }

          // Reduce inventory at source location
          await query(`
            UPDATE inventory_levels_new
            SET 
              available = available - $1,
              on_hand = on_hand - $1,
              updated_at = NOW()
            WHERE variant_id = $2 AND location_id = $3
          `, [quantity, variantId, sourceLocationId]);

          // Check if target location already has inventory for this variant
          const targetInventoryResult = await query(`
            SELECT id, available, on_hand
            FROM inventory_levels_new
            WHERE variant_id = $1 AND location_id = $2
          `, [variantId, targetLocationId]);

          if (targetInventoryResult.rows.length > 0) {
            // Update existing inventory at target location
            await query(`
              UPDATE inventory_levels_new
              SET 
                available = available + $1,
                on_hand = on_hand + $1,
                updated_at = NOW()
              WHERE variant_id = $2 AND location_id = $3
            `, [quantity, variantId, targetLocationId]);
          } else {
            // Create new inventory record at target location
            await query(`
              INSERT INTO inventory_levels_new (
                id, variant_id, location_id, available, on_hand, committed, reserved, created_at, updated_at
              ) VALUES (
                uuid_generate_v4(), $1, $2, $3, $3, 0, 0, NOW(), NOW()
              )
            `, [variantId, targetLocationId, quantity]);
          }

          // Log the transfer for audit trail
          await query(`
            INSERT INTO inventory_transactions_new (
              id, variant_id, location_id, transaction_type, quantity, reason, 
              reference_location_id, created_at
            ) VALUES 
              (uuid_generate_v4(), $1, $2, 'transfer_out', $3, $4, $5, NOW()),
              (uuid_generate_v4(), $1, $5, 'transfer_in', $3, $4, $2, NOW())
          `, [variantId, sourceLocationId, -quantity, reason, targetLocationId]);

          transferResults.push({
            variantId,
            quantity,
            sourceLocation: sourceLocation.name,
            targetLocation: targetLocation.name,
            sku: sourceInventory.sku,
            productTitle: sourceInventory.product_title
          });

        } catch (error) {
          console.error(`Error transferring variant ${variantId}:`, error);
          errors.push(`Failed to transfer variant ${variantId}: ${error.message}`);
        }
      }

      // Check if any transfers were successful
      if (transferResults.length === 0 && errors.length > 0) {
        throw new Error(`All transfers failed: ${errors.join(', ')}`);
      }

      // Commit transaction
      await query('COMMIT');

      return jsonResponse({
        success: true,
        message: `Successfully transferred ${transferResults.length} item(s) from ${sourceLocation.name} to ${targetLocation.name}`,
        transfers: transferResults,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalItems: transferResults.length,
          totalQuantity: transferResults.reduce((sum, transfer) => sum + transfer.quantity, 0),
          sourceLocation: sourceLocation.name,
          targetLocation: targetLocation.name,
          reason
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Stock transfer error:', error);
    return internalServerErrorResponse(`Failed to complete stock transfer: ${error.message}`);
  }
}