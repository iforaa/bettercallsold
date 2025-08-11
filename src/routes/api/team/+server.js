import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

export async function GET() {
	try {
		const result = await query(QUERIES.GET_TEAM, [DEFAULT_TENANT_ID]);
		return jsonResponse(result.rows);
	} catch (error) {
		console.error('Get team error:', error);
		return internalServerErrorResponse('Failed to fetch team members');
	}
}