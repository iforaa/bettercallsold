<script>
	import { onMount } from 'svelte';

	let plugins = [];
	let loading = true;
	let error = null;
	let editingPlugin = null;
	let showAddModal = false;

	// Form data for editing/creating plugins
	let formData = {
		name: '',
		slug: '',
		api_endpoint: '',
		webhook_url: '',
		api_key: '',
		status: 'inactive',
		events: [],
		config: {}
	};

	// Available plugin events
	const availableEvents = [
		'product.created',
		'product.updated', 
		'product.deleted',
		'cart.item_added',
		'cart.item_removed',
		'waitlist.item_added',
		'waitlist.item_removed',
		'waitlist.item_preauthorized',
		'order.created',
		'order.paid',
		'order.shipped',
		'order.delivered',
		'order.cancelled',
		'customer.created',
		'customer.updated',
		'inventory.low',
		'inventory.out',
		'inventory.updated'
	];

	const statusOptions = [
		{ value: 'active', label: 'Active', color: '#28a745' },
		{ value: 'inactive', label: 'Inactive', color: '#6c757d' },
		{ value: 'error', label: 'Error', color: '#dc3545' }
	];

	async function loadPlugins() {
		try {
			loading = true;
			const response = await fetch('/api/plugins');
			if (response.ok) {
				const data = await response.json();
				plugins = data.plugins || [];
			} else {
				error = 'Failed to load plugins';
			}
		} catch (e) {
			error = `Error loading plugins: ${e.message}`;
		} finally {
			loading = false;
		}
	}

	function openAddModal() {
		formData = {
			name: '',
			slug: '',
			api_endpoint: '',
			webhook_url: '',
			api_key: '',
			status: 'inactive',
			events: [],
			config: {}
		};
		editingPlugin = null;
		showAddModal = true;
	}

	function openEditModal(plugin) {
		formData = {
			name: plugin.name,
			slug: plugin.slug,
			api_endpoint: plugin.api_endpoint || '',
			webhook_url: plugin.webhook_url || '',
			api_key: plugin.config?.api_key || '',
			status: plugin.status,
			events: [...(plugin.events || [])],
			config: { ...plugin.config }
		};
		editingPlugin = plugin;
		showAddModal = true;
	}

	function closeModal() {
		showAddModal = false;
		editingPlugin = null;
		formData = {
			name: '',
			slug: '',
			api_endpoint: '',
			webhook_url: '',
			api_key: '',
			status: 'inactive',
			events: [],
			config: {}
		};
	}

	function toggleEvent(event) {
		if (formData.events.includes(event)) {
			formData.events = formData.events.filter(e => e !== event);
		} else {
			formData.events = [...formData.events, event];
		}
	}

	async function savePlugin() {
		try {
			const config = { ...formData.config };
			if (formData.api_key) {
				config.api_key = formData.api_key;
			}

			const payload = {
				name: formData.name,
				api_endpoint: formData.api_endpoint,
				webhook_url: formData.webhook_url,
				status: formData.status,
				events: formData.events,
				config: config,
				metadata: {
					version: '1.0.0',
					developer: 'Custom'
				}
			};

			let response;
			if (editingPlugin) {
				// Update existing plugin
				response = await fetch(`/api/plugins/${editingPlugin.slug}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else {
				// Create new plugin
				response = await fetch('/api/plugins', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...payload,
						slug: formData.slug
					})
				});
			}

			if (response.ok) {
				closeModal();
				loadPlugins();
			} else {
				const errorData = await response.text();
				alert(`Failed to save plugin: ${errorData}`);
			}
		} catch (e) {
			alert(`Error saving plugin: ${e.message}`);
		}
	}

	async function deletePlugin(plugin) {
		if (!confirm(`Are you sure you want to delete the plugin "${plugin.name}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/plugins/${plugin.slug}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				loadPlugins();
			} else {
				const errorData = await response.text();
				alert(`Failed to delete plugin: ${errorData}`);
			}
		} catch (e) {
			alert(`Error deleting plugin: ${e.message}`);
		}
	}

	async function togglePluginStatus(plugin) {
		const newStatus = plugin.status === 'active' ? 'inactive' : 'active';
		
		try {
			const response = await fetch(`/api/plugins/${plugin.slug}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...plugin,
					status: newStatus
				})
			});

			if (response.ok) {
				loadPlugins();
			} else {
				const errorData = await response.text();
				alert(`Failed to update plugin status: ${errorData}`);
			}
		} catch (e) {
			alert(`Error updating plugin status: ${e.message}`);
		}
	}

	function getStatusColor(status) {
		const statusOption = statusOptions.find(s => s.value === status);
		return statusOption ? statusOption.color : '#6c757d';
	}

	onMount(() => {
		loadPlugins();
	});
</script>

<svelte:head>
	<title>Plugins - Settings</title>
</svelte:head>

<div class="settings-container">
	<div class="page-header">
		<div class="header-content">
			<h1>Plugins</h1>
			<p>Manage third-party integrations and services</p>
		</div>
		<button class="btn btn-primary" on:click={openAddModal}>
			Add Plugin
		</button>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading plugins...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p>{error}</p>
			<button class="btn btn-secondary" on:click={loadPlugins}>Retry</button>
		</div>
	{:else}
		<div class="plugins-grid">
			{#if plugins.length === 0}
				<div class="empty-state">
					<div class="empty-icon">🔌</div>
					<h3>No plugins installed</h3>
					<p>Add your first plugin to start integrating with third-party services.</p>
					<button class="btn btn-primary" on:click={openAddModal}>
						Add Plugin
					</button>
				</div>
			{:else}
				{#each plugins as plugin}
					<div class="plugin-card">
						<div class="plugin-header">
							<div class="plugin-info">
								<h3>{plugin.name}</h3>
								<p class="plugin-slug">#{plugin.slug}</p>
							</div>
							<div class="plugin-status">
								<span 
									class="status-badge" 
									style="background-color: {getStatusColor(plugin.status)};"
								>
									{plugin.status}
								</span>
							</div>
						</div>

						<div class="plugin-details">
							{#if plugin.webhook_url}
								<div class="detail-item">
									<strong>Webhook:</strong>
									<span class="webhook-url">{plugin.webhook_url}</span>
								</div>
							{/if}
							
							{#if plugin.api_endpoint}
								<div class="detail-item">
									<strong>API Endpoint:</strong>
									<span>{plugin.api_endpoint}</span>
								</div>
							{/if}

							<div class="detail-item">
								<strong>Events:</strong>
								<span class="events-count">{plugin.events?.length || 0} subscribed</span>
							</div>

							<div class="detail-item">
								<strong>Created:</strong>
								<span>{new Date(plugin.created_at).toLocaleDateString()}</span>
							</div>
						</div>

						<div class="plugin-actions">
							<button 
								class="btn btn-sm {plugin.status === 'active' ? 'btn-warning' : 'btn-success'}"
								on:click={() => togglePluginStatus(plugin)}
							>
								{plugin.status === 'active' ? 'Deactivate' : 'Activate'}
							</button>
							<button 
								class="btn btn-sm btn-secondary"
								on:click={() => openEditModal(plugin)}
							>
								Edit
							</button>
							<button 
								class="btn btn-sm btn-danger"
								on:click={() => deletePlugin(plugin)}
							>
								Delete
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<!-- Modal for Add/Edit Plugin -->
{#if showAddModal}
	<div class="modal-overlay" on:click={closeModal}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h2>{editingPlugin ? 'Edit Plugin' : 'Add New Plugin'}</h2>
				<button class="close-btn" on:click={closeModal}>&times;</button>
			</div>

			<form on:submit|preventDefault={savePlugin} class="modal-body">
				<div class="form-row">
					<div class="form-group">
						<label for="name">Plugin Name *</label>
						<input 
							type="text" 
							id="name"
							bind:value={formData.name} 
							required 
							placeholder="e.g., Analytics Plugin"
						/>
					</div>

					{#if !editingPlugin}
						<div class="form-group">
							<label for="slug">Slug *</label>
							<input 
								type="text" 
								id="slug"
								bind:value={formData.slug} 
								required 
								placeholder="e.g., analytics-plugin"
								pattern="[a-z0-9-]+"
								title="Lowercase letters, numbers, and hyphens only"
							/>
						</div>
					{/if}
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="api_endpoint">API Endpoint</label>
						<input 
							type="url" 
							id="api_endpoint"
							bind:value={formData.api_endpoint} 
							placeholder="https://your-plugin.com/api"
						/>
					</div>

					<div class="form-group">
						<label for="webhook_url">Webhook URL</label>
						<input 
							type="url" 
							id="webhook_url"
							bind:value={formData.webhook_url} 
							placeholder="https://your-plugin.com/webhooks"
						/>
					</div>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="api_key">API Key</label>
						<input 
							type="password" 
							id="api_key"
							bind:value={formData.api_key} 
							placeholder="Optional API key"
						/>
					</div>

					<div class="form-group">
						<label for="status">Status</label>
						<select id="status" bind:value={formData.status}>
							{#each statusOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Subscribed Events</label>
					<div class="events-grid">
						{#each availableEvents as event}
							<label class="checkbox-label">
								<input 
									type="checkbox" 
									checked={formData.events.includes(event)}
									on:change={() => toggleEvent(event)}
								/>
								<span class="event-name">{event}</span>
							</label>
						{/each}
					</div>
				</div>

				<div class="modal-actions">
					<button type="button" class="btn btn-secondary" on:click={closeModal}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary">
						{editingPlugin ? 'Update Plugin' : 'Create Plugin'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.settings-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.header-content h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.header-content p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 1rem;
	}

	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--color-border);
		border-top: 4px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.plugins-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: 1.5rem;
	}

	.empty-state {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		background: var(--color-surface);
		border: 2px dashed var(--color-border);
		border-radius: var(--radius-lg);
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.empty-state p {
		margin: 0 0 2rem 0;
		color: var(--color-text-secondary);
	}

	.plugin-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		transition: all 0.2s ease;
	}

	.plugin-card:hover {
		border-color: var(--color-border-dark);
		box-shadow: var(--shadow-sm);
	}

	.plugin-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.plugin-info h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.plugin-slug {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-family: var(--font-mono);
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 500;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.plugin-details {
		margin-bottom: 1.5rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
		gap: 1rem;
	}

	.detail-item strong {
		font-weight: 500;
		color: var(--color-text);
		min-width: 100px;
		flex-shrink: 0;
	}

	.detail-item span {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-align: right;
	}

	.webhook-url {
		font-family: var(--font-mono);
		word-break: break-all;
	}

	.events-count {
		font-weight: 500;
		color: var(--color-primary) !important;
	}

	.plugin-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 2rem;
	}

	.modal-content {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		max-width: 800px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: var(--shadow-lg);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid var(--color-border);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 2rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.close-btn:hover {
		color: var(--color-text);
	}

	.modal-body {
		padding: 2rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group.full-width {
		grid-column: 1 / -1;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.form-group input,
	.form-group select {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		background: var(--color-background);
		color: var(--color-text);
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
	}

	.events-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.5rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-background);
		max-height: 300px;
		overflow-y: auto;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: var(--radius-sm);
		transition: background-color 0.2s ease;
	}

	.checkbox-label:hover {
		background: var(--color-surface);
	}

	.event-name {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-family: var(--font-mono);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	/* Button Styles */
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
		justify-content: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
		line-height: 1.2;
	}

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.8rem;
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

	.btn-success {
		background: #28a745;
		color: white;
	}

	.btn-success:hover {
		background: #218838;
	}

	.btn-warning {
		background: #ffc107;
		color: #212529;
	}

	.btn-warning:hover {
		background: #e0a800;
	}

	.btn-danger {
		background: #dc3545;
		color: white;
	}

	.btn-danger:hover {
		background: #c82333;
	}

	@media (max-width: 768px) {
		.settings-container {
			padding: 1rem;
		}

		.page-header {
			flex-direction: column;
			gap: 1rem;
		}

		.plugins-grid {
			grid-template-columns: 1fr;
		}

		.plugin-actions {
			justify-content: center;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.modal-content {
			margin: 1rem;
			max-width: none;
		}

		.modal-header,
		.modal-body {
			padding: 1rem;
		}

		.modal-actions {
			flex-direction: column-reverse;
		}

		.events-grid {
			grid-template-columns: 1fr;
		}
	}
</style>