import { NotificationService } from '$lib/services/NotificationService.js';
import { jsonResponse, errorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// POST /api/notifications/push - Send push notification
export async function POST({ request }) {
  try {
    const data = await request.json();
    const { tenant_id = DEFAULT_TENANT_ID, ...pushData } = data;
    
    // Validate required fields
    if (!pushData.recipient) {
      return errorResponse('recipient (device token) is required', 400);
    }
    
    if (!pushData.title) {
      return errorResponse('title is required', 400);
    }
    
    if (!pushData.body) {
      return errorResponse('body is required', 400);
    }
    
    console.log('Sending push notification:', {
      tenant_id,
      recipient: pushData.recipient.substring(0, 20) + '...', // Truncate token for logging
      title: pushData.title
    });
    
    const result = await NotificationService.sendPush(tenant_id, pushData);
    
    console.log('Push notification sent successfully:', {
      message_id: result.message_id,
      provider: result.provider,
      recipient: pushData.recipient.substring(0, 20) + '...'
    });
    
    return jsonResponse({
      success: true,
      message_id: result.message_id,
      provider: result.provider,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Push notification API error:', error);
    return errorResponse(`Failed to send push notification: ${error.message}`, 500);
  }
}