import { query } from '$lib/database.js';
import { stripeService } from '$lib/services/StripeService.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

/**
 * Delete a saved payment method
 */
export async function DELETE({ params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return badRequestResponse('Payment method ID is required');
    }

    console.log(`🗑️ Deleting payment method: ${id}`);

    // First, get the payment method details to detach from provider
    const getPaymentMethodQuery = `
      SELECT payment_provider, provider_payment_method_id, provider_customer_id, card_brand, card_last4
      FROM customer_payment_methods
      WHERE id = $1 AND tenant_id = $2 AND user_id = $3
    `;

    const paymentMethodResult = await query(getPaymentMethodQuery, [
      id,
      DEFAULT_TENANT_ID,
      DEFAULT_MOBILE_USER_ID
    ]);

    if (paymentMethodResult.rows.length === 0) {
      return notFoundResponse('Payment method not found');
    }

    const paymentMethod = paymentMethodResult.rows[0];

    // Detach payment method from provider if it's Stripe
    if (paymentMethod.payment_provider === 'stripe' && paymentMethod.provider_payment_method_id && paymentMethod.provider_payment_method_id !== 'pm_test_1234567890') {
      try {
        console.log('🔗 Detaching payment method from Stripe customer...');
        await stripeService.detachPaymentMethodFromCustomer(paymentMethod.provider_payment_method_id);
        console.log('✅ Payment method detached from Stripe customer');
      } catch (error) {
        console.error('❌ Failed to detach payment method from Stripe:', error);
        // Continue with database deletion even if Stripe detachment fails
      }
    }

    // Delete the payment method from database
    const deleteResult = await query(`
      DELETE FROM customer_payment_methods
      WHERE id = $1 AND tenant_id = $2 AND user_id = $3
      RETURNING id, card_brand, card_last4
    `, [id, DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);

    if (deleteResult.rows.length === 0) {
      return notFoundResponse('Payment method not found or already deleted');
    }

    const deletedMethod = deleteResult.rows[0];
    console.log(`✅ Payment method deleted: ${deletedMethod.card_brand} ****${deletedMethod.card_last4}`);

    return jsonResponse({
      success: true,
      message: 'Payment method deleted successfully'
    });

  } catch (error) {
    console.error('❌ Failed to delete payment method:', error);
    return internalServerErrorResponse('Failed to delete payment method');
  }
}

/**
 * Update a payment method (e.g., set as default)
 */
export async function PUT({ params, request }) {
  try {
    const { id } = params;
    const { is_default } = await request.json();
    
    if (!id) {
      return badRequestResponse('Payment method ID is required');
    }

    console.log(`🔄 Updating payment method: ${id}, default: ${is_default}`);

    // If setting as default, unset all other defaults first
    if (is_default) {
      await query(`
        UPDATE customer_payment_methods 
        SET is_default = false 
        WHERE tenant_id = $1 AND user_id = $2 AND is_default = true
      `, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
    }

    // Update the payment method
    const updateResult = await query(`
      UPDATE customer_payment_methods
      SET is_default = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3 AND user_id = $4
      RETURNING id, card_brand, card_last4, is_default
    `, [is_default, id, DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);

    if (updateResult.rows.length === 0) {
      return notFoundResponse('Payment method not found');
    }

    const updatedMethod = updateResult.rows[0];
    console.log(`✅ Updated payment method: ${updatedMethod.card_brand} ****${updatedMethod.card_last4}`);

    return jsonResponse({
      success: true,
      payment_method: updatedMethod,
      message: 'Payment method updated successfully'
    });

  } catch (error) {
    console.error('❌ Failed to update payment method:', error);
    return internalServerErrorResponse('Failed to update payment method');
  }
}