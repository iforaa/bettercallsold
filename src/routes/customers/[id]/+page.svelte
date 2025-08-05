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
			<div class="error-content">
				<div class="error-icon">⚠️</div>
				<h3>Error</h3>
				<p>{error}</p>
				<div class="error-actions">
					<button class="btn-secondary" onclick={() => loadCustomer()}>
						Retry
					</button>
					<button class="btn-primary" onclick={goBackToCustomers}>
						Back to Customers
					</button>
				</div>
			</div>
		</div>
	{:else if loading}
		<div class="loading-state">
			<div class="loading-content">
				<div class="loading-spinner-large"></div>
				<h3>Loading customer details...</h3>
				<p>Please wait while we fetch the customer information</p>
			</div>
		</div>
	{:else if customer}
		<div class="page-header">
			<div class="header-main">
				<div class="breadcrumb">
					<button class="breadcrumb-link" onclick={goBackToCustomers}>
						<span class="breadcrumb-icon">👥</span>
						Customers
					</button>
					<span class="breadcrumb-separator">›</span>
					<span class="breadcrumb-current">{customer.name}</span>
				</div>
				<div class="header-right">
					<button class="btn-secondary">More actions</button>
				</div>
			</div>
			
			<!-- Customer Header Info -->
			<div class="customer-header">
				<div class="customer-avatar">
					{getInitials(customer.name)}
				</div>
				<div class="customer-info">
					<h1 class="customer-name">{customer.name}</h1>
					<div class="customer-meta">
						<span class="customer-id">ID: {customer.id.slice(0, 8)}...</span>
					</div>
				</div>
			</div>
		</div>

		<div class="page-content">
		<!-- Stats Overview -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-label">Amount spent</div>
				<div class="stat-value">{formatCurrency(customer.stats.total_spent)}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Orders</div>
				<div class="stat-value">{customer.stats.order_count}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Customer since</div>
				<div class="stat-value">{getCustomerSince(customer.stats.customer_since)}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Cart items</div>
				<div class="stat-value">{customer.stats.cart_items_count}</div>
			</div>
		</div>

		<!-- Content Layout -->
		<div class="content-layout">
			<!-- Main Content Area -->
			<div class="main-content">
				<!-- Last Order Section -->
				<div class="section-card">
					<div class="section-header">
						<h3>Last order placed</h3>
					</div>
					<div class="section-content">
						{#if customer.stats.order_count === 0}
							<div class="empty-state">
								<div class="empty-icon">📋</div>
								<p>This customer hasn't placed any orders yet</p>
								<button class="btn-secondary">Create order</button>
							</div>
						{:else if orders.length > 0}
							<div class="last-order-preview">
								<div class="last-order-card" onclick={() => goto(`/orders/${orders[0].id}`)}>
									<div class="last-order-info">
										<div class="last-order-id">Order #{orders[0].id.slice(0, 8)}...</div>
										<div class="last-order-amount">{formatCurrency(orders[0].total_amount)}</div>
										<div class="last-order-date">{new Date(orders[0].created_at).toLocaleDateString()}</div>
									</div>
									<div class="last-order-status status-{orders[0].status}">{orders[0].status}</div>
								</div>
								<button class="btn-secondary" onclick={() => activeTab = 'orders'}>View all orders</button>
							</div>
						{:else}
							<div class="order-preview">
								<p>Customer has {customer.stats.order_count} order{customer.stats.order_count !== 1 ? 's' : ''}</p>
								<button class="btn-secondary" onclick={() => activeTab = 'orders'}>View orders</button>
							</div>
						{/if}
					</div>
				</div>

				<!-- Tabs Section -->
				<div class="tabs-section">
					<div class="tabs-header">
						<button 
							class="tab {activeTab === 'overview' ? 'active' : ''}"
							onclick={() => activeTab = 'overview'}
						>
							Overview
						</button>
						<button 
							class="tab {activeTab === 'orders' ? 'active' : ''}"
							onclick={() => activeTab = 'orders'}
						>
							Orders ({customer.stats.order_count})
						</button>
						<button 
							class="tab {activeTab === 'cart' ? 'active' : ''}"
							onclick={() => activeTab = 'cart'}
						>
							Cart items ({customer.stats.cart_items_count})
						</button>
						<button 
							class="tab {activeTab === 'posts' ? 'active' : ''}"
							onclick={() => activeTab = 'posts'}
						>
							Posts ({customer.stats.posts_count})
						</button>
						<button 
							class="tab {activeTab === 'waitlists' ? 'active' : ''}"
							onclick={() => activeTab = 'waitlists'}
						>
							Waitlists ({waitlists.length})
						</button>
					</div>
					
					<div class="tab-content">
						{#if activeTab === 'overview'}
							<div class="overview-content">
								<div class="timeline-section">
									<h4>Timeline</h4>
									<div class="timeline-item">
										<div class="timeline-dot"></div>
										<div class="timeline-content">
											<div class="timeline-title">Customer created</div>
											<div class="timeline-date">{new Date(customer.created_at).toLocaleDateString()}</div>
										</div>
									</div>
								</div>
							</div>
						{:else if activeTab === 'orders'}
							{#if loadingOrders}
								<div class="loading-state">
									<div class="loading-spinner-large"></div>
									<p>Loading orders...</p>
								</div>
							{:else if orders.length > 0}
								<div class="orders-list">
									{#each orders as order}
										<div class="order-card" onclick={() => goto(`/orders/${order.id}`)}>
											<div class="order-header">
												<div class="order-id">#{order.id.slice(0, 8)}...</div>
												<div class="order-status status-{order.status}">{order.status}</div>
											</div>
											<div class="order-details">
												<div class="order-amount">{formatCurrency(order.total_amount)}</div>
												<div class="order-meta">
													<span class="order-items">{order.items_count} item{order.items_count !== 1 ? 's' : ''}</span>
													<span class="order-payment">{order.payment_method}</span>
												</div>
												<div class="order-date">{new Date(order.created_at).toLocaleDateString()}</div>
											</div>
											<div class="order-arrow">→</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="empty-state">
									<div class="empty-icon">📦</div>
									<p>No orders found</p>
									<p class="empty-hint">Orders will appear here when the customer places them</p>
								</div>
							{/if}
						{:else if activeTab === 'cart'}
							<div class="empty-state">
								<div class="empty-icon">🛒</div>
								<p>No cart items found</p>
								<p class="empty-hint">Cart items will appear here when the customer adds products</p>
							</div>
						{:else if activeTab === 'posts'}
							<div class="empty-state">
								<div class="empty-icon">📝</div>
								<p>No posts found</p>
								<p class="empty-hint">Customer posts and activity will appear here</p>
							</div>
						{:else if activeTab === 'waitlists'}
							{#if loadingWaitlists}
								<div class="loading-state">
									<div class="loading-spinner-large"></div>
									<p>Loading waitlists...</p>
								</div>
							{:else if waitlists.length > 0}
								<div class="waitlists-list">
									{#each waitlists as waitlist}
										<div class="waitlist-card" onclick={() => goto(`/waitlists/${waitlist.id}`)}>
											<div class="waitlist-header">
												<div class="position">
													<strong>#{waitlist.position || 'N/A'}</strong>
												</div>
												<div class="status">
													{#if waitlist.authorized_at}
														<span class="status-badge green">Authorized</span>
													{:else}
														<span class="status-badge orange">Pending</span>
													{/if}
												</div>
											</div>
											<div class="waitlist-content">
												<div class="waitlist-main">
													<div class="product-info">
														<strong>{waitlist.product_name || 'No Product'}</strong>
														{#if waitlist.product_price}
															<div class="product-price">{formatCurrency(waitlist.product_price)}</div>
														{/if}
													</div>
												</div>
												<div class="waitlist-meta">
													<div class="inventory-info">
														{#if waitlist.color || waitlist.size}
															<div class="inventory-details">
																{#if waitlist.color}<span class="detail-badge">{waitlist.color}</span>{/if}
																{#if waitlist.size}<span class="detail-badge">{waitlist.size}</span>{/if}
															</div>
														{/if}
														{#if waitlist.inventory_quantity !== null}
															<div class="inventory-quantity">
																Qty: {waitlist.inventory_quantity}
															</div>
														{/if}
													</div>
													<div class="waitlist-details">
														<div class="created-date">{new Date(waitlist.created_at).toLocaleDateString()}</div>
													</div>
												</div>
											</div>
											<div class="waitlist-arrow">→</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="empty-state">
									<div class="empty-icon">⏱️</div>
									<p>No waitlist entries found</p>
									<p class="empty-hint">Waitlist entries will appear here when the customer joins product waitlists</p>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="sidebar">
				<!-- Customer Details Card -->
				<div class="sidebar-card">
					<div class="sidebar-header">
						<h3>Customer</h3>
					</div>
					<div class="sidebar-content">
						<div class="detail-section">
							<h4>Contact information</h4>
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

						{#if customer.facebook_id || customer.instagram_id}
							<div class="detail-section">
								<h4>Social media</h4>
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
						{/if}

						<div class="detail-section">
							<h4>Account details</h4>
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
	.page {
		min-height: 100vh;
		background: #f6f6f7;
	}

	.error-state {
		background: white;
		border-radius: 8px;
		padding: 4rem 2rem;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e1e1e1;
		margin: 2rem;
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
		margin: 2rem;
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
		line-height: 1.5;
	}

	.btn-primary {
		background: #202223;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s ease;
	}

	.btn-primary:hover {
		background: #1a1a1a;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		padding: 1rem 2rem 0;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #6d7175;
	}

	.breadcrumb-link {
		background: none;
		border: none;
		color: #005bd3;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		text-decoration: none;
		font-size: 0.875rem;
	}

	.breadcrumb-link:hover {
		text-decoration: underline;
	}

	.breadcrumb-icon {
		font-size: 0.875rem;
	}

	.breadcrumb-separator {
		color: #c9cccf;
	}

	.breadcrumb-current {
		color: #202223;
		font-weight: 500;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.customer-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-bottom: 2rem;
	}

	.customer-avatar {
		width: 64px;
		height: 64px;
		background: #005bd3;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 1.25rem;
	}

	.customer-info {
		flex: 1;
	}

	.customer-name {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #202223;
	}

	.customer-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.875rem;
		color: #6d7175;
	}

	.customer-id {
		font-family: monospace;
	}

	.page-content {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6d7175;
		margin-bottom: 0.5rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: #202223;
	}

	.content-layout {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: 2rem;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		overflow: hidden;
	}

	.section-header {
		padding: 1.5rem;
		border-bottom: 1px solid #f0f0f0;
	}

	.section-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.section-content {
		padding: 1.5rem;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.6;
	}

	.empty-state p {
		margin: 0.5rem 0;
		color: #6d7175;
	}

	.empty-hint {
		font-size: 0.875rem;
		opacity: 0.8;
	}

	.order-preview {
		text-align: center;
		padding: 1rem;
	}

	.order-preview p {
		margin: 0 0 1rem 0;
		color: #6d7175;
	}

	.tabs-section {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		overflow: hidden;
	}

	.tabs-header {
		display: flex;
		border-bottom: 1px solid #e1e1e1;
		background: #fafbfb;
	}

	.tab {
		background: none;
		border: none;
		padding: 1rem 1.5rem;
		cursor: pointer;
		color: #6d7175;
		font-size: 0.875rem;
		border-bottom: 2px solid transparent;
		transition: all 0.15s ease;
	}

	.tab.active {
		color: #202223;
		background: white;
		border-bottom-color: #005bd3;
	}

	.tab:hover:not(.active) {
		color: #202223;
		background: rgba(0, 91, 211, 0.05);
	}

	.tab-content {
		padding: 2rem;
		min-height: 300px;
	}

	.overview-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.timeline-section h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
	}

	.timeline-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 0;
	}

	.timeline-dot {
		width: 12px;
		height: 12px;
		background: #005bd3;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.timeline-content {
		flex: 1;
	}

	.timeline-title {
		font-weight: 500;
		color: #202223;
		margin-bottom: 0.25rem;
	}

	.timeline-date {
		font-size: 0.875rem;
		color: #6d7175;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.sidebar-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		overflow: hidden;
	}

	.sidebar-header {
		padding: 1.5rem;
		border-bottom: 1px solid #f0f0f0;
	}

	.sidebar-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.sidebar-content {
		padding: 1.5rem;
	}

	.detail-section {
		margin-bottom: 2rem;
	}

	.detail-section:last-child {
		margin-bottom: 0;
	}

	.detail-section h4 {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		margin-bottom: 1rem;
	}

	.detail-item:last-child {
		margin-bottom: 0;
	}

	.detail-label {
		font-size: 0.75rem;
		color: #6d7175;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		margin-bottom: 0.25rem;
	}

	.detail-value {
		font-size: 0.875rem;
		color: #202223;
		word-break: break-word;
	}

	.btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover {
		background: #f6f6f7;
		border-color: #b3b7bb;
	}

	/* Toast Notifications */
	.toast-container {
		position: fixed;
		top: 5rem;
		right: 2rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		pointer-events: none;
	}

	.toast {
		background: white;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
		border: 1px solid #e1e3e5;
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-width: 320px;
		max-width: 480px;
		pointer-events: auto;
		animation: slideIn 0.3s ease-out;
	}

	.toast-success {
		border-left: 4px solid #00a96e;
	}

	.toast-error {
		border-left: 4px solid #d72c0d;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.toast-icon {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.toast-success .toast-icon {
		background: #00a96e;
		color: white;
	}

	.toast-error .toast-icon {
		background: #d72c0d;
		color: white;
	}

	.toast-message {
		font-size: 0.875rem;
		color: #202223;
		font-weight: 500;
	}

	.toast-close {
		background: none;
		border: none;
		color: #6d7175;
		cursor: pointer;
		font-size: 1.25rem;
		padding: 0;
		margin-left: 1rem;
		transition: color 0.15s ease;
	}

	.toast-close:hover {
		color: #202223;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@media (max-width: 1024px) {
		.content-layout {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Orders styling */
	.orders-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.order-card {
		display: flex;
		align-items: center;
		padding: 1rem;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		background: white;
		cursor: pointer;
		transition: all 0.15s ease;
		gap: 1rem;
	}

	.order-card:hover {
		border-color: #005bd3;
		box-shadow: 0 2px 8px rgba(0, 91, 211, 0.1);
	}

	.order-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 120px;
	}

	.order-id {
		font-family: monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
	}

	.order-status {
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
		width: fit-content;
	}

	.order-status.status-completed {
		background: #d1fae5;
		color: #047857;
	}

	.order-status.status-pending {
		background: #fef3c7;
		color: #92400e;
	}

	.order-status.status-cancelled {
		background: #fee2e2;
		color: #991b1b;
	}

	.order-status.status-processing {
		background: #dbeafe;
		color: #1e40af;
	}

	.order-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.order-amount {
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.order-meta {
		display: flex;
		gap: 0.75rem;
		font-size: 0.875rem;
		color: #6d7175;
	}

	.order-date {
		font-size: 0.75rem;
		color: #8c9196;
	}

	.order-arrow {
		color: #c9cccf;
		font-size: 1.25rem;
	}

	.last-order-preview {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.last-order-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		background: #fafbfb;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.last-order-card:hover {
		border-color: #005bd3;
		background: white;
		box-shadow: 0 2px 4px rgba(0, 91, 211, 0.1);
	}

	.last-order-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.last-order-id {
		font-family: monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
	}

	.last-order-amount {
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
	}

	.last-order-date {
		font-size: 0.75rem;
		color: #8c9196;
	}

	.last-order-status {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	/* Waitlist styling */
	.waitlists-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.waitlist-card {
		display: flex;
		align-items: center;
		padding: 1rem;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		background: #fafbfb;
		cursor: pointer;
		transition: all 0.15s ease;
		gap: 1rem;
	}

	.waitlist-card:hover {
		border-color: #005bd3;
		background: white;
		box-shadow: 0 2px 8px rgba(0, 91, 211, 0.1);
		transform: translateY(-1px);
	}

	.waitlist-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 100px;
		align-items: center;
		text-align: center;
	}

	.waitlist-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.waitlist-main {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
	}

	.waitlist-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.waitlist-details {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.waitlist-arrow {
		color: #c9cccf;
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.position strong {
		color: #202223;
		font-family: monospace;
		font-size: 0.875rem;
	}

	.product-info strong {
		color: #202223;
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
	}

	.product-price {
		color: #6d7175;
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.inventory-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.inventory-details {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.detail-badge {
		background: #f3f4f6;
		color: #374151;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.inventory-quantity {
		color: #6d7175;
		font-size: 0.75rem;
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

	.created-date {
		font-size: 0.75rem;
		color: #8c9196;
	}

	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}

		.customer-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.tabs-header {
			flex-wrap: wrap;
		}

		.tab {
			flex: 1;
			min-width: 120px;
		}

		.order-card, .waitlist-card {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.order-header, .waitlist-header {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			min-width: auto;
		}

		.waitlist-main {
			flex-direction: column;
			gap: 1rem;
		}

		.waitlist-meta {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.waitlist-details {
			justify-content: space-between;
		}

		.order-arrow, .waitlist-arrow {
			display: none;
		}
	}
</style>