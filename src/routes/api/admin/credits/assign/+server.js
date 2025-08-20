import { CreditService } from '$lib/services/CreditService.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';

/**
 * Assign credits to a customer
 * POST /api/admin/credits/assign
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { user_id, amount, description, expires_at, admin_user_id } = body;

    // Validation
    if (!user_id) {
      return badRequestResponse('user_id is required');
    }

    if (!amount || amount <= 0) {
      return badRequestResponse('amount must be a positive number');
    }

    if (!description || description.trim().length === 0) {
      return badRequestResponse('description is required');
    }

    // For now, use a default admin user ID - in real app, get from session/auth
    const actualAdminUserId = admin_user_id || '22222222-2222-2222-2222-222222222222';

    // Parse expiration date if provided
    let expirationDate = null;
    if (expires_at) {
      expirationDate = new Date(expires_at);
      if (isNaN(expirationDate.getTime())) {
        return badRequestResponse('expires_at must be a valid date');
      }
      if (expirationDate <= new Date()) {
        return badRequestResponse('expires_at must be in the future');
      }
    }

    console.log(`💳 Assigning $${amount} credits to user ${user_id} by admin ${actualAdminUserId}`);

    const result = await CreditService.assignCredits(
      user_id,
      parseFloat(amount),
      description.trim(),
      actualAdminUserId,
      expirationDate
    );

    return jsonResponse({
      success: true,
      message: `Successfully assigned $${amount} credits to customer`,
      ...result
    });

  } catch (error) {
    console.error('❌ Error assigning credits:', error);
    return internalServerErrorResponse(`Failed to assign credits: ${error.message}`);
  }
}