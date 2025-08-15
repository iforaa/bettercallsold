import { query } from '../database.js';
import { 
  DEFAULT_TENANT_ID, 
  QUERIES, 
  PLUGIN_EVENTS, 
  PLUGIN_STATUS, 
  EVENT_STATUS 
} from '../constants.js';

export class PluginService {
  
  /**
   * Register a new external plugin
   */
  static async registerPlugin(tenantId, pluginData) {
    try {
      const { name, slug, api_endpoint, webhook_url, events = [], config = {}, metadata = {} } = pluginData;
      
      if (!name || !slug) {
        throw new Error('Plugin name and slug are required');
      }

      // Check if plugin already exists
      const existing = await this.getPluginBySlug(tenantId, slug);
      if (existing) {
        throw new Error(`Plugin with slug '${slug}' already exists`);
      }

      const result = await query(QUERIES.CREATE_PLUGIN, [
        tenantId,
        name,
        slug,
        api_endpoint || null,
        webhook_url || null,
        events,
        JSON.stringify(config),
        JSON.stringify(metadata)
      ]);

      // Activate the plugin automatically if webhook_url is provided
      if (webhook_url) {
        await this.updatePluginStatus(tenantId, slug, PLUGIN_STATUS.ACTIVE);
      }

      console.log(`✅ Plugin registered: ${name} (${slug})`);
      return { id: result.rows[0].id, slug, created_at: result.rows[0].created_at };
    } catch (error) {
      console.error('Error registering plugin:', error);
      throw error;
    }
  }

  /**
   * Update plugin configuration
   */
  static async updatePlugin(tenantId, slug, updates) {
    try {
      const { name, api_endpoint, webhook_url, events, config, metadata, status } = updates;
      
      const result = await query(QUERIES.UPDATE_PLUGIN, [
        tenantId,
        slug,
        name,
        api_endpoint,
        webhook_url,
        events || [],
        JSON.stringify(config || {}),
        JSON.stringify(metadata || {}),
        status || PLUGIN_STATUS.INACTIVE
      ]);

      if (result.rowCount === 0) {
        throw new Error(`Plugin with slug '${slug}' not found`);
      }

      console.log(`✅ Plugin updated: ${slug}`);
      return { id: result.rows[0].id, updated_at: result.rows[0].updated_at };
    } catch (error) {
      console.error('Error updating plugin:', error);
      throw error;
    }
  }

  /**
   * Get all plugins for a tenant
   */
  static async getPlugins(tenantId) {
    try {
      const result = await query(QUERIES.GET_PLUGINS, [tenantId]);
      return result.rows.map(row => ({
        ...row,
        config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }));
    } catch (error) {
      console.error('Error getting plugins:', error);
      return [];
    }
  }

  /**
   * Get single plugin by slug
   */
  static async getPluginBySlug(tenantId, slug) {
    try {
      const result = await query(QUERIES.GET_PLUGIN_BY_SLUG, [tenantId, slug]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const plugin = result.rows[0];
      return {
        ...plugin,
        config: typeof plugin.config === 'string' ? JSON.parse(plugin.config) : plugin.config,
        metadata: typeof plugin.metadata === 'string' ? JSON.parse(plugin.metadata) : plugin.metadata
      };
    } catch (error) {
      console.error('Error getting plugin by slug:', error);
      return null;
    }
  }

  /**
   * Delete plugin
   */
  static async deletePlugin(tenantId, slug) {
    try {
      const result = await query(QUERIES.DELETE_PLUGIN, [tenantId, slug]);
      
      if (result.rowCount === 0) {
        throw new Error(`Plugin with slug '${slug}' not found`);
      }

      console.log(`✅ Plugin deleted: ${slug}`);
      return true;
    } catch (error) {
      console.error('Error deleting plugin:', error);
      throw error;
    }
  }

  /**
   * Update plugin status (active, inactive, error)
   */
  static async updatePluginStatus(tenantId, slug, status) {
    try {
      const result = await query(QUERIES.UPDATE_PLUGIN_STATUS, [tenantId, slug, status]);
      
      if (result.rowCount === 0) {
        throw new Error(`Plugin with slug '${slug}' not found`);
      }

      console.log(`✅ Plugin status updated: ${slug} -> ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating plugin status:', error);
      throw error;
    }
  }

  /**
   * Trigger an event to all relevant plugins
   */
  static async triggerEvent(tenantId, eventType, payload) {
    try {
      // Get all active plugins that subscribe to this event
      const plugins = await this.getPlugins(tenantId);
      const subscribedPlugins = plugins.filter(plugin => 
        plugin.status === PLUGIN_STATUS.ACTIVE && 
        plugin.events.includes(eventType) &&
        plugin.webhook_url
      );

      if (subscribedPlugins.length === 0) {
        console.log(`No plugins subscribed to event: ${eventType}`);
        return [];
      }

      const eventResults = [];

      // Create event records for each subscribed plugin
      for (const plugin of subscribedPlugins) {
        try {
          const eventData = {
            event: eventType,
            tenant_id: tenantId,
            timestamp: new Date().toISOString(),
            data: payload
          };

          const result = await query(QUERIES.CREATE_PLUGIN_EVENT, [
            plugin.id,
            tenantId,
            eventType,
            JSON.stringify(eventData)
          ]);

          eventResults.push({
            plugin_id: plugin.id,
            plugin_slug: plugin.slug,
            event_id: result.rows[0].id,
            status: 'created'
          });

          console.log(`📤 Event created for plugin: ${plugin.slug} -> ${eventType}`);
        } catch (error) {
          console.error(`Error creating event for plugin ${plugin.slug}:`, error);
          eventResults.push({
            plugin_id: plugin.id,
            plugin_slug: plugin.slug,
            error: error.message,
            status: 'error'
          });
        }
      }

      // Process webhooks asynchronously
      this.processWebhooks().catch(error => {
        console.error('Error processing webhooks:', error);
      });

      return eventResults;
    } catch (error) {
      console.error('Error triggering event:', error);
      throw error;
    }
  }

  /**
   * Process pending webhook events
   */
  static async processWebhooks(limit = 10) {
    try {
      const result = await query(QUERIES.GET_PENDING_EVENTS, [limit]);
      const pendingEvents = result.rows;

      if (pendingEvents.length === 0) {
        return;
      }

      console.log(`🔄 Processing ${pendingEvents.length} pending webhook events`);

      for (const event of pendingEvents) {
        await this.sendWebhook(event);
      }
    } catch (error) {
      console.error('Error processing webhooks:', error);
    }
  }

  /**
   * Send a single webhook event
   */
  static async sendWebhook(event) {
    try {
      if (!event.webhook_url) {
        throw new Error('No webhook URL configured');
      }

      const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
      
      console.log(`📤 Sending webhook to ${event.plugin_slug}: ${event.webhook_url}`);
      
      const response = await fetch(event.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BetterCallSold-Webhook/1.0'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseData = response.ok ? await response.text() : null;
      
      await query(QUERIES.UPDATE_EVENT_STATUS, [
        event.id,
        response.ok ? EVENT_STATUS.SENT : EVENT_STATUS.FAILED,
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          data: responseData
        }),
        response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      ]);

      console.log(`✅ Webhook sent successfully to ${event.plugin_slug}`);
      
    } catch (error) {
      console.error(`❌ Webhook failed for ${event.plugin_slug}:`, error.message);
      
      // Increment retry count
      await query(QUERIES.INCREMENT_EVENT_RETRY, [event.id]);
      
      // Mark as failed if too many retries
      if (event.retry_count >= 2) {
        await query(QUERIES.UPDATE_EVENT_STATUS, [
          event.id,
          EVENT_STATUS.FAILED,
          JSON.stringify({}),
          `Max retries exceeded: ${error.message}`
        ]);
      }
    }
  }

  /**
   * Get plugin events (for monitoring/debugging)
   */
  static async getPluginEvents(tenantId, limit = 50) {
    try {
      const result = await query(QUERIES.GET_PLUGIN_EVENTS, [tenantId, limit]);
      return result.rows.map(row => ({
        ...row,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
        response: typeof row.response === 'string' ? JSON.parse(row.response) : row.response
      }));
    } catch (error) {
      console.error('Error getting plugin events:', error);
      return [];
    }
  }

  /**
   * Test plugin connectivity
   */
  static async testPlugin(tenantId, slug) {
    try {
      const plugin = await this.getPluginBySlug(tenantId, slug);
      
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      if (!plugin.webhook_url) {
        throw new Error('No webhook URL configured');
      }

      // Send test event
      const testPayload = {
        event: 'test.connection',
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test event from BetterCallSold',
          plugin_slug: slug
        }
      };

      const response = await fetch(plugin.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BetterCallSold-Test/1.0'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(5000) // 5 second timeout for tests
      });

      const responseData = response.ok ? await response.text() : await response.text();

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: responseData,
        webhook_url: plugin.webhook_url
      };

    } catch (error) {
      console.error('Error testing plugin:', error);
      return {
        success: false,
        error: error.message,
        webhook_url: null
      };
    }
  }
}