<script lang="ts">
	import type { VideoPlayerProps } from '$lib/types/replays';
	import { VideoPlayerService } from '$lib/services/VideoPlayerService.js';
	import { onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	
	let { 
		replay,
		autoplay = false,
		muted = false,
		controls = true,
		poster,
		className = '',
		onLoad,
		onError,
		onPlay,
		onPause
	}: VideoPlayerProps = $props();
	
	let videoElement: HTMLVideoElement;
	let hlsInstance: any = null;
	let loading = $state(true);
	let error = $state('');
	let isPlaying = $state(false);
	let duration = $state(0);
	let currentTime = $state(0);
	
	// Get video metadata
	let videoMetadata = $derived(VideoPlayerService.getVideoMetadata(replay));
	let posterImage = $derived(poster || VideoPlayerService.getPosterImage(replay));
	
	// Initialize video player when element is ready
	function initializePlayer() {
		if (!browser || !videoElement || !videoMetadata.hasVideo) {
			loading = false;
			if (!videoMetadata.hasVideo) {
				error = 'No video source available';
			}
			return;
		}
		
		loading = true;
		error = '';
		
		try {
			// Clean up existing instance
			if (hlsInstance) {
				VideoPlayerService.destroyHLSPlayer(hlsInstance);
				hlsInstance = null;
			}
			
			// Initialize HLS player
			hlsInstance = VideoPlayerService.initializeHLSPlayer(
				videoElement, 
				videoMetadata.primaryUrl!,
				{
					enableWorker: true,
					lowLatencyMode: false,
					backBufferLength: 90
				}
			);
			
			if (hlsInstance) {
				setupVideoEventListeners();
				onLoad?.();
			} else {
				throw new Error('Failed to initialize video player');
			}
		} catch (err) {
			console.error('Video player initialization failed:', err);
			error = err instanceof Error ? err.message : 'Failed to load video';
			onError?.(error);
		} finally {
			loading = false;
		}
	}
	
	function setupVideoEventListeners() {
		if (!videoElement) return;
		
		videoElement.addEventListener('loadedmetadata', () => {
			duration = videoElement.duration;
			loading = false;
		});
		
		videoElement.addEventListener('timeupdate', () => {
			currentTime = videoElement.currentTime;
		});
		
		videoElement.addEventListener('play', () => {
			isPlaying = true;
			onPlay?.();
		});
		
		videoElement.addEventListener('pause', () => {
			isPlaying = false;
			onPause?.();
		});
		
		videoElement.addEventListener('error', (e) => {
			const videoError = videoElement.error;
			const errorMessage = videoError 
				? `Video error: ${videoError.message} (Code: ${videoError.code})`
				: 'Unknown video error';
			error = errorMessage;
			loading = false;
			onError?.(errorMessage);
		});
		
		videoElement.addEventListener('waiting', () => {
			loading = true;
		});
		
		videoElement.addEventListener('canplay', () => {
			loading = false;
		});
	}
	
	// Play/pause controls
	function togglePlay() {
		if (!videoElement) return;
		
		if (isPlaying) {
			videoElement.pause();
		} else {
			videoElement.play().catch(err => {
				console.error('Play failed:', err);
				error = 'Failed to play video';
			});
		}
	}
	
	function seek(time: number) {
		if (videoElement && !isNaN(duration)) {
			videoElement.currentTime = Math.max(0, Math.min(time, duration));
		}
	}
	
	function setVolume(volume: number) {
		if (videoElement) {
			videoElement.volume = Math.max(0, Math.min(1, volume));
		}
	}
	
	// Format time for display
	function formatTime(seconds: number): string {
		return VideoPlayerService.formatVideoDuration(seconds);
	}
	
	// Initialize player when video element is bound
	$effect(() => {
		if (videoElement && videoMetadata.hasVideo) {
			initializePlayer();
		}
	});
	
	// Cleanup on destroy
	onDestroy(() => {
		if (hlsInstance) {
			VideoPlayerService.destroyHLSPlayer(hlsInstance);
		}
	});
</script>

<div class="video-player {className}">
	{#if videoMetadata.hasVideo}
		<div class="video-container">
			{#if loading}
				<div class="video-loading">
					<div class="loading-spinner loading-spinner-lg"></div>
					<p>Loading video...</p>
				</div>
			{/if}
			
			{#if error}
				<div class="video-error">
					<div class="error-icon">⚠</div>
					<p>{error}</p>
					<button class="btn btn-secondary btn-sm" onclick={initializePlayer}>
						Retry
					</button>
				</div>
			{/if}
			
			<video 
				bind:this={videoElement}
				{controls}
				{autoplay}
				{muted}
				poster={posterImage}
				preload="metadata"
				crossorigin="anonymous"
				class="video-element"
				class:hidden={loading || error}
			>
				{#each videoMetadata.allSources as source}
					<source src={source.src} type={source.type} />
				{/each}
				<p>Your browser doesn't support HTML5 video. 
					<a href={videoMetadata.primaryUrl} target="_blank" rel="noopener noreferrer">
						Download the video
					</a> instead.
				</p>
			</video>
		</div>
		
		{#if !controls && videoElement}
			<!-- Custom controls if native controls are disabled -->
			<div class="video-controls">
				<button class="control-btn play-btn" onclick={togglePlay}>
					{isPlaying ? '⏸' : '▶'}
				</button>
				
				<div class="time-display">
					{formatTime(currentTime)} / {formatTime(duration)}
				</div>
				
				<div class="progress-container">
					<input 
						type="range" 
						class="progress-bar"
						min="0" 
						max={duration || 0}
						value={currentTime}
						oninput={(e) => seek(Number((e.target as HTMLInputElement).value))}
					/>
				</div>
				
				<div class="volume-container">
					<span>🔊</span>
					<input 
						type="range" 
						class="volume-bar"
						min="0" 
						max="1"
						step="0.1"
						value={videoElement.volume}
						oninput={(e) => setVolume(Number((e.target as HTMLInputElement).value))}
					/>
				</div>
			</div>
		{/if}
	{:else if videoMetadata.hasThumbnail}
		<!-- Show thumbnail when no video is available -->
		<div class="video-placeholder">
			<img 
				src={posterImage} 
				alt={videoMetadata.displayName}
				class="placeholder-image"
			/>
			<div class="placeholder-overlay">
				<div class="play-button-large">▶</div>
				<p>Video not available</p>
			</div>
		</div>
	{:else}
		<!-- No video or thumbnail available -->
		<div class="video-unavailable">
			<div class="unavailable-icon">🎬</div>
			<h4>Video Unavailable</h4>
			<p>No video source found for this replay</p>
		</div>
	{/if}
</div>

<style>
	.video-player {
		width: 100%;
		position: relative;
	}
	
	.video-container {
		position: relative;
		background: black;
		border-radius: var(--radius-lg);
		overflow: hidden;
		aspect-ratio: 9/16; /* Vertical aspect ratio for mobile videos */
		width: 100%;
		max-height: 60vh; /* Limit height on larger screens */
	}
	
	.video-element {
		width: 100%;
		height: 100%;
		display: block;
	}
	
	.video-element.hidden {
		display: none;
	}
	
	.video-loading {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		z-index: 2;
	}
	
	.video-loading p {
		margin-top: var(--space-4);
		font-size: var(--font-size-sm);
		opacity: 0.8;
	}
	
	.video-error {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		text-align: center;
		padding: var(--space-6);
		z-index: 2;
	}
	
	.error-icon {
		font-size: var(--font-size-2xl);
		margin-bottom: var(--space-4);
		opacity: 0.8;
	}
	
	.video-error p {
		margin-bottom: var(--space-4);
		font-size: var(--font-size-sm);
		opacity: 0.9;
	}
	
	.video-placeholder {
		position: relative;
		background: black;
		border-radius: var(--radius-lg);
		overflow: hidden;
		aspect-ratio: 9/16; /* Vertical aspect ratio for mobile videos */
		width: 100%;
		max-height: 60vh; /* Limit height on larger screens */
	}
	
	.placeholder-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	
	.placeholder-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: white;
		text-align: center;
	}
	
	.play-button-large {
		font-size: var(--font-size-3xl);
		margin-bottom: var(--space-4);
		opacity: 0.9;
	}
	
	.placeholder-overlay p {
		font-size: var(--font-size-sm);
		opacity: 0.8;
	}
	
	.video-unavailable {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		border-radius: var(--radius-lg);
		aspect-ratio: 9/16; /* Vertical aspect ratio for mobile videos */
		width: 100%;
		max-height: 60vh; /* Limit height on larger screens */
		text-align: center;
		padding: var(--space-6);
	}
	
	.unavailable-icon {
		font-size: var(--font-size-3xl);
		margin-bottom: var(--space-4);
		opacity: 0.6;
	}
	
	.video-unavailable h4 {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-2) 0;
	}
	
	.video-unavailable p {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
	}
	
	/* Custom controls styling */
	.video-controls {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-surface);
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
		border: 1px solid var(--color-border);
		border-top: none;
	}
	
	.control-btn {
		background: none;
		border: none;
		color: var(--color-text);
		font-size: var(--font-size-lg);
		cursor: pointer;
		padding: var(--space-2);
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}
	
	.control-btn:hover {
		background: var(--color-surface-hover);
	}
	
	.time-display {
		font-size: var(--font-size-xs);
		font-family: var(--font-mono);
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	
	.progress-container {
		flex: 1;
		min-width: 100px;
	}
	
	.progress-bar,
	.volume-bar {
		width: 100%;
		height: 4px;
		background: var(--color-surface-hover);
		border-radius: var(--radius-full);
		outline: none;
		cursor: pointer;
	}
	
	.progress-bar::-webkit-slider-thumb,
	.volume-bar::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		background: var(--color-primary);
		border-radius: 50%;
		cursor: pointer;
	}
	
	.volume-container {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 80px;
	}
	
	.volume-bar {
		width: 60px;
	}
	
	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.video-controls {
			flex-wrap: wrap;
			gap: var(--space-2);
		}
		
		.progress-container {
			order: -1;
			flex-basis: 100%;
		}
		
		.volume-container {
			min-width: auto;
		}
	}
</style>