<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { inventoryState, inventoryActions, getFilteredInventory, getInventoryMetrics, getPaginationInfo } from '$lib/state/inventory.svelte.js';
	import { ToastService } from '$lib/services/ToastService.js';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import QuantityAdjustModal from '$lib/components/inventory/QuantityAdjustModal.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();
	
	// Reactive state from global store
	let inventory = $derived(getFilteredInventory());
	let metrics = $derived(getInventoryMetrics());
	let paginationInfo = $derived(getPaginationInfo());
	let loading = $derived(inventoryState.loading.list);
	let error = $derived(inventoryState.errors.list);
	let selectedItems = $derived(inventoryState.selection.selectedItems);
	let selectAll = $derived(inventoryState.selection.selectAll);

	// Locations state
	let locations = $state([]);
	let loadingLocations = $state(true);

	// URL parameter values
	let currentPage = $derived(data.currentPage || 1);
	let currentLimit = $derived(data.currentLimit || 50);
	let currentSearch = $derived(data.currentSearch || '');
	let currentLocation = $derived(data.currentLocation || '');
	let currentStockStatus = $derived(data.currentStockStatus || 'all');

	// Sync URL parameters with state
	$effect(() => {
		const offset = (currentPage - 1) * currentLimit;
		const needsUpdate = 
			inventoryState.filters.search !== currentSearch ||
			inventoryState.filters.location !== currentLocation ||
			inventoryState.filters.stockStatus !== currentStockStatus ||
			inventoryState.filters.limit !== currentLimit ||
			inventoryState.filters.offset !== offset ||
			!inventoryState.lastFetch;
		
		if (needsUpdate) {
			// Set filters without auto-reload to prevent infinite loop
			inventoryActions.setFilter('search', currentSearch, false);
			inventoryActions.setFilter('location', currentLocation, false);
			inventoryActions.setFilter('stockStatus', currentStockStatus, false);
			inventoryActions.setFilter('limit', currentLimit, false);
			inventoryActions.setFilter('offset', offset, false);
			// Load inventory once after all filters are set
			inventoryActions.loadInventory();
		}
	});

	// Load locations on mount
	onMount(async () => {
		await loadLocations();
	});

	async function loadLocations() {
		try {
			loadingLocations = true;
			const response = await fetch('/api/locations');
			if (response.ok) {
				locations = await response.json();
				
				// Auto-select first location if no location is selected or invalid location
				const validLocation = locations.find(loc => loc.name === currentLocation);
				if (locations.length > 0 && (!currentLocation || !validLocation)) {
					const url = new URL($page.url);
					url.searchParams.set('location', locations[0].name);
					url.searchParams.delete('page'); // Reset to first page
					goto(url.toString(), { replaceState: true });
				}
			}
		} catch (error) {
			console.error('Failed to load locations:', error);
		} finally {
			loadingLocations = false;
		}
	}

	function handleLocationChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newLocation = target.value;
		
		// Update URL with new location filter
		const url = new URL($page.url);
		url.searchParams.set('location', newLocation);
		url.searchParams.delete('page'); // Reset to first page
		goto(url.toString());
	}

	function toggleSelectAll() {
		inventoryActions.toggleSelectAll();
	}

	function toggleItem(itemId: string) {
		inventoryActions.toggleItemSelection(itemId);
	}
	
	function handleRetry() {
		inventoryActions.retry();
	}

	// URL navigation for pagination and filters
	function updateInventoryUrl(params: { page?: number; limit?: number }) {
		const url = new URL($page.url);
		
		if (params.page && params.page > 1) {
			url.searchParams.set('page', params.page.toString());
		} else {
			url.searchParams.delete('page');
		}
		
		if (params.limit && params.limit !== 50) { // 50 is default
			url.searchParams.set('limit', params.limit.toString());
		} else if (params.limit === 50) {
			url.searchParams.delete('limit');
		}
		
		goto(url.toString());
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

	// Handle bulk transfer creation
	function createTransfer() {
		if (selectedItems.length === 0) return;
		
		// Get selected inventory items with their details
		const selectedInventoryItems = inventory.filter(item => selectedItems.includes(item.id));
		
		// Navigate to transfer creation page with pre-selected items
		const searchParams = new URLSearchParams();
		const transferItems = selectedInventoryItems.map(item => ({
			variant_id: item.id,
			product_id: item.product_id,
			product_name: item.formattedTitle || item.product_name || 'Unknown Product',
			variant_title: item.formattedVariantCombination || item.variant_title || '',
			sku: item.formattedSKU || item.variant_sku || '',
			location_id: item.location_id,
			location_name: item.formattedLocation || item.location_name || '',
			available_quantity: Math.max(0, parseInt(item.availableCount) || 0),
			on_hand_quantity: Math.max(0, parseInt(item.onHandCount) || 0),
			image: getFirstImage(item)
		}));
		
		searchParams.set('items', JSON.stringify(transferItems));
		goto(`/transfers/new?${searchParams.toString()}`);
	}

	// Get first product image
	function getFirstImage(item: any): string | null {
		try {
			if (!item.product_images) return null;
			
			let images = item.product_images;
			if (typeof images === 'string') {
				images = JSON.parse(images);
			}
			
			if (Array.isArray(images) && images.length > 0) {
				const firstImage = images[0];
				if (typeof firstImage === 'string') {
					return firstImage;
				} else if (firstImage && typeof firstImage === 'object' && firstImage.url) {
					return firstImage.url;
				}
			}
			
			return null;
		} catch (e) {
			return null;
		}
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
					<select class="form-select form-select-sm" value={currentLocation} onchange={handleLocationChange} disabled={loadingLocations}>
						{#if loadingLocations}
							<option value="">Loading locations...</option>
						{:else if locations.length === 0}
							<option value="">No locations available</option>
						{:else}
							{#each locations as location}
								<option value={location.name}>{location.name}</option>
							{/each}
						{/if}
					</select>
				</div>
				<div class="page-actions">
					{#if selectedItems.length > 0}
						<button class="btn btn-primary" onclick={createTransfer}>
							Create Transfer ({selectedItems.length})
						</button>
					{/if}
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
							<th class="table-cell-sku">SKU</th>
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
											{#if getFirstImage(item)}
												<img 
													src={getFirstImage(item)} 
													alt={item.product_name || 'Product image'}
													class="table-cell-image"
												/>
											{:else}
												<div class="table-cell-placeholder">📦</div>
											{/if}
										</div>
										<div class="table-cell-details">
											<div class="table-cell-title">{item.formattedTitle}</div>
											{#if item.formattedVariantCombination}
												<div class="table-cell-subtitle">{item.formattedVariantCombination}</div>
											{/if}
										</div>
									</div>
								</td>
								<td class="table-cell-sku">
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
			{#if !error && inventory.length > 0}
				<Pagination
					paginationInfo={paginationInfo}
					actions={inventoryActions}
					loading={loading}
					itemName="inventory items"
					useUrl={true}
					urlActions={{ updateUrl: updateInventoryUrl }}
				/>
			{/if}
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

	/* Inventory table specific customizations - match products table */
	.table-cell-main {
		min-width: 250px;
		width: 30%; /* Match products table width */
		padding-left: var(--space-1); /* Reduced left padding from space-2 to space-1 */
	}

	.table-cell-sku {
		width: 120px;
		min-width: 100px;
	}

	.table-cell-image {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md); /* Match products table radius */
		object-fit: cover;
		border: 1px solid var(--color-border);
	}

	.table-cell-title {
		font-weight: var(--font-weight-normal); /* Match products table normal weight */
		font-size: var(--font-size-sm);
		color: var(--color-text);
		line-height: var(--line-height-tight);
		word-wrap: break-word;
		word-break: break-word;
		hyphens: auto;
		display: -webkit-box;
		-webkit-line-clamp: 2; /* Allow up to 2 lines */
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin-bottom: 0; /* Match products table - no bottom margin */
	}

	.table-cell-subtitle {
		font-weight: normal;
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		line-height: var(--line-height-tight);
	}

	.table-cell-content {
		display: flex;
		align-items: center; /* Match products table - center alignment */
		gap: var(--space-2); /* Match products table gap */
	}

	.table-cell-details {
		flex: 1;
		min-width: 0; /* Allow text to wrap properly */
	}

	.table-cell-media {
		width: 40px;
		height: 40px;
		background: var(--color-surface-hover); /* Match products table background */
		border-radius: var(--radius-md); /* Match products table radius */
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-base); /* Match products table font size */
		overflow: hidden;
		border: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.table-cell-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover); /* Match products table background */
		color: var(--color-text-muted);
	}

	/* All header, form, table, modal, toast, loading, and other component styles now handled by design system */
	
	/* Responsive adjustments - match products table */
	@media (max-width: 768px) {
		.table {
			min-width: 800px;
		}
		
		.page-header-aside {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}

		.table-cell-image {
			width: 32px; /* Match products table mobile size */
			height: 32px;
		}

		.table-cell-media {
			width: 32px; /* Match products table mobile size */
			height: 32px;
		}
	}
</style>
