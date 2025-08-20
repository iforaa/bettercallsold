import { query } from "$lib/database.js";
import {
  jsonResponse,
  badRequestResponse,
  internalServerErrorResponse,
} from "$lib/response.js";
import { DEFAULT_TENANT_ID } from "$lib/constants.js";

/**
 * TEST Enhanced Stripe Webhook Handler (No Signature Verification)
 * 
 * This endpoint allows testing the enhanced webhook processing with rich payment data.
 * Use only for development/testing purposes.
 */
export async function POST({ request }) {
  try {
    const event = await request.json();
    
    console.log("🧪 TEST ENRICHED: Processing webhook event:", event.type);

    // Handle charge.succeeded with rich data extraction
    if (event.type === "charge.succeeded") {
      await handleChargeSucceeded(event.data.object);
    } else {
      console.log("❓ This test endpoint only handles charge.succeeded events");
    }

    return jsonResponse({ received: true, test_mode: true, enriched: true });
  } catch (error) {
    console.error("❌ TEST Enhanced Webhook processing error:", error);
    return internalServerErrorResponse(`Test webhook processing failed: ${error.message}`);
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
      data_version: "v2_charge_enriched_test"
    };
    
    // Log detailed charge information
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
          metadata = $6,
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
      
      console.log(`✅ Enhanced charge data logged with rich payment details:`);
      console.log(`   💳 Card: ${charge.payment_method_details?.card?.brand?.toUpperCase()} ****${charge.payment_method_details?.card?.last4}`);
      console.log(`   🌍 Country: ${charge.payment_method_details?.card?.country}`);
      console.log(`   📅 Expires: ${charge.payment_method_details?.card?.exp_month}/${charge.payment_method_details?.card?.exp_year}`);
      console.log(`   🧾 Receipt: ${charge.receipt_url}`);
      console.log(`   ⚖️ Risk Score: ${charge.outcome?.risk_score}/100`);
      
    } catch (logError) {
      console.log("ℹ️ Enhanced charge details not logged:", logError.message);
    }
    
  } catch (error) {
    console.error("❌ Error handling enhanced charge succeeded:", error);
  }
}