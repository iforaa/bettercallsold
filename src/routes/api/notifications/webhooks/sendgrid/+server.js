import { PluginService } from '$lib/services/PluginService.js';
import { jsonResponse, errorResponse } from '$lib/response.js';

// POST /api/notifications/webhooks/sendgrid?tenant_id=xxx - SendGrid webhook
export async function POST({ request, url }) {
  try {
    const tenantId = url.searchParams.get('tenant_id');
    
    if (!tenantId) {
      console.error('SendGrid webhook: Missing tenant_id parameter');
      return errorResponse('tenant_id parameter is required', 400);
    }
    
    const events = await request.json();
    
    if (!Array.isArray(events)) {
      console.error('SendGrid webhook: Invalid payload format');
      return errorResponse('Invalid webhook payload format', 400);
    }
    
    console.log(`SendGrid webhook: Processing ${events.length} events for tenant ${tenantId}`);
    
    // Process each event and forward to plugins
    for (const event of events) {
      try {
        const eventType = `notification.email.${event.event}`;
        
        const analyticsEvent = {
          type: 'email',
          provider: 'sendgrid',
          event: event.event,
          recipient: event.email,
          message_id: event.sg_message_id,
          timestamp: new Date(event.timestamp * 1000).toISOString(),
          subject: event.subject || null,
          category: event.category || null,
          url: event.url || null, // For click events
          user_agent: event.useragent || null,
          ip: event.ip || null,
          raw_event: event
        };
        
        // Forward to plugins via existing PluginService
        await PluginService.triggerEvent(tenantId, eventType, analyticsEvent);
        
        console.log(`SendGrid event forwarded: ${eventType} for ${event.email}`);
        
      } catch (eventError) {
        console.error(`Error processing SendGrid event ${event.event}:`, eventError);
        // Continue processing other events even if one fails
      }
    }
    
    console.log(`SendGrid webhook: Successfully processed ${events.length} events`);
    
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('SendGrid webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}