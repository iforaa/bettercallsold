<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	let customer: any = $state(null);
	let orders: any[] = $state([]);
	let waitlists: any[] = $state([]);
	let cartItems: any[] = $state([]);
	let loading = $state(true);
	let loadingOrders = $state(false);
	let loadingWaitlists = $state(false);
	let loadingCart = $state(false);
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

	async function loadCustomerCart() {
		if (!browser || !customer) return;
		
		try {
			loadingCart = true;
			
			const response = await fetch(`/api/customers/${data.customerId}/cart`);
			
			if (!response.ok) {
				throw new Error('Failed to fetch customer cart');
			}

			const cartData = await response.json();
			cartItems = cartData;
		} catch (err) {
			console.error('Load customer cart error:', err);
			// Don't show error for cart, just keep empty array
			cartItems = [];
		} finally {
			loadingCart = false;
		}
	}

	// Load orders, waitlists, and cart when customer data is loaded
	$effect(() => {
		if (customer && customer.stats.order_count > 0) {
			loadCustomerOrders();
		}
		if (customer) {
			loadCustomerWaitlists();
		}
		if (customer && customer.stats.cart_items_count > 0) {
			loadCustomerCart();
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

	// Navigate back to customers list or order details if came from there
	function goBack() {
		navigateBack();
	}

	function navigateBack() {
		// Check if we came from an order or waitlist details page
		const from = $page.url.searchParams.get('from');
		const orderId = $page.url.searchParams.get('orderId');
		const waitlistId = $page.url.searchParams.get('waitlistId');
		
		if (from === 'order' && orderId) {
			goto(`/orders/${orderId}`);
		} else if (from === 'waitlist' && waitlistId) {
			goto(`/waitlists/${waitlistId}`);
		} else {
			goto('/customers');
		}
	}

	function goToOrder(orderId: string) {
		if (orderId) {
			// Pass customer context so order page can navigate back to this customer
			goto(`/orders/${orderId}?from=customer&customerId=${data.customerId}`);
		}
	}

	function goToProduct(productId: string) {
		if (productId) {
			// Pass customer context so product page can navigate back to this customer
			goto(`/products/${productId}?from=customer&customerId=${data.customerId}`);
		}
	}
</script>

<svelte:head>
	<title>{customer ? customer.name + ' - ' : ''}Customers - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="flex-header">
				<button class="btn btn-secondary" onclick={goBack}>
					← Back to Customers
				</button>
				<h1 class="page-title">
					<span class="page-icon">👥</span>
					Customer Details
				</h1>
			</div>
			<div class="page-actions">
				<!-- Actions will be added here if needed -->
			</div>
		</div>
	</div>

	<div class="page-content-padded">
		{#if error}
			<ErrorState 
				error={error}
				onRetry={loadCustomer}
				onBack={goBack}
				backLabel="Back to Customers"
			/>
		{:else if loading}
			<LoadingState 
				message="Loading customer details..." 
				size="lg" 
			/>
		{:else if customer}
			<div class="content-max-width">
				<div class="header-card">
					<div class="header-card-content">
						<h2 class="header-card-title">{customer.name}</h2>
						<div class="header-card-meta">
							<span class="header-card-date">Customer since {new Date(customer.created_at).toLocaleDateString()}</span>
							<span class="badge badge-success">Active</span>
						</div>
						<!-- Customer Details -->
						<div class="header-card-details">
							<div class="detail-grid">
								<div class="detail-item">
									<span class="detail-label">Customer ID:</span>
									<span class="detail-value detail-value-mono">{customer.id}</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">Email:</span>
									<span class="detail-value">{customer.email}</span>
								</div>
								{#if customer.phone}
									<div class="detail-item">
										<span class="detail-label">Phone:</span>
										<span class="detail-value">{customer.phone}</span>
									</div>
								{/if}
								<div class="detail-item">
									<span class="detail-label">Orders:</span>
									<span class="detail-value">{customer.stats.order_count}</span>
								</div>
								{#if customer.address}
									<div class="detail-item">
										<span class="detail-label">Address:</span>
										<span class="detail-value">{customer.address}</span>
									</div>
								{/if}
								<div class="detail-item">
									<span class="detail-label">Last updated:</span>
									<span class="detail-value">{new Date(customer.updated_at).toLocaleDateString()}</span>
								</div>
								{#if customer.facebook_id}
									<div class="detail-item">
										<span class="detail-label">Facebook ID:</span>
										<span class="detail-value">{customer.facebook_id}</span>
									</div>
								{/if}
								{#if customer.instagram_id}
									<div class="detail-item">
										<span class="detail-label">Instagram ID:</span>
										<span class="detail-value">{customer.instagram_id}</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
					<div class="header-card-aside">
						<div class="metric-display metric-display-inline">
							<div class="metric-value">{formatCurrency(customer.stats.total_spent)}</div>
							<div class="metric-label">Total Spent</div>
						</div>
					</div>
				</div>

			</div>

			<!-- Last Order and Customer Summary Layout -->
			<div class="card-group">
				<!-- Last Order Section -->
				<div class="info-card">
					<div class="card-header">
						<h3 class="card-title">Last order placed</h3>
					</div>
					<div class="card-body">
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

				<!-- Overview Tabs -->
				<div class="info-card">
					<div class="card-header">
						<h3 class="card-title">Overview</h3>
					</div>
					<div class="card-body">
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
					</div>
				</div>
			</div>

			<!-- Tab Content -->
			<div class="content-max-width">
				<div class="content-section">
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
								<LoadingState message="Loading orders..." size="lg" />
							{:else if orders.length > 0}
								<div class="item-grid">
									{#each orders as order}
										<div class="product-card product-card-clickable" onclick={() => goToOrder(order.id)}>
											<div class="product-card-image">
												<div class="product-card-placeholder">📋</div>
											</div>
											<div class="product-card-content">
												<div class="product-card-title">Order #{order.id.slice(0, 8)}...</div>
												<div class="product-card-variants">
													<span class="variant-item">{order.payment_method}</span>
													<span class="variant-item">{order.status}</span>
												</div>
												<div class="product-card-meta">{new Date(order.created_at).toLocaleDateString()}</div>
											</div>
											<div class="product-card-price">
												{formatCurrency(order.total_amount)}
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
							{#if loadingCart}
								<LoadingState message="Loading cart items..." size="lg" />
							{:else if cartItems.length > 0}
								<div class="item-grid">
									{#each cartItems as item}
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
												{formatCurrency(item.product_price)}
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="empty-state">
									<div class="empty-state-content">
										<div class="empty-state-icon">🛒</div>
										<p class="empty-state-message">No cart items found</p>
										<p class="empty-state-description">Cart items will appear here when the customer adds products</p>
									</div>
								</div>
							{/if}
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
								<LoadingState message="Loading waitlists..." size="lg" />
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

		{/if}
	</div>
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
	
	/* Custom header card details styling */
	.header-card-details {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-3);
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.detail-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.025em;
		font-weight: var(--font-weight-medium);
	}

	.detail-value {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		word-break: break-word;
	}

	.detail-value-mono {
		font-family: monospace;
		font-size: var(--font-size-xs);
	}

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

	/* Product card clickable styling - match orders details */
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