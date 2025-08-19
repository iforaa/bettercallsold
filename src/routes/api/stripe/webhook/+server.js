import { query } from '$lib/database.js';
import { stripeService } from '$lib/services/StripeService.js';
import { jsonResponse, badRequestResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

/**
 * Stripe Webhook Handler (Multi-Provider Compatible)
 * 
 * Handles payment updates from Stripe and maintains compatibility 
 * with both legacy and new multi-provider database schema.
 */
export async function POST({ request }) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing Stripe signature');
      return badRequestResponse('Missing Stripe signature');
    }

    // Verify webhook signature
    let event;
    try {
      event = stripeService.constructWebhookEvent(body, signature);
      console.log('✅ Webhook signature verified:', event.type);
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return badRequestResponse('Invalid signature');
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      
      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        console.log('📄 Invoice event received:', event.type);
        break;
      
      default:
        console.log('❓ Unhandled webhook event type:', event.type);
    }

    return jsonResponse({ received: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return internalServerErrorResponse('Webhook processing failed');
  }
}

/**
 * Handle successful payment (Multi-provider compatible)
 */
async function handlePaymentSucceeded(paymentIntent) {
  try {
    console.log('💰 Payment succeeded:', paymentIntent.id);

    // Update orders using both legacy and new multi-provider fields
    const updateOrderResult = await query(`
      UPDATE orders 
      SET 
        status = 'paid',
        payment_status = 'succeeded',
        updated_at = NOW()
      WHERE (
        stripe_payment_intent_id = $1 OR 
        provider_payment_id = $1
      ) 
      AND tenant_id = $2
      RETURNING id, status, total_amount, payment_provider
    `, [paymentIntent.id, DEFAULT_TENANT_ID]);

    if (updateOrderResult.rows.length > 0) {
      const order = updateOrderResult.rows[0];
      console.log(`✅ Order ${order.id} status updated to 'paid' - Amount: $${order.total_amount}`);
      
      // Update legacy stripe_transactions table if it exists
      try {
        await query(`
          UPDATE stripe_transactions 
          SET 
            status = 'succeeded',
            updated_at = NOW()
          WHERE stripe_payment_intent_id = $1 AND tenant_id = $2
        `, [paymentIntent.id, DEFAULT_TENANT_ID]);
        console.log('✅ Legacy Stripe transaction record updated');
      } catch (legacyError) {
        // Ignore if legacy table doesn't exist or has issues
        console.log('ℹ️ Legacy stripe_transactions table not updated:', legacyError.message);
      }
      
      // Update new multi-provider payment_transactions table
      try {
        await query(`
          UPDATE payment_transactions 
          SET 
            status = 'succeeded',
            updated_at = NOW()
          WHERE provider_payment_id = $1 AND payment_provider = 'stripe' AND tenant_id = $2
        `, [paymentIntent.id, DEFAULT_TENANT_ID]);
        console.log('✅ Multi-provider transaction record updated');
      } catch (newError) {
        // Ignore if new table doesn't exist yet
        console.log('ℹ️ Multi-provider payment_transactions table not updated:', newError.message);
      }

      // Log to payment_logs for backward compatibility
      try {
        await query(`
          INSERT INTO payment_logs (
            tenant_id, 
            payment_intent_id, 
            amount, 
            currency, 
            status, 
            metadata, 
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          ON CONFLICT (payment_intent_id) 
          DO UPDATE SET status = $5, updated_at = CURRENT_TIMESTAMP
        `, [
          DEFAULT_TENANT_ID,
          paymentIntent.id,
          paymentIntent.amount / 100,
          paymentIntent.currency,
          'succeeded',
          JSON.stringify(paymentIntent.metadata || {})
        ]);
      } catch (logError) {
        console.log('ℹ️ Payment logs not updated:', logError.message);
      }
      
    } else {
      console.warn('⚠️ No order found for payment intent:', paymentIntent.id);
    }

  } catch (error) {
    console.error('❌ Error handling payment succeeded:', error);
  }
}

/**
 * Handle failed payment (Multi-provider compatible)
 */
async function handlePaymentFailed(paymentIntent) {
  try {
    console.log('💔 Payment failed:', paymentIntent.id);

    // Update orders using both legacy and new fields
    const updateOrderResult = await query(`
      UPDATE orders 
      SET 
        status = 'payment_failed',
        payment_status = 'failed',
        updated_at = NOW()
      WHERE (
        stripe_payment_intent_id = $1 OR 
        provider_payment_id = $1
      ) 
      AND tenant_id = $2
      RETURNING id, status, total_amount
    `, [paymentIntent.id, DEFAULT_TENANT_ID]);

    if (updateOrderResult.rows.length > 0) {
      const order = updateOrderResult.rows[0];
      console.log(`❌ Order ${order.id} status updated to 'payment_failed'`);
      
      // Update transaction records (both legacy and new)
      await updateTransactionRecords(paymentIntent.id, 'failed');
      
      // Log to payment_logs
      await logPaymentEvent(paymentIntent, 'failed');
    }

  } catch (error) {
    console.error('❌ Error handling payment failed:', error);
  }
}

/**
 * Handle canceled payment (Multi-provider compatible)
 */
async function handlePaymentCanceled(paymentIntent) {
  try {
    console.log('🚫 Payment canceled:', paymentIntent.id);

    const updateOrderResult = await query(`
      UPDATE orders 
      SET 
        status = 'canceled',
        payment_status = 'canceled',
        updated_at = NOW()
      WHERE (
        stripe_payment_intent_id = $1 OR 
        provider_payment_id = $1
      ) 
      AND tenant_id = $2
      RETURNING id, status
    `, [paymentIntent.id, DEFAULT_TENANT_ID]);

    if (updateOrderResult.rows.length > 0) {
      const order = updateOrderResult.rows[0];
      console.log(`🚫 Order ${order.id} status updated to 'canceled'`);
      
      // Update transaction records
      await updateTransactionRecords(paymentIntent.id, 'canceled');
      
      // Log to payment_logs
      await logPaymentEvent(paymentIntent, 'canceled');
    }

  } catch (error) {
    console.error('❌ Error handling payment canceled:', error);
  }
}

/**
 * Handle charge disputes (chargebacks)
 */
async function handleChargeDispute(charge) {
  try {
    console.log('⚠️ Charge dispute created:', charge.id);

    const paymentIntentId = charge.payment_intent;
    
    if (paymentIntentId) {
      const updateOrderResult = await query(`
        UPDATE orders 
        SET 
          status = 'disputed',
          payment_status = 'disputed',
          updated_at = NOW()
        WHERE (
          stripe_payment_intent_id = $1 OR 
          provider_payment_id = $1
        ) 
        AND tenant_id = $2
        RETURNING id, status
      `, [paymentIntentId, DEFAULT_TENANT_ID]);

      if (updateOrderResult.rows.length > 0) {
        const order = updateOrderResult.rows[0];
        console.log(`⚠️ Order ${order.id} status updated to 'disputed'`);
        
        // Update transaction records
        await updateTransactionRecords(paymentIntentId, 'disputed');
      }
    }

  } catch (error) {
    console.error('❌ Error handling charge dispute:', error);
  }
}

/**
 * Helper function to update transaction records (both legacy and new)
 */
async function updateTransactionRecords(paymentIntentId, status) {
  // Update legacy stripe_transactions
  try {
    await query(`
      UPDATE stripe_transactions 
      SET status = $1, updated_at = NOW()
      WHERE stripe_payment_intent_id = $2 AND tenant_id = $3
    `, [status, paymentIntentId, DEFAULT_TENANT_ID]);
  } catch (error) {
    // Ignore if legacy table doesn't exist
  }

  // Update new payment_transactions
  try {
    await query(`
      UPDATE payment_transactions 
      SET status = $1, updated_at = NOW()
      WHERE provider_payment_id = $2 AND payment_provider = 'stripe' AND tenant_id = $3
    `, [status, paymentIntentId, DEFAULT_TENANT_ID]);
  } catch (error) {
    // Ignore if new table doesn't exist
  }
}

/**
 * Helper function to log payment events
 */
async function logPaymentEvent(paymentIntent, status) {
  try {
    await query(`
      INSERT INTO payment_logs (
        tenant_id, 
        payment_intent_id, 
        amount, 
        currency, 
        status, 
        metadata, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (payment_intent_id) 
      DO UPDATE SET status = $5, updated_at = CURRENT_TIMESTAMP
    `, [
      DEFAULT_TENANT_ID,
      paymentIntent.id,
      paymentIntent.amount / 100,
      paymentIntent.currency,
      status,
      JSON.stringify(paymentIntent.metadata || {})
    ]);
  } catch (error) {
    // Ignore logging errors
  }
}