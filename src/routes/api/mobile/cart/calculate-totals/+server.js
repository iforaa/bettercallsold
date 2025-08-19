import { json } from '@sveltejs/kit';
import { CheckoutService } from '$lib/services/CheckoutService.js';

/**
 * Calculate cart totals server-side
 * POST /api/mobile/cart/calculate-totals
 */
export async function POST({ request }) {
  try {
    const { cart_items, discount_code = null, free_returns_enabled = false } = await request.json();

    if (!cart_items || !Array.isArray(cart_items)) {
      return json({ error: 'cart_items array is required' }, { status: 400 });
    }

    // Use CheckoutService to calculate totals
    const { cartItems, calculatedPricing } = await CheckoutService.getCartDataAndCalculateTotals(
      cart_items,
      { freeReturns: free_returns_enabled ? cart_items.reduce((sum, item) => sum + item.price, 0) * 0.1 : 0 }, // 10% for free returns
      discount_code
    );

    return json({
      success: true,
      pricing: {
        subtotal: calculatedPricing.subtotal,
        tax: calculatedPricing.tax,
        shipping: calculatedPricing.shipping,
        freeReturns: calculatedPricing.freeReturns,
        discountAmount: calculatedPricing.discountAmount,
        total: calculatedPricing.total
      },
      appliedDiscount: calculatedPricing.appliedDiscount,
      cartItems
    });

  } catch (error) {
    console.error('Calculate totals error:', error);
    return json({ 
      error: 'Failed to calculate totals',
      message: error.message 
    }, { status: 500 });
  }
}