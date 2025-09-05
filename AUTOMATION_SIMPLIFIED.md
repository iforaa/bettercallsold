# BetterCallSold Automation - Simplified Architecture 🎯
*Simple platform-automation communication system*

## 🏗️ **Simplified Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    SaaS Platform                            │
│                                                             │
│  ┌─────────────────┐                  ┌─────────────────┐   │
│  │   Existing      │                  │   New Event     │   │
│  │   APIs          │◄─────────────────┤   Receiver      │   │
│  │                 │                  │   System        │   │
│  │ /api/products   │                  │ /api/events     │   │
│  │ /api/orders     │                  │                 │   │
│  │ /api/customers  │                  │                 │   │
│  └─────────────────┘                  └─────────────────┘   │
│           ▲                                     ▲           │
│           │                                     │           │
│           │ Existing API calls                  │ New       │
│           │ (keep working)                      │ Events    │
│           │                                     │           │
│           │            ┌─────────────────┐      │           │
│           │            │   Event Bus     │──────┘           │
│           │            │ (All Platform   │                  │
│           │            │   Events)       │                  │
│           │            └─────────────────┘                  │
│           │                     │                           │
│           │                     │ webhook                   │
│           │                     ▼                           │
└───────────┼─────────────────────────────────────────────────┘
            │             ┌─────────────────┐
            │             │   Automation    │
            └─────────────┤     Plugin      │
              API calls   │  (Flow Engine)  │
              (unchanged) └─────────────────┘
```

## 🔄 **Event Flow**

### **1. Platform → Automation (Existing)**
```javascript
// Platform sends events to automation plugin via existing webhook system
POST /plugins/automation/webhook
{
  "event_type": "customer.created",
  "payload": {
    "customer_id": "cust_123", 
    "email": "john@example.com",
    "name": "John Doe"
  },
  "tenant_id": "tenant_123"
}
```

### **2. Automation → Platform (New System)**
```javascript
// Automation plugin sends events back to platform
POST /api/events/automation
{
  "flow_execution_id": "exec_456",
  "events": [
    {
      "action_type": "create_product",
      "payload": {
        "name": "New Product",
        "price": 29.99,
        "description": "Auto-created product"
      }
    },
    {
      "action_type": "send_notification", 
      "payload": {
        "message": "Product created successfully",
        "channel": "slack"
      }
    }
  ]
}
```

### **3. Platform Processes Events (New System)**
```javascript
// Event receiver routes to existing APIs
const eventResults = [];

for (const event of events) {
  switch (event.action_type) {
    case 'create_product':
      // Call existing product API
      const productResult = await fetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(event.payload)
      });
      eventResults.push({
        action_type: event.action_type,
        success: productResult.ok,
        data: await productResult.json()
      });
      break;
      
    case 'send_notification':
      // Call existing notification API
      const notifResult = await fetch('/api/notifications', {
        method: 'POST', 
        body: JSON.stringify(event.payload)
      });
      eventResults.push({
        action_type: event.action_type,
        success: notifResult.ok,
        data: await notifResult.json()
      });
      break;
  }
}

// Return results to automation plugin
return { results: eventResults };
```

## 📊 **Minimal Database Schema**

### **Simple Automation Tables**
```sql
-- Automation flows (minimal)
CREATE TABLE automation_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    
    -- Simple flow definition
    trigger_event VARCHAR(100) NOT NULL, -- e.g., "customer.created"
    flow_definition JSONB NOT NULL,      -- Simple flow steps
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Flow executions (simple tracking) 
CREATE TABLE automation_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID REFERENCES automation_flows(id),
    tenant_id UUID NOT NULL,
    
    status VARCHAR(50) DEFAULT 'running', -- running, completed, failed
    trigger_data JSONB,
    execution_results JSONB, -- Results from platform APIs
    
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Event log (for debugging)
CREATE TABLE automation_event_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    execution_id UUID REFERENCES automation_executions(id),
    
    action_type VARCHAR(100),
    payload JSONB,
    result JSONB,
    success BOOLEAN,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎛️ **New Platform Event Receiver**

### **Event Receiver Endpoint**
```javascript
// New endpoint: /api/events/automation
export async function POST({ request }) {
  try {
    const { flow_execution_id, events } = await request.json();
    
    console.log(`🤖 Processing ${events.length} automation events`);
    
    const results = [];
    
    // Process each event by calling existing APIs
    for (const event of events) {
      try {
        const result = await processAutomationEvent(event);
        results.push({
          action_type: event.action_type,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          action_type: event.action_type, 
          success: false,
          error: error.message
        });
      }
    }
    
    // Log results  
    await logAutomationResults(flow_execution_id, results);
    
    return jsonResponse({ results });
    
  } catch (error) {
    console.error('Automation event processing failed:', error);
    return internalServerErrorResponse('Failed to process automation events');
  }
}

async function processAutomationEvent(event) {
  // Route to existing APIs based on action_type
  switch (event.action_type) {
    case 'create_product':
      return await callExistingAPI('POST', '/api/products', event.payload);
      
    case 'update_product':
      return await callExistingAPI('PUT', `/api/products/${event.payload.id}`, event.payload);
      
    case 'create_customer':
      return await callExistingAPI('POST', '/api/customers', event.payload);
      
    case 'send_email':
      return await callExistingAPI('POST', '/api/notifications/email', event.payload);
      
    case 'create_order':
      return await callExistingAPI('POST', '/api/orders', event.payload);
      
    default:
      throw new Error(`Unknown action type: ${event.action_type}`);
  }
}

async function callExistingAPI(method, endpoint, payload) {
  // Internal API call using existing infrastructure
  const response = await fetch(`${process.env.BASE_URL}${endpoint}`, {
    method,
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.INTERNAL_API_TOKEN 
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}
```

## 🤖 **Simplified Automation Plugin**

### **Basic Flow Engine**
```javascript
// Automation Plugin - Simple Flow Processor
class SimpleFlowEngine {
  
  async handlePlatformEvent(eventType, payload) {
    // Find flows triggered by this event
    const flows = await this.findActiveFlows(eventType);
    
    for (const flow of flows) {
      this.executeFlow(flow, { eventType, payload })
        .catch(err => console.error('Flow execution failed:', err));
    }
  }
  
  async executeFlow(flow, triggerData) {
    const execution = await this.startExecution(flow, triggerData);
    
    try {
      // Simple flow: trigger → conditions → actions
      const eventsToSend = [];
      
      for (const step of flow.flow_definition.steps) {
        if (step.type === 'condition') {
          if (!this.evaluateCondition(step, triggerData)) {
            console.log('Condition failed, skipping flow');
            return;
          }
        }
        
        if (step.type === 'action') {
          eventsToSend.push({
            action_type: step.action_type,
            payload: this.buildPayload(step, triggerData)
          });
        }
      }
      
      // Send all events to platform
      if (eventsToSend.length > 0) {
        const results = await this.sendEventsToPlatform(execution.id, eventsToSend);
        await this.completeExecution(execution.id, results);
      }
      
    } catch (error) {
      await this.failExecution(execution.id, error);
    }
  }
  
  async sendEventsToPlatform(executionId, events) {
    const response = await fetch(`${this.platformUrl}/api/events/automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flow_execution_id: executionId,
        events: events
      })
    });
    
    if (!response.ok) {
      throw new Error(`Platform rejected events: ${response.status}`);
    }
    
    return await response.json();
  }
}
```

### **Simple Flow Definition Example**
```json
{
  "id": "flow_welcome_customer",
  "name": "Welcome New Customer",
  "trigger_event": "customer.created",
  "flow_definition": {
    "steps": [
      {
        "id": "condition_1",
        "type": "condition", 
        "field": "email",
        "operator": "exists",
        "description": "Check if customer has email"
      },
      {
        "id": "action_1", 
        "type": "action",
        "action_type": "send_email",
        "payload_template": {
          "to": "{{trigger.email}}",
          "subject": "Welcome {{trigger.name}}!",
          "template": "welcome_email"
        }
      },
      {
        "id": "action_2",
        "type": "action", 
        "action_type": "create_task",
        "payload_template": {
          "title": "Follow up with {{trigger.name}}",
          "due_date": "{{now + 3 days}}"
        }
      }
    ]
  }
}
```

## 🎯 **Available Action Types**

### **Platform Actions**
```javascript
const AVAILABLE_ACTIONS = {
  // Product actions
  'create_product': '/api/products',
  'update_product': '/api/products/:id', 
  'delete_product': '/api/products/:id',
  
  // Customer actions
  'create_customer': '/api/customers',
  'update_customer': '/api/customers/:id',
  
  // Order actions  
  'create_order': '/api/orders',
  'update_order_status': '/api/orders/:id/status',
  
  // Communication actions
  'send_email': '/api/notifications/email',
  'send_sms': '/api/notifications/sms',
  'create_notification': '/api/notifications',
  
  // Task actions
  'create_task': '/api/tasks',
  'assign_task': '/api/tasks/:id/assign'
};
```

## 🚀 **Implementation Plan**

### **Phase 1: Event Receiver (Week 1)**
- [ ] Create `/api/events/automation` endpoint
- [ ] Build event-to-API routing system
- [ ] Add result logging and error handling
- [ ] Test with automation plugin

### **Phase 2: Simple Flows (Week 2)**
- [ ] Create basic automation plugin structure
- [ ] Implement simple flow execution engine
- [ ] Add condition evaluation
- [ ] Build flow storage system

### **Phase 3: UI Builder (Week 3)**
- [ ] Create basic flow builder interface
- [ ] Add drag-drop for actions
- [ ] Implement flow testing
- [ ] Add execution monitoring

## ✅ **Key Benefits**

### **1. No Breaking Changes**
- ✅ Existing plugin APIs continue to work
- ✅ Parallel system doesn't interfere
- ✅ Gradual migration possible

### **2. Simple & Focused**  
- ✅ Just platform ↔ automation communication
- ✅ No complex plugin discovery
- ✅ Clear event routing logic

### **3. Powerful Foundation**
- ✅ Can automate any existing API
- ✅ Full execution tracking
- ✅ Easy to extend later

### **4. Quick Implementation**
- ✅ Reuse existing APIs
- ✅ Simple database schema
- ✅ Straightforward event routing

This simplified approach gives you automation power without complexity! 🎉