<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { 
		replaysState, 
		replaysActions, 
		getFilteredReplays, 
		getReplayAnalytics,
		hasSelection,
		getSelectionCount,
		isAllSelected
	} from '$lib/state/replays.svelte.js';
	
	// Components
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import ReplayCard from '$lib/components/replays/ReplayCard.svelte';
	import ReplayMetrics from '$lib/components/replays/ReplayMetrics.svelte';

	let { data }: { data: PageData } = $props();
	
	// Reactive state from global store
	let loading = $derived(replaysState.loading);
	let error = $derived(replaysState.error);
	let replays = $derived(getFilteredReplays());
	let analytics = $derived(getReplayAnalytics());
	let pagination = $derived(replaysState.pagination);
	let selectedReplays = $derived(replaysState.selectedReplays);
	let selectAll = $derived(replaysState.selectAll);
	let viewMode = $derived(replaysState.viewMode);
	
	// Selection state
	let hasSelectionDerived = $derived(hasSelection());
	let selectionCount = $derived(getSelectionCount());
	let allSelected = $derived(isAllSelected());
	
	// Initialize with URL params
	$effect(() => {
		if (browser && data.urlParams) {
			const { page, limit, status } = data.urlParams;
			
			// Update state with URL params
			if (page) replaysState.pagination.page = parseInt(page);
			if (limit) replaysState.pagination.limit = parseInt(limit);
			if (status) replaysState.filters.status = status as any;
			
			// Load replays if not already loaded
			if (!replaysState.lastFetch) {
				replaysActions.loadReplays();
			}
		}
	});
	
	// Event handlers
	function handleReplayClick(replay: any) {
		goto(`/replays/${replay.id}`);
	}
	
	function handleSelectReplay(id: string) {
		replaysActions.selectReplay(id);
	}
	
	function handleSelectAll() {
		replaysState.selectAll = !replaysState.selectAll;
		replaysActions.selectAllReplays();
	}
	
	function handleRetry() {
		replaysActions.retry();
	}
	
	function handleClearError() {
		replaysState.error = '';
	}
	
	function handleViewModeChange(mode: 'table' | 'grid') {
		replaysActions.setViewMode(mode);
	}
	
	function handleSyncReplays() {
		replaysActions.syncReplays();
	}
	
	async function handlePageChange(page: number) {
		await replaysActions.goToPage(page);
	}
</script>

<svelte:head>
	<title>Replays - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item current">🎬 Replays</span>
				</div>
			</div>
			<div class="page-actions">
				<!-- View Mode Toggle -->
				<div class="view-mode-toggle">
					<button 
						class="btn btn-ghost btn-sm" 
						class:active={viewMode === 'table'}
						onclick={() => handleViewModeChange('table')}
					>
						📋 Table
					</button>
					<button 
						class="btn btn-ghost btn-sm" 
						class:active={viewMode === 'grid'}
						onclick={() => handleViewModeChange('grid')}
					>
						⊞ Grid
					</button>
				</div>
				<button class="btn btn-primary" onclick={handleSyncReplays}>Sync Replays</button>
			</div>
		</div>
		<p class="page-description">
			View and manage your CommentSold live sale replays.
		</p>
	</div>

	<div class="page-content">
		<!-- Global Error State -->
		{#if error}
			<ErrorState 
				message="Error Loading Replays"
				errorText={error}
				onRetry={handleRetry}
				onBack={handleClearError}
				backLabel="Clear Error"
				showBackButton={true}
			/>
		{:else if loading}
			<!-- Global Loading State -->
			<LoadingState 
				message="Loading replays..."
				subMessage="Fetching your CommentSold replay data"
			/>
		{:else}
			<!-- Analytics Overview -->
			{#if replays.length > 0}
				<ReplayMetrics 
					analytics={analytics}
					showDetailed={false}
				/>
			{/if}

			<!-- Selection Actions -->
			{#if hasSelectionDerived}
				<div class="selection-banner">
					<div class="selection-info">
						<strong>{selectionCount}</strong> replay{selectionCount === 1 ? '' : 's'} selected
					</div>
					<div class="selection-actions">
						<button class="btn btn-ghost btn-sm" onclick={() => replaysActions.clearSelection()}>
							Clear Selection
						</button>
						<button class="btn btn-secondary btn-sm" onclick={() => replaysActions.performBulkAction('export')}>
							Export Selected
						</button>
					</div>
				</div>
			{/if}

			<!-- Content based on view mode -->
			{#if replays.length > 0}
				{#if viewMode === 'grid'}
					<!-- Grid View -->
					<div class="replays-grid">
						<div class="replays-grid-header">
							<div class="grid-controls">
								<label class="select-all-control">
									<input 
										type="checkbox" 
										class="table-checkbox"
										checked={allSelected}
										onchange={handleSelectAll}
									/>
									<span>Select All</span>
								</label>
							</div>
						</div>
						
						<div class="replays-grid-container">
							{#each replays as replay (replay.id)}
								<ReplayCard
									{replay}
									selected={selectedReplays.includes(replay.id)}
									onSelect={handleSelectReplay}
									onClick={handleReplayClick}
									showThumbnail={true}
									showMetrics={true}
								/>
							{/each}
						</div>
					</div>
				{:else}
					<!-- Table View -->
					<div class="table-container">
						<table class="table">
							<thead>
								<tr>
									<th class="table-cell-checkbox">
										<input 
											type="checkbox" 
											class="table-checkbox"
											checked={allSelected}
											onchange={handleSelectAll}
										/>
									</th>
									<th class="table-cell-main">Title</th>
									<th>Status</th>
									<th>Started</th>
									<th>Duration</th>
									<th>Products</th>
									<th>Peak Viewers</th>
								</tr>
							</thead>
							<tbody>
								{#each replays as replay (replay.id)}
									<tr class="table-row table-row-clickable" onclick={() => handleReplayClick(replay)}>
										<td class="table-cell-checkbox" onclick={(e) => e.stopPropagation()}>
											<input 
												type="checkbox" 
												class="table-checkbox"
												checked={selectedReplays.includes(replay.id)}
												onchange={() => handleSelectReplay(replay.id)}
											/>
										</td>
										<td class="table-cell-main">
											<div class="table-cell-content">
												<div class="table-cell-media">
													{#if replay.displayThumbnail}
														<img src={replay.displayThumbnail} alt={replay.displayName} />
													{:else}
														<div class="table-cell-placeholder">🎬</div>
													{/if}
												</div>
												<div class="table-cell-details">
													<span class="table-cell-title">{replay.displayName}</span>
													<span class="table-cell-subtitle">ID: {replay.external_id}</span>
												</div>
											</div>
										</td>
										<td>
											<span class="badge badge-{replay.statusInfo.color}">
												{replay.statusInfo.text}
											</span>
										</td>
										<td>
											<span class="table-cell-text">{replay.started_at_formatted || 'Unknown'}</span>
										</td>
										<td>
											<span class="table-cell-text">{replay.formattedDuration}</span>
										</td>
										<td>
											<span class="table-cell-text">{replay.productsCount}</span>
										</td>
										<td>
											<span class="table-cell-text">{replay.formattedViewers}</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				<!-- Pagination -->
				{#if pagination.total > pagination.limit}
					<div class="content-footer">
						<div class="table-summary">
							{((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} replays
						</div>
						<div class="pagination-controls">
							{#if pagination.hasPrev}
								<button 
									class="btn btn-secondary btn-sm" 
									onclick={() => handlePageChange(pagination.page - 1)}
									disabled={loading}
								>
									Previous
								</button>
							{/if}
							{#if pagination.hasNext}
								<button 
									class="btn btn-secondary btn-sm" 
									onclick={() => handlePageChange(pagination.page + 1)}
									disabled={loading}
								>
									Next
								</button>
							{/if}
						</div>
					</div>
				{/if}
			{:else}
				<!-- Empty State -->
				<EmptyState
					icon="🎬"
					title="No replays found"
					description="Sync your CommentSold live sales to see them here as replays"
					actionLabel="Sync Replays"
					onAction={handleSyncReplays}
				/>
			{/if}
		{/if}
	</div>
</div>

<style>
	/* Custom page description styling */
	.page-description {
		margin: var(--space-2) 0 0 0;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		padding: 0 var(--space-8);
	}
	
	/* View mode toggle */
	.view-mode-toggle {
		display: flex;
		gap: var(--space-1);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-1);
	}
	
	.view-mode-toggle .btn {
		border: none;
		background: transparent;
		padding: var(--space-2) var(--space-3);
	}
	
	.view-mode-toggle .btn.active {
		background: var(--color-primary);
		color: white;
	}
	
	/* Selection banner */
	.selection-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		background: var(--color-info-bg);
		border: 1px solid var(--color-info);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-6);
	}
	
	.selection-info {
		color: var(--color-info-text);
		font-size: var(--font-size-sm);
	}
	
	.selection-actions {
		display: flex;
		gap: var(--space-2);
	}
	
	/* Grid view styles */
	.replays-grid {
		width: 100%;
	}
	
	.replays-grid-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-6);
		padding: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	
	.select-all-control {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}
	
	.replays-grid-container {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-6);
	}
	
	/* Table view styles */
	.table-cell-media {
		width: 60px;
		height: 40px;
		border-radius: var(--radius-md);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
	}
	
	.table-cell-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	
	.table-cell-placeholder {
		font-size: var(--font-size-lg);
		opacity: 0.6;
	}
	
	/* Pagination controls styling */
	.pagination-controls {
		display: flex;
		gap: var(--space-2);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.page-header-content {
			flex-direction: column;
			gap: var(--space-3);
			align-items: stretch;
		}
		
		.page-actions {
			justify-content: space-between;
			flex-wrap: wrap;
			gap: var(--space-3);
		}
		
		.view-mode-toggle {
			order: -1;
		}
		
		.table {
			min-width: 900px;
		}
		
		.page-description {
			padding: 0;
		}
		
		.selection-banner {
			flex-direction: column;
			gap: var(--space-3);
			align-items: stretch;
		}
		
		.selection-actions {
			justify-content: center;
		}
		
		.replays-grid-container {
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
			gap: var(--space-4);
		}
		
		.replays-grid-header {
			flex-direction: column;
			gap: var(--space-3);
			align-items: flex-start;
		}
	}
	
	@media (max-width: 480px) {
		.replays-grid-container {
			grid-template-columns: 1fr;
		}
		
		.page-actions {
			flex-direction: column;
		}
		
		.view-mode-toggle {
			order: 0;
		}
	}
</style>