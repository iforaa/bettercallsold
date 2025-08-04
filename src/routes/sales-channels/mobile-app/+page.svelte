<script lang="ts">
	import { onMount } from 'svelte';

	// Configuration state
	let config = {
		colors: {
			primary: '#FF69B4',
			secondary: '#FF1493',
			accent: '#FFB6C1',
			background: '#FFFFFF',
			text: '#000000'
		},
		messages: {
			promoLine1: 'Live every night 8pm CST!',
			promoLine2: 'Free Shipping 24/7!'
		},
		tabs: [
			{key: 'index', title: 'Discount Divas', icon: 'home-outline', enabled: true},
			{key: 'shop', title: 'Shop', icon: 'bag-outline', enabled: true},
			{key: 'popclips', title: 'POPCLIPS', icon: 'play-outline', enabled: true},
			{key: 'waitlist', title: 'Waitlist', icon: 'heart-outline', enabled: true},
			{key: 'favorites', title: 'Favorites', icon: 'star-outline', enabled: true},
			{key: 'account', title: 'Account', icon: 'person-outline', enabled: true}
		],
		appName: 'Discount Divas'
	};

	let loading = false;
	let saving = false;
	let message = '';
	let messageType = '';
	let previewOpen = false;

	// Available color presets
	const colorPresets = [
		{
			name: 'Pink (Default)',
			colors: {
				primary: '#FF69B4',
				secondary: '#FF1493',
				accent: '#FFB6C1',
				background: '#FFFFFF',
				text: '#000000'
			}
		},
		{
			name: 'Blue Ocean',
			colors: {
				primary: '#0066CC',
				secondary: '#004499',
				accent: '#66B3FF',
				background: '#FFFFFF',
				text: '#000000'
			}
		},
		{
			name: 'Purple Luxury',
			colors: {
				primary: '#8A2BE2',
				secondary: '#6A1B9A',
				accent: '#BA68C8',
				background: '#FFFFFF',
				text: '#000000'
			}
		},
		{
			name: 'Green Fresh',
			colors: {
				primary: '#4CAF50',
				secondary: '#388E3C',
				accent: '#81C784',
				background: '#FFFFFF',
				text: '#000000'
			}
		},
		{
			name: 'Orange Energy',
			colors: {
				primary: '#FF9800',
				secondary: '#F57C00',
				accent: '#FFB74D',
				background: '#FFFFFF',
				text: '#000000'
			}
		},
		{
			name: 'Dark Mode',
			colors: {
				primary: '#FF69B4',
				secondary: '#FF1493',
				accent: '#FFB6C1',
				background: '#121212',
				text: '#FFFFFF'
			}
		}
	];

	// Icon options for tabs
	const availableIcons = [
		'home-outline', 'bag-outline', 'play-outline', 'heart-outline', 
		'star-outline', 'person-outline', 'storefront-outline', 
		'gift-outline', 'flash-outline', 'trending-up-outline',
		'diamond-outline', 'ribbon-outline', 'sparkles-outline'
	];

	async function loadConfig() {
		try {
			loading = true;
			const response = await fetch('/api/admin/app-config');
			const data = await response.json();
			
			if (data.success) {
				config = data.config;
			}
		} catch (error) {
			console.error('Failed to load config:', error);
			showMessage('Failed to load configuration', 'error');
		} finally {
			loading = false;
		}
	}

	async function saveConfig() {
		try {
			saving = true;
			const response = await fetch('/api/admin/app-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(config)
			});

			const data = await response.json();
			
			if (data.success) {
				showMessage('Configuration saved successfully!', 'success');
			} else {
				showMessage(data.message || 'Failed to save configuration', 'error');
			}
		} catch (error) {
			console.error('Failed to save config:', error);
			showMessage('Failed to save configuration', 'error');
		} finally {
			saving = false;
		}
	}

	function applyColorPreset(preset: any) {
		config.colors = { ...preset.colors };
		config = { ...config }; // Trigger reactivity
	}

	function toggleTab(index: number) {
		config.tabs[index].enabled = !config.tabs[index].enabled;
		config = { ...config }; // Trigger reactivity
	}

	function showMessage(text: string, type: string) {
		message = text;
		messageType = type;
		setTimeout(() => {
			message = '';
			messageType = '';
		}, 5000);
	}

	function togglePreview() {
		previewOpen = !previewOpen;
	}

	onMount(() => {
		loadConfig();
	});
</script>

<svelte:head>
	<title>Mobile App Configuration - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1>Mobile App Configuration</h1>
		<div class="breadcrumb">
			<span class="breadcrumb-icon">📱</span>
			<span>Sales Channels</span>
			<span class="breadcrumb-separator">›</span>
			<span>Mobile App</span>
		</div>
	</div>

	<div class="page-content">
		{#if message}
			<div class="message {messageType}">
				{message}
			</div>
		{/if}

		{#if loading}
			<div class="loading">
				<div class="spinner"></div>
				<span>Loading configuration...</span>
			</div>
		{:else}
			<div class="config-grid">
				<!-- App Info Section -->
				<div class="config-section">
					<h2>🏪 App Information</h2>
					<div class="form-group">
						<label for="appName">App Name</label>
						<input
							id="appName"
							type="text"
							bind:value={config.appName}
							class="setting-input"
							placeholder="Enter app name"
						/>
					</div>
				</div>

				<!-- Color Configuration -->
				<div class="config-section">
					<h2>🎨 Color Theme</h2>
					
					<div class="color-presets">
						<h3>Quick Presets</h3>
						<div class="preset-grid">
							{#each colorPresets as preset}
								<button
									class="preset-button"
									on:click={() => applyColorPreset(preset)}
									style="background: linear-gradient(135deg, {preset.colors.primary}, {preset.colors.secondary})"
								>
									<span class="preset-name">{preset.name}</span>
								</button>
							{/each}
						</div>
					</div>

					<div class="color-inputs">
						<h3>Custom Colors</h3>
						<div class="color-grid">
							<div class="color-input-group">
								<label for="primaryColor">Primary Color</label>
								<div class="color-input-wrapper">
									<input
										id="primaryColor"
										type="color"
										bind:value={config.colors.primary}
										class="color-picker"
									/>
									<input
										type="text"
										bind:value={config.colors.primary}
										class="color-text"
										placeholder="#FF69B4"
									/>
								</div>
							</div>

							<div class="color-input-group">
								<label for="secondaryColor">Secondary Color</label>
								<div class="color-input-wrapper">
									<input
										id="secondaryColor"
										type="color"
										bind:value={config.colors.secondary}
										class="color-picker"
									/>
									<input
										type="text"
										bind:value={config.colors.secondary}
										class="color-text"
										placeholder="#FF1493"
									/>
								</div>
							</div>

							<div class="color-input-group">
								<label for="accentColor">Accent Color</label>
								<div class="color-input-wrapper">
									<input
										id="accentColor"
										type="color"
										bind:value={config.colors.accent}
										class="color-picker"
									/>
									<input
										type="text"
										bind:value={config.colors.accent}
										class="color-text"
										placeholder="#FFB6C1"
									/>
								</div>
							</div>

							<div class="color-input-group">
								<label for="backgroundColor">Background Color</label>
								<div class="color-input-wrapper">
									<input
										id="backgroundColor"
										type="color"
										bind:value={config.colors.background}
										class="color-picker"
									/>
									<input
										type="text"
										bind:value={config.colors.background}
										class="color-text"
										placeholder="#FFFFFF"
									/>
								</div>
							</div>

							<div class="color-input-group">
								<label for="textColor">Text Color</label>
								<div class="color-input-wrapper">
									<input
										id="textColor"
										type="color"
										bind:value={config.colors.text}
										class="color-picker"
									/>
									<input
										type="text"
										bind:value={config.colors.text}
										class="color-text"
										placeholder="#000000"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Message Configuration -->
				<div class="config-section">
					<h2>💬 Promo Messages</h2>
					<div class="form-group">
						<label for="promoLine1">Promo Message Line 1</label>
						<input
							id="promoLine1"
							type="text"
							bind:value={config.messages.promoLine1}
							class="setting-input"
							placeholder="Live every night 8pm CST!"
						/>
					</div>
					<div class="form-group">
						<label for="promoLine2">Promo Message Line 2</label>
						<input
							id="promoLine2"
							type="text"
							bind:value={config.messages.promoLine2}
							class="setting-input"
							placeholder="Free Shipping 24/7!"
						/>
					</div>

					<!-- Message Preview -->
					<div class="message-preview" style="background-color: {config.colors.primary}">
						<div class="preview-line1" style="color: {config.colors.background}">{config.messages.promoLine1}</div>
						<div class="preview-line2" style="color: {config.colors.background}">{config.messages.promoLine2}</div>
					</div>
				</div>

				<!-- Tab Configuration -->
				<div class="config-section">
					<h2>📱 Navigation Tabs</h2>
					<div class="tabs-config">
						{#each config.tabs as tab, index}
							<div class="tab-config-item" class:disabled={!tab.enabled}>
								<div class="tab-header">
									<div class="tab-info">
										<span class="tab-icon">📌</span>
										<span class="tab-title">{tab.title}</span>
									</div>
									<label class="toggle-switch">
										<input
											type="checkbox"
											checked={tab.enabled}
											on:change={() => toggleTab(index)}
										/>
										<span class="toggle-slider"></span>
									</label>
								</div>
								
								{#if tab.enabled}
									<div class="tab-details">
										<div class="form-group">
											<label>Tab Title</label>
											<input
												type="text"
												bind:value={tab.title}
												class="setting-input small"
											/>
										</div>
										<div class="form-group">
											<label>Icon</label>
											<select bind:value={tab.icon} class="setting-select small">
												{#each availableIcons as icon}
													<option value={icon}>{icon}</option>
												{/each}
											</select>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="actions">
				<button
					class="btn-secondary"
					on:click={togglePreview}
				>
					👀 Preview
				</button>
				<button
					class="btn-primary"
					on:click={saveConfig}
					disabled={saving}
				>
					{saving ? 'Saving...' : '💾 Save Configuration'}
				</button>
			</div>

			<!-- Preview Modal -->
			{#if previewOpen}
				<div class="preview-modal" on:click={togglePreview}>
					<div class="preview-content" on:click|stopPropagation>
						<div class="preview-header">
							<h3>Mobile App Preview</h3>
							<button class="close-btn" on:click={togglePreview}>✕</button>
						</div>
						
						<div class="phone-preview">
							<div class="phone-screen" style="background-color: {config.colors.background}">
								<!-- Promo Banner -->
								<div class="preview-banner" style="background-color: {config.colors.primary}">
									<div style="color: {config.colors.background}; font-weight: 600; font-size: 14px;">
										{config.messages.promoLine1}
									</div>
									<div style="color: {config.colors.background}; font-weight: 600; font-size: 14px;">
										{config.messages.promoLine2}
									</div>
								</div>
								
								<!-- Tab Bar -->
								<div class="preview-tabs">
									{#each config.tabs.filter(t => t.enabled) as tab}
										<div class="preview-tab" style="color: {config.colors.text}">
											<div class="preview-tab-icon">📌</div>
											<div class="preview-tab-text">{tab.title}</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.page {
		padding: 0;
		min-height: 100vh;
		background-color: #f8fafc;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e5e7eb;
		padding: 1.5rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.page-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		color: #6b7280;
		font-size: 0.9rem;
	}

	.breadcrumb-icon {
		margin-right: 0.5rem;
	}

	.breadcrumb-separator {
		margin: 0 0.5rem;
		color: #d1d5db;
	}

	.page-content {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.message {
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		font-weight: 500;
	}

	.message.success {
		background-color: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.message.error {
		background-color: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		color: #6b7280;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid #e5e7eb;
		border-top: 2px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.config-grid {
		display: grid;
		gap: 2rem;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
	}

	.config-section {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e3e3e3;
	}

	.config-section h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.2rem;
		font-weight: 600;
		color: #374151;
	}

	.config-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 500;
		color: #6b7280;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #374151;
		font-size: 0.9rem;
	}

	.setting-input, .setting-select {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.9rem;
		transition: border-color 0.2s;
	}

	.setting-input.small, .setting-select.small {
		padding: 0.5rem;
		font-size: 0.8rem;
	}

	.setting-input:focus, .setting-select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.preset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.preset-button {
		padding: 1rem 0.5rem;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: transform 0.2s;
		color: white;
		font-weight: 600;
		font-size: 0.8rem;
		text-align: center;
	}

	.preset-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.preset-name {
		display: block;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.color-input-group label {
		font-size: 0.8rem;
		margin-bottom: 0.25rem;
	}

	.color-input-wrapper {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.color-picker {
		width: 50px;
		height: 40px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		cursor: pointer;
	}

	.color-text {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-family: monospace;
		font-size: 0.8rem;
	}

	.message-preview {
		margin-top: 1rem;
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
	}

	.preview-line1, .preview-line2 {
		font-weight: 600;
		margin: 0.25rem 0;
	}

	.tabs-config {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.tab-config-item {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		transition: opacity 0.2s;
	}

	.tab-config-item.disabled {
		opacity: 0.5;
	}

	.tab-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.tab-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.tab-title {
		font-weight: 500;
		color: #374151;
	}

	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 50px;
		height: 24px;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #ccc;
		transition: .4s;
		border-radius: 24px;
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: .4s;
		border-radius: 50%;
	}

	input:checked + .toggle-slider {
		background-color: #3b82f6;
	}

	input:checked + .toggle-slider:before {
		transform: translateX(26px);
	}

	.tab-details {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #f3f4f6;
	}

	.actions {
		margin-top: 2rem;
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.btn-primary, .btn-secondary {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background-color: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-secondary:hover {
		background-color: #e5e7eb;
	}

	.preview-modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.preview-content {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		max-width: 500px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
	}

	.phone-preview {
		display: flex;
		justify-content: center;
	}

	.phone-screen {
		width: 250px;
		height: 400px;
		border: 3px solid #374151;
		border-radius: 20px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.preview-banner {
		padding: 1rem;
		text-align: center;
	}

	.preview-tabs {
		margin-top: auto;
		display: flex;
		justify-content: space-around;
		padding: 0.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.preview-tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-size: 0.7rem;
	}

	.preview-tab-icon {
		font-size: 1rem;
		margin-bottom: 0.25rem;
	}

	.preview-tab-text {
		font-size: 0.6rem;
	}
</style>