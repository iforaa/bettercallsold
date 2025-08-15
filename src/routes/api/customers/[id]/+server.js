import { query, getCached, setCache, deleteCache } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const { id } = params;
    const cacheKey = `customer:${id}:${DEFAULT_TENANT_ID}`;
    
    // Try to get from cache first
    const cachedCustomer = await getCached(cacheKey);
    if (cachedCustomer) {
      return jsonResponse(cachedCustomer);
    }

    // Get customer basic info (check if customer exists first, then filter by role if column exists)
    const customerResult = await query(`
      SELECT 
        id, tenant_id, name, email, phone,
        created_at, updated_at
      FROM users 
      WHERE id = $1 AND tenant_id = $2
    `, [id, DEFAULT_TENANT_ID]);

    if (customerResult.rows.length === 0) {
      return notFoundResponse('Customer not found');
    }

    const customer = customerResult.rows[0];

    // Get customer stats (with fallback for missing tables)
    let orderStats = { rows: [{ order_count: 0, total_spent: 0 }] };
    let cartStats = { rows: [{ cart_items_count: 0 }] };
    let postsStats = { rows: [{ posts_count: 0 }] };

    try {
      // Try to get order stats if orders table exists
      orderStats = await query(`
        SELECT 
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as total_spent
        FROM orders 
        WHERE user_id = $1 AND tenant_id = $2
      `, [id, DEFAULT_TENANT_ID]);
    } catch (error) {
      console.log('Orders table not found, using default values');
    }

    try {
      // Try to get cart stats if cart_items table exists
      cartStats = await query(`
        SELECT COUNT(*) as cart_items_count
        FROM cart_items 
        WHERE user_id = $1 AND tenant_id = $2
      `, [id, DEFAULT_TENANT_ID]);
    } catch (error) {
      console.log('Cart_items table not found, using default values');
    }

    try {
      // Try to get posts stats if posts table exists
      postsStats = await query(`
        SELECT COUNT(*) as posts_count
        FROM posts 
        WHERE user_id = $1 AND tenant_id = $2
      `, [id, DEFAULT_TENANT_ID]);
    } catch (error) {
      console.log('Posts table not found, using default values');
    }

    // Combine customer data with stats
    const customerData = {
      ...customer,
      stats: {
        order_count: parseInt(orderStats.rows[0]?.order_count || 0),
        total_spent: parseFloat(orderStats.rows[0]?.total_spent || 0),
        cart_items_count: parseInt(cartStats.rows[0]?.cart_items_count || 0),
        posts_count: parseInt(postsStats.rows[0]?.posts_count || 0),
        customer_since: customer.created_at
      }
    };

    // Cache the customer data for 5 minutes
    await setCache(cacheKey, customerData, 300);

    return jsonResponse(customerData);
  } catch (error) {
    console.error('Get customer error:', error);
    return internalServerErrorResponse('Failed to fetch customer');
  }
}

export async function PUT({ params, request }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, email, phone, facebook_id, instagram_id, address } = body;

    // Check if customer exists
    const existingCustomer = await query(
      'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND role = $3',
      [id, DEFAULT_TENANT_ID, 'customer']
    );

    if (existingCustomer.rows.length === 0) {
      return notFoundResponse('Customer not found');
    }

    const now = new Date().toISOString();

    // Update customer
    const result = await query(`
      UPDATE users SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = $3,
        facebook_id = $4,
        instagram_id = $5,
        address = $6,
        updated_at = $7
      WHERE id = $8 AND tenant_id = $9
      RETURNING id, name, email, phone, facebook_id, instagram_id, address, created_at, updated_at
    `, [
      name,
      email,
      phone,
      facebook_id,
      instagram_id,
      address,
      now,
      id,
      DEFAULT_TENANT_ID
    ]);

    // Invalidate both individual customer cache and customers list cache
    const customerCacheKey = `customer:${id}:${DEFAULT_TENANT_ID}`;
    const customerListCacheKey = `customers:${DEFAULT_TENANT_ID}`;
    await deleteCache(customerCacheKey);
    await deleteCache(customerListCacheKey);

    return jsonResponse(result.rows[0]);
  } catch (error) {
    console.error('Update customer error:', error);
    return internalServerErrorResponse('Failed to update customer');
  }
}