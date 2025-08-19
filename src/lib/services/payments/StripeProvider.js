import { PaymentProvider } from './PaymentProvider.js';
import { stripeService } from '../StripeService.js';

/**
 * Stripe Payment Provider Implementation
 * 
 * Implements the PaymentProvider interface for Stripe payments.
 * Handles credit cards, Apple Pay, Google Pay through Stripe.
 */
export class StripeProvider extends PaymentProvider {
  constructor() {
    super({
      supportedMethods: [
        'stripe_card',
        'card', 
        'apple_pay', 
        'google_pay'
      ],
      supportedCurrencies: [
        'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'sek', 'nok', 'dkk'
      ],
      requiresCustomer: true,
      supportsRefunds: true,
      supportsSavedMethods: true
    });
  }

  // ==========================================
  // Payment Intent Management
  // ==========================================

  async createPaymentIntent({ amount, currency = 'usd', customer_info = {}, metadata = {} }) {
    try {
      this.log('createPaymentIntent', { amount, currency, customer_email: customer_info.email });
      
      this.validateRequired({ amount, currency }, ['amount', 'currency']);
      
      if (!this.supportsCurrency(currency)) {
        throw new Error(`Currency ${currency} is not supported by Stripe`);
      }

      // Create or get customer if customer info provided
      let stripeCustomer = null;
      if (customer_info.email) {
        try {
          stripeCustomer = await stripeService.getOrCreateCustomer({
            email: customer_info.email,
            name: customer_info.name || 'Customer',
            phone: customer_info.phone || null,
            metadata: {
              source: 'multi_provider_system',
              provider: 'stripe',
              ...metadata
            }
          });
          this.log('customer created/found', { customer_id: stripeCustomer.id });
        } catch (error) {
          this.log('customer creation failed, proceeding without customer', { error: error.message });
        }
      }

      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent({
        amount,
        currency,
        customer: stripeCustomer?.id,
        metadata: {
          source: 'multi_provider_system',
          provider: 'stripe',
          customer_email: customer_info.email || 'guest',
          ...metadata
        }
      });

      const response = this.createStandardResponse({
        success: true,
        provider: 'stripe',
        payment_id: paymentIntent.id,
        amount,
        currency,
        data: {
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          customer_id: stripeCustomer?.id || null,
          status: paymentIntent.status,
          amount_cents: paymentIntent.amount,
          stripe_data: paymentIntent
        }
      });

      // Add additional fields for easier access
      response.client_secret = paymentIntent.client_secret;
      response.payment_intent_id = paymentIntent.id;
      response.customer_id = stripeCustomer?.id || null;
      
      return response;

    } catch (error) {
      return this.handleError(error, 'createPaymentIntent');
    }
  }

  // ==========================================
  // Payment Verification
  // ==========================================

  async verifyPayment(paymentData) {
    try {
      this.log('verifyPayment', { payment_intent_id: paymentData.payment_intent_id });
      
      const { payment_intent_id } = paymentData;
      
      if (!payment_intent_id) {
        throw new Error('payment_intent_id is required for Stripe payment verification');
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripeService.retrievePaymentIntent(payment_intent_id);
      
      if (!paymentIntent) {
        throw new Error('Payment intent not found');
      }

      // Check payment status
      if (paymentIntent.status !== 'succeeded') {
        return this.createStandardResponse({
          success: false,
          provider: 'stripe',
          payment_id: paymentIntent.id,
          amount: this.centsToDollars(paymentIntent.amount),
          currency: paymentIntent.currency,
          error: `Payment not completed. Status: ${paymentIntent.status}`,
          data: {
            status: paymentIntent.status,
            stripe_data: paymentIntent
          }
        });
      }

      // Payment successful
      return this.createStandardResponse({
        success: true,
        provider: 'stripe',
        payment_id: paymentIntent.id,
        amount: this.centsToDollars(paymentIntent.amount),
        currency: paymentIntent.currency,
        data: {
          customer_id: paymentIntent.customer,
          status: paymentIntent.status,
          charges: paymentIntent.charges,
          receipt_url: paymentIntent.charges?.data?.[0]?.receipt_url,
          payment_method_id: paymentIntent.payment_method,
          stripe_data: paymentIntent
        }
      });

    } catch (error) {
      return this.handleError(error, 'verifyPayment');
    }
  }

  // ==========================================
  // Refund Processing
  // ==========================================

  async processRefund(paymentId, amount = null) {
    try {
      this.log('processRefund', { payment_id: paymentId, amount });
      
      if (!paymentId) {
        throw new Error('paymentId is required for refund');
      }

      const refund = await stripeService.createRefund(paymentId, amount);

      return this.createStandardResponse({
        success: true,
        provider: 'stripe',
        payment_id: refund.payment_intent,
        amount: this.centsToDollars(refund.amount),
        currency: refund.currency,
        data: {
          refund_id: refund.id,
          status: refund.status,
          reason: refund.reason,
          stripe_data: refund
        }
      });

    } catch (error) {
      return this.handleError(error, 'processRefund');
    }
  }

  // ==========================================
  // Customer Management
  // ==========================================

  async createCustomer(customerData) {
    try {
      this.log('createCustomer', { email: customerData.email });
      
      this.validateRequired(customerData, ['email']);

      const customer = await stripeService.getOrCreateCustomer({
        email: customerData.email,
        name: customerData.name || 'Customer',
        phone: customerData.phone || null,
        metadata: {
          source: 'multi_provider_system',
          provider: 'stripe',
          ...customerData.metadata
        }
      });

      return this.createStandardResponse({
        success: true,
        provider: 'stripe',
        payment_id: null,
        amount: 0,
        currency: 'usd',
        data: {
          customer_id: customer.id,
          email: customer.email,
          name: customer.name,
          stripe_data: customer
        }
      });

    } catch (error) {
      return this.handleError(error, 'createCustomer');
    }
  }

  // ==========================================
  // Saved Payment Methods
  // ==========================================

  async getPaymentMethods(customerId) {
    try {
      this.log('getPaymentMethods', { customer_id: customerId });
      
      if (!customerId) {
        throw new Error('customerId is required');
      }

      // Retrieve payment methods from Stripe
      const paymentMethods = await stripeService.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      // Transform to standard format
      const standardMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        provider: 'stripe',
        type: 'card',
        display_name: `${pm.card.brand.toUpperCase()} ****${pm.card.last4}`,
        card_brand: pm.card.brand,
        card_last4: pm.card.last4,
        card_exp_month: pm.card.exp_month,
        card_exp_year: pm.card.exp_year,
        is_default: false, // Stripe doesn't have a default concept
        provider_data: pm
      }));

      return standardMethods;

    } catch (error) {
      this.log('getPaymentMethods failed', { error: error.message });
      return [];
    }
  }

  async savePaymentMethod(customerId, paymentMethodId) {
    try {
      this.log('savePaymentMethod', { customer_id: customerId, payment_method_id: paymentMethodId });
      
      this.validateRequired({ customerId, paymentMethodId }, ['customerId', 'paymentMethodId']);

      const paymentMethod = await stripeService.attachPaymentMethodToCustomer(paymentMethodId, customerId);

      return {
        id: paymentMethod.id,
        provider: 'stripe',
        type: paymentMethod.type,
        display_name: paymentMethod.type === 'card' 
          ? `${paymentMethod.card.brand.toUpperCase()} ****${paymentMethod.card.last4}`
          : paymentMethod.type.toUpperCase(),
        card_brand: paymentMethod.card?.brand,
        card_last4: paymentMethod.card?.last4,
        card_exp_month: paymentMethod.card?.exp_month,
        card_exp_year: paymentMethod.card?.exp_year,
        is_default: false,
        provider_data: paymentMethod
      };

    } catch (error) {
      this.log('savePaymentMethod failed', { error: error.message });
      throw error;
    }
  }

  async deletePaymentMethod(paymentMethodId) {
    try {
      this.log('deletePaymentMethod', { payment_method_id: paymentMethodId });
      
      if (!paymentMethodId) {
        throw new Error('paymentMethodId is required');
      }

      await stripeService.detachPaymentMethodFromCustomer(paymentMethodId);
      
      return true;

    } catch (error) {
      this.log('deletePaymentMethod failed', { error: error.message });
      return false;
    }
  }

  // ==========================================
  // Stripe-specific methods
  // ==========================================

  /**
   * Create ephemeral key for mobile apps
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Object>} Ephemeral key response
   */
  async createEphemeralKey(customerId) {
    try {
      this.log('createEphemeralKey', { customer_id: customerId });
      
      if (!customerId) {
        throw new Error('customerId is required for ephemeral key');
      }

      const ephemeralKey = await stripeService.createEphemeralKey(customerId);

      return {
        success: true,
        provider: 'stripe',
        ephemeral_key_secret: ephemeralKey.secret,
        customer_id: customerId,
        provider_data: ephemeralKey
      };

    } catch (error) {
      return this.handleError(error, 'createEphemeralKey');
    }
  }

  /**
   * Get Stripe configuration for frontend
   * @returns {Object} Stripe configuration
   */
  getConfig() {
    return {
      provider: 'stripe',
      publishable_key: stripeService.getPublishableKey(),
      supported_methods: this.getSupportedMethods(),
      supported_currencies: this.getSupportedCurrencies(),
      test_mode: stripeService.isTestMode,
      features: {
        apple_pay: true,
        google_pay: true,
        saved_methods: true,
        ephemeral_keys: true
      }
    };
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Webhook signature
   * @param {string} secret - Webhook secret
   * @returns {Object} Verified webhook event
   */
  verifyWebhookSignature(payload, signature, secret) {
    try {
      return stripeService.verifyWebhookSignature(payload, signature, secret);
    } catch (error) {
      this.log('webhook signature verification failed', { error: error.message });
      throw error;
    }
  }
}