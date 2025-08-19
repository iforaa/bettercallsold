import { CheckoutService } from '$lib/services/CheckoutService.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse } from '$lib/response.js';

/**
 * Create Payment Intent through Multi-Provider System
 * 
 * This endpoint creates payment intents using the new CheckoutService.
 * Supports multiple providers but currently optimized for Stripe.
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    console.log('💳 Creating payment intent via multi-provider system');

    const { 
      amount, 
      currency = 'usd', 
      customer_info = {},
      cart_items = [],
      metadata = {},
      payment_method = 'stripe_card' // Default to Stripe for backward compatibility
    } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return badRequestResponse('Amount is required and must be greater than 0');
    }

    if (!cart_items || cart_items.length === 0) {
      return badRequestResponse('Cart items are required');
    }

    // Use new CheckoutService to create payment intent
    console.log(`💳 Creating payment intent for ${payment_method}: $${amount}`);
    
    const result = await CheckoutService.createPaymentIntent({
      amount,
      currency,
      payment_method, 
      customer_info,
      cart_items,
      metadata: {
        source: 'mobile_app',
        api_version: 'multi_provider',
        cart_items_count: cart_items.length,
        ...metadata
      }
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create payment intent');
    }

    console.log(`✅ Payment intent created: ${result.payment_intent_id || result.data?.payment_intent_id} via ${result.provider}`);

    // Return response in format expected by mobile app
    return jsonResponse({
      success: true,
      provider: result.provider,
      client_secret: result.client_secret || result.data?.client_secret,
      payment_intent_id: result.payment_intent_id || result.data?.payment_intent_id,
      amount: result.amount,
      currency: result.currency,
      status: result.data?.status,
      customer_id: result.customer_id || result.data?.customer_id || null,
      
      // Provider-specific features information
      features: {
        ...(result.provider === 'stripe' && {
          ephemeral_keys: true,
          saved_methods: true,
          apple_pay: true,
          google_pay: true
        }),
        ...(result.provider === 'paypal' && {
          paypal_credit: true,
          saved_methods: false
        }),
        ...(result.provider === 'klarna' && {
          pay_later: true,
          pay_now: true,
          slice_it: true,
          saved_methods: false
        })
      },
      
      // Include processing metadata
      processing_info: {
        provider_used: result.provider,
        created_via: 'multi_provider_system',
        timestamp: new Date().toISOString()
      },
      
      // Include debug data in development
      ...(process.env.NODE_ENV === 'development' && {
        debug_data: {
          provider_response: result.data,
          method_mapping: {
            requested: payment_method,
            used: result.provider
          }
        }
      })
    });

  } catch (error) {
    console.error('❌ Multi-provider payment intent creation failed:', error);
    return internalServerErrorResponse(`Failed to create payment intent: ${error.message}`);
  }
}