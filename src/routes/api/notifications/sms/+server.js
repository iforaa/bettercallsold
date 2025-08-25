import { NotificationService } from '$lib/services/NotificationService.js';
import { jsonResponse, errorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// POST /api/notifications/sms - Send SMS
export async function POST({ request }) {
  try {
    const data = await request.json();
    const { tenant_id = DEFAULT_TENANT_ID, ...smsData } = data;
    
    // Validate required fields
    if (!smsData.recipient) {
      return errorResponse('recipient is required', 400);
    }
    
    if (!smsData.message) {
      return errorResponse('message is required', 400);
    }
    
    console.log('Sending SMS:', {
      tenant_id,
      recipient: smsData.recipient,
      message_length: smsData.message.length
    });
    
    const result = await NotificationService.sendSMS(tenant_id, smsData);
    
    console.log('SMS sent successfully:', {
      message_id: result.message_id,
      provider: result.provider,
      recipient: result.recipient
    });
    
    return jsonResponse({
      success: true,
      message_id: result.message_id,
      provider: result.provider,
      recipient: result.recipient,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('SMS API error:', error);
    return errorResponse(`Failed to send SMS: ${error.message}`, 500);
  }
}