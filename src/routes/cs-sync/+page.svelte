<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// State variables
	let isLoading = $state(false);
	let syncProgress = $state(0);
	let syncStatus = $state('idle'); // idle, syncing, completed, error
	let syncResults = $state(null);
	let toasts = $state([]);
	let errorMessage = $state('');
	let syncLogs = $state([]);
	let showLogs = $state(true);
	let logIdCounter = 0; // Fix for duplicate key issue

	// Sync settings
	let syncSettings = $state({
		maxProducts: 50,
		includeImages: true,
		includeInventory: true,
		selectedCollections: [],
		syncMode: 'update' // 'replace' or 'update'
	});

	// Available collections from CommentSold
	let availableCollections = $state([]);
	let collectionsLoading = $state(false);

	// Toast notification system
	function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
		const id = Date.now();
		const toast = { id, message, type };
		toasts = [...toasts, toast];
		
		setTimeout(() => {
			toasts = toasts.filter(t => t.id !== id);
		}, 5000);
	}
	
	function removeToast(id: number) {
		toasts = toasts.filter(t => t.id !== id);
	}

	// Load available collections
	async function loadCollections() {
		collectionsLoading = true;
		addLog('🔄 Loading collections from CommentSold...', 'info');
		
		try {
			const response = await fetch('/api/cs-sync/collections');
			if (response.ok) {
				const data = await response.json();
				availableCollections = data;
				addLog(`✅ Successfully loaded ${availableCollections.length} collections`, 'success');
				showToast(`Loaded ${availableCollections.length} collections from CommentSold`, 'success');
			} else {
				let errorMessage = 'Failed to load collections';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch (parseError) {
					errorMessage = `HTTP ${response.status}: ${response.statusText}`;
				}
				throw new Error(errorMessage);
			}
		} catch (error) {
			console.error('Failed to load collections:', error);
			addLog(`❌ Failed to load collections: ${error.message}`, 'error');
			showToast('Failed to load collections from CommentSold', 'error');
		} finally {
			collectionsLoading = false;
		}
	}

	// Toggle collection selection
	function toggleCollection(collectionId: number) {
		if (syncSettings.selectedCollections.includes(collectionId)) {
			syncSettings.selectedCollections = syncSettings.selectedCollections.filter(id => id !== collectionId);
		} else {
			syncSettings.selectedCollections = [...syncSettings.selectedCollections, collectionId];
		}
	}

	// Select all collections
	function selectAllCollections() {
		syncSettings.selectedCollections = availableCollections.map(c => c.id);
	}

	// Clear collection selection
	function clearCollectionSelection() {
		syncSettings.selectedCollections = [];
	}

	// Start sync process
	async function startSync() {
		if (isLoading) return;

		isLoading = true;
		syncStatus = 'syncing';
		syncProgress = 0;
		errorMessage = '';
		syncResults = null;
		clearLogs();

		addLog('🚀 Starting CommentSold sync...', 'info');
		addLog(`📋 Settings: ${syncSettings.maxProducts} max products, ${syncSettings.selectedCollections.length} collections`, 'info');

		try {
			// Start the sync process
			addLog('📡 Sending sync request to server...', 'info');
			
			const response = await fetch('/api/cs-sync/products', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					...syncSettings,
					enableLogs: true // Request detailed logs from server
				})
			});

			if (!response.ok) {
				let errorMessage = 'Sync failed';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch (parseError) {
					// If JSON parsing fails, try to get text
					try {
						const errorText = await response.text();
						errorMessage = `HTTP ${response.status}: ${errorText}`;
					} catch (textError) {
						errorMessage = `HTTP ${response.status}: ${response.statusText}`;
					}
				}
				throw new Error(errorMessage);
			}

			// Start polling for progress updates
			addLog('🔄 Sync started, monitoring progress...', 'info');
			
			// Since we can't stream from the server easily, we'll simulate realistic progress
			// and get detailed results at the end
			let progressSteps = [
				{ progress: 10, message: '📂 Loading collections from CommentSold...' },
				{ progress: 20, message: '🏗️ Creating collections in database...' },
				{ progress: 30, message: '🔍 Fetching product lists...' },
				{ progress: 45, message: '📦 Processing product details...' },
				{ progress: 60, message: '💾 Saving products to database...' },
				{ progress: 75, message: '🔗 Associating products with collections...' },
				{ progress: 85, message: '🖼️ Processing product images...' },
				{ progress: 95, message: '✅ Finalizing sync...' }
			];

			// Simulate progress updates
			for (const step of progressSteps) {
				await new Promise(resolve => setTimeout(resolve, 500));
				syncProgress = step.progress;
				addLog(step.message, 'info');
			}

			const results = await response.json();
			
			// Process detailed logs from server if available
			if (results.logs) {
				results.logs.forEach(log => {
					addLog(log.message, log.type);
				});
			}

			// Add final results to logs
			addLog(`✅ Sync completed successfully!`, 'success');
			addLog(`📊 Results: ${results.imported} imported, ${results.updated} updated, ${results.errors} errors`, 'success');
			
			if (results.errorMessages && results.errorMessages.length > 0) {
				addLog(`⚠️ Error details:`, 'warning');
				results.errorMessages.forEach(msg => {
					addLog(`   • ${msg}`, 'error');
				});
			}
			
			syncProgress = 100;
			syncStatus = 'completed';
			syncResults = results;
			
			showToast(`Successfully synced ${results.imported} products!`, 'success');
		} catch (error) {
			console.error('Sync failed:', error);
			syncStatus = 'error';
			errorMessage = error.message;
			addLog(`❌ Sync failed: ${error.message}`, 'error');
			showToast(`Sync failed: ${error.message}`, 'error');
		} finally {
			isLoading = false;
		}
	}

	// Add log entry
	function addLog(message, type = 'info') {
		const timestamp = new Date().toLocaleTimeString();
		const logEntry = {
			id: ++logIdCounter, // Use incrementing counter for unique IDs
			timestamp,
			message,
			type // 'info', 'success', 'error', 'warning'
		};
		syncLogs = [...syncLogs, logEntry];
		
		// Auto-scroll logs to bottom (only on client side)
		if (typeof document !== 'undefined') {
			setTimeout(() => {
				const logsContainer = document.querySelector('.logs-content');
				if (logsContainer) {
					logsContainer.scrollTop = logsContainer.scrollHeight;
				}
			}, 100);
		}
	}

	// Clear logs
	function clearLogs() {
		syncLogs = [];
		logIdCounter = 0; // Reset counter
	}

	// Reset sync state
	function resetSync() {
		syncStatus = 'idle';
		syncProgress = 0;
		syncResults = null;
		errorMessage = '';
		clearLogs();
	}

	// Load collections on mount
	onMount(() => {
		loadCollections();
	});
</script>

<svelte:head>
	<title>CommentSold Sync - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">🔄</span>
				CommentSold Sync
			</h1>
			<div class="header-actions">
				<button class="btn-secondary" onclick={loadCollections} disabled={collectionsLoading}>
					{collectionsLoading ? 'Loading...' : 'Refresh Collections'}
				</button>
			</div>
		</div>
		<p class="page-description">
			Import products from CommentSold API into your BetterCallSold database.
		</p>
	</div>

	<div class="page-content">
		<!-- Sync Settings Card -->
		<div class="settings-card">
			<div class="card-header">
				<h2>Sync Settings</h2>
				<p>Configure your product import preferences</p>
			</div>
			
			<div class="card-content">
				<!-- Basic Settings -->
				<div class="settings-section">
					<h3>Basic Settings</h3>
					<div class="settings-grid">
						<div class="setting-item">
							<label for="maxProducts">Maximum Products</label>
							<input 
								id="maxProducts"
								type="number" 
								bind:value={syncSettings.maxProducts}
								min="1"
								max="1000"
								class="setting-input"
							/>
							<span class="setting-help">Limit the number of products to import (1-1000)</span>
						</div>
						
						<div class="setting-item">
							<label for="syncMode">Sync Mode</label>
							<select id="syncMode" bind:value={syncSettings.syncMode} class="setting-select">
								<option value="update">Update existing products</option>
								<option value="replace">Replace all products</option>
							</select>
							<span class="setting-help">Choose how to handle existing products</span>
						</div>
					</div>
				</div>

				<!-- Import Options -->
				<div class="settings-section">
					<h3>Import Options</h3>
					<div class="checkbox-group">
						<label class="checkbox-item">
							<input 
								type="checkbox" 
								bind:checked={syncSettings.includeImages}
							/>
							<span class="checkbox-label">Include product images</span>
							<span class="checkbox-help">Import product images and media</span>
						</label>
						
						<label class="checkbox-item">
							<input 
								type="checkbox" 
								bind:checked={syncSettings.includeInventory}
							/>
							<span class="checkbox-label">Include inventory data</span>
							<span class="checkbox-help">Import stock quantities and variants</span>
						</label>
					</div>
				</div>

				<!-- Collection Selection -->
				<div class="settings-section">
					<h3>Collections</h3>
					<div class="collection-controls">
						<div class="control-buttons">
							<button class="btn-secondary btn-sm" onclick={selectAllCollections}>
								Select All
							</button>
							<button class="btn-secondary btn-sm" onclick={clearCollectionSelection}>
								Clear All
							</button>
							<span class="selection-count">
								{syncSettings.selectedCollections.length} of {availableCollections.length} selected
							</span>
						</div>
					</div>
					
					{#if collectionsLoading}
						<div class="loading-state">
							<div class="loading-spinner"></div>
							<p>Loading collections...</p>
						</div>
					{:else if availableCollections.length > 0}
						<div class="collections-grid">
							{#each availableCollections as collection}
								<label class="collection-item">
									<input 
										type="checkbox" 
										checked={syncSettings.selectedCollections.includes(collection.id)}
										onchange={() => toggleCollection(collection.id)}
									/>
									<div class="collection-info">
										<div class="collection-name">{collection.title}</div>
										<div class="collection-meta">ID: {collection.id}</div>
									</div>
								</label>
							{/each}
						</div>
					{:else}
						<div class="empty-state">
							<div class="empty-icon">📂</div>
							<p>No collections found</p>
							<p class="empty-hint">Click "Refresh Collections" to load from CommentSold</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Sync Status and Logs Layout -->
		<div class="sync-layout">
			<!-- Sync Status Card -->
			<div class="status-card">
				<div class="card-header">
					<h2>Sync Status</h2>
				</div>
				
				<div class="card-content">
				{#if syncStatus === 'idle'}
					<div class="status-idle">
						<div class="status-icon">⏸️</div>
						<h3>Ready to Sync</h3>
						<p>Configure your settings above and click "Start Sync" to begin importing products.</p>
						<button 
							class="btn-primary btn-large" 
							onclick={startSync}
							disabled={syncSettings.selectedCollections.length === 0}
						>
							Start Sync
						</button>
						{#if syncSettings.selectedCollections.length === 0}
							<p class="warning-text">Please select at least one collection to sync</p>
						{/if}
					</div>
				{:else if syncStatus === 'syncing'}
					<div class="status-syncing">
						<div class="status-icon">🔄</div>
						<h3>Syncing Products...</h3>
						<div class="progress-bar">
							<div class="progress-fill" style="width: {syncProgress}%"></div>
						</div>
						<p class="progress-text">{syncProgress}% Complete</p>
					</div>
				{:else if syncStatus === 'completed'}
					<div class="status-completed">
						<div class="status-icon">✅</div>
						<h3>Sync Completed Successfully!</h3>
						{#if syncResults}
							<div class="results-summary">
								<div class="result-item">
									<span class="result-label">Products Imported:</span>
									<span class="result-value">{syncResults.imported}</span>
								</div>
								<div class="result-item">
									<span class="result-label">Products Updated:</span>
									<span class="result-value">{syncResults.updated}</span>
								</div>
								<div class="result-item">
									<span class="result-label">Collections Processed:</span>
									<span class="result-value">{syncResults.collections || 0}</span>
								</div>
								<div class="result-item">
									<span class="result-label">Errors:</span>
									<span class="result-value">{syncResults.errors}</span>
								</div>
							</div>
						{/if}
						<div class="action-buttons">
							<button class="btn-primary" onclick={() => goto('/products')}>
								View Products
							</button>
							<button class="btn-secondary" onclick={resetSync}>
								Sync Again
							</button>
						</div>
					</div>
				{:else if syncStatus === 'error'}
					<div class="status-error">
						<div class="status-icon">❌</div>
						<h3>Sync Failed</h3>
						<p class="error-message">{errorMessage}</p>
						<button class="btn-secondary" onclick={resetSync}>
							Try Again
						</button>
					</div>
				{/if}
				</div>
			</div>

			<!-- Sync Logs Card -->
			<div class="logs-card">
				<div class="card-header">
					<div class="logs-header">
						<h2>Sync Logs</h2>
						<div class="logs-controls">
							<button 
								class="btn-secondary btn-sm" 
								onclick={() => showLogs = !showLogs}
							>
								{showLogs ? 'Hide' : 'Show'} Logs
							</button>
							{#if syncLogs.length > 0}
								<button class="btn-secondary btn-sm" onclick={clearLogs}>
									Clear
								</button>
							{/if}
						</div>
					</div>
				</div>
				
				{#if showLogs}
					<div class="logs-content">
						{#if syncLogs.length === 0}
							<div class="logs-empty">
								<div class="empty-icon">📋</div>
								<p>No logs yet</p>
								<p class="empty-hint">Logs will appear here during sync</p>
							</div>
						{:else}
							<div class="logs-list">
								{#each syncLogs as log (log.id)}
									<div class="log-entry log-{log.type}">
										<span class="log-timestamp">{log.timestamp}</span>
										<span class="log-message">{log.message}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Toast Notifications -->
{#if toasts.length > 0}
	<div class="toast-container">
		{#each toasts as toast (toast.id)}
			<div class="toast toast-{toast.type}">
				<div class="toast-content">
					{#if toast.type === 'success'}
						<span class="toast-icon">✓</span>
					{:else if toast.type === 'error'}
						<span class="toast-icon">⚠</span>
					{:else}
						<span class="toast-icon">ℹ</span>
					{/if}
					<span class="toast-message">{toast.message}</span>
				</div>
				<button class="toast-close" onclick={() => removeToast(toast.id)}>×</button>
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
		padding: 2rem;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.header-main h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #202223;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-icon {
		font-size: 1.25rem;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.page-description {
		margin: 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.page-content {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-card, .status-card, .logs-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		overflow: hidden;
	}

	.sync-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	.card-header {
		padding: 2rem 2rem 1rem;
		border-bottom: 1px solid #f0f0f0;
	}

	.card-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
	}

	.card-header p {
		margin: 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.card-content {
		padding: 2rem;
	}

	.settings-section {
		margin-bottom: 2rem;
	}

	.settings-section:last-child {
		margin-bottom: 0;
	}

	.settings-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.setting-item {
		display: flex;
		flex-direction: column;
	}

	.setting-item label {
		font-weight: 500;
		color: #202223;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.setting-input, .setting-select {
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 8px;
		font-size: 0.875rem;
		transition: border-color 0.15s ease;
		background: white;
	}

	.setting-input:focus, .setting-select:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 3px rgba(0, 91, 211, 0.1);
	}

	.setting-help {
		font-size: 0.75rem;
		color: #6d7175;
		margin-top: 0.25rem;
	}

	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.checkbox-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		cursor: pointer;
	}

	.checkbox-item input[type="checkbox"] {
		margin-top: 0.125rem;
		width: 16px;
		height: 16px;
	}

	.checkbox-label {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
	}

	.checkbox-help {
		font-size: 0.75rem;
		color: #6d7175;
		margin-top: 0.25rem;
	}

	.collection-controls {
		margin-bottom: 1rem;
	}

	.control-buttons {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.selection-count {
		font-size: 0.875rem;
		color: #6d7175;
		font-weight: 500;
	}

	.collections-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
		max-height: 400px;
		overflow-y: auto;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 1rem;
		background: #fafbfb;
	}

	.collection-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.collection-item:hover {
		background: #f6f6f7;
		border-color: #c9cccf;
	}

	.collection-item input[type="checkbox"] {
		width: 16px;
		height: 16px;
	}

	.collection-info {
		flex: 1;
	}

	.collection-name {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.collection-meta {
		font-size: 0.75rem;
		color: #6d7175;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem;
		text-align: center;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #f0f0f0;
		border-top-color: #005bd3;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #6d7175;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.6;
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	.empty-hint {
		font-size: 0.875rem;
		opacity: 0.8;
	}

	/* Status Styles */
	.status-idle, .status-syncing, .status-completed, .status-error {
		text-align: center;
		padding: 2rem;
	}

	.status-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.status-idle h3, .status-syncing h3, .status-completed h3, .status-error h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
	}

	.status-idle p, .status-syncing p, .status-completed p, .status-error p {
		margin: 0 0 1.5rem 0;
		color: #6d7175;
	}

	.progress-bar {
		width: 100%;
		max-width: 400px;
		height: 8px;
		background: #f0f0f0;
		border-radius: 4px;
		margin: 1rem auto;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: #00a96e;
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.progress-text {
		font-weight: 600;
		color: #202223;
		margin: 0.5rem 0 0 0;
	}

	.results-summary {
		background: #f6f6f7;
		border-radius: 8px;
		padding: 1.5rem;
		margin: 1rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.result-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.result-label {
		font-weight: 500;
		color: #6d7175;
	}

	.result-value {
		font-weight: 600;
		color: #202223;
		font-size: 1.125rem;
	}

	.action-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 1rem;
		border-radius: 6px;
		font-family: monospace;
		font-size: 0.875rem;
	}

	.warning-text {
		color: #d97706;
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	/* Button Styles */
	.btn-primary, .btn-secondary {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
	}

	.btn-primary {
		background: #005bd3;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #004bb5;
	}

	.btn-primary:disabled {
		background: #c9cccf;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f6f6f7;
		border-color: #b3b7bb;
	}

	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-large {
		padding: 1rem 2rem;
		font-size: 1rem;
	}

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
	}

	/* Toast Notifications */
	.toast-container {
		position: fixed;
		top: 5rem;
		right: 2rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		pointer-events: none;
	}

	.toast {
		background: white;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
		border: 1px solid #e1e3e5;
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-width: 320px;
		max-width: 480px;
		pointer-events: auto;
		animation: slideIn 0.3s ease-out;
	}

	.toast-success {
		border-left: 4px solid #00a96e;
	}

	.toast-error {
		border-left: 4px solid #d72c0d;
	}

	.toast-info {
		border-left: 4px solid #005bd3;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.toast-icon {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.toast-success .toast-icon {
		background: #00a96e;
		color: white;
	}

	.toast-error .toast-icon {
		background: #d72c0d;
		color: white;
	}

	.toast-info .toast-icon {
		background: #005bd3;
		color: white;
	}

	.toast-message {
		font-size: 0.875rem;
		color: #202223;
		font-weight: 500;
	}

	.toast-close {
		background: none;
		border: none;
		color: #6d7175;
		cursor: pointer;
		font-size: 1.25rem;
		padding: 0;
		margin-left: 1rem;
		transition: color 0.15s ease;
	}

	.toast-close:hover {
		color: #202223;
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

	/* Logs Styles */
	.logs-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.logs-controls {
		display: flex;
		gap: 0.5rem;
	}

	.logs-content {
		max-height: 500px;
		overflow-y: auto;
		background: #fafbfb;
		border-top: 1px solid #f0f0f0;
	}

	.logs-empty {
		text-align: center;
		padding: 3rem 2rem;
		color: #6d7175;
	}

	.logs-empty .empty-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
		opacity: 0.6;
	}

	.logs-empty p {
		margin: 0.5rem 0;
	}

	.logs-empty .empty-hint {
		font-size: 0.875rem;
		opacity: 0.8;
	}

	.logs-list {
		padding: 0;
	}

	.log-entry {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid #f0f0f0;
		font-family: monospace;
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	.log-entry:last-child {
		border-bottom: none;
	}

	.log-timestamp {
		color: #6d7175;
		font-weight: 500;
		white-space: nowrap;
		min-width: 80px;
	}

	.log-message {
		flex: 1;
		word-break: break-word;
	}

	.log-entry.log-info {
		background: white;
	}

	.log-entry.log-info .log-message {
		color: #202223;
	}

	.log-entry.log-success {
		background: #f0fdf4;
		border-left: 3px solid #00a96e;
	}

	.log-entry.log-success .log-message {
		color: #047857;
		font-weight: 500;
	}

	.log-entry.log-error {
		background: #fef2f2;
		border-left: 3px solid #d72c0d;
	}

	.log-entry.log-error .log-message {
		color: #991b1b;
		font-weight: 500;
	}

	.log-entry.log-warning {
		background: #fffbeb;
		border-left: 3px solid #d97706;
	}

	.log-entry.log-warning .log-message {
		color: #92400e;
		font-weight: 500;
	}

	@media (max-width: 1200px) {
		.sync-layout {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}

		.card-header {
			padding: 1.5rem 1.5rem 1rem;
		}

		.card-content {
			padding: 1.5rem;
		}

		.settings-grid {
			grid-template-columns: 1fr;
		}

		.collections-grid {
			grid-template-columns: 1fr;
		}

		.control-buttons {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.action-buttons {
			flex-direction: column;
		}

		.logs-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.logs-content {
			max-height: 300px;
		}

		.log-entry {
			flex-direction: column;
			gap: 0.25rem;
		}

		.log-timestamp {
			min-width: auto;
		}
	}
</style>