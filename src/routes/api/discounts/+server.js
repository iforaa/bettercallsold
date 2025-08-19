import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// Get discounts with filtering
export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const status = searchParams.get('status'); // 'all', 'active', 'scheduled', 'expired'
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    let whereClause = 'WHERE d.tenant_id = $1';
    const params = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    // Filter by status
    if (status && status !== 'all') {
      if (status === 'scheduled') {
        whereClause += ` AND d.status = 'active' AND d.starts_at > NOW()`;
      } else if (status === 'expired') {
        whereClause += ` AND (d.status = 'expired' OR (d.ends_at IS NOT NULL AND d.ends_at < NOW()))`;
      } else {
        whereClause += ` AND d.status = $${paramIndex} AND d.starts_at <= NOW() AND (d.ends_at IS NULL OR d.ends_at > NOW())`;
        params.push(status);
        paramIndex++;
      }
    }

    // Search by title
    if (search) {
      whereClause += ` AND d.title ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const discountsQuery = `
      SELECT 
        d.*,
        dc.code,
        dc.usage_count as code_usage_count,
        -- Calculate actual status based on dates
        CASE 
          WHEN d.status = 'disabled' THEN 'disabled'
          WHEN d.starts_at > NOW() THEN 'scheduled'
          WHEN d.ends_at IS NOT NULL AND d.ends_at < NOW() THEN 'expired'
          ELSE 'active'
        END as computed_status
      FROM discounts d
      LEFT JOIN discount_codes dc ON d.id = dc.discount_id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await query(discountsQuery, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM discounts d
      LEFT JOIN discount_codes dc ON d.id = dc.discount_id
      ${whereClause}
    `;

    const countResult = await query(countQuery, params.slice(0, -2)); // Remove limit and offset
    const totalCount = parseInt(countResult.rows[0].total);

    // Transform data for frontend
    const discounts = result.rows.map(discount => ({
      ...discount,
      status: discount.computed_status,
      // Add discount type display names
      type_display: getDiscountTypeDisplay(discount.discount_type),
      method_display: discount.method === 'code' ? 'Code' : 'Automatic'
    }));

    return jsonResponse({
      discounts,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Get discounts error:', error);
    return internalServerErrorResponse('Failed to fetch discounts');
  }
}

// Create new discount
export async function POST({ request }) {
  try {
    const discountData = await request.json();

    const {
      title,
      description = '',
      discount_type,
      method,
      value_type,
      value,
      minimum_requirement_type = 'none',
      minimum_amount,
      minimum_quantity,
      usage_limit,
      usage_limit_per_customer,
      can_combine_with_product_discounts = false,
      can_combine_with_order_discounts = false,
      can_combine_with_shipping_discounts = false,
      customer_eligibility = 'all',
      applies_to_subscription = true,
      applies_to_one_time = true,
      starts_at,
      ends_at,
      available_on_online_store = true,
      available_on_mobile_app = true,
      discount_code
    } = discountData;

    // Validation
    if (!title || !discount_type || !method || !value_type || !value) {
      return badRequestResponse('Missing required fields');
    }

    if (method === 'code' && !discount_code) {
      return badRequestResponse('Discount code is required for code-based discounts');
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Create discount
      const discountResult = await query(`
        INSERT INTO discounts (
          tenant_id, title, description, discount_type, method, value_type, value,
          minimum_requirement_type, minimum_amount, minimum_quantity,
          usage_limit, usage_limit_per_customer,
          can_combine_with_product_discounts, can_combine_with_order_discounts, can_combine_with_shipping_discounts,
          customer_eligibility, applies_to_subscription, applies_to_one_time,
          starts_at, ends_at, available_on_online_store, available_on_mobile_app
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING id, created_at
      `, [
        DEFAULT_TENANT_ID, title, description, discount_type, method, value_type, value,
        minimum_requirement_type, minimum_amount, minimum_quantity,
        usage_limit, usage_limit_per_customer,
        can_combine_with_product_discounts, can_combine_with_order_discounts, can_combine_with_shipping_discounts,
        customer_eligibility, applies_to_subscription, applies_to_one_time,
        starts_at, ends_at, available_on_online_store, available_on_mobile_app
      ]);

      const discountId = discountResult.rows[0].id;

      // Create discount code if method is 'code'
      if (method === 'code') {
        await query(`
          INSERT INTO discount_codes (discount_id, code)
          VALUES ($1, $2)
        `, [discountId, discount_code]);
      }

      await query('COMMIT');

      return jsonResponse({
        success: true,
        discount_id: discountId,
        message: 'Discount created successfully'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Create discount error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return badRequestResponse('Discount code already exists');
    }
    return internalServerErrorResponse('Failed to create discount');
  }
}

// Helper function to get display names for discount types
function getDiscountTypeDisplay(discountType) {
  const displayNames = {
    'amount_off_order': 'Amount off order',
    'amount_off_products': 'Amount off products',
    'buy_x_get_y': 'Buy X Get Y',
    'free_shipping': 'Free shipping'
  };
  return displayNames[discountType] || discountType;
}