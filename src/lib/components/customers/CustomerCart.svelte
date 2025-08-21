<script lang="ts">
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import { CustomerService } from '$lib/services/CustomerService.js';

	interface CartItem {
		id: string;
		product_id: string;
		product_name: string;
		product_price: number;
		product_images?: { url: string; alt?: string }[];
		quantity: number;
		variant_data?: {
			color?: string;
			size?: string;
			[key: string]: any;
		};
	}

	interface Props {
		cartItems: CartItem[];
		loading?: boolean;
		onProductClick?: (productId: string) => void;
		className?: string;
	}

	let { 
		cartItems,
		loading = false,
		onProductClick,
		className = ''
	}: Props = $props();

	function handleProductClick(productId: string) {
		if (onProductClick) {
			onProductClick(productId);
		}
	}
</script>

<div class="customer-cart {className}">
	{#if loading}
		<LoadingState message="Loading cart items..." size="lg" />
	{:else if cartItems.length > 0}
		<div class="item-grid">
			{#each cartItems as item}
				<div 
					class="product-card product-card-clickable" 
					onclick={() => handleProductClick(item.product_id)}
				>
					<div class="product-card-image">
						{#if item.product_images && item.product_images.length > 0}
							<img 
								src={item.product_images[0].url} 
								alt={item.product_name}
								loading="lazy"
							/>
						{:else}
							<div class="product-card-placeholder">📦</div>
						{/if}
					</div>
					<div class="product-card-content">
						<div class="product-card-title">{item.product_name}</div>
						{#if item.variant_data && (item.variant_data.color || item.variant_data.size)}
							<div class="product-card-variants">
								{#if item.variant_data.color}
									<span class="variant-item">{item.variant_data.color}</span>
								{/if}
								{#if item.variant_data.size}
									<span class="variant-item">{item.variant_data.size}</span>
								{/if}
							</div>
						{/if}
						<div class="product-card-meta">Qty: {item.quantity}</div>
					</div>
					<div class="product-card-price">
						{CustomerService.formatCurrency(item.product_price)}
						{#if item.quantity > 1}
							<div class="product-card-subtotal">
								Total: {CustomerService.formatCurrency(item.product_price * item.quantity)}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Cart Summary -->
		<div class="cart-summary">
			<div class="summary-card">
				<div class="summary-row">
					<span class="summary-label">Items in cart:</span>
					<span class="summary-value">{cartItems.length}</span>
				</div>
				<div class="summary-row">
					<span class="summary-label">Total quantity:</span>
					<span class="summary-value">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
				</div>
				<div class="summary-row summary-row-total">
					<span class="summary-label">Estimated total:</span>
					<span class="summary-value">
						{CustomerService.formatCurrency(
							cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0)
						)}
					</span>
				</div>
			</div>
		</div>
	{:else}
		<EmptyState 
			icon="🛒"
			title="No cart items found"
			description="Cart items will appear here when the customer adds products"
		/>
	{/if}
</div>

<style>
	.customer-cart {
		width: 100%;
	}

	.product-card-clickable {
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.product-card-clickable:hover {
		border-color: var(--color-border-dark);
		box-shadow: var(--shadow-sm);
		transform: translateY(-1px);
	}

	.product-card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: var(--radius-sm);
	}

	.variant-item {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		background: var(--color-surface-hover);
		color: var(--color-text-muted);
		margin-right: var(--space-1);
	}

	.product-card-subtotal {
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
		margin-top: var(--space-1);
		font-weight: var(--font-weight-medium);
	}

	/* Cart Summary */
	.cart-summary {
		margin-top: var(--space-6);
	}

	.summary-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		max-width: 300px;
		margin-left: auto;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-border-light);
	}

	.summary-row:last-child {
		border-bottom: none;
	}

	.summary-row-total {
		padding-top: var(--space-3);
		margin-top: var(--space-2);
		border-top: 1px solid var(--color-border);
		border-bottom: none;
		font-weight: var(--font-weight-semibold);
		font-size: var(--font-size-base);
	}

	.summary-label {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.summary-value {
		color: var(--color-text);
		font-weight: var(--font-weight-medium);
		font-size: var(--font-size-sm);
	}

	.summary-row-total .summary-label,
	.summary-row-total .summary-value {
		color: var(--color-text);
		font-size: var(--font-size-base);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.product-card {
			padding: var(--space-3);
			gap: var(--space-3);
		}
		
		.product-card-image {
			width: 48px;
			height: 48px;
		}
		
		.summary-card {
			max-width: none;
			margin: 0;
		}
	}
</style>