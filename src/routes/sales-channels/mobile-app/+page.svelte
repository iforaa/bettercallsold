<script lang="ts">
	import type { PageData } from './$types';
	import { 
		mobileAppState, 
		mobileAppActions, 
		getConfigSummary, 
		getEnabledTabs,
		hasUnsavedChanges,
		getValidationStatus
	} from '$lib/state/mobile-app.svelte.js';
	import { ToastService } from '$lib/services/ToastService.js';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import ColorPresetSelector from '$lib/components/mobile-app/ColorPresetSelector.svelte';
	import ColorConfigPanel from '$lib/components/mobile-app/ColorConfigPanel.svelte';
	import TabConfiguration from '$lib/components/mobile-app/TabConfiguration.svelte';
	import MobileAppPreview from '$lib/components/mobile-app/MobileAppPreview.svelte';

	let { data }: { data: PageData } = $props();
	
	// Reactive state from global store
	let config = $derived(mobileAppState.config);
	let loading = $derived(mobileAppState.loading.config);
	let saving = $derived(mobileAppState.loading.saving);
	let error = $derived(mobileAppState.errors.config);
	let saveError = $derived(mobileAppState.errors.saving);
	let validationErrors = $derived(mobileAppState.errors.validation);
	let isDirty = $derived(hasUnsavedChanges());
	
	// Computed values
	let summary = $derived(getConfigSummary());
	let enabledTabs = $derived(getEnabledTabs());
	let validation = $derived(getValidationStatus());
	let colorPresets = $derived(mobileAppState.options.colorPresets);
	let availableIcons = $derived(mobileAppState.options.availableIcons);
	let lastSave = $derived(mobileAppState.lastSave);
	
	// Load configuration on mount
	$effect(() => {
		if (!mobileAppState.lastFetch) {
			mobileAppActions.loadConfig();
		}
	});
	
	// Handle form changes
	function handleAppNameChange(event: Event) {
		const input = event.target as HTMLInputElement;
		mobileAppActions.updateAppName(input.value);
	}
	
	function handlePromoMessageChange(field: string, event: Event) {
		const input = event.target as HTMLInputElement;
		mobileAppActions.updateMessages({ [field]: input.value });
	}
	
	// Handle color preset selection
	function handleColorPresetSelect(preset: any) {
		mobileAppActions.applyColorPreset(preset);
	}
	
	// Handle custom color updates
	function handleColorUpdate(colorUpdates: any) {
		mobileAppActions.updateColors(colorUpdates);
	}
	
	// Handle message updates from color panel
	function handleMessageUpdate(messageUpdates: any) {
		mobileAppActions.updateMessages(messageUpdates);
	}
	
	// Handle tab operations
	function handleTabToggle(tabIndex: number) {
		mobileAppActions.toggleTab(tabIndex);
	}
	
	function handleTabUpdate(tabIndex: number, updates: any) {
		mobileAppActions.updateTab(tabIndex, updates);
	}
	
	// Handle save
	async function handleSave() {
		const success = await mobileAppActions.saveConfig();
		if (success) {
			// Additional success handling if needed
		}
	}
	
	
	// Handle retry
	function handleRetry() {
		mobileAppActions.retry();
	}
	
	// Handle reset to defaults
	function handleResetToDefaults() {
		if (confirm('Are you sure you want to reset all settings to defaults? This will lose all current customizations.')) {
			mobileAppActions.resetToDefaults();
		}
	}
	
	// Warn about unsaved changes
	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (isDirty) {
			event.preventDefault();
			return 'You have unsaved changes. Are you sure you want to leave?';
		}
	}
</script>

<svelte:head>
	<title>Mobile App Configuration - BetterCallSold</title>
</svelte:head>

<svelte:window on:beforeunload={handleBeforeUnload} />

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item current">📱 Mobile App Configuration</span>
				</div>
			</div>
			<div class="page-header-aside">
				<div class="save-actions">
					{#if isDirty}
						<div class="unsaved-indicator-header">
							<span class="unsaved-dot"></span>
							<span class="unsaved-text">Unsaved changes</span>
						</div>
					{/if}
					{#if lastSave}
						<div class="last-save-header">
							Last saved: {lastSave.toLocaleTimeString()}
						</div>
					{/if}
					<button
						class="btn btn-primary"
						onclick={handleSave}
						disabled={saving || !validation.isValid}
					>
						{#if saving}
							<span class="loading-spinner loading-spinner-sm"></span>
							Saving...
						{:else}
							💾 Save Configuration
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>

	<div class="page-content">
		<!-- Global Error State -->
		{#if error}
			<ErrorState 
				message="Error Loading Configuration"
				errorText={error}
				onRetry={handleRetry}
				showBackButton={false}
			/>
		{:else if loading}
			<!-- Global Loading State -->
			<LoadingState 
				message="Loading mobile app configuration..."
				subMessage="Please wait while we fetch your app settings"
			/>
		{:else}
			<div class="page-content-padded">
				<!-- Validation Errors -->
				{#if validationErrors.length > 0}
					<div class="alert-banner alert-banner-error">
						<div class="alert-banner-content">
							<span class="alert-banner-icon">⚠</span>
							<div>
								<strong>Configuration Issues:</strong>
								<ul class="error-list">
									{#each validationErrors as error}
										<li>{error}</li>
									{/each}
								</ul>
							</div>
						</div>
					</div>
				{/if}

				<!-- Save Error -->
				{#if saveError}
					<div class="alert-banner alert-banner-error">
						<div class="alert-banner-content">
							<span class="alert-banner-icon">⚠</span>
							<span>Failed to save: {saveError}</span>
						</div>
					</div>
				{/if}

				<div class="main-layout">
				<div class="content-grid">
				<!-- App Information Section -->
				<div class="content-section">
					<div class="content-header">
						<h3 class="content-title">🏪 App Information</h3>
						<p class="content-description">Configure your mobile app's basic information</p>
					</div>
					<div class="content-body">
						<div class="form-field">
							<label class="form-label" for="appName">App Name</label>
							<input
								id="appName"
								type="text"
								value={config.appName}
								oninput={handleAppNameChange}
								class="form-input"
								placeholder="Enter your app name"
								disabled={loading || saving}
							/>
							<div class="form-help">This name will appear in your mobile app</div>
						</div>

						<div class="testflight-info">
							<div class="testflight-header">
								<h4 class="testflight-title">📱 iOS Beta Testing</h4>
							</div>
							<div class="testflight-content">
								<p class="testflight-text">Test the latest iOS app features with TestFlight</p>
								<a 
									href="https://testflight.apple.com/join/xRDEgUjR" 
									target="_blank" 
									class="btn btn-primary btn-sm testflight-link"
								>
									✈️ Join TestFlight Beta
								</a>
							</div>
						</div>
					</div>
				</div>

				<!-- Color Theme Section -->
				<div class="content-section">
					<div class="content-header">
						<h3 class="content-title">🎨 Color Theme</h3>
						<p class="content-description">Choose colors that match your brand</p>
					</div>
					<div class="content-body">
						<ColorPresetSelector 
							presets={colorPresets}
							onSelectPreset={handleColorPresetSelect}
						/>
						
						<ColorConfigPanel 
							colors={config.colors}
							messages={config.messages}
							onUpdateColors={handleColorUpdate}
							onUpdateMessages={handleMessageUpdate}
						/>
					</div>
				</div>

				<!-- Promo Messages Section -->
				<div class="content-section">
					<div class="content-header">
						<h3 class="content-title">💬 Promo Messages</h3>
						<p class="content-description">Add promotional messages to appear in your app</p>
					</div>
					<div class="content-body">
						<div class="form-field">
							<label class="form-label" for="promoLine1">Promo Message Line 1</label>
							<input
								id="promoLine1"
								type="text"
								value={config.messages.promoLine1}
								oninput={(e) => handlePromoMessageChange('promoLine1', e)}
								class="form-input"
								placeholder="Live every night 8pm CST!"
								disabled={loading || saving}
							/>
						</div>
						<div class="form-field">
							<label class="form-label" for="promoLine2">Promo Message Line 2</label>
							<input
								id="promoLine2"
								type="text"
								value={config.messages.promoLine2}
								oninput={(e) => handlePromoMessageChange('promoLine2', e)}
								class="form-input"
								placeholder="Free Shipping 24/7!"
								disabled={loading || saving}
							/>
						</div>
					</div>
				</div>

				<!-- Navigation Tabs Section -->
				<div class="content-section">
					<div class="content-header">
						<h3 class="content-title">📱 Navigation Tabs</h3>
						<p class="content-description">Configure which tabs appear in your mobile app</p>
					</div>
					<div class="content-body">
						<TabConfiguration 
							tabs={config.tabs}
							availableIcons={availableIcons}
							onToggleTab={handleTabToggle}
							onUpdateTab={handleTabUpdate}
						/>
					</div>
				</div>

			</div>

				<!-- Web Preview Sidebar -->
				<div class="web-preview-sidebar">
					<div class="web-preview-header">
						<h3 class="web-preview-title">🌐 Web Preview</h3>
					</div>
					<div class="web-preview-content">
						<div class="preview-placeholder">
							<div class="placeholder-icon">📱</div>
							<p class="placeholder-text">Live preview will appear here in the future</p>
						</div>
					</div>
				</div>
				</div>

				<!-- Reset Button -->
				<div class="reset-section">
					<button class="btn btn-ghost btn-sm" onclick={handleResetToDefaults} disabled={saving}>
						🔄 Reset to Defaults
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Header save section */
	.save-actions {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.unsaved-indicator-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
	}

	.last-save-header {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	/* Main layout with sidebar */
	.main-layout {
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: var(--space-8);
		align-items: start;
	}

	/* Content grid layout */
	.content-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-6);
	}

	.content-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.content-header {
		padding: var(--space-6);
		border-bottom: 1px solid var(--color-border-light);
		background: var(--color-surface-secondary);
	}

	.content-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-1) 0;
	}

	.content-description {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
	}

	.content-body {
		padding: var(--space-6);
	}

	.content-footer {
		padding: var(--space-6) 0;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-secondary);
		margin-top: var(--space-6);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Alert styling */
	.error-list {
		margin: var(--space-2) 0 0 var(--space-4);
		padding: 0;
	}

	.error-list li {
		margin-bottom: var(--space-1);
	}

	/* Form help text */
	.form-help {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-top: var(--space-1);
	}

	/* TestFlight info styling */
	.testflight-info {
		margin-top: var(--space-6);
		padding: var(--space-4);
		background: var(--color-primary-50);
		border: 1px solid var(--color-primary-200);
		border-radius: var(--radius-md);
	}

	.testflight-header {
		margin-bottom: var(--space-3);
	}

	.testflight-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-primary);
		margin: 0;
	}

	.testflight-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.testflight-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin: 0;
		flex: 1;
	}

	.testflight-link {
		flex-shrink: 0;
		font-size: var(--font-size-xs);
		padding: var(--space-2) var(--space-3);
	}

	/* Loading spinner for save button */
	.loading-spinner-sm {
		width: 16px;
		height: 16px;
		margin-right: var(--space-2);
	}

	/* Web Preview Sidebar */
	.web-preview-sidebar {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		height: fit-content;
		position: sticky;
		top: var(--space-6);
		width: 280px;
	}

	.web-preview-header {
		background: var(--color-surface-secondary);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
	}

	.web-preview-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
	}

	.web-preview-content {
		padding: var(--space-4);
	}

	.preview-placeholder {
		/* iPhone-like aspect ratio: 19.5:9 (approximately 2.17:1) */
		aspect-ratio: 9 / 19.5;
		background: var(--color-surface-secondary);
		border-radius: var(--radius-xl);
		border: 3px solid var(--color-border);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-6) var(--space-4);
		position: relative;
		overflow: hidden;
	}

	.preview-placeholder::before {
		content: '';
		position: absolute;
		top: var(--space-2);
		left: 50%;
		transform: translateX(-50%);
		width: 60px;
		height: 4px;
		background: var(--color-border-dark);
		border-radius: var(--radius-full);
	}

	.placeholder-icon {
		font-size: 24px;
		margin-bottom: var(--space-2);
		opacity: 0.6;
	}

	.placeholder-text {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
		line-height: 1.4;
		text-align: center;
	}

	/* Reset section */
	.reset-section {
		margin-top: var(--space-6);
		text-align: center;
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border);
	}

	/* Responsive adjustments */
	@media (max-width: 1200px) {
		.main-layout {
			grid-template-columns: 1fr;
			gap: var(--space-6);
		}

		.web-preview-sidebar {
			order: -1;
			position: static;
			width: 100%;
			max-width: 400px;
			margin: 0 auto;
		}
	}

	@media (max-width: 768px) {
		.save-actions {
			flex-direction: column;
			align-items: flex-end;
			gap: var(--space-2);
		}

		.main-layout {
			gap: var(--space-4);
		}

		.web-preview-sidebar {
			max-width: 280px;
		}

		.web-preview-content {
			padding: var(--space-3);
		}
	}
</style>