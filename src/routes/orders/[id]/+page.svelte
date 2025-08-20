<script>
	import { goto } from '$app/navigation';
	import { ordersState, ordersActions } from '$lib/state/orders.svelte.js';
	import { currency, dateTime, getStatusColor, formatPaymentMethod } from '$lib/utils/index';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';

	let { data } = $props();
	
	// Global state is automatically reactive - don't destructure!
	// Destructuring breaks reactivity in Svelte 5

	// Load order data on mount
	$effect(() => {
		ordersActions.loadOrder(data.orderId);
		
		// Cleanup on unmount
		return () => {
			ordersActions.clearCurrentOrder();
		};
	});

	function goBack() {
		// Check if we came from a customer details page
		const from = data.from || new URL(location.href).searchParams.get('from');
		const customerId = data.customerId || new URL(location.href).searchParams.get('customerId');
		
		if (from === 'customer' && customerId) {
			goto(`/customers/${customerId}`);
		} else {
			goto('/orders');
		}
	}

	function goToProduct(productId) {
		if (productId) {
			// Pass order context so product page can navigate back to this order
			goto(`/products/${productId}?from=order&orderId=${data.orderId}`);
		}
	}

	function goToCustomer(customerId) {
		if (customerId) {
			// Pass order context so customer page can navigate back to this order
			goto(`/customers/${customerId}?from=order&orderId=${data.orderId}`);
		}
	}

	// Edit function removed per requirements
</script>

<svelte:head>
	<title>Order Details - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="flex-header">
				<button class="btn btn-secondary" onclick={goBack}>
					← Back to Orders
				</button>
				<h1 class="page-title">
					<span class="page-icon">📋</span>
					Order Details
				</h1>
			</div>
			<div class="page-actions">
				<!-- Edit button removed per requirements -->
			</div>
		</div>
	</div>

	<div class="page-content-padded">
		{#if ordersState.orderError}
			<ErrorState 
				error={ordersState.orderError}
				onRetry={ordersActions.retry}
				onBack={goBack}
				backLabel="Back to Orders"
			/>
		{:else if ordersState.orderLoading}
			<LoadingState 
				message="Loading order details..." 
				size="lg" 
			/>
		{:else if ordersState.currentOrder}
			<div class="content-max-width">
				<div class="header-card">
					<div class="header-card-content">
						<h2 class="header-card-title">Order #{ordersState.currentOrder.id}</h2>
						<div class="header-card-meta">
							<span class="header-card-date">{dateTime(ordersState.currentOrder.created_at)}</span>
							<span class="status-badge {getStatusColor(ordersState.currentOrder.status)}">
								{ordersState.currentOrder.status}
							</span>
						</div>
					</div>
					<div class="header-card-aside">
						<div class="metric-display metric-display-inline">
							<div class="metric-value">{currency(ordersState.currentOrder.total_amount)}</div>
							<div class="metric-label">Total</div>
						</div>
					</div>
				</div>

				<div class="card-group">
					<div class="info-card info-card-clickable">
						<div class="card-header">
							<h3 class="card-title">Customer Information</h3>
						</div>
						<div class="card-body">
							<div class="info-section info-section-clickable" onclick={() => goToCustomer(ordersState.currentOrder.customer_id)}>
								<div class="info-title">{ordersState.currentOrder.customer_name || ordersState.currentOrder.user_name}</div>
								<div class="info-subtitle">{ordersState.currentOrder.customer_email || ordersState.currentOrder.user_email}</div>
								<div class="info-meta">ID: {ordersState.currentOrder.customer_id}</div>
								
								{#if ordersState.currentOrder.shipping_address}
									<div class="address-section">
										<h4 class="address-title">Shipping Address</h4>
										<div class="address-details">
											{#if ordersState.currentOrder.shipping_address.name}
												<div class="address-line">{ordersState.currentOrder.shipping_address.name}</div>
											{/if}
											{#if ordersState.currentOrder.shipping_address.address_line_1}
												<div class="address-line">{ordersState.currentOrder.shipping_address.address_line_1}</div>
											{/if}
											{#if ordersState.currentOrder.shipping_address.address_line_2}
												<div class="address-line">{ordersState.currentOrder.shipping_address.address_line_2}</div>
											{/if}
											{#if ordersState.currentOrder.shipping_address.city || ordersState.currentOrder.shipping_address.state || ordersState.currentOrder.shipping_address.postal_code}
												<div class="address-line">
													{#if ordersState.currentOrder.shipping_address.city}{ordersState.currentOrder.shipping_address.city}{/if}{#if ordersState.currentOrder.shipping_address.city && ordersState.currentOrder.shipping_address.state}, {/if}{#if ordersState.currentOrder.shipping_address.state}{ordersState.currentOrder.shipping_address.state}{/if} {#if ordersState.currentOrder.shipping_address.postal_code}{ordersState.currentOrder.shipping_address.postal_code}{/if}
												</div>
											{/if}
											{#if ordersState.currentOrder.shipping_address.country}
												<div class="address-line">{ordersState.currentOrder.shipping_address.country}</div>
											{/if}
											{#if ordersState.currentOrder.shipping_address.phone}
												<div class="address-line">📞 {ordersState.currentOrder.shipping_address.phone}</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<div class="summary-card">
						<div class="summary-card-section">
							<h3 class="summary-card-title">Order Summary</h3>
							<div class="detail-list">
								<div class="detail-row">
									<span class="detail-label">Order ID:</span>
									<span class="detail-value detail-value-mono">{ordersState.currentOrder.id}</span>
								</div>
								<div class="detail-row">
									<span class="detail-label">Created:</span>
									<span class="detail-value">{dateTime(ordersState.currentOrder.created_at)}</span>
								</div>
								<div class="detail-row">
									<span class="detail-label">Updated:</span>
									<span class="detail-value">{dateTime(ordersState.currentOrder.updated_at)}</span>
								</div>
								<div class="detail-row">
									<span class="detail-label">Payment Method:</span>
									<span class="detail-value">{formatPaymentMethod(ordersState.currentOrder.payment_method)}</span>
								</div>
								{#if ordersState.currentOrder.payment_id && ordersState.currentOrder.payment_id.Valid && ordersState.currentOrder.payment_id.String}
									<div class="detail-row">
										<span class="detail-label">Payment ID:</span>
										<span class="detail-value detail-value-mono">{ordersState.currentOrder.payment_id.String}</span>
									</div>
								{/if}
								<div class="detail-row">
									<span class="detail-label">Status:</span>
									<span class="detail-value">
										<span class="status-badge {getStatusColor(ordersState.currentOrder.status)}">
											{ordersState.currentOrder.status}
										</span>
									</span>
								</div>

								<!-- Order Breakdown -->
								<div class="detail-divider"></div>
								
								<!-- Subtotal (prefer database, fallback to payment details) -->
								{#if (ordersState.currentOrder.subtotal_amount && ordersState.currentOrder.subtotal_amount > 0) || ordersState.currentOrder.payment_details?.order_breakdown?.subtotal}
									<div class="detail-row">
										<span class="detail-label">Subtotal:</span>
										<span class="detail-value">{currency(ordersState.currentOrder.subtotal_amount || ordersState.currentOrder.payment_details?.order_breakdown?.subtotal || 0)}</span>
									</div>
								{/if}

								<!-- Shipping (prefer database, fallback to payment details) -->
								{#if (ordersState.currentOrder.shipping_amount && ordersState.currentOrder.shipping_amount > 0) || ordersState.currentOrder.payment_details?.order_breakdown?.shipping}
									<div class="detail-row">
										<span class="detail-label">Shipping:</span>
										<span class="detail-value">{currency(ordersState.currentOrder.shipping_amount || ordersState.currentOrder.payment_details?.order_breakdown?.shipping || 0)}</span>
									</div>
								{/if}

								<!-- Tax (prefer database, fallback to payment details) -->
								{#if (ordersState.currentOrder.tax_amount && ordersState.currentOrder.tax_amount > 0) || ordersState.currentOrder.payment_details?.order_breakdown?.tax}
									<div class="detail-row">
										<span class="detail-label">Tax:</span>
										<span class="detail-value">{currency(ordersState.currentOrder.tax_amount || ordersState.currentOrder.payment_details?.order_breakdown?.tax || 0)}</span>
									</div>
								{/if}

								<!-- Discount from payment details only (no database field) -->
								{#if ordersState.currentOrder.payment_details?.order_breakdown?.discount}
									<div class="detail-row">
										<span class="detail-label">Discount:</span>
										<span class="detail-value discount-amount">-{currency(ordersState.currentOrder.payment_details.order_breakdown.discount)}</span>
									</div>
								{/if}

								<!-- Payment Provider -->
								{#if ordersState.currentOrder.payment_provider}
									<div class="detail-row">
										<span class="detail-label">Payment Provider:</span>
										<span class="detail-value">{ordersState.currentOrder.payment_provider}</span>
									</div>
								{/if}

								<!-- Customer Phone (from order record) -->
								{#if ordersState.currentOrder.customer_phone}
									<div class="detail-row">
										<span class="detail-label">Customer Phone:</span>
										<span class="detail-value">{ordersState.currentOrder.customer_phone}</span>
									</div>
								{/if}

								<div class="detail-row detail-row-emphasized">
									<span class="detail-label">Total Amount:</span>
									<span class="detail-value">{currency(ordersState.currentOrder.total_amount)}</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Payment Details Section -->
				{#if ordersState.currentOrder.payment_details}
					<div class="card payment-details-card">
						<div class="card-header">
							<h3 class="card-title">Payment Details</h3>
						</div>
						<div class="card-body">
							<div class="payment-details-grid">
								<!-- Card Information -->
								{#if ordersState.currentOrder.payment_details.card_details}
									<div class="payment-section">
										<h4 class="payment-section-title">💳 Card Information</h4>
										<div class="detail-list">
											<div class="detail-row">
												<span class="detail-label">Card:</span>
												<span class="detail-value">
													{ordersState.currentOrder.payment_details.card_details.brand?.toUpperCase()} •••• {ordersState.currentOrder.payment_details.card_details.last4}
												</span>
											</div>
											{#if ordersState.currentOrder.payment_details.card_details.country}
												<div class="detail-row">
													<span class="detail-label">Country:</span>
													<span class="detail-value">{ordersState.currentOrder.payment_details.card_details.country}</span>
												</div>
											{/if}
											{#if ordersState.currentOrder.payment_details.card_details.exp_month && ordersState.currentOrder.payment_details.card_details.exp_year}
												<div class="detail-row">
													<span class="detail-label">Expires:</span>
													<span class="detail-value">{ordersState.currentOrder.payment_details.card_details.exp_month.toString().padStart(2, '0')}/{ordersState.currentOrder.payment_details.card_details.exp_year}</span>
												</div>
											{/if}
											{#if ordersState.currentOrder.payment_details.card_details.funding}
												<div class="detail-row">
													<span class="detail-label">Type:</span>
													<span class="detail-value">{ordersState.currentOrder.payment_details.card_details.funding}</span>
												</div>
											{/if}
											{#if ordersState.currentOrder.payment_details.card_details.network}
												<div class="detail-row">
													<span class="detail-label">Network:</span>
													<span class="detail-value">{ordersState.currentOrder.payment_details.card_details.network}</span>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								<!-- Payment System Details -->
								<div class="payment-section">
									<h4 class="payment-section-title">💰 Payment System</h4>
									<div class="detail-list">
										<div class="detail-row">
											<span class="detail-label">Payment Intent ID:</span>
											<span class="detail-value detail-value-mono">{ordersState.currentOrder.payment_details.payment_intent_id}</span>
										</div>
										<div class="detail-row">
											<span class="detail-label">Amount:</span>
											<span class="detail-value">{currency(ordersState.currentOrder.payment_details.amount)} {ordersState.currentOrder.payment_details.currency?.toUpperCase()}</span>
										</div>
										<div class="detail-row">
											<span class="detail-label">Payment Status:</span>
											<span class="detail-value">
												<span class="status-badge {getStatusColor(ordersState.currentOrder.payment_details.payment_status)}">
													{ordersState.currentOrder.payment_details.payment_status}
												</span>
											</span>
										</div>
										{#if ordersState.currentOrder.payment_details.payment_created_at}
											<div class="detail-row">
												<span class="detail-label">Payment Date:</span>
												<span class="detail-value">{dateTime(ordersState.currentOrder.payment_details.payment_created_at)}</span>
											</div>
										{/if}

										<!-- Receipt Information -->
										{#if ordersState.currentOrder.payment_details.receipt_url}
											<div class="detail-divider"></div>
											<div class="detail-row">
												<span class="detail-label">Receipt:</span>
												<span class="detail-value">
													<a href={ordersState.currentOrder.payment_details.receipt_url} target="_blank" rel="noopener noreferrer" class="receipt-link">
														View Receipt
													</a>
												</span>
											</div>
											{#if ordersState.currentOrder.payment_details.receipt_number}
												<div class="detail-row">
													<span class="detail-label">Receipt #:</span>
													<span class="detail-value detail-value-mono">{ordersState.currentOrder.payment_details.receipt_number}</span>
												</div>
											{/if}
											{#if ordersState.currentOrder.payment_details.receipt_email}
												<div class="detail-row">
													<span class="detail-label">Sent to:</span>
													<span class="detail-value">{ordersState.currentOrder.payment_details.receipt_email}</span>
												</div>
											{/if}
										{/if}

										<!-- Risk Assessment -->
										{#if ordersState.currentOrder.payment_details.risk_assessment}
											<div class="detail-divider"></div>
											{#if ordersState.currentOrder.payment_details.risk_assessment.risk_level}
												<div class="detail-row">
													<span class="detail-label">Risk Level:</span>
													<span class="detail-value risk-level-{ordersState.currentOrder.payment_details.risk_assessment.risk_level}">
														{ordersState.currentOrder.payment_details.risk_assessment.risk_level}
													</span>
												</div>
											{/if}
											{#if ordersState.currentOrder.payment_details.risk_assessment.risk_score}
												<div class="detail-row">
													<span class="detail-label">Risk Score:</span>
													<span class="detail-value">{ordersState.currentOrder.payment_details.risk_assessment.risk_score}/100</span>
												</div>
											{/if}
											{#if ordersState.currentOrder.payment_details.risk_assessment.network_status}
												<div class="detail-row">
													<span class="detail-label">Network Status:</span>
													<span class="detail-value">{ordersState.currentOrder.payment_details.risk_assessment.network_status}</span>
												</div>
											{/if}
										{/if}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<div class="card">
					<div class="card-header">
						<h3 class="card-title">Order Items</h3>
					</div>
					<div class="card-body">
						{#if ordersState.currentOrder.items && ordersState.currentOrder.items.length > 0}
							<div class="item-grid">
								{#each ordersState.currentOrder.items as item}
									<div class="product-card product-card-clickable" onclick={() => goToProduct(item.product_id)}>
										<div class="product-card-image">
											{#if item.product_images && item.product_images.length > 0}
												<img src="{item.product_images[0].url}" alt="{item.product_name}" />
											{:else}
												<div class="product-card-placeholder">📦</div>
											{/if}
										</div>
										<div class="product-card-content">
											<div class="product-card-title">{item.product_name}</div>
											{#if item.variant_data && (item.variant_data.color || item.variant_data.size)}
												<div class="product-card-variants">
													{#if item.variant_data.color}<span class="variant-item">{item.variant_data.color}</span>{/if}
													{#if item.variant_data.size}<span class="variant-item">{item.variant_data.size}</span>{/if}
												</div>
											{/if}
											<div class="product-card-meta">Qty: {item.quantity}</div>
										</div>
										<div class="product-card-price">
											{currency(item.price)}
											{#if item.quantity > 1}
												<div class="product-card-subtotal">Total: {currency(item.price * item.quantity)}</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="empty-state empty-state-inline">
								<div class="empty-icon">📦</div>
								<h3 class="empty-title">No Items Found</h3>
								<p class="empty-description">No items found for this ordersState.currentOrder.</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Product card clickable styling */
	.product-card-clickable {
		cursor: pointer;
		transition: all var(--transition-fast);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}

	.product-card-clickable:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		border-color: var(--color-accent);
	}

	.product-card-clickable:active {
		transform: translateY(0);
		box-shadow: var(--shadow-sm);
	}

	/* Add subtle indication that cards are clickable */
	.product-card-clickable .product-card-title {
		color: var(--color-accent);
		transition: color var(--transition-fast);
	}

	.product-card-clickable:hover .product-card-title {
		color: var(--color-accent-hover);
	}

	/* Address section styling */
	.address-section {
		margin-top: var(--space-4);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-border-subtle);
	}

	.address-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		margin-bottom: var(--space-2);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.address-details {
		color: var(--color-text-primary);
	}

	.address-line {
		margin-bottom: var(--space-1);
		line-height: 1.4;
	}

	.address-line:last-child {
		margin-bottom: 0;
	}

	/* Payment Details Grid */
	.payment-details-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-6);
		align-items: start;
	}

	@media (min-width: 768px) {
		.payment-details-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.payment-section {
		background: var(--color-surface-secondary);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		border: 1px solid var(--color-border-subtle);
	}

	.payment-section-title {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		margin-bottom: var(--space-3);
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	/* Receipt link styling */
	.receipt-link {
		color: var(--color-accent);
		text-decoration: none;
		font-weight: var(--font-weight-medium);
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		transition: color var(--transition-fast);
	}

	.receipt-link:hover {
		color: var(--color-accent-hover);
		text-decoration: underline;
	}

	.receipt-link::after {
		content: '↗';
		font-size: var(--font-size-sm);
		opacity: 0.7;
	}

	/* Risk level styling */
	.risk-level-normal {
		color: var(--color-success);
		font-weight: var(--font-weight-medium);
	}

	.risk-level-elevated {
		color: var(--color-warning);
		font-weight: var(--font-weight-medium);
	}

	.risk-level-highest {
		color: var(--color-danger);
		font-weight: var(--font-weight-medium);
	}

	/* Detail divider */
	.detail-divider {
		height: 1px;
		background: var(--color-border-subtle);
		margin: var(--space-3) 0;
	}

	/* Discount amount styling */
	.discount-amount {
		color: var(--color-success);
		font-weight: var(--font-weight-medium);
	}

	/* Payment Details Card padding fix */
	.payment-details-card {
		margin-bottom: var(--space-8);
	}

	/* Responsive adjustments for mobile */
	@media (max-width: 768px) {
		.flex-header {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}

		.page-actions {
			justify-content: flex-end;
			width: 100%;
		}

		/* Less aggressive hover effects on mobile */
		.product-card-clickable:hover {
			transform: none;
		}
	}
</style>