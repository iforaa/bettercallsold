<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	// State management
	let products = $state([]);
	let collections = $state([]);
	let loading = $state(true);
	let error = $state('');
	let searchTerm = $state('');
	let selectedCollection = $state('all');
	let sortBy = $state('name');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let itemsPerPage = 12;

	// URL search params
	let searchParams = $derived($page.url.searchParams);

	// Filtered and sorted products
	let filteredProducts = $derived(() => {
		let filtered = products;

		// Filter by search term
		if (searchTerm.trim()) {
			const search = searchTerm.toLowerCase();
			filtered = filtered.filter(p => 
				p.name?.toLowerCase().includes(search) ||
				p.description?.toLowerCase().includes(search)
			);
		}

		// Filter by collection
		if (selectedCollection !== 'all') {
			filtered = filtered.filter(p => 
				p.product_collections?.some(c => c.id === selectedCollection)
			);
		}

		// Sort products
		filtered.sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return (a.name || '').localeCompare(b.name || '');
				case 'price-low':
					return (a.price || 0) - (b.price || 0);
				case 'price-high':
					return (b.price || 0) - (a.price || 0);
				case 'newest':
					return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
				default:
					return 0;
			}
		});

		return filtered;
	});

	// Paginated products
	let paginatedProducts = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		return filteredProducts.slice(start, end);
	});

	// Update total pages when filtered products change
	$effect(() => {
		totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
		if (currentPage > totalPages && totalPages > 0) {
			currentPage = 1;
		}
	});

	// Load catalog data
	async function loadCatalogData() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';

			// Load all products
			const productsResponse = await fetch('/api/products?limit=100');
			if (productsResponse.ok) {
				const productsData = await productsResponse.json();
				let allProducts = productsData.products || productsData || [];
				
				// Filter out products without images
				products = allProducts.filter(product => {
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
				});
			}

			// Load collections
			const collectionsResponse = await fetch('/api/collections');
			if (collectionsResponse.ok) {
				const collectionsData = await collectionsResponse.json();
				collections = collectionsData || [];
			}

			// Check for collection filter in URL
			const collectionParam = searchParams.get('collection');
			if (collectionParam && collectionParam !== 'all') {
				selectedCollection = collectionParam;
			}

		} catch (err) {
			console.error('Load catalog error:', err);
			error = 'Failed to load catalog';
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
		return '/placeholder-product.jpg';
	}

	// Handle search
	function handleSearch(event: Event) {
		const target = event.target as HTMLInputElement;
		searchTerm = target.value;
		currentPage = 1; // Reset to first page when searching
	}

	// Handle collection change
	function handleCollectionChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedCollection = target.value;
		currentPage = 1; // Reset to first page when filtering
	}

	// Handle sort change
	function handleSortChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		sortBy = target.value;
		currentPage = 1; // Reset to first page when sorting
	}

	// Handle pagination
	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			// Scroll to top of products
			document.querySelector('.catalog-header')?.scrollIntoView({ behavior: 'smooth' });
		}
	}

	// Load data on mount
	onMount(() => {
		loadCatalogData();
	});
</script>

<svelte:head>
	<title>Catalog - Store</title>
	<meta name="description" content="Browse our complete product catalog" />
</svelte:head>

<div class="catalog-page">
	<!-- Header -->
	<div class="catalog-header">
		<div class="header-content">
			<h1 class="page-title">All Products</h1>
			<p class="page-subtitle">Discover our complete collection</p>
		</div>
	</div>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading catalog...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<p>Error: {error}</p>
			<button class="retry-btn" onclick={() => loadCatalogData()}>Retry</button>
		</div>
	{:else}
		<div class="catalog-container">
			<!-- Filters and Search -->
			<div class="catalog-controls">
				<div class="search-section">
					<div class="search-input-container">
						<span class="search-icon">🔍</span>
						<input 
							type="text" 
							placeholder="Search products..."
							class="search-input"
							value={searchTerm}
							oninput={handleSearch}
						/>
					</div>
				</div>

				<div class="filter-section">
					<div class="filter-group">
						<label for="collection-filter">Collection</label>
						<select 
							id="collection-filter"
							class="filter-select"
							value={selectedCollection}
							onchange={handleCollectionChange}
						>
							<option value="all">All Collections</option>
							{#each collections as collection}
								<option value={collection.id}>{collection.name}</option>
							{/each}
						</select>
					</div>

					<div class="filter-group">
						<label for="sort-select">Sort by</label>
						<select 
							id="sort-select"
							class="filter-select"
							value={sortBy}
							onchange={handleSortChange}
						>
							<option value="name">Name A-Z</option>
							<option value="price-low">Price: Low to High</option>
							<option value="price-high">Price: High to Low</option>
							<option value="newest">Newest First</option>
						</select>
					</div>
				</div>
			</div>

			<!-- Results Summary -->
			<div class="results-summary">
				<p>
					Showing {paginatedProducts.length} of {filteredProducts.length} products
					{#if searchTerm}
						for "{searchTerm}"
					{/if}
					{#if selectedCollection !== 'all'}
						in {collections.find(c => c.id === selectedCollection)?.name || 'selected collection'}
					{/if}
				</p>
			</div>

			<!-- Products Grid -->
			{#if paginatedProducts.length > 0}
				<div class="products-grid">
					{#each paginatedProducts as product}
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
									{#if product.product_collections && product.product_collections.length > 0}
										<div class="product-collections">
											{#each product.product_collections.slice(0, 2) as collection}
												<span class="collection-tag">{collection.name}</span>
											{/each}
										</div>
									{/if}
								</div>
							</a>
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="pagination">
						<button 
							class="pagination-btn"
							onclick={() => goToPage(currentPage - 1)}
							disabled={currentPage <= 1}
						>
							← Previous
						</button>
						
						<div class="page-numbers">
							{#each Array.from({length: totalPages}, (_, i) => i + 1) as pageNum}
								{#if pageNum === currentPage || Math.abs(pageNum - currentPage) <= 2 || pageNum === 1 || pageNum === totalPages}
									<button 
										class="page-number"
										class:active={pageNum === currentPage}
										onclick={() => goToPage(pageNum)}
									>
										{pageNum}
									</button>
								{:else if Math.abs(pageNum - currentPage) === 3}
									<span class="page-ellipsis">...</span>
								{/if}
							{/each}
						</div>
						
						<button 
							class="pagination-btn"
							onclick={() => goToPage(currentPage + 1)}
							disabled={currentPage >= totalPages}
						>
							Next →
						</button>
					</div>
				{/if}
			{:else}
				<div class="no-results">
					<div class="no-results-content">
						<span class="no-results-icon">🔍</span>
						<h3>No products found</h3>
						<p>
							{#if searchTerm}
								No products match your search for "{searchTerm}".
							{:else if selectedCollection !== 'all'}
								No products found in the selected collection.
							{:else}
								No products available at the moment.
							{/if}
						</p>
						{#if searchTerm || selectedCollection !== 'all'}
							<button 
								class="clear-filters-btn"
								onclick={() => {
									searchTerm = '';
									selectedCollection = 'all';
									currentPage = 1;
								}}
							>
								Clear Filters
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.catalog-page {
		min-height: 100vh;
	}

	.catalog-header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 4rem 0 2rem;
		text-align: center;
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.page-title {
		font-size: 3rem;
		font-weight: 300;
		margin: 0 0 1rem;
		letter-spacing: -0.025em;
	}

	.page-subtitle {
		font-size: 1.125rem;
		opacity: 0.9;
		margin: 0;
		font-weight: 300;
	}

	.catalog-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	/* Loading & Error States */
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

	@keyframes spin {
		to { transform: rotate(360deg); }
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

	/* Controls */
	.catalog-controls {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.search-section {
		display: flex;
		justify-content: center;
	}

	.search-input-container {
		position: relative;
		max-width: 400px;
		width: 100%;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--store-secondary-color);
		font-size: 1rem;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 2px solid #e5e7eb;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--store-accent-color);
	}

	.filter-section {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 150px;
	}

	.filter-group label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--store-primary-color);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.filter-select {
		padding: 0.5rem;
		border: 2px solid #e5e7eb;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		color: var(--store-primary-color);
		cursor: pointer;
		transition: border-color 0.2s ease;
	}

	.filter-select:focus {
		outline: none;
		border-color: var(--store-accent-color);
	}

	/* Results Summary */
	.results-summary {
		margin-bottom: 1.5rem;
		color: var(--store-secondary-color);
		font-size: 0.875rem;
	}

	.results-summary p {
		margin: 0;
	}

	/* Products Grid */
	.products-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 2rem;
		margin-bottom: 3rem;
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
		margin-bottom: 0.5rem;
	}

	.product-collections {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.collection-tag {
		background: #f3f4f6;
		color: var(--store-secondary-color);
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-weight: 500;
	}

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		margin-top: 2rem;
	}

	.pagination-btn,
	.page-number {
		padding: 0.5rem 1rem;
		border: 2px solid #e5e7eb;
		background: white;
		color: var(--store-primary-color);
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.pagination-btn:hover:not(:disabled),
	.page-number:hover {
		border-color: var(--store-accent-color);
		background: var(--store-accent-color);
		color: white;
	}

	.pagination-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-number.active {
		border-color: var(--store-accent-color);
		background: var(--store-accent-color);
		color: white;
	}

	.page-numbers {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.page-ellipsis {
		padding: 0.5rem;
		color: var(--store-secondary-color);
	}

	/* No Results */
	.no-results {
		text-align: center;
		padding: 4rem 2rem;
	}

	.no-results-content {
		max-width: 400px;
		margin: 0 auto;
	}

	.no-results-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.no-results h3 {
		color: var(--store-primary-color);
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.no-results p {
		color: var(--store-secondary-color);
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	.clear-filters-btn {
		background: var(--store-accent-color);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.clear-filters-btn:hover {
		background: var(--store-primary-color);
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.page-title {
			font-size: 2rem;
		}

		.catalog-controls {
			padding: 1rem;
		}

		.filter-section {
			flex-direction: column;
			align-items: center;
		}

		.filter-group {
			width: 100%;
			max-width: 200px;
		}

		.products-grid {
			grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
			gap: 1.5rem;
		}

		.pagination {
			flex-wrap: wrap;
		}

		.page-numbers {
			order: -1;
			margin-bottom: 1rem;
		}
	}

	@media (max-width: 480px) {
		.products-grid {
			grid-template-columns: 1fr;
		}

		.product-info {
			padding: 1rem;
		}
	}
</style>