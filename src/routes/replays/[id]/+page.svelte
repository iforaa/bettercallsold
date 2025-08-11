<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { 
		replaysState, 
		replaysActions, 
		getCurrentReplayDisplay 
	} from '$lib/state/replays.svelte.js';
	import { VideoPlayerService } from '$lib/services/VideoPlayerService.js';
	
	// Components
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import VideoPlayer from '$lib/components/replays/VideoPlayer.svelte';
	import ReplayMetrics from '$lib/components/replays/ReplayMetrics.svelte';
	import ProductGrid from '$lib/components/replays/ProductGrid.svelte';

	let { data }: { data: PageData } = $props();
	
	const replayId = data.replayId;
	
	// Reactive state from global store
	let loading = $derived(replaysState.replayLoading);
	let error = $derived(replaysState.replayError);
	let replay = $derived(getCurrentReplayDisplay());
	let retrying = $state(false);
	
	// Track the last loaded replay ID to prevent re-loading the same replay
	let lastLoadedReplayId = $state(null);
	
	// Initialize replay data
	$effect(() => {
		if (browser && replayId && replayId !== lastLoadedReplayId) {
			// Clear previous replay and load new one
			replaysActions.clearCurrentReplay();
			replaysActions.loadReplay(replayId);
			lastLoadedReplayId = replayId;
		}
	});
	
	// Cleanup on destroy
	onDestroy(() => {
		replaysActions.destroyVideoPlayer();
	});
	
	// Event handlers
	function handleRetry() {
		retrying = true;
		replaysActions.loadReplay(replayId).finally(() => {
			retrying = false;
		});
	}
	
	function handleGoBack() {
		goto('/replays');
	}
	
	function handleVideoLoad() {
		console.log('Video loaded successfully');
	}
	
	function handleVideoError(error: string) {
		console.error('Video error:', error);
	}
	
	function handleProductClick(product: any) {
		console.log('Product clicked:', product);
		// TODO: Navigate to product details or external link
	}

</script>

<svelte:head>
	<title>Replay: {replay?.displayName || 'Loading...'} - BetterCallSold</title>
	<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</svelte:head>

<div class="page">
	{#if loading}
		<!-- Loading State -->
		<div class="page-header">
			<div class="page-header-content">
				<div class="page-header-nav">
					<button class="btn-icon" onclick={handleGoBack}>
						←
					</button>
					<div class="breadcrumb">
						<button class="breadcrumb-item" onclick={handleGoBack}>
							🎬 Replays
						</button>
						<span class="breadcrumb-separator">›</span>
						<span class="breadcrumb-item current">Loading...</span>
					</div>
				</div>
			</div>
		</div>
		<div class="page-content">
			<LoadingState 
				message="Loading replay details..."
				subMessage="Fetching video and product information"
			/>
		</div>
	{:else if error}
		<!-- Error State -->
		<ErrorState 
			message="Error Loading Replay"
			errorText={error}
			onRetry={handleRetry}
			onBack={handleGoBack}
			backLabel="Back to Replays"
			showBackButton={true}
			retryLabel={retrying ? 'Retrying...' : 'Try Again'}
			retrying={retrying}
		/>
	{:else if replay}
		<!-- Page Header -->
		<div class="page-header">
			<div class="page-header-content">
				<div class="page-header-nav">
					<button class="btn-icon" onclick={handleGoBack}>
						←
					</button>
					<div class="breadcrumb">
						<button class="breadcrumb-item" onclick={handleGoBack}>
							🎬 Replays
						</button>
						<span class="breadcrumb-separator">›</span>
						<span class="breadcrumb-item current">{replay.displayName}</span>
					</div>
				</div>
				<div class="page-actions">
					<span class="badge badge-{replay.statusInfo.color}">
						{replay.statusInfo.text}
					</span>
				</div>
			</div>
		</div>

		<div class="page-content">
			<div class="content-layout">
				<!-- Main Content -->
				<div class="content-main">
					<!-- Products Section -->
					{#if replay?.products && Array.isArray(replay.products) && replay.products.length > 0}
						<div class="content-section">
							<div class="content-header">
								<h3 class="content-title">Products ({replay.products.length})</h3>
								<p class="content-description">Products featured in this replay</p>
							</div>
							<div class="content-body">
								<ProductGrid
									products={replay.products}
									maxItems={6}
									showMore={true}
									onProductClick={handleProductClick}
								/>
							</div>
						</div>
					{/if}

					<!-- Replay Details -->
					<div class="content-section">
						<div class="content-header">
							<h3 class="content-title">Replay Information</h3>
						</div>
						<div class="content-body">
							<div class="info-grid">
								<div class="info-item">
									<span class="info-label">External ID:</span>
									<span class="info-value">{replay.external_id}</span>
								</div>
								<div class="info-item">
									<span class="info-label">Started:</span>
									<span class="info-value">{replay.started_at_formatted || 'Unknown'}</span>
								</div>
								<div class="info-item">
									<span class="info-label">Ended:</span>
									<span class="info-value">{replay.ended_at_formatted || 'Unknown'}</span>
								</div>
								<div class="info-item">
									<span class="info-label">Duration:</span>
									<span class="info-value">{replay.formattedDuration}</span>
								</div>
								<div class="info-item">
									<span class="info-label">Peak Viewers:</span>
									<span class="info-value">{replay.formattedViewers}</span>
								</div>
								<div class="info-item">
									<span class="info-label">Product Count:</span>
									<span class="info-value">{replay.productsCount}</span>
								</div>
								<div class="info-item">
									<span class="info-label">Status:</span>
									<span class="info-value">{replay.status}</span>
								</div>
								{#if replay.label}
									<div class="info-item">
										<span class="info-label">Label:</span>
										<span class="info-value">{replay.label}</span>
									</div>
								{/if}
								<div class="info-item">
									<span class="info-label">Wide Cell:</span>
									<span class="info-value">{replay.is_wide_cell ? 'Yes' : 'No'}</span>
								</div>
							</div>

							{#if replay.description}
								<div class="description-section">
									<h3>Description</h3>
									<p class="description-text">{replay.description}</p>
								</div>
							{/if}

							{#if replay.metadata}
								<div class="metadata-section">
									<h3>Sync Metadata</h3>
									<div class="metadata-content">
										<pre>{JSON.stringify(replay.metadata, null, 2)}</pre>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Sidebar -->
				<div class="content-sidebar">
					<!-- Video Player Section -->
					<div class="video-card">
						<div class="card-header">
							<h3>
								{#if VideoPlayerService.hasVideo(replay)}
									Watch Replay
								{:else}
									Replay Preview
								{/if}
							</h3>
						</div>
						<div class="card-content">
							<VideoPlayer
								{replay}
								controls={true}
								autoplay={false}
								muted={false}
								onLoad={handleVideoLoad}
								onError={handleVideoError}
							/>
						</div>
					</div>

					<!-- Replay Metrics -->
					<ReplayMetrics
						{replay}
						showDetailed={false}
					/>
				</div>
			</div>
		</div>
	{:else}
		<!-- Fallback state (shouldn't normally reach here) -->
		<div class="error-state">
			<div class="error-state-content">
				<div class="error-state-icon">⚠</div>
				<h1 class="error-state-title">Replay Not Found</h1>
				<p class="error-state-message">The requested replay could not be found.</p>
				<div class="error-state-actions">
					<button class="btn btn-primary" onclick={goBack}>Back to Replays</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Minimal custom styles - most styling now handled by components */
	
	/* Custom video card styling */
	.video-card {
		margin-bottom: var(--space-6);
	}
	
	.card-header {
		padding: var(--space-4) var(--space-4) 0 var(--space-4);
	}
	
	.card-header h3 {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
	}
	
	.card-content {
		padding: var(--space-4);
	}
	
	/* Info grid for replay details */
	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}
	
	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--color-border-light);
	}
	
	.info-item:last-child {
		border-bottom: none;
	}
	
	.info-label {
		font-weight: var(--font-weight-medium);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}
	
	.info-value {
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		text-align: right;
	}
	
	/* Metadata styling */
	.description-section, .metadata-section {
		margin-top: var(--space-8);
	}
	
	.description-section h3, .metadata-section h3 {
		margin: 0 0 var(--space-4) 0;
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}
	
	.description-text {
		color: var(--color-text-muted);
		line-height: var(--line-height-normal);
		margin: 0;
	}
	
	.metadata-content {
		background: var(--color-surface-hover);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		overflow-x: auto;
	}
	
	.metadata-content pre {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-text);
		font-family: var(--font-mono);
	}
	
	/* Responsive adjustments not covered by design system */
	@media (max-width: 768px) {
		.products-grid {
			grid-template-columns: 1fr;
		}
		
		.info-grid {
			grid-template-columns: 1fr;
		}
	}
</style>