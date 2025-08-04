import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
  try {
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const status = url.searchParams.get('status') || 'active';
    const offset = (page - 1) * limit;

    // Get replays with product count from live_streams table
    const replaysResult = await query(`
      SELECT 
        ls.*,
        COALESCE(COUNT(rp.id), 0) as products_count
      FROM live_streams ls
      LEFT JOIN replay_products rp ON ls.id = rp.replay_id
      WHERE ls.tenant_id = $1 AND ls.status = $2
      GROUP BY ls.id
      ORDER BY ls.started_at DESC
      LIMIT $3 OFFSET $4
    `, [DEFAULT_TENANT_ID, status, limit, offset]);

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM live_streams 
      WHERE tenant_id = $1 AND status = $2
    `, [DEFAULT_TENANT_ID, status]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Format replays data
    const replays = replaysResult.rows.map(replay => ({
      ...replay,
      products_count: parseInt(replay.products_count) || 0, // Ensure it's a number
      started_at_formatted: replay.started_at ? new Date(replay.started_at).toLocaleString() : null,
      ended_at_formatted: replay.ended_at ? new Date(replay.ended_at).toLocaleString() : null,
      duration: replay.started_at && replay.ended_at 
        ? Math.round((new Date(replay.ended_at) - new Date(replay.started_at)) / (1000 * 60)) // Duration in minutes
        : null,
      metadata: replay.metadata ? (typeof replay.metadata === 'string' ? JSON.parse(replay.metadata) : replay.metadata) : null
    }));

    return jsonResponse({
      replays,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get replays error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      page,
      limit,
      status,
      offset,
      DEFAULT_TENANT_ID
    });
    return internalServerErrorResponse(`Failed to fetch replays: ${error.message}`);
  }
}