import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';
import { stripeService } from '$lib/services/StripeService.js';

export async function GET({ params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), { 
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Add timeout to database queries
    const orderQueryPromise = query(QUERIES.GET_ORDER_BY_ID, [id, DEFAULT_TENANT_ID]);
    const itemsQueryPromise = query(QUERIES.GET_ORDER_ITEMS, [id]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );
    
    const orderResult = await Promise.race([orderQueryPromise, timeoutPromise]);
    
    if (orderResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { 
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Get order items
    const itemsResult = await Promise.race([itemsQueryPromise, timeoutPromise]);
    
    // Get payment details - prioritize live Stripe data, fallback to database
    let paymentDetails = null;
    let paymentIntentId = null;
    
    // First, get the payment intent ID from the order
    try {
      const order = orderResult.rows[0];
      console.log('📋 Order payment fields:', {
        stripe_payment_intent_id: order.stripe_payment_intent_id,
        provider_payment_id: order.provider_payment_id,
        payment_id: order.payment_id,
        payment_method: order.payment_method,
        payment_status: order.payment_status
      });

      if (order.stripe_payment_intent_id) {
        paymentIntentId = order.stripe_payment_intent_id;
        console.log(`🎯 Using stripe_payment_intent_id: ${paymentIntentId}`);
      } else if (order.provider_payment_id) {
        paymentIntentId = order.provider_payment_id;
        console.log(`🎯 Using provider_payment_id: ${paymentIntentId}`);
      } else if (order.payment_id) {
        // Handle both string and object types for payment_id
        paymentIntentId = typeof order.payment_id === 'object' && order.payment_id?.String 
          ? order.payment_id.String 
          : order.payment_id;
        console.log(`🎯 Using payment_id: ${paymentIntentId}`);
      }
      
      console.log(`🔍 Final payment intent ID to use: ${paymentIntentId}`);
    } catch (idError) {
      console.warn('Could not extract payment intent ID from order:', idError);
    }

    // Try to get live payment details from Stripe first
    if (paymentIntentId) {
      try {
        console.log(`🔷 Fetching live payment details from Stripe for: ${paymentIntentId}`);
        const stripePaymentDetails = await stripeService.getPaymentDetails(paymentIntentId);
        
        paymentDetails = {
          payment_intent_id: stripePaymentDetails.payment_intent.id,
          amount: stripePaymentDetails.payment_intent.amount,
          currency: stripePaymentDetails.payment_intent.currency,
          payment_status: stripePaymentDetails.payment_intent.status,
          payment_created_at: new Date(stripePaymentDetails.payment_intent.created * 1000).toISOString(),
          payment_updated_at: new Date().toISOString(),
          source: 'stripe_live_api',
          
          // Extract charge details if available
          ...(stripePaymentDetails.charge && {
            card_details: stripePaymentDetails.charge.payment_method_details?.card,
            receipt_url: stripePaymentDetails.charge.receipt_url,
            receipt_number: stripePaymentDetails.charge.receipt_number,
            receipt_email: stripePaymentDetails.charge.receipt_email,
            billing_details: stripePaymentDetails.charge.billing_details,
            risk_assessment: stripePaymentDetails.charge.risk_assessment
          })
        };
        
        console.log(`✅ Successfully fetched live payment details from Stripe`);
        
      } catch (stripeError) {
        console.warn(`⚠️ Could not fetch live Stripe data for ${paymentIntentId}:`, stripeError.message);
        console.log('🔄 Falling back to database payment_logs...');
        
        // Fallback to database payment_logs
        try {
          const paymentQueryPromise = query(`
            SELECT 
              payment_intent_id,
              amount,
              currency,
              status as payment_status,
              metadata,
              created_at as payment_created_at,
              updated_at as payment_updated_at
            FROM payment_logs 
            WHERE tenant_id = $1 
            AND (
              payment_intent_id IN (
                SELECT DISTINCT UNNEST(ARRAY[
                  stripe_payment_intent_id, 
                  provider_payment_id, 
                  payment_id
                ]) 
                FROM orders 
                WHERE id = $2
              )
              OR payment_intent_id = (
                SELECT stripe_payment_intent_id 
                FROM orders 
                WHERE id = $2 AND stripe_payment_intent_id IS NOT NULL
              )
            )
            ORDER BY created_at DESC 
            LIMIT 1
          `, [DEFAULT_TENANT_ID, id]);
          
          const paymentResult = await Promise.race([paymentQueryPromise, timeoutPromise]);
          if (paymentResult.rows.length > 0) {
            const paymentLog = paymentResult.rows[0];
            paymentDetails = {
              payment_intent_id: paymentLog.payment_intent_id,
              amount: paymentLog.amount,
              currency: paymentLog.currency,
              payment_status: paymentLog.payment_status,
              payment_created_at: paymentLog.payment_created_at,
              payment_updated_at: paymentLog.payment_updated_at,
              source: 'database_fallback',
              metadata: paymentLog.metadata
            };
            
            // Extract enriched data if available
            if (paymentLog.metadata && typeof paymentLog.metadata === 'object') {
              const metadata = paymentLog.metadata;
              
              // Extract card details
              if (metadata.charge?.payment_method_details?.card) {
                paymentDetails.card_details = {
                  brand: metadata.charge.payment_method_details.card.brand,
                  last4: metadata.charge.payment_method_details.card.last4,
                  country: metadata.charge.payment_method_details.card.country,
                  exp_month: metadata.charge.payment_method_details.card.exp_month,
                  exp_year: metadata.charge.payment_method_details.card.exp_year,
                  funding: metadata.charge.payment_method_details.card.funding,
                  network: metadata.charge.payment_method_details.card.network
                };
              }
              
              // Extract receipt information
              if (metadata.charge?.receipt_url) {
                paymentDetails.receipt_url = metadata.charge.receipt_url;
                paymentDetails.receipt_number = metadata.charge.receipt_number;
                paymentDetails.receipt_email = metadata.charge.receipt_email;
              }
              
              // Extract billing details
              if (metadata.charge?.billing_details) {
                paymentDetails.billing_details = metadata.charge.billing_details;
              }
              
              // Extract risk assessment
              if (metadata.charge?.outcome) {
                paymentDetails.risk_assessment = {
                  risk_level: metadata.charge.outcome.risk_level,
                  risk_score: metadata.charge.outcome.risk_score,
                  network_status: metadata.charge.outcome.network_status,
                  seller_message: metadata.charge.outcome.seller_message
                };
              }
              
              // Extract order breakdown from metadata if available
              if (metadata.order_breakdown) {
                paymentDetails.order_breakdown = metadata.order_breakdown;
              }
            }
            
            console.log('📀 Successfully retrieved payment details from database fallback');
          }
        } catch (dbError) {
          console.warn('❌ Database fallback also failed:', dbError);
        }
      }
    }
    
    // Combine order data with items and payment details
    const orderData = {
      ...orderResult.rows[0],
      items: itemsResult.rows,
      payment_details: paymentDetails
    };

    return jsonResponse(orderData);
  } catch (error) {
    console.error('Get order by ID error:', error);
    
    if (error.message === 'Query timeout') {
      return new Response(JSON.stringify({ error: 'Database timeout' }), { 
        status: 504,
        headers: { 'content-type': 'application/json' }
      });
    }
    
    return internalServerErrorResponse();
  }
}