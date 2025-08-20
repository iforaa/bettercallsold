import { CartService } from '$lib/services/CartService.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

export async function GET({ url }) {
	try {
		// Get cart using new CartService - eliminates all duplicate logic!
		const cart = await CartService.getCart(DEFAULT_MOBILE_USER_ID);
		
		// Extract data for response formatting
		const cartProducts = cart.cart_items;
		const { subtotal, tax, shipping, discount_amount: discountAmount, credits_applied: creditsApplied, total } = cart.pricing;
		const appliedDiscount = cart.applied_discount;

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
			coupon: appliedDiscount ? {
				code: appliedDiscount.code,
				title: appliedDiscount.title,
				discount_amount: discountAmount, // Use dynamically calculated amount
				amount_label: `-$${discountAmount.toFixed(2)}`
			} : null,
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
			purchase_protection_fees: [],
			pricing: {
				subtotal,
				tax,
				shipping,
				discount_amount: discountAmount,
				credits_applied: creditsApplied,
				total
			}
		};

		return jsonResponse(response);
	} catch (error) {
		console.error('Get cart error:', error);
		return internalServerErrorResponse('Failed to fetch cart');
	}
}