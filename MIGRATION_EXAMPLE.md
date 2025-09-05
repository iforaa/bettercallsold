# Migration Example: CheckoutService

## Before (Manual Payload Construction)

```javascript
// In CheckoutService.js - triggerCheckoutCompletedEvent method
static async triggerCheckoutCompletedEvent({
  orderId,
  provider,
  paymentResult,
  customer_info,
  cartItems,
  calculatedPricing,
  processingTime
}) {
  try {
    // ❌ Manual payload construction (15+ lines)
    const eventPayload = {
      order_id: orderId,
      payment_provider: provider,
      payment_id: paymentResult.payment_id,
      user_id: DEFAULT_MOBILE_USER_ID,
      status: 'processing',
      total_amount: calculatedPricing.total,
      subtotal_amount: calculatedPricing.subtotal,
      tax_amount: calculatedPricing.tax,
      shipping_amount: calculatedPricing.shipping,
      item_count: cartItems.length,
      customer_name: customer_info.name || 'Guest Customer',
      customer_email: customer_info.email || '',
      customer_phone: customer_info.phone || '',
      processing_time_ms: processingTime,
      completed_at: new Date().toISOString()
    };

    await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.CHECKOUT_COMPLETED, eventPayload);
    console.log('📤 Checkout completed event triggered');
  } catch (error) {
    console.error('Error triggering checkout completed event:', error);
  }
}
```

## After (Using Payload Builder)

```javascript
// Add import at the top
import { buildCheckoutCompletedPayload } from '$lib/payloads/index.js';

// In CheckoutService.js - triggerCheckoutCompletedEvent method
static async triggerCheckoutCompletedEvent({
  orderId,
  provider,
  paymentResult,
  customer_info,
  cartItems,
  calculatedPricing,
  processingTime
}) {
  try {
    // ✅ Simple function call (3 lines)
    const eventPayload = buildCheckoutCompletedPayload({
      orderId,
      userId: DEFAULT_MOBILE_USER_ID,
      payment: {
        provider,
        payment_id: paymentResult.payment_id,
        method: paymentResult.method || 'unknown'
      },
      customer: customer_info,
      items: cartItems,
      pricing: calculatedPricing,
      metrics: { processingTime }
    });

    await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.CHECKOUT_COMPLETED, eventPayload);
    console.log('📤 Checkout completed event triggered');
  } catch (error) {
    console.error('Error triggering checkout completed event:', error);
  }
}
```

## Benefits of Migration

### ✅ **Consistency**
- Same event type now has identical structure everywhere
- No more missing fields or typos in field names
- Standardized timestamp format and field naming

### ✅ **Maintainability**  
- Change payload structure in one place → updates everywhere
- Easy to add new required fields to all instances
- Clear documentation of what data each event needs

### ✅ **Reliability**
- Guaranteed field presence (no undefined values)
- Consistent data types and formats
- Default values handled properly

### ✅ **Developer Experience**
- Function parameters show exactly what data is needed
- IDE autocomplete and validation
- Self-documenting code

## Migration Steps

1. **Import the builder function:**
   ```javascript
   import { buildCheckoutCompletedPayload } from '$lib/payloads/index.js';
   ```

2. **Replace manual object construction:**
   ```javascript
   // Old
   const eventPayload = { field1: value1, field2: value2, ... };
   
   // New  
   const eventPayload = buildCheckoutCompletedPayload({ orderId, payment, ... });
   ```

3. **Keep existing PluginService.triggerEvent call:**
   ```javascript
   await PluginService.triggerEvent(tenantId, eventType, eventPayload);
   ```

4. **Test that plugins receive consistent data**

## Other Examples

### Cart Item Added
```javascript
// Before
const eventPayload = {
  cart_id: cartResult.rows[0].id,
  product_id: product_id,
  product_name: inventory.product_name,
  // ... 8 more manual fields
};

// After  
const eventPayload = buildCartItemAddedPayload({
  cartId: cartResult.rows[0].id,
  productId: product_id,
  productName: inventory.product_name,
  inventoryId: inventory_id,
  userId: DEFAULT_MOBILE_USER_ID,
  inventory,
  quantity: 1,
  availableQuantity: newQuantity
});
```

### Product Created
```javascript
// Before
const eventPayload = {
  product_id: newProductId,
  name: productData.name,
  description: productData.description,
  // ... manual construction
};

// After
const eventPayload = buildProductCreatedPayload({
  productId: newProductId,
  name: productData.name,
  description: productData.description,
  price: productData.price,
  status: productData.status,
  images: productData.images,
  tags: productData.tags,
  collections: productData.collections
});
```

## Next Steps

1. Start with **checkout.completed** event (highest impact)
2. Migrate **cart.item_added** event (most frequent)  
3. Update **product.created** event (most complex)
4. Continue with remaining events gradually
5. Remove old manual payload construction code