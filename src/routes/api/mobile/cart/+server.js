import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function GET({ url }) {
	try {
		// Use constant mobile user ID for all cart requests
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
		
		// Transform cart data to match mobile app expectations
		const cartProducts = cartResult.rows.map(item => {
			// Parse images JSON safely, similar to waitlist and product detail API
			let images = [];
			try {
				images = item.images ? (typeof item.images === 'string' ? JSON.parse(item.images) : item.images) : [];
			} catch (e) {
				images = [];
			}
			
			// Extract thumbnail URL properly - handle both string URLs and objects with url property
			const thumbnail = images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : '';
			
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
			
			return {
				thumbnail: thumbnail,
				filename: thumbnail,
				cart_id: item.cart_id,
				product_name: item.product_name || '',
				product_subtitle: '',
				product_id: item.product_id,
				inventory_id: variantData.inventory_id || null,
				created_at: Math.floor(new Date(item.created_at).getTime() / 1000),
				price_label: `$${variantPrice.toFixed(2)}`,
				price: variantPrice,
				quantity: 1, // Each cart item is always quantity 1
				image_width: 400,
				image_height: 400,
				waitlist: 0,
				is_gift_item: false,
				expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
				inventory_not_held_message: null,
				message: null,
				messages: [],
				can_delete: true,
				color: variantData.color || '',
				size: variantData.size || '',
				style: ''
			};
		});

		// Calculate totals - each item has quantity 1, so just sum prices
		const subtotal = cartProducts.reduce((sum, item) => sum + item.price, 0);
		const shipping = 0; // Free shipping for now
		const tax = subtotal * 0.08; // 8% tax
		const total = subtotal + shipping + tax;

		// Construct response similar to CommentSold format
		const response = {
			included_gifts: [],
			earliest_order_expiration: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
			checkout_message: "Complete your purchase",
			store_credit_applied: null,
			tax: {
				title: "Tax",
				amount: tax,
				amount_label: `$${tax.toFixed(2)}`
			},
			subtotal: {
				title: "Subtotal",
				amount: subtotal,
				amount_label: `$${subtotal.toFixed(2)}`
			},
			shipping_total: {
				title: "Shipping",
				amount: shipping,
				amount_label: shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`
			},
			total: {
				title: "Total",
				amount: total,
				amount_label: `$${total.toFixed(2)}`
			},
			is_local_pickup_selected: false,
			apple_pay_option: {
				country_code: "US",
				currency_code: "USD",
				required_billing_contact_fields: ["name", "email"],
				required_shipping_contact_fields: ["name", "phoneNumber", "postalAddress"],
				shipping_methods: [{
					label: "Standard Shipping",
					detail: "5-7 business days",
					amount: shipping,
					shipping_option_id: "standard"
				}],
				payment_summary: {
					title: "BetterCallSold",
					items: [
						{
							label: "Subtotal",
							amount: subtotal
						},
						{
							label: "Shipping",
							amount: shipping
						},
						{
							label: "Tax",
							amount: tax
						}
					]
				}
			},
			coupon: null,
			customer: {
				contact_information: {
					name: "Guest Customer",
					email: "",
					phone_number: null
				},
				addresses: [],
				store_credit: null
			},
			shipments: [{
				shipment_id: 1,
				shipping_title: "Standard Shipping",
				shipping_details: "5-7 business days",
				shipping_fee_label: shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`,
				has_shipment_options: false,
				free_shipping_timer_end: null,
				cart_products: cartProducts
			}],
			purchase_protection_fees: []
		};

		return jsonResponse(response);
	} catch (error) {
		console.error('Get cart error:', error);
		return internalServerErrorResponse('Failed to fetch cart');
	}
}