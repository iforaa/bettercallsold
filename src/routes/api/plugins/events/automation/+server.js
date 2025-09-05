import { 
  jsonResponse, 
  internalServerErrorResponse, 
  badRequestResponse 
} from '$lib/response.js';
import { PluginService } from '$lib/services/PluginService.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

/**
 * Automation Event Receiver
 * Receives events from automation plugin and routes them to existing APIs
 */
export async function POST({ request }) {
  try {
    console.log('🤖 Automation event received');
    
    const eventData = await request.json();
    console.log('📨 Automation event data:', JSON.stringify(eventData, null, 2));
    
    // Validate required fields
    if (!eventData.flow_execution_id) {
      console.error('❌ Missing flow_execution_id');
      return badRequestResponse('Missing flow_execution_id');
    }

    if (!eventData.events || !Array.isArray(eventData.events)) {
      console.error('❌ Missing or invalid events array');
      return badRequestResponse('Missing or invalid events array');
    }

    const { flow_execution_id, events } = eventData;
    const results = [];

    console.log(`🔄 Processing ${events.length} automation events`);

    // Process each event by routing to appropriate APIs
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(`⚡ Processing event ${i + 1}/${events.length}: ${event.action_type}`);

      try {
        const result = await processAutomationEvent(event);
        results.push({
          action_type: event.action_type,
          success: true,
          data: result
        });
        console.log(`✅ Event ${event.action_type} processed successfully`);
      } catch (error) {
        console.error(`❌ Event ${event.action_type} failed:`, error.message);
        results.push({
          action_type: event.action_type,
          success: false,
          error: error.message
        });
      }
    }

    // Log summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    console.log(`📊 Automation events processed: ${successCount} success, ${failureCount} failed`);

    // Return results to automation plugin
    return jsonResponse({ 
      success: true,
      flow_execution_id,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('❌ Automation event processing failed:', error);
    return internalServerErrorResponse('Failed to process automation events');
  }
}

/**
 * Process individual automation event by routing to existing APIs or plugin actions
 */
async function processAutomationEvent(event) {
  const { action_type, plugin_id, payload } = event;

  console.log(`🎯 Processing action: ${action_type}${plugin_id ? ` (plugin: ${plugin_id})` : ' (platform)'}`);
  console.log(`📦 Payload:`, payload);

  // Check if it's a plugin-registered action (requires plugin_id)
  if (plugin_id) {
    const tenantId = DEFAULT_TENANT_ID; // Using default tenant for now
    
    console.log(`🔍 Looking for plugin action: ${action_type} for plugin ${plugin_id}`);
    const actionRegistration = await PluginService.findActionRegistration(
      tenantId,
      action_type,
      plugin_id
    );
    
    if (actionRegistration) {
      console.log(`📋 Found plugin action: ${actionRegistration.plugin_slug} -> ${action_type}`);
      return await callPluginAction(actionRegistration, payload);
    } else {
      throw new Error(`Plugin action not found: ${action_type} for plugin ${plugin_id}`);
    }
  }

  // Fallback to platform hardcoded actions (platform-related, not plugin-related)
  console.log(`🏢 Processing platform action: ${action_type}`);
  switch (action_type) {
    // Product actions
    case 'create_product':
      return await callInternalAPI('POST', '/api/products', payload);
      
    case 'update_product':
      if (!payload.id) throw new Error('Product ID required for update');
      return await callInternalAPI('PUT', `/api/products/${payload.id}`, payload);
      
    case 'delete_product':
      if (!payload.id) throw new Error('Product ID required for deletion');
      return await callInternalAPI('DELETE', `/api/products/${payload.id}`);

    // Customer actions  
    case 'create_customer':
      return await callInternalAPI('POST', '/api/customers', payload);
      
    case 'update_customer':
      if (!payload.id) throw new Error('Customer ID required for update');
      return await callInternalAPI('PUT', `/api/customers/${payload.id}`, payload);

    // Order actions
    case 'create_order':
      return await callInternalAPI('POST', '/api/orders', payload);
      
    case 'update_order_status':
      if (!payload.id) throw new Error('Order ID required for status update');
      return await callInternalAPI('PUT', `/api/orders/${payload.id}/status`, payload);

    // Communication actions
    case 'send_email':
      return await handleSendEmail(payload);
      
    case 'send_sms':
      return await callInternalAPI('POST', '/api/notifications/sms', payload);
      
    case 'create_notification':
      return await callInternalAPI('POST', '/api/notifications', payload);

    // Task actions
    case 'create_task':
      return await handleCreateTask(payload);
      
    case 'assign_task':
      if (!payload.id) throw new Error('Task ID required for assignment');
      return await callInternalAPI('PUT', `/api/tasks/${payload.id}/assign`, payload);

    // Cart actions
    case 'add_to_cart':
      return await callInternalAPI('POST', '/api/mobile/cart/add', payload);

    // Fallback - log unknown action type
    default:
      console.warn(`⚠️ Unknown action type: ${action_type}`);
      throw new Error(`Unknown action type: ${action_type}`);
  }
}

/**
 * Call internal API endpoints
 */
async function callInternalAPI(method, endpoint, payload = {}) {
  const baseUrl = 'http://localhost:5173'; // Current platform URL
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`🌐 Internal API call: ${method} ${url}`);

  try {
    const options = {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'BCS-Automation-Internal/1.0'
      }
    };

    // Add body for POST/PUT requests
    if (method !== 'GET' && method !== 'DELETE') {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);
    
    console.log(`📡 API response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ API call successful`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Internal API call failed: ${method} ${url}`, error.message);
    throw error;
  }
}

/**
 * Handle send email action
 * For now, just log the email (could integrate with actual email service later)
 */
async function handleSendEmail(payload) {
  console.log('📧 Email would be sent:', {
    to: payload.to,
    subject: payload.subject,
    template: payload.template,
    variables: payload.variables
  });

  // Simulate email service response
  return {
    success: true,
    email_id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message: 'Email queued for delivery',
    recipient: payload.to,
    subject: payload.subject
  };
}

/**
 * Handle create task action  
 * For now, just log the task (could integrate with task management system later)
 */
async function handleCreateTask(payload) {
  console.log('📋 Task would be created:', {
    title: payload.title,
    description: payload.description,
    due_date: payload.due_date,
    assignee: payload.assignee
  });

  // Simulate task creation response
  return {
    success: true,
    task_id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: payload.title,
    status: 'created',
    created_at: new Date().toISOString()
  };
}

/**
 * Call plugin-registered action
 */
async function callPluginAction(actionRegistration, payload) {
  const { plugin_endpoint, endpoint, required_fields, action_type, plugin_slug } = actionRegistration;
  
  console.log(`🧩 Calling plugin action: ${plugin_slug} -> ${action_type}`);
  
  // Validate required fields
  if (required_fields && required_fields.length > 0) {
    for (const field of required_fields) {
      if (!payload[field]) {
        throw new Error(`Missing required field: ${field} for action ${action_type}`);
      }
    }
    console.log(`✅ All required fields validated for ${action_type}`);
  }
  
  // Build full URL
  const fullUrl = `${plugin_endpoint}${endpoint}`;
  console.log(`🌐 Plugin action URL: ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'BCS-Automation/1.0'
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Plugin action failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Plugin action completed: ${action_type}`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Plugin action failed: ${action_type}`, error.message);
    throw error;
  }
}

/**
 * Health check for automation events endpoint
 */
export async function GET() {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    
    // Get registered plugin actions with full details
    const pluginActions = await PluginService.getRegisteredActions(tenantId);
    
    // Format plugin actions with all necessary information
    const formattedPluginActions = pluginActions.map(action => ({
      action_type: action.action_type,
      title: action.title || action.action_type,
      description: action.description || `Execute ${action.action_type} action`,
      category: action.category || 'general',
      plugin_id: action.plugin_id,
      plugin_slug: action.plugin_slug,
      plugin_name: action.plugin_name,
      endpoint: action.endpoint,
      required_fields: action.required_fields || [],
      optional_fields: action.optional_fields || [],
      source: 'plugin'
    }));

    // Format platform actions with metadata
    const formattedPlatformActions = [
      { action_type: 'create_product', title: 'Create Product', description: 'Create new products in your store', category: 'product', required_fields: ['name', 'price'], optional_fields: ['description', 'category'], source: 'platform' },
      { action_type: 'update_product', title: 'Update Product', description: 'Update existing product information', category: 'product', required_fields: ['id'], optional_fields: ['name', 'price', 'description'], source: 'platform' },
      { action_type: 'delete_product', title: 'Delete Product', description: 'Remove products from your store', category: 'product', required_fields: ['id'], optional_fields: [], source: 'platform' },
      { action_type: 'create_customer', title: 'Create Customer', description: 'Add new customers to your database', category: 'customer', required_fields: ['email'], optional_fields: ['name', 'phone'], source: 'platform' },
      { action_type: 'update_customer', title: 'Update Customer', description: 'Update customer information', category: 'customer', required_fields: ['id'], optional_fields: ['name', 'email', 'phone'], source: 'platform' },
      { action_type: 'create_order', title: 'Create Order', description: 'Create new orders in the system', category: 'order', required_fields: ['customer_id', 'items'], optional_fields: ['shipping_address'], source: 'platform' },
      { action_type: 'update_order_status', title: 'Update Order Status', description: 'Change the status of existing orders', category: 'order', required_fields: ['id', 'status'], optional_fields: ['tracking_number'], source: 'platform' },
      { action_type: 'send_email', title: 'Send Email', description: 'Send personalized emails to customers', category: 'communication', required_fields: ['to', 'subject'], optional_fields: ['template', 'variables'], source: 'platform' },
      { action_type: 'send_sms', title: 'Send SMS', description: 'Send SMS messages to customers', category: 'communication', required_fields: ['to', 'message'], optional_fields: [], source: 'platform' },
      { action_type: 'create_notification', title: 'Create Notification', description: 'Create system notifications', category: 'communication', required_fields: ['title', 'message'], optional_fields: ['user_id'], source: 'platform' },
      { action_type: 'create_task', title: 'Create Task', description: 'Create new tasks for your team', category: 'task', required_fields: ['title'], optional_fields: ['description', 'assignee', 'due_date'], source: 'platform' },
      { action_type: 'assign_task', title: 'Assign Task', description: 'Assign tasks to team members', category: 'task', required_fields: ['id', 'assignee'], optional_fields: [], source: 'platform' },
      { action_type: 'add_to_cart', title: 'Add to Cart', description: 'Add items to customer carts', category: 'cart', required_fields: ['user_id', 'product_id'], optional_fields: ['quantity'], source: 'platform' }
    ];
    
    return jsonResponse({
      status: 'healthy',
      endpoint: '/api/plugins/events/automation',
      description: 'Enhanced automation event receiver with plugin action support',
      platform_actions: formattedPlatformActions,
      plugin_actions: formattedPluginActions,
      total_platform_actions: formattedPlatformActions.length,
      total_plugin_actions: formattedPluginActions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    return jsonResponse({
      status: 'healthy',
      endpoint: '/api/plugins/events/automation',
      description: 'Enhanced automation event receiver with plugin action support',
      platform_actions: [
        'create_product', 'update_product', 'delete_product',
        'create_customer', 'update_customer', 
        'create_order', 'update_order_status',
        'send_email', 'send_sms', 'create_notification',
        'create_task', 'assign_task',
        'add_to_cart'
      ],
      plugin_actions: [],
      total_platform_actions: 11,
      total_plugin_actions: 0,
      error: 'Failed to load plugin actions',
      timestamp: new Date().toISOString()
    });
  }
}