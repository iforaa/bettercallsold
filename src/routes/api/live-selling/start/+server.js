import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function POST({ request }) {
  try {
    const { 
      name, 
      description, 
      agora_channel, 
      agora_token,
      products = [] 
    } = await request.json();

    // Validation
    if (!name || !name.trim()) {
      return jsonResponse({ error: 'Stream name is required' }, 400);
    }
    
    if (!agora_channel || !agora_channel.trim()) {
      return jsonResponse({ error: 'Agora channel is required' }, 400);
    }
    
    if (!agora_token || !agora_token.trim()) {
      return jsonResponse({ error: 'Agora token is required' }, 400);
    }

    // Create new live stream in database
    const result = await query(`
      INSERT INTO live_streams (
        tenant_id,
        name,
        title,
        description,
        status,
        is_live,
        started_at,
        agora_channel,
        agora_token,
        product_count,
        peak_viewers,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, 'live', true, CURRENT_TIMESTAMP,
        $5, $6, $7, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `, [
      DEFAULT_TENANT_ID,
      name.trim(),
      name.trim(),
      description?.trim() || '',
      agora_channel.trim(),
      agora_token.trim(),
      products.length || 0
    ]);

    const liveStream = result.rows[0];

    return jsonResponse({
      success: true,
      message: 'Live selling session started successfully!',
      live_stream: {
        id: liveStream.id,
        name: liveStream.name,
        description: liveStream.description,
        agora_channel: liveStream.agora_channel,
        agora_token: liveStream.agora_token,
        is_live: liveStream.is_live,
        started_at: liveStream.started_at,
        product_count: liveStream.product_count
      }
    });

  } catch (error) {
    console.error('Start live selling error:', error);
    return internalServerErrorResponse(`Failed to start live selling: ${error.message}`);
  }
}