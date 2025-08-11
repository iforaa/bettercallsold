<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { inventoryState, inventoryActions, getFilteredInventory, getInventoryMetrics } from '$lib/state/inventory.svelte.js';
	import { ToastService } from '$lib/services/ToastService.js';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import QuantityAdjustModal from '$lib/components/inventory/QuantityAdjustModal.svelte';

	let { data }: { data: PageData } = $props();
	
	// Reactive state from global store
	let inventory = $derived(getFilteredInventory());
	let metrics = $derived(getInventoryMetrics());
	let loading = $derived(inventoryState.loading.list);
	let error = $derived(inventoryState.errors.list);
	let selectedItems = $derived(inventoryState.selection.selectedItems);
	let selectAll = $derived(inventoryState.selection.selectAll);

	// Load inventory on mount
	$effect(() => {
		// Only load if we haven't loaded recently or if there are no items
		if (!inventoryState.lastFetch || inventoryState.items.length === 0) {
			inventoryActions.loadInventory();
		}
	});

	function toggleSelectAll() {
		inventoryActions.toggleSelectAll();
	}

	function toggleItem(itemId: string) {
		inventoryActions.toggleItemSelection(itemId);
	}
	
	function handleRetry() {
		inventoryActions.retry();
	}



	// Navigate to variant page
	function goToVariant(item: any) {
		const variantId = item.id;
		const productId = item.product_id;
		goto(`/products/${productId}/variants/${variantId}?fromInventory=true`);
	}


	// Handle quantity adjustment
	function handleQuantityAdjustment(item: any, field: 'available' | 'on_hand') {
		inventoryActions.openAdjustModal(item, field);
	}

</script>

<svelte:head>
	<title>Inventory - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item current">📊 Inventory</span>
				</div>
			</div>
			<div class="page-header-aside">
				<div class="form-field form-field-inline" style="margin-bottom: 0;">
					<label class="form-label form-label-sm">Shop location</label>
					<select class="form-select form-select-sm">
						<option>All locations</option>
						<option>Warehouse A</option>
						<option>Warehouse B</option>
						<option>Electronics</option>
					</select>
				</div>
				<div class="page-actions">
					<button class="btn btn-secondary">Export</button>
				</div>
			</div>
		</div>
	</div>

	<div class="page-content">
		<!-- Tabs -->
		<div class="nav-tabs">
			<button class="nav-tab active" disabled={loading}>All</button>
			<button class="btn-icon" disabled={loading} style="margin-left: auto;">+</button>
		</div>

		{#if error}
			<ErrorState 
				message="Error Loading Inventory"
				errorText={error}
				onRetry={handleRetry}
				showBackButton={false}
			/>
		{:else if loading}
			<LoadingState 
				message="Loading inventory..."
				subMessage="Please wait while we fetch inventory data"
			/>
		{:else if inventory && inventory.length > 0}
			<!-- Table -->
			<div class="table-container">
				<table class="table">
					<thead>
						<tr>
							<th class="table-cell-checkbox">
								<input 
									type="checkbox" 
									class="table-checkbox"
									bind:checked={selectAll}
									onchange={toggleSelectAll}
								/>
							</th>
							<th class="table-cell-main">Product</th>
							<th>SKU</th>
							<th class="table-cell-numeric">Unavailable</th>
							<th class="table-cell-numeric">Committed</th>
							<th class="table-cell-numeric">Available</th>
							<th class="table-cell-numeric">On hand</th>
						</tr>
					</thead>
					<tbody>
						{#each inventory as item}
							<tr class="table-row table-row-clickable" onclick={() => goToVariant(item)}>
								<td class="table-cell-checkbox" onclick={(e) => e.stopPropagation()}>
									<input 
										type="checkbox" 
										class="table-checkbox"
										checked={selectedItems.includes(item.id)}
										onchange={() => toggleItem(item.id)}
									/>
								</td>
								<td class="table-cell-main">
									<div class="table-cell-content">
										<div class="table-cell-media">
											<div class="table-cell-placeholder">📦</div>
										</div>
										<div class="table-cell-details">
											<span class="table-cell-title">{item.formattedTitle}</span>
											<span class="table-cell-subtitle">{item.formattedLocation}</span>
										</div>
									</div>
								</td>
								<td>
									<span class="table-cell-text table-cell-muted">{item.formattedSKU}</span>
								</td>
								<td class="table-cell-numeric">
									<span class="table-cell-text">{item.unavailableCount}</span>
								</td>
								<td class="table-cell-numeric">
									<span class="table-cell-text">{item.committedCount}</span>
								</td>
								<td class="table-cell-numeric" onclick={(e) => e.stopPropagation()}>
									<button 
										class="btn btn-ghost btn-sm" 
										onclick={() => handleQuantityAdjustment(item, 'available')}
									>
										{item.availableCount}
									</button>
								</td>
								<td class="table-cell-numeric" onclick={(e) => e.stopPropagation()}>
									<button 
										class="btn btn-ghost btn-sm" 
										onclick={() => handleQuantityAdjustment(item, 'on_hand')}
									>
										{item.onHandCount}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="content-footer">
				<div class="table-summary">1-{inventory.length} of {inventory.length} items</div>
			</div>
		{:else}
			<EmptyState 
				icon="📊"
				title="No inventory items found"
				message="Add products to start tracking inventory"
				actionText="Add Product"
				actionHref="/products/new"
			/>
		{/if}
	</div>
</div>

<!-- Quantity Adjustment Modal -->
<QuantityAdjustModal />

<style>
	/* Minimal custom styles - most styling now handled by design system */
	
	/* Content layout specific to inventory page */
	.page-header-aside {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	/* All header, form, table, modal, toast, loading, and other component styles now handled by design system */
	
	/* Responsive adjustments not covered by design system */
	@media (max-width: 768px) {
		.table {
			min-width: 800px;
		}
		
		.page-header-aside {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}
	}
</style>
