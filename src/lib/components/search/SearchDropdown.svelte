<script lang="ts">
	interface SearchResults {
		query: string;
		total: number;
		results: {
			[key: string]: {
				items: any[];
				count: number;
				error: string | null;
			}
		};
		metadata: any;
	}

	interface Props {
		searchResults: SearchResults | null;
		selectedIndex: number;
		query: string;
		onSelect: (result: any) => void;
	}

	let {
		searchResults = null,
		selectedIndex = -1,
		query = '',
		onSelect
	}: Props = $props();

	// Active tab state
	let activeTab = $state('product');

	// Type information
	const typeInfo = {
		product: { label: 'Products', icon: '🏷️' },
		order: { label: 'Orders', icon: '📋' },
		customer: { label: 'Customers', icon: '👤' },
		collection: { label: 'Collections', icon: '📁' },
		discount: { label: 'Discounts', icon: '🏷️' },
		transfer: { label: 'Transfers', icon: '↔️' }
	};

	// Get tabs with counts
	let tabs = $derived(() => {
		if (!searchResults) return [];
		
		return Object.entries(searchResults.results)
			.filter(([type, data]) => data.count > 0)
			.map(([type, data]) => ({
				type,
				label: typeInfo[type]?.label || type,
				icon: typeInfo[type]?.icon || '📄',
				count: data.count
			}));
	});

	// Set active tab to first available tab with results
	$effect(() => {
		if (tabs.length > 0) {
			activeTab = tabs[0].type;
		}
	});

	// Get active results
	let activeResults = $derived(() => {
		if (!searchResults || !searchResults.results[activeTab]) {
			return [];
		}
		return searchResults.results[activeTab].items;
	});

	// Don't show any load more buttons - just show the results we have

	function handleResultClick(result: any) {
		onSelect(result);
	}

	function handleTabClick(type: string) {
		activeTab = type;
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

	function highlightText(text: string, query: string): string {
		if (!query) return text;
		
		const regex = new RegExp(`(${query})`, 'gi');
		return text.replace(regex, '<strong>$1</strong>');
	}

	function formatAvailability(result: any): string {
		if (result.type === 'product') {
			const inventory = result.total_inventory || 0;
			const variants = result.variant_count || 0;
			return `${inventory} available${variants > 1 ? ` • ${variants} variants` : ''}`;
		} else if (result.type === 'customer') {
			return result.phone || result.email || '';
		} else if (result.type === 'order') {
			return result.customer_email || '';
		}
		return '';
	}
</script>

<div class="search-dropdown">
	{#if !searchResults || searchResults.total === 0}
		<div class="search-empty">
			<div class="search-empty-icon">🔍</div>
			<div class="search-empty-text">No results found</div>
			{#if query}
				<div class="search-empty-subtitle">
					Try different keywords or check the spelling
				</div>
			{/if}
		</div>
	{:else}
		<!-- Tabs (show even with single tab for debugging) -->
		{#if tabs.length > 0}
			<div class="search-tabs">
				{#each tabs as tab}
					<button
						class="search-tab"
						class:active={activeTab === tab.type}
						onclick={() => handleTabClick(tab.type)}
						type="button"
					>
						<span class="tab-icon">{tab.icon}</span>
						<span class="tab-label">{tab.label}</span>
						<span class="tab-count">{tab.count}</span>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Results -->
		<div class="search-results">
			{#each activeResults as result, index}
				<button
					class="search-result"
					onclick={() => handleResultClick(result)}
					type="button"
				>
					<div class="result-content">
						<!-- Thumbnail -->
						{#if result.thumbnail}
							<div class="result-thumbnail">
								<img src={result.thumbnail} alt={result.title} />
							</div>
						{:else}
							<div class="result-thumbnail result-thumbnail-placeholder">
								<span class="result-icon">{result.icon}</span>
							</div>
						{/if}

						<!-- Details -->
						<div class="result-details">
							<div class="result-title">
								{@html highlightText(result.title, query)}
							</div>
							
							{#if formatAvailability(result)}
								<div class="result-availability">
									{formatAvailability(result)}
								</div>
							{/if}
							
							{#if result.subtitle}
								<div class="result-subtitle">
									{@html highlightText(result.subtitle, query)}
								</div>
							{/if}
						</div>

						<!-- Status -->
						{#if result.status}
							<div class="result-status">
								<span class="result-badge {getStatusBadgeClass(result.status)}">
									{result.status}
								</span>
							</div>
						{/if}
					</div>
				</button>
			{/each}

			<!-- No footer buttons needed - just show the results -->
		</div>
	{/if}
</div>

<style>
	.search-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: white;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		z-index: 1000;
		max-height: 500px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	/* Empty state */
	.search-empty {
		padding: var(--space-6);
		text-align: center;
		color: var(--color-text-muted);
	}

	.search-empty-icon {
		font-size: 32px;
		margin-bottom: var(--space-2);
		opacity: 0.5;
	}

	.search-empty-text {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		margin-bottom: var(--space-1);
	}

	.search-empty-subtitle {
		font-size: var(--font-size-xs);
		opacity: 0.7;
	}

	/* Tabs */
	.search-tabs {
		display: flex;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.search-tab {
		padding: var(--space-3) var(--space-4);
		background: transparent;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		border-bottom: 2px solid transparent;
		transition: all 0.2s ease;
		position: relative;
	}

	.search-tab:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.search-tab.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
		background: white;
	}

	.tab-icon {
		font-size: 14px;
	}

	.tab-label {
		font-weight: var(--font-weight-medium);
	}

	.tab-count {
		background: var(--color-border-light);
		color: var(--color-text-muted);
		padding: 2px var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		min-width: 20px;
		text-align: center;
	}

	.search-tab.active .tab-count {
		background: var(--color-primary-bg);
		color: var(--color-primary);
	}

	/* Results */
	.search-results {
		overflow-y: auto;
		flex: 1;
		max-height: 400px;
	}

	.search-result {
		width: 100%;
		padding: var(--space-4);
		background: transparent;
		border: none;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s ease;
		border-bottom: 1px solid var(--color-border-light);
	}

	.search-result:last-child {
		border-bottom: none;
	}

	.search-result:hover {
		background: var(--color-surface-hover);
	}

	.result-content {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.result-thumbnail {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		flex-shrink: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border-light);
	}

	.result-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.result-thumbnail-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface);
	}

	.result-icon {
		font-size: 18px;
		opacity: 0.6;
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
		margin-bottom: var(--space-1);
	}

	.result-availability {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-bottom: var(--space-1);
	}

	.result-subtitle {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		line-height: 1.3;
	}

	.result-status {
		flex-shrink: 0;
		display: flex;
		align-items: flex-start;
		padding-top: 2px;
	}

	.result-badge {
		font-size: var(--font-size-xs);
		padding: 3px var(--space-2);
		border-radius: var(--radius-full);
		font-weight: var(--font-weight-medium);
		text-transform: capitalize;
		line-height: 1;
	}

	/* Footer */
	.search-footer {
		border-top: 1px solid var(--color-border);
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.search-load-more {
		width: 100%;
		padding: var(--space-3);
		background: var(--color-primary);
		color: white;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		border-radius: var(--radius-sm);
		transition: background-color 0.2s ease;
	}

	.search-load-more:hover:not(:disabled) {
		background: var(--color-primary-dark);
	}

	.search-load-more:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.search-view-all {
		width: 100%;
		padding: var(--space-2);
		background: transparent;
		border: 1px solid var(--color-border);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
		border-radius: var(--radius-sm);
		transition: all 0.2s ease;
	}

	.search-view-all:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-dark);
		color: var(--color-text);
	}

	.view-all-icon {
		opacity: 0.7;
	}

	.view-all-arrow {
		margin-left: auto;
		opacity: 0.5;
		font-weight: bold;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Highlight matched text */
	:global(.search-dropdown strong) {
		background: var(--color-primary-bg);
		color: var(--color-primary);
		padding: 0;
		font-weight: var(--font-weight-bold);
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
	@media (max-width: 768px) {
		.search-dropdown {
			max-height: 400px;
		}
		
		.search-tabs {
			overflow-x: auto;
			scrollbar-width: none;
			-ms-overflow-style: none;
		}

		.search-tabs::-webkit-scrollbar {
			display: none;
		}

		.search-tab {
			white-space: nowrap;
			flex-shrink: 0;
		}
		
		.result-content {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}
		
		.result-status {
			align-self: flex-end;
		}
	}
</style>