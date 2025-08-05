<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// State management
	let settings = $state(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let toasts = $state([]);

	// Form fields
	let storeName = $state('');
	let storeDescription = $state('');
	let primaryColor = $state('#1a1a1a');
	let secondaryColor = $state('#6b7280');
	let accentColor = $state('#3b82f6');
	let headerLogoUrl = $state('');
	let heroImageUrl = $state('');
	let heroTitle = $state('');
	let heroSubtitle = $state('');
	let heroCta = $state('');
	let storeEnabled = $state(false);
	let headerNavigation = $state(['Home', 'Catalog', 'Contact']);

	// Toast notification system
	function showToast(message: string, type: 'success' | 'error' = 'success') {
		const id = Date.now();
		toasts = [...toasts, { id, message, type }];
		setTimeout(() => {
			toasts = toasts.filter(t => t.id !== id);
		}, 5000);
	}

	// Load store settings
	async function loadSettings() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';

			const response = await fetch('/api/webstore/settings');
			
			if (!response.ok) {
				throw new Error('Failed to load store settings');
			}

			const data = await response.json();
			settings = data;
			
			// Initialize form fields
			storeName = data.store_name || '';
			storeDescription = data.store_description || '';
			primaryColor = data.primary_color || '#1a1a1a';
			secondaryColor = data.secondary_color || '#6b7280';
			accentColor = data.accent_color || '#3b82f6';
			headerLogoUrl = data.header_logo_url || '';
			heroImageUrl = data.hero_image_url || '';
			heroTitle = data.hero_title || '';
			heroSubtitle = data.hero_subtitle || '';
			heroCta = data.hero_cta_text || '';
			storeEnabled = data.store_enabled || false;
			headerNavigation = data.header_navigation || ['Home', 'Catalog', 'Contact'];

		} catch (err) {
			console.error('Load settings error:', err);
			error = 'Failed to load store settings';
		} finally {
			loading = false;
		}
	}

	// Save store settings
	async function saveSettings() {
		saving = true;
		
		try {
			const settingsData = {
				store_name: storeName,
				store_description: storeDescription,
				primary_color: primaryColor,
				secondary_color: secondaryColor,
				accent_color: accentColor,
				header_logo_url: headerLogoUrl,
				header_navigation: headerNavigation,
				hero_image_url: heroImageUrl,
				hero_title: heroTitle,
				hero_subtitle: heroSubtitle,
				hero_cta_text: heroCta,
				store_enabled: storeEnabled
			};

			const response = await fetch('/api/webstore/settings', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(settingsData)
			});

			if (response.ok) {
				showToast('Store settings saved successfully!', 'success');
			} else {
				throw new Error('Failed to save settings');
			}
		} catch (error) {
			showToast('Error saving settings: ' + error.message, 'error');
		} finally {
			saving = false;
		}
	}

	// Navigate to store preview
	function previewStore() {
		window.open('/store', '_blank');
	}

	// Add navigation item
	function addNavItem() {
		headerNavigation = [...headerNavigation, 'New Item'];
	}

	// Remove navigation item
	function removeNavItem(index: number) {
		headerNavigation = headerNavigation.filter((_, i) => i !== index);
	}

	// Load settings when component mounts
	onMount(() => {
		loadSettings();
	});
</script>

<svelte:head>
	<title>Web Store - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">🌐</span>
				Web Store
			</h1>
			<div class="header-actions">
				<button 
					class="btn-secondary" 
					onclick={previewStore}
					disabled={!storeEnabled}
				>
					👁️ Preview Store
				</button>
				<button 
					class="btn-primary" 
					onclick={saveSettings}
					disabled={saving || loading}
				>
					{#if saving}
						<span class="loading-spinner"></span>
						Saving...
					{:else}
						💾 Save Settings
					{/if}
				</button>
			</div>
		</div>
	</div>

	<div class="page-content">
		{#if error}
			<div class="error-state">
				<p>{error}</p>
				<button class="btn-secondary" onclick={() => loadSettings()}>
					Retry
				</button>
			</div>
		{:else if loading}
			<div class="loading-state">
				<div class="loading-content">
					<div class="loading-spinner-large"></div>
					<h3>Loading store settings...</h3>
					<p>This may take a moment</p>
				</div>
			</div>
		{:else}
			<div class="settings-layout">
				<!-- Store Status Card -->
				<div class="settings-card">
					<div class="card-header">
						<h3 class="card-title">Store Status</h3>
					</div>
					<div class="card-content">
						<div class="form-field">
							<label class="form-label">
								<input 
									type="checkbox" 
									bind:checked={storeEnabled}
									class="form-checkbox"
								/>
								Enable Web Store
							</label>
							<p class="field-hint">
								{storeEnabled ? 'Your store is live and accessible to customers' : 'Your store is currently disabled'}
							</p>
						</div>
					</div>
				</div>

				<!-- Basic Information -->
				<div class="settings-card">
					<div class="card-header">
						<h3 class="card-title">Basic Information</h3>
					</div>
					<div class="card-content">
						<div class="form-field">
							<label class="form-label" for="store-name">Store Name</label>
							<input 
								id="store-name"
								type="text" 
								class="form-input"
								bind:value={storeName}
								placeholder="My Amazing Store"
							/>
						</div>
						<div class="form-field">
							<label class="form-label" for="store-description">Store Description</label>
							<textarea 
								id="store-description"
								class="form-textarea"
								bind:value={storeDescription}
								placeholder="A brief description of your store..."
								rows="3"
							></textarea>
						</div>
					</div>
				</div>

				<!-- Header Settings -->
				<div class="settings-card">
					<div class="card-header">
						<h3 class="card-title">Header Settings</h3>
					</div>
					<div class="card-content">
						<div class="form-field">
							<label class="form-label" for="header-logo">Header Logo URL</label>
							<input 
								id="header-logo"
								type="url" 
								class="form-input"
								bind:value={headerLogoUrl}
								placeholder="https://example.com/logo.png"
							/>
						</div>
						<div class="form-field">
							<label class="form-label">Navigation Items</label>
							<div class="nav-items">
								{#each headerNavigation as navItem, index}
									<div class="nav-item-row">
										<input 
											type="text" 
											class="form-input"
											bind:value={headerNavigation[index]}
											placeholder="Navigation item"
										/>
										<button 
											class="btn-icon" 
											onclick={() => removeNavItem(index)}
											disabled={headerNavigation.length <= 1}
										>
											🗑️
										</button>
									</div>
								{/each}
								<button class="btn-secondary add-nav-btn" onclick={addNavItem}>
									+ Add Navigation Item
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Hero Section -->
				<div class="settings-card">
					<div class="card-header">
						<h3 class="card-title">Homepage Hero Section</h3>
					</div>
					<div class="card-content">
						<div class="form-field">
							<label class="form-label" for="hero-image">Hero Background Image URL</label>
							<input 
								id="hero-image"
								type="url" 
								class="form-input"
								bind:value={heroImageUrl}
								placeholder="https://example.com/hero-bg.jpg"
							/>
						</div>
						<div class="form-field">
							<label class="form-label" for="hero-title">Hero Title</label>
							<input 
								id="hero-title"
								type="text" 
								class="form-input"
								bind:value={heroTitle}
								placeholder="Welcome to our store"
							/>
						</div>
						<div class="form-field">
							<label class="form-label" for="hero-subtitle">Hero Subtitle</label>
							<input 
								id="hero-subtitle"
								type="text" 
								class="form-input"
								bind:value={heroSubtitle}
								placeholder="Discover amazing products"
							/>
						</div>
						<div class="form-field">
							<label class="form-label" for="hero-cta">Call-to-Action Button Text</label>
							<input 
								id="hero-cta"
								type="text" 
								class="form-input"
								bind:value={heroCta}
								placeholder="Shop Now"
							/>
						</div>
					</div>
				</div>

				<!-- Theme Colors -->
				<div class="settings-card">
					<div class="card-header">
						<h3 class="card-title">Theme Colors</h3>
					</div>
					<div class="card-content">
						<div class="color-grid">
							<div class="form-field">
								<label class="form-label" for="primary-color">Primary Color</label>
								<div class="color-input-group">
									<input 
										id="primary-color"
										type="color" 
										class="color-input"
										bind:value={primaryColor}
									/>
									<input 
										type="text" 
										class="form-input color-text"
										bind:value={primaryColor}
									/>
								</div>
							</div>
							<div class="form-field">
								<label class="form-label" for="secondary-color">Secondary Color</label>
								<div class="color-input-group">
									<input 
										id="secondary-color"
										type="color" 
										class="color-input"
										bind:value={secondaryColor}
									/>
									<input 
										type="text" 
										class="form-input color-text"
										bind:value={secondaryColor}
									/>
								</div>
							</div>
							<div class="form-field">
								<label class="form-label" for="accent-color">Accent Color</label>
								<div class="color-input-group">
									<input 
										id="accent-color"
										type="color" 
										class="color-input"
										bind:value={accentColor}
									/>
									<input 
										type="text" 
										class="form-input color-text"
										bind:value={accentColor}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Toast Notifications -->
{#if toasts.length > 0}
	<div class="toast-container">
		{#each toasts as toast}
			<div class="toast toast-{toast.type}">
				{toast.message}
			</div>
		{/each}
	</div>
{/if}

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

	.btn-primary, .btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.15s ease;
		border: none;
	}

	.btn-primary {
		background: #202223;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1a1a1a;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f6f6f7;
	}

	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.page-content {
		padding: 2rem;
	}

	.error-state {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 1rem 2rem;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.loading-state {
		background: white;
		padding: 4rem 2rem;
		text-align: center;
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
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

	.loading-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-radius: 50%;
		border-top-color: currentColor;
		animation: spin 1s ease-in-out infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
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

	.settings-layout {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 800px;
	}

	.settings-card {
		background: white;
		border-radius: 8px;
		border: 1px solid #e1e1e1;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.card-header {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e1e1e1;
	}

	.card-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
	}

	.card-content {
		padding: 1.5rem;
	}

	.form-field {
		margin-bottom: 1.5rem;
	}

	.form-field:last-child {
		margin-bottom: 0;
	}

	.form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.form-input, .form-textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #1f2937;
		background: white;
		transition: border-color 0.15s ease;
	}

	.form-input:focus, .form-textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 1px #3b82f6;
	}

	.form-checkbox {
		width: auto;
		margin-right: 0.5rem;
	}

	.field-hint {
		font-size: 0.8125rem;
		color: #6b7280;
		margin-top: 0.25rem;
		margin-bottom: 0;
	}

	.nav-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.nav-item-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.nav-item-row .form-input {
		flex: 1;
	}

	.btn-icon {
		width: 2rem;
		height: 2rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		transition: all 0.15s ease;
	}

	.btn-icon:hover:not(:disabled) {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.btn-icon:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.add-nav-btn {
		align-self: flex-start;
		margin-top: 0.5rem;
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.color-input-group {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.color-input {
		width: 3rem;
		height: 2.25rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: white;
		cursor: pointer;
	}

	.color-text {
		flex: 1;
		font-family: monospace;
	}

	.toast-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.toast {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		animation: slideIn 0.3s ease;
	}

	.toast-success {
		background: #d1fae5;
		color: #047857;
		border: 1px solid #a7f3d0;
	}

	.toast-error {
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
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
		
		.page-content {
			padding: 1rem;
		}
		
		.color-grid {
			grid-template-columns: 1fr;
		}
	}
</style>