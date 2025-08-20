<script lang="ts">
	import { goto } from '$app/navigation';
	import { DiscountService } from '$lib/services/DiscountService.js';
	import DiscountStatusBadge from './DiscountStatusBadge.svelte';
	import LoadingState from '../states/LoadingState.svelte';
	import EmptyState from '../states/EmptyState.svelte';
	import type { Discount } from '$lib/types/discounts';

	interface Props {
		discounts: Discount[];
		loading?: boolean;
		selectedItems?: Set<string>;
		onItemSelect?: (discountId: string) => void;
		onSelectAll?: (selected: boolean) => void;
		onDeleteDiscount?: (discountId: string) => void;
		showSelection?: boolean;
		emptyStateConfig?: {
			title: string;
			description: string;
			onCreateDiscount?: () => void;
		};
	}

	let {
		discounts,
		loading = false,
		selectedItems = new Set(),
		onItemSelect = () => {},
		onSelectAll = () => {},
		onDeleteDiscount = () => {},
		showSelection = false,
		emptyStateConfig
	}: Props = $props();

	// Computed values
	let allSelected = $derived(
		discounts.length > 0 && selectedItems.size === discounts.length
	);
	
	let someSelected = $derived(
		selectedItems.size > 0 && selectedItems.size < discounts.length
	);

	function handleSelectAll() {
		onSelectAll(!allSelected);
	}

	function handleItemSelect(discountId: string, event: Event) {
		event.stopPropagation();
		onItemSelect(discountId);
	}

	function goToDiscount(discountId: string) {
		goto(`/discounts/${discountId}`);
	}

	function getDiscountStatus(discount: Discount) {
		return DiscountService.getDiscountStatus(discount);
	}

	function getDiscountTypeIcon(discountType: string) {
		return DiscountService.getDiscountTypeIcon(discountType);
	}

	function formatDiscountValue(discount: Discount) {
		return DiscountService.formatDiscountValue(discount);
	}

	function handleDeleteClick(discountId: string, event: Event) {
		event.stopPropagation();
		onDeleteDiscount(discountId);
	}
</script>

{#if loading}
	<LoadingState message="Loading discounts..." size="lg" />
{:else if discounts.length === 0}
	<EmptyState 
		icon="🏷️"
		title={emptyStateConfig?.title || "No discounts found"}
		description={emptyStateConfig?.description || "Create your first discount to start offering deals to customers."}
		actions={emptyStateConfig?.onCreateDiscount ? [{
			label: 'Create discount',
			onClick: emptyStateConfig.onCreateDiscount,
			primary: true
		}] : []}
	/>
{:else}
	<div class="table-container">
		<table class="data-table">
			<thead>
				<tr>
					{#if showSelection}
						<th class="table-cell-checkbox">
							<input 
								type="checkbox" 
								class="table-checkbox"
								checked={allSelected}
								indeterminate={someSelected}
								onchange={handleSelectAll}
							/>
						</th>
					{/if}
					<th class="table-cell-main">Title</th>
					<th>Status</th>
					<th>Method</th>
					<th>Type</th>
					<th class="table-cell-numeric">Value</th>
					<th class="table-cell-numeric">Used</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each discounts as discount (discount.id)}
					{@const status = getDiscountStatus(discount)}
					<tr class="table-row-clickable" onclick={() => goToDiscount(discount.id)}>
						{#if showSelection}
							<td class="table-cell-checkbox">
								<input 
									type="checkbox" 
									class="table-checkbox"
									checked={selectedItems.has(discount.id)}
									onchange={(e) => handleItemSelect(discount.id, e)}
								/>
							</td>
						{/if}
						<td class="table-cell-main">
							<div class="table-cell-details">
								<span class="table-cell-title">{discount.title}</span>
								{#if discount.description}
									<span class="table-cell-subtitle">{discount.description}</span>
								{/if}
								{#if discount.code}
									<span class="table-cell-subtitle">Code: {discount.code}</span>
								{/if}
							</div>
						</td>
						<td>
							<DiscountStatusBadge {status} size="sm" />
						</td>
						<td>{discount.method_display}</td>
						<td>
							<div class="type-container">
								<span class="type-icon">{getDiscountTypeIcon(discount.discount_type)}</span>
								<span>{discount.type_display}</span>
							</div>
						</td>
						<td class="table-cell-numeric">{formatDiscountValue(discount)}</td>
						<td class="table-cell-numeric">{discount.total_usage_count || 0}</td>
						<td>
							<button 
								class="btn btn-secondary btn-sm"
								onclick={(e) => handleDeleteClick(discount.id, e)}
								title="Delete discount"
							>
								🗑️
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.type-container {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.type-icon {
		font-size: var(--font-size-sm);
	}
</style>