import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET() {
	try {
		// Query team members for the default tenant
		const teamQuery = `
			SELECT id, tenant_id, name, email, role, status, 
			       avatar_url, created_at, updated_at
			FROM team_members 
			WHERE tenant_id = $1 
			ORDER BY created_at DESC
		`;
		
		const result = await query(teamQuery, [DEFAULT_TENANT_ID]);
		return jsonResponse(result.rows);
	} catch (error) {
		console.error('Get team error:', error);
		// If team_members table doesn't exist, return empty array instead of error
		if (error.code === '42P01') {
			return jsonResponse([]);
		}
		return internalServerErrorResponse('Failed to fetch team members');
	}
}