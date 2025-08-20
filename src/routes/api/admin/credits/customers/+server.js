import { CreditService } from '$lib/services/CreditService.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';

/**
 * Get all customers with their credit balances
 * GET /api/admin/credits/customers
 */
export async function GET({ url }) {
  try {
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    const offset = parseInt(url.searchParams.get('offset')) || 0;

    if (limit > 500) {
      return badRequestResponse('Limit cannot exceed 500');
    }

    console.log(`🏦 Fetching customer credit balances (limit: ${limit}, offset: ${offset})`);

    const customers = await CreditService.getAllCustomerBalances(limit, offset);

    return jsonResponse({
      success: true,
      customers,
      count: customers.length,
      pagination: {
        limit,
        offset,
        has_more: customers.length === limit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching customer credits:', error);
    return internalServerErrorResponse(`Failed to fetch customer credits: ${error.message}`);
  }
}