import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

export async function GET() {
  try {
    const result = await query(QUERIES.GET_COLLECTIONS, [DEFAULT_TENANT_ID]);
    return jsonResponse(result.rows);
  } catch (error) {
    console.error('Get collections error:', error);
    return internalServerErrorResponse('Failed to fetch collections');
  }
}

export async function POST({ request }) {
  try {
    const collectionData = await request.json();
    
    if (!collectionData.name) {
      return badRequestResponse('Missing required field: name');
    }
    
    const result = await query(`
      INSERT INTO collections (id, tenant_id, name, description, image_url, sort_order)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
      RETURNING id
    `, [
      DEFAULT_TENANT_ID,
      collectionData.name,
      collectionData.description || '',
      collectionData.image_url || '',
      collectionData.sort_order || 0
    ]);
    
    if (result.rows.length > 0) {
      return jsonResponse({
        message: 'Collection created successfully',
        data: { id: result.rows[0].id }
      });
    } else {
      return internalServerErrorResponse('Failed to create collection');
    }
  } catch (error) {
    console.error('Create collection error:', error);
    return internalServerErrorResponse('Failed to create collection');
  }
}