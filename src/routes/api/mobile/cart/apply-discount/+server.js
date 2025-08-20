import { CartService } from '$lib/services/CartService.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

/**
 * Apply discount code to cart
 * POST /api/mobile/cart/apply-discount
 */
export async function POST({ request }) {
  try {
    const { discount_code } = await request.json();

    if (!discount_code || typeof discount_code !== 'string' || !discount_code.trim()) {
      return badRequestResponse('discount_code is required');
    }

    // Use CartService to apply discount - handles all validation via DiscountService
    const result = await CartService.applyDiscount(DEFAULT_MOBILE_USER_ID, discount_code.trim());
    
    if (!result.success) {
      return jsonResponse({
        success: false,
        error: result.error,
        cart_items: result.cart_items,
        pricing: result.pricing,
        applied_discount: result.applied_discount
      });
    }

    // Success response - return updated cart with applied discount
    return jsonResponse({
      success: true,
      message: `Discount "${discount_code}" applied successfully`,
      cart_items: result.cart_items,
      pricing: result.pricing,
      applied_discount: result.applied_discount
    });

  } catch (error) {
    console.error('Apply discount error:', error);
    return internalServerErrorResponse(`Failed to apply discount: ${error.message}`);
  }
}