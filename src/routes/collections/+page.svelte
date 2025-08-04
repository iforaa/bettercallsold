<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();
	
	// State management
	let collections: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let selectedCollections: string[] = $state([]);
	let selectAll = $state(false);

	// Client-side data fetching
	async function loadCollections() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch('/api/collections');
			
			if (!response.ok) {
				throw new Error('Failed to fetch collections');
			}

			const data = await response.json();
			collections = data;
		} catch (err) {
			console.error('Load collections error:', err);
			error = 'Failed to load collections from backend';
			collections = [];
		} finally {
			loading = false;
		}
	}

	// Load collections when component mounts
	onMount(() => {
		loadCollections();
	});

	function toggleSelectAll() {
		if (selectAll) {
			selectedCollections = collections?.map(c => c.id) || [];
		} else {
			selectedCollections = [];
		}
	}

	function toggleCollection(collectionId: string) {
		if (selectedCollections.includes(collectionId)) {
			selectedCollections = selectedCollections.filter(id => id !== collectionId);
		} else {
			selectedCollections = [...selectedCollections, collectionId];
		}
		selectAll = selectedCollections.length === collections?.length;
	}

	function goToCollection(collectionId: string) {
		goto(`/collections/${collectionId}`);
	}

	function getProductCount(collection: any): number {
		return collection.product_count || 0;
	}

	function getConditions(collection: any): string {
		// This would normally show the actual collection conditions
		// For now, we'll return a placeholder
		return "Manual";
	}
</script>

<svelte:head>
	<title>Collections - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">📂</span>
				Collections
			</h1>
			<div class="header-actions">
				<button class="btn-secondary">Export</button>
				<a href="/collections/new" class="btn-primary">Create collection</a>
			</div>
		</div>
	</div>

	<div class="page-content">
		<!-- Tabs - Always show immediately -->
		<div class="tabs">
			<button class="tab active" disabled={loading}>All</button>
			<button class="tab-add" disabled={loading}>+</button>
		</div>

		{#if error}
			<div class="error-state">
				<p>{error}</p>
				<button class="btn-secondary" onclick={() => loadCollections()}>
					Retry
				</button>
			</div>
		{:else if loading}
			<!-- Loading state -->
			<div class="loading-state">
				<div class="loading-content">
					<div class="loading-spinner-large"></div>
					<h3>Loading collections...</h3>
					<p>This may take a moment</p>
				</div>
			</div>
		{:else if collections && collections.length > 0}
			<!-- Table -->
			<div class="table-container">
				<table class="collections-table">
					<thead>
						<tr>
							<th class="checkbox-col">
								<input 
									type="checkbox" 
									bind:checked={selectAll}
									onchange={toggleSelectAll}
								/>
							</th>
							<th class="title-col">Title</th>
							<th>Products</th>
							<th>Product conditions</th>
						</tr>
					</thead>
					<tbody>
						{#each collections as collection}
							<tr class="collection-row" onclick={() => goToCollection(collection.id)}>
								<td class="checkbox-col" onclick={(e) => e.stopPropagation()}>
									<input 
										type="checkbox" 
										checked={selectedCollections.includes(collection.id)}
										onchange={() => toggleCollection(collection.id)}
									/>
								</td>
								<td class="title-col">
									<div class="collection-info">
										<div class="collection-image">
											{#if collection.image_url}
												<img src={collection.image_url} alt={collection.name} />
											{:else}
												📂
											{/if}
										</div>
										<div class="collection-details">
											<div class="collection-title">{collection.name}</div>
											<div class="collection-subtitle">{collection.description || 'No description'}</div>
										</div>
									</div>
								</td>
								<td>
									<span class="product-count">{getProductCount(collection)}</span>
								</td>
								<td>
									<span class="conditions">{getConditions(collection)}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="pagination">
				<span class="pagination-info">1-{collections.length}</span>
			</div>
		{:else}
			<div class="empty-state">
				<div class="empty-content">
					<div class="empty-icon">📂</div>
					<h3>Organize your products with collections</h3>
					<p>Group products to make it easier for customers to find what they're looking for</p>
					<a href="/collections/new" class="btn-primary">Create collection</a>
				</div>
			</div>
		{/if}
	</div>
</div>

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

	.page-content {
		padding: 0;
	}

	.tabs {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		display: flex;
		align-items: center;
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

	.tab:hover {
		color: #202223;
	}

	.tab-add {
		background: none;
		border: none;
		padding: 0.75rem 1rem;
		cursor: pointer;
		color: #6d7175;
		font-size: 1rem;
		margin-left: auto;
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.tab-add:hover {
		background: #f6f6f7;
	}

	.table-container {
		background: white;
		overflow-x: auto;
	}

	.collections-table {
		width: 100%;
		border-collapse: collapse;
	}

	.collections-table th {
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

	.collections-table td {
		padding: 1rem;
		border-bottom: 1px solid #e1e1e1;
		vertical-align: middle;
	}

	.checkbox-col {
		width: 40px;
		padding: 1rem 0.5rem 1rem 1rem;
	}

	.title-col {
		min-width: 400px;
	}

	.collection-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.collection-image {
		width: 40px;
		height: 40px;
		background: #f6f6f7;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		opacity: 0.6;
		overflow: hidden;
	}

	.collection-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.collection-details {
		flex: 1;
	}

	.collection-title {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.collection-subtitle {
		color: #6d7175;
		font-size: 0.8125rem;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.product-count, .conditions {
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

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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

	.tab:disabled, .tab-add:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.collection-row {
		cursor: pointer;
	}

	.collection-row:hover {
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
		
		.collections-table {
			min-width: 800px;
		}
	}
</style>