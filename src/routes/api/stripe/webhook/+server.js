import { query } from "$lib/database.js";
import { stripeService } from "$lib/services/StripeService.js";
import {
  jsonResponse,
  badRequestResponse,
  internalServerErrorResponse,
} from "$lib/response.js";
import { DEFAULT_TENANT_ID, PLUGIN_EVENTS, DEFAULT_MOBILE_USER_ID } from "$lib/constants.js";
import { PluginService } from "$lib/services/PluginService.js";

/**
 * Stripe Webhook Handler (Multi-Provider Compatible)
 *
 * Handles payment updates from Stripe and maintains compatibility
 * with both legacy and new multi-provider database schema.
 */
export async function POST({ request }) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("❌ Missing Stripe signature");
      return badRequestResponse("Missing Stripe signature");
    }

    // Verify webhook signature
    let event;
    try {
      event = stripeService.constructWebhookEvent(body, signature);
      console.log("✅ Webhook signature verified:", event.type);
    } catch (error) {
      console.error("❌ Webhook signature verification failed:", error);
      return badRequestResponse("Invalid signature");
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.created":
        await handlePaymentIntentCreated(event.data.object);
        break;

      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      case "payment_intent.canceled":
        await handlePaymentCanceled(event.data.object);
        break;

      case "charge.succeeded":
        await handleChargeSucceeded(event.data.object);
        break;

      case "charge.dispute.created":
        await handleChargeDispute(event.data.object);
        break;

      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        console.log("📄 Invoice event received:", event.type);
        break;

      default:
        console.log("❓ Unhandled webhook event type:", event.type);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return internalServerErrorResponse("Webhook processing failed");
  }
}

/**
 * Handle payment intent created (for tracking)
 */
async function handlePaymentIntentCreated(paymentIntent) {
  try {
    console.log("📋 Payment intent created:", paymentIntent.id, "Amount:", paymentIntent.amount / 100);
    
    // Log to payment_logs for tracking (optional)
    try {
      await query(
        `
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
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      `,
        [
          DEFAULT_TENANT_ID,
          paymentIntent.id,
          paymentIntent.amount / 100,
          paymentIntent.currency,
          paymentIntent.status,
          JSON.stringify(paymentIntent.metadata || {}),
        ],
      );
      console.log("📝 Payment intent logged for tracking");
    } catch (logError) {
      console.log("ℹ️ Payment intent logging skipped:", logError.message);
    }
    
  } catch (error) {
    console.error("❌ Error handling payment intent created:", error);
  }
}

/**
 * Handle successful payment (Multi-provider compatible)
 */
async function handlePaymentSucceeded(paymentIntent) {
  try {
    console.log("💰 Payment succeeded:", paymentIntent.id);

    // Update orders using both legacy and new multi-provider fields
    const updateOrderResult = await query(
      `
      UPDATE orders
      SET
        status = 'paid',
        payment_status = 'succeeded',
        updated_at = NOW()
      WHERE (
        stripe_payment_intent_id = $1 OR
        provider_payment_id = $1 OR
        payment_id = $1
      )
      AND tenant_id = $2
      RETURNING id, status, total_amount, payment_provider
    `,
      [paymentIntent.id, DEFAULT_TENANT_ID],
    );

    if (updateOrderResult.rows.length > 0) {
      const order = updateOrderResult.rows[0];
      console.log(
        `✅ Order ${order.id} status updated to 'paid' - Amount: $${order.total_amount}`,
      );

      // Trigger order.paid plugin event
      try {
        const eventPayload = {
          order_id: order.id,
          user_id: DEFAULT_MOBILE_USER_ID,
          payment_method: order.payment_provider || 'stripe',
          amount_paid: order.total_amount,
          payment_id: paymentIntent.id,
          status: 'paid',
          paid_at: new Date().toISOString()
        };

        await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.ORDER_PAID, eventPayload);
        console.log(`📤 order.paid event triggered for order: ${order.id}`);
      } catch (pluginError) {
        console.error('Error triggering order.paid plugin event:', pluginError);
      }

      // Update new multi-provider payment_transactions table
      try {
        await query(
          `
          UPDATE payment_transactions
          SET
            status = 'succeeded',
            updated_at = NOW()
          WHERE provider_payment_id = $1 AND payment_provider = 'stripe' AND tenant_id = $2
        `,
          [paymentIntent.id, DEFAULT_TENANT_ID],
        );
        console.log("✅ Multi-provider transaction record updated");
      } catch (newError) {
        // Ignore if new table doesn't exist yet
        console.log(
          "ℹ️ Multi-provider payment_transactions table not updated:",
          newError.message,
        );
      }

      // Get additional payment details from the payment intent and latest charge
      const enrichedPaymentData = await enrichPaymentData(paymentIntent);
      
      // Log to payment_logs with enriched data
      try {
        await query(
          `
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
          DO UPDATE SET 
            status = $5, 
            metadata = $6,
            updated_at = CURRENT_TIMESTAMP
        `,
          [
            DEFAULT_TENANT_ID,
            paymentIntent.id,
            paymentIntent.amount / 100,
            paymentIntent.currency,
            "succeeded",
            JSON.stringify(enrichedPaymentData),
          ],
        );
        console.log("✅ Enhanced payment data logged with card details, receipt URL, etc.");
      } catch (logError) {
        console.log("ℹ️ Payment logs not updated:", logError.message);
      }
    } else {
      console.warn("⚠️ No order found for payment intent:", paymentIntent.id);
    }
  } catch (error) {
    console.error("❌ Error handling payment succeeded:", error);
  }
}

/**
 * Handle failed payment (Multi-provider compatible)
 */
async function handlePaymentFailed(paymentIntent) {
  try {
    console.log("💔 Payment failed:", paymentIntent.id);

    // Update orders using both legacy and new fields
    const updateOrderResult = await query(
      `
      UPDATE orders
      SET
        status = 'payment_failed',
        payment_status = 'failed',
        updated_at = NOW()
      WHERE (
        stripe_payment_intent_id = $1 OR
        provider_payment_id = $1 OR
        payment_id = $1
      )
      AND tenant_id = $2
      RETURNING id, status, total_amount
    `,
      [paymentIntent.id, DEFAULT_TENANT_ID],
    );

    if (updateOrderResult.rows.length > 0) {
      const order = updateOrderResult.rows[0];
      console.log(`❌ Order ${order.id} status updated to 'payment_failed'`);

      // Update transaction records (both legacy and new)
      await updateTransactionRecords(paymentIntent.id, "failed");

      // Log to payment_logs
      await logPaymentEvent(paymentIntent, "failed");
    }
  } catch (error) {
    console.error("❌ Error handling payment failed:", error);
  }
}

/**
 * Handle canceled payment (Multi-provider compatible)
 */
async function handlePaymentCanceled(paymentIntent) {
  try {
    console.log("🚫 Payment canceled:", paymentIntent.id);

    const updateOrderResult = await query(
      `
      UPDATE orders
      SET
        status = 'canceled',
        payment_status = 'canceled',
        updated_at = NOW()
      WHERE (
        stripe_payment_intent_id = $1 OR
        provider_payment_id = $1 OR
        payment_id = $1
      )
      AND tenant_id = $2
      RETURNING id, status
    `,
      [paymentIntent.id, DEFAULT_TENANT_ID],
    );

    if (updateOrderResult.rows.length > 0) {
      const order = updateOrderResult.rows[0];
      console.log(`🚫 Order ${order.id} status updated to 'canceled'`);

      // Update transaction records
      await updateTransactionRecords(paymentIntent.id, "canceled");

      // Log to payment_logs
      await logPaymentEvent(paymentIntent, "canceled");
    }
  } catch (error) {
    console.error("❌ Error handling payment canceled:", error);
  }
}

/**
 * Handle charge succeeded (capture rich payment details)
 */
async function handleChargeSucceeded(charge) {
  try {
    console.log("💳 Charge succeeded:", charge.id);
    
    // Extract rich charge information
    const enrichedChargeData = {
      // Original charge metadata
      ...charge.metadata,
      
      // Charge Details
      charge: {
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
        
        // Payment Method Details (Card Info)
        payment_method_details: charge.payment_method_details ? {
          type: charge.payment_method_details.type,
          
          // Card-specific details
          ...(charge.payment_method_details.card && {
            card: {
              brand: charge.payment_method_details.card.brand,
              country: charge.payment_method_details.card.country,
              exp_month: charge.payment_method_details.card.exp_month,
              exp_year: charge.payment_method_details.card.exp_year,
              funding: charge.payment_method_details.card.funding,
              last4: charge.payment_method_details.card.last4,
              network: charge.payment_method_details.card.network,
              wallet: charge.payment_method_details.card.wallet
            }
          })
        } : null,
        
        // Risk Assessment
        outcome: charge.outcome ? {
          network_status: charge.outcome.network_status,
          reason: charge.outcome.reason,
          risk_level: charge.outcome.risk_level,
          risk_score: charge.outcome.risk_score,
          seller_message: charge.outcome.seller_message,
          type: charge.outcome.type
        } : null,
        
        // Payment Intent Reference
        payment_intent_id: charge.payment_intent,
        
        // Balance Transaction (for fee analysis)
        balance_transaction_id: charge.balance_transaction,
        
        // Fraud Detection
        fraud_details: charge.fraud_details,
        
        // Customer Details
        customer_id: charge.customer
      },
      
      // Processing metadata
      webhook_processed_at: new Date().toISOString(),
      data_version: "v2_charge_enriched"
    };
    
    // Log detailed charge information (separate from payment intent logs)
    try {
      await query(
        `
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
        DO UPDATE SET 
          metadata = CASE 
            WHEN payment_logs.metadata->>'data_version' = 'v2_enriched' THEN payment_logs.metadata
            ELSE $6
          END,
          updated_at = CURRENT_TIMESTAMP
      `,
        [
          DEFAULT_TENANT_ID,
          charge.payment_intent || charge.id, // Use payment_intent_id if available, otherwise charge_id
          charge.amount / 100,
          charge.currency,
          "succeeded",
          JSON.stringify(enrichedChargeData),
        ],
      );
      
      console.log(`✅ Detailed charge info logged: ${charge.payment_method_details?.card?.brand} ****${charge.payment_method_details?.card?.last4}`);
      
    } catch (logError) {
      console.log("ℹ️ Charge details not logged:", logError.message);
    }
    
  } catch (error) {
    console.error("❌ Error handling charge succeeded:", error);
  }
}

/**
 * Handle charge disputes (chargebacks)
 */
async function handleChargeDispute(charge) {
  try {
    console.log("⚠️ Charge dispute created:", charge.id);

    const paymentIntentId = charge.payment_intent;

    if (paymentIntentId) {
      const updateOrderResult = await query(
        `
        UPDATE orders
        SET
          status = 'disputed',
          payment_status = 'disputed',
          updated_at = NOW()
        WHERE (
          stripe_payment_intent_id = $1 OR
          provider_payment_id = $1 OR
          payment_id = $1
        )
        AND tenant_id = $2
        RETURNING id, status
      `,
        [paymentIntentId, DEFAULT_TENANT_ID],
      );

      if (updateOrderResult.rows.length > 0) {
        const order = updateOrderResult.rows[0];
        console.log(`⚠️ Order ${order.id} status updated to 'disputed'`);

        // Update transaction records
        await updateTransactionRecords(paymentIntentId, "disputed");
      }
    }
  } catch (error) {
    console.error("❌ Error handling charge dispute:", error);
  }
}

/**
 * Helper function to update transaction records (both legacy and new)
 */
async function updateTransactionRecords(paymentIntentId, status) {
  // Update legacy stripe_transactions
  try {
    await query(
      `
      UPDATE stripe_transactions
      SET status = $1, updated_at = NOW()
      WHERE stripe_payment_intent_id = $2 AND tenant_id = $3
    `,
      [status, paymentIntentId, DEFAULT_TENANT_ID],
    );
  } catch (error) {
    // Ignore if legacy table doesn't exist
  }

  // Update new payment_transactions
  try {
    await query(
      `
      UPDATE payment_transactions
      SET status = $1, updated_at = NOW()
      WHERE provider_payment_id = $2 AND payment_provider = 'stripe' AND tenant_id = $3
    `,
      [status, paymentIntentId, DEFAULT_TENANT_ID],
    );
  } catch (error) {
    // Ignore if new table doesn't exist
  }
}

/**
 * Enrich payment data with additional details from payment intent and charges
 */
async function enrichPaymentData(paymentIntent) {
  try {
    console.log("🔍 Enriching payment data for:", paymentIntent.id);
    
    // Start with the original metadata
    const enrichedData = {
      ...paymentIntent.metadata,
      
      // Payment Intent Details
      payment_intent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created,
        confirmation_method: paymentIntent.confirmation_method,
        capture_method: paymentIntent.capture_method,
        customer_id: paymentIntent.customer
      }
    };

    // If there's a latest_charge, get charge details
    if (paymentIntent.latest_charge) {
      console.log("💳 Fetching charge details:", paymentIntent.latest_charge);
      
      try {
        // Get charge details from Stripe API to get payment method info
        const { stripeService } = await import('$lib/services/StripeService.js');
        const charge = await stripeService.stripe.charges.retrieve(paymentIntent.latest_charge);
        
        enrichedData.charge = {
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
          
          // Payment Method Details (Card Info)
          payment_method_details: charge.payment_method_details ? {
            type: charge.payment_method_details.type,
            
            // Card-specific details
            ...(charge.payment_method_details.card && {
              card: {
                brand: charge.payment_method_details.card.brand,
                country: charge.payment_method_details.card.country,
                exp_month: charge.payment_method_details.card.exp_month,
                exp_year: charge.payment_method_details.card.exp_year,
                funding: charge.payment_method_details.card.funding,
                last4: charge.payment_method_details.card.last4,
                network: charge.payment_method_details.card.network,
                wallet: charge.payment_method_details.card.wallet,
                three_d_secure: charge.payment_method_details.card.three_d_secure
              }
            }),
            
            // Other payment method types (for future expansion)
            ...(charge.payment_method_details.type !== 'card' && {
              [charge.payment_method_details.type]: charge.payment_method_details[charge.payment_method_details.type]
            })
          } : null,
          
          // Risk Assessment  
          outcome: charge.outcome ? {
            network_status: charge.outcome.network_status,
            reason: charge.outcome.reason,
            risk_level: charge.outcome.risk_level,
            risk_score: charge.outcome.risk_score,
            seller_message: charge.outcome.seller_message,
            type: charge.outcome.type
          } : null,
          
          // Balance Transaction (for fee analysis)
          balance_transaction_id: charge.balance_transaction,
          
          // Fraud Detection
          fraud_details: charge.fraud_details,
          
          // Dispute Information
          disputed: charge.disputed,
          dispute: charge.dispute
        };
        
        console.log(`✅ Enriched charge data: ${charge.payment_method_details?.card?.brand} ****${charge.payment_method_details?.card?.last4} (${charge.payment_method_details?.card?.country})`);
        
      } catch (chargeError) {
        console.log("⚠️ Could not fetch charge details:", chargeError.message);
        
        // Fallback: use basic charge info from payment intent
        enrichedData.charge = {
          id: paymentIntent.latest_charge,
          note: "Details not available - charge fetch failed"
        };
      }
    }
    
    // Add processing timestamp
    enrichedData.webhook_processed_at = new Date().toISOString();
    enrichedData.data_version = "v2_enriched";
    
    return enrichedData;
    
  } catch (error) {
    console.error("❌ Error enriching payment data:", error);
    
    // Fallback to basic data if enrichment fails
    return {
      ...paymentIntent.metadata,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      enrichment_error: error.message,
      webhook_processed_at: new Date().toISOString(),
      data_version: "v2_basic"
    };
  }
}

/**
 * Helper function to log payment events
 */
async function logPaymentEvent(paymentIntent, status) {
  try {
    await query(
      `
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
    `,
      [
        DEFAULT_TENANT_ID,
        paymentIntent.id,
        paymentIntent.amount / 100,
        paymentIntent.currency,
        status,
        JSON.stringify(paymentIntent.metadata || {}),
      ],
    );
  } catch (error) {
    // Ignore logging errors
  }
}
