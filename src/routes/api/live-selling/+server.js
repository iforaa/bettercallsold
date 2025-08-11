import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET() {
	try {
		// Query live streams for the default tenant (updated schema without stream_key)
		const streamsQuery = `
			SELECT id, tenant_id, title, description, status, started_at, ended_at, 
			       settings, created_at, updated_at, external_id, name, source_url,
			       source_thumb, animated_thumb, product_count, peak_viewers, is_live,
			       label, is_wide_cell, metadata, agora_channel, agora_token
			FROM live_streams
			WHERE tenant_id = $1
			ORDER BY created_at DESC
		`;
		
		const result = await query(streamsQuery, [DEFAULT_TENANT_ID]);
		return jsonResponse(result.rows);
	} catch (error) {
		console.error('Get live selling error:', error);
		return internalServerErrorResponse('Failed to fetch live selling sessions');
	}
}