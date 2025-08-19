<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { locationsState, locationsActions } from '$lib/state/locations.svelte.js';
	import { InventoryService } from '$lib/services/InventoryService.js';
	import { ToastService } from '$lib/services/ToastService.js';
	
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import LocationInventoryCard from '$lib/components/inventory/LocationInventoryCard.svelte';
	import StockTransferModal from '$lib/components/inventory/StockTransferModal.svelte';

	// State management
	let locations = $state([]);
	let inventoryByLocation = $state({});
	let loading = $state(true);
	let error = $state('');
	
	// Modal state
	let showTransferModal = $state(false);
	let transferModalData = $state({
		sourceLocation: null,
		targetLocation: null,
		availableItems: []
	});

	// Summary metrics
	let summaryMetrics = $derived(() => {
		const totals = {
			totalLocations: locations.length,
			totalItems: 0,
			totalValue: 0,
			locationsWithStock: 0,
			lowStockAlerts: 0
		};

		locations.forEach(location => {
			const locationInventory = inventoryByLocation[location.id] || [];
			if (locationInventory.length > 0) {
				totals.locationsWithStock++;
			}
			
			locationInventory.forEach(item => {
				totals.totalItems += item.availableCount || 0;
				totals.totalValue += (item.availableCount || 0) * (item.cost || item.price || 0);
				
				if (InventoryService.isLowStock(item)) {
					totals.lowStockAlerts++;
				}
			});
		});

		return totals;
	});

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = '';
		
		try {
			// Load locations and inventory data in parallel
			const [locationsResult, inventoryResult] = await Promise.all([
				loadLocations(),
				loadInventoryByLocation()
			]);
			
			locations = locationsResult;
			inventoryByLocation = inventoryResult;
			
		} catch (err) {
			console.error('Error loading multi-location inventory:', err);
			error = err.message || 'Failed to load inventory data';
		} finally {
			loading = false;
		}
	}

	async function loadLocations() {
		const response = await fetch('/api/locations');
		if (!response.ok) {
			throw new Error(`Failed to load locations: ${response.status}`);
		}
		return await response.json();
	}

	async function loadInventoryByLocation() {
		const response = await fetch('/api/inventory/by-location');
		if (!response.ok) {
			throw new Error(`Failed to load inventory by location: ${response.status}`);
		}
		return await response.json();
	}

	function handleTransferStock(sourceLocation) {
		transferModalData = {
			sourceLocation,
			targetLocation: null,
			availableItems: inventoryByLocation[sourceLocation.id] || []
		};
		showTransferModal = true;
	}

	function handleAdjustStock(item, location) {
		// Navigate to inventory page with location and item filters
		goto(`/inventory?location=${encodeURIComponent(location.name)}&search=${encodeURIComponent(item.formattedSKU || item.product_name)}`);
	}

	function closeTransferModal() {
		showTransferModal = false;
		transferModalData = {
			sourceLocation: null,
			targetLocation: null,
			availableItems: []
		};
	}

	async function handleTransferComplete(result) {
		ToastService.show('Stock transfer completed successfully', 'success');
		
		// Reload inventory data to reflect the transfer
		await loadData();
	}

	function handleRetry() {
		loadData();
	}

	function goToInventoryPage() {
		goto('/inventory');
	}

	function goToLocationSettings() {
		goto('/settings/locations');
	}
</script>

<svelte:head>
	<title>Multi-Location Inventory - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb">
					<a href="/inventory" class="breadcrumb-item">📊 Inventory</a>
					<span class="breadcrumb-separator">›</span>
					<span class="breadcrumb-item current">Multi-Location View</span>
				</div>
			</div>
			<div class="page-actions">
				<button class="btn btn-secondary" onclick={goToLocationSettings}>
					⚙️ Manage Locations
				</button>
				<button class="btn btn-primary" onclick={goToInventoryPage}>
					📋 Inventory List
				</button>
			</div>
		</div>
		<p class="page-description">
			Monitor and manage inventory across all your business locations. Transfer stock between locations and track inventory levels in real-time.
		</p>
	</div>

	<div class="page-content-padded">
		{#if loading}
			<LoadingState 
				message="Loading multi-location inventory..." 
				subMessage="Please wait while we gather inventory data from all locations"
				size="lg" 
			/>
		{:else if error}
			<ErrorState 
				error={error}
				onRetry={handleRetry}
				showBackButton={false}
			/>
		{:else if locations.length === 0}
			<EmptyState 
				icon="📍"
				title="No locations configured"
				message="Set up your business locations to track inventory across multiple sites"
				actionText="Add Location"
				actionHref="/settings/locations"
			/>
		{:else}
			<!-- Summary Metrics -->
			<div class="content-section">
				<div class="content-header">
					<h2 class="content-title">Inventory Overview</h2>
					<p class="content-description">Summary of inventory across all locations</p>
				</div>
				
				<div class="metrics-grid">
					<div class="metric-card">
						<div class="metric-card-icon">📍</div>
						<div class="metric-card-value">{summaryMetrics.totalLocations}</div>
						<div class="metric-card-label">Total Locations</div>
						<div class="metric-card-sublabel">{summaryMetrics.locationsWithStock} with inventory</div>
					</div>
					
					<div class="metric-card metric-card-success">
						<div class="metric-card-icon">📦</div>
						<div class="metric-card-value">{summaryMetrics.totalItems.toLocaleString()}</div>
						<div class="metric-card-label">Total Items</div>
						<div class="metric-card-sublabel">Across all locations</div>
					</div>
					
					<div class="metric-card metric-card-accent">
						<div class="metric-card-icon">💰</div>
						<div class="metric-card-value">{InventoryService.formatCurrency(summaryMetrics.totalValue)}</div>
						<div class="metric-card-label">Total Value</div>
						<div class="metric-card-sublabel">Cost basis</div>
					</div>
					
					<div class="metric-card" class:metric-card-warning={summaryMetrics.lowStockAlerts > 0}>
						<div class="metric-card-icon">⚠️</div>
						<div class="metric-card-value">{summaryMetrics.lowStockAlerts}</div>
						<div class="metric-card-label">Low Stock Alerts</div>
						<div class="metric-card-sublabel">Requires attention</div>
					</div>
				</div>
			</div>

			<!-- Location Cards -->
			<div class="content-section">
				<div class="content-header">
					<h2 class="content-title">Location Inventory</h2>
					<p class="content-description">Detailed inventory view for each location</p>
				</div>
				
				<div class="locations-grid">
					{#each locations as location}
						<LocationInventoryCard
							{location}
							inventoryItems={inventoryByLocation[location.id] || []}
							onTransferStock={handleTransferStock}
							onAdjustStock={handleAdjustStock}
							loading={loading}
						/>
					{/each}
				</div>
			</div>

			<!-- Quick Actions -->
			<div class="content-section">
				<div class="quick-actions">
					<h3 class="quick-actions-title">Quick Actions</h3>
					<div class="quick-actions-grid">
						<button class="quick-action-card" onclick={goToInventoryPage}>
							<div class="quick-action-icon">📋</div>
							<div class="quick-action-title">View All Inventory</div>
							<div class="quick-action-description">See detailed inventory list with filtering options</div>
						</button>
						
						<button class="quick-action-card" onclick={goToLocationSettings}>
							<div class="quick-action-icon">⚙️</div>
							<div class="quick-action-title">Manage Locations</div>
							<div class="quick-action-description">Add, edit, or configure business locations</div>
						</button>
						
						<button class="quick-action-card" onclick={() => goto('/inventory/reports')}>
							<div class="quick-action-icon">📊</div>
							<div class="quick-action-title">Inventory Reports</div>
							<div class="quick-action-description">Generate detailed inventory and movement reports</div>
						</button>
						
						<button class="quick-action-card" onclick={() => goto('/inventory/low-stock')}>
							<div class="quick-action-icon">⚠️</div>
							<div class="quick-action-title">Low Stock Alerts</div>
							<div class="quick-action-description">Review items that need restocking</div>
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Stock Transfer Modal -->
<StockTransferModal
	show={showTransferModal}
	sourceLocation={transferModalData.sourceLocation}
	targetLocation={transferModalData.targetLocation}
	availableItems={transferModalData.availableItems}
	{locations}
	onClose={closeTransferModal}
	onTransferComplete={handleTransferComplete}
/>

<style>
	.page-description {
		margin: var(--space-2) 0 0 0;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		padding: 0 var(--space-8);
	}
	
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}

	.metric-card-icon {
		font-size: var(--font-size-xl);
		margin-bottom: var(--space-2);
	}

	.metric-card-sublabel {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-top: var(--space-1);
		opacity: 0.8;
	}

	.locations-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: var(--space-6);
		margin-bottom: var(--space-8);
	}

	.quick-actions {
		background: var(--color-surface-secondary);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
	}

	.quick-actions-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-4) 0;
	}

	.quick-actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-4);
	}

	.quick-action-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		transition: all 0.2s ease;
		cursor: pointer;
		text-align: left;
	}

	.quick-action-card:hover {
		border-color: var(--color-primary);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.quick-action-icon {
		font-size: var(--font-size-xl);
		margin-bottom: var(--space-2);
	}

	.quick-action-title {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--space-1);
	}

	.quick-action-description {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		line-height: var(--line-height-relaxed);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.locations-grid {
			grid-template-columns: 1fr;
		}
		
		.quick-actions-grid {
			grid-template-columns: 1fr;
		}
		
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
	}
</style>