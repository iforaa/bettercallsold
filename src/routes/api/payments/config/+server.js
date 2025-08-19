import { stripeService } from '$lib/services/StripeService.js';
import { jsonResponse } from '$lib/response.js';

/**
 * Get Stripe configuration for frontend
 */
export async function GET() {
  return jsonResponse({
    publishable_key: stripeService.getPublishableKey(),
    test_mode: stripeService.isTestMode,
    test_cards: stripeService.isTestMode ? stripeService.getTestCards() : null
  });
}