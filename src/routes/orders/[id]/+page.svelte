<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	let order: any = $state(null);
	let loading = $state(true);
	let error = $state('');

	async function loadOrder() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch(`/api/orders/${data.orderId}`);
			
			if (!response.ok) {
				if (response.status === 404) {
					error = 'Order not found';
				} else {
					throw new Error('Failed to fetch order');
				}
				return;
			}

			const orderData = await response.json();
			order = orderData;
		} catch (err) {
			console.error('Load order error:', err);
			error = 'Failed to load order details';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadOrder();
	});

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString();
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'completed': return 'green';
			case 'pending': return 'orange';
			case 'cancelled': return 'red';
			case 'processing': return 'blue';
			default: return 'gray';
		}
	}

	function goBack() {
		goto('/orders');
	}
</script>

<svelte:head>
	<title>Order Details - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<div class="header-left">
				<button class="back-btn" onclick={goBack}>
					← Back to Orders
				</button>
				<h1>
					<span class="page-icon">📋</span>
					Order Details
				</h1>
			</div>
			<div class="header-right">
				<button class="btn-primary" onclick={() => alert('Edit order functionality coming soon!')}>
					Edit Order
				</button>
			</div>
		</div>
	</div>

	<div class="page-content">
		{#if error}
			<div class="error-state">
				<div class="error-content">
					<div class="error-icon">⚠️</div>
					<h3>Error</h3>
					<p>{error}</p>
					<div class="error-actions">
						<button class="btn-secondary" onclick={() => loadOrder()}>
							Retry
						</button>
						<button class="btn-primary" onclick={goBack}>
							Back to Orders
						</button>
					</div>
				</div>
			</div>
		{:else if loading}
			<div class="loading-state">
				<div class="loading-content">
					<div class="loading-spinner-large"></div>
					<h3>Loading order details...</h3>
					<p>Please wait while we fetch the order information</p>
				</div>
			</div>
		{:else if order}
			<div class="order-details">
				<div class="order-header">
					<div class="order-info">
						<h2>Order #{order.id.slice(0, 8)}...</h2>
						<div class="order-meta">
							<span class="order-date">{formatDate(order.created_at)}</span>
							<span class="status-badge {getStatusColor(order.status)}">
								{order.status}
							</span>
						</div>
					</div>
					<div class="order-total">
						<div class="total-amount">{formatCurrency(order.total_amount)}</div>
						<div class="total-label">Total</div>
					</div>
				</div>

				<div class="order-content">
					<div class="order-section">
						<h3>Customer Information</h3>
						<div class="info-card">
							<div class="customer-details clickable" onclick={() => goto(`/customers/${order.customer_id}`)}>
								<div class="customer-name">{order.customer_name}</div>
								<div class="customer-email">{order.customer_email}</div>
								<div class="customer-id">Customer ID: {order.customer_id}</div>
							</div>
						</div>
					</div>


					<div class="order-section">
						<h3>Order Items</h3>
						<div class="info-card">
							{#if order.items && order.items.length > 0}
								<div class="order-items">
									{#each order.items as item}
										<div class="order-item">
											<div class="item-image">
												{#if item.product_images && item.product_images.length > 0}
													<img src="{item.product_images[0].url}" alt="{item.product_name}" />
												{:else}
													<div class="no-image">📦</div>
												{/if}
											</div>
											<div class="item-details">
												<div class="item-name">{item.product_name}</div>
												{#if item.variant_data && (item.variant_data.color || item.variant_data.size)}
													<div class="item-variants">
														{#if item.variant_data.color}<span class="variant-badge">{item.variant_data.color}</span>{/if}
														{#if item.variant_data.size}<span class="variant-badge">{item.variant_data.size}</span>{/if}
													</div>
												{/if}
												<div class="item-quantity">Qty: {item.quantity}</div>
											</div>
											<div class="item-price">
												{formatCurrency(item.price)}
												{#if item.quantity > 1}
													<div class="item-subtotal">Total: {formatCurrency(item.price * item.quantity)}</div>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="no-items">
									<p>No items found for this order.</p>
								</div>
							{/if}
						</div>
					</div>

					<div class="order-section">
						<h3>Order Summary</h3>
						<div class="info-card">
							<div class="order-summary">
								<div class="summary-row">
									<span>Order ID:</span>
									<span class="monospace">{order.id}</span>
								</div>
								<div class="summary-row">
									<span>Created:</span>
									<span>{formatDate(order.created_at)}</span>
								</div>
								<div class="summary-row">
									<span>Updated:</span>
									<span>{formatDate(order.updated_at)}</span>
								</div>
								<div class="summary-row">
									<span>Payment Method:</span>
									<span>{order.payment_method}</span>
								</div>
								{#if order.payment_id && order.payment_id.Valid && order.payment_id.String}
									<div class="summary-row">
										<span>Payment ID:</span>
										<span class="monospace">{order.payment_id.String}</span>
									</div>
								{/if}
								<div class="summary-row">
									<span>Status:</span>
									<span class="status-badge {getStatusColor(order.status)}">
										{order.status}
									</span>
								</div>
								<div class="summary-row total">
									<span><strong>Total Amount:</strong></span>
									<span><strong>{formatCurrency(order.total_amount)}</strong></span>
								</div>
							</div>
						</div>
					</div>
				</div>

			</div>
		{/if}
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: #f6f6f7;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		padding: 1rem 2rem;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-btn {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		color: #6d7175;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.15s ease;
	}

	.back-btn:hover {
		background: #f6f6f7;
	}

	.header-main h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-icon {
		font-size: 1rem;
	}

	.page-content {
		padding: 2rem;
	}

	.error-state {
		background: white;
		border-radius: 8px;
		padding: 4rem 2rem;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e1e1e1;
	}

	.error-content {
		max-width: 400px;
		margin: 0 auto;
	}

	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.6;
	}

	.error-state h3 {
		color: #dc2626;
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.error-state p {
		color: #6d7175;
		margin-bottom: 2rem;
		line-height: 1.5;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.loading-state {
		background: white;
		border-radius: 8px;
		padding: 4rem 2rem;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e1e1e1;
	}

	.loading-content {
		max-width: 400px;
		margin: 0 auto;
	}

	.loading-spinner-large {
		display: inline-block;
		width: 40px;
		height: 40px;
		border: 4px solid #f3f4f6;
		border-radius: 50%;
		border-top-color: #202223;
		animation: spin 1s ease-in-out infinite;
		margin-bottom: 1.5rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-state h3 {
		color: #202223;
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.loading-state p {
		color: #6d7175;
		line-height: 1.5;
	}

	.order-details {
		max-width: 1200px;
		margin: 0 auto;
	}

	.order-header {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		margin-bottom: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e1e1e1;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.order-info h2 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #202223;
		font-family: monospace;
	}

	.order-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.order-date {
		color: #6d7175;
		font-size: 0.875rem;
	}

	.order-total {
		text-align: right;
	}

	.total-amount {
		font-size: 2rem;
		font-weight: 600;
		color: #202223;
		margin-bottom: 0.25rem;
	}

	.total-label {
		color: #6d7175;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.order-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.order-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.info-card {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e1e1e1;
	}

	.customer-name {
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
		margin-bottom: 0.5rem;
	}

	.customer-email {
		color: #6d7175;
		margin-bottom: 0.5rem;
	}

	.customer-id {
		color: #6d7175;
		font-size: 0.875rem;
		font-family: monospace;
	}

	.customer-details.clickable {
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 6px;
		transition: all 0.15s ease;
		margin: -0.5rem;
	}

	.customer-details.clickable:hover {
		background: #f6f6f7;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}



	.order-summary {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.summary-row:last-child {
		border-bottom: none;
	}

	.summary-row.total {
		margin-top: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e1e1e1;
		border-bottom: none;
	}

	.monospace {
		font-family: monospace;
		font-size: 0.875rem;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-badge.green {
		background: #d1fae5;
		color: #047857;
	}

	.status-badge.orange {
		background: #fef3c7;
		color: #92400e;
	}

	.status-badge.red {
		background: #fee2e2;
		color: #991b1b;
	}

	.status-badge.blue {
		background: #dbeafe;
		color: #1e40af;
	}

	.status-badge.gray {
		background: #f3f4f6;
		color: #6d7175;
	}

	.order-items {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.order-item {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid #e3e3e3;
		border-radius: 8px;
		background: #fafbfb;
	}

	.item-image {
		width: 60px;
		height: 60px;
		border-radius: 6px;
		overflow: hidden;
		flex-shrink: 0;
		background: #f3f4f6;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.item-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.no-image {
		font-size: 1.5rem;
		color: #9ca3af;
	}

	.item-details {
		flex: 1;
		min-width: 0;
	}

	.item-name {
		font-weight: 600;
		color: #202223;
		margin-bottom: 0.5rem;
		line-height: 1.4;
	}

	.item-variants {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}

	.variant-badge {
		background: #e5e7eb;
		color: #374151;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.item-quantity {
		color: #6d7175;
		font-size: 0.875rem;
	}

	.item-price {
		text-align: right;
		flex-shrink: 0;
	}

	.item-price {
		font-weight: 600;
		color: #202223;
		font-size: 1rem;
	}

	.item-subtotal {
		color: #6d7175;
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	.no-items {
		text-align: center;
		padding: 2rem;
		color: #6d7175;
	}


	.btn-primary, .btn-secondary {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s ease;
		border: none;
	}

	.btn-primary {
		background: #202223;
		color: white;
	}

	.btn-primary:hover {
		background: #1a1a1a;
	}

	.btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.btn-secondary:hover {
		background: #f6f6f7;
	}

	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}

		.order-header {
			flex-direction: column;
			gap: 1.5rem;
			text-align: left;
		}

		.order-total {
			text-align: left;
		}

		.order-content {
			grid-template-columns: 1fr;
		}


		.header-main {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.header-left {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.header-right {
			justify-content: flex-end;
		}
	}
</style>