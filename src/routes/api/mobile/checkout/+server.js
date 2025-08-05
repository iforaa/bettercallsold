import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function POST({ request }) {
	try {
		const body = await request.json();
		const { 
			payment_method = 'apple_pay',
			shipping_address,
			billing_address,
			customer_info = {},
			apple_pay_token,
			payment_nonce // For other payment methods
		} = body;

		// Validate required fields
		if (!shipping_address) {
			return badRequestResponse('Shipping address is required');
		}

		// Get current cart items
		const cartQuery = `
			SELECT 
				c.id as cart_id,
				c.product_id,
				c.quantity,
				c.variant_data,
				c.created_at,
				c.user_id,
				p.name as product_name,
				p.price,
				p.images
			FROM cart_items c
			LEFT JOIN products p ON c.product_id = p.id
			WHERE c.tenant_id = $1 AND c.user_id = $2
			ORDER BY c.created_at DESC
		`;
		
		const cartResult = await query(cartQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);
		
		if (cartResult.rows.length === 0) {
			return badRequestResponse('Cart is empty');
		}

		// Calculate order totals
		let subtotal = 0;
		const orderItems = [];

		for (const item of cartResult.rows) {
			// Parse variant data
			let variantData = {};
			try {
				variantData = item.variant_data ? (typeof item.variant_data === 'string' ? JSON.parse(item.variant_data) : item.variant_data) : {};
			} catch (e) {
				variantData = {};
			}

			// Handle price - ensure it's a number
			let variantPrice = 0;
			if (variantData.price) {
				variantPrice = typeof variantData.price === 'string' ? parseFloat(variantData.price) : variantData.price;
			} else if (item.price) {
				variantPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
			}

			subtotal += variantPrice * item.quantity;
			
			orderItems.push({
				product_id: item.product_id,
				quantity: item.quantity,
				price: variantPrice,
				variant_data: variantData
			});
		}

		const shipping = 0; // Free shipping
		const tax = subtotal * 0.08; // 8% tax
		const total = subtotal + shipping + tax;

		// Generate unique order ID
		const orderId = crypto.randomUUID();

		// Prepare customer information
		const customerName = customer_info.name || 'Guest Customer';
		const customerEmail = customer_info.email || '';
		const customerPhone = customer_info.phone || '';

		// Create shipping address JSON
		const shippingAddressJson = JSON.stringify({
			name: shipping_address.name || customerName,
			address_line_1: shipping_address.address_line_1,
			address_line_2: shipping_address.address_line_2 || '',
			city: shipping_address.city,
			state: shipping_address.state,
			postal_code: shipping_address.postal_code,
			country: shipping_address.country || 'US',
			phone: shipping_address.phone || customerPhone
		});

		// Create billing address JSON (use shipping if not provided)
		const billingAddressJson = JSON.stringify(billing_address || shipping_address);

		// Generate payment ID (in production, this would come from payment processor)
		const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Begin transaction
		await query('BEGIN');

		try {
			// Create order
			const createOrderQuery = `
				INSERT INTO orders (
					id, 
					tenant_id, 
					user_id, 
					status, 
					total_amount, 
					subtotal_amount,
					tax_amount,
					shipping_amount,
					shipping_address, 
					billing_address,
					payment_method, 
					payment_id,
					customer_name,
					customer_email,
					customer_phone,
					created_at,
					updated_at
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
				)
				RETURNING id, created_at
			`;

			const orderResult = await query(createOrderQuery, [
				orderId,
				DEFAULT_TENANT_ID,
				DEFAULT_MOBILE_USER_ID,
				'pending_payment', // Status
				total,
				subtotal,
				tax,
				shipping,
				shippingAddressJson,
				billingAddressJson,
				payment_method,
				paymentId,
				customerName,
				customerEmail,
				customerPhone
			]);

			// Create order items
			for (const item of orderItems) {
				const createOrderItemQuery = `
					INSERT INTO order_items (
						id,
						order_id,
						product_id,
						quantity,
						price,
						variant_data,
						created_at
					) VALUES (
						uuid_generate_v4(),
						$1,
						$2,
						$3,
						$4,
						$5,
						NOW()
					)
				`;

				await query(createOrderItemQuery, [
					orderId,
					item.product_id,
					item.quantity,
					item.price,
					JSON.stringify(item.variant_data)
				]);

				// Reduce inventory if available
				if (item.variant_data.inventory_id) {
					const updateInventoryQuery = `
						UPDATE inventory 
						SET quantity = GREATEST(0, quantity - $1),
							updated_at = NOW()
						WHERE id = $2 AND tenant_id = $3
					`;
					
					await query(updateInventoryQuery, [
						item.quantity,
						item.variant_data.inventory_id,
						DEFAULT_TENANT_ID
					]);
				}
			}

			// Clear cart after successful order creation
			const clearCartQuery = `
				DELETE FROM cart_items 
				WHERE tenant_id = $1 AND user_id = $2
			`;
			
			await query(clearCartQuery, [DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID]);

			// In a real implementation, process payment here
			// For now, we'll simulate successful payment processing
			let orderStatus = 'pending_payment';
			
			if (payment_method === 'apple_pay' && apple_pay_token) {
				// Simulate Apple Pay processing
				console.log('Processing Apple Pay payment:', { apple_pay_token, amount: total });
				orderStatus = 'paid';
			} else if (payment_nonce) {
				// Simulate other payment processing
				console.log('Processing payment:', { payment_nonce, amount: total });
				orderStatus = 'paid';
			}

			// Update order status if payment processed
			if (orderStatus === 'paid') {
				const updateOrderStatusQuery = `
					UPDATE orders 
					SET status = $1, updated_at = NOW()
					WHERE id = $2 AND tenant_id = $3
				`;
				
				await query(updateOrderStatusQuery, [orderStatus, orderId, DEFAULT_TENANT_ID]);
			}

			// Commit transaction
			await query('COMMIT');

			// Return success response
			const response = {
				success: true,
				order_id: orderId,
				status: orderStatus,
				total_amount: total,
				subtotal_amount: subtotal,
				tax_amount: tax,
				shipping_amount: shipping,
				payment_id: paymentId,
				payment_method: payment_method,
				created_at: orderResult.rows[0].created_at,
				message: orderStatus === 'paid' ? 'Order placed successfully!' : 'Order created, payment pending'
			};

			return jsonResponse(response);

		} catch (error) {
			// Rollback transaction on error
			await query('ROLLBACK');
			throw error;
		}

	} catch (error) {
		console.error('Checkout error:', error);
		return internalServerErrorResponse('Failed to process checkout: ' + error.message);
	}
}