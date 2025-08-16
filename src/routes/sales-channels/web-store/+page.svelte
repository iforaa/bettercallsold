<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	// State management - simplified with URL navigation
	let templates = $state([]);
	let templatePreview = $state('');
	let loading = $state(true);
	let rendering = $state(false);
	let error = $state('');
	let toasts = $state([]);

	// Template editor state
	let editorContent = $state('');

	// Template settings state
	let templateSettings = $state({});
	let expandedSections = $state({}); // Track which sections are expanded

	// Derived state from URL
	let selectedTemplateId = $derived($page.url.searchParams.get('template'));
	let isEditing = $derived($page.url.searchParams.has('edit'));
	let selectedTemplate = $derived(
		selectedTemplateId ? templates.find(t => t.id === selectedTemplateId) : null
	);

	// Toast notification system
	function showToast(message: string, type: 'success' | 'error' = 'success') {
		const id = Date.now();
		toasts = [...toasts, { id, message, type }];
		setTimeout(() => {
			toasts = toasts.filter(t => t.id !== id);
		}, 5000);
	}

	// Load templates
	async function loadTemplates() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';

			const response = await fetch('/api/templates');
			
			if (!response.ok) {
				throw new Error('Failed to load templates');
			}

			const data = await response.json();
			templates = data.reverse(); // Show newest templates first

		} catch (err) {
			console.error('Load templates error:', err);
			error = 'Failed to load templates';
		} finally {
			loading = false;
		}
	}

	// Load template settings
	function loadTemplateSettings(template) {
		if (!template) return;
		
		// Initialize template settings from default_settings or empty object
		const defaults = template.default_settings || {};
		templateSettings = { ...defaults };
		
		// Reset expanded sections
		expandedSections = {};
		if (template.settings_schema?.sections) {
			// Expand first section by default
			const firstSection = Object.keys(template.settings_schema.sections)[0];
			if (firstSection) {
				expandedSections[firstSection] = true;
			}
		}
	}

	// Toggle section expansion
	function toggleSection(sectionKey) {
		expandedSections[sectionKey] = !expandedSections[sectionKey];
	}

	// Update template setting
	async function updateTemplateSetting(settingKey, value) {
		templateSettings[settingKey] = value;
		
		// Save to database - this would update the template's default_settings
		try {
			const response = await fetch('/api/templates', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: selectedTemplate.id,
					default_settings: templateSettings
				})
			});
			
			if (response.ok) {
				showToast('Template settings updated!', 'success');
			} else {
				throw new Error('Failed to update template settings');
			}
		} catch (err) {
			console.error('Failed to update template settings:', err);
			showToast('Failed to update template settings', 'error');
		}
	}

	// Navigate to template selection
	function selectTemplate(template) {
		// Clear preview when switching templates
		templatePreview = '';
		goto(`?template=${template.id}`);
	}

	// Navigate to template editor
	function editTemplate(template) {
		goto(`?template=${template.id}&edit=true`);
	}

	// Navigate back to templates list
	function backToTemplates() {
		goto('/sales-channels/web-store');
	}

	// Debounce timer for preview rendering
	let renderTimeout = null;

	// Process HTML to make it safe for iframe preview
	function processHtmlForIframe(html) {
		if (!html) return html;
		
		// Get the current origin for absolute URLs
		const origin = window.location.origin;
		
		return html
			// Remove or comment out external script references that might cause 404s
			.replace(/<script\s+src="([^"]*)"[^>]*><\/script>/gi, (match, src) => {
				// Skip external URLs (http/https)
				if (src.match(/^https?:\/\//)) {
					return match;
				}
				// Comment out relative script references for preview
				return `<!-- Preview: Script removed - ${src} -->`;
			})
			// Convert relative URLs to absolute for assets that should work
			.replace(/href="(?!https?:\/\/)([^"]+)"/gi, `href="${origin}/$1"`)
			// Remove any api client initialization for preview
			.replace(/if \(typeof StoreApiClient[\s\S]*?}\s*}\);/gi, '// API client disabled for preview')
			// Remove cart functionality for preview
			.replace(/function toggleCart\(\)[\s\S]*?}/gi, 'function toggleCart() { /* Disabled for preview */ }')
			// Add a base tag to help with relative URLs
			.replace(/<head>/i, `<head>\n  <base href="${origin}/">`);
	}

	// Render template preview using the same endpoint as the actual store
	async function renderPreview(template) {
		if (!template || rendering) return;
		
		// Clear any existing timeout
		if (renderTimeout) {
			clearTimeout(renderTimeout);
		}
		
		// Debounce the render call
		renderTimeout = setTimeout(async () => {
			try {
				rendering = true;
				
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
				
				const response = await fetch('/api/store/page', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						page_type: template.template_type === 'page' ? template.template_name : 'home'
					}),
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (response.ok) {
					const data = await response.json();
					// Process HTML to make it iframe-safe
					templatePreview = processHtmlForIframe(data.html);
				} else {
					throw new Error(`Preview rendering failed: ${response.status}`);
				}
			} catch (err) {
				if (err.name === 'AbortError') {
					console.warn('Preview render timeout');
					showToast('Preview render timed out', 'error');
				} else {
					console.error('Preview error:', err);
					showToast('Failed to render preview', 'error');
				}
				templatePreview = ''; // Clear preview on error
			} finally {
				rendering = false;
			}
		}, 300); // 300ms debounce
	}

	// Save template
	async function saveTemplate() {
		if (!selectedTemplate) return;

		try {
			const response = await fetch('/api/templates', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: selectedTemplate.id,
					liquid_content: editorContent
				})
			});

			if (response.ok) {
				showToast('Template saved successfully!', 'success');
				
				// Update the template in the templates array
				const templateIndex = templates.findIndex(t => t.id === selectedTemplate.id);
				if (templateIndex >= 0) {
					templates[templateIndex].liquid_content = editorContent;
				}
				
				// Navigate back to template preview with updated content
				templatePreview = '';
				goto(`?template=${selectedTemplate.id}`);
				
				// Re-render the preview after navigation
				setTimeout(() => {
					if (selectedTemplate) renderPreview(selectedTemplate);
				}, 100);
			} else {
				throw new Error('Failed to save template');
			}
		} catch (err) {
			console.error('Save template error:', err);
			showToast('Failed to save template', 'error');
		}
	}

	// Track the last rendered template to prevent infinite loops
	let lastRenderedTemplateId = $state(null);

	// Watch for template selection changes and render preview
	$effect(() => {
		if (selectedTemplate && !isEditing && selectedTemplate.id !== lastRenderedTemplateId) {
			lastRenderedTemplateId = selectedTemplate.id;
			renderPreview(selectedTemplate);
			loadTemplateSettings(selectedTemplate);
		}
	});

	// Load editor content when editing
	$effect(() => {
		if (selectedTemplate && isEditing) {
			editorContent = selectedTemplate.liquid_content;
		}
	});

	// Initialize
	onMount(() => {
		loadTemplates();
	});

	// Cleanup
	onDestroy(() => {
		if (renderTimeout) {
			clearTimeout(renderTimeout);
		}
	});
</script>

<svelte:head>
	<title>Website Builder - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item current">🌐 Website Builder</span>
				</div>
			</div>
			<div class="page-actions">
				{#if isEditing}
					<button 
						class="btn btn-secondary" 
						onclick={backToTemplates}
					>
						← Back to Templates
					</button>
					<button 
						class="btn btn-primary" 
						onclick={saveTemplate}
					>
						💾 Save Template
					</button>
				{:else if selectedTemplate}
					<button 
						class="btn btn-secondary"
						onclick={() => editTemplate(selectedTemplate)}
					>
						✏️ Edit Template
					</button>
					<a 
						href="/store" 
						target="_blank"
						class="btn btn-primary"
					>
						👁️ Preview Store
					</a>
				{:else}
					<a 
						href="/store" 
						target="_blank"
						class="btn btn-primary"
					>
						👁️ Preview Store
					</a>
				{/if}
			</div>
		</div>
	</div>

	<div class="page-content">
		{#if error}
			<div class="page-content-padded">
				<div class="error-state">
					<div class="error-state-content">
						<div class="error-state-icon">⚠</div>
						<h1 class="error-state-title">Error</h1>
						<p class="error-state-message">{error}</p>
						<div class="error-state-actions">
							<button class="btn btn-primary" onclick={() => loadTemplates()}>
								Retry
							</button>
						</div>
					</div>
				</div>
			</div>
		{:else if loading}
			<div class="page-content-padded">
				<div class="loading-state">
					<div class="loading-spinner loading-spinner-lg"></div>
					<p class="loading-text">Loading templates...</p>
				</div>
			</div>
		{:else if isEditing && selectedTemplate}
			<!-- Template Editor View -->
			<div class="page-content-padded">
				<div class="editor-layout">
					<textarea 
						class="code-editor"
						bind:value={editorContent}
						placeholder="Enter your Liquid template code here..."
					></textarea>
				</div>
			</div>
		{:else}
			<!-- Templates View with Sidebar Layout -->
			<div class="page-content-padded">
				<div class="builder-layout">
				<!-- Main Content Area -->
				<div class="main-content">
					{#if selectedTemplate}
						<!-- Template Preview Content -->
						<div class="template-content">
							<div class="preview-container">
								{#if rendering}
									<div class="preview-loading">
										<div class="loading-spinner"></div>
										<p>Rendering template...</p>
									</div>
								{:else if templatePreview}
									<div class="template-preview-iframe-container">
										<iframe 
											class="template-preview-iframe"
											title="Template Preview"
											srcdoc={templatePreview}
											sandbox="allow-same-origin allow-scripts"
											frameborder="0"
										></iframe>
									</div>
								{:else}
									<div class="preview-placeholder">
										<div class="placeholder-content">
											<div class="placeholder-icon">👁️</div>
											<h4>Template Preview</h4>
											<p>Preview will appear here when rendered</p>
											<button 
												class="btn btn-primary"
												onclick={() => {
													if (!rendering) {
														templatePreview = ''; // Clear current preview
														renderPreview(selectedTemplate);
													}
												}}
												disabled={rendering}
											>
												{#if rendering}
													<span class="loading-spinner"></span>
													Rendering...
												{:else}
													Generate Preview
												{/if}
											</button>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<div class="no-template-selected">
							<div class="placeholder-content">
								<div class="placeholder-icon">📄</div>
								<h3>Select a Template</h3>
								<p>Choose a template from the sidebar to view its preview.</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- Right Sidebar -->
				<aside class="right-sidebar">
					<!-- Template Configuration -->
					{#if selectedTemplate}
						<div class="sidebar-section">
							<div class="sidebar-section-header">
								<h3 class="sidebar-section-title">Template</h3>
							</div>
							<div class="sidebar-section-content">
								{#if selectedTemplate.settings_schema?.sections}
									{#each Object.entries(selectedTemplate.settings_schema.sections) as [sectionKey, section]}
										<div class="template-section">
											<button 
												class="template-section-header"
												onclick={() => toggleSection(sectionKey)}
											>
												<span class="section-icon">
													{#if expandedSections[sectionKey]}▼{:else}▶{/if}
												</span>
												<span class="section-icon-type">📄</span>
												<span class="section-title">{section.title || sectionKey}</span>
											</button>
											
											{#if expandedSections[sectionKey] && section.settings}
												<div class="template-section-content">
													{#each section.settings as setting}
														<div class="template-setting">
															<div class="setting-header">
																<span class="setting-icon">
																	{#if setting.type === 'text'}📝{:else if setting.type === 'color'}🎨{:else if setting.type === 'image_picker'}🖼️{:else if setting.type === 'checkbox'}☑{:else}⚙{/if}
																</span>
																<span class="setting-label">{setting.label}</span>
															</div>
															
															{#if setting.type === 'text'}
																<input 
																	type="text"
																	class="form-input form-input-sm"
																	bind:value={templateSettings[setting.id]}
																	placeholder={setting.default}
																	onblur={() => updateTemplateSetting(setting.id, templateSettings[setting.id])}
																/>
															{:else if setting.type === 'color'}
																<input 
																	type="color"
																	class="form-input form-input-sm color-input"
																	bind:value={templateSettings[setting.id]}
																	onchange={() => updateTemplateSetting(setting.id, templateSettings[setting.id])}
																/>
															{:else if setting.type === 'checkbox'}
																<label class="form-label checkbox-label">
																	<input 
																		type="checkbox"
																		bind:checked={templateSettings[setting.id]}
																		onchange={() => updateTemplateSetting(setting.id, templateSettings[setting.id])}
																	/>
																	{setting.label}
																</label>
															{:else if setting.type === 'image_picker'}
																<div class="image-picker">
																	<input 
																		type="url"
																		class="form-input form-input-sm"
																		bind:value={templateSettings[setting.id]}
																		placeholder="Image URL"
																		onblur={() => updateTemplateSetting(setting.id, templateSettings[setting.id])}
																	/>
																</div>
															{:else}
																<input 
																	type="text"
																	class="form-input form-input-sm"
																	bind:value={templateSettings[setting.id]}
																	placeholder={setting.default}
																	onblur={() => updateTemplateSetting(setting.id, templateSettings[setting.id])}
																/>
															{/if}
														</div>
													{/each}
												</div>
											{/if}
										</div>
									{/each}
								{:else}
									<div class="empty-template-settings">
										<p>This template has no configurable settings.</p>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Templates List -->
					<div class="sidebar-section">
						<div class="sidebar-section-header">
							<h3 class="sidebar-section-title">Templates</h3>
							<span class="templates-count">({templates.length})</span>
						</div>
						
						<div class="sidebar-section-content">
							{#if templates.length === 0}
								<div class="sidebar-empty">
									<div class="empty-icon">📄</div>
									<p>No templates found</p>
								</div>
							{:else}
								<div class="templates-list">
									{#each templates as template}
										<button 
											class="template-item {selectedTemplateId === template.id ? 'selected' : ''}"
											onclick={() => selectTemplate(template)}
										>
											<div class="template-item-content">
												<div class="template-item-header">
													<div class="template-type-mini template-type-{template.template_type}">
														{template.template_type.charAt(0).toUpperCase()}
													</div>
													<div class="template-item-info">
														<div class="template-item-name">{template.template_name}</div>
														<div class="template-item-meta">
															v{template.version}
															<span class="status-dot {template.is_active ? 'active' : 'inactive'}"></span>
														</div>
													</div>
												</div>
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</aside>
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
	/* Builder Layout with Sidebar */
	.builder-layout {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: 0;
		height: calc(100vh - 140px);
		align-items: stretch;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		height: 100%;
	}

	/* Template Details */
	.template-details {
		height: 100%;
	}

	.template-info-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
	}

	.template-name {
		margin: var(--space-2) 0 var(--space-1) 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}

	.template-meta {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-3);
	}

	.status-badge {
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
	}

	.status-badge.active {
		background: #dcfce7;
		color: #166534;
	}

	.status-badge.inactive {
		background: #fef2f2;
		color: #dc2626;
	}

	.template-placeholder {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.placeholder-content {
		text-align: center;
		color: var(--color-text-secondary);
	}

	.placeholder-icon {
		font-size: 3rem;
		margin-bottom: var(--space-2);
		opacity: 0.5;
	}

	.template-actions {
		display: flex;
		gap: var(--space-2);
	}

	/* Templates Sidebar */
	.templates-sidebar {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar-header {
		padding: var(--space-4);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-background-secondary);
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.sidebar-title {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}

	.templates-count {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}

	.sidebar-content {
		flex: 1;
		overflow-y: auto;
	}

	.sidebar-empty {
		padding: var(--space-8) var(--space-4);
		text-align: center;
		color: var(--color-text-secondary);
	}

	.empty-icon {
		font-size: 2rem;
		margin-bottom: var(--space-2);
		opacity: 0.5;
	}

	.templates-list {
		display: flex;
		flex-direction: column;
	}

	.template-item {
		width: 100%;
		padding: var(--space-3);
		border: none;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background-color var(--transition-fast);
		border-bottom: 1px solid var(--color-border);
	}

	.template-item:hover {
		background: var(--color-background-secondary);
	}

	.template-item.selected {
		background: var(--color-primary-50);
		border-right: 3px solid var(--color-primary);
	}

	.template-item-content {
		width: 100%;
	}

	.template-item-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.template-type-mini {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		color: white;
		flex-shrink: 0;
	}

	.template-item-info {
		flex: 1;
		min-width: 0;
	}

	.template-item-name {
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		margin-bottom: 2px;
		font-size: var(--font-size-sm);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.template-item-meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.status-dot.active {
		background: #22c55e;
	}

	.status-dot.inactive {
		background: #ef4444;
	}

	/* Right Sidebar Styles */
	.right-sidebar {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
	}

	.sidebar-section {
		display: flex;
		flex-direction: column;
	}

	.sidebar-section:last-child {
		flex: 1;
		overflow: hidden;
	}

	.sidebar-section-header {
		padding: var(--space-4);
		background: var(--color-background-secondary);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.sidebar-section-title {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.sidebar-section-content {
		padding: var(--space-4);
		background: var(--color-surface);
		flex: 1;
	}

	/* Store Settings section */
	.sidebar-section:first-child {
		border-bottom: 1px solid var(--color-border);
	}

	/* Templates section */
	.sidebar-section:nth-child(2) {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar-section:nth-child(2) .sidebar-section-content {
		padding: 0;
		flex: 1;
		overflow-y: auto;
	}

	/* Store Settings form improvements */
	.sidebar-section-content .form-field {
		margin-bottom: var(--space-4);
	}

	.sidebar-section-content .form-field:last-child {
		margin-bottom: 0;
	}

	.sidebar-section-content .form-label {
		display: block;
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		margin-bottom: var(--space-2);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.sidebar-section-content .form-input {
		width: 100%;
		font-size: var(--font-size-sm);
	}

	.sidebar-section-content .color-input {
		height: 36px;
		padding: 4px;
		border-radius: var(--radius-sm);
	}

	.sidebar-section-content .form-label input[type="checkbox"] {
		margin-right: var(--space-2);
	}

	/* Template Settings Styles */
	.template-section {
		border-bottom: 1px solid var(--color-border);
		margin-bottom: var(--space-2);
	}

	.template-section:last-child {
		border-bottom: none;
		margin-bottom: 0;
	}

	.template-section-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) 0;
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
	}

	.template-section-header:hover {
		background: var(--color-background-secondary);
		border-radius: var(--radius-sm);
		padding-left: var(--space-2);
		padding-right: var(--space-2);
	}

	.section-icon {
		font-size: 10px;
		color: var(--color-text-tertiary);
		width: 12px;
	}

	.section-icon-type {
		font-size: 14px;
	}

	.section-title {
		flex: 1;
		text-align: left;
	}

	.template-section-content {
		padding-left: var(--space-6);
		padding-bottom: var(--space-3);
	}

	.template-setting {
		margin-bottom: var(--space-4);
	}

	.template-setting:last-child {
		margin-bottom: 0;
	}

	.setting-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.setting-icon {
		font-size: 12px;
		width: 16px;
	}

	.setting-label {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-normal);
		color: var(--color-text-primary);
		text-transform: none;
		letter-spacing: normal;
		margin-bottom: 0;
	}

	.empty-template-settings {
		padding: var(--space-4);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.image-picker {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}


	/* Template Content Area */
	.template-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.preview-container {
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 16px;
		overflow: hidden;
		flex: 1;
		height: 100%;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
	}

	.preview-loading {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		color: var(--color-text-secondary);
	}

	/* Iframe Container for Template Preview */
	.template-preview-iframe-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		position: relative;
		height: 100%;
	}

	.template-preview-iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: white;
		border-radius: 16px;
		flex: 1;
	}

	.preview-placeholder {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-background-secondary);
	}


	.no-template-selected {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-background-secondary);
		border: 1px solid var(--color-border);
		border-radius: 16px;
		height: 100%;
		padding: var(--space-8);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
	}

	/* Editor Layout */
	.editor-layout {
		height: calc(100vh - 200px);
		display: flex;
		flex-direction: column;
		position: relative;
		z-index: 1; /* Ensure it doesn't interfere with main sidebar */
		width: 100%;
	}

	.code-editor {
		flex: 1;
		font-family: var(--font-mono);
		font-size: 14px;
		padding: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		resize: none;
		outline: none;
		line-height: 1.5;
		width: 100%;
		box-sizing: border-box;
	}

	.code-editor:focus {
		border-color: var(--color-border-focus);
		box-shadow: var(--shadow-focus);
	}

	/* Ensure editor view doesn't affect main layout */
	.page-content {
		position: relative;
		z-index: 0;
		overflow: visible;
		/* Create isolation boundary */
		contain: layout;
	}

	/* Clean up containment rules since we're using iframe isolation */
	.builder-layout {
		position: relative;
	}

	/* Template type colors */
	.template-type-layout { background: #eff6ff; color: #1d4ed8; }
	.template-type-page { background: #f0fdf4; color: #166534; }
	.template-type-section { background: #fef3c7; color: #92400e; }
	.template-type-snippet { background: #fdf2f8; color: #be185d; }

	.template-type-mini.template-type-layout { background: #1d4ed8; }
	.template-type-mini.template-type-page { background: #166534; }
	.template-type-mini.template-type-section { background: #92400e; }
	.template-type-mini.template-type-snippet { background: #be185d; }

	/* Responsive Design */
	@media (max-width: 1200px) {
		.builder-layout {
			grid-template-columns: 1fr 280px;
		}
	}

	@media (max-width: 1024px) {
		.builder-layout {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
		}

		.templates-sidebar {
			order: -1;
			max-height: 300px;
		}

		.sidebar-header {
			padding: var(--space-3);
		}
	}

	@media (max-width: 768px) {
		.builder-layout {
			gap: var(--space-4);
		}

		.template-actions {
			flex-direction: column;
		}

		.template-actions .btn {
			width: 100%;
		}
	}

	/* Toast Notifications */
	.toast-container {
		position: fixed;
		top: 80px;
		right: 20px;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.toast {
		background: white;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 12px 16px;
		box-shadow: var(--shadow-lg);
		min-width: 280px;
		animation: slideIn 0.3s ease-out;
	}

	.toast-success {
		border-left: 4px solid #22c55e;
	}

	.toast-error {
		border-left: 4px solid #ef4444;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.toast-icon {
		font-weight: bold;
	}

	.toast-success .toast-icon {
		color: #22c55e;
	}

	.toast-error .toast-icon {
		color: #ef4444;
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

	/* Loading and Error States */
	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		text-align: center;
		color: var(--color-text-secondary);
	}

	.loading-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid transparent;
		border-top: 2px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 12px;
	}

	.loading-spinner-lg {
		width: 32px;
		height: 32px;
		border-width: 3px;
		margin-bottom: 16px;
	}

	.error-state-icon {
		font-size: 3rem;
		margin-bottom: 16px;
		opacity: 0.5;
	}

	.error-state-title {
		margin: 0 0 8px 0;
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}

	.error-state-message {
		margin: 0 0 24px 0;
		color: var(--color-text-secondary);
	}

	.error-state-actions,
	.template-actions {
		display: flex;
		gap: var(--space-2);
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>