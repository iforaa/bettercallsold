import { stripeService } from '$lib/services/StripeService.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse } from '$lib/response.js';

/**
 * Create ephemeral key for customer to access saved payment methods in mobile app
 */
export async function POST({ request }) {
  try {
    const { customer_id } = await request.json();

    // Validate required fields
    if (!customer_id) {
      return badRequestResponse('Customer ID is required');
    }

    console.log(`🔑 Creating ephemeral key for customer: ${customer_id}`);

    // Create ephemeral key using Stripe service
    const ephemeralKey = await stripeService.createEphemeralKey(customer_id);

    return jsonResponse({
      success: true,
      ephemeral_key_secret: ephemeralKey.secret,
      customer_id: ephemeralKey.associated_objects[0].id
    });

  } catch (error) {
    console.error('❌ Ephemeral key creation failed:', error);
    return internalServerErrorResponse(`Failed to create ephemeral key: ${error.message}`);
  }
}