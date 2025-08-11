<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	let customer: any = $state(null);
	let orders: any[] = $state([]);
	let waitlists: any[] = $state([]);
	let loading = $state(true);
	let loadingOrders = $state(false);
	let loadingWaitlists = $state(false);
	let error = $state('');

	async function loadCustomer() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch(`/api/customers/${data.customerId}`);
			
			if (!response.ok) {
				if (response.status === 404) {
					error = 'Customer not found';
				} else {
					throw new Error('Failed to fetch customer');
				}
				return;
			}

			const customerData = await response.json();
			customer = customerData;
		} catch (err) {
			console.error('Load customer error:', err);
			error = 'Failed to load customer details';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadCustomer();
	});

	async function loadCustomerOrders() {
		if (!browser || !customer) return;
		
		try {
			loadingOrders = true;
			
			const response = await fetch(`/api/customers/${data.customerId}/orders`);
			
			if (!response.ok) {
				throw new Error('Failed to fetch customer orders');
			}

			const ordersData = await response.json();
			orders = ordersData;
		} catch (err) {
			console.error('Load customer orders error:', err);
			// Don't show error for orders, just keep empty array
			orders = [];
		} finally {
			loadingOrders = false;
		}
	}

	async function loadCustomerWaitlists() {
		if (!browser || !customer) return;
		
		try {
			loadingWaitlists = true;
			
			const response = await fetch(`/api/customers/${data.customerId}/waitlists`);
			
			if (!response.ok) {
				throw new Error('Failed to fetch customer waitlists');
			}

			const waitlistsData = await response.json();
			waitlists = waitlistsData;
		} catch (err) {
			console.error('Load customer waitlists error:', err);
			// Don't show error for waitlists, just keep empty array
			waitlists = [];
		} finally {
			loadingWaitlists = false;
		}
	}

	// Load orders and waitlists when customer data is loaded
	$effect(() => {
		if (customer && customer.stats.order_count > 0) {
			loadCustomerOrders();
		}
		if (customer) {
			loadCustomerWaitlists();
		}
	});
	let activeTab = $state('overview');
	let toasts = $state([]);

	// Calculate customer since duration
	function getCustomerSince(createdAt: string) {
		const created = new Date(createdAt);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - created.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		
		if (diffDays < 30) {
			return `About ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
		} else if (diffDays < 365) {
			const months = Math.floor(diffDays / 30);
			return `About ${months} month${months !== 1 ? 's' : ''}`;
		} else {
			const years = Math.floor(diffDays / 365);
			return `About ${years} year${years !== 1 ? 's' : ''}`;
		}
	}

	// Format currency
	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	// Get customer initials for avatar
	function getInitials(name: string) {
		return name
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Toast notification system
	function showToast(message: string, type: 'success' | 'error' = 'success') {
		const id = Date.now();
		const toast = { id, message, type };
		toasts = [...toasts, toast];
		
		setTimeout(() => {
			toasts = toasts.filter(t => t.id !== id);
		}, 4000);
	}
	
	function removeToast(id: number) {
		toasts = toasts.filter(t => t.id !== id);
	}

	// Navigate back to customers list
	function goBackToCustomers() {
		goto('/customers');
	}
</script>

<svelte:head>
	<title>{customer ? customer.name + ' - ' : ''}Customers - BetterCallSold</title>
</svelte:head>

<div class="page">
	{#if error}
		<div class="error-state">
			<div class="error-state-content">
				<div class="error-state-icon">⚠</div>
				<h1 class="error-state-title">Error Loading Customer</h1>
				<p class="error-state-message">{error}</p>
				<div class="error-state-actions">
					<button class="btn btn-primary" onclick={() => loadCustomer()}>
						Retry
					</button>
					<button class="btn btn-secondary" onclick={goBackToCustomers}>
						Back to Customers
					</button>
				</div>
			</div>
		</div>
	{:else if loading}
		<div class="loading-state">
			<div class="loading-spinner loading-spinner-lg"></div>
			<p class="loading-text">Loading customer details...</p>
		</div>
	{:else if customer}
		<div class="page-header">
			<div class="page-header-content">
				<div class="page-header-nav">
					<button class="btn-icon" onclick={goBackToCustomers}>
						←
					</button>
					<div class="breadcrumb">
						<button class="breadcrumb-item" onclick={goBackToCustomers}>
							👥 Customers
						</button>
						<span class="breadcrumb-separator">›</span>
						<span class="breadcrumb-item current">{customer.name}</span>
					</div>
				</div>
				<div class="page-actions">
					<button class="btn btn-secondary">More actions</button>
				</div>
			</div>
			
			<!-- Customer Header Info -->
			<div class="header-summary">
				<div class="header-summary-media">
					<div class="table-cell-media">
						<div class="table-cell-placeholder">
							{getInitials(customer.name)}
						</div>
					</div>
				</div>
				<div class="header-summary-content">
					<h1 class="header-summary-title">{customer.name}</h1>
					<div class="header-summary-meta">
						<span class="header-summary-subtitle">ID: {customer.id.slice(0, 8)}...</span>
					</div>
				</div>
			</div>
		</div>

		<div class="page-content">
		<!-- Stats Overview -->
		<div class="metrics-grid">
			<div class="metric-card">
				<div class="metric-card-value">{formatCurrency(customer.stats.total_spent)}</div>
				<div class="metric-card-label">Amount spent</div>
			</div>
			<div class="metric-card">
				<div class="metric-card-value">{customer.stats.order_count}</div>
				<div class="metric-card-label">Orders</div>
			</div>
			<div class="metric-card">
				<div class="metric-card-value">{getCustomerSince(customer.stats.customer_since)}</div>
				<div class="metric-card-label">Customer since</div>
			</div>
			<div class="metric-card">
				<div class="metric-card-value">{customer.stats.cart_items_count}</div>
				<div class="metric-card-label">Cart items</div>
			</div>
		</div>

		<!-- Content Layout -->
		<div class="content-layout">
			<!-- Main Content Area -->
			<div class="content-main">
				<!-- Last Order Section -->
				<div class="content-section">
					<div class="content-header">
						<h3 class="content-title">Last order placed</h3>
					</div>
					<div class="content-body">
						{#if customer.stats.order_count === 0}
							<div class="empty-state">
								<div class="empty-state-content">
									<div class="empty-state-icon">📋</div>
									<p class="empty-state-message">This customer hasn't placed any orders yet</p>
									<div class="empty-state-actions">
										<button class="btn btn-secondary">Create order</button>
									</div>
								</div>
							</div>
						{:else if orders.length > 0}
							<div class="content-flow">
								<div class="card card-interactive" onclick={() => goto(`/orders/${orders[0].id}`)}>
									<div class="card-content">
										<div class="card-details">
											<div class="card-title">Order #{orders[0].id.slice(0, 8)}...</div>
											<div class="card-subtitle">{formatCurrency(orders[0].total_amount)} • {new Date(orders[0].created_at).toLocaleDateString()}</div>
										</div>
										<div class="card-action">
											<span class="badge badge-{orders[0].status === 'completed' ? 'success' : orders[0].status === 'pending' ? 'warning' : 'neutral'}">{orders[0].status}</span>
										</div>
									</div>
								</div>
								<button class="btn btn-secondary" onclick={() => activeTab = 'orders'}>View all orders</button>
							</div>
						{:else}
							<div class="empty-state">
								<div class="empty-state-content">
									<p class="empty-state-message">Customer has {customer.stats.order_count} order{customer.stats.order_count !== 1 ? 's' : ''}</p>
									<div class="empty-state-actions">
										<button class="btn btn-secondary" onclick={() => activeTab = 'orders'}>View orders</button>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Tabs Section -->
				<div class="content-section">
					<div class="nav-tabs">
						<button 
							class="nav-tab {activeTab === 'overview' ? 'active' : ''}"
							onclick={() => activeTab = 'overview'}
						>
							Overview
						</button>
						<button 
							class="nav-tab {activeTab === 'orders' ? 'active' : ''}"
							onclick={() => activeTab = 'orders'}
						>
							Orders ({customer.stats.order_count})
						</button>
						<button 
							class="nav-tab {activeTab === 'cart' ? 'active' : ''}"
							onclick={() => activeTab = 'cart'}
						>
							Cart items ({customer.stats.cart_items_count})
						</button>
						<button 
							class="nav-tab {activeTab === 'posts' ? 'active' : ''}"
							onclick={() => activeTab = 'posts'}
						>
							Posts ({customer.stats.posts_count})
						</button>
						<button 
							class="nav-tab {activeTab === 'waitlists' ? 'active' : ''}"
							onclick={() => activeTab = 'waitlists'}
						>
							Waitlists ({waitlists.length})
						</button>
					</div>
					
					<div class="content-body">
						{#if activeTab === 'overview'}
							<div class="content-flow">
								<div class="card">
									<div class="card-content">
										<div class="card-details">
											<div class="card-title">Timeline</div>
											<div class="card-subtitle">Customer activity</div>
										</div>
									</div>
								</div>
								<div class="timeline-item">
									<div class="timeline-dot"></div>
									<div class="timeline-content">
										<div class="card-title">Customer created</div>
										<div class="card-subtitle">{new Date(customer.created_at).toLocaleDateString()}</div>
									</div>
								</div>
							</div>
						{:else if activeTab === 'orders'}
							{#if loadingOrders}
								<div class="loading-state">
									<div class="loading-spinner loading-spinner-lg"></div>
									<p class="loading-text">Loading orders...</p>
								</div>
							{:else if orders.length > 0}
								<div class="content-flow">
									{#each orders as order}
										<div class="card card-interactive" onclick={() => goto(`/orders/${order.id}`)}>
											<div class="card-content">
												<div class="card-meta">#{order.id.slice(0, 8)}...</div>
												<div class="card-details">
													<div class="card-title">{formatCurrency(order.total_amount)}</div>
													<div class="card-subtitle">{order.items_count} item{order.items_count !== 1 ? 's' : ''} • {order.payment_method} • {new Date(order.created_at).toLocaleDateString()}</div>
												</div>
												<div class="card-action">
													<span class="badge badge-{order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : order.status === 'cancelled' ? 'error' : 'info'}">{order.status}</span>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="empty-state">
									<div class="empty-state-content">
										<div class="empty-state-icon">📦</div>
										<p class="empty-state-message">No orders found</p>
										<p class="empty-state-description">Orders will appear here when the customer places them</p>
									</div>
								</div>
							{/if}
						{:else if activeTab === 'cart'}
							<div class="empty-state">
								<div class="empty-state-content">
									<div class="empty-state-icon">🛒</div>
									<p class="empty-state-message">No cart items found</p>
									<p class="empty-state-description">Cart items will appear here when the customer adds products</p>
								</div>
							</div>
						{:else if activeTab === 'posts'}
							<div class="empty-state">
								<div class="empty-state-content">
									<div class="empty-state-icon">📝</div>
									<p class="empty-state-message">No posts found</p>
									<p class="empty-state-description">Customer posts and activity will appear here</p>
								</div>
							</div>
						{:else if activeTab === 'waitlists'}
							{#if loadingWaitlists}
								<div class="loading-state">
									<div class="loading-spinner loading-spinner-lg"></div>
									<p class="loading-text">Loading waitlists...</p>
								</div>
							{:else if waitlists.length > 0}
								<div class="content-flow">
									{#each waitlists as waitlist}
										<div class="card card-interactive" onclick={() => goto(`/waitlists/${waitlist.id}`)}>
											<div class="card-content">
												<div class="card-meta">#{waitlist.position || 'N/A'}</div>
												<div class="card-details">
													<div class="card-title">{waitlist.product_name || 'No Product'}</div>
													<div class="card-subtitle">
														{#if waitlist.product_price}{formatCurrency(waitlist.product_price)}{/if}
														{#if waitlist.color || waitlist.size}
															• {waitlist.color || ''} {waitlist.size || ''}
														{/if}
														{#if waitlist.inventory_quantity !== null}
															• Qty: {waitlist.inventory_quantity}
														{/if}
														• {new Date(waitlist.created_at).toLocaleDateString()}
													</div>
												</div>
												<div class="card-action">
													{#if waitlist.authorized_at}
														<span class="badge badge-success">Authorized</span>
													{:else}
														<span class="badge badge-warning">Pending</span>
													{/if}
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="empty-state">
									<div class="empty-state-content">
										<div class="empty-state-icon">⏱️</div>
										<p class="empty-state-message">No waitlist entries found</p>
										<p class="empty-state-description">Waitlist entries will appear here when the customer joins product waitlists</p>
									</div>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="content-sidebar">
				<!-- Customer Details Card -->
				<div class="sidebar-section">
					<div class="sidebar-header">
						<h3 class="sidebar-title">Customer</h3>
					</div>
					
					<div class="sidebar-subsection">
						<h4 class="sidebar-subtitle">Contact information</h4>
						<div class="detail-list">
							<div class="detail-item">
								<span class="detail-label">Email</span>
								<span class="detail-value">{customer.email}</span>
							</div>
							{#if customer.phone}
								<div class="detail-item">
									<span class="detail-label">Phone</span>
									<span class="detail-value">{customer.phone}</span>
								</div>
							{/if}
							{#if customer.address}
								<div class="detail-item">
									<span class="detail-label">Address</span>
									<span class="detail-value">{customer.address}</span>
								</div>
							{/if}
						</div>
					</div>

					{#if customer.facebook_id || customer.instagram_id}
						<div class="sidebar-subsection">
							<h4 class="sidebar-subtitle">Social media</h4>
							<div class="detail-list">
								{#if customer.facebook_id}
									<div class="detail-item">
										<span class="detail-label">Facebook ID</span>
										<span class="detail-value">{customer.facebook_id}</span>
									</div>
								{/if}
								{#if customer.instagram_id}
									<div class="detail-item">
										<span class="detail-label">Instagram ID</span>
										<span class="detail-value">{customer.instagram_id}</span>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<div class="sidebar-subsection">
						<h4 class="sidebar-subtitle">Account details</h4>
						<div class="detail-list">
							<div class="detail-item">
								<span class="detail-label">Customer since</span>
								<span class="detail-value">{new Date(customer.created_at).toLocaleDateString()}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">Last updated</span>
								<span class="detail-value">{new Date(customer.updated_at).toLocaleDateString()}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		</div>
	{/if}
</div>

<!-- Toast Notifications -->
{#if toasts.length > 0}
	<div class="toast-container">
		{#each toasts as toast (toast.id)}
			<div class="toast toast-{toast.type}">
				<div class="toast-content">
					{#if toast.type === 'success'}
						<span class="toast-icon">✓</span>
					{:else}
						<span class="toast-icon">⚠</span>
					{/if}
					<span class="toast-message">{toast.message}</span>
				</div>
				<button class="toast-close" onclick={() => removeToast(toast.id)}>×</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	/* Minimal custom styles - most styling now handled by design system */
	
	/* Custom header summary styling */
	.header-summary {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-6) 0;
	}
	
	.header-summary-media .table-cell-media {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		font-size: var(--font-size-lg);
	}
	
	.header-summary-content {
		flex: 1;
	}
	
	.header-summary-title {
		margin: 0 0 var(--space-2) 0;
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}
	
	.header-summary-meta {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}
	
	.header-summary-subtitle {
		font-family: monospace;
	}
	
	/* Timeline styling */
	.timeline-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) 0;
	}

	.timeline-dot {
		width: 12px;
		height: 12px;
		background: var(--color-accent);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.timeline-content {
		flex: 1;
	}
	
	/* Detail list styling for sidebar */
	.detail-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	
	.detail-item {
		display: flex;
		flex-direction: column;
	}

	.detail-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.025em;
		margin-bottom: var(--space-1);
		font-weight: var(--font-weight-medium);
	}

	.detail-value {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		word-break: break-word;
	}

	/* Responsive adjustments not covered by design system */
	@media (max-width: 1024px) {
		.content-layout {
			grid-template-columns: 1fr;
			gap: var(--space-4);
		}

		.content-sidebar {
			order: -1;
		}
	}

	@media (max-width: 768px) {
		.header-summary {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-3);
		}
		
		.nav-tabs {
			flex-wrap: wrap;
		}

		.nav-tab {
			flex: 1;
			min-width: 120px;
		}
	}
</style>