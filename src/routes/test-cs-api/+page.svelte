<script lang="ts">
	import { CommentSoldAPI, CommentSoldProduct, CommentSoldCollection } from '$lib/commentsold-api.js';

	// State variables
	let apiResults = $state('');
	let isLoading = $state(false);
	let testLogs = $state([]);
	let selectedTest = $state('');
	let logIdCounter = 0;

	// Test settings
	let testSettings = $state({
		baseUrl: 'https://api.commentsold.com/api/2.0/divas',
		productId: 59544, // Example product ID from your description
		collectionId: 1,
		maxProducts: 10
	});

	// Initialize API client
	let api = new CommentSoldAPI(testSettings.baseUrl);

	// Add log entry
	function addLog(message, type = 'info', data = null) {
		const timestamp = new Date().toLocaleTimeString();
		const logEntry = {
			id: ++logIdCounter, // Use incrementing counter for unique IDs
			timestamp,
			message,
			type,
			data: data ? JSON.stringify(data, null, 2) : null
		};
		testLogs = [...testLogs, logEntry];
		
		// Auto-scroll logs to bottom
		setTimeout(() => {
			const logsContainer = document.querySelector('.test-logs-content');
			if (logsContainer) {
				logsContainer.scrollTop = logsContainer.scrollHeight;
			}
		}, 100);
	}

	// Clear logs
	function clearLogs() {
		testLogs = [];
		apiResults = '';
		logIdCounter = 0; // Reset counter
	}

	// Test Collections API
	async function testGetCollections() {
		if (isLoading) return;
		
		selectedTest = 'collections';
		isLoading = true;
		
		try {
			addLog('🔄 Testing getCollections()...', 'info');
			addLog(`📡 Fetching from: ${testSettings.baseUrl}/collections`, 'info');
			
			const collections = await api.getCollections();
			
			addLog(`✅ Successfully fetched ${collections.length} collections`, 'success');
			
			if (collections.length > 0) {
				addLog('📋 Sample collections:', 'info', collections.slice(0, 3));
				apiResults = JSON.stringify(collections, null, 2);
			} else {
				addLog('⚠️ No collections returned', 'warning');
				apiResults = 'No collections found';
			}
			
		} catch (error) {
			addLog(`❌ Error testing getCollections: ${error.message}`, 'error');
			apiResults = `Error: ${error.message}`;
		} finally {
			isLoading = false;
		}
	}

	// Test Products API
	async function testGetProducts() {
		if (isLoading) return;
		
		selectedTest = 'products';
		isLoading = true;
		
		try {
			addLog('🔄 Testing getProducts()...', 'info');
			addLog(`📡 Fetching from: ${testSettings.baseUrl}/products/find`, 'info');
			
			const response = await api.getProducts();
			
			addLog(`✅ Successfully fetched products response`, 'success');
			addLog(`📦 Found ${response.products.length} products (total: ${response.total})`, 'info');
			
			if (response.products.length > 0) {
				const sampleProducts = response.products.slice(0, 3).map(p => ({
					productId: p.productId,
					productName: p.productName,
					price: p.price,
					quantity: p.quantity,
					imageUrl: p.imageUrl
				}));
				addLog('📋 Sample products:', 'info', sampleProducts);
				apiResults = JSON.stringify(response, null, 2);
			} else {
				addLog('⚠️ No products returned', 'warning');
				apiResults = 'No products found';
			}
			
		} catch (error) {
			addLog(`❌ Error testing getProducts: ${error.message}`, 'error');
			apiResults = `Error: ${error.message}`;
		} finally {
			isLoading = false;
		}
	}

	// Test Product Details API
	async function testGetProductDetails() {
		if (isLoading) return;
		
		selectedTest = 'product-details';
		isLoading = true;
		
		try {
			addLog(`🔄 Testing getProductDetails(${testSettings.productId})...`, 'info');
			addLog(`📡 Fetching from: ${testSettings.baseUrl}/products/${testSettings.productId}`, 'info');
			
			const product = await api.getProductDetails(testSettings.productId);
			
			if (product) {
				addLog(`✅ Successfully fetched product details`, 'success');
				addLog(`📦 Product: ${product.productName}`, 'info');
				addLog(`💰 Price: ${product.price}`, 'info');
				addLog(`📊 Quantity: ${product.quantity}`, 'info');
				addLog(`🖼️ Images: ${product.allImageUrls.length}`, 'info');
				addLog(`📹 Videos: ${product.allVideoUrls.length}`, 'info');
				
				apiResults = JSON.stringify(product, null, 2);
			} else {
				addLog(`⚠️ No product found for ID ${testSettings.productId}`, 'warning');
				apiResults = `No product found for ID ${testSettings.productId}`;
			}
			
		} catch (error) {
			addLog(`❌ Error testing getProductDetails: ${error.message}`, 'error');
			apiResults = `Error: ${error.message}`;
		} finally {
			isLoading = false;
		}
	}

	// Test Collection Products API
	async function testGetCollectionProducts() {
		if (isLoading) return;
		
		selectedTest = 'collection-products';
		isLoading = true;
		
		try {
			addLog(`🔄 Testing getAllProductsFromCollection(${testSettings.collectionId})...`, 'info');
			addLog(`📡 Max products: ${testSettings.maxProducts}`, 'info');
			
			const products = await api.getAllProductsFromCollection(
				testSettings.collectionId, 
				testSettings.maxProducts
			);
			
			addLog(`✅ Successfully fetched ${products.length} products from collection`, 'success');
			
			if (products.length > 0) {
				const sampleProducts = products.slice(0, 3).map(p => ({
					productId: p.productId,
					productName: p.productName,
					price: p.price,
					quantity: p.quantity
				}));
				addLog('📋 Sample products from collection:', 'info', sampleProducts);
				apiResults = JSON.stringify(products, null, 2);
			} else {
				addLog(`⚠️ No products found in collection ${testSettings.collectionId}`, 'warning');
				apiResults = `No products found in collection ${testSettings.collectionId}`;
			}
			
		} catch (error) {
			addLog(`❌ Error testing getAllProductsFromCollection: ${error.message}`, 'error');
			apiResults = `Error: ${error.message}`;
		} finally {
			isLoading = false;
		}
	}

	// Test CORS and basic connectivity
	async function testConnectivity() {
		if (isLoading) return;
		
		selectedTest = 'connectivity';
		isLoading = true;
		
		try {
			addLog('🔄 Testing basic connectivity to CommentSold API...', 'info');
			addLog(`📡 Testing URL: ${testSettings.baseUrl}/collections`, 'info');
			
			const response = await fetch(`${testSettings.baseUrl}/collections`, {
				method: 'GET',
				headers: {
					'User-Agent': 'CommentSold-SvelteKit-Test/1.0',
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				}
			});
			
			addLog(`📊 Response Status: ${response.status} ${response.statusText}`, 'info');
			addLog(`📋 Response Headers:`, 'info', Object.fromEntries(response.headers.entries()));
			
			if (response.ok) {
				const data = await response.json();
				addLog(`✅ Connectivity test successful`, 'success');
				addLog(`📦 Response type: ${Array.isArray(data) ? 'Array' : typeof data}`, 'info');
				addLog(`📊 Data length: ${Array.isArray(data) ? data.length : 'N/A'}`, 'info');
				
				apiResults = JSON.stringify(data, null, 2);
			} else {
				addLog(`❌ HTTP Error: ${response.status} ${response.statusText}`, 'error');
				const errorText = await response.text();
				apiResults = `HTTP ${response.status}: ${errorText}`;
			}
			
		} catch (error) {
			addLog(`❌ Network error: ${error.message}`, 'error');
			addLog(`🔍 Error details: ${error.name}`, 'error');
			apiResults = `Network Error: ${error.message}`;
		} finally {
			isLoading = false;
		}
	}

	// Update API client when base URL changes
	function updateAPI() {
		api = new CommentSoldAPI(testSettings.baseUrl);
		addLog(`🔄 Updated API client with base URL: ${testSettings.baseUrl}`, 'info');
	}
</script>

<svelte:head>
	<title>CommentSold API Test - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">🧪</span>
				CommentSold API Test
			</h1>
		</div>
		<p class="page-description">
			Test the CommentSold API library functionality and connectivity.
		</p>
	</div>

	<div class="page-content">
		<!-- Test Settings Card -->
		<div class="settings-card">
			<div class="card-header">
				<h2>Test Settings</h2>
				<p>Configure API endpoints and test parameters</p>
			</div>
			
			<div class="card-content">
				<div class="settings-grid">
					<div class="setting-item">
						<label for="baseUrl">Base URL</label>
						<input 
							id="baseUrl"
							type="text" 
							bind:value={testSettings.baseUrl}
							class="setting-input"
							onchange={updateAPI}
						/>
					</div>
					
					<div class="setting-item">
						<label for="productId">Test Product ID</label>
						<input 
							id="productId"
							type="number" 
							bind:value={testSettings.productId}
							class="setting-input"
						/>
					</div>
					
					<div class="setting-item">
						<label for="collectionId">Test Collection ID</label>
						<input 
							id="collectionId"
							type="number" 
							bind:value={testSettings.collectionId}
							class="setting-input"
						/>
					</div>
					
					<div class="setting-item">
						<label for="maxProducts">Max Products</label>
						<input 
							id="maxProducts"
							type="number" 
							bind:value={testSettings.maxProducts}
							min="1"
							max="100"
							class="setting-input"
						/>
					</div>
				</div>
			</div>
		</div>

		<!-- Test Controls Card -->
		<div class="controls-card">
			<div class="card-header">
				<h2>API Tests</h2>
				<div class="controls-actions">
					<button class="btn-secondary btn-sm" onclick={clearLogs}>
						Clear Logs
					</button>
				</div>
			</div>
			
			<div class="card-content">
				<div class="test-buttons">
					<button 
						class="btn-test {selectedTest === 'connectivity' ? 'active' : ''}" 
						onclick={testConnectivity}
						disabled={isLoading}
					>
						<span class="test-icon">🌐</span>
						<span class="test-label">Test Connectivity</span>
					</button>
					
					<button 
						class="btn-test {selectedTest === 'collections' ? 'active' : ''}" 
						onclick={testGetCollections}
						disabled={isLoading}
					>
						<span class="test-icon">📂</span>
						<span class="test-label">Get Collections</span>
					</button>
					
					<button 
						class="btn-test {selectedTest === 'products' ? 'active' : ''}" 
						onclick={testGetProducts}
						disabled={isLoading}
					>
						<span class="test-icon">📦</span>
						<span class="test-label">Get Products</span>
					</button>
					
					<button 
						class="btn-test {selectedTest === 'product-details' ? 'active' : ''}" 
						onclick={testGetProductDetails}
						disabled={isLoading}
					>
						<span class="test-icon">🔍</span>
						<span class="test-label">Get Product Details</span>
					</button>
					
					<button 
						class="btn-test {selectedTest === 'collection-products' ? 'active' : ''}" 
						onclick={testGetCollectionProducts}
						disabled={isLoading}
					>
						<span class="test-icon">📋</span>
						<span class="test-label">Collection Products</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Results Layout -->
		<div class="results-layout">
			<!-- Logs Card -->
			<div class="logs-card">
				<div class="card-header">
					<h2>Test Logs</h2>
					<div class="logs-status">
						{#if isLoading}
							<div class="loading-indicator">
								<div class="loading-spinner"></div>
								<span>Testing...</span>
							</div>
						{:else if testLogs.length > 0}
							<span class="logs-count">{testLogs.length} entries</span>
						{/if}
					</div>
				</div>
				
				<div class="test-logs-content">
					{#if testLogs.length === 0}
						<div class="logs-empty">
							<div class="empty-icon">📋</div>
							<p>No test logs yet</p>
							<p class="empty-hint">Run a test to see detailed logs</p>
						</div>
					{:else}
						<div class="logs-list">
							{#each testLogs as log (log.id)}
								<div class="log-entry log-{log.type}">
									<div class="log-header">
										<span class="log-timestamp">{log.timestamp}</span>
										<span class="log-message">{log.message}</span>
									</div>
									{#if log.data}
										<div class="log-data">
											<pre>{log.data}</pre>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Results Card -->
			<div class="results-card">
				<div class="card-header">
					<h2>API Response</h2>
					{#if apiResults}
						<button 
							class="btn-secondary btn-sm" 
							onclick={() => navigator.clipboard.writeText(apiResults)}
						>
							Copy
						</button>
					{/if}
				</div>
				
				<div class="results-content">
					{#if !apiResults}
						<div class="results-empty">
							<div class="empty-icon">📄</div>
							<p>No results yet</p>
							<p class="empty-hint">Run a test to see API responses</p>
						</div>
					{:else}
						<div class="results-data">
							<pre>{apiResults}</pre>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

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

	.page-description {
		margin: 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.page-content {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-card, .controls-card, .logs-card, .results-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		overflow: hidden;
	}

	.card-header {
		padding: 2rem 2rem 1rem;
		border-bottom: 1px solid #f0f0f0;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.card-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
	}

	.card-header p {
		margin: 0.5rem 0 0 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.card-content {
		padding: 2rem;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

	.setting-input {
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 8px;
		font-size: 0.875rem;
		transition: border-color 0.15s ease;
		background: white;
	}

	.setting-input:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 3px rgba(0, 91, 211, 0.1);
	}

	.controls-actions {
		display: flex;
		gap: 0.5rem;
	}

	.test-buttons {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.btn-test {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 1rem;
		background: white;
		border: 2px solid #e1e1e1;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: center;
	}

	.btn-test:hover:not(:disabled) {
		border-color: #005bd3;
		background: #f6f6f7;
	}

	.btn-test.active {
		border-color: #005bd3;
		background: #f0f9ff;
	}

	.btn-test:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.test-icon {
		font-size: 2rem;
	}

	.test-label {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
	}

	.results-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	.logs-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.loading-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid #f0f0f0;
		border-top-color: #005bd3;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.logs-count {
		font-size: 0.875rem;
		color: #6d7175;
		font-weight: 500;
	}

	.test-logs-content, .results-content {
		max-height: 600px;
		overflow-y: auto;
		background: #fafbfb;
		border-top: 1px solid #f0f0f0;
	}

	.logs-empty, .results-empty {
		text-align: center;
		padding: 3rem 2rem;
		color: #6d7175;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.6;
	}

	.logs-empty p, .results-empty p {
		margin: 0.5rem 0;
	}

	.empty-hint {
		font-size: 0.875rem;
		opacity: 0.8;
	}

	.logs-list {
		padding: 0;
	}

	.log-entry {
		border-bottom: 1px solid #f0f0f0;
		padding: 1rem 1.5rem;
	}

	.log-entry:last-child {
		border-bottom: none;
	}

	.log-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.log-timestamp {
		color: #6d7175;
		font-weight: 500;
		white-space: nowrap;
		min-width: 80px;
		font-family: monospace;
		font-size: 0.8125rem;
	}

	.log-message {
		flex: 1;
		word-break: break-word;
		font-size: 0.875rem;
	}

	.log-data {
		margin-top: 0.5rem;
		background: #f0f0f0;
		border-radius: 6px;
		padding: 1rem;
		border-left: 3px solid #c9cccf;
	}

	.log-data pre {
		margin: 0;
		font-family: monospace;
		font-size: 0.75rem;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 200px;
		overflow-y: auto;
	}

	.log-entry.log-info {
		background: white;
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

	.results-data {
		padding: 1.5rem;
	}

	.results-data pre {
		margin: 0;
		font-family: monospace;
		font-size: 0.8125rem;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
		color: #202223;
	}

	.btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover {
		background: #f6f6f7;
		border-color: #b3b7bb;
	}

	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
	}

	@media (max-width: 1200px) {
		.results-layout {
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

		.test-buttons {
			grid-template-columns: 1fr;
		}

		.test-logs-content, .results-content {
			max-height: 400px;
		}

		.log-header {
			flex-direction: column;
			gap: 0.25rem;
			align-items: flex-start;
		}

		.log-timestamp {
			min-width: auto;
		}
	}
</style>