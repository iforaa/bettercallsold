<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	// State management
	let storeContent = $state('');
	let loading = $state(true);
	let error = $state('');
	let storeSettings = $state(null);

	// Get product ID from URL
	let productId = $derived($page.params.id);

	// Load and render the specific product page
	async function loadProduct() {
		if (!browser || !productId) return;
		
		try {
			loading = true;
			error = '';

			// Load store settings first
			const settingsResponse = await fetch('/api/webstore/settings');
			if (settingsResponse.ok) {
				storeSettings = await settingsResponse.json();
			}

			// Render the product page using the active product template
			const response = await fetch('/api/store/page', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					page_type: 'product',
					product_id: productId
				})
			});

			if (response.ok) {
				const data = await response.json();
				storeContent = data.html;
			} else {
				throw new Error('Failed to load product');
			}

		} catch (err) {
			console.error('Load product error:', err);
			error = 'Failed to load product';
		} finally {
			loading = false;
		}
	}

	// Load product when component mounts or ID changes
	onMount(() => {
		loadProduct();
	});

	// Reload when product ID changes
	$effect(() => {
		if (productId) {
			loadProduct();
		}
	});
</script>

<svelte:head>
	<title>Product - {storeSettings?.store_name || 'My Store'}</title>
	<meta name="description" content="View this product at {storeSettings?.store_name || 'our store'}" />
</svelte:head>

{#if loading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading product...</p>
	</div>
{:else if error}
	<div class="error-container">
		<div class="error-content">
			<h1>Product Unavailable</h1>
			<p>{error}</p>
			<div class="error-actions">
				<button class="retry-btn" onclick={() => loadProduct()}>Retry</button>
				<a href="/store/products" class="back-btn">← Back to Products</a>
			</div>
		</div>
	</div>
{:else if storeContent}
	<!-- Render the complete product page with live Liquid content -->
	<div class="live-store">
		{@html storeContent}
	</div>
{:else}
	<div class="empty-store">
		<div class="empty-content">
			<h1>Product Not Found</h1>
			<p>This product doesn't exist or has been removed.</p>
			<a href="/store/products" class="setup-btn">← Back to Products</a>
		</div>
	</div>
{/if}

<style>
	/* Loading & Error States */
	.loading-container,
	.error-container,
	.empty-store {
		min-height: 50vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.error-content,
	.empty-content {
		text-align: center;
		max-width: 500px;
		padding: 2rem;
		background: white;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
	}

	.error-content h1,
	.empty-content h1 {
		color: #1e293b;
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.error-content p,
	.empty-content p {
		color: #64748b;
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f1f5f9;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.retry-btn,
	.setup-btn,
	.back-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
		transition: background-color 0.2s ease;
	}

	.back-btn {
		background: #6b7280;
	}

	.retry-btn:hover,
	.setup-btn:hover {
		background: #2563eb;
	}

	.back-btn:hover {
		background: #4b5563;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Live Store Content */
	.live-store {
		/* Reset any admin panel styles that might interfere */
		all: initial;
		font-family: inherit;
		line-height: inherit;
		color: inherit;
		display: block;
		min-height: 50vh;
	}

	/* Ensure rendered content displays properly */
	.live-store :global(*) {
		box-sizing: border-box;
	}

	.live-store :global(img) {
		max-width: 100%;
		height: auto;
	}

	.live-store :global(a) {
		color: inherit;
		text-decoration: none;
	}

	.live-store :global(a:hover) {
		text-decoration: underline;
	}
</style>