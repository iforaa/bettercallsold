<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();
	
	// State management
	let products: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let currentStatus = $derived(data.currentStatus || 'all');
	let selectedProducts: string[] = $state([]);
	let selectAll = $state(false);
	let deleting = $state(false);
	let toasts = $state([]);
	let showExportModal = $state(false);
	let exporting = $state(false);

	const tabs = [
		{ id: 'all', label: 'All' },
		{ id: 'active', label: 'Active' },
		{ id: 'draft', label: 'Draft' },
		{ id: 'archived', label: 'Archived' }
	];

	// Client-side data fetching
	async function loadProducts(status: string = 'all') {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';
			
			let apiEndpoint = '/api/products';
			if (status && status !== 'all') {
				apiEndpoint += `?status=${status}`;
			}

			const response = await fetch(apiEndpoint);
			
			if (!response.ok) {
				throw new Error('Failed to fetch products');
			}

			const data = await response.json();
			products = data;
		} catch (err) {
			console.error('Load products error:', err);
			error = 'Failed to load products from backend';
			products = [];
		} finally {
			loading = false;
		}
	}

	// Load products when component mounts or status changes
	onMount(() => {
		loadProducts(currentStatus);
	});

	// Reactive: reload when currentStatus changes
	$effect(() => {
		if (browser) {
			loadProducts(currentStatus);
		}
	});
	
	function formatPrice(price: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}
	
	function getStockStatus(count: number) {
		if (count === 0) return { label: 'Out of Stock', class: 'out-of-stock' };
		if (count < 10) return { label: 'Low Stock', class: 'low-stock' };
		return { label: 'In Stock', class: 'in-stock' };
	}

	function toggleSelectAll() {
		if (selectAll) {
			selectedProducts = products?.map(p => p.id) || [];
		} else {
			selectedProducts = [];
		}
	}

	function toggleProduct(productId: string) {
		if (selectedProducts.includes(productId)) {
			selectedProducts = selectedProducts.filter(id => id !== productId);
		} else {
			selectedProducts = [...selectedProducts, productId];
		}
		selectAll = selectedProducts.length === products?.length;
	}

	function switchTab(tabId: string) {
		const url = new URL($page.url);
		if (tabId === 'all') {
			url.searchParams.delete('status');
		} else {
			url.searchParams.set('status', tabId);
		}
		goto(url.toString());
	}

	function goToProduct(productId: string) {
		goto(`/products/${productId}`);
	}


	function getFirstImage(product: any): string | null {
		try {
			if (!product.images) return null;
			
			let images = product.images;
			if (typeof images === 'string') {
				images = JSON.parse(images);
			}
			
			if (Array.isArray(images) && images.length > 0) {
				// Handle both simple URL strings and complex image objects
				const firstImage = images[0];
				if (typeof firstImage === 'string') {
					return firstImage; // Simple URL string
				} else if (firstImage && typeof firstImage === 'object' && firstImage.url) {
					return firstImage.url; // Complex image object with url property
				}
			}
			
			return null;
		} catch (e) {
			return null;
		}
	}

	// Toast notification system
	function showToast(message: string, type: 'success' | 'error' = 'success') {
		const id = Date.now();
		const toast = { id, message, type };
		toasts = [...toasts, toast];
		
		// Auto remove after 4 seconds
		setTimeout(() => {
			toasts = toasts.filter(t => t.id !== id);
		}, 4000);
	}
	
	function removeToast(id: number) {
		toasts = toasts.filter(t => t.id !== id);
	}

	// Bulk delete functionality
	async function deleteSelectedProducts() {
		if (selectedProducts.length === 0) return;
		
		const confirmMessage = selectedProducts.length === 1 
			? 'Are you sure you want to delete this product? This action cannot be undone.'
			: `Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`;
			
		if (!confirm(confirmMessage)) return;
		
		deleting = true;
		let deletedCount = 0;
		let failedCount = 0;
		
		try {
			// Delete products one by one to handle individual failures
			for (const productId of selectedProducts) {
				try {
					const response = await fetch(`/api/products/${productId}`, {
						method: 'DELETE'
					});
					
					if (response.ok) {
						deletedCount++;
					} else {
						failedCount++;
					}
				} catch (error) {
					failedCount++;
				}
			}
			
			// Clear selections
			selectedProducts = [];
			selectAll = false;
			
			// Show result toast
			if (deletedCount > 0 && failedCount === 0) {
				showToast(`Successfully deleted ${deletedCount} product${deletedCount > 1 ? 's' : ''}!`, 'success');
			} else if (deletedCount > 0 && failedCount > 0) {
				showToast(`Deleted ${deletedCount} product${deletedCount > 1 ? 's' : ''}, failed to delete ${failedCount}`, 'error');
			} else {
				showToast('Failed to delete selected products', 'error');
			}
			
			// Refresh the product list
			setTimeout(() => {
				loadProducts(currentStatus);
			}, 1000);
			
		} catch (error) {
			showToast('Error deleting products: ' + error.message, 'error');
		} finally {
			deleting = false;
		}
	}

	// Export modal state
	let exportScope = $state('current-page'); // 'current-page', 'all-products', 'selected'
	let exportFormat = $state('csv-excel'); // 'csv-excel', 'plain-csv'

	async function handleExport() {
		try {
			exporting = true;

			// Determine what to export
			let exportParams: any = {
				format: exportFormat,
				scope: exportScope
			};

			if (exportScope === 'selected') {
				if (selectedProducts.length === 0) {
					showToast('Please select products to export', 'error');
					return;
				}
				exportParams.productIds = selectedProducts;
			} else if (exportScope === 'current-page') {
				// Get current page products
				exportParams.status = currentStatus === 'all' ? undefined : currentStatus;
			}

			// Call export API
			const response = await fetch('/api/products/export', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(exportParams)
			});

			if (!response.ok) {
				throw new Error('Export failed');
			}

			// Get the file as blob
			const blob = await response.blob();
			const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'products-export.zip';

			// Create download link
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);

			showToast('Products exported successfully!', 'success');
			showExportModal = false;

		} catch (error) {
			console.error('Export error:', error);
			showToast('Export failed. Please try again.', 'error');
		} finally {
			exporting = false;
		}
	}

	function closeExportModal() {
		showExportModal = false;
		exportScope = 'current-page';
		exportFormat = 'csv-excel';
	}
</script>

<svelte:head>
	<title>Products - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">📝</span>
				Products
			</h1>
			<div class="header-actions">
				{#if selectedProducts.length > 0}
					<div class="bulk-actions">
						<span class="selected-count">{selectedProducts.length} selected</span>
						<button 
							class="btn-danger" 
							onclick={deleteSelectedProducts}
							disabled={deleting}
						>
							{#if deleting}
								<span class="loading-spinner"></span>
							{/if}
							{deleting ? 'Deleting...' : `Delete (${selectedProducts.length})`}
						</button>
					</div>
				{/if}
				<button class="btn-secondary" onclick={() => showExportModal = true}>Export</button>
				<a href="/products/new" class="btn-primary">Add product</a>
			</div>
		</div>
	</div>

	<div class="page-content">
		<!-- Tabs - Always show immediately -->
		<div class="tabs">
			{#each tabs as tab}
				<button 
					class="tab {currentStatus === tab.id ? 'active' : ''}"
					onclick={() => switchTab(tab.id)}
					disabled={loading}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		{#if error}
			<div class="error-state">
				<p>{error}</p>
				<button class="btn-secondary" onclick={() => loadProducts(currentStatus)}>
					Retry
				</button>
			</div>
		{:else if loading}
			<!-- Loading state -->
			<div class="loading-state">
				<div class="loading-content">
					<div class="loading-spinner-large"></div>
					<h3>Loading products...</h3>
					<p>This may take a moment</p>
				</div>
			</div>
		{:else if products && products.length > 0}
			<!-- Table -->
			<div class="table-container">
				<table class="products-table">
					<thead>
						<tr>
							<th class="checkbox-col">
								<input 
									type="checkbox" 
									bind:checked={selectAll}
									onchange={toggleSelectAll}
								/>
							</th>
							<th class="product-col">Product</th>
							<th>Status</th>
							<th>Inventory</th>
							<th>Category</th>
							<th>Channels</th>
							<th>Catalogs</th>
						</tr>
					</thead>
					<tbody>
						{#each products as product}
							<tr class="product-row" onclick={() => goToProduct(product.id)}>
								<td class="checkbox-col" onclick={(e) => e.stopPropagation()}>
									<input 
										type="checkbox" 
										checked={selectedProducts.includes(product.id)}
										onchange={() => toggleProduct(product.id)}
									/>
								</td>
								<td class="product-col">
									<div class="product-info">
										<div class="product-image">
											{#if getFirstImage(product)}
												<img 
													src={getFirstImage(product)} 
													alt={product.name}
													loading="lazy"
													onerror={(e) => {
														e.target.style.display = 'none';
														e.target.nextElementSibling.style.display = 'flex';
													}}
												/>
												<div class="image-fallback" style="display: none;">
													📦
												</div>
											{:else}
												<div class="image-placeholder">
													📦
												</div>
											{/if}
										</div>
										<div class="product-details">
											<div class="product-title">{product.name}</div>
											<div class="product-subtitle">{product.description}</div>
										</div>
									</div>
								</td>
								<td>
									<span class="status-badge {product.status.toLowerCase()}">
										{product.status}
									</span>
								</td>
								<td>
									<div class="inventory-info">
										{#if product.total_inventory > 0}
											<span class="inventory-text">
												{product.total_inventory} in stock for {product.variant_count} variant{product.variant_count > 1 ? 's' : ''}
											</span>
										{:else}
											<span class="inventory-text out-of-stock">
												0 in stock for {product.variant_count} variant{product.variant_count > 1 ? 's' : ''}
											</span>
										{/if}
									</div>
								</td>
								<td>
									<span class="category">—</span>
								</td>
								<td>
									<span class="channels">2</span>
								</td>
								<td>
									<span class="catalogs">1</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="pagination">
				<span class="pagination-info">1-{products.length}</span>
			</div>
		{:else}
			<div class="empty-state">
				<div class="empty-content">
					<div class="empty-icon">📦</div>
					<h3>Add your products to start selling</h3>
					<p>Start by stocking your store with products your customers will love</p>
					<a href="/products/new" class="btn-primary">Add product</a>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Toast Notifications -->
{#if toasts.length > 0}
	<div class="toast-container">
		{#each toasts as toast (toast.id)}
			<div class="toast toast-{toast.type}">
				<div class="toast-content">
					{#if toast.type === 'success'}
						<span class="toast-icon">✓</span>
					{:else}
						<span class="toast-icon">⚠</span>
					{/if}
					<span class="toast-message">{toast.message}</span>
				</div>
				<button class="toast-close" onclick={() => removeToast(toast.id)}>×</button>
			</div>
		{/each}
	</div>
{/if}

<!-- Export Modal -->
{#if showExportModal}
	<div class="modal-overlay" onclick={closeExportModal}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Export products</h2>
				<button class="modal-close" onclick={closeExportModal}>&times;</button>
			</div>
			
			<div class="modal-body">
				<div class="export-description">
					<p>This CSV file can update all product information except for inventory quantities. To update inventory quantities at multiple locations, use the <a href="#" class="link">CSV file for inventory</a> or the <a href="#" class="link">bulk editor</a>.</p>
				</div>

				<div class="export-section">
					<h3>Export</h3>
					<div class="export-options">
						<label class="radio-option">
							<input type="radio" bind:group={exportScope} value="current-page" />
							<span class="radio-label">Current page</span>
						</label>
						
						<label class="radio-option">
							<input type="radio" bind:group={exportScope} value="all-products" />
							<span class="radio-label">All products</span>
						</label>
						
						<label class="radio-option {selectedProducts.length === 0 ? 'disabled' : ''}">
							<input type="radio" bind:group={exportScope} value="selected" disabled={selectedProducts.length === 0} />
							<span class="radio-label">Selected: {selectedProducts.length} products</span>
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
							<input type="radio" bind:group={exportFormat} value="csv-excel" />
							<span class="radio-label">CSV for Excel, Numbers, or other spreadsheet programs</span>
						</label>
						
						<label class="radio-option">
							<input type="radio" bind:group={exportFormat} value="plain-csv" />
							<span class="radio-label">Plain CSV file</span>
						</label>
					</div>
				</div>

				<div class="export-footer">
					<a href="#" class="link">Learn more</a> about exporting products.
				</div>
			</div>

			<div class="modal-actions">
				<button class="btn-secondary" onclick={closeExportModal}>Cancel</button>
				<button class="btn-primary" onclick={handleExport} disabled={exporting}>
					{#if exporting}
						<span class="loading-spinner"></span>
					{/if}
					{exporting ? 'Exporting...' : 'Export products'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page {
		min-height: 100vh;
		background: #f6f6f7;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		padding: 1rem 2rem;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-main h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-icon {
		font-size: 1rem;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-primary, .btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: #202223;
		color: white;
		border: none;
	}

	.btn-primary:hover {
		background: #1a1a1a;
	}

	.btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.btn-secondary:hover {
		background: #f6f6f7;
	}

	.btn-danger {
		background: white;
		color: #d72c0d;
		border: 1px solid #d72c0d;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-danger:hover:not(:disabled) {
		background: #fef2f2;
	}

	.btn-danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.bulk-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
	}

	.selected-count {
		font-size: 0.875rem;
		color: #475569;
		font-weight: 500;
	}

	.loading-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(215, 44, 13, 0.3);
		border-radius: 50%;
		border-top-color: #d72c0d;
		animation: spin 0.8s ease-in-out infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.page-content {
		padding: 0;
	}

	.tabs {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		display: flex;
		padding: 0 2rem;
	}

	.tab {
		background: none;
		border: none;
		padding: 0.75rem 1rem;
		cursor: pointer;
		color: #6d7175;
		font-size: 0.875rem;
		border-bottom: 2px solid transparent;
		transition: all 0.15s ease;
	}

	.tab.active {
		color: #202223;
		border-bottom-color: #202223;
	}

	.tab:hover:not(:disabled) {
		color: #202223;
	}

	.tab:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.table-container {
		background: white;
		overflow-x: auto;
	}

	.products-table {
		width: 100%;
		border-collapse: collapse;
	}

	.products-table th {
		background: #fafbfb;
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: 500;
		font-size: 0.75rem;
		color: #6d7175;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		border-bottom: 1px solid #e1e1e1;
	}

	.products-table td {
		padding: 1rem;
		border-bottom: 1px solid #e1e1e1;
		vertical-align: middle;
	}

	.checkbox-col {
		width: 40px;
		padding: 1rem 0.5rem 1rem 1rem;
	}

	.product-col {
		min-width: 300px;
	}

	.product-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.product-image {
		width: 48px;
		height: 48px;
		background: #f6f6f7;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		overflow: hidden;
		position: relative;
		border: 1px solid #e1e3e5;
		flex-shrink: 0;
	}

	.product-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 7px;
		transition: transform 0.2s ease;
	}

	.product-row:hover .product-image img {
		transform: scale(1.05);
	}

	.image-placeholder,
	.image-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.6;
		background: #f6f6f7;
	}

	.product-details {
		flex: 1;
	}

	.product-title {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.product-subtitle {
		color: #6d7175;
		font-size: 0.8125rem;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-badge.active {
		background: #d1fae5;
		color: #047857;
	}

	.status-badge.draft {
		background: #f3f4f6;
		color: #6b7280;
	}

	.inventory-text {
		font-size: 0.875rem;
		color: #202223;
	}

	.inventory-text.out-of-stock {
		color: #d72c0d;
	}

	.category, .channels, .catalogs {
		font-size: 0.875rem;
		color: #202223;
	}

	.pagination {
		padding: 1rem 2rem;
		background: white;
		border-top: 1px solid #e1e1e1;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.pagination-info {
		font-size: 0.875rem;
		color: #6d7175;
	}

	.empty-state {
		background: white;
		padding: 4rem 2rem;
		text-align: center;
	}

	.empty-content {
		max-width: 400px;
		margin: 0 auto;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.4;
	}

	.empty-state h3 {
		color: #202223;
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.empty-state p {
		color: #6d7175;
		margin-bottom: 2rem;
		line-height: 1.5;
	}

	.error-state {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 1rem 2rem;
		margin: 1rem 2rem;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.loading-state {
		background: white;
		padding: 4rem 2rem;
		text-align: center;
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-content {
		max-width: 400px;
		margin: 0 auto;
	}

	.loading-spinner-large {
		display: inline-block;
		width: 40px;
		height: 40px;
		border: 4px solid #f3f4f6;
		border-radius: 50%;
		border-top-color: #202223;
		animation: spin 1s ease-in-out infinite;
		margin-bottom: 1.5rem;
	}

	.loading-state h3 {
		color: #202223;
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.loading-state p {
		color: #6d7175;
		margin-bottom: 0;
		line-height: 1.5;
	}

	input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.product-row {
		cursor: pointer;
	}

	.product-row:hover {
		background: #fafbfb;
	}

	@media (max-width: 768px) {
		.header-main {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
		
		.header-actions {
			justify-content: flex-end;
		}
		
		.products-table {
			min-width: 800px;
		}
	}

	/* Toast Notifications */
	.toast-container {
		position: fixed;
		top: 5rem;
		right: 2rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		pointer-events: none;
	}

	.toast {
		background: white;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
		border: 1px solid #e1e3e5;
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-width: 320px;
		max-width: 480px;
		pointer-events: auto;
		animation: slideIn 0.3s ease-out;
	}

	.toast-success {
		border-left: 4px solid #00a96e;
	}

	.toast-error {
		border-left: 4px solid #d72c0d;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.toast-icon {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.toast-success .toast-icon {
		background: #00a96e;
		color: white;
	}

	.toast-error .toast-icon {
		background: #d72c0d;
		color: white;
	}

	.toast-message {
		font-size: 0.875rem;
		color: #202223;
		font-weight: 500;
	}

	.toast-close {
		background: none;
		border: none;
		color: #6d7175;
		cursor: pointer;
		font-size: 1.25rem;
		padding: 0;
		margin-left: 1rem;
		transition: color 0.15s ease;
	}

	.toast-close:hover {
		color: #202223;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	/* Export Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 2rem;
	}

	.modal-content {
		background: white;
		border-radius: 12px;
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 1.5rem 1rem;
		border-bottom: 1px solid #e1e1e1;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #6d7175;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 4px;
		transition: background-color 0.15s ease;
	}

	.modal-close:hover {
		background: #f6f6f7;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.export-description {
		margin-bottom: 2rem;
	}

	.export-description p {
		color: #6d7175;
		line-height: 1.5;
		margin: 0;
		font-size: 0.875rem;
	}

	.export-section {
		margin-bottom: 2rem;
	}

	.export-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
	}

	.export-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.radio-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		padding: 0.5rem 0;
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
		font-size: 0.875rem;
		color: #202223;
		cursor: pointer;
	}

	.radio-label.muted {
		color: #6d7175;
	}

	.radio-option.disabled .radio-label {
		cursor: not-allowed;
	}

	.export-footer {
		margin-top: 1.5rem;
		font-size: 0.875rem;
		color: #6d7175;
	}

	.link {
		color: #005bd3;
		text-decoration: none;
	}

	.link:hover {
		text-decoration: underline;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem 1.5rem;
		border-top: 1px solid #e1e1e1;
	}

	.modal-actions .btn-primary,
	.modal-actions .btn-secondary {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.modal-actions .btn-primary {
		background: #202223;
		color: white;
		border: none;
	}

	.modal-actions .btn-primary:hover:not(:disabled) {
		background: #1a1a1a;
	}

	.modal-actions .btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.modal-actions .btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.modal-actions .btn-secondary:hover {
		background: #f6f6f7;
	}
</style>