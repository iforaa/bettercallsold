<script lang="ts">
	import type { CustomerCreditsData, CustomerCreditTransaction } from '$lib/types/customers';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import { CustomerService } from '$lib/services/CustomerService.js';

	interface Props {
		creditsData?: CustomerCreditsData;
		loading?: boolean;
		onAdjustCredits?: () => void;
		className?: string;
	}

	let { 
		creditsData,
		loading = false,
		onAdjustCredits,
		className = ''
	}: Props = $props();

</script>

<div class="customer-credits {className}">
	{#if loading}
		<LoadingState message="Loading credits..." size="lg" />
	{:else}
		<!-- Credit Balance Summary -->
		<div class="card">
			<div class="card-header">
				<h4 class="card-title">Account Credits</h4>
				<div class="card-actions">
					{#if onAdjustCredits}
						<button class="btn btn-primary btn-sm" onclick={onAdjustCredits}>
							Adjust Balance
						</button>
					{/if}
				</div>
			</div>
			<div class="card-content">
				{#if creditsData?.balance}
					<div class="credit-summary">
						<div class="credit-balance">
							<div class="balance-amount" class:positive={creditsData.balance.balance > 0}>
								{CustomerService.formatCurrency(creditsData.balance.balance)}
							</div>
							<div class="balance-label">Current Balance</div>
						</div>
						<div class="credit-stats">
							<div class="credit-stat">
								<div class="stat-value">{CustomerService.formatCurrency(creditsData.balance.total_earned)}</div>
								<div class="stat-label">Total Earned</div>
							</div>
							<div class="credit-stat">
								<div class="stat-value">{CustomerService.formatCurrency(creditsData.balance.total_spent)}</div>
								<div class="stat-label">Total Spent</div>
							</div>
						</div>
					</div>
				{:else}
					<EmptyState 
						icon="💳"
						title="No credit information found"
						description="Credit information will appear here once available"
					/>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.customer-credits {
		width: 100%;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--color-border-light);
		background: var(--color-surface-alt);
	}

	.card-title {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	.card-actions {
		display: flex;
		gap: var(--space-2);
	}

	.card-content {
		padding: var(--space-6);
	}

	/* Credit Summary */
	.credit-summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-8);
	}

	.credit-balance {
		text-align: center;
	}

	.balance-amount {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		margin-bottom: var(--space-2);
		line-height: 1;
	}

	.balance-amount.positive {
		color: var(--color-success);
	}

	.balance-label {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: var(--font-weight-medium);
	}

	.credit-stats {
		display: flex;
		gap: var(--space-6);
	}

	.credit-stat {
		text-align: center;
	}

	.stat-value {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--space-1);
		line-height: 1;
	}

	.stat-label {
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: var(--font-weight-medium);
	}


	/* Responsive adjustments */
	@media (max-width: 768px) {
		.credit-summary {
			flex-direction: column;
			gap: var(--space-6);
			text-align: center;
		}

		.credit-stats {
			justify-content: center;
		}

		.card-header {
			padding: var(--space-3) var(--space-4);
		}

		.card-content {
			padding: var(--space-4);
		}

		.card-actions {
			flex-direction: column;
			width: 100%;
		}
	}

	@media (max-width: 480px) {
		.credit-stats {
			flex-direction: column;
			gap: var(--space-4);
		}
	}
</style>