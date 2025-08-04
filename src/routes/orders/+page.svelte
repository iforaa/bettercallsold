<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();
	
	// State management
	let orders: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	// Client-side data fetching
	async function loadOrders() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch('/api/orders');
			
			if (!response.ok) {
				throw new Error('Failed to fetch orders');
			}

			const data = await response.json();
			orders = data;
		} catch (err) {
			console.error('Load orders error:', err);
			error = 'Failed to load orders from backend';
			orders = [];
		} finally {
			loading = false;
		}
	}

	// Load orders when component mounts
	onMount(() => {
		loadOrders();
	});
	
	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
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

	// Navigate to order detail page
	function goToOrder(orderId: string) {
		goto(`/orders/${orderId}`);
	}
</script>

<svelte:head>
	<title>Orders - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">📋</span>
				Orders
			</h1>
			<div class="header-actions">
				<button class="btn-secondary">Export</button>
				<a href="/orders/new" class="btn-primary">Create order</a>
			</div>
		</div>
	</div>

	<div class="page-content">
		{#if error}
			<div class="error-state">
				<p>{error}</p>
				<button class="btn-secondary" onclick={() => loadOrders()}>
					Retry
				</button>
			</div>
		{:else if loading}
			<!-- Loading state -->
			<div class="loading-state">
				<div class="loading-content">
					<div class="loading-spinner-large"></div>
					<h3>Loading orders...</h3>
					<p>This may take a moment</p>
				</div>
			</div>
		{:else if orders && orders.length > 0}
			<div class="orders-container">
				<div class="orders-summary">
					<div class="summary-card">
						<h3>Total Orders</h3>
						<div class="summary-number">{orders.length}</div>
					</div>
					<div class="summary-card">
						<h3>Completed</h3>
						<div class="summary-number">{orders.filter(o => o.status === 'completed').length}</div>
					</div>
					<div class="summary-card">
						<h3>Pending</h3>
						<div class="summary-number">{orders.filter(o => o.status === 'pending').length}</div>
					</div>
					<div class="summary-card">
						<h3>Total Revenue</h3>
						<div class="summary-number">{formatCurrency(orders.reduce((sum, o) => sum + o.total_amount, 0))}</div>
					</div>
				</div>

				<div class="orders-table-container">
					<table class="orders-table">
						<thead>
							<tr>
								<th>Order ID</th>
								<th>Customer</th>
								<th>Date</th>
								<th>Amount</th>
								<th>Status</th>
								<th>Payment</th>
							</tr>
						</thead>
						<tbody>
							{#each orders as order}
								<tr class="order-row clickable" onclick={() => goToOrder(order.id)}>
									<td>
										<div class="order-id">
											<strong>{order.id.slice(0, 8)}...</strong>
										</div>
									</td>
									<td>
										<div class="customer-info">
											<strong>{order.customer_name}</strong>
											<div class="customer-email">{order.customer_email}</div>
										</div>
									</td>
									<td>{new Date(order.created_at).toLocaleDateString()}</td>
									<td class="amount">{formatCurrency(order.total_amount)}</td>
									<td>
										<span class="status-badge {getStatusColor(order.status)}">
											{order.status}
										</span>
									</td>
									<td>
										<div class="payment-info">
											<span class="payment-method">{order.payment_method}</span>
											{#if order.payment_id && order.payment_id.Valid && order.payment_id.String}
												<div class="payment-id">{order.payment_id.String.slice(0, 12)}...</div>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<div class="empty-icon">📋</div>
				<h3>No orders found</h3>
				<p>Orders will appear here when customers start making purchases.</p>
				<button class="btn-primary" onclick={() => alert('Create order coming soon!')}>
					Create First Order
				</button>
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

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-primary, .btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: #202223;
		color: white;
		border: none;
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

	.page-content {
		padding: 0;
	}

	.error-state {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 1rem 2rem;
		margin: 1rem 2rem;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.loading-state {
		background: white;
		padding: 4rem 2rem;
		text-align: center;
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
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
		margin-bottom: 0;
		line-height: 1.5;
	}

	.orders-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem 2rem;
	}

	.orders-summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.summary-card {
		background: white;
		padding: 1.5rem;
		border-radius: 8px;
		border: 1px solid #e1e1e1;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		position: relative;
	}

	.summary-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4px;
		border-radius: 8px 8px 0 0;
		background: #005bd3;
	}

	.summary-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 0.75rem;
		color: #6d7175;
		text-transform: uppercase;
		font-weight: 500;
		letter-spacing: 0.5px;
	}

	.summary-number {
		font-size: 2rem;
		font-weight: 600;
		color: #202223;
	}

	.orders-table-container {
		background: white;
		border-radius: 8px;
		border: 1px solid #e1e1e1;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.orders-table {
		width: 100%;
		border-collapse: collapse;
	}

	.orders-table th {
		background: #fafbfb;
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: 500;
		font-size: 0.75rem;
		color: #6d7175;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		border-bottom: 1px solid #e1e1e1;
	}

	.orders-table td {
		padding: 1rem;
		border-bottom: 1px solid #e1e1e1;
		vertical-align: middle;
	}

	.orders-table tr:last-child td {
		border-bottom: none;
	}

	.order-id strong {
		color: #202223;
		font-family: monospace;
		font-size: 0.875rem;
	}

	.customer-info strong {
		color: #202223;
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
	}

	.customer-email {
		color: #6d7175;
		font-size: 0.8125rem;
	}

	.amount {
		font-weight: 600;
		color: #202223;
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

	.payment-method {
		color: #202223;
		font-weight: 500;
		text-transform: capitalize;
		font-size: 0.875rem;
	}

	.payment-id {
		color: #6d7175;
		font-size: 0.75rem;
		font-family: monospace;
		margin-top: 0.25rem;
	}

	.order-row.clickable {
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.order-row.clickable:hover {
		background: #fafbfb;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: white;
		border-radius: 8px;
		border: 1px solid #e1e1e1;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		margin: 2rem;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.4;
	}

	.empty-state h3 {
		color: #202223;
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.empty-state p {
		color: #6d7175;
		margin-bottom: 2rem;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		.header-main {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
		
		.header-actions {
			justify-content: flex-end;
		}
		
		.orders-container {
			padding: 1rem;
		}
		
		.orders-summary {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.orders-table-container {
			overflow-x: auto;
		}
		
		.orders-table {
			min-width: 800px;
		}
		
		.empty-state {
			margin: 1rem;
		}
	}
</style>