import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

// Validate discount code
export async function POST({ request }) {
  try {
    const { code, cart_total = 0, user_id = DEFAULT_MOBILE_USER_ID } = await request.json();

    if (!code) {
      return badRequestResponse('Discount code is required');
    }

    // Get discount and code information
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
      JOIN discount_codes dc ON d.id = dc.discount_id
      WHERE dc.code = $1 AND d.tenant_id = $2
    `;

    const result = await query(discountQuery, [code.toUpperCase(), DEFAULT_TENANT_ID]);

    if (result.rows.length === 0) {
      return jsonResponse({
        valid: false,
        error: 'Invalid discount code'
      });
    }

    const discount = result.rows[0];

    // Check if discount is active
    if (discount.computed_status !== 'active') {
      let errorMessage = 'This discount code is not available';
      
      if (discount.computed_status === 'expired') {
        errorMessage = 'This discount code has expired';
      } else if (discount.computed_status === 'scheduled') {
        errorMessage = 'This discount code is not yet active';
      } else if (discount.computed_status === 'disabled') {
        errorMessage = 'This discount code has been disabled';
      }

      return jsonResponse({
        valid: false,
        error: errorMessage
      });
    }

    // Check usage limits
    if (discount.usage_limit && discount.total_usage_count >= discount.usage_limit) {
      return jsonResponse({
        valid: false,
        error: 'This discount code has reached its usage limit'
      });
    }

    // Check per-customer usage limit
    if (discount.usage_limit_per_customer) {
      const customerUsageResult = await query(`
        SELECT COUNT(*) as customer_usage
        FROM discount_usage 
        WHERE discount_id = $1 AND user_id = $2
      `, [discount.id, user_id]);

      const customerUsage = parseInt(customerUsageResult.rows[0].customer_usage);
      
      if (customerUsage >= discount.usage_limit_per_customer) {
        return jsonResponse({
          valid: false,
          error: 'You have already used this discount code the maximum number of times'
        });
      }
    }

    // Check minimum purchase requirements
    if (discount.minimum_requirement_type === 'minimum_amount' && discount.minimum_amount) {
      if (cart_total < discount.minimum_amount) {
        return jsonResponse({
          valid: false,
          error: `Minimum order amount of $${discount.minimum_amount} required`
        });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.value_type === 'percentage') {
      discountAmount = (cart_total * discount.value) / 100;
    } else if (discount.value_type === 'fixed_amount') {
      discountAmount = Math.min(discount.value, cart_total); // Don't exceed cart total
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    return jsonResponse({
      valid: true,
      discount: {
        id: discount.id,
        code_id: discount.code_id,
        title: discount.title,
        description: discount.description,
        discount_type: discount.discount_type,
        value_type: discount.value_type,
        value: discount.value,
        discount_amount: discountAmount
      }
    });

  } catch (error) {
    console.error('Validate discount code error:', error);
    return internalServerErrorResponse('Failed to validate discount code');
  }
}