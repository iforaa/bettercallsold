import { query } from '../database.js';
import { DEFAULT_TENANT_ID } from '../constants.js';
import { PluginService } from './PluginService.js';

export class NotificationService {
  
  /**
   * Send email via configured provider (SendGrid)
   */
  static async sendEmail(tenantId, emailData) {
    const { 
      recipient, 
      subject, 
      content, 
      template_id, 
      variables = {}, 
      from_email, 
      from_name,
      provider_type = 'sendgrid'
    } = emailData;
    
    // For now, always use environment variable (skip database lookup)
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }
    
    const provider = {
      config: {
        api_key: process.env.SENDGRID_API_KEY,
        from_email: from_email || 'noreply@bettercallsold.org',
        from_name: from_name || 'BetterCallSold'
      }
    };
    
    try {
      let result;
      
      switch (provider_type) {
        case 'sendgrid':
          result = await this.sendViaSendGrid(provider, {
            recipient,
            subject,
            content, 
            template_id,
            variables,
            from_email,
            from_name
          });
          break;
        default:
          throw new Error(`Unsupported email provider: ${provider_type}`);
      }
      
      return {
        success: true,
        message_id: result.message_id,
        provider: provider_type,
        recipient
      };
      
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
  
  /**
   * Send SMS via configured provider (Twilio)
   */
  static async sendSMS(tenantId, smsData) {
    const { 
      recipient, 
      message, 
      from_number, 
      provider_type = 'twilio' 
    } = smsData;
    
    const provider = await this.getProvider(tenantId, 'sms', provider_type);
    if (!provider) {
      throw new Error(`No ${provider_type} SMS provider configured`);
    }
    
    try {
      let result;
      
      switch (provider_type) {
        case 'twilio':
          result = await this.sendViaTwilio(provider, tenantId, {
            recipient,
            message,
            from_number
          });
          break;
        default:
          throw new Error(`Unsupported SMS provider: ${provider_type}`);
      }
      
      return {
        success: true,
        message_id: result.message_id,
        provider: provider_type,
        recipient
      };
      
    } catch (error) {
      console.error('SMS sending error:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }
  
  /**
   * Send push notification via configured provider (Firebase)
   */
  static async sendPush(tenantId, pushData) {
    const { 
      recipient, 
      title, 
      body, 
      data = {}, 
      provider_type = 'firebase' 
    } = pushData;
    
    const provider = await this.getProvider(tenantId, 'push', provider_type);
    if (!provider) {
      throw new Error(`No ${provider_type} push provider configured`);
    }
    
    try {
      let result;
      
      switch (provider_type) {
        case 'firebase':
          result = await this.sendViaFirebase(provider, tenantId, {
            recipient,
            title,
            body,
            data
          });
          break;
        default:
          throw new Error(`Unsupported push provider: ${provider_type}`);
      }
      
      return {
        success: true,
        message_id: result.message_id,
        provider: provider_type,
        recipient
      };
      
    } catch (error) {
      console.error('Push notification sending error:', error);
      throw new Error(`Failed to send push notification: ${error.message}`);
    }
  }
  
  /**
   * SendGrid implementation
   */
  static async sendViaSendGrid(provider, emailData) {
    const { recipient, subject, content, template_id, variables, from_email, from_name } = emailData;
    
    // Dynamic import to avoid bundling issues
    const sgMail = (await import('@sendgrid/mail')).default;
    
    // Use API key from provider config (which comes from environment variable)
    sgMail.setApiKey(provider.config.api_key);
    
    let msg;
    
    if (template_id) {
      // Dynamic template
      msg = {
        to: recipient,
        from: {
          email: from_email || provider.config.from_email,
          name: from_name || provider.config.from_name || 'BetterCallSold'
        },
        templateId: template_id,
        dynamicTemplateData: variables,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
          subscriptionTracking: { enable: false }
        }
      };
    } else {
      // Simple HTML/text email
      msg = {
        to: recipient,
        from: {
          email: from_email || provider.config.from_email,
          name: from_name || provider.config.from_name || 'BetterCallSold'
        },
        subject,
        html: content,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
          subscriptionTracking: { enable: false }
        }
      };
    }
    
    const [response] = await sgMail.send(msg);
    
    return {
      message_id: response.headers['x-message-id'],
      status: 'sent'
    };
  }
  
  /**
   * Twilio implementation
   */
  static async sendViaTwilio(provider, tenantId, smsData) {
    const { recipient, message, from_number } = smsData;
    
    // Dynamic import
    const twilio = (await import('twilio')).default;
    const client = twilio(provider.config.account_sid, provider.config.auth_token);
    
    const result = await client.messages.create({
      body: message,
      from: from_number || provider.config.from_number,
      to: recipient,
      // Webhook for analytics - includes tenant_id in URL
      statusCallback: `${process.env.ORIGIN || 'http://localhost:5173'}/api/notifications/webhooks/twilio/${tenantId}`
    });
    
    return {
      message_id: result.sid,
      status: result.status
    };
  }
  
  /**
   * Firebase implementation (prepared for future)
   */
  static async sendViaFirebase(provider, tenantId, pushData) {
    const { recipient, title, body, data } = pushData;
    
    // Dynamic import
    const admin = (await import('firebase-admin')).default;
    
    // Initialize Firebase app for this tenant if not exists
    const appName = `tenant-${tenantId}`;
    let app;
    
    try {
      app = admin.app(appName);
    } catch (error) {
      // App doesn't exist, create it
      app = admin.initializeApp({
        credential: admin.credential.cert(provider.config.service_account)
      }, appName);
    }
    
    const message = {
      token: recipient, // FCM device token
      notification: {
        title,
        body
      },
      data: {
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
        ...data
      },
      // Platform-specific configurations
      android: {
        notification: {
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            category: 'DEFAULT'
          }
        }
      }
    };
    
    const result = await admin.messaging(app).send(message);
    
    return {
      message_id: result,
      status: 'sent'
    };
  }
  
  /**
   * Get provider configuration for tenant
   */
  static async getProvider(tenantId, type, provider) {
    try {
      const result = await query(`
        SELECT * FROM notification_providers 
        WHERE tenant_id = $1 AND type = $2 AND provider = $3 AND status = 'active'
        LIMIT 1
      `, [tenantId, type, provider]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting notification provider:', error);
      return null;
    }
  }
  
  /**
   * Create or update provider configuration
   */
  static async setProvider(tenantId, type, provider, config) {
    try {
      const result = await query(`
        INSERT INTO notification_providers (tenant_id, type, provider, config)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, type, provider) 
        DO UPDATE SET config = $4, updated_at = NOW()
        RETURNING id
      `, [tenantId, type, provider, JSON.stringify(config)]);
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Error setting notification provider:', error);
      throw error;
    }
  }
  
  /**
   * List all providers for a tenant
   */
  static async getProviders(tenantId) {
    try {
      const result = await query(`
        SELECT id, type, provider, status, created_at, updated_at 
        FROM notification_providers 
        WHERE tenant_id = $1
        ORDER BY type, provider
      `, [tenantId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting notification providers:', error);
      return [];
    }
  }
  
  /**
   * Delete provider configuration
   */
  static async deleteProvider(tenantId, type, provider) {
    try {
      const result = await query(`
        DELETE FROM notification_providers 
        WHERE tenant_id = $1 AND type = $2 AND provider = $3
      `, [tenantId, type, provider]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting notification provider:', error);
      return false;
    }
  }
  
  /**
   * Test provider configuration
   */
  static async testProvider(tenantId, type, provider) {
    const providerConfig = await this.getProvider(tenantId, type, provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured for ${type}`);
    }
    
    try {
      switch (type) {
        case 'email':
          if (provider === 'sendgrid') {
            // Test SendGrid connection
            const sgClient = (await import('@sendgrid/client')).default;
            
            // Use provider config API key or fallback to environment variable
            const apiKey = providerConfig.config.api_key || process.env.SENDGRID_API_KEY;
            if (!apiKey) {
              throw new Error('SendGrid API key not found in provider config or environment variables');
            }
            
            sgClient.setApiKey(apiKey);
            
            const request = {
              url: '/v3/user/profile',
              method: 'GET'
            };
            
            await sgClient.request(request);
            return { success: true, message: 'SendGrid connection successful' };
          }
          break;
          
        case 'sms':
          if (provider === 'twilio') {
            // Test Twilio connection
            const twilio = (await import('twilio')).default;
            const client = twilio(providerConfig.config.account_sid, providerConfig.config.auth_token);
            
            await client.api.accounts(providerConfig.config.account_sid).fetch();
            return { success: true, message: 'Twilio connection successful' };
          }
          break;
          
        case 'push':
          if (provider === 'firebase') {
            // Test Firebase connection
            const admin = (await import('firebase-admin')).default;
            const credential = admin.credential.cert(providerConfig.config.service_account);
            
            // Just verify credentials are valid
            return { success: true, message: 'Firebase credentials valid' };
          }
          break;
          
        default:
          throw new Error(`Unsupported provider type: ${type}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}