<script lang="ts">
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import { CustomerService } from '$lib/services/CustomerService.js';

	interface WaitlistItem {
		id: string;
		position: number | null;
		product_name: string | null;
		product_price: number | null;
		color: string | null;
		size: string | null;
		inventory_quantity: number | null;
		authorized_at: string | null;
		created_at: string;
		// Added by WaitlistService.formatWaitlistEntry()
		status?: string;
		sourceInfo?: { label: string; color: string };
		formattedPosition?: string;
		isAuthorized?: boolean;
	}

	interface Props {
		waitlists: WaitlistItem[];
		loading?: boolean;
		onWaitlistClick?: (waitlistId: string) => void;
		className?: string;
	}

	let { 
		waitlists,
		loading = false,
		onWaitlistClick,
		className = ''
	}: Props = $props();

	function handleWaitlistClick(waitlistId: string) {
		if (onWaitlistClick) {
			onWaitlistClick(waitlistId);
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}
</script>

<div class="customer-waitlists {className}">
	{#if loading}
		<LoadingState message="Loading waitlists..." size="lg" />
	{:else if waitlists.length > 0}
		<div class="content-flow">
			{#each waitlists as waitlist}
				<div 
					class="card card-interactive" 
					onclick={() => handleWaitlistClick(waitlist.id)}
				>
					<div class="card-content">
						<div class="card-meta">#{waitlist.position || 'N/A'}</div>
						<div class="card-details">
							<div class="card-title">{waitlist.product_name || 'No Product'}</div>
							<div class="card-subtitle">
								{#if waitlist.product_price}
									{CustomerService.formatCurrency(waitlist.product_price)}
								{/if}
								{#if waitlist.color || waitlist.size}
									• {waitlist.color || ''} {waitlist.size || ''}
								{/if}
								{#if waitlist.inventory_quantity !== null}
									• Qty: {waitlist.inventory_quantity}
								{/if}
								• {formatDate(waitlist.created_at)}
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
		<EmptyState 
			icon="⏱️"
			title="No waitlist entries found"
			description="Waitlist entries will appear here when the customer joins product waitlists"
		/>
	{/if}
</div>

<style>
	.customer-waitlists {
		width: 100%;
	}

	.content-flow {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.card-interactive {
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.card-interactive:hover {
		border-color: var(--color-border-dark);
		box-shadow: var(--shadow-sm);
		transform: translateY(-1px);
	}

	.card-content {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
	}

	.card-meta {
		background: var(--color-primary);
		color: white;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		min-width: 60px;
		text-align: center;
		flex-shrink: 0;
	}

	.card-details {
		flex: 1;
		min-width: 0;
	}

	.card-title {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--space-1);
		font-size: var(--font-size-sm);
		line-height: var(--line-height-tight);
	}

	.card-subtitle {
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
		line-height: var(--line-height-normal);
	}

	.card-action {
		flex-shrink: 0;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.badge-success {
		background: var(--color-success-bg);
		color: var(--color-success-text);
	}

	.badge-warning {
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.card-content {
			padding: var(--space-3);
			gap: var(--space-3);
		}

		.card-meta {
			min-width: 50px;
			padding: var(--space-1) var(--space-2);
		}

		.card-title {
			font-size: var(--font-size-xs);
		}

		.card-subtitle {
			font-size: var(--font-size-2xs);
		}
	}

	@media (max-width: 480px) {
		.card-content {
			flex-direction: column;
			align-items: flex-start;
			text-align: left;
		}

		.card-action {
			width: 100%;
			display: flex;
			justify-content: flex-end;
		}
	}
</style>