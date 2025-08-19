import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// Get all transfers
export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const status = searchParams.get('status');
    const fromLocation = searchParams.get('from_location');
    const toLocation = searchParams.get('to_location');

    let whereClause = 'WHERE it.tenant_id = $1';
    let queryParams = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    // Add status filter
    if (status && status !== 'all') {
      whereClause += ` AND it.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Add location filters
    if (fromLocation && fromLocation !== 'all') {
      whereClause += ` AND fl.name = $${paramIndex}`;
      queryParams.push(fromLocation);
      paramIndex++;
    }

    if (toLocation && toLocation !== 'all') {
      whereClause += ` AND tl.name = $${paramIndex}`;
      queryParams.push(toLocation);
      paramIndex++;
    }

    const transfersQuery = `
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
        tl.id as to_location_id,
        COUNT(itli.id) as item_count
      FROM inventory_transfers it
      LEFT JOIN locations fl ON it.from_location_id = fl.id
      LEFT JOIN locations tl ON it.to_location_id = tl.id
      LEFT JOIN inventory_transfer_line_items itli ON it.id = itli.transfer_id
      ${whereClause}
      GROUP BY it.id, fl.name, fl.id, tl.name, tl.id
      ORDER BY it.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await query(transfersQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM inventory_transfers it
      LEFT JOIN locations fl ON it.from_location_id = fl.id
      LEFT JOIN locations tl ON it.to_location_id = tl.id
      ${whereClause}
    `;
    const countParams = queryParams.slice(0, -2);
    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);

    // Transform data for frontend
    const transfers = result.rows.map(row => ({
      id: row.id,
      transfer_number: row.transfer_number,
      status: row.status,
      reason: row.reason,
      notes: row.notes,
      total_quantity: row.total_quantity,
      item_count: parseInt(row.item_count),
      from_location: {
        id: row.from_location_id,
        name: row.from_location_name
      },
      to_location: {
        id: row.to_location_id,
        name: row.to_location_name
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
      shipped_at: row.shipped_at,
      received_at: row.received_at
    }));

    return jsonResponse({
      transfers,
      pagination: {
        total: totalCount,
        limit: limit,
        offset: offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + transfers.length < totalCount,
        hasPrev: offset > 0
      }
    });
  } catch (error) {
    console.error('Get transfers error:', error);
    return internalServerErrorResponse('Failed to fetch transfers');
  }
}

// Create new transfer
export async function POST({ request }) {
  try {
    const data = await request.json();
    const { from_location_id, to_location_id, reason, notes, items } = data;

    // Validation
    if (!from_location_id || !to_location_id || !items || !Array.isArray(items) || items.length === 0) {
      return badRequestResponse('Missing required fields: from_location_id, to_location_id, items');
    }

    if (from_location_id === to_location_id) {
      return badRequestResponse('From and to locations must be different');
    }

    // Generate transfer number
    const transferNumberResult = await query(`
      SELECT 'TR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0') as transfer_number
    `);
    const transferNumber = transferNumberResult.rows[0].transfer_number;

    // Calculate total quantity
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Create transfer record
    const transferResult = await query(`
      INSERT INTO inventory_transfers (
        tenant_id, transfer_number, from_location_id, to_location_id, 
        reason, notes, total_quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `, [DEFAULT_TENANT_ID, transferNumber, from_location_id, to_location_id, reason, notes, totalQuantity]);

    const transferId = transferResult.rows[0].id;

    // Create line items and commit inventory at origin
    for (const item of items) {
      // Create line item
      await query(`
        INSERT INTO inventory_transfer_line_items (transfer_id, variant_id, quantity)
        VALUES ($1, $2, $3)
      `, [transferId, item.variant_id, item.quantity]);

      // Commit inventory at origin location (Shopify-like behavior)
      // This reduces available quantity and increases committed quantity
      const inventoryExists = await query(`
        SELECT id FROM inventory_levels_new 
        WHERE variant_id = $1 AND location_id = $2
      `, [item.variant_id, from_location_id]);

      if (inventoryExists.rows.length > 0) {
        // Update existing inventory level
        await query(`
          UPDATE inventory_levels_new 
          SET 
            available = available - $3,
            committed = committed + $3,
            updated_at = NOW()
          WHERE variant_id = $1 AND location_id = $2
        `, [item.variant_id, from_location_id, item.quantity]);
      } else {
        // Create new inventory level if it doesn't exist
        await query(`
          INSERT INTO inventory_levels_new (id, variant_id, location_id, available, on_hand, committed, reserved, created_at, updated_at)
          VALUES (uuid_generate_v4(), $1, $2, 0, 0, $3, 0, NOW(), NOW())
        `, [item.variant_id, from_location_id, item.quantity]);
      }
    }

    return jsonResponse({
      id: transferId,
      transfer_number: transferNumber,
      message: 'Transfer created successfully'
    });
  } catch (error) {
    console.error('Create transfer error:', error);
    return internalServerErrorResponse('Failed to create transfer');
  }
}