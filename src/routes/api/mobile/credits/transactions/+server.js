import { CreditService } from '$lib/services/CreditService.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

/**
 * Get user's credit transaction history (mobile view - limited details)
 * GET /api/mobile/credits/transactions
 */
export async function GET({ url }) {
  try {
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const offset = parseInt(url.searchParams.get('offset')) || 0;

    if (limit > 100) {
      return badRequestResponse('Limit cannot exceed 100');
    }

    console.log(`📱 Fetching credit transactions for mobile user: ${DEFAULT_MOBILE_USER_ID} (limit: ${limit})`);

    const transactions = await CreditService.getTransactionHistory(DEFAULT_MOBILE_USER_ID, limit, offset);

    // Filter sensitive information for mobile users
    const mobileTransactions = transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.transaction_type,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.created_at,
      // Hide admin details and internal references for mobile
      balance_after: transaction.balance_after
    }));

    return jsonResponse({
      success: true,
      transactions: mobileTransactions,
      count: mobileTransactions.length,
      pagination: {
        limit,
        offset,
        has_more: mobileTransactions.length === limit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching mobile credit transactions:', error);
    return internalServerErrorResponse(`Failed to fetch transactions: ${error.message}`);
  }
}