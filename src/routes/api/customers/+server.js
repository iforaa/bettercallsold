import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

export async function GET() {
  try {
    const result = await query(QUERIES.GET_CUSTOMERS, [DEFAULT_TENANT_ID]);
    return jsonResponse(result.rows);
  } catch (error) {
    console.error('Get customers error:', error);
    return internalServerErrorResponse('Failed to fetch customers');
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { name, email, phone, facebook_id, instagram_id, address } = body;

    // Validate required fields
    if (!name || !email) {
      return badRequestResponse('Name and email are required');
    }

    // Check if customer with email already exists
    const existingCustomer = await query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email, DEFAULT_TENANT_ID]
    );

    if (existingCustomer.rows.length > 0) {
      return badRequestResponse('Customer with this email already exists');
    }

    const now = new Date().toISOString();

    // Create new customer
    const result = await query(`
      INSERT INTO users (
        id, tenant_id, name, email, phone, role, 
        facebook_id, instagram_id, address, 
        created_at, updated_at
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, email, phone, facebook_id, instagram_id, address, created_at, updated_at
    `, [
      DEFAULT_TENANT_ID,
      name,
      email,
      phone || null,
      'customer',
      facebook_id || null,
      instagram_id || null,
      address || null,
      now,
      now
    ]);

    return jsonResponse(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return internalServerErrorResponse('Failed to create customer');
  }
}