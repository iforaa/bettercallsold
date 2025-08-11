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
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item current">🌐 Web Store</span>
				</div>
			</div>
			<div class="page-actions">
				<button 
					class="btn btn-secondary" 
					onclick={previewStore}
					disabled={!storeEnabled}
				>
					👁️ Preview Store
				</button>
				<button 
					class="btn btn-primary" 
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
				<div class="error-state-content">
					<div class="error-state-icon">⚠</div>
					<h1 class="error-state-title">Error Loading Settings</h1>
					<p class="error-state-message">{error}</p>
					<div class="error-state-actions">
						<button class="btn btn-primary" onclick={() => loadSettings()}>
							Retry
						</button>
					</div>
				</div>
			</div>
		{:else if loading}
			<div class="loading-state">
				<div class="loading-spinner loading-spinner-lg"></div>
				<p class="loading-text">Loading store settings...</p>
			</div>
		{:else}
			<div class="content-flow">
				<!-- Store Status Card -->
				<div class="content-section">
					<div class="content-header">
						<h3 class="content-title">Store Status</h3>
					</div>
					<div class="content-body">
						<div class="form-field">
							<label class="form-label">
								<input 
									type="checkbox" 
									bind:checked={storeEnabled}
									class="form-checkbox"
								/>
								Enable Web Store
							</label>
							<p class="form-help">
								{storeEnabled ? 'Your store is live and accessible to customers' : 'Your store is currently disabled'}
							</p>
						</div>
					</div>
				</div>

				<!-- Basic Information -->
				<div class="content-section">
					<div class="content-header">
						<h3 class="content-title">Basic Information</h3>
					</div>
					<div class="content-body">
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
				<div class="content-section">
					<div class="content-header">
						<h3 class="content-title">Header Settings</h3>
					</div>
					<div class="content-body">
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
				<div class="content-section">
					<div class="content-header">
						<h3 class="content-title">Homepage Hero Section</h3>
					</div>
					<div class="content-body">
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
				<div class="content-section">
					<div class="content-header">
						<h3 class="content-title">Theme Colors</h3>
					</div>
					<div class="content-body">
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
				<div class="toast-content">
					{#if toast.type === 'success'}
						<span class="toast-icon">✓</span>
					{:else}
						<span class="toast-icon">⚠</span>
					{/if}
					<span class="toast-message">{toast.message}</span>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	/* Minimal custom styles - most styling now handled by design system */
	
	/* Custom navigation items styling */
	.nav-items {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	
	.nav-item-row {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}
	
	.nav-item-row .form-input {
		flex: 1;
	}
	
	.add-nav-btn {
		align-self: flex-start;
		margin-top: var(--space-2);
	}
	
	/* Custom color picker styling */
	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
	}
	
	.color-input-group {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}
	
	.color-input {
		width: 48px;
		height: 36px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		cursor: pointer;
		transition: border-color var(--transition-fast);
	}
	
	.color-input:hover {
		border-color: var(--color-border-hover);
	}
	
	.color-text {
		flex: 1;
		font-family: var(--font-mono);
	}
	
	/* Responsive adjustments not covered by design system */
	@media (max-width: 768px) {
		.color-grid {
			grid-template-columns: 1fr;
		}
	}
</style>