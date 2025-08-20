import { CreditService } from '$lib/services/CreditService.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

/**
 * Get credit system statistics for admin dashboard
 * GET /api/admin/credits/stats
 */
export async function GET() {
  try {
    console.log('📊 Fetching credit system statistics');

    const stats = await CreditService.getCreditStats();

    return jsonResponse({
      success: true,
      stats,
      summary: {
        utilization_rate: stats.total_credits_issued > 0 ? 
          (stats.total_credits_used / stats.total_credits_issued * 100).toFixed(2) : '0.00',
        outstanding_percentage: stats.total_credits_issued > 0 ? 
          (stats.total_outstanding_balance / stats.total_credits_issued * 100).toFixed(2) : '0.00'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching credit stats:', error);
    return internalServerErrorResponse(`Failed to fetch credit statistics: ${error.message}`);
  }
}