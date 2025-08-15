<script lang="ts">
	import { onMount } from 'svelte';
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

	// Site configuration state
	let siteConfig = $state({
		siteName: 'My Store',
		apiBaseUrl: 'http://localhost:5173/api'
	});

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

	// Load store settings for site config
	async function loadStoreSettings() {
		try {
			const response = await fetch('/api/webstore/settings');
			if (response.ok) {
				const data = await response.json();
				siteConfig.siteName = data.store_name || 'My Store';
			}
		} catch (err) {
			console.error('Failed to load store settings:', err);
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

	// Render template preview using the same endpoint as the actual store
	async function renderPreview(template) {
		if (!template) return;
		
		try {
			rendering = true;
			
			const response = await fetch('/api/store/page', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					page_type: template.template_type === 'page' ? template.template_name : 'home'
				})
			});

			if (response.ok) {
				const data = await response.json();
				templatePreview = data.html;
			} else {
				throw new Error('Preview rendering failed');
			}
		} catch (err) {
			console.error('Preview error:', err);
			showToast('Failed to render preview', 'error');
		} finally {
			rendering = false;
		}
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

	// Watch for template selection changes and render preview
	$effect(() => {
		if (selectedTemplate && !isEditing) {
			renderPreview(selectedTemplate);
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
		loadStoreSettings();
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
		{:else if loading}
			<div class="loading-state">
				<div class="loading-spinner loading-spinner-lg"></div>
				<p class="loading-text">Loading templates...</p>
			</div>
		{:else if isEditing && selectedTemplate}
			<!-- Template Editor View -->
			<div class="editor-layout">
				<textarea 
					class="code-editor"
					bind:value={editorContent}
					placeholder="Enter your Liquid template code here..."
				></textarea>
			</div>
		{:else}
			<!-- Templates View with Sidebar Layout -->
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
												onclick={() => renderPreview(selectedTemplate)}
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
					<!-- Store Settings -->
					<div class="sidebar-section">
						<div class="sidebar-section-header">
							<h3 class="sidebar-section-title">Store Settings</h3>
						</div>
						<div class="sidebar-section-content">
							<div class="form-field">
								<label class="form-label" for="site-name">Store Name</label>
								<input 
									id="site-name"
									type="text" 
									class="form-input form-input-sm"
									bind:value={siteConfig.siteName}
									placeholder="My Amazing Store"
								/>
							</div>
							<div class="form-field">
								<label class="form-label" for="api-url">API Base URL</label>
								<input 
									id="api-url"
									type="url" 
									class="form-input form-input-sm"
									bind:value={siteConfig.apiBaseUrl}
									placeholder="http://localhost:5173/api"
								/>
							</div>
						</div>
					</div>

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
		gap: 0; /* Remove gap for wider preview */
		min-height: calc(100vh - 140px);
		align-items: start; /* Align content to top, let it grow naturally */
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		overflow: visible; /* Allow natural flow */
		/* Remove all padding to eliminate space between preview and sidebar */
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
		position: sticky;
		top: var(--space-4);
		height: calc(100vh - 180px);
		align-self: start;
		gap: 0; /* Remove any gaps between sections */
		padding-left: var(--space-4); /* Add left padding for separation from main content */
	}

	.sidebar-section {
		border-bottom: 1px solid var(--color-border);
		margin-bottom: var(--space-4); /* Add spacing between sections */
	}

	.sidebar-section:last-child {
		border-bottom: none;
		margin-bottom: 0;
	}

	.sidebar-section-header {
		padding: var(--space-3) var(--space-4);
		background: var(--color-background-secondary);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		border-radius: var(--radius-md) var(--radius-md) 0 0;
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
		border-radius: 0 0 var(--radius-md) var(--radius-md);
	}

	/* Store Settings section */
	.sidebar-section:first-child {
		border-radius: var(--radius-lg) var(--radius-lg) var(--radius-md) var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		margin-bottom: var(--space-6);
	}

	/* Templates section */
	.sidebar-section:nth-child(2) {
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-bottom: 0;
	}

	.sidebar-section:nth-child(2) .sidebar-section-content {
		padding: 0;
		border-radius: 0 0 var(--radius-md) var(--radius-md);
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


	/* Template Content Area */
	.template-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.preview-container {
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
		flex: 1;
		min-height: 500px;
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
		min-height: 500px;
	}

	.template-preview-iframe {
		width: 100%;
		height: 100%;
		min-height: 500px;
		border: none;
		background: white;
		border-radius: inherit;
		
		/* Ensure iframe takes full space */
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
		border-radius: var(--radius-lg);
		min-height: 300px;
		padding: var(--space-8);
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