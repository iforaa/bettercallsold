<script>
	import { goto } from '$app/navigation';
	import { ordersState, ordersActions } from '$lib/state/orders.svelte.js';
	import { currency, dateTime, getStatusColor } from '$lib/utils/index';
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
		goto('/orders');
	}

	function editOrder() {
		alert('Edit order functionality coming soon!');
	}
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
				<button class="btn btn-primary" onclick={editOrder}>
					Edit Order
				</button>
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
						<h2 class="header-card-title">Order #{ordersState.currentOrder.id.slice(0, 8)}...</h2>
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
							<div class="info-section info-section-clickable" onclick={() => goto(`/customers/${ordersState.currentOrder.customer_id}`)}>
								<div class="info-title">{ordersState.currentOrder.customer_name}</div>
								<div class="info-subtitle">{ordersState.currentOrder.customer_email}</div>
								<div class="info-meta">ID: {ordersState.currentOrder.customer_id}</div>
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
									<span class="detail-value detail-value-caps">{ordersState.currentOrder.payment_method}</span>
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
								<div class="detail-row detail-row-emphasized">
									<span class="detail-label">Total Amount:</span>
									<span class="detail-value">{currency(ordersState.currentOrder.total_amount)}</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="card">
					<div class="card-header">
						<h3 class="card-title">Order Items</h3>
					</div>
					<div class="card-body">
						{#if ordersState.currentOrder.items && ordersState.currentOrder.items.length > 0}
							<div class="item-grid">
								{#each ordersState.currentOrder.items as item}
									<div class="product-card">
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
	}
</style>