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

	// Load data on mount
	onMount(() => {
		locationsActions.loadLocations();
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
			<h1 class="page-title">
				<span class="page-icon">📍</span>
				Locations
			</h1>
			<div class="page-actions">
				<button 
					class="btn-primary"
					onclick={handleAddLocation}
					disabled={locationsState.operationLoading.creating}
				>
					Add location
				</button>
			</div>
		</div>
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
				<!-- Location metrics using reactive derived values -->
				<div class="metrics-grid">
					<div class="metric-card metric-card-bordered metric-card-accent">
						<div class="metric-card-value">{metrics.total}</div>
						<div class="metric-card-label">Total Locations</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-success">
						<div class="metric-card-value">{metrics.active}</div>
						<div class="metric-card-label">Active Locations</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-warning">
						<div class="metric-card-value">{metrics.fulfillmentCenters}</div>
						<div class="metric-card-label">Fulfillment Centers</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-info">
						<div class="metric-card-value">{metrics.pickupLocations}</div>
						<div class="metric-card-label">Pickup Locations</div>
					</div>
				</div>

				<div class="table-container">
					<table class="data-table">
						<thead>
							<tr>
								<th>Location</th>
								<th>Address</th>
								<th>Type</th>
								<th>Status</th>
								<th>Actions</th>
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
													{#if location.is_default}
														<span class="status-badge status-info">Default</span>
													{/if}
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
										<span class="status-badge {location.status === 'active' ? 'status-success' : 'status-error'}">
											{location.status}
										</span>
									</td>
									<td>
										<div class="table-actions">
											{#if !location.is_default}
												<button 
													class="btn-ghost btn-sm"
													onclick={() => handleSetDefault(location)}
													disabled={locationsState.operationLoading.settingDefault}
													title="Set as default"
												>
													Set Default
												</button>
											{/if}
											<button 
												class="btn-ghost btn-sm"
												onclick={() => handleToggleLocationStatus(location)}
												disabled={locationsState.operationLoading.updating}
											>
												{location.status === 'active' ? 'Deactivate' : 'Activate'}
											</button>
										</div>
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
	.capability-badges {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-start;
	}

	.table-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
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
</style>