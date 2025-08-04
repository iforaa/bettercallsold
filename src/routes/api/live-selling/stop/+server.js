import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function POST({ request }) {
  try {
    const { live_stream_id } = await request.json();

    if (!live_stream_id) {
      return jsonResponse({ error: 'Live stream ID is required' }, 400);
    }

    // First, get the live stream to confirm it exists and is live
    const checkResult = await query(`
      SELECT * FROM live_streams 
      WHERE id = $1 AND tenant_id = $2 AND is_live = true
    `, [live_stream_id, DEFAULT_TENANT_ID]);

    if (checkResult.rows.length === 0) {
      return notFoundResponse('Active live stream not found');
    }

    const liveStream = checkResult.rows[0];

    // Delete the live stream row (as requested - remove from DB when stopped)
    await query(`
      DELETE FROM live_streams 
      WHERE id = $1 AND tenant_id = $2
    `, [live_stream_id, DEFAULT_TENANT_ID]);

    return jsonResponse({
      success: true,
      message: 'Live selling session stopped and removed from database',
      stopped_stream: {
        id: liveStream.id,
        name: liveStream.name,
        agora_channel: liveStream.agora_channel,
        duration_minutes: liveStream.started_at ? 
          Math.round((Date.now() - new Date(liveStream.started_at).getTime()) / (1000 * 60)) : 0
      }
    });

  } catch (error) {
    console.error('Stop live selling error:', error);
    return internalServerErrorResponse(`Failed to stop live selling: ${error.message}`);
  }
}