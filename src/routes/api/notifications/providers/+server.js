import { NotificationService } from '$lib/services/NotificationService.js';
import { jsonResponse, errorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// GET /api/notifications/providers - Get all providers for tenant
export async function GET({ url }) {
  try {
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    
    const providers = await NotificationService.getProviders(tenantId);
    
    return jsonResponse({
      providers,
      count: providers.length
    });
    
  } catch (error) {
    console.error('Get providers error:', error);
    return errorResponse('Failed to retrieve providers', 500);
  }
}

// POST /api/notifications/providers - Create or update provider
export async function POST({ request }) {
  try {
    const data = await request.json();
    const { tenant_id = DEFAULT_TENANT_ID, type, provider, config } = data;
    
    // Validate required fields
    if (!type || !provider || !config) {
      return errorResponse('type, provider, and config are required', 400);
    }
    
    // Validate type
    if (!['email', 'sms', 'push'].includes(type)) {
      return errorResponse('type must be one of: email, sms, push', 400);
    }
    
    // Validate provider for type
    const validProviders = {
      email: ['sendgrid'],
      sms: ['twilio'],
      push: ['firebase']
    };
    
    if (!validProviders[type].includes(provider)) {
      return errorResponse(`provider must be one of: ${validProviders[type].join(', ')} for type ${type}`, 400);
    }
    
    // Validate config based on provider
    const configValidation = validateProviderConfig(type, provider, config);
    if (!configValidation.valid) {
      return errorResponse(configValidation.error, 400);
    }
    
    console.log(`Setting ${type} provider ${provider} for tenant ${tenant_id}`);
    
    const providerId = await NotificationService.setProvider(tenant_id, type, provider, config);
    
    console.log(`Provider configuration saved with ID: ${providerId}`);
    
    return jsonResponse({
      success: true,
      provider_id: providerId,
      type,
      provider,
      message: `${type} provider ${provider} configured successfully`
    });
    
  } catch (error) {
    console.error('Set provider error:', error);
    return errorResponse(`Failed to configure provider: ${error.message}`, 500);
  }
}

// DELETE /api/notifications/providers - Delete provider
export async function DELETE({ url }) {
  try {
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    const type = url.searchParams.get('type');
    const provider = url.searchParams.get('provider');
    
    if (!type || !provider) {
      return errorResponse('type and provider parameters are required', 400);
    }
    
    console.log(`Deleting ${type} provider ${provider} for tenant ${tenantId}`);
    
    const deleted = await NotificationService.deleteProvider(tenantId, type, provider);
    
    if (!deleted) {
      return errorResponse('Provider not found', 404);
    }
    
    console.log(`Provider ${type}/${provider} deleted successfully`);
    
    return jsonResponse({
      success: true,
      message: `${type} provider ${provider} deleted successfully`
    });
    
  } catch (error) {
    console.error('Delete provider error:', error);
    return errorResponse(`Failed to delete provider: ${error.message}`, 500);
  }
}

// Helper function to validate provider configuration
function validateProviderConfig(type, provider, config) {
  switch (type) {
    case 'email':
      if (provider === 'sendgrid') {
        if (!config.api_key) {
          return { valid: false, error: 'SendGrid api_key is required' };
        }
        if (!config.from_email) {
          return { valid: false, error: 'SendGrid from_email is required' };
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(config.from_email)) {
          return { valid: false, error: 'from_email must be a valid email address' };
        }
      }
      break;
      
    case 'sms':
      if (provider === 'twilio') {
        if (!config.account_sid || !config.auth_token) {
          return { valid: false, error: 'Twilio account_sid and auth_token are required' };
        }
        if (!config.from_number) {
          return { valid: false, error: 'Twilio from_number is required' };
        }
        // Validate phone number format (basic check)
        if (!config.from_number.startsWith('+')) {
          return { valid: false, error: 'from_number must be in E.164 format (e.g., +1234567890)' };
        }
      }
      break;
      
    case 'push':
      if (provider === 'firebase') {
        if (!config.service_account) {
          return { valid: false, error: 'Firebase service_account object is required' };
        }
        const sa = config.service_account;
        if (!sa.type || !sa.project_id || !sa.private_key_id || !sa.private_key || !sa.client_email) {
          return { valid: false, error: 'Firebase service account is missing required fields' };
        }
      }
      break;
      
    default:
      return { valid: false, error: `Unsupported provider type: ${type}` };
  }
  
  return { valid: true };
}