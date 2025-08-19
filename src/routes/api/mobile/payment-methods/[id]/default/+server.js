import { query } from '$lib/database.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

/**
 * Set a payment method as default
 */
export async function PUT({ params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return badRequestResponse('Payment method ID is required');
    }

    console.log(`⭐ Setting default payment method: ${id}`);

    // First, unset all current defaults
    await query(`
      UPDATE customer_payment_methods 
      SET is_default = false 
      WHERE tenant_id = $1 AND user_id = $2 AND is_default = true
    `, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);

    // Set the specified method as default
    const updateResult = await query(`
      UPDATE customer_payment_methods
      SET is_default = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND user_id = $3
      RETURNING id, card_brand, card_last4, is_default
    `, [id, DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);

    if (updateResult.rows.length === 0) {
      return notFoundResponse('Payment method not found');
    }

    const defaultMethod = updateResult.rows[0];
    console.log(`✅ Set default payment method: ${defaultMethod.card_brand} ****${defaultMethod.card_last4}`);

    return jsonResponse({
      success: true,
      payment_method: defaultMethod,
      message: 'Default payment method updated successfully'
    });

  } catch (error) {
    console.error('❌ Failed to set default payment method:', error);
    return internalServerErrorResponse('Failed to set default payment method');
  }
}