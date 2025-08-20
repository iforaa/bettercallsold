<script lang="ts">
	import { getDiscountTypeDisplay } from '$lib/utils/status';
	import type { DiscountFormData } from '$lib/types/discounts';

	interface Props {
		discount: DiscountFormData;
		usageCount?: number;
	}

	let {
		discount,
		usageCount
	}: Props = $props();

	const discountTypeTitle = $derived(getDiscountTypeDisplay(discount.discount_type));
</script>

<div class="card">
	<div class="card-header">
		<h3 class="card-title">Summary</h3>
	</div>
	
	<div class="card-body">
		<div class="preview-title">
			{discount.title || 'No discount code yet'}
		</div>
		<div class="preview-subtitle">{discount.method === 'code' ? 'Code' : 'Automatic'}</div>
		
		<div class="preview-section">
			<div class="preview-label">Type</div>
			<div class="preview-value">{discountTypeTitle}</div>
			<div class="preview-icon">💰</div>
		</div>

		<div class="preview-section">
			<div class="preview-label">Details</div>
			<div class="preview-details">
				<div>• All customers</div>
				<div>• Applies to one-time purchases</div>
				{#if discount.minimum_requirement_type === 'none'}
					<div>• No minimum purchase requirement</div>
				{:else if discount.minimum_requirement_type === 'minimum_amount'}
					<div>• Minimum purchase of ${discount.minimum_amount || '0.00'}</div>
				{:else if discount.minimum_requirement_type === 'minimum_quantity'}
					<div>• Minimum {discount.minimum_quantity || '0'} items</div>
				{/if}
				<div>• No usage limits</div>
				<div>• Can't combine with other discounts</div>
				<div>• Active from {discount.starts_at || 'today'}</div>
			</div>
		</div>

		{#if usageCount !== undefined}
			<div class="preview-section">
				<div class="preview-label">Usage</div>
				<div class="preview-value">{usageCount} times used</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.preview-title {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		margin-bottom: var(--space-1);
	}

	.preview-subtitle {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin-bottom: var(--space-4);
	}

	.preview-section {
		margin-bottom: var(--space-4);
		position: relative;
	}

	.preview-section:last-child {
		margin-bottom: 0;
	}

	.preview-label {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.025em;
		margin-bottom: var(--space-2);
	}

	.preview-value {
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		margin-bottom: var(--space-2);
	}

	.preview-icon {
		position: absolute;
		top: 0;
		right: 0;
		font-size: var(--font-size-lg);
	}

	.preview-details {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	.preview-details > div {
		margin-bottom: var(--space-1);
	}
</style>