import { StripeProvider } from './StripeProvider.js';
import { PayPalProvider } from './PayPalProvider.js';
import { KlarnaProvider } from './KlarnaProvider.js';
import { query } from '$lib/database.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

/**
 * Payment Provider Factory
 * 
 * Manages payment provider registration, instantiation, and routing.
 * Provides a centralized way to access and configure payment providers.
 */
export class PaymentProviderFactory {
  static providers = new Map();
  static providerInstances = new Map();
  static paymentMethodMap = new Map();

  // Initialize the factory with default providers
  static {
    this.registerProvider('stripe', StripeProvider);
    this.registerProvider('paypal', PayPalProvider);
    this.registerProvider('klarna', KlarnaProvider);

    // Map payment methods to providers
    this.mapPaymentMethods();
  }

  /**
   * Register a payment provider class
   * @param {string} name - Provider name (e.g., 'stripe', 'paypal')
   * @param {class} ProviderClass - Provider class that extends PaymentProvider
   */
  static registerProvider(name, ProviderClass) {
    if (!name || typeof name !== 'string') {
      throw new Error('Provider name must be a non-empty string');
    }

    if (!ProviderClass || typeof ProviderClass !== 'function') {
      throw new Error('Provider class must be a constructor function');
    }

    this.providers.set(name.toLowerCase(), ProviderClass);
    console.log(`✅ Registered payment provider: ${name}`);
  }

  /**
   * Get a provider instance by name
   * @param {string} providerName - Name of the provider
   * @returns {PaymentProvider} Provider instance
   */
  static getProvider(providerName) {
    const normalizedName = providerName?.toLowerCase();
    
    if (!normalizedName) {
      throw new Error('Provider name is required');
    }

    // Return cached instance if available
    if (this.providerInstances.has(normalizedName)) {
      return this.providerInstances.get(normalizedName);
    }

    // Get provider class
    const ProviderClass = this.providers.get(normalizedName);
    if (!ProviderClass) {
      throw new Error(`Payment provider '${providerName}' not found. Available providers: ${this.getSupportedProviders().join(', ')}`);
    }

    // Create and cache instance
    try {
      const instance = new ProviderClass();
      this.providerInstances.set(normalizedName, instance);
      return instance;
    } catch (error) {
      throw new Error(`Failed to instantiate provider '${providerName}': ${error.message}`);
    }
  }

  /**
   * Get provider for a specific payment method
   * @param {string} paymentMethod - Payment method (e.g., 'stripe_card', 'paypal', 'klarna_pay_later')
   * @returns {PaymentProvider} Provider instance
   */
  static getProviderForPaymentMethod(paymentMethod) {
    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }

    const normalizedMethod = paymentMethod.toLowerCase();

    // Check direct method to provider mapping first
    if (this.paymentMethodMap.has(normalizedMethod)) {
      const providerName = this.paymentMethodMap.get(normalizedMethod);
      return this.getProvider(providerName);
    }

    // Check if method starts with provider name
    for (const [providerName] of this.providers) {
      if (normalizedMethod.startsWith(providerName) || normalizedMethod.includes(providerName)) {
        return this.getProvider(providerName);
      }
    }

    throw new Error(`No provider found for payment method: ${paymentMethod}. Supported methods: ${this.getSupportedPaymentMethods().join(', ')}`);
  }

  /**
   * Get all supported provider names
   * @returns {string[]} Array of provider names
   */
  static getSupportedProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all supported payment methods across providers
   * @returns {string[]} Array of payment method names
   */
  static getSupportedPaymentMethods() {
    const methods = new Set();
    
    for (const [providerName] of this.providers) {
      try {
        const provider = this.getProvider(providerName);
        const supportedMethods = provider.getSupportedMethods();
        supportedMethods.forEach(method => methods.add(method));
      } catch (error) {
        console.warn(`Failed to get supported methods for ${providerName}:`, error.message);
      }
    }
    
    return Array.from(methods);
  }

  /**
   * Get all supported currencies across providers
   * @returns {string[]} Array of currency codes
   */
  static getSupportedCurrencies() {
    const currencies = new Set();
    
    for (const [providerName] of this.providers) {
      try {
        const provider = this.getProvider(providerName);
        const supportedCurrencies = provider.getSupportedCurrencies();
        supportedCurrencies.forEach(currency => currencies.add(currency));
      } catch (error) {
        console.warn(`Failed to get supported currencies for ${providerName}:`, error.message);
      }
    }
    
    return Array.from(currencies);
  }

  /**
   * Get enabled providers for a tenant from database
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object[]>} Array of enabled provider configurations
   */
  static async getEnabledProviders(tenantId = DEFAULT_TENANT_ID) {
    try {
      const result = await query(`
        SELECT 
          provider_name,
          provider_config,
          is_enabled,
          is_test_mode,
          supported_methods,
          supported_currencies
        FROM payment_providers 
        WHERE tenant_id = $1 AND is_enabled = true
        ORDER BY provider_name
      `, [tenantId]);

      return result.rows.map(row => ({
        name: row.provider_name,
        config: row.provider_config,
        is_test_mode: row.is_test_mode,
        supported_methods: row.supported_methods,
        supported_currencies: row.supported_currencies
      }));

    } catch (error) {
      console.warn('Failed to get enabled providers from database:', error.message);
      // Return default providers if database query fails
      return [
        {
          name: 'stripe',
          config: {},
          is_test_mode: true,
          supported_methods: ['stripe_card', 'card', 'apple_pay', 'google_pay'],
          supported_currencies: ['usd']
        }
      ];
    }
  }

  /**
   * Enable a provider for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {string} providerName - Provider name
   * @param {Object} config - Provider configuration
   * @returns {Promise<boolean>} Whether the operation succeeded
   */
  static async enableProvider(tenantId, providerName, config = {}) {
    try {
      // Validate that provider exists
      if (!this.providers.has(providerName.toLowerCase())) {
        throw new Error(`Unknown provider: ${providerName}`);
      }

      // Get provider instance to get default config
      const provider = this.getProvider(providerName);
      
      await query(`
        INSERT INTO payment_providers (
          tenant_id, 
          provider_name, 
          provider_config, 
          is_enabled, 
          supported_methods, 
          supported_currencies
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, provider_name) 
        DO UPDATE SET
          provider_config = $3,
          is_enabled = $4,
          supported_methods = $5,
          supported_currencies = $6,
          updated_at = CURRENT_TIMESTAMP
      `, [
        tenantId,
        providerName,
        JSON.stringify(config),
        true,
        provider.getSupportedMethods(),
        provider.getSupportedCurrencies()
      ]);

      console.log(`✅ Enabled provider ${providerName} for tenant ${tenantId}`);
      return true;

    } catch (error) {
      console.error(`Failed to enable provider ${providerName}:`, error);
      return false;
    }
  }

  /**
   * Disable a provider for a tenant
   * @param {string} tenantId - Tenant ID  
   * @param {string} providerName - Provider name
   * @returns {Promise<boolean>} Whether the operation succeeded
   */
  static async disableProvider(tenantId, providerName) {
    try {
      await query(`
        UPDATE payment_providers 
        SET is_enabled = false, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND provider_name = $2
      `, [tenantId, providerName]);

      console.log(`✅ Disabled provider ${providerName} for tenant ${tenantId}`);
      return true;

    } catch (error) {
      console.error(`Failed to disable provider ${providerName}:`, error);
      return false;
    }
  }

  /**
   * Clear provider instance cache (useful for testing or config changes)
   */
  static clearCache() {
    this.providerInstances.clear();
    console.log('🗑️ Cleared provider instance cache');
  }

  /**
   * Map payment methods to their respective providers
   * @private
   */
  static mapPaymentMethods() {
    // Stripe methods
    this.paymentMethodMap.set('stripe_card', 'stripe');
    this.paymentMethodMap.set('card', 'stripe');
    this.paymentMethodMap.set('apple_pay', 'stripe');
    this.paymentMethodMap.set('google_pay', 'stripe');

    // PayPal methods
    this.paymentMethodMap.set('paypal', 'paypal');
    this.paymentMethodMap.set('paypal_credit', 'paypal');
    this.paymentMethodMap.set('paylater', 'paypal');

    // Klarna methods
    this.paymentMethodMap.set('klarna_pay_later', 'klarna');
    this.paymentMethodMap.set('klarna_pay_now', 'klarna');
    this.paymentMethodMap.set('klarna_slice_it', 'klarna');

    console.log(`✅ Mapped ${this.paymentMethodMap.size} payment methods to providers`);
  }

  /**
   * Get configuration for all enabled providers
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Provider configurations
   */
  static async getProviderConfigurations(tenantId = DEFAULT_TENANT_ID) {
    try {
      const enabledProviders = await this.getEnabledProviders(tenantId);
      const configurations = {};

      for (const providerConfig of enabledProviders) {
        try {
          const provider = this.getProvider(providerConfig.name);
          configurations[providerConfig.name] = {
            ...provider.getConfig?.() || {},
            enabled: true,
            test_mode: providerConfig.is_test_mode,
            supported_methods: providerConfig.supported_methods,
            supported_currencies: providerConfig.supported_currencies
          };
        } catch (error) {
          console.warn(`Failed to get config for provider ${providerConfig.name}:`, error.message);
        }
      }

      return configurations;

    } catch (error) {
      console.error('Failed to get provider configurations:', error);
      return {};
    }
  }
}