<script lang="ts">
	import type { Order } from '$lib/types/orders';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import { CustomerService } from '$lib/services/CustomerService.js';

	interface Props {
		orders: Order[];
		loading?: boolean;
		onOrderClick?: (orderId: string) => void;
		className?: string;
	}

	let { 
		orders,
		loading = false,
		onOrderClick,
		className = ''
	}: Props = $props();

	function handleOrderClick(orderId: string) {
		if (onOrderClick) {
			onOrderClick(orderId);
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	function getStatusBadgeColor(status: string) {
		switch (status) {
			case 'completed':
				return 'success';
			case 'pending':
				return 'warning';
			case 'cancelled':
				return 'error';
			case 'processing':
				return 'info';
			default:
				return 'neutral';
		}
	}
</script>

<div class="customer-orders-list {className}">
	{#if loading}
		<LoadingState message="Loading orders..." size="lg" />
	{:else if orders.length > 0}
		<div class="item-grid">
			{#each orders as order}
				<div 
					class="product-card product-card-clickable" 
					onclick={() => handleOrderClick(order.id)}
				>
					<div class="product-card-image">
						<div class="product-card-placeholder">📋</div>
					</div>
					<div class="product-card-content">
						<div class="product-card-title">Order #{order.id.slice(0, 8)}...</div>
						<div class="product-card-variants">
							<span class="variant-item">{order.payment_method}</span>
							<span class="variant-item badge-{getStatusBadgeColor(order.status)}">{order.status}</span>
						</div>
						<div class="product-card-meta">{formatDate(order.created_at)}</div>
					</div>
					<div class="product-card-price">
						{CustomerService.formatCurrency(order.total_amount)}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<EmptyState 
			icon="📦"
			title="No orders found"
			description="Orders will appear here when the customer places them"
		/>
	{/if}
</div>

<style>
	.customer-orders-list {
		width: 100%;
	}

	.product-card-clickable {
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.product-card-clickable:hover {
		border-color: var(--color-border-dark);
		box-shadow: var(--shadow-sm);
		transform: translateY(-1px);
	}

	.variant-item {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		background: var(--color-surface-hover);
		color: var(--color-text-muted);
		text-transform: capitalize;
	}

	.variant-item.badge-success {
		background: var(--color-success-bg);
		color: var(--color-success-text);
	}

	.variant-item.badge-warning {
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
	}

	.variant-item.badge-error {
		background: var(--color-error-bg);
		color: var(--color-error-text);
	}

	.variant-item.badge-info {
		background: var(--color-info-bg);
		color: var(--color-info-text);
	}

	.variant-item.badge-neutral {
		background: var(--color-surface-hover);
		color: var(--color-text-muted);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.product-card {
			padding: var(--space-3);
			gap: var(--space-3);
		}
		
		.product-card-image {
			width: 48px;
			height: 48px;
		}
		
		.product-card-title {
			font-size: var(--font-size-xs);
		}
		
		.product-card-price {
			font-size: var(--font-size-sm);
		}
	}
</style>