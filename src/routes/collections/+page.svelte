<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { collectionsState, collectionsActions, getFilteredCollections, getCollectionMetrics } from '$lib/state/collections.svelte.js';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';

	let { data }: { data: PageData } = $props();
	
	// Local component state for selection
	let selectedCollections: string[] = $state([]);
	let selectAll = $state(false);

	// Reactive state from global store
	let collections = $derived(getFilteredCollections());
	let metrics = $derived(getCollectionMetrics());
	let loading = $derived(collectionsState.loading.list);
	let error = $derived(collectionsState.errors.list);

	// Load collections on mount
	$effect(() => {
		// Only load if we haven't loaded recently or if there are no collections
		if (!collectionsState.lastFetch || collectionsState.collections.length === 0) {
			collectionsActions.loadCollections();
		}
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

	function handleRetry() {
		collectionsActions.retry();
	}
</script>

<svelte:head>
	<title>Collections - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item current">📂 Collections</span>
				</div>
			</div>
			<div class="page-actions">
				<button class="btn btn-secondary">Export</button>
				<a href="/collections/new" class="btn btn-primary">Create collection</a>
			</div>
		</div>
	</div>

	<div class="page-content">
		<!-- Tabs -->
		<div class="nav-tabs">
			<button class="nav-tab active" disabled={loading}>All</button>
			<button class="btn-icon" disabled={loading} style="margin-left: auto;">+</button>
		</div>

		{#if error}
			<ErrorState 
				message="Error Loading Collections"
				errorText={error}
				onRetry={handleRetry}
				showBackButton={false}
			/>
		{:else if loading}
			<LoadingState 
				message="Loading collections..."
				subMessage="Please wait while we fetch your collections"
			/>
		{:else if collections && collections.length > 0}
			<!-- Table -->
			<div class="table-container">
				<table class="table">
					<thead>
						<tr>
							<th class="table-cell-checkbox">
								<input 
									type="checkbox" 
									class="table-checkbox"
									bind:checked={selectAll}
									onchange={toggleSelectAll}
								/>
							</th>
							<th class="table-cell-main">Title</th>
							<th class="table-cell-numeric">Products</th>
							<th>Product conditions</th>
						</tr>
					</thead>
					<tbody>
						{#each collections as collection}
							<tr class="table-row table-row-clickable" onclick={() => goToCollection(collection.id)}>
								<td class="table-cell-checkbox" onclick={(e) => e.stopPropagation()}>
									<input 
										type="checkbox" 
										class="table-checkbox"
										checked={selectedCollections.includes(collection.id)}
										onchange={() => toggleCollection(collection.id)}
									/>
								</td>
								<td class="table-cell-main">
									<div class="table-cell-content">
										<div class="table-cell-media">
											{#if collection.image_url}
												<img src={collection.image_url} alt={collection.name} />
											{:else}
												<div class="table-cell-placeholder">📂</div>
											{/if}
										</div>
										<div class="table-cell-details">
											<span class="table-cell-title">{collection.name}</span>
											<span class="table-cell-subtitle">{collection.description || 'No description'}</span>
										</div>
									</div>
								</td>
								<td class="table-cell-numeric">
									<span class="table-cell-text">{collection.formattedProductCount || '0 products'}</span>
								</td>
								<td>
									<span class="table-cell-text">Manual</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="content-footer">
				<div class="table-summary">1-{collections.length} of {collections.length} collections</div>
			</div>
		{:else}
			<EmptyState 
				icon="📂"
				title="Organize your products with collections"
				message="Group products to make it easier for customers to find what they're looking for"
				actionText="Create collection"
				actionHref="/collections/new"
			/>
		{/if}
	</div>
</div>

<style>
	/* Minimal custom styles - most styling now handled by design system */
	
	/* All header, nav-tabs, table, empty-state, loading-state, and error-state styles now handled by design system */
	
	/* Only responsive table scrolling adjustment */
	@media (max-width: 768px) {
		.table-container {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}
		
		.table {
			min-width: 800px;
		}
	}
</style>