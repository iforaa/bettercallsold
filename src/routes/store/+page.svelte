<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// State management
	let settings = $state(null);
	let products = $state([]);
	let collections = $state([]);
	let loading = $state(true);
	let error = $state('');

	// Derived values from settings
	let heroImageUrl = $derived(settings?.hero_image_url);
	let heroTitle = $derived(settings?.hero_title || 'Welcome to our store');
	let heroSubtitle = $derived(settings?.hero_subtitle || 'Discover amazing products');
	let heroCta = $derived(settings?.hero_cta_text || 'Shop Now');
	let heroClaUrl = $derived(settings?.hero_cta_url || '/store/catalog');
	let storeEnabled = $derived(settings?.store_enabled !== false); // Default to true if not set

	// Load store settings and featured products
	async function loadStoreData() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';

			// Load store settings
			const settingsResponse = await fetch('/api/webstore/settings');
			if (settingsResponse.ok) {
				settings = await settingsResponse.json();
			}

			// Load featured products (first 16 products to account for filtering)
			const productsResponse = await fetch('/api/products?limit=16');
			if (productsResponse.ok) {
				const productsData = await productsResponse.json();
				let allProducts = productsData.products || productsData || [];
				
				// Filter out products without images and take first 8
				products = allProducts
					.filter(product => {
						if (!product.images) return false;
						if (Array.isArray(product.images) && product.images.length === 0) return false;
						if (typeof product.images === 'string') {
							try {
								const parsed = JSON.parse(product.images);
								return Array.isArray(parsed) && parsed.length > 0;
							} catch {
								return false;
							}
						}
						return true;
					})
					.slice(0, 8);
			}

			// Load collections
			const collectionsResponse = await fetch('/api/collections');
			if (collectionsResponse.ok) {
				const collectionsData = await collectionsResponse.json();
				collections = collectionsData || [];
			}

		} catch (err) {
			console.error('Load store data error:', err);
			error = 'Failed to load store data';
		} finally {
			loading = false;
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

	// Get product image
	function getProductImage(product: any): string {
		if (product.images && Array.isArray(product.images) && product.images.length > 0) {
			return typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url;
		}
		return '/placeholder-product.jpg'; // You'll need to add this placeholder image
	}

	// Load data on mount
	onMount(() => {
		loadStoreData();
	});
</script>

<svelte:head>
	<title>{settings?.store_name || 'My Store'}</title>
	<meta name="description" content={settings?.meta_description || `Welcome to ${settings?.store_name || 'our store'}`} />
</svelte:head>

{#if loading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading store...</p>
	</div>
{:else if error}
	<div class="error-container">
		<p>Error: {error}</p>
		<button class="retry-btn" onclick={() => loadStoreData()}>Retry</button>
	</div>
{:else if !storeEnabled}
	<div class="store-disabled">
		<div class="disabled-content">
			<h1>Store Temporarily Unavailable</h1>
			<p>We're currently updating our store. Please check back soon!</p>
		</div>
	</div>
{:else}
	<!-- Hero Section -->
	<section class="hero-section" style:background-image={heroImageUrl ? `url(${heroImageUrl})` : 'none'}>
		<div class="hero-overlay">
			<div class="hero-container">
				<div class="hero-content">
					<h1 class="hero-title">{heroTitle}</h1>
					<p class="hero-subtitle">{heroSubtitle}</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Collections Section -->
	{#if collections.length > 0}
		<section class="collections-section">
			<div class="section-container">
				<div class="collections-list">
					{#each collections as collection}
						<div class="collection-item">
							<a href="/store/catalog?collection={collection.id}" class="collection-link">
								<h2 class="collection-name">{collection.name || 'Untitled Collection'}</h2>
								<span class="collection-count">{collection.product_count || 0}</span>
							</a>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Featured Products Section -->
	{#if products.length > 0}
		<section class="featured-section">
			<div class="section-container">
				<div class="section-header">
					<h2 class="section-title">Featured Products</h2>
					<a href="/store/catalog" class="view-all-link">View All</a>
				</div>
				
				<div class="products-grid">
					{#each products as product}
						<div class="product-card">
							<a href="/store/products/{product.id}" class="product-link">
								<div class="product-image">
									<img 
										src={getProductImage(product)} 
										alt={product.name || 'Product'}
										loading="lazy"
									/>
								</div>
								<div class="product-info">
									<h3 class="product-title">{product.name || 'Untitled Product'}</h3>
									<div class="product-price">
										{formatCurrency(product.price || 0)}
									</div>
								</div>
							</a>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Additional Content Sections -->
	<section class="content-section">
		<div class="section-container">
			<div class="content-grid">
				<div class="content-block">
					<h3>Premium Quality</h3>
					<p>We source only the finest materials and work with skilled artisans to create products that stand the test of time.</p>
				</div>
				<div class="content-block">
					<h3>Fast Shipping</h3>
					<p>Get your orders quickly with our expedited shipping options. Most orders arrive within 2-5 business days.</p>
				</div>
				<div class="content-block">
					<h3>Easy Returns</h3>
					<p>Not satisfied? Return your purchase within 30 days for a full refund. No questions asked.</p>
				</div>
			</div>
		</div>
	</section>
{/if}

<style>
	/* Loading & Error States */
	.loading-container,
	.error-container,
	.store-disabled {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		color: var(--store-secondary-color);
	}

	.disabled-content {
		text-align: center;
		max-width: 500px;
		padding: 2rem;
	}

	.disabled-content h1 {
		color: var(--store-primary-color);
		font-size: 2rem;
		font-weight: 300;
		margin-bottom: 1rem;
	}

	.disabled-content p {
		font-size: 1.125rem;
		color: var(--store-secondary-color);
		margin: 0;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f4f6;
		border-top-color: var(--store-accent-color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.retry-btn {
		background: var(--store-primary-color);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Hero Section */
	.hero-section {
		position: relative;
		height: 500px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		background-size: cover;
		background-position: center;
		background-attachment: fixed;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-container {
		max-width: 1200px;
		width: 100%;
		padding: 0 1rem;
	}

	.hero-content {
		text-align: center;
		color: white;
		max-width: 600px;
		margin: 0 auto;
	}

	.hero-title {
		font-size: 3rem;
		font-weight: 300;
		margin-bottom: 1rem;
		line-height: 1.2;
		letter-spacing: -0.025em;
	}

	.hero-subtitle {
		font-size: 1.25rem;
		margin-bottom: 2rem;
		opacity: 0.9;
		font-weight: 300;
	}


	/* Collections Section */
	.collections-section {
		padding: 4rem 0;
		background: white;
	}

	.collections-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 800px;
	}

	.collection-item {
		border-bottom: 1px solid #f3f4f6;
		padding-bottom: 1.5rem;
	}

	.collection-item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.collection-link {
		text-decoration: none;
		color: inherit;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		transition: color 0.2s ease;
	}

	.collection-link:hover {
		color: var(--store-accent-color);
	}

	.collection-name {
		font-size: 2rem;
		font-weight: 300;
		color: var(--store-primary-color);
		margin: 0;
		line-height: 1.2;
		letter-spacing: -0.025em;
		flex: 1;
	}

	.collection-count {
		font-size: 1rem;
		color: var(--store-secondary-color);
		font-weight: 400;
		margin-left: 1rem;
		flex-shrink: 0;
	}

	/* Featured Products Section */
	.featured-section {
		padding: 4rem 0;
		background: white;
	}

	.section-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 3rem;
	}

	.section-title {
		font-size: 2rem;
		font-weight: 300;
		color: var(--store-primary-color);
		margin: 0;
		letter-spacing: -0.025em;
	}

	.view-all-link {
		color: var(--store-accent-color);
		text-decoration: none;
		font-weight: 500;
		text-transform: uppercase;
		font-size: 0.875rem;
		letter-spacing: 0.025em;
		transition: color 0.2s ease;
	}

	.view-all-link:hover {
		color: var(--store-primary-color);
	}

	.products-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 2rem;
	}

	.product-card {
		background: white;
		border-radius: 8px;
		overflow: hidden;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		border: 1px solid #f3f4f6;
	}

	.product-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
	}

	.product-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.product-image {
		aspect-ratio: 1;
		overflow: hidden;
		background: #f9fafb;
		position: relative;
	}

	.product-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s ease;
	}

	.product-card:hover .product-image img {
		transform: scale(1.05);
	}

	.product-info {
		padding: 1.5rem;
	}

	.product-title {
		font-size: 1rem;
		font-weight: 500;
		color: var(--store-primary-color);
		margin: 0 0 0.5rem 0;
		line-height: 1.4;
	}

	.product-price {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--store-accent-color);
	}

	/* Content Section */
	.content-section {
		padding: 4rem 0;
		background: #f9fafb;
	}

	.content-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 3rem;
	}

	.content-block {
		text-align: center;
	}

	.content-block h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--store-primary-color);
		margin-bottom: 1rem;
	}

	.content-block p {
		color: var(--store-secondary-color);
		line-height: 1.6;
		margin: 0;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.hero-title {
			font-size: 2rem;
		}

		.hero-subtitle {
			font-size: 1rem;
		}

		.section-header {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}

		.products-grid {
			grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
			gap: 1.5rem;
		}

		.content-grid {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.collection-name {
			font-size: 1.5rem;
		}

		.featured-section,
		.content-section,
		.collections-section {
			padding: 2rem 0;
		}
	}

	@media (max-width: 480px) {
		.hero-section {
			height: 400px;
		}

		.hero-title {
			font-size: 1.75rem;
		}

		.products-grid {
			grid-template-columns: 1fr;
		}

		.collection-name {
			font-size: 1.25rem;
		}

		.collection-link {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.collection-count {
			margin-left: 0;
		}

		.product-info {
			padding: 1rem;
		}
	}
</style>