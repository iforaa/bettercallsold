<script lang="ts">
	interface PaginationProps {
		paginationInfo: {
			currentPage: number;
			startItem: number;
			endItem: number;
			total: number;
			hasNext: boolean;
			hasPrev: boolean;
			limit: number;
		};
		actions: {
			prevPage: () => void;
			nextPage: () => void;
			setPageSize: (size: number) => void;
		};
		loading?: boolean;
		itemName?: string; // e.g., 'products', 'inventory items'
		useUrl?: boolean; // Whether to use URL-based navigation
		urlActions?: {
			updateUrl: (params: { page?: number; limit?: number }) => void;
		};
	}

	let { 
		paginationInfo,
		actions,
		loading = false,
		itemName = 'items',
		useUrl = false,
		urlActions
	}: PaginationProps = $props();

	function handlePrevPage() {
		if (!loading) {
			if (useUrl && urlActions) {
				urlActions.updateUrl({ page: paginationInfo.currentPage - 1 });
			} else {
				actions.prevPage();
			}
		}
	}

	function handleNextPage() {
		if (!loading) {
			if (useUrl && urlActions) {
				urlActions.updateUrl({ page: paginationInfo.currentPage + 1 });
			} else {
				actions.nextPage();
			}
		}
	}

	function handlePageSizeChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const newSize = parseInt(select.value);
		if (!loading) {
			if (useUrl && urlActions) {
				urlActions.updateUrl({ page: 1, limit: newSize }); // Reset to page 1 when changing page size
			} else {
				actions.setPageSize(newSize);
			}
		}
	}
</script>

<div class="pagination-container">
	<div class="pagination-info">
		Showing {paginationInfo.startItem}-{paginationInfo.endItem} of {paginationInfo.total} {itemName}
	</div>
	<div class="pagination-controls">
		<button 
			class="btn btn-secondary btn-sm" 
			onclick={handlePrevPage}
			disabled={!paginationInfo.hasPrev || loading}
		>
			← Previous
		</button>
		<span class="pagination-current">Page {paginationInfo.currentPage}</span>
		<button 
			class="btn btn-secondary btn-sm" 
			onclick={handleNextPage}
			disabled={!paginationInfo.hasNext || loading}
		>
			Next →
		</button>
	</div>
	<div class="pagination-page-size">
		<label for="page-size">Items per page:</label>
		<select 
			id="page-size" 
			value={paginationInfo.limit}
			onchange={handlePageSizeChange}
			disabled={loading}
		>
			<option value={25}>25</option>
			<option value={50}>50</option>
			<option value={100}>100</option>
		</select>
	</div>
</div>

<style>
	.pagination-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-4) var(--space-6);
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
		gap: var(--space-4);
	}

	.pagination-info {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-shrink: 0;
	}

	.pagination-current {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		font-weight: var(--font-weight-medium);
		white-space: nowrap;
	}

	.pagination-page-size {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.pagination-page-size label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.pagination-page-size select {
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		background: var(--color-surface);
		color: var(--color-text);
		min-width: 60px;
	}

	@media (max-width: 768px) {
		.pagination-container {
			flex-direction: column;
			gap: var(--space-3);
			align-items: center;
		}
		
		.pagination-controls {
			order: 1;
		}
		
		.pagination-info {
			order: 2;
		}
		
		.pagination-page-size {
			order: 3;
		}
	}

	@media (max-width: 480px) {
		.pagination-container {
			padding: var(--space-3) var(--space-4);
		}
		
		.pagination-controls {
			width: 100%;
			justify-content: space-between;
		}
		
		.pagination-current {
			font-size: var(--font-size-xs);
		}
	}
</style>