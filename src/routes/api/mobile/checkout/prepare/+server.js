import { CheckoutService } from '$lib/services/CheckoutService.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

/**
 * Prepare Checkout - Server-side Payment Intent Creation
 * 
 * This endpoint follows Stripe security best practices:
 * 1. Server validates current cart state
 * 2. Server creates payment intent with validated totals
 * 3. Only client_secret is returned to mobile
 * 4. No sensitive payment data exposed to client
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    console.log('🛒 Preparing checkout - server-side payment intent creation');

    const { 
      payment_method = 'stripe_card',
      customer_info = {},
      shipping_address,
      billing_address,
      credits_applied = 0
    } = body;

    // Validate required fields
    if (!customer_info.email) {
      return badRequestResponse('Customer email is required');
    }

    if (!shipping_address) {
      return badRequestResponse('Shipping address is required');
    }

    // ==========================================
    // STEP 1: Server validates cart (source of truth)
    // ==========================================
    
    console.log('📊 Validating cart on server (source of truth)');
    const CartService = (await import('$lib/services/CartService.js')).CartService;
    
    // Get current cart state from server with automatic credit application
    const cart = await CartService.validateCartForCheckout(DEFAULT_MOBILE_USER_ID);
    
    if (!cart.cart_items || cart.cart_items.length === 0) {
      return badRequestResponse('Cart is empty');
    }

    console.log(`✅ Cart validated: ${cart.cart_items.length} items, total: $${cart.pricing.total}, credits: $${cart.pricing.credits_applied}`);

    // ==========================================
    // STEP 2: Check if order is fully covered by credits (no payment needed)
    // ==========================================
    
    if (cart.pricing.total <= 0) {
      console.log('🎉 Order fully covered by credits - no payment intent needed');
      
      return jsonResponse({
        success: true,
        // No payment intent for zero-amount orders
        client_secret: null,
        payment_intent_id: null,
        amount: 0,
        currency: 'usd',
        credits_only: true, // Flag for mobile app
        
        // Cart summary for mobile display
        cart_summary: {
          items_count: cart.cart_items.length,
          subtotal: cart.pricing.subtotal,
          tax: cart.pricing.tax,
          shipping: cart.pricing.shipping,
          discount_amount: cart.pricing.discount_amount,
          credits_applied: cart.pricing.credits_applied,
          total: cart.pricing.total
        },
        
        // Discount info for display
        applied_discount: cart.applied_discount ? {
          code: cart.applied_discount.code,
          title: cart.applied_discount.title,
          amount: cart.pricing.discount_amount
        } : null,
        
        // Processing metadata
        prepared_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      });
    }

    // ==========================================
    // STEP 3: Server creates payment intent with validated totals (for orders requiring payment)
    // ==========================================
    
    console.log(`💳 Creating payment intent server-side: $${cart.pricing.total}`);
    
    const paymentIntentResult = await CheckoutService.createPaymentIntent({
      amount: cart.pricing.total,
      currency: 'usd',
      payment_method,
      customer_info,
      // Don't send cart items to payment provider - server manages cart state
      cart_items: cart.cart_items.map(item => ({
        product_id: item.product_id,
        price: item.price,
        quantity: item.quantity || 1,
        variant_data: item.variant_combination || {}
      })),
      metadata: {
        source: 'mobile_app_prepare',
        cart_total: cart.pricing.total,
        cart_items_count: cart.cart_items.length,
        discount_code: cart.applied_discount?.code || null,
        discount_amount: cart.pricing.discount_amount || 0,
        credits_applied: cart.pricing.credits_applied || 0
      }
    });

    if (!paymentIntentResult.success) {
      throw new Error(paymentIntentResult.error || 'Failed to create payment intent');
    }

    console.log(`✅ Payment intent created: ${paymentIntentResult.payment_intent_id}`);

    // ==========================================
    // STEP 4: Return only client_secret (Stripe best practice)
    // ==========================================
    
    return jsonResponse({
      success: true,
      // Only return client_secret for security (Stripe best practice)
      client_secret: paymentIntentResult.client_secret,
      
      // Safe to return - used for mobile confirmation
      payment_intent_id: paymentIntentResult.payment_intent_id,
      amount: paymentIntentResult.amount,
      currency: paymentIntentResult.currency || 'usd',
      
      // Cart summary for mobile display (already calculated server-side)
      cart_summary: {
        items_count: cart.cart_items.length,
        subtotal: cart.pricing.subtotal,
        tax: cart.pricing.tax,
        shipping: cart.pricing.shipping,
        discount_amount: cart.pricing.discount_amount,
        credits_applied: cart.pricing.credits_applied,
        total: cart.pricing.total
      },
      
      // Discount info for display
      applied_discount: cart.applied_discount ? {
        code: cart.applied_discount.code,
        title: cart.applied_discount.title,
        amount: cart.pricing.discount_amount
      } : null,
      
      // Provider info
      provider: paymentIntentResult.provider || 'stripe',
      
      // Processing metadata
      prepared_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    });

  } catch (error) {
    console.error('❌ Checkout preparation failed:', error);
    return internalServerErrorResponse(`Failed to prepare checkout: ${error.message}`);
  }
}