import { CreditService } from '$lib/services/CreditService.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

/**
 * Apply credits during checkout (validate credit application)
 * POST /api/mobile/credits/apply
 * 
 * This endpoint validates that credits can be applied to a cart/order
 * without actually deducting them (that happens during checkout completion)
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { amount, cart_total } = body;

    // Validation
    if (!amount || amount <= 0) {
      return badRequestResponse('amount must be a positive number');
    }

    if (!cart_total || cart_total <= 0) {
      return badRequestResponse('cart_total must be a positive number');
    }

    console.log(`📱 Validating credit application: $${amount} against cart total $${cart_total} for user ${DEFAULT_MOBILE_USER_ID}`);

    // Validate credit application
    const validation = await CreditService.validateCreditApplication(
      DEFAULT_MOBILE_USER_ID,
      parseFloat(amount),
      parseFloat(cart_total)
    );

    if (!validation.valid) {
      return jsonResponse({
        success: false,
        error: validation.error,
        validation_details: validation
      });
    }

    // Return validated amount and remaining balance
    return jsonResponse({
      success: true,
      applicable_amount: validation.applicable_amount,
      remaining_balance: validation.remaining_balance,
      message: `Successfully validated $${validation.applicable_amount} credits application`
    });

  } catch (error) {
    console.error('❌ Error applying mobile credits:', error);
    return internalServerErrorResponse(`Failed to apply credits: ${error.message}`);
  }
}