<script lang="ts">
	import type { MobileAppConfig, AppTab } from '$lib/types/mobile-app';
	
	let { 
		isOpen = false,
		config = {},
		enabledTabs = [],
		onClose 
	} = $props();
	
	function handleOverlayClick(event: Event) {
		if (event.target === event.currentTarget && onClose) {
			onClose();
		}
	}
	
	function handleClose() {
		if (onClose) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div class="modal-overlay" onclick={handleOverlayClick}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3 class="modal-title">📱 Mobile App Preview</h3>
				<button class="modal-close" onclick={handleClose} title="Close preview">
					<span class="close-icon">✕</span>
				</button>
			</div>

			<div class="modal-body">
				<div class="preview-container">
					<div class="phone-preview">
						<div
							class="phone-screen"
							style="background-color: {config.colors?.background || '#FFFFFF'}"
						>
							<!-- App Header -->
							<div class="preview-header">
								<div class="app-name" style="color: {config.colors?.text || '#000000'}">
									{config.appName || 'Mobile App'}
								</div>
							</div>
							
							<!-- Promo Banner -->
							<div
								class="preview-banner"
								style="background-color: {config.colors?.primary || '#FF69B4'}"
							>
								<div
									class="banner-line"
									style="color: {config.colors?.background || '#FFFFFF'};"
								>
									{config.messages?.promoLine1 || 'Promo Message Line 1'}
								</div>
								<div
									class="banner-line"
									style="color: {config.colors?.background || '#FFFFFF'};"
								>
									{config.messages?.promoLine2 || 'Promo Message Line 2'}
								</div>
							</div>

							<!-- Main Content Area -->
							<div class="preview-content">
								<div class="content-placeholder" style="border-color: {config.colors?.primary || '#FF69B4'}">
									<div style="color: {config.colors?.text || '#000000'}">
										📱 App Content Area
									</div>
									<div style="color: {config.colors?.text || '#000000'}; opacity: 0.7; font-size: 12px;">
										Your app content will appear here
									</div>
								</div>
							</div>

							<!-- Tab Bar -->
							<div class="preview-tabs" style="border-top-color: {config.colors?.accent || '#FFB6C1'}">
								{#each enabledTabs.slice(0, 5) as tab}
									<div
										class="preview-tab"
										style="color: {config.colors?.text || '#000000'}"
									>
										<div class="preview-tab-icon">
											📌
										</div>
										<div class="preview-tab-text">
											{tab.title}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
					
					<!-- Preview Info -->
					<div class="preview-info">
						<h4 class="info-title">Configuration Summary</h4>
						<div class="info-grid">
							<div class="info-item">
								<span class="info-label">App Name:</span>
								<span class="info-value">{config.appName || 'Not set'}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Active Tabs:</span>
								<span class="info-value">{enabledTabs.length}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Color Scheme:</span>
								<span class="info-value">
									{config.colors?.background === '#121212' ? 'Dark' : 'Light'}
								</span>
							</div>
							<div class="info-item">
								<span class="info-label">Primary Color:</span>
								<span class="info-value">
									<span 
										class="color-swatch" 
										style="background-color: {config.colors?.primary || '#FF69B4'}"
									></span>
									{config.colors?.primary || '#FF69B4'}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={handleClose}>
					Close Preview
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-4);
	}

	.modal-content {
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-xl);
		max-width: 800px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-6);
		border-bottom: 1px solid var(--color-border);
	}

	.modal-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
	}

	.modal-close {
		background: none;
		border: none;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: var(--color-text-muted);
		transition: all var(--transition-fast);
	}

	.modal-close:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.close-icon {
		font-size: 16px;
		line-height: 1;
	}

	.modal-body {
		padding: var(--space-6);
	}

	.preview-container {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-8);
		align-items: flex-start;
	}

	/* Phone preview styling */
	.phone-preview {
		display: flex;
		justify-content: center;
	}

	.phone-screen {
		width: 250px;
		height: 450px;
		border: 3px solid var(--color-text);
		border-radius: 20px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
	}

	.preview-header {
		padding: var(--space-3) var(--space-4);
		text-align: center;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.app-name {
		font-weight: var(--font-weight-semibold);
		font-size: var(--font-size-sm);
	}

	.preview-banner {
		padding: var(--space-4);
		text-align: center;
	}

	.banner-line {
		font-weight: var(--font-weight-semibold);
		font-size: var(--font-size-xs);
		margin: var(--space-1) 0;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.preview-content {
		flex: 1;
		padding: var(--space-4);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.content-placeholder {
		border: 2px dashed;
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		text-align: center;
		opacity: 0.7;
	}

	.preview-tabs {
		display: flex;
		justify-content: space-around;
		padding: var(--space-2);
		border-top: 1px solid;
		background: rgba(255, 255, 255, 0.95);
	}

	.preview-tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-size: var(--font-size-xs);
		min-width: 40px;
	}

	.preview-tab-icon {
		font-size: var(--font-size-base);
		margin-bottom: var(--space-1);
	}

	.preview-tab-text {
		font-size: 10px;
		text-align: center;
		line-height: 1.2;
	}

	/* Preview info */
	.preview-info {
		min-width: 300px;
	}

	.info-title {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--space-4);
	}

	.info-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3);
		background: var(--color-surface-secondary);
		border-radius: var(--radius-md);
	}

	.info-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
	}

	.info-value {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		font-weight: var(--font-weight-medium);
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.color-swatch {
		width: 16px;
		height: 16px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
	}

	.modal-actions {
		padding: var(--space-6);
		border-top: 1px solid var(--color-border);
		display: flex;
		justify-content: flex-end;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.modal-overlay {
			padding: var(--space-2);
		}
		
		.preview-container {
			grid-template-columns: 1fr;
			gap: var(--space-4);
		}
		
		.phone-screen {
			width: 200px;
			height: 350px;
		}
		
		.preview-info {
			min-width: auto;
		}
	}
</style>