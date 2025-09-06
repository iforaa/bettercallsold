# BetterCallSold Automation System Design 🤖
*A Shopify Flow-inspired plugin automation platform*

## 🎯 Vision
Create a drag-and-drop visual automation system that allows plugins to communicate with each other and the platform, enabling complex business workflows without code.

## 🏗️ System Architecture

### 1. **Core Components**

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Visual Builder    │    │  Automation Plugin  │    │   Plugin Registry   │
│   (Frontend UI)     │◄──►│   (Flow Engine)     │◄──►│  (Capabilities)     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Flow Storage      │    │    Event Bus        │    │   Plugin Manager    │
│   (PostgreSQL)      │    │  (Event Router)     │    │   (Discovery)       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### 2. **Plugin Capability Discovery System**

#### A. Plugin Manifest (`plugin.json`)
Each plugin declares its capabilities:

```json
{
  "name": "Email Marketing Plugin",
  "slug": "email-marketing",
  "version": "1.0.0",
  "capabilities": {
    "triggers": [
      {
        "id": "customer.created",
        "name": "New Customer",
        "description": "Triggers when a new customer is created",
        "event_types": ["customer.created"],
        "output_schema": {
          "customer_id": "string",
          "email": "string",
          "name": "string"
        }
      }
    ],
    "actions": [
      {
        "id": "send_welcome_email",
        "name": "Send Welcome Email",
        "description": "Sends a welcome email to customer",
        "endpoint": "/api/actions/send-welcome",
        "method": "POST",
        "input_schema": {
          "email": {"type": "string", "required": true},
          "template": {"type": "string", "required": false},
          "variables": {"type": "object", "required": false}
        },
        "output_schema": {
          "email_id": "string",
          "status": "string"
        }
      }
    ],
    "conditions": [
      {
        "id": "customer_location",
        "name": "Customer Location",
        "description": "Check customer's location",
        "operators": ["equals", "contains", "in"],
        "value_type": "string"
      }
    ]
  }
}
```

#### B. Discovery Endpoint
Plugins expose `/api/capabilities` endpoint:

```javascript
// Plugin's capability endpoint
GET /api/capabilities
{
  "triggers": [...],
  "actions": [...],
  "conditions": [...],
  "health": "healthy",
  "last_updated": "2025-08-26T12:00:00Z"
}
```

### 3. **Flow Definition Format**

#### A. Flow Structure
```json
{
  "id": "flow_123",
  "name": "Welcome New Customers",
  "description": "Send welcome email to new customers from US",
  "status": "active",
  "trigger": {
    "type": "event",
    "event_types": ["customer.created"],
    "plugin_id": "platform"
  },
  "steps": [
    {
      "id": "condition_1",
      "type": "condition",
      "name": "Check if US customer",
      "condition": {
        "field": "location.country",
        "operator": "equals",
        "value": "US"
      },
      "on_true": "action_1",
      "on_false": "end"
    },
    {
      "id": "action_1",
      "type": "action",
      "name": "Send Welcome Email",
      "plugin_id": "email-marketing",
      "action_id": "send_welcome_email",
      "config": {
        "template": "welcome_template",
        "variables": {
          "customer_name": "{{trigger.customer_name}}"
        }
      },
      "on_success": "action_2",
      "on_error": "error_handler_1"
    },
    {
      "id": "action_2",
      "type": "action",
      "name": "Add to CRM",
      "plugin_id": "crm-plugin",
      "action_id": "create_contact",
      "config": {
        "source": "website_signup"
      },
      "on_success": "end",
      "on_error": "error_handler_1"
    }
  ],
  "error_handlers": [
    {
      "id": "error_handler_1",
      "type": "action",
      "name": "Log Error",
      "plugin_id": "logging-plugin",
      "action_id": "log_error"
    }
  ],
  "variables": {},
  "settings": {
    "timeout": 30000,
    "retry_count": 3,
    "retry_delay": 1000
  }
}
```

### 4. **Flow Execution Engine**

#### A. Event Listener & Flow Matcher
```javascript
// Automation Plugin Core Engine
class AutomationEngine {
  
  async onEvent(eventType, payload) {
    // 1. Find all flows triggered by this event
    const flows = await this.findFlowsByTrigger(eventType);
    
    // 2. Execute each flow asynchronously
    for (const flow of flows) {
      this.executeFlow(flow, payload).catch(this.handleFlowError);
    }
  }

  async executeFlow(flow, triggerData) {
    const execution = await this.createFlowExecution(flow, triggerData);
    
    try {
      await this.processFlowSteps(execution);
      await this.markExecutionComplete(execution.id);
    } catch (error) {
      await this.handleExecutionError(execution, error);
    }
  }

  async processFlowSteps(execution) {
    let currentStepId = execution.flow.steps[0].id;
    let stepData = execution.trigger_data;
    
    while (currentStepId && currentStepId !== 'end') {
      const step = this.findStep(execution.flow, currentStepId);
      const result = await this.executeStep(step, stepData);
      
      // Update execution state
      await this.updateExecutionStep(execution.id, currentStepId, result);
      
      // Determine next step
      currentStepId = this.getNextStep(step, result);
      stepData = { ...stepData, ...result.data };
    }
  }

  async executeStep(step, data) {
    switch (step.type) {
      case 'condition':
        return await this.evaluateCondition(step, data);
      case 'action':
        return await this.executeAction(step, data);
      case 'delay':
        return await this.executeDelay(step);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }
}
```

#### B. Action Execution
```javascript
async executeAction(step, data) {
  const plugin = await this.getPlugin(step.plugin_id);
  const action = plugin.capabilities.actions.find(a => a.id === step.action_id);
  
  // Build request payload
  const payload = this.buildActionPayload(step.config, data);
  
  // Execute action via plugin's API
  const response = await fetch(plugin.webhook_url + action.endpoint, {
    method: action.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  return {
    success: response.ok,
    data: await response.json(),
    status: response.status
  };
}
```

### 5. **Database Schema**

#### A. Automation Tables
```sql
-- Automation flows
CREATE TABLE automation_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    definition JSONB NOT NULL, -- Flow structure
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- Flow executions (for monitoring/debugging)
CREATE TABLE flow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID REFERENCES automation_flows(id),
    tenant_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'running',
    trigger_event_type VARCHAR(100),
    trigger_data JSONB,
    execution_log JSONB, -- Step-by-step execution log
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_message TEXT
);

-- Plugin capabilities cache
CREATE TABLE plugin_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id UUID REFERENCES plugins(id),
    capabilities JSONB NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW()
);
```

### 6. **Visual Flow Builder Interface**

#### A. React Components Structure
```
FlowBuilder/
├── FlowCanvas/
│   ├── FlowCanvas.svelte          # Main drag-drop canvas
│   ├── FlowNode.svelte            # Individual flow steps
│   ├── FlowConnection.svelte      # Connecting lines
│   └── FlowMinimap.svelte         # Overview/navigation
├── PluginPalette/
│   ├── PluginPalette.svelte       # Draggable plugin list
│   ├── TriggerList.svelte         # Available triggers
│   ├── ActionList.svelte          # Available actions  
│   └── ConditionList.svelte       # Available conditions
├── ConfigPanels/
│   ├── StepConfigPanel.svelte     # Configure selected step
│   ├── TriggerConfig.svelte       # Trigger configuration
│   ├── ActionConfig.svelte        # Action configuration
│   └── ConditionConfig.svelte     # Condition configuration
└── FlowControls/
    ├── FlowToolbar.svelte         # Save/run/test controls
    ├── FlowSettings.svelte        # Flow-level settings
    └── ExecutionMonitor.svelte    # Real-time execution view
```

#### B. Key UI Features
- **Drag & Drop**: Plugins draggable from palette to canvas
- **Visual Connections**: Click-and-drag to connect steps
- **Live Validation**: Real-time validation of flow structure
- **Test Mode**: Test flows with sample data
- **Execution Monitoring**: Real-time view of running flows
- **Template Gallery**: Pre-built flow templates

### 7. **Plugin Communication Patterns**

#### A. Platform → Plugin
```javascript
// Platform sends event to Automation Plugin
POST /plugins/automation/webhook
{
  "event_type": "customer.created",
  "payload": { /* customer data */ },
  "tenant_id": "...",
  "timestamp": "..."
}
```

#### B. Plugin → Plugin (via Automation)
```javascript
// Automation Plugin orchestrates plugin communication
// 1. Receive event from Email Plugin
// 2. Process through flow logic  
// 3. Send action to CRM Plugin

// Step 1: Email Plugin → Automation
POST /plugins/automation/webhook
{
  "event_type": "email.sent",
  "payload": { "customer_id": "123", "email_id": "456" }
}

// Step 2: Automation → CRM Plugin  
POST /plugins/crm/api/actions/update-contact
{
  "contact_id": "123",
  "last_email_sent": "456",
  "updated_by": "automation_flow_789"
}
```

### 8. **Implementation Roadmap**

#### Phase 1: Foundation (Weeks 1-2)
- [ ] Plugin capability discovery system
- [ ] Basic flow definition format  
- [ ] Flow storage (database schema)
- [ ] Simple flow execution engine

#### Phase 2: Core Engine (Weeks 3-4)
- [ ] Event routing to automation plugin
- [ ] Action execution system
- [ ] Condition evaluation engine
- [ ] Error handling & retries

#### Phase 3: Visual Builder (Weeks 5-6)
- [ ] Basic drag-and-drop interface
- [ ] Plugin palette
- [ ] Flow canvas with connections
- [ ] Step configuration panels

#### Phase 4: Advanced Features (Weeks 7-8)
- [ ] Flow templates
- [ ] Execution monitoring
- [ ] Testing & debugging tools
- [ ] Performance optimization

### 9. **Technical Considerations**

#### A. Performance
- **Async Processing**: All flow executions are non-blocking
- **Queue System**: Use job queue for heavy processing
- **Caching**: Cache plugin capabilities and flow definitions
- **Batching**: Batch similar actions when possible

#### B. Security  
- **Sandboxing**: Isolate plugin execution
- **Rate Limiting**: Prevent abuse of automation flows
- **Permissions**: Role-based access to automation features
- **Audit Logging**: Track all automation activities

#### C. Scalability
- **Horizontal Scaling**: Stateless flow execution workers
- **Database Optimization**: Efficient queries for flow matching
- **Event Streaming**: Consider event streaming for high volume
- **Monitoring**: Comprehensive metrics and alerting

## 🚀 Next Steps

1. **Start with Plugin Discovery**: Implement the capability manifest system
2. **Build Simple Flow Engine**: Basic event → action execution  
3. **Create Minimal UI**: Simple flow builder to test concepts
4. **Iterate & Expand**: Add complexity based on user feedback

This design provides a solid foundation for a powerful, scalable automation system that can grow with your platform's needs! 🎉