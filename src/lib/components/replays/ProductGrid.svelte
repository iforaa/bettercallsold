<script lang="ts">
	import type { ProductGridProps } from '$lib/types/replays';
	
	let { 
		products,
		maxItems = 0,
		showMore = false,
		onProductClick,
		className = ''
	}: ProductGridProps = $props();
	
	// State for showing/hiding additional products
	let showingAll = $state(false);
	
	// Computed products to display - using $derived.by for more explicit reactivity
	let displayProducts = $derived.by(() => {
		if (!products || !Array.isArray(products) || products.length === 0) {
			return [];
		}
		
		if (maxItems > 0 && !showingAll) {
			return products.slice(0, maxItems);
		}
		
		return products;
	});
	
	let hasMoreProducts = $derived.by(() => {
		if (!products || !Array.isArray(products)) return false;
		return maxItems > 0 && products.length > maxItems;
	});
	
	let hiddenCount = $derived.by(() => {
		if (!hasMoreProducts || !products || !Array.isArray(products)) return 0;
		return products.length - maxItems;
	});
	
	function handleProductClick(product: any) {
		if (onProductClick) {
			onProductClick(product);
		}
	}
	
	function toggleShowAll() {
		showingAll = !showingAll;
	}
	
	function formatPrice(product: any): string {
		if (product.price_label) {
			return product.price_label;
		} else if (product.price) {
			return `$${product.price.toFixed(2)}`;
		}
		return 'Price not available';
	}
</script>

{#if products?.length > 0}
	<div class="product-grid {className}">
		<div class="products-container">
			{#each displayProducts as product (product.id)}
				<div 
					class="product-item"
					class:clickable={!!onProductClick}
					onclick={() => handleProductClick(product)}
					role={onProductClick ? 'button' : undefined}
					tabindex={onProductClick ? 0 : undefined}
					onkeydown={onProductClick ? (e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleProductClick(product);
						}
					} : undefined}
				>
					<div class="product-image">
						{#if product.thumbnail}
							<img 
								src={product.thumbnail} 
								alt={product.product_name}
								loading="lazy"
							/>
						{:else}
							<div class="product-placeholder">📦</div>
						{/if}
					</div>
					
					<div class="product-details">
						<h4 class="product-name">{product.product_name}</h4>
						
						{#if product.brand}
							<div class="product-brand">{product.brand}</div>
						{/if}
						
						<div class="product-price">{formatPrice(product)}</div>
						
						{#if product.quantity !== null && product.quantity !== undefined}
							<div class="product-quantity">Qty: {product.quantity}</div>
						{/if}
						
						{#if product.badge_label}
							<div class="product-badge">{product.badge_label}</div>
						{/if}
						
						{#if product.shown_at_formatted}
							<div class="product-timing">
								<span class="timing-icon">🕒</span>
								Shown: {product.shown_at_formatted}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
		
		{#if hasMoreProducts && showMore}
			<div class="show-more-section">
				<button 
					class="btn btn-ghost btn-sm show-more-btn" 
					onclick={toggleShowAll}
				>
					{#if showingAll}
						<span>Show Less</span>
						<span class="show-more-icon">▲</span>
					{:else}
						<span>Show {hiddenCount || 0} More Product{(hiddenCount || 0) === 1 ? '' : 's'}</span>
						<span class="show-more-icon">▼</span>
					{/if}
				</button>
			</div>
		{/if}
	</div>
{:else}
	<div class="products-empty">
		<div class="empty-icon">📦</div>
		<h4>No Products</h4>
		<p>No products were featured in this replay</p>
	</div>
{/if}

<style>
	.product-grid {
		width: 100%;
	}
	
	.products-container {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-4);
	}
	
	.product-item {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
	}
	
	.product-item:hover {
		border-color: var(--color-border-hover);
		box-shadow: var(--shadow-sm);
	}
	
	.product-item.clickable {
		cursor: pointer;
	}
	
	.product-item.clickable:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}
	
	.product-image {
		width: 60px;
		height: 60px;
		flex-shrink: 0;
		background: var(--color-surface-hover);
		border-radius: var(--radius-sm);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.product-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	
	.product-placeholder {
		font-size: var(--font-size-xl);
		opacity: 0.6;
		color: var(--color-text-muted);
	}
	
	.product-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	
	.product-name {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
		line-height: var(--line-height-tight);
		word-break: break-word;
	}
	
	.product-brand {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
	}
	
	.product-price {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-success);
	}
	
	.product-quantity {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}
	
	.product-badge {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		background: var(--color-success-bg);
		color: var(--color-success-text);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		align-self: flex-start;
	}
	
	.product-timing {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-top: auto; /* Push to bottom */
	}
	
	.timing-icon {
		font-size: var(--font-size-xs);
		opacity: 0.8;
	}
	
	/* Show more section */
	.show-more-section {
		display: flex;
		justify-content: center;
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border-light);
	}
	
	.show-more-btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
	}
	
	.show-more-icon {
		font-size: var(--font-size-xs);
		transition: transform var(--transition-fast);
	}
	
	/* Empty state */
	.products-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-8);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	
	.empty-icon {
		font-size: var(--font-size-3xl);
		margin-bottom: var(--space-4);
		opacity: 0.6;
	}
	
	.products-empty h4 {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-2) 0;
	}
	
	.products-empty p {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
	}
	
	/* Responsive adjustments */
	@media (max-width: 768px) {
		.products-container {
			grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
			gap: var(--space-3);
		}
		
		.product-item {
			padding: var(--space-3);
		}
		
		.product-image {
			width: 50px;
			height: 50px;
		}
	}
	
	@media (max-width: 480px) {
		.products-container {
			grid-template-columns: 1fr;
		}
		
		.product-item {
			flex-direction: row;
			gap: var(--space-3);
		}
		
		.product-details {
			gap: var(--space-2);
		}
		
		.show-more-btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>