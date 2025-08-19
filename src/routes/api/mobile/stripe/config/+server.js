import { PaymentProviderFactory } from '$lib/services/payments/PaymentProviderFactory.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

/**
 * Get Payment Provider Configuration
 * 
 * Returns configuration for all enabled payment providers, 
 * with backward compatibility for Stripe-specific requests.
 */
export async function GET() {
  try {
    console.log('🔧 Getting payment provider configuration');

    // Get all provider configurations for the tenant
    const allConfigurations = await PaymentProviderFactory.getProviderConfigurations(DEFAULT_TENANT_ID);
    
    // Get Stripe provider specifically for backward compatibility
    const stripeProvider = PaymentProviderFactory.getProvider('stripe');
    const stripeConfig = stripeProvider.getConfig();
    
    console.log(`✅ Retrieved configuration for ${Object.keys(allConfigurations).length} providers`);

    return jsonResponse({
      success: true,
      
      // Primary response (backward compatible with existing Stripe calls)
      publishable_key: stripeConfig.publishable_key,
      test_mode: stripeConfig.test_mode,
      supported_payment_methods: stripeConfig.supported_methods,
      
      // Multi-provider information
      providers: allConfigurations,
      primary_provider: 'stripe',
      
      // Stripe-specific configuration (for backward compatibility)
      stripe: {
        publishable_key: stripeConfig.publishable_key,
        test_mode: stripeConfig.test_mode,
        supported_methods: stripeConfig.supported_methods,
        supported_currencies: stripeConfig.supported_currencies,
        features: stripeConfig.features
      },
      
      // Future provider configurations (stubs for now)
      paypal: allConfigurations.paypal || {
        enabled: false,
        supported_methods: ['paypal', 'paypal_credit'],
        test_mode: true
      },
      
      klarna: allConfigurations.klarna || {
        enabled: false,
        supported_methods: ['klarna_pay_later', 'klarna_pay_now', 'klarna_slice_it'],
        test_mode: true
      },
      
      // System information
      system_info: {
        multi_provider_enabled: true,
        api_version: 'v2',
        available_providers: PaymentProviderFactory.getSupportedProviders(),
        supported_payment_methods: PaymentProviderFactory.getSupportedPaymentMethods(),
        supported_currencies: PaymentProviderFactory.getSupportedCurrencies()
      }
    });

  } catch (error) {
    console.error('❌ Failed to get payment configuration:', error);
    
    // Fallback to direct Stripe service for critical backward compatibility
    try {
      console.log('🔄 Falling back to direct Stripe configuration');
      
      const { stripeService } = await import('$lib/services/StripeService.js');
      
      return jsonResponse({
        success: true,
        publishable_key: stripeService.getPublishableKey(),
        test_mode: stripeService.isTestMode,
        supported_payment_methods: ['stripe_card', 'card', 'apple_pay', 'google_pay'],
        fallback_mode: true,
        
        stripe: {
          publishable_key: stripeService.getPublishableKey(),
          test_mode: stripeService.isTestMode,
          supported_methods: ['stripe_card', 'card', 'apple_pay', 'google_pay'],
          supported_currencies: ['usd'],
          features: {
            apple_pay: true,
            google_pay: true,
            saved_methods: true,
            ephemeral_keys: true
          }
        }
      });
      
    } catch (fallbackError) {
      console.error('❌ Fallback configuration also failed:', fallbackError);
      return internalServerErrorResponse('Failed to get payment configuration');
    }
  }
}