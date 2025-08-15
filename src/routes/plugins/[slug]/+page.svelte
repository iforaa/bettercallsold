<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let data;

	let iframeRef;
	let loading = true;
	let error = null;
	let retryCount = 0;
	const maxRetries = 3;

	// Check if we have an error from the load function
	$: if (data.error) {
		error = data.error;
		loading = false;
	}

	$: plugin = data.plugin;
	$: pluginUrl = plugin?.api_endpoint;

	function handleIframeLoad() {
		loading = false;
		error = null;
		retryCount = 0;
	}

	function handleIframeError() {
		loading = false;
		if (retryCount < maxRetries) {
			error = {
				status: 503,
				message: `Failed to load plugin. Retrying... (${retryCount + 1}/${maxRetries})`
			};
			retryCount++;
			// Retry after a short delay
			setTimeout(retryPlugin, 2000);
		} else {
			error = {
				status: 503,
				message: pluginUrl 
					? `Unable to connect to plugin at ${pluginUrl}. Please check if the plugin server is running.`
					: 'Plugin URL not configured. Please update the plugin settings.'
			};
		}
	}

	function retryPlugin() {
		if (iframeRef && pluginUrl) {
			loading = true;
			error = null;
			// Force reload the iframe
			iframeRef.src = pluginUrl;
		}
	}

	function refreshPlugin() {
		retryCount = 0;
		retryPlugin();
	}

	function openInNewTab() {
		if (pluginUrl) {
			window.open(pluginUrl, '_blank');
		}
	}

	onMount(() => {
		if (!pluginUrl && !error) {
			error = {
				status: 400,
				message: 'Plugin URL not configured. Please update the plugin settings.'
			};
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{plugin?.name || 'Plugin'} - BetterCallSold</title>
</svelte:head>

<div class="plugin-container">
	{#if error}
		<div class="error-state">
			<div class="error-icon">⚠️</div>
			<h2>Plugin Error</h2>
			<p class="error-message">{error.message}</p>
			
			<div class="error-details">
				{#if plugin}
					<div class="plugin-info">
						<h3>{plugin.name}</h3>
						<p><strong>Status:</strong> <span class="status-badge status-{plugin.status}">{plugin.status}</span></p>
						{#if plugin.api_endpoint}
							<p><strong>URL:</strong> <code>{plugin.api_endpoint}</code></p>
						{/if}
						{#if plugin.webhook_url}
							<p><strong>Webhook:</strong> <code>{plugin.webhook_url}</code></p>
						{/if}
					</div>
				{/if}
			</div>

			<div class="error-actions">
				{#if pluginUrl}
					<button class="btn btn-primary" on:click={refreshPlugin}>
						🔄 Retry
					</button>
					<button class="btn btn-secondary" on:click={openInNewTab}>
						🔗 Open in New Tab
					</button>
				{/if}
				<a href="/settings/plugins" class="btn btn-secondary">
					⚙️ Plugin Settings
				</a>
			</div>
		</div>
	{:else if loading}
		<div class="loading-state">
			<div class="loading-header">
				{#if plugin}
					<h2>Loading {plugin.name}...</h2>
					<p>Connecting to plugin server at <code>{pluginUrl}</code></p>
				{:else}
					<h2>Loading plugin...</h2>
				{/if}
			</div>
			<div class="spinner"></div>
		</div>
	{/if}

	{#if pluginUrl && !error}
		<div class="iframe-container" class:loading>
			<iframe
				bind:this={iframeRef}
				src={pluginUrl}
				title={plugin?.name || 'Plugin'}
				on:load={handleIframeLoad}
				on:error={handleIframeError}
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
				loading="eager"
			></iframe>
		</div>
	{/if}

	<!-- Plugin Info Bar (always visible when plugin is loaded) -->
	{#if plugin && !error}
		<div class="plugin-info-bar">
			<div class="plugin-meta">
				<span class="plugin-name">{plugin.name}</span>
				<span class="plugin-status status-{plugin.status}">{plugin.status}</span>
			</div>
			<div class="plugin-actions">
				{#if pluginUrl}
					<button class="btn-icon" on:click={refreshPlugin} title="Refresh plugin">
						🔄
					</button>
					<button class="btn-icon" on:click={openInNewTab} title="Open in new tab">
						🔗
					</button>
				{/if}
				<a href="/settings/plugins" class="btn-icon" title="Plugin settings">
					⚙️
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.plugin-container {
		height: 100vh;
		display: flex;
		flex-direction: column;
		position: relative;
		background: var(--color-background);
	}

	/* Loading State */
	.loading-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		gap: 2rem;
	}

	.loading-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.loading-header p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.loading-header code {
		background: var(--color-surface);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		border: 1px solid var(--color-border);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--color-border);
		border-top: 4px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Error State */
	.error-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		gap: 1.5rem;
		max-width: 600px;
		margin: 0 auto;
	}

	.error-icon {
		font-size: 4rem;
		opacity: 0.7;
	}

	.error-state h2 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.error-message {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 1rem;
		line-height: 1.5;
	}

	.error-details {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		width: 100%;
		text-align: left;
	}

	.plugin-info h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.plugin-info p {
		margin: 0 0 0.75rem 0;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.plugin-info p:last-child {
		margin-bottom: 0;
	}

	.plugin-info code {
		background: var(--color-background);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		border: 1px solid var(--color-border);
		word-break: break-all;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	/* Iframe Container */
	.iframe-container {
		flex: 1;
		position: relative;
		background: white;
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		overflow: hidden;
		margin-bottom: 60px; /* Space for info bar */
		box-shadow: var(--shadow-sm);
	}

	.iframe-container.loading {
		opacity: 0.7;
		pointer-events: none;
	}

	iframe {
		width: 100%;
		height: 100%;
		border: none;
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
	}

	/* Plugin Info Bar */
	.plugin-info-bar {
		position: fixed;
		bottom: 0;
		left: var(--sidebar-width);
		right: 0;
		height: 60px;
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.5rem;
		backdrop-filter: blur(10px);
		z-index: 100;
	}

	.plugin-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.plugin-name {
		font-weight: 500;
		color: var(--color-text);
		font-size: 0.9rem;
	}

	.plugin-status {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-full);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.status-active {
		background: #d4edda;
		color: #155724;
	}

	.status-inactive {
		background: #f8f9fa;
		color: #6c757d;
	}

	.status-error {
		background: #f8d7da;
		color: #721c24;
	}

	.status-badge {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-full);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.status-badge.status-active {
		background: #28a745;
		color: white;
	}

	.status-badge.status-inactive {
		background: #6c757d;
		color: white;
	}

	.status-badge.status-error {
		background: #dc3545;
		color: white;
	}

	.plugin-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* Buttons */
	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
		line-height: 1.2;
	}

	.btn-primary {
		background: var(--color-primary);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-primary-hover);
	}

	.btn-secondary {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background: var(--color-background);
		border-color: var(--color-border-dark);
	}

	.btn-icon {
		width: 36px;
		height: 36px;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		font-size: 0.9rem;
		text-decoration: none;
	}

	.btn-icon:hover {
		background: var(--color-background);
		color: var(--color-text);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.plugin-info-bar {
			left: 0;
			padding: 0 1rem;
		}

		.plugin-meta {
			gap: 0.75rem;
		}

		.plugin-name {
			font-size: 0.8rem;
		}

		.plugin-actions {
			gap: 0.25rem;
		}

		.btn-icon {
			width: 32px;
			height: 32px;
			font-size: 0.8rem;
		}

		.error-state {
			padding: 1rem;
		}

		.error-actions {
			flex-direction: column;
			width: 100%;
		}

		.btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>