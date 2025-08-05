<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	// State management
	let product = $state(null);
	let variants = $state([]);
	let loading = $state(true);
	let error = $state('');
	let selectedVariant = $state(null);
	let selectedColor = $state('');
	let selectedSize = $state('');
	let quantity = $state(1);
	let activeImageIndex = $state(0);
	let addingToCart = $state(false);

	// Get product ID from route params
	let productId = $derived($page.params.id);

	// Derived values
	let availableColors = $derived(() => {
		if (!variants || variants.length === 0) return [];
		return [...new Set(variants.filter(v => v.color).map(v => v.color))];
	});

	let availableSizes = $derived(() => {
		if (!variants || variants.length === 0) return [];
		// Filter sizes based on selected color if one is selected
		let filteredVariants = selectedColor 
			? variants.filter(v => v.color === selectedColor)
			: variants;
		return [...new Set(filteredVariants.filter(v => v.size).map(v => v.size))];
	});

	let currentVariant = $derived(() => {
		if (!variants || variants.length === 0) return null;
		
		// Find variant that matches selected color and size
		return variants.find(v => 
			(!selectedColor || v.color === selectedColor) &&
			(!selectedSize || v.size === selectedSize)
		) || variants[0];
	});

	let currentPrice = $derived(() => {
		return currentVariant?.price || product?.price || 0;
	});

	let isInStock = $derived(() => {
		return currentVariant?.inventory_quantity > 0;
	});

	let productImages = $derived(() => {
		if (!product?.images) return [];
		if (Array.isArray(product.images)) {
			return product.images.map(img => 
				typeof img === 'string' ? img : img.url
			).filter(url => url);
		}
		return [];
	});

	// Load product data
	async function loadProduct() {
		if (!browser || !productId) return;
		
		try {
			loading = true;
			error = '';

			const response = await fetch(`/api/products/${productId}`);
			
			if (!response.ok) {
				throw new Error('Product not found');
			}

			const data = await response.json();
			
			// Handle different API response structures
			if (data.product) {
				product = data.product;
			} else {
				product = data;
			}
			
			// Transform inventory items to variants - check multiple possible structures
			const inventoryItems = product?.inventory_items || data?.inventory_items || [];
			if (inventoryItems && Array.isArray(inventoryItems)) {
				variants = inventoryItems.map(item => ({
					id: item.id,
					color: item.variant_combination?.color || '',
					size: item.variant_combination?.size || '',
					price: item.price || product?.price || 0,
					inventory_quantity: item.quantity || 0,
					sku: item.sku || ''
				}));
			} else {
				// If no variants, create a default one
				variants = [{
					id: 'default',
					color: '',
					size: '',
					price: product?.price || 0,
					inventory_quantity: 999,
					sku: ''
				}];
			}

			// Auto-select first available options
			if (availableColors.length > 0 && !selectedColor) {
				selectedColor = availableColors[0];
			}
			if (availableSizes.length > 0 && !selectedSize) {
				selectedSize = availableSizes[0];
			}

		} catch (err) {
			console.error('Load product error:', err);
			error = err.message || 'Failed to load product';
		} finally {
			loading = false;
		}
	}

	// Handle color selection
	function selectColor(color: string) {
		selectedColor = color;
		// Reset size if current size is not available for this color
		const sizesForColor = variants
			.filter(v => v.color === color && v.size)
			.map(v => v.size);
		if (selectedSize && !sizesForColor.includes(selectedSize)) {
			selectedSize = sizesForColor[0] || '';
		}
	}

	// Handle size selection
	function selectSize(size: string) {
		selectedSize = size;
	}

	// Add to cart
	async function addToCart() {
		if (!currentVariant || !isInStock) return;
		
		addingToCart = true;
		
		try {
			// TODO: Implement actual cart functionality
			// For now, just simulate adding to cart
			await new Promise(resolve => setTimeout(resolve, 500));
			
			// Add to localStorage cart for now
			const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
			const existingItemIndex = cartItems.findIndex(item => 
				item.variantId === currentVariant.id
			);
			
			if (existingItemIndex >= 0) {
				cartItems[existingItemIndex].quantity += quantity;
			} else {
				cartItems.push({
					productId: product.id,
					variantId: currentVariant.id,
					productName: product.name,
					color: selectedColor,
					size: selectedSize,
					price: currentPrice,
					quantity: quantity,
					image: productImages[0] || null
				});
			}
			
			localStorage.setItem('cart', JSON.stringify(cartItems));
			
			// Show success (you could add a toast notification here)
			console.log('Added to cart:', {
				product: product.name,
				variant: currentVariant,
				quantity
			});
			
		} catch (error) {
			console.error('Add to cart error:', error);
		} finally {
			addingToCart = false;
		}
	}

	// Format currency
	function formatCurrency(amount: number) {
		if (!amount) return '$0.00';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	// Load product on mount
	onMount(() => {
		loadProduct();
	});
</script>

<svelte:head>
	<title>{product?.name || 'Product'} - Store</title>
	<meta name="description" content={product?.description || 'Product details'} />
</svelte:head>

{#if loading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading product...</p>
	</div>
{:else if error}
	<div class="error-container">
		<p>Error: {error}</p>
		<a href="/store" class="back-link">← Back to Store</a>
	</div>
{:else if product}
	<div class="product-page">
		<div class="product-container">
			<!-- Product Images -->
			<div class="product-images">
				{#if productImages.length > 0}
					<div class="main-image">
						<img 
							src={productImages[activeImageIndex]} 
							alt={product.name}
							class="product-image"
						/>
					</div>
					{#if productImages.length > 1}
						<div class="image-thumbnails">
							{#each productImages as image, index}
								<button 
									class="thumbnail"
									class:active={index === activeImageIndex}
									onclick={() => activeImageIndex = index}
								>
									<img src={image} alt={`${product.name} ${index + 1}`} />
								</button>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="placeholder-image">
						<span>📦</span>
						<p>No image available</p>
					</div>
				{/if}
			</div>

			<!-- Product Details -->
			<div class="product-details">
				<h1 class="product-title">{product.name}</h1>
				<div class="product-price">
					{formatCurrency(currentPrice)}
				</div>

				{#if product.description}
					<div class="product-description">
						<p>{product.description}</p>
					</div>
				{/if}

				<!-- Variant Selection -->
				{#if availableColors.length > 0}
					<div class="variant-section">
						<h3 class="variant-label">Color</h3>
						<div class="color-options">
							{#each availableColors as color}
								<button 
									class="color-option"
									class:selected={selectedColor === color}
									onclick={() => selectColor(color)}
								>
									{color}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if availableSizes.length > 0}
					<div class="variant-section">
						<h3 class="variant-label">Size</h3>
						<div class="size-options">
							{#each availableSizes as size}
								<button 
									class="size-option"
									class:selected={selectedSize === size}
									onclick={() => selectSize(size)}
								>
									{size}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Quantity and Add to Cart -->
				<div class="purchase-section">
					<div class="quantity-selector">
						<label for="quantity">Quantity</label>
						<div class="quantity-controls">
							<button 
								class="quantity-btn"
								onclick={() => quantity = Math.max(1, quantity - 1)}
								disabled={quantity <= 1}
							>
								−
							</button>
							<input 
								id="quantity"
								type="number" 
								bind:value={quantity}
								min="1"
								max={currentVariant?.inventory_quantity || 99}
								class="quantity-input"
							/>
							<button 
								class="quantity-btn"
								onclick={() => quantity = Math.min(currentVariant?.inventory_quantity || 99, quantity + 1)}
								disabled={quantity >= (currentVariant?.inventory_quantity || 99)}
							>
								+
							</button>
						</div>
					</div>

					<button 
						class="add-to-cart-btn"
						onclick={addToCart}
						disabled={!isInStock || addingToCart}
					>
						{#if addingToCart}
							<span class="loading-spinner-small"></span>
							Adding...
						{:else if !isInStock}
							Out of Stock
						{:else}
							Add to Cart
						{/if}
					</button>
				</div>

				<!-- Stock Status -->
				{#if currentVariant}
					<div class="stock-info">
						{#if currentVariant.inventory_quantity > 10}
							<span class="stock-status in-stock">✓ In Stock</span>
						{:else if currentVariant.inventory_quantity > 0}
							<span class="stock-status low-stock">⚠ Only {currentVariant.inventory_quantity} left</span>
						{:else}
							<span class="stock-status out-of-stock">✗ Out of Stock</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.loading-container,
	.error-container {
		min-height: 400px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		color: var(--store-secondary-color);
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f4f6;
		border-top-color: var(--store-accent-color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.loading-spinner-small {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.back-link {
		color: var(--store-accent-color);
		text-decoration: none;
		font-weight: 500;
	}

	.product-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.product-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
		align-items: start;
	}

	/* Product Images */
	.product-images {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.main-image {
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 8px;
		background: #f9fafb;
	}

	.product-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.image-thumbnails {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
	}

	.thumbnail {
		width: 80px;
		height: 80px;
		border: 2px solid transparent;
		border-radius: 6px;
		overflow: hidden;
		cursor: pointer;
		background: none;
		padding: 0;
		transition: border-color 0.2s ease;
	}

	.thumbnail.active {
		border-color: var(--store-accent-color);
	}

	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.placeholder-image {
		aspect-ratio: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #f9fafb;
		border-radius: 8px;
		color: var(--store-secondary-color);
	}

	.placeholder-image span {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	/* Product Details */
	.product-details {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.product-title {
		font-size: 2rem;
		font-weight: 300;
		color: var(--store-primary-color);
		margin: 0;
		line-height: 1.2;
	}

	.product-price {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--store-accent-color);
	}

	.product-description {
		color: var(--store-secondary-color);
		line-height: 1.6;
	}

	.product-description p {
		margin: 0;
	}

	/* Variant Selection */
	.variant-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.variant-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--store-primary-color);
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.color-options,
	.size-options {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.color-option,
	.size-option {
		padding: 0.75rem 1rem;
		border: 2px solid #e5e7eb;
		background: white;
		color: var(--store-primary-color);
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
		text-transform: capitalize;
	}

	.color-option:hover,
	.size-option:hover {
		border-color: var(--store-accent-color);
	}

	.color-option.selected,
	.size-option.selected {
		border-color: var(--store-accent-color);
		background: var(--store-accent-color);
		color: white;
	}

	/* Purchase Section */
	.purchase-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.quantity-selector {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.quantity-selector label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--store-primary-color);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.quantity-controls {
		display: flex;
		align-items: center;
		width: fit-content;
		border: 2px solid #e5e7eb;
		border-radius: 6px;
		overflow: hidden;
	}

	.quantity-btn {
		width: 40px;
		height: 40px;
		border: none;
		background: white;
		color: var(--store-primary-color);
		cursor: pointer;
		font-size: 1.25rem;
		font-weight: 600;
		transition: background-color 0.2s ease;
	}

	.quantity-btn:hover:not(:disabled) {
		background: #f9fafb;
	}

	.quantity-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.quantity-input {
		width: 60px;
		height: 40px;
		border: none;
		border-left: 1px solid #e5e7eb;
		border-right: 1px solid #e5e7eb;
		text-align: center;
		font-weight: 600;
		color: var(--store-primary-color);
		background: white;
	}

	.quantity-input:focus {
		outline: none;
	}

	.add-to-cart-btn {
		width: 100%;
		padding: 1rem;
		background: var(--store-primary-color);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.add-to-cart-btn:hover:not(:disabled) {
		background: var(--store-accent-color);
		transform: translateY(-1px);
	}

	.add-to-cart-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	/* Stock Info */
	.stock-info {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.stock-status.in-stock {
		color: #059669;
	}

	.stock-status.low-stock {
		color: #d97706;
	}

	.stock-status.out-of-stock {
		color: #dc2626;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.product-container {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.product-title {
			font-size: 1.5rem;
		}

		.product-price {
			font-size: 1.25rem;
		}

		.image-thumbnails {
			justify-content: center;
		}

		.color-options,
		.size-options {
			justify-content: center;
		}
	}
</style>