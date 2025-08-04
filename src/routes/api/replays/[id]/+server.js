import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const replayId = params.id;
    
    // Get replay details
    const replayResult = await query(`
      SELECT * FROM live_streams 
      WHERE id = $1 AND tenant_id = $2
    `, [replayId, DEFAULT_TENANT_ID]);
    
    if (replayResult.rows.length === 0) {
      return notFoundResponse('Replay not found');
    }
    
    const replay = replayResult.rows[0];
    
    // Get replay products if they exist
    const productsResult = await query(`
      SELECT * FROM replay_products 
      WHERE replay_id = $1
      ORDER BY shown_at ASC
    `, [replayId]);
    
    // Format the replay data
    const formattedReplay = {
      ...replay,
      started_at_formatted: replay.started_at ? new Date(replay.started_at).toLocaleString() : null,
      ended_at_formatted: replay.ended_at ? new Date(replay.ended_at).toLocaleString() : null,
      duration: replay.started_at && replay.ended_at 
        ? Math.round((new Date(replay.ended_at) - new Date(replay.started_at)) / (1000 * 60)) // Duration in minutes
        : null,
      metadata: replay.metadata ? (typeof replay.metadata === 'string' ? JSON.parse(replay.metadata) : replay.metadata) : null,
      products: productsResult.rows.map(product => ({
        ...product,
        shown_at_formatted: product.shown_at ? new Date(product.shown_at).toLocaleString() : null,
        hidden_at_formatted: product.hidden_at ? new Date(product.hidden_at).toLocaleString() : null,
        media: product.media ? (typeof product.media === 'string' ? JSON.parse(product.media) : product.media) : [],
        overlay_texts: product.overlay_texts ? (typeof product.overlay_texts === 'string' ? JSON.parse(product.overlay_texts) : product.overlay_texts) : [],
        inventory: product.inventory ? (typeof product.inventory === 'string' ? JSON.parse(product.inventory) : product.inventory) : [],
        metadata: product.metadata ? (typeof product.metadata === 'string' ? JSON.parse(product.metadata) : product.metadata) : null
      }))
    };
    
    return jsonResponse(formattedReplay);
    
  } catch (error) {
    console.error('Get replay error:', error);
    return internalServerErrorResponse('Failed to fetch replay details');
  }
}