import { PluginService } from '$lib/services/PluginService.js';

// POST /api/notifications/webhooks/twilio/{tenant_id} - Twilio SMS webhook
export async function POST({ request, params }) {
  try {
    const { tenant_id } = params;
    
    if (!tenant_id) {
      console.error('Twilio webhook: Missing tenant_id parameter');
      return new Response('Missing tenant_id', { status: 400 });
    }
    
    const formData = await request.formData();
    
    // Extract Twilio webhook data
    const event = {
      message_id: formData.get('MessageSid'),
      status: formData.get('MessageStatus'),
      recipient: formData.get('To'),
      from: formData.get('From'),
      body: formData.get('Body'),
      error_code: formData.get('ErrorCode'),
      error_message: formData.get('ErrorMessage'),
      timestamp: new Date().toISOString(),
      raw_data: Object.fromEntries(formData)
    };
    
    console.log(`Twilio webhook: ${event.status} event for ${event.recipient} (${event.message_id})`);
    
    // Map Twilio status to our event types
    const statusEventMap = {
      'sent': 'sent',
      'delivered': 'delivered', 
      'undelivered': 'failed',
      'failed': 'failed',
      'received': 'received' // For incoming messages
    };
    
    const eventType = `notification.sms.${statusEventMap[event.status] || event.status}`;
    
    const analyticsEvent = {
      type: 'sms',
      provider: 'twilio',
      event: statusEventMap[event.status] || event.status,
      recipient: event.recipient,
      message_id: event.message_id,
      timestamp: event.timestamp,
      error_code: event.error_code,
      error_message: event.error_message,
      raw_event: event
    };
    
    // Forward to plugins
    await PluginService.triggerEvent(tenant_id, eventType, analyticsEvent);
    
    console.log(`Twilio event forwarded: ${eventType} for ${event.recipient}`);
    
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('Twilio webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}