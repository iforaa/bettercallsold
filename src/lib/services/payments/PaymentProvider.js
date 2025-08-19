/**
 * Abstract Payment Provider Base Class
 * 
 * This class defines the interface that all payment providers must implement.
 * It provides a standardized way to interact with different payment services
 * like Stripe, PayPal, Klarna, etc.
 */
export class PaymentProvider {
  constructor(config = {}) {
    this.config = config;
    this.providerName = this.constructor.name.replace('Provider', '').toLowerCase();
  }

  // ==========================================
  // Abstract methods - Must be implemented by concrete providers
  // ==========================================

  /**
   * Create a payment intent/session for checkout
   * @param {Object} params - Payment parameters
   * @param {number} params.amount - Amount in dollars (will be converted to cents internally)
   * @param {string} params.currency - Currency code (e.g., 'usd')
   * @param {Object} params.customer_info - Customer information
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<PaymentIntentResponse>}
   */
  async createPaymentIntent({ amount, currency, customer_info, metadata }) {
    throw new Error(`createPaymentIntent must be implemented by ${this.constructor.name}`);
  }

  /**
   * Verify and retrieve payment status
   * @param {Object} paymentData - Payment data to verify
   * @returns {Promise<PaymentVerificationResponse>}
   */
  async verifyPayment(paymentData) {
    throw new Error(`verifyPayment must be implemented by ${this.constructor.name}`);
  }

  /**
   * Process a refund for a payment
   * @param {string} paymentId - Payment ID to refund
   * @param {number} amount - Amount to refund (optional, full refund if not specified)
   * @returns {Promise<RefundResponse>}
   */
  async processRefund(paymentId, amount = null) {
    throw new Error(`processRefund must be implemented by ${this.constructor.name}`);
  }

  /**
   * Create or get customer in the payment provider
   * @param {Object} customerData - Customer information
   * @returns {Promise<CustomerResponse>}
   */
  async createCustomer(customerData) {
    throw new Error(`createCustomer must be implemented by ${this.constructor.name}`);
  }

  /**
   * Get saved payment methods for a customer
   * @param {string} customerId - Provider's customer ID
   * @returns {Promise<PaymentMethod[]>}
   */
  async getPaymentMethods(customerId) {
    throw new Error(`getPaymentMethods must be implemented by ${this.constructor.name}`);
  }

  /**
   * Save a payment method for a customer
   * @param {string} customerId - Provider's customer ID
   * @param {string} paymentMethodId - Payment method to save
   * @returns {Promise<PaymentMethod>}
   */
  async savePaymentMethod(customerId, paymentMethodId) {
    throw new Error(`savePaymentMethod must be implemented by ${this.constructor.name}`);
  }

  /**
   * Delete a saved payment method
   * @param {string} paymentMethodId - Payment method to delete
   * @returns {Promise<boolean>}
   */
  async deletePaymentMethod(paymentMethodId) {
    throw new Error(`deletePaymentMethod must be implemented by ${this.constructor.name}`);
  }

  // ==========================================
  // Concrete methods - Common functionality
  // ==========================================

  /**
   * Get the provider name
   * @returns {string}
   */
  getProviderName() {
    return this.providerName;
  }

  /**
   * Get supported payment methods
   * @returns {string[]}
   */
  getSupportedMethods() {
    return this.config.supportedMethods || [];
  }

  /**
   * Get supported currencies
   * @returns {string[]}
   */
  getSupportedCurrencies() {
    return this.config.supportedCurrencies || ['usd'];
  }

  /**
   * Check if payment method is supported
   * @param {string} method - Payment method to check
   * @returns {boolean}
   */
  supportsPaymentMethod(method) {
    return this.getSupportedMethods().includes(method);
  }

  /**
   * Check if currency is supported
   * @param {string} currency - Currency to check
   * @returns {boolean}
   */
  supportsCurrency(currency) {
    return this.getSupportedCurrencies().includes(currency.toLowerCase());
  }

  /**
   * Convert dollars to cents (for providers that use cents)
   * @param {number} dollars - Amount in dollars
   * @returns {number} Amount in cents
   */
  dollarsToCents(dollars) {
    return Math.round(dollars * 100);
  }

  /**
   * Convert cents to dollars
   * @param {number} cents - Amount in cents
   * @returns {number} Amount in dollars
   */
  centsToDollars(cents) {
    return cents / 100;
  }

  /**
   * Generate standard payment response
   * @param {Object} params - Response parameters
   * @returns {Object} Standardized response
   */
  createStandardResponse({ success, provider, payment_id, amount, currency, error, data }) {
    return {
      success: success || false,
      provider: provider || this.getProviderName(),
      payment_id: payment_id || null,
      amount: amount || 0,
      currency: currency || 'usd',
      error: error || null,
      provider_data: data || {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log provider activity
   * @param {string} action - Action being performed
   * @param {Object} data - Data to log
   */
  log(action, data = {}) {
    console.log(`[${this.getProviderName().toUpperCase()}] ${action}:`, data);
  }

  /**
   * Handle provider errors
   * @param {Error} error - Error to handle
   * @param {string} action - Action that caused the error
   */
  handleError(error, action) {
    console.error(`[${this.getProviderName().toUpperCase()}] ${action} failed:`, error);
    return this.createStandardResponse({
      success: false,
      error: error.message || 'Unknown error occurred'
    });
  }

  /**
   * Validate required parameters
   * @param {Object} params - Parameters to validate
   * @param {string[]} required - Required parameter names
   * @throws {Error} If required parameters are missing
   */
  validateRequired(params, required) {
    const missing = required.filter(key => !params[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
  }
}

// ==========================================
// TypeScript-style interfaces for documentation
// ==========================================

/**
 * @typedef {Object} PaymentIntentResponse
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} provider - Payment provider name
 * @property {string} payment_intent_id - Provider's payment intent ID
 * @property {string} client_secret - Client secret for frontend integration
 * @property {number} amount - Payment amount in dollars
 * @property {string} currency - Currency code
 * @property {string} status - Payment status
 * @property {string} [customer_id] - Provider's customer ID if applicable
 * @property {Object} provider_data - Provider-specific data
 */

/**
 * @typedef {Object} PaymentVerificationResponse
 * @property {boolean} success - Whether verification succeeded
 * @property {string} provider - Payment provider name
 * @property {string} payment_id - Provider's payment ID
 * @property {number} amount - Payment amount in dollars
 * @property {string} currency - Currency code
 * @property {string} [customer_id] - Provider's customer ID if applicable
 * @property {string} [error] - Error message if verification failed
 * @property {Object} provider_data - Provider-specific data
 */

/**
 * @typedef {Object} RefundResponse
 * @property {boolean} success - Whether refund succeeded
 * @property {string} provider - Payment provider name
 * @property {string} refund_id - Provider's refund ID
 * @property {number} amount - Refunded amount in dollars
 * @property {string} [error] - Error message if refund failed
 * @property {Object} provider_data - Provider-specific data
 */

/**
 * @typedef {Object} CustomerResponse
 * @property {boolean} success - Whether customer creation succeeded
 * @property {string} provider - Payment provider name
 * @property {string} customer_id - Provider's customer ID
 * @property {string} [error] - Error message if creation failed
 * @property {Object} provider_data - Provider-specific data
 */

/**
 * @typedef {Object} PaymentMethod
 * @property {string} id - Payment method ID
 * @property {string} provider - Payment provider name
 * @property {string} type - Payment method type (card, paypal, etc.)
 * @property {string} display_name - Human-readable display name
 * @property {boolean} is_default - Whether this is the default payment method
 * @property {Object} provider_data - Provider-specific data
 */