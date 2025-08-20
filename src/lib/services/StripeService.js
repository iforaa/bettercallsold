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
   * Get comprehensive payment details including payment intent and charge info
   */
  async getPaymentDetails(paymentIntentId) {
    try {
      console.log(`🔍 Fetching comprehensive payment details for: ${paymentIntentId}`);
      
      // Fetch payment intent with expanded data
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge', 'customer']
      });

      const paymentDetails = {
        payment_intent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          created: paymentIntent.created,
          confirmation_method: paymentIntent.confirmation_method,
          capture_method: paymentIntent.capture_method,
          customer_id: paymentIntent.customer?.id || null,
          metadata: paymentIntent.metadata || {}
        }
      };

      // If there's a charge, get detailed charge information
      if (paymentIntent.latest_charge) {
        const charge = typeof paymentIntent.latest_charge === 'string' 
          ? await this.stripe.charges.retrieve(paymentIntent.latest_charge)
          : paymentIntent.latest_charge;

        paymentDetails.charge = await this.extractChargeDetails(charge);
      }

      console.log(`✅ Retrieved comprehensive payment details for: ${paymentIntentId}`);
      return paymentDetails;

    } catch (error) {
      console.error(`❌ Failed to get payment details for ${paymentIntentId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve detailed charge information
   */
  async getChargeDetails(chargeId) {
    try {
      console.log(`🔍 Fetching charge details for: ${chargeId}`);
      const charge = await this.stripe.charges.retrieve(chargeId);
      return await this.extractChargeDetails(charge);
    } catch (error) {
      console.error(`❌ Failed to retrieve charge details for ${chargeId}:`, error);
      throw error;
    }
  }

  /**
   * Extract structured charge details from Stripe charge object
   */
  async extractChargeDetails(charge) {
    const chargeDetails = {
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency,
      status: charge.status,
      created: charge.created,
      captured: charge.captured,
      
      // Receipt Information
      receipt_url: charge.receipt_url,
      receipt_number: charge.receipt_number,
      receipt_email: charge.receipt_email,
      
      // Billing Details
      billing_details: {
        name: charge.billing_details?.name,
        email: charge.billing_details?.email,
        phone: charge.billing_details?.phone,
        address: charge.billing_details?.address
      },
      
      // Payment Intent Reference
      payment_intent_id: charge.payment_intent,
      
      // Customer Details
      customer_id: charge.customer,
      
      // Balance Transaction (for fee analysis)
      balance_transaction_id: charge.balance_transaction,
      
      // Fraud Detection
      fraud_details: charge.fraud_details,
      
      // Dispute Information
      disputed: charge.disputed,
      dispute: charge.dispute
    };

    // Extract payment method details
    if (charge.payment_method_details) {
      chargeDetails.payment_method_details = {
        type: charge.payment_method_details.type
      };

      // Card-specific details
      if (charge.payment_method_details.card) {
        chargeDetails.payment_method_details.card = {
          brand: charge.payment_method_details.card.brand,
          country: charge.payment_method_details.card.country,
          exp_month: charge.payment_method_details.card.exp_month,
          exp_year: charge.payment_method_details.card.exp_year,
          funding: charge.payment_method_details.card.funding,
          last4: charge.payment_method_details.card.last4,
          network: charge.payment_method_details.card.network,
          wallet: charge.payment_method_details.card.wallet,
          three_d_secure: charge.payment_method_details.card.three_d_secure
        };
      }

      // Other payment method types (for future expansion)
      if (charge.payment_method_details.type !== 'card' && charge.payment_method_details[charge.payment_method_details.type]) {
        chargeDetails.payment_method_details[charge.payment_method_details.type] = 
          charge.payment_method_details[charge.payment_method_details.type];
      }
    }

    // Risk Assessment
    if (charge.outcome) {
      chargeDetails.risk_assessment = {
        network_status: charge.outcome.network_status,
        reason: charge.outcome.reason,
        risk_level: charge.outcome.risk_level,
        risk_score: charge.outcome.risk_score,
        seller_message: charge.outcome.seller_message,
        type: charge.outcome.type
      };
    }

    return chargeDetails;
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