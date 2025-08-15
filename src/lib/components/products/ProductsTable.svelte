<script lang="ts">
	import { goto } from '$app/navigation';
	import { getProductStatusDisplay, getProductStatusColor, getInventoryStatusInfo } from '$lib/utils/status';
	import type { Product } from '$lib/types/products';
	import LoadingState from '../states/LoadingState.svelte';
	import EmptyState from '../states/EmptyState.svelte';

	interface Props {
		products: Product[];
		loading?: boolean;
		selectedProducts?: string[];
		onProductSelect?: (productId: string) => void;
		onSelectAll?: (selected: boolean) => void;
		showSelection?: boolean;
	}

	let {
		products,
		loading = false,
		selectedProducts = [],
		onProductSelect = () => {},
		onSelectAll = () => {},
		showSelection = false
	}: Props = $props();

	// Computed values
	let allSelected = $derived(
		products.length > 0 && selectedProducts.length === products.length
	);
	
	let someSelected = $derived(
		selectedProducts.length > 0 && selectedProducts.length < products.length
	);

	function handleSelectAll() {
		onSelectAll(!allSelected);
	}

	function handleProductSelect(productId: string, event: Event) {
		event.stopPropagation();
		onProductSelect(productId);
	}

	function goToProduct(productId: string) {
		goto(`/products/${productId}`);
	}

	function getFirstImage(product: Product): string | null {
		try {
			if (!product.images) return null;
			
			let images = product.images;
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

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}
</script>

<!-- Loading State -->
{#if loading}
	<div class="page-content-padded">
		<LoadingState 
			message="Loading products..." 
			size="lg"
		/>
	</div>
{:else if products.length === 0}
	<!-- Empty State -->
	<div class="page-content-padded">
		<EmptyState 
			title="Add your products to start selling"
			description="Start by stocking your store with products your customers will love"
			icon="📦"
		>
			<a href="/products/new" class="btn btn-primary">Add product</a>
		</EmptyState>
	</div>
{:else}
	<!-- Products Table -->
	<div class="table-container">
		<table class="data-table">
			<thead>
				<tr>
					{#if showSelection}
						<th class="checkbox-col">
							<input 
								type="checkbox" 
								checked={allSelected}
								indeterminate={someSelected}
								onchange={handleSelectAll}
							/>
						</th>
					{/if}
					<th class="product-col">Product</th>
					<th>Status</th>
					<th class="inventory-col">Inventory</th>
					<th>Category</th>
					<th>Channels</th>
					<th>Catalogs</th>
				</tr>
			</thead>
			<tbody>
				{#each products as product (product.id)}
					<tr class="data-table-row clickable" onclick={() => goToProduct(product.id)}>
						{#if showSelection}
							<td class="checkbox-col" onclick={(e) => e.stopPropagation()}>
								<input 
									type="checkbox" 
									checked={selectedProducts.includes(product.id)}
									onchange={(e) => handleProductSelect(product.id, e)}
								/>
							</td>
						{/if}
						<td class="table-product-col">
							<div class="table-product-info">
								<div class="table-product-image">
									{#if getFirstImage(product)}
										<img 
											src={getFirstImage(product)} 
											alt={product.name}
											loading="lazy"
											onerror={(e) => {
												e.target.style.display = 'none';
												e.target.nextElementSibling.style.display = 'flex';
											}}
											class="image-cover"
										/>
										<div class="table-image-fallback" style="display: none;">
											📦
										</div>
									{:else}
										<div class="table-image-placeholder">
											📦
										</div>
									{/if}
								</div>
								<div class="table-product-details">
									<div class="table-product-title">{product.name}</div>
								</div>
							</div>
						</td>
						<td>
							<span class="status-badge status-{getProductStatusColor(product.status)} text-caps">
								{getProductStatusDisplay(product.status)}
							</span>
						</td>
						<td class="table-inventory-col">
							<div class="table-inventory-info">
								{#if product.total_inventory && product.total_inventory > 0}
									<span class="table-inventory-text">
										{product.total_inventory} in stock
										{#if product.variant_count && product.variant_count > 0}
											for {product.variant_count} variant{product.variant_count > 1 ? 's' : ''}
										{/if}
									</span>
								{:else}
									<span class="table-inventory-text text-error">
										0 in stock
										{#if product.variant_count && product.variant_count > 0}
											for {product.variant_count} variant{product.variant_count > 1 ? 's' : ''}
										{/if}
									</span>
								{/if}
							</div>
						</td>
						<td>
							<span class="table-category text-muted">
								{product.product_type || '—'}
							</span>
						</td>
						<td>
							<span class="table-channels">2</span>
						</td>
						<td>
							<span class="table-catalogs">
								{product.product_collections?.length || 0}
							</span>
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
{/if}

<style>
	/* Table columns sizing */
	.checkbox-col {
		width: 40px;
		padding: var(--space-3) var(--space-2) var(--space-3) var(--space-4);
	}

	.table-product-col {
		min-width: 250px;
		width: 30%;
		padding-left: var(--space-2); /* Reduce left padding from default */
	}

	.table-inventory-col {
		min-width: 200px;
		width: 25%;
	}

	/* Product display in table */
	.table-product-info {
		display: flex;
		align-items: center;
		gap: var(--space-2); /* Back to space-2 for better visual balance */
	}

	.table-product-image {
		width: 40px;
		height: 40px;
		background: var(--color-surface-hover);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-base);
		overflow: hidden;
		border: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.table-image-placeholder,
	.table-image-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
	}

	.table-product-details {
		flex: 1;
	}

	.table-product-title {
		font-weight: var(--font-weight-normal);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		margin-bottom: 0;
	}

	/* Inventory display */
	.table-inventory-info {
		display: flex;
		flex-direction: column;
	}

	.table-inventory-text {
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.table-category, .table-channels, .table-catalogs {
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	/* Status badges - product specific */
	.status-success {
		background: var(--color-success-bg);
		color: var(--color-success-text);
	}

	.status-warning {
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
	}

	.status-error {
		background: var(--color-error-bg);
		color: var(--color-error-text);
	}

	.status-default {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.data-table {
			min-width: 800px;
		}
		
		.table-product-image {
			width: 32px;
			height: 32px;
		}
	}
</style>