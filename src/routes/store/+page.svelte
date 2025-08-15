<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// State management
	let storeContent = $state('');
	let loading = $state(true);
	let error = $state('');
	let storeSettings = $state(null);

	// Load and render the store homepage
	async function loadStore() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';

			// Load store settings first
			const settingsResponse = await fetch('/api/webstore/settings');
			if (settingsResponse.ok) {
				storeSettings = await settingsResponse.json();
			}

			// Render the homepage using the active home template
			const response = await fetch('/api/store/page', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					page_type: 'home'
				})
			});

			if (response.ok) {
				const data = await response.json();
				storeContent = data.html;
			} else {
				throw new Error('Failed to load store');
			}

		} catch (err) {
			console.error('Load store error:', err);
			error = 'Failed to load store';
		} finally {
			loading = false;
		}
	}

	// Load store on mount
	onMount(() => {
		loadStore();
	});
</script>

<svelte:head>
	<title>{storeSettings?.store_name || 'My Store'}</title>
	<meta name="description" content={storeSettings?.meta_description || `Welcome to ${storeSettings?.store_name || 'our store'}`} />
	<meta name="keywords" content={storeSettings?.meta_keywords || ''} />
</svelte:head>

{#if loading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading store...</p>
	</div>
{:else if error}
	<div class="error-container">
		<div class="error-content">
			<h1>Store Unavailable</h1>
			<p>{error}</p>
			<button class="retry-btn" onclick={() => loadStore()}>Retry</button>
		</div>
	</div>
{:else if storeContent}
	<!-- Render the complete store with live Liquid content -->
	<div class="live-store">
		{@html storeContent}
	</div>
{:else}
	<div class="empty-store">
		<div class="empty-content">
			<h1>Store Not Ready</h1>
			<p>No homepage template found. Please create a home template in the website builder.</p>
			<a href="/sales-channels/web-store" class="setup-btn">Setup Store</a>
		</div>
	</div>
{/if}

<style>
	/* Loading & Error States */
	.loading-container,
	.error-container,
	.empty-store {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: #f8fafc;
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
	.setup-btn {
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

	.retry-btn:hover,
	.setup-btn:hover {
		background: #2563eb;
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
		min-height: 100vh;
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