# BetterCallSold Plugin System

A comprehensive plugin system that allows third-party services to integrate with BetterCallSold through webhooks and API calls.

## 🚀 Quick Start

1. **Start your server**: `npm run dev`
2. **Run quick test**: `./quick-plugin-test.sh`
3. **Run full test suite**: `./test-plugins.sh`

## 📋 System Overview

The plugin system allows external services to:
- Register webhooks to receive events when things happen in your store
- Configure which events they want to receive
- Test their webhook endpoints
- Store configuration data

## 🔧 API Endpoints

### Plugin Management

#### Register a Plugin
```bash
POST /api/plugins
Content-Type: application/json

{
  "name": "My Analytics Plugin",
  "slug": "my-analytics",
  "webhook_url": "https://myservice.com/webhooks/bettercallsold",
  "events": ["product.created", "product.updated", "order.created"],
  "config": {
    "api_key": "your-api-key",
    "sync_frequency": "realtime"
  },
  "metadata": {
    "description": "Analytics and tracking plugin",
    "version": "1.0.0",
    "author": "Your Company"
  }
}
```

#### Get All Plugins
```bash
GET /api/plugins
```

#### Get Specific Plugin
```bash
GET /api/plugins/{slug}
```

#### Update Plugin
```bash
PUT /api/plugins/{slug}
Content-Type: application/json

{
  "name": "Updated Plugin Name",
  "webhook_url": "https://newurl.com/webhook",
  "events": ["product.created", "product.updated"],
  "status": "active"
}
```

#### Delete Plugin
```bash
DELETE /api/plugins/{slug}
```

#### Test Plugin Connectivity
```bash
POST /api/plugins/{slug}/test
```

### Plugin Events

#### Get Plugin Events (for monitoring)
```bash
GET /api/plugins/events?limit=50
```

#### Manually Process Pending Webhooks
```bash
POST /api/plugins/events
```

## 📤 Available Events

The system currently supports these events:

### Product Events
- `product.created` - When a new product is added
- `product.updated` - When product details change
- `product.deleted` - When a product is removed

### Order Events (coming soon)
- `order.created` - New order placed
- `order.paid` - Order payment confirmed
- `order.shipped` - Order shipped
- `order.delivered` - Order delivered
- `order.cancelled` - Order cancelled

### Customer Events (coming soon)
- `customer.created` - New customer registered
- `customer.updated` - Customer details changed

### Inventory Events (coming soon)
- `inventory.low` - Product stock is low
- `inventory.out` - Product out of stock
- `inventory.updated` - Stock levels changed

## 🔄 Webhook Format

When events occur, your webhook endpoint will receive POST requests with this format:

```json
{
  "event": "product.created",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "product_id": "12345678-1234-1234-1234-123456789012",
    "name": "New Product Name",
    "description": "Product description",
    "price": 29.99,
    "status": "active",
    "images": ["https://example.com/image1.jpg"],
    "tags": ["tag1", "tag2"],
    "collections": ["collection-1"],
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🧪 Testing Your Plugin

### 1. Manual Testing with curl

Register a test plugin pointing to a webhook testing service:

```bash
curl -X POST http://localhost:5173/api/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Plugin",
    "slug": "test-plugin",
    "webhook_url": "https://httpbin.org/post",
    "events": ["product.created"]
  }'
```

### 2. Test Connectivity

```bash
curl -X POST http://localhost:5173/api/plugins/test-plugin/test
```

### 3. Trigger Events

Create a product to trigger webhooks:

```bash
curl -X POST http://localhost:5173/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "This will trigger webhooks",
    "price": 19.99
  }'
```

### 4. Check Events

```bash
curl http://localhost:5173/api/plugins/events
```

## 🛠️ Plugin Development

### Setting Up Your Webhook Endpoint

Your webhook endpoint should:

1. **Accept POST requests** with JSON payload
2. **Respond with HTTP 2xx** status codes for success
3. **Handle retries gracefully** (we retry failed webhooks up to 3 times)
4. **Validate the payload** before processing
5. **Respond quickly** (we timeout after 10 seconds)

Example webhook handler in Node.js/Express:

```javascript
app.post('/webhooks/bettercallsold', (req, res) => {
  try {
    const { event, tenant_id, timestamp, data } = req.body;
    
    console.log(`Received ${event} event for tenant ${tenant_id}`);
    
    switch (event) {
      case 'product.created':
        handleProductCreated(data);
        break;
      case 'product.updated':
        handleProductUpdated(data);
        break;
      case 'product.deleted':
        handleProductDeleted(data);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## 🔒 Security Considerations

- **HTTPS Required**: Use HTTPS URLs for webhook endpoints in production
- **Validate Payloads**: Always validate incoming webhook data
- **Idempotency**: Handle duplicate events gracefully
- **Rate Limiting**: Implement rate limiting on your webhook endpoints
- **Authentication**: Consider implementing webhook signature verification (coming soon)

## 🐛 Debugging

### Check Plugin Status
```bash
curl http://localhost:5173/api/plugins/your-plugin-slug
```

### View Recent Events
```bash
curl "http://localhost:5173/api/plugins/events?limit=20"
```

### Test Connectivity
```bash
curl -X POST http://localhost:5173/api/plugins/your-plugin-slug/test
```

### Check Logs
Look for plugin-related logs in your server console:
- `📤 Event created for plugin: {slug} -> {event}`
- `✅ Webhook sent successfully to {slug}`
- `❌ Webhook failed for {slug}: {error}`

## 📊 Monitoring

The system provides event tracking with these statuses:
- `pending` - Event created, waiting to be sent
- `sent` - Successfully delivered to webhook endpoint
- `failed` - Failed after maximum retries
- `retry` - Currently being retried

## 💡 Example Use Cases

### Analytics Plugin
Register for `product.created`, `product.updated`, and `order.created` events to track business metrics.

### Email Marketing
Subscribe to `customer.created` and `order.created` events to trigger welcome emails and order confirmations.

### Inventory Management
Listen for `inventory.low` and `inventory.out` events to automatically reorder stock.

### Social Media
React to `product.created` events to automatically post new products on social media.

## 🆘 Troubleshooting

**Webhooks not being sent?**
- Check plugin status is "active"
- Verify webhook URL is accessible
- Check plugin events log for errors

**Events not being created?**
- Ensure plugin is subscribed to the correct events
- Check server logs for plugin integration errors

**Webhook endpoint not receiving data?**
- Test connectivity with the test endpoint
- Verify URL is accessible from the internet
- Check for firewall or security restrictions

## 🔄 Next Steps

The plugin system is designed to be extensible. Future enhancements include:
- Webhook signature verification for security
- More event types (orders, customers, inventory)
- Plugin marketplace and discovery
- SDK for easier plugin development
- Real-time event streaming
- Plugin analytics and monitoring dashboard