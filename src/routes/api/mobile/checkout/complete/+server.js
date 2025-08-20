import { CheckoutService } from '$lib/services/CheckoutService.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse } from '$lib/response.js';

/**
 * Complete Checkout - Verify Payment and Create Order
 * 
 * This endpoint handles the final checkout step:
 * 1. Verifies payment was successful with payment provider
 * 2. Creates order in database
 * 3. Clears cart after successful order creation
 * 4. Returns order confirmation
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    console.log('🎯 Completing checkout - verify payment and create order');

    const { 
      payment_intent_id,
      payment_method = 'stripe_card',
      customer_info = {},
      shipping_address,
      billing_address,
      credits_applied = 0
    } = body;

    // Validate required fields (payment_intent_id can be null for credits-only orders)
    if (!payment_intent_id && payment_method !== 'credits_only') {
      return badRequestResponse('Payment intent ID is required for paid orders');
    }

    if (!customer_info.email) {
      return badRequestResponse('Customer email is required');
    }

    if (!shipping_address) {
      return badRequestResponse('Shipping address is required');
    }

    // ==========================================
    // STEP 1: Process checkout (with or without payment verification)
    // ==========================================
    
    if (payment_method === 'credits_only') {
      console.log('🎉 Processing credits-only checkout (no payment verification needed)');
    } else {
      console.log(`💳 Processing checkout for payment intent: ${payment_intent_id}`);
    }
    
    const result = await CheckoutService.processCheckout({
      payment_method,
      payment_data: payment_method === 'credits_only' ? {} : {
        payment_intent_id
      },
      shipping_address,
      billing_address,
      customer_info
    });

    if (!result.success) {
      console.error('❌ Checkout processing failed:', result.error);
      throw new Error(result.error || 'Checkout processing failed');
    }

    console.log(`✅ Checkout completed: Order ${result.order_id} created successfully`);

    // ==========================================
    // STEP 2: Return order confirmation (credits are handled by CheckoutService)
    // ==========================================
    
    return jsonResponse({
      success: true,
      order_id: result.order_id,
      payment_status: result.payment_status,
      total_amount: result.total_amount,
      currency: result.currency || 'USD',
      
      // Order details
      order_details: {
        order_number: result.order_id.substring(0, 8).toUpperCase(),
        status: result.status || 'processing',
        created_at: result.created_at,
        estimated_delivery: result.estimated_delivery
      },
      
      // Payment details
      payment_details: {
        provider: result.payment_provider,
        payment_id: result.payment_id,
        method: payment_method,
        status: result.payment_status
      },
      
      // Customer details
      customer_details: {
        email: customer_info.email,
        name: customer_info.name
      },
      
      // Success message
      message: result.message || 'Your order has been placed successfully!',
      
      // Processing info
      completed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Checkout completion failed:', error);
    return internalServerErrorResponse(`Failed to complete checkout: ${error.message}`);
  }
}