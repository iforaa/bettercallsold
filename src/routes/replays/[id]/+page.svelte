<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
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
	
	// Chart instance
	let chartInstance = null;
	
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
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}
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
		if (product?.id || product?.product_id) {
			// Navigate to product details with replay context for back navigation
			const productId = product.id || product.product_id;
			goto(`/products/${productId}?from=replay&replayId=${replayId}`);
		}
	}

	// Generate fake sales data for the chart
	function generateSalesData(durationMinutes: number) {
		const dataPoints = Math.min(60, Math.max(10, durationMinutes)); // Between 10-60 data points
		const timeInterval = durationMinutes / dataPoints;
		const labels = [];
		const salesData = [];
		const viewersData = [];
		
		let cumulativeSales = 0;
		let baseViewers = Math.floor(Math.random() * 500) + 100; // Base viewers 100-600
		
		for (let i = 0; i <= dataPoints; i++) {
			const minutes = Math.floor(i * timeInterval);
			labels.push(`${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, '0')}`);
			
			// Generate sales spikes (more sales during peak moments)
			const isProductMoment = Math.random() > 0.7; // 30% chance of product showcase
			const salesIncrease = isProductMoment 
				? Math.floor(Math.random() * 15) + 5  // 5-20 sales during product moments
				: Math.floor(Math.random() * 3);      // 0-3 sales otherwise
				
			cumulativeSales += salesIncrease;
			salesData.push(cumulativeSales);
			
			// Generate viewer fluctuations
			const viewerChange = (Math.random() - 0.5) * 100; // ±50 viewers
			baseViewers = Math.max(50, baseViewers + viewerChange);
			viewersData.push(Math.floor(baseViewers));
		}
		
		return { labels, salesData, viewersData };
	}

	// Initialize chart
	async function initializeChart() {
		if (!browser || !replay) return;
		
		try {
			// Dynamically import Chart.js to avoid SSR issues
			const { Chart, registerables } = await import('chart.js');
			Chart.register(...registerables);
			
			const canvas = document.getElementById('salesChart');
			if (!canvas || chartInstance) return;
			
			// Parse duration from replay (fallback to 60 minutes)
			const durationMinutes = replay.duration_seconds 
				? Math.floor(replay.duration_seconds / 60) 
				: 60;
				
			const { labels, salesData, viewersData } = generateSalesData(durationMinutes);
			
			chartInstance = new Chart(canvas, {
				type: 'line',
				data: {
					labels,
					datasets: [
						{
							label: 'Cumulative Sales',
							data: salesData,
							borderColor: '#00a96e',
							backgroundColor: 'rgba(0, 169, 110, 0.1)',
							tension: 0.4,
							fill: true,
							yAxisID: 'y'
						},
						{
							label: 'Live Viewers',
							data: viewersData,
							borderColor: '#005bd3',
							backgroundColor: 'rgba(0, 91, 211, 0.1)',
							tension: 0.4,
							fill: false,
							yAxisID: 'y1'
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					interaction: {
						mode: 'index',
						intersect: false,
					},
					plugins: {
						title: {
							display: false
						},
						legend: {
							position: 'top',
						}
					},
					scales: {
						x: {
							display: true,
							title: {
								display: true,
								text: 'Time'
							}
						},
						y: {
							type: 'linear',
							display: true,
							position: 'left',
							title: {
								display: true,
								text: 'Sales Count'
							},
							beginAtZero: true
						},
						y1: {
							type: 'linear',
							display: true,
							position: 'right',
							title: {
								display: true,
								text: 'Viewers'
							},
							beginAtZero: true,
							grid: {
								drawOnChartArea: false,
							},
						}
					}
				}
			});
		} catch (error) {
			console.error('Failed to initialize chart:', error);
		}
	}

	// Initialize chart when replay data is loaded
	$effect(() => {
		if (replay && !chartInstance) {
			setTimeout(initializeChart, 100); // Small delay to ensure DOM is ready
		}
	});

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
					<!-- Replay Information Section -->
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
						</div>
					</div>

					<!-- Sales Analytics Chart -->
					<div class="content-section">
						<div class="content-header">
							<h3 class="content-title">Sales Analytics</h3>
							<p class="content-description">Sales performance during live stream</p>
						</div>
						<div class="content-body">
							<div class="chart-container">
								<canvas id="salesChart" width="400" height="200"></canvas>
							</div>
						</div>
					</div>

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
					<button class="btn btn-primary" onclick={handleGoBack}>Back to Replays</button>
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
	
	/* Description styling */
	.description-section {
		margin-top: var(--space-8);
	}
	
	.description-section h3 {
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

	/* Chart container styling */
	.chart-container {
		position: relative;
		height: 300px;
		width: 100%;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
	}

	.chart-container canvas {
		width: 100% !important;
		height: 100% !important;
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