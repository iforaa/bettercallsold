import { query } from '$lib/database.js';
import { stripeService } from '$lib/services/StripeService.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

/**
 * Get all saved payment methods for the mobile user
 */
export async function GET() {
  try {
    const paymentMethodsQuery = `
      SELECT 
        id,
        payment_provider,
        provider_payment_method_id,
        provider_customer_id,
        payment_method_type,
        display_name,
        card_brand,
        card_last4,
        card_exp_month,
        card_exp_year,
        is_default,
        created_at
      FROM customer_payment_methods
      WHERE tenant_id = $1 AND user_id = $2
      ORDER BY is_default DESC, created_at DESC
    `;

    const result = await query(paymentMethodsQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);

    // Format for backward compatibility
    const formattedMethods = result.rows.map(row => ({
      id: row.id,
      payment_provider: row.payment_provider,
      stripe_payment_method_id: row.provider_payment_method_id, // For backward compatibility
      provider_payment_method_id: row.provider_payment_method_id,
      provider_customer_id: row.provider_customer_id,
      payment_method_type: row.payment_method_type,
      display_name: row.display_name,
      card_brand: row.card_brand,
      card_last4: row.card_last4,
      card_exp_month: row.card_exp_month,
      card_exp_year: row.card_exp_year,
      is_default: row.is_default,
      created_at: row.created_at
    }));

    return jsonResponse({
      success: true,
      payment_methods: formattedMethods
    });

  } catch (error) {
    console.error('❌ Failed to fetch payment methods:', error);
    return internalServerErrorResponse('Failed to fetch payment methods');
  }
}

/**
 * Save a new payment method for the mobile user
 */
export async function POST({ request }) {
  try {
    const {
      stripe_payment_method_id,
      card_brand,
      card_last4,
      card_exp_month,
      card_exp_year,
      is_default = false,
      customer_info = {}
    } = await request.json();

    // Validate required fields
    if (!stripe_payment_method_id || !card_brand || !card_last4 || !card_exp_month || !card_exp_year) {
      return badRequestResponse('Missing required payment method fields');
    }

    console.log(`💳 Saving payment method: ${card_brand} ****${card_last4}`);

    // Create or get Stripe customer and attach payment method
    let stripeCustomerId = null;
    if (customer_info.email && customer_info.name) {
      try {
        console.log('👤 Creating/getting Stripe customer for payment method attachment...');
        
        const stripeCustomer = await stripeService.getOrCreateCustomer({
          email: customer_info.email,
          name: customer_info.name,
          metadata: {
            source: 'mobile_app_payment_method',
            user_id: DEFAULT_MOBILE_USER_ID,
            tenant_id: DEFAULT_TENANT_ID
          }
        });

        stripeCustomerId = stripeCustomer.id;
        console.log(`✅ Customer created/found: ${stripeCustomerId}`);

        // Attach payment method to customer
        console.log('🔗 Attaching payment method to customer...');
        await stripeService.attachPaymentMethodToCustomer(stripe_payment_method_id, stripeCustomerId);
        console.log('✅ Payment method attached to customer');

      } catch (error) {
        console.error('❌ Failed to attach payment method to customer:', error);
        return internalServerErrorResponse('Failed to attach payment method to customer: ' + error.message);
      }
    }

    // Check if we need to unset the current default
    if (is_default) {
      await query(`
        UPDATE customer_payment_methods 
        SET is_default = false 
        WHERE tenant_id = $1 AND user_id = $2 AND is_default = true
      `, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
    }

    // Insert the new payment method using multi-provider structure
    const insertQuery = `
      INSERT INTO customer_payment_methods (
        tenant_id,
        user_id,
        payment_provider,
        provider_customer_id,
        provider_payment_method_id,
        payment_method_type,
        display_name,
        card_brand,
        card_last4,
        card_exp_month,
        card_exp_year,
        is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const displayName = `${card_brand.toUpperCase()} ****${card_last4}`;

    const insertResult = await query(insertQuery, [
      DEFAULT_TENANT_ID,
      DEFAULT_MOBILE_USER_ID,
      'stripe',
      stripeCustomerId,
      stripe_payment_method_id,
      'card',
      displayName,
      card_brand.toLowerCase(),
      card_last4,
      card_exp_month,
      card_exp_year,
      is_default
    ]);

    const savedPaymentMethod = insertResult.rows[0];

    console.log(`✅ Payment method saved with ID: ${savedPaymentMethod.id}`);

    return jsonResponse({
      success: true,
      payment_method: savedPaymentMethod,
      message: 'Payment method saved successfully'
    });

  } catch (error) {
    console.error('❌ Failed to save payment method:', error);
    return internalServerErrorResponse('Failed to save payment method');
  }
}