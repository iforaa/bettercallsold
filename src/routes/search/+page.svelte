<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { SearchService } from '$lib/services/SearchService.js';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';

	// State
	let searchResults = $state(null);
	let isLoading = $state(false);
	let error = $state('');
	let currentQuery = $state('');

	// Get query from URL
	let query = $derived($page.url.searchParams.get('q') || '');

	// Perform search when query changes
	$effect(() => {
		if (browser && query && query !== currentQuery) {
			currentQuery = query;
			performSearch(query);
		}
	});

	async function performSearch(searchQuery: string) {
		if (!searchQuery.trim()) {
			searchResults = null;
			return;
		}

		isLoading = true;
		error = '';

		try {
			const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=10&detailed=true`);
			const data = await response.json();
			
			if (data.success) {
				searchResults = data.data;
			} else {
				error = data.error || 'Search failed';
				searchResults = null;
			}
		} catch (err) {
			error = 'Failed to perform search';
			searchResults = null;
			console.error('Search error:', err);
		} finally {
			isLoading = false;
		}
	}


	function navigateToResult(url: string) {
		goto(url);
	}

	function getResultIcon(type: string) {
		const icons = {
			product: '🏷️',
			order: '📋',
			customer: '👤',
			collection: '📁',
			discount: '🏷️',
			transfer: '↔️'
		};
		return icons[type] || '📄';
	}

	function getResultTypeLabel(type: string) {
		const labels = {
			product: 'Products',
			order: 'Orders',
			customer: 'Customers',
			collection: 'Collections',
			discount: 'Discounts',
			transfer: 'Transfers'
		};
		return labels[type] || type;
	}

	function getStatusBadgeClass(status: string = '') {
		const statusMap: Record<string, string> = {
			active: 'badge-success',
			draft: 'badge-warning',
			archived: 'badge-secondary',
			pending: 'badge-warning',
			paid: 'badge-success',
			processing: 'badge-info',
			completed: 'badge-success',
			cancelled: 'badge-error'
		};
		return statusMap[status.toLowerCase()] || 'badge-secondary';
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}
</script>

<svelte:head>
	<title>{query ? `Search results for "${query}"` : 'Search'} - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<h1 class="page-title">
				<span class="page-icon">🔍</span>
				Search
			</h1>
		</div>
	</div>

	<div class="page-content-padded">

		{#if error}
			<ErrorState 
				message="Search Error"
				errorText={error}
				onRetry={() => performSearch(currentQuery)}
			/>
		{:else if isLoading}
			<LoadingState 
				message="Searching..."
				subMessage="Finding results across all your data"
			/>
		{:else if !query}
			<EmptyState
				icon="🔍"
				title="Start searching"
				description="Search for products, orders, customers, and more using the search bar above"
			/>
		{:else if searchResults && searchResults.total === 0}
			<EmptyState
				icon="🔍"
				title="No results found"
				description="No results found for '{query}'. Try different keywords or check the spelling."
			/>
		{:else if searchResults}
			<!-- Search Results -->
			<div class="search-results">
				<div class="search-summary">
					<p>{searchResults.total} result{searchResults.total === 1 ? '' : 's'} found in {searchResults.metadata.searchTime}ms</p>
				</div>

				{#each Object.entries(searchResults.results) as [type, typeResults]}
					{#if typeResults.count > 0}
						<div class="results-section">
							<div class="results-header">
								<h3>
									<span class="results-icon">{getResultIcon(type)}</span>
									{getResultTypeLabel(type)}
									<span class="results-count">{typeResults.count}</span>
								</h3>
							</div>

							<div class="results-grid">
								{#each typeResults.items as result}
									<button
										class="result-card"
										onclick={() => navigateToResult(result.url)}
									>
										<div class="result-content">
											<div class="result-main">
												<div class="result-icon">{result.icon}</div>
												<div class="result-details">
													<div class="result-title">{result.title}</div>
													{#if result.subtitle}
														<div class="result-subtitle">{result.subtitle}</div>
													{/if}
												</div>
											</div>
											
											<div class="result-meta">
												{#if result.status}
													<span class="result-badge {getStatusBadgeClass(result.status)}">
														{result.status}
													</span>
												{/if}
												
												{#if result.thumbnail}
													<div class="result-thumbnail">
														<img src={result.thumbnail} alt={result.title} />
													</div>
												{/if}
											</div>
										</div>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>

	.search-results {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.search-summary {
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}

	.search-summary h2 {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--space-1);
	}

	.search-summary p {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
	}

	.results-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.results-header h3 {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.results-icon {
		font-size: 18px;
	}

	.results-count {
		background: var(--color-border-light);
		color: var(--color-text-muted);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
	}

	.results-grid {
		display: grid;
		gap: var(--space-3);
	}

	.result-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-4);
		cursor: pointer;
		transition: all 0.1s ease;
		text-align: left;
		width: 100%;
	}

	.result-card:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-dark);
		box-shadow: var(--shadow-sm);
	}

	.result-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.result-main {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex: 1;
		min-width: 0;
	}

	.result-icon {
		font-size: 20px;
		flex-shrink: 0;
		opacity: 0.8;
	}

	.result-details {
		flex: 1;
		min-width: 0;
	}

	.result-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		line-height: 1.4;
		margin-bottom: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-subtitle {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.result-badge {
		font-size: var(--font-size-xs);
		padding: 2px var(--space-1);
		border-radius: var(--radius-sm);
		font-weight: var(--font-weight-medium);
		text-transform: capitalize;
	}

	.result-thumbnail {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--color-border-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.result-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Badge variants */
	.badge-success {
		background: var(--color-success-bg);
		color: var(--color-success-text);
	}

	.badge-warning {
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
	}

	.badge-error {
		background: var(--color-error-bg);
		color: var(--color-error-text);
	}

	.badge-info {
		background: var(--color-info-bg);
		color: var(--color-info-text);
	}

	.badge-secondary {
		background: var(--color-border-light);
		color: var(--color-text-muted);
	}

	/* Responsive */
	@media (min-width: 768px) {
		.results-grid {
			grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		}
	}

	@media (max-width: 767px) {
		.result-content {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}

		.result-meta {
			align-self: flex-end;
		}

		.result-title,
		.result-subtitle {
			white-space: normal;
			overflow: visible;
			text-overflow: unset;
		}
	}
</style>