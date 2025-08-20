import { CreditService } from '$lib/services/CreditService.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';

/**
 * Manual balance adjustment (corrections/refunds)
 * POST /api/admin/credits/adjust
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { user_id, amount, description, admin_user_id } = body;

    // Validation
    if (!user_id) {
      return badRequestResponse('user_id is required');
    }

    if (!amount || amount === 0) {
      return badRequestResponse('amount must be a non-zero number');
    }

    if (!description || description.trim().length === 0) {
      return badRequestResponse('description is required');
    }

    // For now, use a default admin user ID - in real app, get from session/auth
    const actualAdminUserId = admin_user_id || '22222222-2222-2222-2222-222222222222';

    console.log(`⚖️ Adjusting balance by $${amount} for user ${user_id} by admin ${actualAdminUserId}`);

    const result = await CreditService.adjustBalance(
      user_id,
      parseFloat(amount),
      description.trim(),
      actualAdminUserId
    );

    return jsonResponse({
      success: true,
      message: `Successfully adjusted balance by $${amount}`,
      ...result
    });

  } catch (error) {
    console.error('❌ Error adjusting balance:', error);
    return internalServerErrorResponse(`Failed to adjust balance: ${error.message}`);
  }
}