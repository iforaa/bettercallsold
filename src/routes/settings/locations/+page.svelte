<script>
	import { onMount } from 'svelte';
	import { locationsState, locationsActions, getFilteredLocations, getLocationMetrics } from '$lib/state/locations.svelte.js';
	import { toastService } from '$lib/services/ToastService.js';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';

	// Dynamic import to avoid SSR issues
	let AddLocationModal = $state();

	// Derived values using $derived
	let locations = $derived(getFilteredLocations());
	let metrics = $derived(getLocationMetrics());
	
	// New state for inventory data
	let inventoryByLocation = $state([]);
	let loadingInventory = $state(false);

	// Load inventory data for locations
	async function loadInventoryData() {
		loadingInventory = true;
		try {
			const response = await fetch('/api/test-migration?test=inventory_levels');
			const data = await response.json();
			inventoryByLocation = data.inventory_levels || [];
		} catch (error) {
			console.error('Error loading inventory data:', error);
		}
		loadingInventory = false;
	}

	// Load data on mount
	onMount(() => {
		locationsActions.loadLocations();
		loadInventoryData(); // Load inventory data too
	});

	// Event handlers
	function handleStatusFilter(status) {
		locationsActions.setFilter('status', status);
	}

	function handleSearch(event) {
		locationsActions.setFilter('search', event.target.value);
	}

	// Handle location actions
	async function handleAddLocation() {
		// Dynamic import the modal component
		if (!AddLocationModal) {
			const module = await import('$lib/components/locations/AddLocationModal.svelte');
			AddLocationModal = module.default;
		}
		locationsActions.showModal();
	}

	async function handleEditLocation(location) {
		// Dynamic import the modal component
		if (!AddLocationModal) {
			const module = await import('$lib/components/locations/AddLocationModal.svelte');
			AddLocationModal = module.default;
		}
		locationsActions.startEdit(location.id);
	}

	async function handleToggleLocationStatus(location) {
		const newStatus = location.status === 'active' ? 'inactive' : 'active';
		const action = newStatus === 'active' ? 'activate' : 'deactivate';
		
		try {
			// Send only the status update - API now handles partial updates
			await locationsActions.updateLocation(location.id, { status: newStatus });
			toastService.show(`Location ${action}d successfully`, 'success');
		} catch (error) {
			toastService.show(`Error ${action}ing location: ${error.message}`, 'error');
		}
	}

	async function handleSetDefault(location) {
		try {
			await locationsActions.setDefaultLocation(location.id);
			toastService.show(`${location.name} set as default location`, 'success');
		} catch (error) {
			toastService.show(`Error setting default location: ${error.message}`, 'error');
		}
	}

	function refreshPage() {
		locationsActions.loadLocations();
	}
</script>

<svelte:head>
	<title>Locations - BetterCallSold Settings</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb">
					<span class="breadcrumb-item">Settings</span>
					<span class="breadcrumb-separator">›</span>
					<span class="breadcrumb-item current">📍 Locations</span>
				</div>
			</div>
			<div class="page-actions">
				<button 
					class="btn btn-primary"
					onclick={handleAddLocation}
					disabled={locationsState.operationLoading.creating}
				>
					+ Add Location
				</button>
			</div>
		</div>
		<p class="page-description">
			Manage your business locations and configure fulfillment settings.
		</p>
	</div>

	<div class="page-content-padded">
		{#if locationsState.error}
			<ErrorState 
				error={locationsState.error}
				onRetry={locationsActions.retry}
				onBack={refreshPage}
				backLabel="Refresh Page"
			/>
		{:else if locationsState.loading}
			<LoadingState message="Loading locations..." size="lg" />
		{:else if locations && locations.length > 0}
			<div class="content-section">
				<div class="content-header">
					<div class="content-header-main">
						<h3 class="content-title">Business Locations</h3>
						<p class="content-description">Manage your physical locations and fulfillment capabilities</p>
					</div>
				</div>
				
				<!-- Location Summary Stats -->
				<div class="metrics-grid">
					<div class="metric-card">
						<div class="metric-card-value">{metrics.total}</div>
						<div class="metric-card-label">Total Locations</div>
					</div>
					<div class="metric-card metric-card-success">
						<div class="metric-card-value">{metrics.active}</div>
						<div class="metric-card-label">Active</div>
					</div>
					<div class="metric-card metric-card-warning">
						<div class="metric-card-value">{metrics.fulfillmentCenters}</div>
						<div class="metric-card-label">Fulfillment</div>
					</div>
					<div class="metric-card metric-card-accent">
						<div class="metric-card-value">{metrics.pickupLocations}</div>
						<div class="metric-card-label">Pickup</div>
					</div>
				</div>

				<div class="table-container">
					<table class="data-table">
						<thead>
							<tr>
								<th>Location</th>
								<th>Address</th>
								<th>Type</th>
								<th>Inventory</th>
								<th class="actions-header">Status</th>
								<th class="actions-header">Default</th>
								<th class="actions-header">Edit</th>
							</tr>
						</thead>
						<tbody>
							{#each locations as location}
								<tr>
									<td>
										<div class="table-cell-content">
											<div class="table-cell-details">
												<div class="table-cell-title">
													{location.name}
												</div>
												<div class="table-cell-subtitle">{location.description || ''}</div>
											</div>
										</div>
									</td>
									<td class="table-cell-text">
										{location.address_line_1}
										<br>
										{location.city}, {location.state_province} {location.postal_code}
									</td>
									<td>
										<div class="capability-badges">
											{#if location.is_fulfillment_center}
												<span class="status-badge status-accent">Fulfillment</span>
											{/if}
											{#if location.is_pickup_location}
												<span class="status-badge status-warning">Pickup</span>
											{/if}
										</div>
									</td>
									<td>
										{#if loadingInventory}
											<span class="loading-text">Loading...</span>
										{:else}
											{@const locationInventory = inventoryByLocation.filter(item => item.location_name === location.name)}
											{@const totalInventory = locationInventory.reduce((sum, item) => sum + (item.available || 0), 0)}
											{#if locationInventory.length > 0}
												<div class="inventory-summary">
													<div class="inventory-total">{totalInventory} items</div>
													<div class="inventory-subtitle">{locationInventory.length} products</div>
												</div>
											{:else}
												<span class="text-muted">No inventory</span>
											{/if}
										{/if}
									</td>
									<td class="action-cell">
										<button 
											class="btn btn-ghost btn-sm status-toggle {location.status === 'active' ? 'status-active' : 'status-inactive'}"
											onclick={() => handleToggleLocationStatus(location)}
											disabled={locationsState.operationLoading.updating}
											title={location.status === 'active' ? 'Click to deactivate' : 'Click to activate'}
										>
											{location.status === 'active' ? 'Active' : 'Inactive'}
										</button>
									</td>
									<td class="action-cell">
										{#if !location.is_default}
											<button 
												class="btn btn-ghost btn-sm"
												onclick={() => handleSetDefault(location)}
												disabled={locationsState.operationLoading.settingDefault}
												title="Set as default location"
											>
												☆ Set Default
											</button>
										{:else}
											<span class="default-indicator" title="This is the default location">
												⭐ Default
											</span>
										{/if}
									</td>
									<td class="action-cell">
										<button 
											class="btn btn-ghost btn-sm"
											onclick={() => handleEditLocation(location)}
											title="Edit location details"
										>
											✏️ Edit
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else}
			<EmptyState 
				icon="📍"
				title="No locations found"
				description="Locations will appear here when you add your first location."
				actions={[
					{ label: 'Add Location', onClick: handleAddLocation, primary: true }
				]}
			/>
		{/if}
	</div>
</div>

<!-- Add Location Modal -->
{#if locationsState.form.showModal}
	{#if AddLocationModal}
		<AddLocationModal />
	{:else}
		<div class="modal-backdrop">
			<div class="modal-container">
				<div class="modal-header">
					<h2>Add Location</h2>
					<button onclick={() => locationsActions.hideModal()}>×</button>
				</div>
				<div class="modal-content">
					<p>Loading modal...</p>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	/* Page description styling */
	.page-description {
		margin: var(--space-2) 0 0 0;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		padding: 0 var(--space-8);
	}
	
	/* Content header */
	.content-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}
	
	.content-header-main {
		flex: 1;
	}
	
	.content-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-2) 0;
	}
	
	.content-description {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
	}
	
	
	/* Table styling */
	.capability-badges {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-start;
	}

	.table-actions {
		display: flex;
		gap: var(--space-1);
		justify-content: center;
		align-items: center;
	}
	
	.actions-header {
		text-align: center;
		width: 120px;
	}
	
	.default-indicator {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		opacity: 0.7;
		cursor: default;
	}
	
	.action-cell {
		text-align: center;
	}
	
	/* Status toggle button styling */
	.status-toggle {
		min-width: 80px;
		font-weight: var(--font-weight-medium);
	}
	
	.status-toggle.status-active {
		color: var(--color-success);
		border-color: var(--color-success);
	}
	
	.status-toggle.status-active:hover:not(:disabled) {
		background: var(--color-success-bg);
	}
	
	.status-toggle.status-inactive {
		color: var(--color-text-muted);
		border-color: var(--color-border);
	}
	
	.status-toggle.status-inactive:hover:not(:disabled) {
		background: var(--color-surface);
		color: var(--color-text);
	}

	/* Modal styles */
	.modal-backdrop {
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
	}

	.modal-container {
		background: white;
		border-radius: 12px;
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
		width: 90%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #e1e1e1;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
	}

	.modal-header button {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #6d7175;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
	}

	.modal-content {
		padding: 2rem;
		text-align: center;
		color: #6d7175;
	}

	/* Inventory display styles */
	.inventory-summary {
		text-align: center;
	}
	
	.inventory-total {
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		font-size: var(--font-size-sm);
	}
	
	.inventory-subtitle {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-top: 0.125rem;
	}
	
	.loading-text {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-style: italic;
	}
	
	.text-muted {
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
	}
</style>