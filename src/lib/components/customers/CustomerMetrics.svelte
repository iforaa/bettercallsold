<script lang="ts">
	import type { CustomerFormatted } from '$lib/types/customers';
	import { CustomerService } from '$lib/services/CustomerService.js';

	interface Props {
		customer?: CustomerFormatted;
		loading?: boolean;
		className?: string;
	}

	let { 
		customer,
		loading = false,
		className = ''
	}: Props = $props();
</script>

{#if loading}
	<div class="metrics-grid {className}">
		{#each Array(4) as _, i}
			<div class="metric-card">
				<div class="skeleton skeleton-text skeleton-text-lg" style="width: 80px; margin-bottom: var(--space-2);"></div>
				<div class="skeleton skeleton-text" style="width: 120px;"></div>
			</div>
		{/each}
	</div>
{:else if customer}
	<div class="metrics-grid {className}">
		<div class="metric-card metric-card-bordered metric-card-accent">
			<div class="metric-card-value">{customer.stats.order_count}</div>
			<div class="metric-card-label">Total Orders</div>
		</div>

		<div class="metric-card metric-card-bordered metric-card-success">
			<div class="metric-card-value">{CustomerService.formatCurrency(customer.stats.total_spent)}</div>
			<div class="metric-card-label">Total Spent</div>
		</div>

		<div class="metric-card metric-card-bordered metric-card-warning">
			<div class="metric-card-value">{customer.stats.cart_items_count}</div>
			<div class="metric-card-label">Cart Items</div>
		</div>

		<div class="metric-card metric-card-bordered">
			<div class="metric-card-value">{customer.customerSince}</div>
			<div class="metric-card-label">Customer Since</div>
		</div>
	</div>
{:else}
	<div class="empty-state {className}">
		<div class="empty-state-content">
			<div class="empty-state-icon">📊</div>
			<p class="empty-state-message">No customer metrics available</p>
		</div>
	</div>
{/if}

<style>
	/* Loading skeletons */
	.skeleton {
		background: var(--color-surface-hover);
		border-radius: var(--radius-sm);
		animation: pulse 2s infinite;
	}

	.skeleton-text {
		height: 16px;
	}

	.skeleton-text-lg {
		height: 24px;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	/* Empty state adjustments for smaller metrics component */
	.empty-state {
		padding: var(--space-12) var(--space-6);
		text-align: center;
	}

	.empty-state-icon {
		font-size: 2rem;
		margin-bottom: var(--space-3);
		opacity: 0.4;
	}

	.empty-state-message {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.empty-state {
			padding: var(--space-8) var(--space-4);
		}
	}
</style>