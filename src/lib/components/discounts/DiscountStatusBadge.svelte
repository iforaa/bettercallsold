<script lang="ts">
	import { getDiscountStatusDisplay, getDiscountStatusColor } from '$lib/utils/status';
	import type { DiscountStatus } from '$lib/types/discounts';

	interface Props {
		status: DiscountStatus;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'outline';
	}

	let {
		status,
		size = 'md',
		variant = 'default'
	}: Props = $props();

	const statusDisplay = $derived(getDiscountStatusDisplay(status));
	const statusColor = $derived(getDiscountStatusColor(status));
</script>

<span 
	class="status-badge status-{statusColor} status-{size} status-{variant} text-caps"
	title={statusDisplay}
>
	{statusDisplay}
</span>

<style>
	.status-badge {
		display: inline-flex;
		align-items: center;
		font-weight: var(--font-weight-medium);
		border-radius: var(--radius-full);
		border: 1px solid transparent;
		white-space: nowrap;
	}

	/* Size variants */
	.status-sm {
		padding: var(--space-1) var(--space-2);
		font-size: var(--font-size-xs);
	}

	.status-md {
		padding: var(--space-1) var(--space-3);
		font-size: var(--font-size-sm);
	}

	.status-lg {
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-base);
	}

	/* Color variants - default (filled) */
	.status-default.status-success {
		background: var(--color-success-bg);
		color: var(--color-success-text);
	}

	.status-default.status-warning {
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
	}

	.status-default.status-error {
		background: var(--color-error-bg);
		color: var(--color-error-text);
	}

	.status-default.status-info {
		background: var(--color-info-bg);
		color: var(--color-info-text);
	}

	.status-default.status-accent {
		background: var(--color-accent-bg);
		color: var(--color-accent-text);
	}

	.status-default.status-default {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}

	/* Color variants - outline */
	.status-outline.status-success {
		background: transparent;
		color: var(--color-success);
		border-color: var(--color-success);
	}

	.status-outline.status-warning {
		background: transparent;
		color: var(--color-warning);
		border-color: var(--color-warning);
	}

	.status-outline.status-error {
		background: transparent;
		color: var(--color-error);
		border-color: var(--color-error);
	}

	.status-outline.status-info {
		background: transparent;
		color: var(--color-info);
		border-color: var(--color-info);
	}

	.status-outline.status-accent {
		background: transparent;
		color: var(--color-accent);
		border-color: var(--color-accent);
	}

	.status-outline.status-default {
		background: transparent;
		color: var(--color-text-muted);
		border-color: var(--color-border);
	}
</style>