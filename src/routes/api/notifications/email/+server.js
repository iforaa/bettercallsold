import { NotificationService } from '$lib/services/NotificationService.js';
import { jsonResponse, errorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// POST /api/notifications/email - Send email
export async function POST({ request }) {
  try {
    const data = await request.json();
    const { tenant_id = DEFAULT_TENANT_ID, ...emailData } = data;
    
    // Validate required fields
    if (!emailData.recipient) {
      return errorResponse('recipient is required', 400);
    }
    
    // Either template_id OR (subject + content) is required
    if (!emailData.template_id && (!emailData.subject || !emailData.content)) {
      return errorResponse('Either template_id or (subject + content) is required', 400);
    }
    
    console.log('Sending email:', {
      tenant_id,
      recipient: emailData.recipient,
      template_id: emailData.template_id || 'custom',
      has_variables: !!emailData.variables
    });
    
    const result = await NotificationService.sendEmail(tenant_id, emailData);
    
    console.log('Email sent successfully:', {
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
    console.error('Email API error:', error);
    return errorResponse(`Failed to send email: ${error.message}`, 500);
  }
}