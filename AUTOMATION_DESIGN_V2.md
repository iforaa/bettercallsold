# BetterCallSold Automation System - Centralized Architecture 🎯
*Refined design with SaaS platform as central event orchestrator*

## 🏗️ **Updated Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Email Plugin   │    │   CRM Plugin    │    │  Other Plugins  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ webhook              │ webhook              │ webhook
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SaaS Platform (Event Hub)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Event Bus     │  │ Plugin Manager  │  │ Event Router    │ │
│  │  (All Events)   │  │ (Capabilities)  │  │ (Distribution)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────┬───────────────────────┬───────────────────┘
                      │ webhook               │ webhook
                      ▼                       ▼
          ┌─────────────────┐     ┌─────────────────┐
          │ Automation      │     │ Other Platform  │
          │ Plugin          │     │ Subscribers     │
          │ (Flow Engine)   │     │                 │
          └─────────────────┘     └─────────────────┘
```

## 🔄 **Event Flow Architecture**

### **1. Centralized Event Flow**
All events flow through the SaaS platform - no direct plugin communication:

```
Plugin Event → SaaS Platform → Automation Plugin → SaaS Platform → Target Plugin
```

### **2. Detailed Event Flow**

#### **Step 1: Plugin Creates Platform Event**
```javascript
// Email Plugin sends webhook to SaaS Platform
POST /api/webhooks/plugin-events
{
  "plugin_id": "email-marketing-plugin",
  "event_type": "customer.created",
  "payload": {
    "customer_id": "cust_123",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

#### **Step 2: Platform Routes to Automation Plugin**
```javascript
// SaaS Platform sends to Automation Plugin
POST /plugins/automation/webhook  
{
  "event_type": "customer.created",
  "payload": { /* customer data */ },
  "source_plugin": "platform",
  "tenant_id": "tenant_123"
}
```

#### **Step 3: Automation Creates Action Event**
```javascript
// Automation Plugin processes flow and creates new event
const automationEvent = {
  "event_type": "EmailMarketing.SendEmail",
  "payload": {
    "recipient": "john@example.com",
    "template": "welcome_email",
    "variables": {
      "customer_name": "John Doe"
    }
  },
  "flow_execution_id": "exec_456",
  "source_plugin": "automation"
};

// Sends back to SaaS Platform
POST /api/webhooks/automation-events
```

#### **Step 4: Platform Routes to Target Plugin**
```javascript
// SaaS Platform routes to Email Marketing Plugin
POST /plugins/email-marketing/webhook
{
  "action_type": "SendEmail",
  "payload": { /* email data */ },
  "source": "automation",
  "execution_id": "exec_456"
}
```

## 📊 **Updated Database Schema**

### **Enhanced Plugins Table**
```sql
-- Add capability columns to existing plugins table
ALTER TABLE plugins ADD COLUMN capabilities JSONB;
ALTER TABLE plugins ADD COLUMN available_actions JSONB;
ALTER TABLE plugins ADD COLUMN available_triggers JSONB;
ALTER TABLE plugins ADD COLUMN event_subscriptions TEXT[];
ALTER TABLE plugins ADD COLUMN capability_version VARCHAR(50);
ALTER TABLE plugins ADD COLUMN last_capability_sync TIMESTAMP;

-- Example data
UPDATE plugins SET 
  capabilities = '{
    "actions": [
      {
        "id": "SendEmail",
        "name": "Send Email",
        "description": "Send an email to a recipient",
        "required_fields": ["recipient", "template"],
        "optional_fields": ["variables", "schedule_time"]
      },
      {
        "id": "CreateList", 
        "name": "Create Email List",
        "description": "Create a new email list",
        "required_fields": ["list_name"],
        "optional_fields": ["description", "tags"]
      }
    ],
    "triggers": [
      {
        "id": "EmailSent",
        "name": "Email Sent",
        "description": "Triggered when email is successfully sent",
        "output_fields": ["email_id", "recipient", "sent_at"]
      }
    ]
  }',
  available_actions = '["SendEmail", "CreateList", "UpdateSubscriber"]',
  available_triggers = '["EmailSent", "EmailOpened", "EmailClicked"]',
  event_subscriptions = '{"customer.created", "order.completed"}',
  capability_version = '1.0.0'
WHERE slug = 'email-marketing';
```

### **Automation-Specific Tables**
```sql
-- Automation flows (updated)
CREATE TABLE automation_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    
    -- Flow definition with plugin actions
    trigger_event VARCHAR(100) NOT NULL, -- e.g., "customer.created"
    flow_steps JSONB NOT NULL, -- Array of steps with plugin actions
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    
    INDEX idx_automation_flows_trigger (tenant_id, trigger_event, status)
);

-- Flow executions (enhanced tracking)
CREATE TABLE flow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID REFERENCES automation_flows(id),
    tenant_id UUID NOT NULL,
    
    -- Execution state
    status VARCHAR(50) DEFAULT 'running',
    current_step INTEGER DEFAULT 0,
    
    -- Trigger information
    trigger_event_type VARCHAR(100),
    trigger_data JSONB,
    trigger_plugin_id UUID,
    
    -- Generated events tracking
    generated_events JSONB[], -- Events created by this execution
    
    -- Execution log
    execution_log JSONB, -- Step-by-step execution log
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    INDEX idx_flow_executions_status (tenant_id, status)
);

-- Plugin capability cache (new)
CREATE TABLE plugin_capabilities_cache (
    plugin_id UUID REFERENCES plugins(id) PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- Capability data
    capabilities JSONB NOT NULL,
    actions JSONB NOT NULL, -- Quick lookup for available actions
    triggers JSONB NOT NULL, -- Quick lookup for available triggers
    
    -- Sync metadata
    last_synced TIMESTAMP DEFAULT NOW(),
    sync_version VARCHAR(50),
    sync_status VARCHAR(50) DEFAULT 'synced', -- synced, failed, pending
    
    INDEX idx_plugin_capabilities_tenant (tenant_id)
);
```

## 🔌 **Plugin Capability Registration**

### **1. Plugin Registration Endpoint**
```javascript
// New endpoint in SaaS Platform
POST /api/admin/plugins/register-capabilities
{
  "plugin_id": "email-marketing-plugin",
  "capabilities": {
    "version": "1.0.0",
    "actions": [
      {
        "id": "SendEmail",
        "name": "Send Email", 
        "description": "Send an email to a recipient",
        "event_type": "EmailMarketing.SendEmail", // Event type automation creates
        "required_fields": ["recipient", "template"],
        "optional_fields": ["variables", "schedule_time"],
        "output_fields": ["email_id", "status"]
      }
    ],
    "triggers": [
      {
        "id": "EmailSent",
        "name": "Email Sent",
        "event_type": "EmailMarketing.EmailSent", // Event type plugin creates  
        "output_fields": ["email_id", "recipient", "sent_at"]
      }
    ]
  }
}
```

### **2. Automatic Capability Discovery**
```javascript
// SaaS Platform service to sync plugin capabilities
class PluginCapabilityService {
  
  async syncAllPluginCapabilities() {
    const plugins = await query('SELECT * FROM plugins WHERE status = $1', ['active']);
    
    for (const plugin of plugins) {
      try {
        await this.syncPluginCapabilities(plugin);
      } catch (error) {
        console.error(`Failed to sync capabilities for ${plugin.slug}:`, error);
      }
    }
  }

  async syncPluginCapabilities(plugin) {
    // Request capabilities from plugin
    const response = await fetch(`${plugin.webhook_url}/api/capabilities`);
    const capabilities = await response.json();
    
    // Update database
    await query(
      'UPDATE plugins SET capabilities = $1, last_capability_sync = NOW() WHERE id = $2',
      [capabilities, plugin.id]
    );
    
    // Update cache table
    await query(`
      INSERT INTO plugin_capabilities_cache 
      (plugin_id, tenant_id, capabilities, actions, triggers) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (plugin_id) DO UPDATE SET
        capabilities = $3,
        actions = $4,
        triggers = $5,
        last_synced = NOW()
    `, [
      plugin.id,
      plugin.tenant_id,
      capabilities,
      capabilities.actions || [],
      capabilities.triggers || []
    ]);
  }
}
```

## 🤖 **Automation Plugin Implementation**

### **1. Event Subscription & Processing**
```javascript
// Automation Plugin - Event Handler
class AutomationEventHandler {
  
  constructor() {
    // Subscribe to ALL platform events
    this.subscribedEvents = ['*']; // Or specific events
  }

  async handleIncomingEvent(eventType, payload, metadata) {
    console.log(`🎯 Automation received: ${eventType}`);
    
    // 1. Find flows triggered by this event
    const triggeredFlows = await this.findFlowsByTrigger(eventType);
    
    // 2. Execute each flow
    for (const flow of triggeredFlows) {
      this.executeFlow(flow, { eventType, payload, metadata })
        .catch(err => this.handleFlowError(flow, err));
    }
  }

  async executeFlow(flow, triggerData) {
    const execution = await this.createExecution(flow, triggerData);
    
    try {
      // Process each step in the flow
      for (const step of flow.flow_steps) {
        const result = await this.executeStep(step, execution);
        
        if (step.type === 'action') {
          // Create event for target plugin
          await this.createAutomationEvent(step, result, execution);
        }
      }
      
      await this.completeExecution(execution.id);
    } catch (error) {
      await this.failExecution(execution.id, error);
    }
  }

  async createAutomationEvent(step, stepResult, execution) {
    const targetPlugin = await this.getPluginCapabilities(step.plugin_id);
    const action = targetPlugin.actions.find(a => a.id === step.action_id);
    
    const automationEvent = {
      event_type: action.event_type, // e.g., "EmailMarketing.SendEmail"
      payload: this.buildActionPayload(step, stepResult),
      flow_execution_id: execution.id,
      source_plugin: 'automation',
      target_plugin: step.plugin_id
    };

    // Send event back to SaaS Platform
    await fetch(`${this.platformUrl}/api/webhooks/automation-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(automationEvent)
    });

    // Track generated event
    await this.trackGeneratedEvent(execution.id, automationEvent);
  }
}
```

### **2. Plugin Capability Access**
```javascript
// Automation Plugin - Capability Service
class AutomationCapabilityService {
  
  async getAvailablePlugins() {
    // Get capabilities from platform
    const response = await fetch(`${this.platformUrl}/api/automation/plugin-capabilities`);
    return await response.json();
  }

  async getPluginActions(pluginId) {
    const plugins = await this.getAvailablePlugins();
    const plugin = plugins.find(p => p.id === pluginId);
    return plugin?.capabilities?.actions || [];
  }

  async validateFlowStep(step) {
    if (step.type === 'action') {
      const actions = await this.getPluginActions(step.plugin_id);
      const action = actions.find(a => a.id === step.action_id);
      
      if (!action) {
        throw new Error(`Action ${step.action_id} not found for plugin ${step.plugin_id}`);
      }
      
      // Validate required fields
      this.validateRequiredFields(step.config, action.required_fields);
    }
  }
}
```

## 🔄 **SaaS Platform Event Router**

### **Enhanced Event Router**
```javascript
// SaaS Platform - Enhanced Event Router
class EnhancedEventRouter {
  
  async handlePluginEvent(eventData) {
    // 1. Log event
    await this.logEvent(eventData);
    
    // 2. Route to automation plugin (always)
    if (this.hasAutomationPlugin()) {
      await this.routeToAutomation(eventData);
    }
    
    // 3. Route to other subscribers
    await this.routeToSubscribers(eventData);
  }

  async handleAutomationEvent(eventData) {
    // Special handling for automation-generated events
    console.log(`🤖 Automation event: ${eventData.event_type}`);
    
    // 1. Log automation event
    await this.logAutomationEvent(eventData);
    
    // 2. Parse target plugin from event type
    const targetPlugin = this.parseTargetPlugin(eventData.event_type);
    
    // 3. Route to target plugin
    if (targetPlugin) {
      await this.routeToTargetPlugin(targetPlugin, eventData);
    }
  }

  parseTargetPlugin(eventType) {
    // "EmailMarketing.SendEmail" → "email-marketing"
    const parts = eventType.split('.');
    if (parts.length >= 2) {
      return this.findPluginByCapabilityPrefix(parts[0]);
    }
    return null;
  }

  async routeToTargetPlugin(plugin, eventData) {
    try {
      const response = await fetch(`${plugin.webhook_url}/api/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: eventData.event_type.split('.')[1], // "SendEmail"
          payload: eventData.payload,
          source: 'automation',
          execution_id: eventData.flow_execution_id
        })
      });

      if (!response.ok) {
        throw new Error(`Plugin ${plugin.slug} returned ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to route to ${plugin.slug}:`, error);
      // Notify automation of failure
      await this.notifyAutomationOfFailure(eventData, error);
    }
  }
}
```

## 📱 **API Endpoints Summary**

### **New SaaS Platform Endpoints**
```javascript
// Plugin capability management
GET  /api/automation/plugin-capabilities     // Get all plugin capabilities
POST /api/admin/plugins/register-capabilities // Register plugin capabilities
POST /api/admin/plugins/sync-capabilities   // Sync all plugin capabilities

// Automation event handling  
POST /api/webhooks/automation-events        // Receive events from automation
GET  /api/automation/flow-executions        // Monitor flow executions
POST /api/automation/test-flow              // Test flow with sample data
```

### **Enhanced Plugin Endpoints**
```javascript
// All plugins should implement
GET  /api/capabilities                      // Return plugin capabilities
POST /api/actions                          // Execute actions from automation
GET  /api/health                           // Health check for capability sync
```

## 🎯 **Key Benefits of This Architecture**

### **1. Complete Centralization**
- ✅ All events flow through SaaS platform
- ✅ No direct plugin-to-plugin communication
- ✅ Platform maintains complete control and visibility

### **2. Dynamic Capability Discovery**
- ✅ Plugins register their capabilities
- ✅ Automation plugin knows what others can do
- ✅ Real-time capability updates

### **3. Event Traceability** 
- ✅ Complete audit trail of all events
- ✅ Flow execution tracking
- ✅ Easy debugging and monitoring

### **4. Scalable & Flexible**
- ✅ New plugins auto-discovered
- ✅ Capability changes don't break flows
- ✅ Platform can add routing logic

This refined architecture gives you complete control over plugin communication while enabling powerful automation capabilities! 🚀

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Redesign automation architecture with centralized event flow", "status": "completed", "id": "1"}, {"content": "Design plugin capability registration system", "status": "completed", "id": "2"}, {"content": "Update database schema for plugin capabilities", "status": "completed", "id": "3"}, {"content": "Design automation event creation and routing", "status": "completed", "id": "4"}, {"content": "Plan automation plugin subscription mechanism", "status": "completed", "id": "5"}]