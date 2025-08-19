import { stripeService } from '$lib/services/StripeService.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse } from '$lib/response.js';

export async function POST({ request }) {
  try {
    const { amount, currency = 'usd', metadata = {} } = await request.json();

    // Validate required fields
    if (!amount || amount <= 0) {
      return badRequestResponse('Amount is required and must be greater than 0');
    }

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      amount,
      currency,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });

    return jsonResponse({
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    });

  } catch (error) {
    console.error('❌ Create payment intent error:', error);
    return internalServerErrorResponse(`Failed to create payment intent: ${error.message}`);
  }
}