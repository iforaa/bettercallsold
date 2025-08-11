import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function POST({ params, request }) {
  try {
    const liveSaleId = params.id;
    const { channel_name } = await request.json();
    
    // Update the live stream with the Agora channel
    const updateResult = await query(`
      UPDATE live_streams 
      SET agora_channel = $1, updated_at = CURRENT_TIMESTAMP
      WHERE (id::text = $2 OR external_id::text = $2) AND tenant_id = $3
    `, [channel_name, liveSaleId, DEFAULT_TENANT_ID]);
    
    if (updateResult.rowCount === 0) {
      return notFoundResponse('Live sale not found');
    }
    
    // Get the updated live sale
    const result = await query(`
      SELECT * FROM live_streams 
      WHERE (id::text = $1 OR external_id::text = $1) AND tenant_id = $2
    `, [liveSaleId, DEFAULT_TENANT_ID]);
    
    return jsonResponse({
      success: true,
      message: `Agora channel updated to: ${channel_name}`,
      live_sale: result.rows[0]
    });
    
  } catch (error) {
    console.error('Agora channel update error:', error);
    return internalServerErrorResponse(`Failed to update Agora channel: ${error.message}`);
  }
}