import { CreditService } from '$lib/services/CreditService.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

/**
 * Get current user's credit balance
 * GET /api/mobile/credits/balance
 */
export async function GET() {
  try {
    console.log(`📱 Fetching credit balance for mobile user: ${DEFAULT_MOBILE_USER_ID}`);

    const balance = await CreditService.getUserBalance(DEFAULT_MOBILE_USER_ID);

    return jsonResponse({
      success: true,
      balance: balance.balance,
      total_earned: balance.total_earned,
      total_spent: balance.total_spent,
      last_updated: balance.updated_at
    });

  } catch (error) {
    console.error('❌ Error fetching mobile user credit balance:', error);
    return internalServerErrorResponse(`Failed to fetch credit balance: ${error.message}`);
  }
}