import { PaymentProviderFactory } from './payments/PaymentProviderFactory.js';
import { query } from '$lib/database.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID, PLUGIN_EVENTS } from '$lib/constants.js';
import { PluginService } from './PluginService.js';

/**
 * Multi-Provider Checkout Service
 * 
 * Handles checkout processing with support for multiple payment providers.
 * Provides a unified interface for payment processing regardless of the provider.
 */
export class CheckoutService {
  
  /**
   * Process checkout with any supported payment provider
   * @param {Object} checkoutData - Checkout information
   * @returns {Promise<Object>} Checkout result
   */
  static async processCheckout({
    payment_method,
    payment_data = {},
    shipping_address,
    billing_address,
    customer_info = {},
    pricing = {},
    cart_items = []
  }) {
    const startTime = Date.now();
    let orderId = null;

    try {
      console.log(`🛒 Starting checkout process with payment method: ${payment_method}`);

      // ==========================================
      // STEP 1: Validate input data
      // ==========================================
      
      this.validateCheckoutData({
        payment_method,
        payment_data,
        shipping_address,
        customer_info
      });

      // ==========================================
      // STEP 2: Get cart items and calculate totals
      // ==========================================
      
      const { cartItems, calculatedPricing } = await this.getCartDataAndCalculateTotals(
        cart_items, 
        pricing
      );

      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      console.log(`📊 Calculated totals: $${calculatedPricing.total} (${cartItems.length} items)`);

      // ==========================================
      // STEP 3: Get payment provider and verify payment
      // ==========================================
      
      const provider = PaymentProviderFactory.getProviderForPaymentMethod(payment_method);
      console.log(`💳 Using provider: ${provider.getProviderName()}`);

      // Verify payment with the provider
      const paymentResult = await provider.verifyPayment(payment_data);
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment verification failed');
      }

      console.log(`✅ Payment verified: ${paymentResult.payment_id} for $${paymentResult.amount}`);

      // ==========================================
      // STEP 4: Validate payment amount
      // ==========================================
      
      const expectedAmount = calculatedPricing.total;
      const actualAmount = paymentResult.amount;
      
      if (Math.abs(actualAmount - expectedAmount) > 0.01) {
        console.error(`💰 Amount mismatch: expected $${expectedAmount}, got $${actualAmount}`);
        throw new Error('Payment amount does not match order total');
      }

      // ==========================================
      // STEP 5: Create order in database transaction
      // ==========================================
      
      orderId = crypto.randomUUID();
      
      await query('BEGIN');

      try {
        // Create order
        const orderResult = await this.createOrder({
          orderId,
          provider: provider.getProviderName(),
          paymentResult,
          payment_method,
          calculatedPricing,
          shipping_address,
          billing_address,
          customer_info,
          cartItems
        });

        // Create order items and update inventory
        await this.createOrderItems(orderId, cartItems);
        
        // Log payment transaction
        await this.logPaymentTransaction({
          orderId,
          provider: provider.getProviderName(),
          paymentResult,
          calculatedPricing
        });

        // Clear cart
        await this.clearCart();

        // Commit transaction
        await query('COMMIT');
        
        console.log(`🎉 Order created successfully: ${orderId}`);

      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }

      // ==========================================
      // STEP 6: Trigger events and return response
      // ==========================================
      
      const processingTime = Date.now() - startTime;
      
      // Trigger checkout completed event
      await this.triggerCheckoutCompletedEvent({
        orderId,
        provider: provider.getProviderName(),
        paymentResult,
        customer_info,
        cartItems,
        calculatedPricing,
        processingTime
      });

      return {
        success: true,
        order_id: orderId,
        payment_provider: provider.getProviderName(),
        payment_id: paymentResult.payment_id,
        payment_method,
        status: 'processing',
        total_amount: calculatedPricing.total,
        subtotal_amount: calculatedPricing.subtotal,
        tax_amount: calculatedPricing.tax,
        shipping_amount: calculatedPricing.shipping,
        processing_time_ms: processingTime,
        message: 'Order placed successfully! 🎉',
        receipt_url: paymentResult.provider_data?.receipt_url
      };

    } catch (error) {
      console.error('❌ Checkout processing failed:', error);
      
      // Trigger checkout failed event
      await this.triggerCheckoutFailedEvent({
        orderId,
        error,
        payment_method,
        customer_info,
        processingTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Create a payment intent with the specified provider
   * @param {Object} params - Payment intent parameters
   * @returns {Promise<Object>} Payment intent response
   */
  static async createPaymentIntent({
    amount,
    currency = 'usd',
    payment_method,
    customer_info = {},
    cart_items = [],
    metadata = {}
  }) {
    try {
      console.log(`💳 Creating payment intent for ${payment_method}: $${amount}`);

      const provider = PaymentProviderFactory.getProviderForPaymentMethod(payment_method);
      
      const result = await provider.createPaymentIntent({
        amount,
        currency,
        customer_info,
        metadata: {
          source: 'multi_provider_checkout',
          cart_items_count: cart_items.length,
          ...metadata
        }
      });

      console.log(`✅ Payment intent created: ${result.payment_intent_id || result.data?.payment_intent_id}`);
      return result;

    } catch (error) {
      console.error('❌ Failed to create payment intent:', error);
      throw error;
    }
  }

  /**
   * Process a refund for any payment provider
   * @param {Object} params - Refund parameters
   * @returns {Promise<Object>} Refund result
   */
  static async processRefund({
    order_id,
    payment_provider,
    payment_id,
    amount = null,
    reason = 'requested_by_customer'
  }) {
    try {
      console.log(`💸 Processing refund for order ${order_id} via ${payment_provider}`);

      const provider = PaymentProviderFactory.getProvider(payment_provider);
      const refundResult = await provider.processRefund(payment_id, amount);

      if (refundResult.success) {
        // Update order status
        await query(`
          UPDATE orders 
          SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [order_id]);

        // Log refund transaction
        await query(`
          INSERT INTO payment_transactions (
            tenant_id, order_id, payment_provider, provider_payment_id,
            amount_cents, currency, status, payment_method_type, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          DEFAULT_TENANT_ID,
          order_id,
          payment_provider,
          refundResult.data?.refund_id || payment_id,
          Math.round((amount || refundResult.amount) * 100),
          refundResult.currency || 'usd',
          'refunded',
          'refund',
          JSON.stringify({ reason, original_payment_id: payment_id })
        ]);

        console.log(`✅ Refund processed successfully: ${refundResult.data?.refund_id}`);
      }

      return refundResult;

    } catch (error) {
      console.error('❌ Failed to process refund:', error);
      throw error;
    }
  }

  // ==========================================
  // Private helper methods
  // ==========================================

  /**
   * Validate checkout data
   * @private
   */
  static validateCheckoutData({ payment_method, payment_data, shipping_address, customer_info }) {
    if (!payment_method) {
      throw new Error('payment_method is required');
    }

    if (!payment_data || typeof payment_data !== 'object') {
      throw new Error('payment_data is required and must be an object');
    }

    if (!shipping_address) {
      throw new Error('shipping_address is required');
    }

    // Validate required shipping address fields
    const requiredAddressFields = ['name', 'address_line_1', 'city', 'state', 'postal_code'];
    for (const field of requiredAddressFields) {
      if (!shipping_address[field]) {
        throw new Error(`shipping_address.${field} is required`);
      }
    }
  }

  /**
   * Get cart data and calculate totals
   * @private
   */
  static async getCartDataAndCalculateTotals(providedCartItems = [], providedPricing = {}) {
    let cartItems = [];
    
    if (providedCartItems.length > 0) {
      // Use provided cart items
      cartItems = providedCartItems;
    } else {
      // Get cart items from database - support both old and new product structures
      const cartQuery = `
        SELECT 
          c.id as cart_id,
          c.product_id,
          c.quantity,
          c.variant_data,
          COALESCE(p_new.title, p_old.name) as product_name,
          COALESCE(p_old.price, 0) as price,
          COALESCE(p_new.images, p_old.images) as images
        FROM cart_items c
        LEFT JOIN products_new p_new ON c.product_id = p_new.id
        LEFT JOIN products_old p_old ON c.product_id = p_old.id
        WHERE c.tenant_id = $1 AND c.user_id = $2
        ORDER BY c.created_at DESC
      `;
      
      const cartResult = await query(cartQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
      cartItems = cartResult.rows;
    }

    // Calculate pricing
    let subtotal = 0;
    
    for (const item of cartItems) {
      let variantData = {};
      try {
        variantData = item.variant_data ? 
          (typeof item.variant_data === 'string' ? JSON.parse(item.variant_data) : item.variant_data) : {};
      } catch (e) {
        variantData = {};
      }

      const itemPrice = variantData.price || item.price || 0;
      const itemQuantity = item.quantity || 1;
      
      subtotal += (typeof itemPrice === 'string' ? parseFloat(itemPrice) : itemPrice) * itemQuantity;
    }

    const shipping = providedPricing.shipping || 0;
    const tax = providedPricing.tax || (subtotal * 0.08); // 8% default tax
    const freeReturns = providedPricing.freeReturns || 0;
    const total = subtotal + shipping + tax + freeReturns;

    return {
      cartItems,
      calculatedPricing: {
        subtotal,
        tax,
        shipping,
        freeReturns,
        total
      }
    };
  }

  /**
   * Create order in database
   * @private
   */
  static async createOrder({
    orderId,
    provider,
    paymentResult,
    payment_method,
    calculatedPricing,
    shipping_address,
    billing_address,
    customer_info,
    cartItems
  }) {
    const createOrderQuery = `
      INSERT INTO orders (
        id, tenant_id, user_id, status,
        total_amount, subtotal_amount, tax_amount, shipping_amount,
        shipping_address, billing_address,
        payment_method, payment_id, payment_status,
        payment_provider, provider_payment_id, provider_customer_id, provider_data,
        customer_name, customer_email, customer_phone,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
      ) RETURNING id, created_at
    `;

    return await query(createOrderQuery, [
      orderId,
      DEFAULT_TENANT_ID,
      DEFAULT_MOBILE_USER_ID,
      'processing',
      calculatedPricing.total,
      calculatedPricing.subtotal,
      calculatedPricing.tax,
      calculatedPricing.shipping,
      JSON.stringify(shipping_address),
      JSON.stringify(billing_address || shipping_address),
      payment_method,
      paymentResult.payment_id,
      'succeeded',
      provider,
      paymentResult.payment_id,
      paymentResult.data?.customer_id || null,
      JSON.stringify(paymentResult.provider_data || {}),
      customer_info.name || shipping_address.name || 'Guest Customer',
      customer_info.email || '',
      customer_info.phone || shipping_address.phone || ''
    ]);
  }

  /**
   * Create order items and update inventory
   * @private
   */
  static async createOrderItems(orderId, cartItems) {
    for (const item of cartItems) {
      let variantData = {};
      try {
        variantData = item.variant_data ? 
          (typeof item.variant_data === 'string' ? JSON.parse(item.variant_data) : item.variant_data) : {};
      } catch (e) {
        variantData = {};
      }

      const itemPrice = variantData.price || item.price || 0;
      const itemQuantity = item.quantity || 1;

      // Create order item
      await query(`
        INSERT INTO order_items (
          id, order_id, product_id, quantity, price, variant_data, created_at
        ) VALUES (
          uuid_generate_v4(), $1, $2, $3, $4, $5, NOW()
        )
      `, [
        orderId,
        item.product_id,
        itemQuantity,
        itemPrice,
        JSON.stringify(variantData)
      ]);

      // Update inventory if variant has inventory_id
      if (variantData.inventory_id) {
        await query(`
          UPDATE inventory_levels_new 
          SET available = GREATEST(0, available - $1), updated_at = CURRENT_TIMESTAMP
          WHERE id = (
            SELECT id FROM inventory_levels_new
            WHERE variant_id = $2 AND available > 0
            ORDER BY available DESC
            LIMIT 1
          )
        `, [itemQuantity, variantData.inventory_id]);
      }
    }
  }

  /**
   * Log payment transaction
   * @private
   */
  static async logPaymentTransaction({ orderId, provider, paymentResult, calculatedPricing }) {
    await query(`
      INSERT INTO payment_transactions (
        tenant_id, order_id, payment_provider, provider_payment_id, provider_customer_id,
        amount_cents, currency, status, payment_method_type, provider_data, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      DEFAULT_TENANT_ID,
      orderId,
      provider,
      paymentResult.payment_id,
      paymentResult.data?.customer_id || null,
      Math.round(calculatedPricing.total * 100),
      paymentResult.currency || 'usd',
      'succeeded',
      paymentResult.data?.payment_method_type || 'card',
      JSON.stringify(paymentResult.provider_data || {}),
      JSON.stringify({
        checkout_source: 'multi_provider_system',
        processing_timestamp: new Date().toISOString()
      })
    ]);
  }

  /**
   * Clear cart after successful checkout
   * @private
   */
  static async clearCart() {
    await query(`
      DELETE FROM cart_items 
      WHERE tenant_id = $1 AND user_id = $2
    `, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
  }

  /**
   * Trigger checkout completed event
   * @private
   */
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

  /**
   * Trigger checkout failed event
   * @private
   */
  static async triggerCheckoutFailedEvent({
    orderId,
    error,
    payment_method,
    customer_info,
    processingTime
  }) {
    try {
      const eventPayload = {
        order_id: orderId,
        payment_method,
        user_id: DEFAULT_MOBILE_USER_ID,
        error_message: error.message,
        error_type: error.constructor.name,
        customer_email: customer_info?.email || '',
        processing_time_ms: processingTime,
        failed_at: new Date().toISOString()
      };

      await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.CHECKOUT_FAILED, eventPayload);
      console.log('📤 Checkout failed event triggered');
    } catch (pluginError) {
      console.error('Error triggering checkout failed event:', pluginError);
    }
  }
}