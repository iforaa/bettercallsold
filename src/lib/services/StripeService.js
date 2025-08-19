import Stripe from 'stripe';
import { 
  STRIPE_SECRET_KEY, 
  STRIPE_PUBLISHABLE_KEY, 
  STRIPE_TEST_MODE,
  STRIPE_WEBHOOK_SECRET
} from '$env/static/private';

/**
 * Stripe Service for handling payments
 * Automatically uses test mode based on environment variables
 */
class StripeService {
  constructor() {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required in environment variables');
    }
    
    this.stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-09-30.acacia'
    });
    
    this.isTestMode = STRIPE_TEST_MODE === 'true';
    this.publishableKey = STRIPE_PUBLISHABLE_KEY;
    
    console.log(`🔷 Stripe initialized in ${this.isTestMode ? 'TEST' : 'LIVE'} mode`);
  }

  /**
   * Create a payment intent for a checkout
   */
  async createPaymentIntent({ amount, currency = 'usd', customer = null, metadata = {} }) {
    try {
      const paymentIntentData = {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          source: 'BetterCallSold',
          environment: this.isTestMode ? 'test' : 'live',
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true,
        },
      };

      // Add customer if provided
      if (customer) {
        paymentIntentData.customer = customer;
        console.log(`💳 Creating PaymentIntent with customer: ${customer}`);
      } else {
        console.log('💳 Creating PaymentIntent without customer');
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      console.log(`💳 Payment intent created: ${paymentIntent.id} for $${amount}`);
      console.log(`💳 PaymentIntent customer: ${paymentIntent.customer || 'null'}`);
      return paymentIntent;
    } catch (error) {
      console.error('❌ Stripe payment intent creation failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('❌ Failed to retrieve payment intent:', error);
      throw error;
    }
  }

  /**
   * Create a customer
   */
  async createCustomer({ email, name, phone = null, metadata = {} }) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        phone,
        metadata: {
          source: 'BetterCallSold',
          ...metadata
        }
      });

      console.log(`👤 Customer created: ${customer.id} (${email})`);
      return customer;
    } catch (error) {
      console.error('❌ Stripe customer creation failed:', error);
      throw error;
    }
  }

  /**
   * Get or create customer by email
   */
  async getOrCreateCustomer({ email, name, phone = null, metadata = {} }) {
    try {
      console.log('🔍 Searching for existing customer with email:', email);
      // Check if customer exists
      const existingCustomers = await this.stripe.customers.list({
        email: email,
        limit: 1
      });

      console.log('🔍 Found', existingCustomers.data.length, 'existing customers');
      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        console.log(`👤 Found existing customer: ${customer.id} (${customer.email})`);
        return customer;
      }

      // Create new customer
      console.log('👤 No existing customer found, creating new one...');
      return await this.createCustomer({ email, name, phone, metadata });
    } catch (error) {
      console.error('❌ Failed to get or create customer:', error);
      throw error;
    }
  }

  /**
   * Create ephemeral key for customer to access saved payment methods
   */
  async createEphemeralKey(customerId) {
    try {
      const ephemeralKey = await this.stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: '2024-09-30.acacia' }
      );
      
      console.log(`🔑 Ephemeral key created for customer: ${customerId}`);
      return ephemeralKey;
    } catch (error) {
      console.error('❌ Failed to create ephemeral key:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async createRefund(paymentIntentId, amount = null) {
    try {
      const refundData = { payment_intent: paymentIntentId };
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);
      console.log(`💸 Refund created: ${refund.id} for ${refund.amount/100}`);
      return refund;
    } catch (error) {
      console.error('❌ Stripe refund failed:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, webhookSecret) {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      throw error;
    }
  }

  /**
   * Construct webhook event using the configured webhook secret
   */
  constructWebhookEvent(payload, signature) {
    if (!STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required in environment variables');
    }
    
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      throw error;
    }
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethodToCustomer(paymentMethodId, customerId) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      console.log(`🔗 Payment method ${paymentMethodId} attached to customer ${customerId}`);
      return paymentMethod;
    } catch (error) {
      console.error('❌ Failed to attach payment method to customer:', error);
      throw error;
    }
  }

  /**
   * Detach payment method from customer
   */
  async detachPaymentMethodFromCustomer(paymentMethodId) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      console.log(`🔗 Payment method ${paymentMethodId} detached from customer`);
      return paymentMethod;
    } catch (error) {
      console.error('❌ Failed to detach payment method from customer:', error);
      throw error;
    }
  }

  /**
   * Get publishable key for frontend
   */
  getPublishableKey() {
    return this.publishableKey;
  }

  /**
   * Get test card numbers for development
   */
  getTestCards() {
    if (!this.isTestMode) {
      throw new Error('Test cards are only available in test mode');
    }
    
    return {
      visa: '4242424242424242',
      visaDebit: '4000056655665556',
      mastercard: '5555555555554444',
      amex: '378282246310005',
      declined: '4000000000000002',
      insufficientFunds: '4000000000009995',
      expiredCard: '4000000000000069'
    };
  }
}

// Export singleton instance
export const stripeService = new StripeService();