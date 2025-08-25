import { NotificationService } from '$lib/services/NotificationService.js';
import { jsonResponse, errorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { query } from '$lib/database.js';

// POST /api/notifications/send-to-user - Send notification to user by user_id
export async function POST({ request }) {
  try {
    const data = await request.json();
    const { 
      tenant_id = DEFAULT_TENANT_ID, 
      user_id,
      type = 'email',
      subject,
      content,
      template_id,
      variables = {},
      from_name
    } = data;
    
    // Validate required fields
    if (!user_id) {
      return errorResponse('user_id is required', 400);
    }
    
    if (!type || !['email', 'sms', 'push'].includes(type)) {
      return errorResponse('type must be one of: email, sms, push', 400);
    }
    
    // Look up user's email from the database
    console.log(`Looking up user: ${user_id} in tenant: ${tenant_id}`);
    
    const userResult = await query(`
      SELECT id, email, name 
      FROM users 
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1
    `, [user_id, tenant_id]);
    
    if (userResult.rows.length === 0) {
      return errorResponse('User not found', 404);
    }
    
    const user = userResult.rows[0];
    console.log(`Found user: ${user.name} (${user.email})`);
    
    let result;
    
    // Send notification based on type
    switch (type) {
      case 'email':
        if (!subject && !template_id) {
          return errorResponse('subject is required for email (unless using template)', 400);
        }
        
        if (!content && !template_id) {
          return errorResponse('content is required for email (unless using template)', 400);
        }
        
        result = await NotificationService.sendEmail(tenant_id, {
          recipient: user.email,
          subject,
          content,
          template_id,
          variables: {
            ...variables,
            // Add user info to template variables
            user_name: user.name,
            user_email: user.email,
            user_id: user.id
          },
          from_name: from_name || 'BetterCallSold'
        });
        break;
        
      case 'sms':
        // For SMS, we'd need a phone number field in users table
        return errorResponse('SMS notifications require phone number field in users table', 501);
        
      case 'push':
        // For push, we'd need a device_token field in users table
        return errorResponse('Push notifications require device_token field in users table', 501);
        
      default:
        return errorResponse(`Unsupported notification type: ${type}`, 400);
    }
    
    console.log(`${type} notification sent successfully to user ${user.name}:`, {
      message_id: result.message_id,
      provider: result.provider
    });
    
    return jsonResponse({
      success: true,
      message_id: result.message_id,
      provider: result.provider,
      recipient_user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      type,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Send to user API error:', error);
    return errorResponse(`Failed to send ${data.type || 'notification'}: ${error.message}`, 500);
  }
}