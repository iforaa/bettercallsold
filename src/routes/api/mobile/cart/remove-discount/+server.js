import { CartService } from '$lib/services/CartService.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

/**
 * Remove applied discount from cart
 * POST /api/mobile/cart/remove-discount
 */
export async function POST({ request }) {
  try {
    // Use CartService to remove discount
    const result = await CartService.removeDiscount(DEFAULT_MOBILE_USER_ID);
    
    // Return updated cart without discount
    return jsonResponse({
      success: true,
      message: 'Discount removed successfully',
      cart_items: result.cart_items,
      pricing: result.pricing,
      applied_discount: result.applied_discount // Should be null
    });

  } catch (error) {
    console.error('Remove discount error:', error);
    return internalServerErrorResponse(`Failed to remove discount: ${error.message}`);
  }
}