<script lang="ts">
	import type { CustomerTab, CustomerFormatted, CustomerCreditBalance } from '$lib/types/customers';
	import { CustomerService } from '$lib/services/CustomerService.js';
	
	// Import tab content components
	import CustomerOrdersList from './CustomerOrdersList.svelte';
	import CustomerCart from './CustomerCart.svelte';
	import CustomerWaitlists from './CustomerWaitlists.svelte';
	import CustomerCreditsTransactions from './CustomerCreditsTransactions.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';

	interface Props {
		activeTab: CustomerTab;
		customer?: CustomerFormatted;
		waitlistsCount?: number;
		creditBalance?: CustomerCreditBalance;
		onTabChange: (tab: CustomerTab) => void;
		className?: string;
		// Tab content data
		customerOrders?: any[];
		ordersLoading?: boolean;
		customerCart?: any[];
		cartLoading?: boolean;
		customerWaitlists?: any[];
		waitlistsLoading?: boolean;
		customerCredits?: any;
		creditsLoading?: boolean;
		// Event handlers
		onOrderClick?: (orderId: string) => void;
		onProductClick?: (productId: string) => void;
		onWaitlistClick?: (waitlistId: string) => void;
	}

	let { 
		activeTab,
		customer,
		waitlistsCount = 0,
		creditBalance,
		onTabChange,
		className = '',
		// Tab content data
		customerOrders = [],
		ordersLoading = false,
		customerCart = [],
		cartLoading = false,
		customerWaitlists = [],
		waitlistsLoading = false,
		customerCredits,
		creditsLoading = false,
		// Event handlers
		onOrderClick,
		onProductClick,
		onWaitlistClick
	}: Props = $props();

	function handleTabClick(tab: CustomerTab) {
		onTabChange(tab);
	}

	function formatCreditBalance() {
		if (!creditBalance) return '$0.00';
		return CustomerService.formatCurrency(creditBalance.balance);
	}
</script>

<div class="card-group {className}">
	<!-- Overview Tabs -->
	<div class="info-card">
		<div class="card-header">
			<h4 class="card-title">Overview</h4>
		</div>
		<div class="card-body">
			<div class="nav-tabs">
				<button 
					class="nav-tab {activeTab === 'orders' ? 'active' : ''}"
					onclick={() => handleTabClick('orders')}
				>
					Orders ({customer?.stats.order_count || 0})
				</button>
				<button 
					class="nav-tab {activeTab === 'cart' ? 'active' : ''}"
					onclick={() => handleTabClick('cart')}
				>
					Cart items ({customer?.stats.cart_items_count || 0})
				</button>
				<button 
					class="nav-tab {activeTab === 'posts' ? 'active' : ''}"
					onclick={() => handleTabClick('posts')}
				>
					Posts ({customer?.stats.posts_count || 0})
				</button>
				<button 
					class="nav-tab {activeTab === 'waitlists' ? 'active' : ''}"
					onclick={() => handleTabClick('waitlists')}
				>
					Waitlists ({waitlistsCount})
				</button>
				<button 
					class="nav-tab {activeTab === 'credits' ? 'active' : ''}"
					onclick={() => handleTabClick('credits')}
				>
					Credits Transactions
				</button>
			</div>
		</div>
		
		<!-- Tab Content -->
		<div class="tab-content">
			{#if activeTab === 'orders'}
				<CustomerOrdersList 
					orders={customerOrders}
					loading={ordersLoading}
					onOrderClick={onOrderClick}
				/>
			{:else if activeTab === 'cart'}
				<CustomerCart 
					cartItems={customerCart}
					loading={cartLoading}
					onProductClick={onProductClick}
				/>
			{:else if activeTab === 'posts'}
				<EmptyState 
					icon="📝"
					title="No posts found"
					description="Customer posts and activity will appear here"
				/>
			{:else if activeTab === 'waitlists'}
				<CustomerWaitlists 
					waitlists={customerWaitlists}
					loading={waitlistsLoading}
					onWaitlistClick={onWaitlistClick}
				/>
			{:else if activeTab === 'credits'}
				<CustomerCreditsTransactions 
					creditsData={customerCredits}
					loading={creditsLoading}
				/>
			{/if}
		</div>
	</div>
</div>

<style>
	.nav-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		border-bottom: 1px solid var(--color-border-light);
		padding-bottom: var(--space-3);
	}

	.nav-tab {
		background: none;
		border: none;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all var(--transition-fast);
		white-space: nowrap;
		border-bottom: 2px solid transparent;
	}

	.nav-tab:hover {
		color: var(--color-text);
		background: var(--color-surface-hover);
	}

	.nav-tab.active {
		color: var(--color-accent);
		background: var(--color-accent-light);
		border-bottom-color: var(--color-accent);
	}

	/* Card title styling to match other sections */
	.card-title {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	/* Tab Content */
	.tab-content {
		padding: var(--space-6);
		background: var(--color-surface);
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
	}

	/* Empty state styling for this component */
	.empty-state {
		padding: var(--space-6) var(--space-4);
		text-align: center;
	}

	.empty-state-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
	}

	.empty-state-icon {
		font-size: var(--font-size-2xl);
		opacity: 0.5;
	}

	.empty-state-message {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
		line-height: var(--line-height-relaxed);
	}

	.empty-state-actions {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.nav-tabs {
			flex-direction: column;
			gap: var(--space-2);
		}

		.nav-tab {
			text-align: left;
			padding: var(--space-3);
			border-radius: var(--radius-md);
			border-bottom: none;
			border-left: 3px solid transparent;
		}

		.nav-tab.active {
			border-left-color: var(--color-accent);
			border-bottom: none;
		}

		.empty-state {
			padding: var(--space-4);
		}

		.empty-state-actions {
			flex-direction: column;
			width: 100%;
		}

		.empty-state-actions button {
			width: 100%;
		}
	}
</style>