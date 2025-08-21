<script lang="ts">
	import type { CustomerCreditsData, CustomerCreditTransaction } from '$lib/types/customers';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import { CustomerService } from '$lib/services/CustomerService.js';

	interface Props {
		creditsData?: CustomerCreditsData;
		loading?: boolean;
		className?: string;
	}

	let { 
		creditsData,
		loading = false,
		className = ''
	}: Props = $props();

	function getTransactionColor(transactionType: string) {
		switch (transactionType) {
			case 'admin_grant':
				return 'success';
			case 'order_deduction':
				return 'warning';
			case 'balance_adjustment':
				return 'info';
			case 'credit_expiration':
				return 'error';
			case 'refund_credit':
				return 'success';
			default:
				return 'neutral';
		}
	}

	function getTransactionIcon(transactionType: string) {
		switch (transactionType) {
			case 'admin_grant':
				return '💰';
			case 'order_deduction':
				return '🛒';
			case 'balance_adjustment':
				return '⚖️';
			case 'credit_expiration':
				return '⏰';
			case 'refund_credit':
				return '↩️';
			default:
				return '💳';
		}
	}

	function getTransactionLabel(transactionType: string) {
		switch (transactionType) {
			case 'admin_grant':
				return 'Admin Grant';
			case 'order_deduction':
				return 'Order Purchase';
			case 'balance_adjustment':
				return 'Balance Adjustment';
			case 'credit_expiration':
				return 'Credit Expiration';
			case 'refund_credit':
				return 'Refund Credit';
			default:
				return 'Transaction';
		}
	}

	function formatDateTime(dateString: string) {
		return new Date(dateString).toLocaleString();
	}
</script>

<div class="customer-credits-transactions {className}">
	{#if loading}
		<LoadingState message="Loading transactions..." size="lg" />
	{:else if creditsData?.transactions && creditsData.transactions.length > 0}
		<div class="transactions-list">
			{#each creditsData.transactions as transaction}
				<div class="transaction-item">
					<div class="transaction-icon">
						<span class="transaction-type-badge badge-{getTransactionColor(transaction.transaction_type)}">
							{getTransactionIcon(transaction.transaction_type)}
						</span>
					</div>
					<div class="transaction-details">
						<div class="transaction-header">
							<div class="transaction-type">{getTransactionLabel(transaction.transaction_type)}</div>
							<div class="transaction-amount" class:positive={transaction.amount > 0} class:negative={transaction.amount < 0}>
								{transaction.amount > 0 ? '+' : ''}{CustomerService.formatCurrency(Math.abs(transaction.amount))}
							</div>
						</div>
						<div class="transaction-description">{transaction.description}</div>
						<div class="transaction-meta">
							<span class="transaction-date">{formatDateTime(transaction.created_at)}</span>
							<span class="transaction-balance">
								Balance after: {CustomerService.formatCurrency(transaction.balance_after)}
							</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<EmptyState 
			icon="📜"
			title="No transaction history"
			description="Credit transactions will appear here when they occur"
		/>
	{/if}
</div>

<style>
	.customer-credits-transactions {
		width: 100%;
	}

	/* Transaction History */
	.transactions-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.transaction-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
		padding: var(--space-4);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		background: var(--color-surface-alt);
	}

	.transaction-icon {
		flex-shrink: 0;
	}

	.transaction-type-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-lg);
	}

	.transaction-type-badge.badge-success {
		background: var(--color-success-bg);
		color: var(--color-success-text);
	}

	.transaction-type-badge.badge-warning {
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
	}

	.transaction-type-badge.badge-info {
		background: var(--color-info-bg);
		color: var(--color-info-text);
	}

	.transaction-type-badge.badge-error {
		background: var(--color-error-bg);
		color: var(--color-error-text);
	}

	.transaction-type-badge.badge-neutral {
		background: var(--color-surface-hover);
		color: var(--color-text-muted);
	}

	.transaction-details {
		flex: 1;
		min-width: 0;
	}

	.transaction-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-2);
	}

	.transaction-type {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		font-size: var(--font-size-sm);
	}

	.transaction-amount {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-sm);
	}

	.transaction-amount.positive {
		color: var(--color-success);
	}

	.transaction-amount.negative {
		color: var(--color-error);
	}

	.transaction-description {
		color: var(--color-text);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-2);
		line-height: var(--line-height-relaxed);
	}

	.transaction-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.transaction-date,
	.transaction-balance {
		font-weight: var(--font-weight-medium);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.transaction-header {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
		}

		.transaction-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
		}
	}

	@media (max-width: 480px) {
		.transaction-item {
			padding: var(--space-3);
		}

		.transaction-type-badge {
			width: 32px;
			height: 32px;
			font-size: var(--font-size-base);
		}
	}
</style>