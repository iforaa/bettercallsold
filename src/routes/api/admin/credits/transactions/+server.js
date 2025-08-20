import { CreditService } from '$lib/services/CreditService.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';

/**
 * Get credit transaction history (admin view)
 * GET /api/admin/credits/transactions
 */
export async function GET({ url }) {
  try {
    const userId = url.searchParams.get('user_id');
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;

    if (limit > 200) {
      return badRequestResponse('Limit cannot exceed 200');
    }

    console.log(`📜 Fetching credit transactions ${userId ? `for user ${userId}` : '(all users)'}`);

    let transactions;
    if (userId) {
      transactions = await CreditService.getTransactionHistory(userId, limit, offset);
    } else {
      // Get all transactions across all users (admin overview)
      transactions = await CreditService.getAllTransactions(limit, offset);
    }

    return jsonResponse({
      success: true,
      transactions,
      count: transactions.length,
      pagination: {
        limit,
        offset,
        user_id: userId,
        has_more: transactions.length === limit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching credit transactions:', error);
    return internalServerErrorResponse(`Failed to fetch transactions: ${error.message}`);
  }
}