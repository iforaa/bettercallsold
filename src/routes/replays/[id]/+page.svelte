<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();
	
	// Client-side state management
	let replay = $state(null);
	let loading = $state(true);
	let error = $state('');
	let retrying = $state(false);
	const replayId = data.replayId;
	let videoElement: HTMLVideoElement;
	let hlsInstance: any = null;

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

	function formatPrice(price: number): string {
		return `$${price.toFixed(2)}`;
	}

	function getVideoUrl(replay: any): string | null {
		// First try the source_url if available
		if (replay.source_url && replay.source_url.trim() !== '') {
			return replay.source_url;
		}
		
		// Try to construct video URL from CommentSold patterns
		if (replay.animated_thumb) {
			// Convert thumbnail URL to video URL
			// Example: https://vod2.commentsold.com/dist/divas/3233/thumbnails/240p.webp
			// to: https://vod2.commentsold.com/dist/divas/3233/playlist.m3u8
			const thumbnailUrl = replay.animated_thumb;
			
			// Try multiple possible video formats, prioritizing playlist.m3u8
			const baseUrl = thumbnailUrl.replace(/\/thumbnails\/.*$/, '');
			
			// Return HLS stream URL - try playlist.m3u8 first as per your example
			return baseUrl + '/playlist.m3u8';
		}
		
		return null;
	}

	function getVideoSources(replay: any): Array<{src: string, type: string}> {
		const sources = [];
		
		// First try the source_url if available
		if (replay.source_url && replay.source_url.trim() !== '') {
			if (replay.source_url.includes('.m3u8')) {
				sources.push({ src: replay.source_url, type: 'application/x-mpegURL' });
			} else if (replay.source_url.includes('.mp4')) {
				sources.push({ src: replay.source_url, type: 'video/mp4' });
			} else {
				sources.push({ src: replay.source_url, type: 'video/mp4' });
			}
		}
		
		// Try to construct video URL from CommentSold patterns
		if (replay.animated_thumb) {
			const baseUrl = replay.animated_thumb.replace(/\/thumbnails\/.*$/, '');
			
			// Add multiple possible video formats
			sources.push(
				{ src: baseUrl + '/index.m3u8', type: 'application/x-mpegURL' },
				{ src: baseUrl + '/video.m3u8', type: 'application/x-mpegURL' },
				{ src: baseUrl + '/playlist.m3u8', type: 'application/x-mpegURL' },
				{ src: baseUrl + '/video.mp4', type: 'video/mp4' }
			);
		}
		
		return sources;
	}

	function goBack() {
		goto('/replays');
	}

	function initHLSPlayer() {
		if (!videoElement || !replay) return;

		const videoUrl = getVideoUrl(replay);
		if (!videoUrl) return;

		console.log('Initializing HLS player with URL:', videoUrl);

		// Clean up existing HLS instance
		if (hlsInstance) {
			hlsInstance.destroy();
			hlsInstance = null;
		}

		// Check if HLS.js is available globally
		if (typeof window !== 'undefined' && (window as any).Hls) {
			const Hls = (window as any).Hls;
			
			if (Hls.isSupported()) {
				console.log('HLS.js is supported, creating instance');
				hlsInstance = new Hls({
					enableWorker: true,
					lowLatencyMode: false,
					backBufferLength: 90
				});
				
				hlsInstance.loadSource(videoUrl);
				hlsInstance.attachMedia(videoElement);
				
				hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
					console.log('HLS: Media attached');
				});
				
				hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
					console.log('HLS: Manifest parsed, starting playback');
				});
				
				hlsInstance.on(Hls.Events.ERROR, (event: any, data: any) => {
					console.error('HLS Error:', data);
					if (data.fatal) {
						switch (data.type) {
							case Hls.ErrorTypes.NETWORK_ERROR:
								console.log('Network error, trying to recover...');
								hlsInstance.startLoad();
								break;
							case Hls.ErrorTypes.MEDIA_ERROR:
								console.log('Media error, trying to recover...');
								hlsInstance.recoverMediaError();
								break;
							default:
								console.log('Fatal error, destroying HLS instance');
								hlsInstance.destroy();
								hlsInstance = null;
								break;
						}
					}
				});
			} else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
				// For Safari and other browsers with native HLS support
				console.log('Using native HLS support');
				videoElement.src = videoUrl;
			} else {
				console.warn('HLS not supported, trying MP4 fallback');
				// Try MP4 fallback
				const mp4Url = videoUrl.replace('.m3u8', '.mp4');
				videoElement.src = mp4Url;
			}
		} else {
			console.log('HLS.js not loaded yet, waiting...');
			// HLS.js might not be loaded yet, try again after a short delay
			setTimeout(() => initHLSPlayer(), 100);
		}
	}

	// Client-side data fetching
	async function loadReplay() {
		if (!browser || !replayId) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch(`/api/replays/${replayId}`);
			
			if (response.status === 404) {
				error = 'Replay not found';
				replay = null;
				return;
			}
			
			if (!response.ok) {
				throw new Error('Failed to fetch replay');
			}
			
			const replayData = await response.json();
			replay = replayData;
		} catch (err) {
			console.error('Load replay error:', err);
			error = 'Failed to load replay. Please try again.';
			replay = null;
		} finally {
			loading = false;
			retrying = false;
		}
	}
	
	// Retry function for error states
	async function retryLoad() {
		retrying = true;
		await loadReplay();
	}
	
	onMount(() => {
		// Load replay data first
		loadReplay();
		
		return () => {
			// Cleanup on unmount
			if (hlsInstance) {
				hlsInstance.destroy();
				hlsInstance = null;
			}
		};
	});

	// Re-initialize HLS when replay data changes
	$effect(() => {
		if (replay && videoElement) {
			initHLSPlayer();
		}
	});
</script>

<svelte:head>
	<title>Replay: {replay?.name || replay?.title || 'Loading...'} - BetterCallSold</title>
	<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</svelte:head>

<div class="page">
	{#if loading}
		<div class="page">
			<!-- Page Header for loading state -->
			<div class="page-header">
				<div class="header-main">
					<div class="header-left">
						<button class="back-button" onclick={goBack}>
							←
						</button>
						<h1>Loading replay...</h1>
					</div>
				</div>
			</div>
			<div class="page-content">
				<div class="loading-content">
					<div class="loading-spinner-large"></div>
					<p class="loading-text">Loading replay details...</p>
				</div>
			</div>
		</div>
	{:else if error}
		<div class="error-page">
			<div class="error-content">
				<div class="error-icon">⚠</div>
				<h1>Error Loading Replay</h1>
				<p>{error}</p>
				<div class="error-actions">
					<button onclick={retryLoad} class="btn-primary" disabled={retrying}>
						{#if retrying}
							<span class="loading-spinner"></span>
						{/if}
						{retrying ? 'Retrying...' : 'Try Again'}
					</button>
					<button onclick={goBack} class="btn-secondary">Back to Replays</button>
				</div>
			</div>
		</div>
	{:else if replay}
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-main">
				<div class="header-left">
					<button class="back-button" onclick={goBack}>
						←
					</button>
					<h1>{replay.name || replay.title}</h1>
				</div>
				<div class="header-actions">
					<span class="status-badge {getStatusBadge(replay.is_live).class}">
						{getStatusBadge(replay.is_live).text}
					</span>
				</div>
			</div>
		</div>

		<div class="page-content">
			<div class="content-layout">
				<!-- Main Content -->
				<div class="main-content">
					<!-- Products Section - Moved to top -->
					{#if replay.products && replay.products.length > 0}
						<div class="products-card">
							<div class="card-header">
								<h2>Products ({replay.products.length})</h2>
								<p>Products featured in this replay</p>
							</div>
							<div class="card-content">
								<div class="products-grid">
									{#each replay.products as product}
										<div class="product-item">
											<div class="product-image">
												{#if product.thumbnail}
													<img src={product.thumbnail} alt={product.product_name} />
												{:else}
													📦
												{/if}
											</div>
											<div class="product-details">
												<div class="product-name">{product.product_name}</div>
												{#if product.brand}
													<div class="product-brand">{product.brand}</div>
												{/if}
												<div class="product-price">
													{#if product.price_label}
														{product.price_label}
													{:else if product.price}
														{formatPrice(product.price)}
													{:else}
														Price not available
													{/if}
												</div>
												{#if product.quantity !== null}
													<div class="product-quantity">Qty: {product.quantity}</div>
												{/if}
												{#if product.badge_label}
													<div class="product-badge">{product.badge_label}</div>
												{/if}
												{#if product.shown_at_formatted}
													<div class="product-timing">Shown: {product.shown_at_formatted}</div>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/if}

					<!-- Replay Details -->
					<div class="replay-info-card">
						<div class="card-header">
							<h2>Replay Information</h2>
						</div>
						<div class="card-content">
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
									<span class="info-value">{formatDuration(replay.duration)}</span>
								</div>
								<div class="info-item">
									<span class="info-label">Peak Viewers:</span>
									<span class="info-value">{formatViewers(replay.peak_viewers || 0)}</span>
								</div>
								<div class="info-item">
									<span class="info-label">Product Count:</span>
									<span class="info-value">{replay.product_count || 0}</span>
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
				<div class="sidebar">
					<!-- Video Player Section - Moved to sidebar -->
					{#if getVideoUrl(replay)}
						<div class="video-card">
							<div class="card-header">
								<h3>Watch Replay</h3>
							</div>
							<div class="card-content">
								<div class="video-container">
									<video 
										bind:this={videoElement}
										controls 
										poster={replay.source_thumb || replay.animated_thumb}
										class="replay-video"
										preload="metadata"
										crossorigin="anonymous"
									>
										<p>Your browser doesn't support HTML5 video. Here is a <a href={getVideoUrl(replay)}>link to the video</a> instead.</p>
									</video>
								</div>
							</div>
						</div>
					{:else if replay.source_thumb || replay.animated_thumb}
						<div class="video-card">
							<div class="card-header">
								<h3>Replay Preview</h3>
							</div>
							<div class="card-content">
								<div class="video-placeholder">
									<img 
										src={replay.source_thumb || replay.animated_thumb} 
										alt={replay.name || replay.title}
										class="replay-thumbnail"
									/>
									<div class="play-overlay">
										<div class="play-button">▶</div>
										<p>Video not available</p>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<div class="stats-card">
						<div class="card-header">
							<h3>Quick Stats</h3>
						</div>
						<div class="card-content">
							<div class="stat-item">
								<div class="stat-number">{formatViewers(replay.peak_viewers || 0)}</div>
								<div class="stat-label">Peak Viewers</div>
							</div>
							<div class="stat-item">
								<div class="stat-number">{replay.product_count || 0}</div>
								<div class="stat-label">Products</div>
							</div>
							<div class="stat-item">
								<div class="stat-number">{formatDuration(replay.duration)}</div>
								<div class="stat-label">Duration</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Fallback state (shouldn't normally reach here) -->
		<div class="error-page">
			<div class="error-content">
				<div class="error-icon">⚠</div>
				<h1>Replay Not Found</h1>
				<p>The requested replay could not be found.</p>
				<button onclick={goBack} class="btn-primary">Back to Replays</button>
			</div>
		</div>
	{/if}
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

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-button {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		color: #6d7175;
		padding: 0.25rem;
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

	.page-content {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.video-section {
		margin-bottom: 2rem;
	}

	.video-container {
		background: black;
		border-radius: 8px;
		overflow: hidden;
		aspect-ratio: 9/16; /* Vertical aspect ratio */
		width: 100%;
	}

	.replay-video {
		width: 100%;
		height: 100%;
		display: block;
	}

	.video-placeholder {
		position: relative;
		background: black;
		border-radius: 12px;
		overflow: hidden;
		aspect-ratio: 16/9;
		max-width: 1000px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.replay-thumbnail {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.play-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.play-button {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.8;
	}

	.content-layout {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 2rem;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.replay-info-card, .products-card, .stats-card, .thumbnail-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		overflow: hidden;
	}

	.card-header {
		padding: 1.5rem 1.5rem 1rem;
		border-bottom: 1px solid #f0f0f0;
	}

	.card-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
	}

	.card-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
	}

	.card-header p {
		margin: 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.card-content {
		padding: 1.5rem;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0;
		border-bottom: 1px solid #f0f0f0;
	}

	.info-item:last-child {
		border-bottom: none;
	}

	.info-label {
		font-weight: 500;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.info-value {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		text-align: right;
	}

	.description-section, .metadata-section {
		margin-top: 2rem;
	}

	.description-section h3, .metadata-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
	}

	.description-text {
		color: #6d7175;
		line-height: 1.5;
		margin: 0;
	}

	.metadata-content {
		background: #f6f6f7;
		border-radius: 8px;
		padding: 1rem;
		overflow-x: auto;
	}

	.metadata-content pre {
		margin: 0;
		font-size: 0.8125rem;
		color: #202223;
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
	}

	.products-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.product-item {
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		gap: 1rem;
		transition: all 0.15s ease;
	}

	.product-item:hover {
		border-color: #c9cccf;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.product-image {
		width: 60px;
		height: 60px;
		background: #f6f6f7;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		opacity: 0.6;
		overflow: hidden;
		flex-shrink: 0;
	}

	.product-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.product-details {
		flex: 1;
		min-width: 0;
	}

	.product-name {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
		word-wrap: break-word;
	}

	.product-brand {
		color: #6d7175;
		font-size: 0.8125rem;
		margin-bottom: 0.25rem;
	}

	.product-price {
		font-weight: 600;
		color: #00a96e;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.product-quantity, .product-timing {
		color: #6d7175;
		font-size: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.product-badge {
		background: #f0fdf4;
		color: #166534;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		display: inline-block;
		margin-top: 0.25rem;
	}

	.stats-card .card-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.stat-item {
		text-align: center;
	}

	.stat-number {
		font-size: 2rem;
		font-weight: 600;
		color: #202223;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		color: #6d7175;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.sidebar-thumbnail {
		width: 100%;
		border-radius: 8px;
		display: block;
	}

	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
	}

	.error-content h1 {
		font-size: 2rem;
		margin-bottom: 1rem;
		color: #202223;
	}

	.error-content p {
		color: #6d7175;
		margin-bottom: 2rem;
		font-size: 1.125rem;
	}

	.btn-primary {
		padding: 0.75rem 1.5rem;
		background: #005bd3;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.15s ease;
	}

	.btn-primary:hover {
		background: #004bb5;
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
		padding: 2rem;
	}
	
	.loading-spinner-large {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(0, 91, 211, 0.1);
		border-radius: 50%;
		border-top-color: #005bd3;
		animation: spin 1s ease-in-out infinite;
		margin-bottom: 1rem;
	}
	
	.loading-text {
		color: #6d7175;
		font-size: 1.125rem;
		margin: 0;
	}
	
	.loading-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 0.8s ease-in-out infinite;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		color: #dc2626;
	}
	
	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}
	
	.btn-secondary {
		padding: 0.75rem 1.5rem;
		background: white;
		color: #202223;
		border: 1px solid #c9cccf;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.15s ease;
	}
	
	.btn-secondary:hover {
		background: #f6f6f7;
		border-color: #8c9196;
	}
	
	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.btn-primary:disabled .loading-spinner {
		border-color: rgba(255, 255, 255, 0.5);
		border-top-color: rgba(255, 255, 255, 0.8);
	}

	@media (max-width: 1024px) {
		.content-layout {
			grid-template-columns: 1fr;
		}
		
		.sidebar {
			order: -1;
		}
		
		.stats-card .card-content {
			flex-direction: row;
			justify-content: space-around;
		}
	}

	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}

		.header-main {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.header-left {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.back-btn {
			align-self: flex-start;
		}

		.info-grid {
			grid-template-columns: 1fr;
		}

		.products-grid {
			grid-template-columns: 1fr;
		}

		.stats-card .card-content {
			flex-direction: column;
			gap: 1rem;
		}
	}
</style>