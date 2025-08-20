import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// Get single discount
export async function GET({ params }) {
  try {
    const { id } = params;

    const discountQuery = `
      SELECT 
        d.*,
        dc.id as code_id,
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
      WHERE d.id = $1 AND d.tenant_id = $2
    `;

    const result = await query(discountQuery, [id, DEFAULT_TENANT_ID]);

    if (result.rows.length === 0) {
      return notFoundResponse('Discount not found');
    }

    const discount = result.rows[0];
    discount.status = discount.computed_status;

    // Get usage statistics (removed discount_amount since column was dropped)
    const usageQuery = `
      SELECT 
        COUNT(*) as total_uses,
        COUNT(DISTINCT user_id) as unique_customers,
        MAX(used_at) as last_used_at
      FROM discount_usage
      WHERE discount_id = $1
    `;

    const usageResult = await query(usageQuery, [id]);
    const usageStats = usageResult.rows[0];

    return jsonResponse({
      ...discount,
      usage_stats: {
        total_uses: parseInt(usageStats.total_uses) || 0,
        unique_customers: parseInt(usageStats.unique_customers) || 0,
        last_used_at: usageStats.last_used_at
      }
    });

  } catch (error) {
    console.error('Get discount error:', error);
    return internalServerErrorResponse('Failed to fetch discount');
  }
}

// Update discount
export async function PUT({ params, request }) {
  try {
    const { id } = params;
    const updateData = await request.json();

    const {
      title,
      description,
      value_type,
      value,
      minimum_requirement_type,
      minimum_amount,
      minimum_quantity,
      usage_limit,
      usage_limit_per_customer,
      can_combine_with_product_discounts,
      can_combine_with_order_discounts,
      can_combine_with_shipping_discounts,
      customer_eligibility,
      applies_to_subscription,
      applies_to_one_time,
      starts_at,
      ends_at,
      available_on_online_store,
      available_on_mobile_app,
      discount_code,
      status
    } = updateData;

    // Check if discount exists
    const existingDiscount = await query(
      'SELECT id, method FROM discounts WHERE id = $1 AND tenant_id = $2',
      [id, DEFAULT_TENANT_ID]
    );

    if (existingDiscount.rows.length === 0) {
      return notFoundResponse('Discount not found');
    }

    const currentMethod = existingDiscount.rows[0].method;

    // Map status: frontend uses 'enabled'/'disabled', database uses 'active'/'disabled'
    const dbStatus = status === 'enabled' ? 'active' : status;

    await query('BEGIN');

    try {
      // Update discount
      await query(`
        UPDATE discounts SET
          title = COALESCE($3, title),
          description = COALESCE($4, description),
          value_type = COALESCE($5, value_type),
          value = COALESCE($6, value),
          minimum_requirement_type = COALESCE($7, minimum_requirement_type),
          minimum_amount = $8,
          minimum_quantity = $9,
          usage_limit = $10,
          usage_limit_per_customer = $11,
          can_combine_with_product_discounts = COALESCE($12, can_combine_with_product_discounts),
          can_combine_with_order_discounts = COALESCE($13, can_combine_with_order_discounts),
          can_combine_with_shipping_discounts = COALESCE($14, can_combine_with_shipping_discounts),
          customer_eligibility = COALESCE($15, customer_eligibility),
          applies_to_subscription = COALESCE($16, applies_to_subscription),
          applies_to_one_time = COALESCE($17, applies_to_one_time),
          starts_at = COALESCE($18, starts_at),
          ends_at = $19,
          available_on_online_store = COALESCE($20, available_on_online_store),
          available_on_mobile_app = COALESCE($21, available_on_mobile_app),
          status = COALESCE($22, status),
          updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `, [
        id, DEFAULT_TENANT_ID, title, description, value_type, value,
        minimum_requirement_type, minimum_amount, minimum_quantity,
        usage_limit, usage_limit_per_customer,
        can_combine_with_product_discounts, can_combine_with_order_discounts, can_combine_with_shipping_discounts,
        customer_eligibility, applies_to_subscription, applies_to_one_time,
        starts_at, ends_at, available_on_online_store, available_on_mobile_app, dbStatus
      ]);

      // Update discount code if method is 'code' and code is provided
      if (currentMethod === 'code' && discount_code) {
        await query(`
          UPDATE discount_codes SET
            code = $2
          WHERE discount_id = $1
        `, [id, discount_code]);
      }

      await query('COMMIT');

      return jsonResponse({
        success: true,
        message: 'Discount updated successfully'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Update discount error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return badRequestResponse('Discount code already exists');
    }
    return internalServerErrorResponse('Failed to update discount');
  }
}

// Delete discount
export async function DELETE({ params }) {
  try {
    const { id } = params;

    // Check if discount exists
    const existingDiscount = await query(
      'SELECT id FROM discounts WHERE id = $1 AND tenant_id = $2',
      [id, DEFAULT_TENANT_ID]
    );

    if (existingDiscount.rows.length === 0) {
      return notFoundResponse('Discount not found');
    }

    // Check if discount has been used
    const usageCheck = await query(
      'SELECT COUNT(*) as usage_count FROM discount_usage WHERE discount_id = $1',
      [id]
    );

    const usageCount = parseInt(usageCheck.rows[0].usage_count);

    if (usageCount > 0) {
      return badRequestResponse(`Cannot delete discount that has been used ${usageCount} times. Consider disabling it instead.`);
    }

    // Delete discount (cascade will handle codes and usage)
    await query('DELETE FROM discounts WHERE id = $1 AND tenant_id = $2', [id, DEFAULT_TENANT_ID]);

    return jsonResponse({
      success: true,
      message: 'Discount deleted successfully'
    });

  } catch (error) {
    console.error('Delete discount error:', error);
    return internalServerErrorResponse('Failed to delete discount');
  }
}