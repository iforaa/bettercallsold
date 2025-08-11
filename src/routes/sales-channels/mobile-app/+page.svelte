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
	let previewOpen = $derived(mobileAppState.ui.previewOpen);
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
	
	// Handle preview
	function handleTogglePreview() {
		mobileAppActions.togglePreview();
	}
	
	function handleClosePreview() {
		mobileAppActions.closePreview();
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
				<div class="page-actions">
					{#if isDirty}
						<div class="unsaved-indicator">
							<span class="unsaved-dot"></span>
							<span class="unsaved-text">Unsaved changes</span>
						</div>
					{/if}
					{#if lastSave}
						<div class="last-save">
							Last saved: {lastSave.toLocaleTimeString()}
						</div>
					{/if}
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

			<!-- Action Buttons -->
			<div class="content-footer">
				<div class="page-actions">
					<button class="btn btn-ghost" onclick={handleResetToDefaults} disabled={saving}>
						🔄 Reset to Defaults
					</button>
					<button class="btn btn-secondary" onclick={handleTogglePreview} disabled={saving}>
						👀 Preview
					</button>
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
		{/if}
	</div>
</div>

<!-- Preview Modal -->
<MobileAppPreview 
	isOpen={previewOpen}
	config={config}
	enabledTabs={enabledTabs}
	onClose={handleClosePreview}
/>

<style>
	/* Content grid layout */
	.content-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-6);
		max-width: 800px;
		margin: 0 auto;
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

	/* Page header styling */
	.page-header-aside {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.unsaved-indicator {
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

	.unsaved-dot {
		width: 6px;
		height: 6px;
		background: var(--color-warning);
		border-radius: var(--radius-full);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.last-save {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
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

	/* Loading spinner for save button */
	.loading-spinner-sm {
		width: 16px;
		height: 16px;
		margin-right: var(--space-2);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.content-grid {
			max-width: 100%;
		}
		
		.page-header-aside {
			flex-direction: column;
			align-items: flex-end;
			gap: var(--space-2);
		}
		
		.page-actions {
			flex-direction: column;
			width: 100%;
			gap: var(--space-2);
		}
		
		.page-actions .btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>