<script lang="ts">
	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import { 
		liveStreamState, 
		liveStreamActions, 
		getStreamStatus, 
		getStreamMetrics, 
		canStartLiveSelling, 
		canStopLiveSelling,
		getLiveSellingFormValidation,
		isServicesInitialized,
		hasActiveErrors
	} from '$lib/state/live-stream.svelte.js';
	
	// Components
	import ToastNotifications from '$lib/components/ToastNotifications.svelte';
	import TokenModal from '$lib/components/TokenModal.svelte';
	import StreamDisplay from '$lib/components/StreamDisplay.svelte';
	import LiveChat from '$lib/components/LiveChat.svelte';
	import TestCamera from '$lib/components/TestCamera.svelte';
	import ProductsListSimple from '$lib/components/ProductsListSimple.svelte';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	
	// New refactored components
	import StreamConfiguration from '$lib/components/live-stream/StreamConfiguration.svelte';
	import StreamStatusDisplay from '$lib/components/live-stream/StreamStatusDisplay.svelte';
	import StreamMetrics from '$lib/components/live-stream/StreamMetrics.svelte';
	
	// Shared Live Selling components
	import LiveSellingHeader from '$lib/components/live-selling/LiveSellingHeader.svelte';

	let { data }: { data: PageData } = $props();
	
	// Reactive state from global store
	let initialized = $derived(liveStreamState.initialized);
	let loading = $derived(liveStreamState.loading.initializing);
	let services = $derived(liveStreamState.services);
	let connectionState = $derived(liveStreamState.connection);
	let settings = $derived(liveStreamState.settings);
	let uiState = $derived(liveStreamState.ui);
	let errors = $derived(liveStreamState.errors);
	let streamData = $derived(liveStreamState.stream);
	
	// Computed values
	let streamStatus = $derived(getStreamStatus());
	let streamMetrics = $derived(getStreamMetrics());
	let canStart = $derived(canStartLiveSelling());
	let canStop = $derived(canStopLiveSelling());
	let formValidation = $derived(getLiveSellingFormValidation());
	let servicesReady = $derived(isServicesInitialized());
	let hasErrors = $derived(hasActiveErrors());
	
	// Video event handlers cleanup function
	let cleanupVideoHandlers: (() => void) | null = null;
	
	// Initialize everything on mount
	$effect(() => {
		if (browser && !initialized) {
			initializeApp();
		}
	});
	
	// Setup video event handlers when browser is ready
	$effect(() => {
		if (browser && !cleanupVideoHandlers) {
			cleanupVideoHandlers = liveStreamActions.setupVideoEventHandlers();
		}
	});
	
	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (cleanupVideoHandlers) {
				cleanupVideoHandlers();
			}
			liveStreamActions.cleanup();
		};
	});
	
	async function initializeApp() {
		try {
			const servicesInitialized = await liveStreamActions.initializeServices();
			if (servicesInitialized) {
				await liveStreamActions.initializeAgora();
			}
		} catch (error) {
			console.error("Failed to initialize app:", error);
		}
	}
	
	// Event handlers
	async function handleStartLiveSelling() {
		return await liveStreamActions.startLiveSelling();
	}
	
	async function handleStopLiveSelling() {
		return await liveStreamActions.stopLiveSelling();
	}
	
	function handleUpdateLiveSellingForm(updates: any) {
		liveStreamActions.updateLiveSellingForm(updates);
	}
	
	async function handleUpdateAgoraSettings(token: string, channel: string) {
		// Update form first
		liveStreamActions.updateLiveSellingForm({
			agora_token: token,
			agora_channel: channel
		});
		// Then update settings
		return await liveStreamActions.updateAgoraSettings();
	}
	
	function handleShowTokenPrompt() {
		liveStreamActions.showTokenPrompt();
	}
	
	async function handleTokenSubmit(token: string) {
		const success = await liveStreamActions.handleTokenSubmit(token);
		if (success) {
			liveStreamActions.hideTokenPrompt();
		}
		return success;
	}
	
	async function handleGenerateToken() {
		try {
			const success = await liveStreamActions.generateToken();
			if (success) {
				liveStreamActions.hideTokenPrompt();
			}
			return success;
		} catch (error) {
			console.error('Token generation failed:', error);
			return false;
		}
	}
	
	function handleTokenCancel() {
		liveStreamActions.hideTokenPrompt();
	}
	
	function handleProductsChange(products: any[]) {
		liveStreamActions.updateSelectedProducts(products);
	}
	
	function handleRetry() {
		liveStreamActions.retry();
	}
	
	function handleClearError() {
		liveStreamActions.clearErrors();
	}
</script>

<svelte:head>
	<title>Live Selling - BetterCallSold</title>
</svelte:head>

<div class="page">
	<LiveSellingHeader>
		{#snippet rightContent()}
			{#if servicesReady}
				<StreamStatusDisplay status={streamStatus} metrics={streamMetrics} isCompact={true} />
			{/if}
		{/snippet}
	</LiveSellingHeader>

	<div class="page-content">
		<!-- Global Error State -->
		{#if hasErrors}
			<ErrorState 
				message="Live Stream Error"
				errorText={errors.initialization || errors.connection || errors.general}
				onRetry={handleRetry}
				onBack={handleClearError}
				backLabel="Clear Error"
				showBackButton={true}
			/>
		{:else if loading}
			<!-- Global Loading State -->
			<LoadingState 
				message="Initializing live stream services..."
				subMessage="Please wait while we set up your streaming environment"
			/>
		{:else if !servicesReady}
			<!-- Services not ready -->
			<ErrorState 
				message="Services Not Ready"
				errorText="Live streaming services failed to initialize properly"
				onRetry={initializeApp}
				showBackButton={false}
			/>
		{:else}
			<!-- Individual error messages -->
			{#if errors.liveSelling}
				<div class="alert-banner alert-banner-error">
					<div class="alert-banner-content">
						<span class="alert-banner-icon">⚠</span>
						<span>Live Selling Error: {errors.liveSelling}</span>
					</div>
					<button class="alert-banner-close" onclick={() => liveStreamActions.clearError('liveSelling')}>×</button>
				</div>
			{/if}

			{#if errors.settings}
				<div class="alert-banner alert-banner-error">
					<div class="alert-banner-content">
						<span class="alert-banner-icon">⚠</span>
						<span>Settings Error: {errors.settings}</span>
					</div>
					<button class="alert-banner-close" onclick={() => liveStreamActions.clearError('settings')}>×</button>
				</div>
			{/if}

			<!-- Main Layout -->
			<div class="content-layout">
				<!-- Main Content -->
				<div class="content-main">
					<!-- Live Chat -->
					<LiveChat />

					<!-- Products List -->
					<ProductsListSimple />
				</div>

				<!-- Sidebar -->
				<div class="content-sidebar">
					<!-- Stream Display -->
					<StreamDisplay
						channel={settings.agoraSettings.channel}
						isStreamActive={connectionState.isStreamActive}
						joined={connectionState.joined}
						isLiveSelling={connectionState.isLiveSelling}
						bind:liveSellingForm={settings.liveSellingForm}
						onStartLiveSelling={handleStartLiveSelling}
						onStopLiveSelling={handleStopLiveSelling}
					/>

					<!-- Stream Metrics -->
					<StreamMetrics
						metrics={streamMetrics}
						showDetailed={false}
					/>

					<!-- Test Camera -->
					<TestCamera agoraService={services.agoraService} joined={connectionState.joined} />
				</div>
			</div>

			<!-- Stream Configuration -->
			<StreamConfiguration
				settings={settings.agoraSettings}
				formData={settings.liveSellingForm}
				isLoading={liveStreamState.loading.updatingSettings}
				onUpdateSettings={handleUpdateAgoraSettings}
				onShowTokenPrompt={handleShowTokenPrompt}
			/>
		{/if}
	</div>
</div>

<!-- Token Modal -->
<TokenModal 
	bind:show={uiState.showTokenPrompt}
	isTokenExpired={uiState.isTokenExpired}
	onSubmit={handleTokenSubmit}
	onGenerateToken={handleGenerateToken}
	onCancel={handleTokenCancel}
/>

<!-- Toast Notifications -->
<ToastNotifications />

<style>
	/* Content layout */
	.content-layout {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-6);
		margin-bottom: var(--space-6);
	}

	.content-main {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.content-sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	/* Page header styling */
	.page-header-aside {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	/* Alert banner close button */
	.alert-banner-close {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: var(--space-2);
		margin: calc(var(--space-2) * -1);
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}

	.alert-banner-close:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	/* Responsive adjustments */
	@media (max-width: 1200px) {
		.content-layout {
			grid-template-columns: 1fr;
		}
		
		.content-sidebar {
			order: -1;
		}
	}

	@media (max-width: 768px) {
		.page-header-content {
			flex-direction: column;
			gap: var(--space-3);
			align-items: flex-start;
		}
		
		.page-header-aside {
			width: 100%;
		}

		.content-main,
		.content-sidebar {
			gap: var(--space-4);
		}

		.content-layout {
			gap: var(--space-4);
		}
	}
</style>