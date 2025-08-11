<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { productsState, productsActions, getFilteredProducts, getProductMetrics, hasCriticalErrors, isAnyLoading } from '$lib/state/products.svelte.js';
	import { createProductsContext, getProductsContext } from '$lib/contexts/products.svelte.js';
	import { ToastService } from '$lib/services/ToastService.js';
	import ProductsTable from '$lib/components/products/ProductsTable.svelte';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';

	let { data }: { data: PageData } = $props();
	
	// Create products context for this page
	const context = createProductsContext();
	
	// Computed values from state
	let currentStatus = $derived(data.currentStatus || 'all');
	let filteredProducts = $derived(getFilteredProducts());
	let productMetrics = $derived(getProductMetrics());
	let hasErrors = $derived(hasCriticalErrors());
	let loading = $derived(isAnyLoading());

	const tabs = [
		{ id: 'all', label: 'All' },
		{ id: 'active', label: 'Active' },
		{ id: 'draft', label: 'Draft' },
		{ id: 'archived', label: 'Archived' }
	];

	// Load products when component mounts or status changes
	$effect(() => {
		if (!productsState.lastFetch || productsState.filters.status !== currentStatus) {
			productsActions.setFilter('status', currentStatus);
		}
	});
	// Tab switching function
	function switchTab(tabId: string) {
		const url = new URL($page.url);
		if (tabId === 'all') {
			url.searchParams.delete('status');
		} else {
			url.searchParams.set('status', tabId);
		}
		goto(url.toString());
		context.actions.setCurrentTab(tabId);
	}

	// Selection handlers
	function handleProductSelect(productId: string) {
		context.actions.selectProduct(productId);
	}

	function handleSelectAll(selected: boolean) {
		if (selected) {
			context.actions.selectAll(filteredProducts.map(p => p.id));
		} else {
			context.actions.clearSelection();
		}
	}

	// Bulk delete functionality
	async function deleteSelectedProducts() {
		const selectedIds = context.state.selectedProducts;
		if (selectedIds.length === 0) return;
		
		const confirmMessage = selectedIds.length === 1 
			? 'Are you sure you want to delete this product? This action cannot be undone.'
			: `Are you sure you want to delete ${selectedIds.length} products? This action cannot be undone.`;
			
		if (!confirm(confirmMessage)) return;
		
		context.actions.startBulkAction('delete');
		
		try {
			const results = await productsActions.bulkDeleteProducts(selectedIds);
			
			// Show result toast
			if (results.successful.length > 0 && results.failed.length === 0) {
				ToastService.show(`Successfully deleted ${results.successful.length} product${results.successful.length > 1 ? 's' : ''}!`, 'success');
			} else if (results.successful.length > 0 && results.failed.length > 0) {
				ToastService.show(`Deleted ${results.successful.length} product${results.successful.length > 1 ? 's' : ''}, failed to delete ${results.failed.length}`, 'error');
			} else {
				ToastService.show('Failed to delete selected products', 'error');
			}
			
		} catch (error) {
			ToastService.show('Error deleting products: ' + error.message, 'error');
		} finally {
			context.actions.completeBulkAction();
		}
	}

	// Export functionality
	async function handleExport() {
		const { exportScope, exportFormat } = context.state;
		const selectedIds = context.state.selectedProducts;
		
		try {
			context.actions.startBulkAction('export');

			// Determine what to export
			let exportParams = {
				format: exportFormat,
				scope: exportScope
			};

			if (exportScope === 'selected') {
				if (selectedIds.length === 0) {
					ToastService.show('Please select products to export', 'error');
					return;
				}
				exportParams.productIds = selectedIds;
			} else if (exportScope === 'current-page') {
				exportParams.status = currentStatus === 'all' ? undefined : currentStatus;
			}

			await productsActions.exportProducts(exportParams);
			ToastService.show('Products exported successfully!', 'success');
			context.actions.closeExportModal();

		} catch (error) {
			console.error('Export error:', error);
			ToastService.show('Export failed. Please try again.', 'error');
		} finally {
			context.actions.completeBulkAction();
		}
	}

	function handleRetry() {
		productsActions.retry();
	}
</script>

<svelte:head>
	<title>Products - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<h1 class="page-title">
				<span class="page-icon">📝</span>
				Products
			</h1>
			<div class="page-actions">
				{#if context.derived.hasSelection}
					<div class="flex-header">
						<span class="text-muted">{context.derived.selectionCount} selected</span>
						<button 
							class="btn btn-danger" 
							onclick={deleteSelectedProducts}
							disabled={context.derived.isProcessingBulkAction}
						>
							{#if context.derived.isProcessingBulkAction && context.state.bulkActions.operation === 'delete'}
								<span class="spinner"></span>
							{/if}
							{context.derived.isProcessingBulkAction && context.state.bulkActions.operation === 'delete' ? 'Deleting...' : `Delete (${context.derived.selectionCount})`}
						</button>
					</div>
				{/if}
				<button class="btn btn-secondary" onclick={() => context.actions.openExportModal()}>Export</button>
				<a href="/products/new" class="btn btn-primary">Add product</a>
			</div>
		</div>
	</div>

	<div class="page-content">
		<!-- Tabs - Always show immediately -->
		<div class="segmented-control">
			{#each tabs as tab}
				<button 
					class="segment {currentStatus === tab.id ? 'active' : ''}"
					onclick={() => switchTab(tab.id)}
					disabled={loading}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Global Error State -->
		{#if hasErrors}
			<div class="page-content-padded">
				<ErrorState 
					error={productsState.errors.products}
					title="Failed to Load Products"
					onRetry={handleRetry}
				/>
			</div>
		{:else}
			<!-- Products Table Component -->
			<ProductsTable 
				products={filteredProducts}
				loading={loading}
				selectedProducts={context.state.selectedProducts}
				onProductSelect={handleProductSelect}
				onSelectAll={handleSelectAll}
				showSelection={true}
			/>
		{/if}
	</div>
</div>

<!-- Export Modal -->
{#if context.state.showExportModal}
	<div class="modal-overlay" onclick={() => context.actions.closeExportModal()}>
		<div class="modal modal-lg" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2 class="modal-title">Export products</h2>
				<button class="btn btn-icon" onclick={() => context.actions.closeExportModal()}>&times;</button>
			</div>
			
			<div class="modal-body">
				<div class="export-description">
					<p>This CSV file can update all product information except for inventory quantities. To update inventory quantities at multiple locations, use the <a href="#" class="link">CSV file for inventory</a> or the <a href="#" class="link">bulk editor</a>.</p>
				</div>

				<div class="export-section">
					<h3>Export</h3>
					<div class="export-options">
						<label class="radio-option">
							<input type="radio" bind:group={context.state.exportScope} value="current-page" />
							<span class="radio-label">Current page</span>
						</label>
						
						<label class="radio-option">
							<input type="radio" bind:group={context.state.exportScope} value="all-products" />
							<span class="radio-label">All products</span>
						</label>
						
						<label class="radio-option {context.derived.selectionCount === 0 ? 'disabled' : ''}">
							<input type="radio" bind:group={context.state.exportScope} value="selected" disabled={context.derived.selectionCount === 0} />
							<span class="radio-label">Selected: {context.derived.selectionCount} products</span>
						</label>
						
						<div class="radio-option disabled">
							<span class="radio-label muted">50+ products matching your search</span>
						</div>
					</div>
				</div>

				<div class="export-section">
					<h3>Export as</h3>
					<div class="export-options">
						<label class="radio-option">
							<input type="radio" bind:group={context.state.exportFormat} value="csv-excel" />
							<span class="radio-label">CSV for Excel, Numbers, or other spreadsheet programs</span>
						</label>
						
						<label class="radio-option">
							<input type="radio" bind:group={context.state.exportFormat} value="plain-csv" />
							<span class="radio-label">Plain CSV file</span>
						</label>
					</div>
				</div>

				<div class="export-footer">
					<a href="#" class="link">Learn more</a> about exporting products.
				</div>
			</div>

			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={() => context.actions.closeExportModal()}>Cancel</button>
				<button class="btn btn-primary" onclick={handleExport} disabled={context.derived.isProcessingBulkAction}>
					{#if context.derived.isProcessingBulkAction && context.state.bulkActions.operation === 'export'}
						<span class="spinner"></span>
					{/if}
					{context.derived.isProcessingBulkAction && context.state.bulkActions.operation === 'export' ? 'Exporting...' : 'Export products'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Modal export specific styles */
	.export-description {
		margin-bottom: var(--space-8);
	}

	.export-description p {
		color: var(--color-text-muted);
		line-height: var(--line-height-relaxed);
		margin: 0;
		font-size: var(--font-size-sm);
	}

	.export-section {
		margin-bottom: var(--space-8);
	}

	.export-section h3 {
		margin: 0 0 var(--space-4) 0;
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	.export-options {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.radio-option {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		cursor: pointer;
		padding: var(--space-2) 0;
	}

	.radio-option.disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.radio-option input[type="radio"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.radio-option.disabled input[type="radio"] {
		cursor: not-allowed;
	}

	.radio-label {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		cursor: pointer;
	}

	.radio-label.muted {
		color: var(--color-text-muted);
	}

	.radio-option.disabled .radio-label {
		cursor: not-allowed;
	}

	.export-footer {
		margin-top: var(--space-6);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.link {
		color: var(--color-info);
		text-decoration: none;
	}

	.link:hover {
		text-decoration: underline;
	}
</style>