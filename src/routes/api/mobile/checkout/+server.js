import { CheckoutService } from '$lib/services/CheckoutService.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse } from '$lib/response.js';

/**
 * Multi-Provider Checkout API
 * 
 * Unified checkout endpoint supporting multiple payment providers.
 * Currently optimized for Stripe with infrastructure ready for PayPal, Klarna, etc.
 * 
 * Replaces the previous Stripe-only implementation with a provider-agnostic system.
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    console.log('🛒 Multi-provider checkout called with payment method:', body.payment_method);

    const {
      payment_method,
      payment_data = {},
      shipping_address,
      billing_address,
      customer_info = {},
      pricing = {},
      cart_items = [],
      discount_code = null,
      // Legacy support for backward compatibility
      payment_intent_id,
      apple_pay_token,
      payment_nonce
    } = body;

    // ==========================================
    // Input validation
    // ==========================================
    
    if (!payment_method) {
      return badRequestResponse('payment_method is required');
    }

    if (!payment_data || typeof payment_data !== 'object') {
      // Handle legacy format where specific payment data was at root level
      if (payment_intent_id) {
        body.payment_data = { payment_intent_id };
      } else if (apple_pay_token) {
        body.payment_data = { apple_pay_token };
      } else if (payment_nonce) {
        body.payment_data = { payment_nonce };
      } else {
        return badRequestResponse('payment_data is required and must be an object');
      }
    }

    if (!shipping_address) {
      return badRequestResponse('shipping_address is required');
    }

    // ==========================================
    // Normalize payment method for provider system
    // ==========================================
    
    let normalizedPaymentMethod = payment_method;
    
    // Map legacy payment methods to provider system
    const methodMapping = {
      'apple_pay': 'apple_pay',
      'google_pay': 'google_pay', 
      'card': 'stripe_card',
      'credit_card': 'stripe_card'
    };

    if (methodMapping[payment_method]) {
      normalizedPaymentMethod = methodMapping[payment_method];
      console.log(`🔄 Mapped '${payment_method}' to '${normalizedPaymentMethod}'`);
    }

    // Default to Stripe for any unrecognized methods (backward compatibility)
    if (!normalizedPaymentMethod.includes('stripe') && !normalizedPaymentMethod.includes('paypal') && !normalizedPaymentMethod.includes('klarna')) {
      normalizedPaymentMethod = 'stripe_card';
      console.log(`🔄 Defaulting unrecognized method '${payment_method}' to 'stripe_card'`);
    }

    // ==========================================
    // Process checkout using new multi-provider service
    // ==========================================
    
    const result = await CheckoutService.processCheckout({
      payment_method: normalizedPaymentMethod,
      payment_data: body.payment_data,
      shipping_address,
      billing_address,
      customer_info,
      pricing,
      cart_items,
      discount_code
    });

    console.log(`✅ Checkout completed successfully: ${result.order_id} via ${result.payment_provider}`);

    // ==========================================
    // Return response in expected format
    // ==========================================
    
    return jsonResponse({
      success: result.success,
      order_id: result.order_id,
      status: result.status,
      total_amount: result.total_amount,
      subtotal_amount: result.subtotal_amount,
      tax_amount: result.tax_amount,
      shipping_amount: result.shipping_amount,
      free_returns: pricing.freeReturns || 0,
      payment_id: result.payment_id,
      payment_method: result.payment_method,
      payment_provider: result.payment_provider,
      payment_status: 'succeeded',
      created_at: new Date().toISOString(),
      message: result.message,
      processing_time_ms: result.processing_time_ms,
      
      // Provider-specific fields for backward compatibility
      ...(result.payment_provider === 'stripe' && {
        stripe_payment_intent_id: result.payment_id,
        stripe_customer_id: result.customer_id,
        receipt_url: result.receipt_url
      }),
      
      ...(result.payment_provider === 'paypal' && {
        paypal_payment_id: result.payment_id,
        paypal_payer_id: result.customer_id
      }),
      
      ...(result.payment_provider === 'klarna' && {
        klarna_order_id: result.payment_id,
        klarna_session_id: result.customer_id
      })
    });

  } catch (error) {
    console.error('❌ Multi-provider checkout failed:', error);
    
    return internalServerErrorResponse({
      message: `Checkout failed: ${error.message}`,
      error_type: error.constructor.name,
      timestamp: new Date().toISOString(),
      
      // Include stack trace in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    });
  }
}