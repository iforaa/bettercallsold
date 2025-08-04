<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();
	
	// State management
	let replays: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let pagination = $state(null);
	let selectedReplays: string[] = $state([]);
	let selectAll = $state(false);
	
	// Get URL params from load function
	let urlParams = $derived(data.urlParams || { page: '1', limit: '20', status: 'active' });
	
	// Client-side data fetching
	async function loadReplays() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';
			
			const { page, limit, status } = urlParams;
			const response = await fetch(`/api/replays?page=${page}&limit=${limit}&status=${status}`);
			
			if (!response.ok) {
				throw new Error('Failed to fetch replays');
			}

			const result = await response.json();
			replays = result.replays || [];
			pagination = result.pagination || null;
		} catch (err) {
			console.error('Load replays error:', err);
			error = 'Failed to load replays from backend';
			replays = [];
			pagination = null;
		} finally {
			loading = false;
		}
	}
	
	// Load replays when component mounts
	onMount(() => {
		loadReplays();
	});

	function toggleSelectAll() {
		if (selectAll) {
			selectedReplays = replays?.map(r => r.id) || [];
		} else {
			selectedReplays = [];
		}
	}

	function toggleReplay(replayId: string) {
		if (selectedReplays.includes(replayId)) {
			selectedReplays = selectedReplays.filter(id => id !== replayId);
		} else {
			selectedReplays = [...selectedReplays, replayId];
		}
		selectAll = selectedReplays.length === replays?.length;
	}

	function goToReplay(replayId: string) {
		goto(`/replays/${replayId}`);
	}

	function handleReplayClick(event: Event, replayId: string) {
		// Don't navigate if clicking on checkbox
		const target = event.target as HTMLElement;
		if (target.type === 'checkbox' || target.closest('input[type="checkbox"]')) {
			return;
		}
		goToReplay(replayId);
	}

	function formatDuration(minutes: number | null): string {
		if (!minutes) return 'Unknown';
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours}h ${mins}m`;
	}

	function formatViewers(viewers: number): string {
		if (viewers >= 1000) {
			return `${(viewers / 1000).toFixed(1)}k`;
		}
		return viewers.toString();
	}

	function getStatusBadge(isLive: boolean): { text: string, class: string } {
		return isLive 
			? { text: 'Live', class: 'status-live' }
			: { text: 'Replay', class: 'status-replay' };
	}
</script>

<svelte:head>
	<title>Replays - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">🎬</span>
				Replays
			</h1>
			<div class="header-actions">
				<a href="/replays/sync" class="btn-primary">Sync Replays</a>
			</div>
		</div>
		<p class="page-description">
			View and manage your CommentSold live sale replays.
		</p>
	</div>

	<div class="page-content">

{#if error}
		<div class="error-state">
			<p>{error}</p>
			<button class="btn-secondary" onclick={() => loadReplays()}>
				Retry
			</button>
		</div>
	{:else if loading}
		<!-- Loading state -->
		<div class="loading-state">
			<div class="loading-content">
				<div class="loading-spinner-large"></div>
				<h3>Loading replays...</h3>
				<p>This may take a moment</p>
			</div>
		</div>
	{:else}
		<!-- Tabs -->
		<div class="tabs">
			<button class="tab active">All</button>
		</div>

		{#if replays && replays.length > 0}
			<!-- Table -->
			<div class="table-container">
				<table class="replays-table">
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
							<th>Status</th>
							<th>Started</th>
							<th>Duration</th>
							<th>Products</th>
							<th>Peak Viewers</th>
						</tr>
					</thead>
					<tbody>
						{#each replays as replay}
							<tr class="replay-row" onclick={(e) => handleReplayClick(e, replay.id)}>
								<td class="checkbox-col" onclick={(e) => e.stopPropagation()}>
									<input 
										type="checkbox" 
										checked={selectedReplays.includes(replay.id)}
										onchange={() => toggleReplay(replay.id)}
									/>
								</td>
								<td class="title-col">
									<div class="replay-info">
										<div class="replay-thumbnail">
											{#if replay.source_thumb}
												<img src={replay.source_thumb} alt={replay.name || replay.title} />
											{:else if replay.animated_thumb}
												<img src={replay.animated_thumb} alt={replay.name || replay.title} />
											{:else}
												🎬
											{/if}
										</div>
										<div class="replay-details">
											<div class="replay-title">{replay.name || replay.title}</div>
											<div class="replay-subtitle">ID: {replay.external_id}</div>
										</div>
									</div>
								</td>
								<td>
									<span class="status-badge {getStatusBadge(replay.is_live).class}">
										{getStatusBadge(replay.is_live).text}
									</span>
								</td>
								<td>
									<span class="date-text">{replay.started_at_formatted || 'Unknown'}</span>
								</td>
								<td>
									<span class="duration-text">{formatDuration(replay.duration)}</span>
								</td>
								<td>
									<span class="count-text">{replay.products_count || 0}</span>
								</td>
								<td>
									<span class="viewers-text">{formatViewers(replay.peak_viewers || 0)}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if pagination}
				<div class="pagination">
					<div class="pagination-info">
						{((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
					</div>
					<div class="pagination-controls">
						{#if pagination.hasPrev}
							<a href="?page={pagination.page - 1}" class="pagination-btn">Previous</a>
						{/if}
						{#if pagination.hasNext}
							<a href="?page={pagination.page + 1}" class="pagination-btn">Next</a>
						{/if}
					</div>
				</div>
			{/if}
		{:else}
			<div class="empty-state">
				<div class="empty-content">
					<div class="empty-icon">🎬</div>
					<h3>No replays found</h3>
					<p>Sync your CommentSold live sales to see them here as replays</p>
					<a href="/replays/sync" class="btn-primary">Sync Replays</a>
				</div>
			</div>
		{/if}
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
		margin-bottom: 0.5rem;
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

	.page-description {
		margin: 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.btn-primary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s ease;
		background: #202223;
		color: white;
		border: none;
	}

	.btn-primary:hover {
		background: #1a1a1a;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s ease;
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

	.table-container {
		background: white;
		overflow-x: auto;
	}

	.replays-table {
		width: 100%;
		border-collapse: collapse;
	}

	.replays-table th {
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

	.replays-table td {
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

	.replay-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.replay-thumbnail {
		width: 60px;
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

	.replay-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.replay-details {
		flex: 1;
	}

	.replay-title {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.replay-subtitle {
		color: #6d7175;
		font-size: 0.8125rem;
		line-height: 1.3;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.status-live {
		background: #fef2f2;
		color: #991b1b;
	}

	.status-replay {
		background: #f0fdf4;
		color: #166534;
	}

	.date-text, .duration-text, .count-text, .viewers-text {
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

	.pagination-controls {
		display: flex;
		gap: 0.5rem;
	}

	.pagination-btn {
		padding: 0.5rem 1rem;
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		text-decoration: none;
		font-size: 0.875rem;
		transition: all 0.15s ease;
	}

	.pagination-btn:hover {
		background: #f6f6f7;
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

	.error-state {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 1rem 2rem;
		margin: 1rem 2rem;
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: flex-start;
	}

	.error-state button {
		align-self: flex-start;
	}

	input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.replay-row {
		cursor: pointer;
	}

	.replay-row:hover {
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
		
		.replays-table {
			min-width: 900px;
		}
	}
</style>