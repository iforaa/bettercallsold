<script>
	import { LocationService } from '$lib/services/LocationService.js';

	let { 
		metrics,
		locations,
		showDetailed = false,
		loading = false,
		onFilterChange,
		className = ''
	} = $props();
	
	// Compute metrics if not provided
	let displayMetrics = $derived.by(() => {
		if (metrics) return metrics;
		if (locations && locations.length > 0) {
			return LocationService.calculateMetrics(locations);
		}
		return null;
	});
	
	function handleFilterByStatus(status) {
		if (onFilterChange) {
			onFilterChange({ status });
		}
	}
	
	function handleFilterByType(type) {
		if (onFilterChange) {
			onFilterChange({ location_type: type });
		}
	}
	
	function handleFilterByCapability(capability) {
		if (onFilterChange) {
			const filter = {};
			if (capability === 'pickup') filter.is_pickup_location = true;
			if (capability === 'fulfillment') filter.is_fulfillment_center = true;
			onFilterChange(filter);
		}
	}
</script>

<div class="location-metrics {className}">
	{#if loading}
		<div class="metrics-loading">
			<div class="loading-spinner"></div>
			<p>Loading location analytics...</p>
		</div>
	{:else if displayMetrics}
		<div class="metrics-header">
			<h4 class="metrics-title">Location Analytics</h4>
		</div>
		
		<!-- Primary metrics grid -->
		<div class="metrics-grid">
			<div class="metric-card" onclick={() => handleFilterByStatus('all')}>
				<div class="metric-icon">📍</div>
				<div class="metric-content">
					<div class="metric-label">Total Locations</div>
					<div class="metric-value">{displayMetrics.total.toLocaleString()}</div>
				</div>
			</div>
			
			<div class="metric-card metric-clickable" onclick={() => handleFilterByStatus('active')}>
				<div class="metric-icon">✅</div>
				<div class="metric-content">
					<div class="metric-label">Active</div>
					<div class="metric-value status-success">{displayMetrics.active.toLocaleString()}</div>
				</div>
			</div>
			
			<div class="metric-card metric-clickable" onclick={() => handleFilterByCapability('fulfillment')}>
				<div class="metric-icon">📦</div>
				<div class="metric-content">
					<div class="metric-label">Fulfillment Centers</div>
					<div class="metric-value status-info">{displayMetrics.fulfillmentCenters.toLocaleString()}</div>
				</div>
			</div>
			
			<div class="metric-card metric-clickable" onclick={() => handleFilterByCapability('pickup')}>
				<div class="metric-icon">🏪</div>
				<div class="metric-content">
					<div class="metric-label">Pickup Locations</div>
					<div class="metric-value status-warning">{displayMetrics.pickupLocations.toLocaleString()}</div>
				</div>
			</div>
		</div>
		
		{#if showDetailed}
			<!-- Detailed analytics section -->
			<div class="detailed-metrics">
				<!-- Status breakdown -->
				<div class="metrics-section">
					<h5 class="section-title">Status Distribution</h5>
					<div class="metrics-row">
						<div class="metric-item" onclick={() => handleFilterByStatus('active')}>
							<div class="metric-item-content">
								<span class="metric-item-label">Active Locations</span>
								<span class="metric-item-value status-success">{displayMetrics.active}</span>
							</div>
							<div class="status-indicator status-success"></div>
						</div>
						
						<div class="metric-item" onclick={() => handleFilterByStatus('inactive')}>
							<div class="metric-item-content">
								<span class="metric-item-label">Inactive Locations</span>
								<span class="metric-item-value status-error">{displayMetrics.inactive}</span>
							</div>
							<div class="status-indicator status-error"></div>
						</div>
					</div>
				</div>
				
				<!-- Type breakdown -->
				<div class="metrics-section">
					<h5 class="section-title">Location Types</h5>
					<div class="metrics-row">
						<div class="metric-item" onclick={() => handleFilterByType('store')}>
							<span class="metric-item-icon">🏬</span>
							<div class="metric-item-content">
								<span class="metric-item-label">Stores</span>
								<span class="metric-item-value type-store">{displayMetrics.stores}</span>
							</div>
						</div>
						
						<div class="metric-item" onclick={() => handleFilterByType('warehouse')}>
							<span class="metric-item-icon">🏭</span>
							<div class="metric-item-content">
								<span class="metric-item-label">Warehouses</span>
								<span class="metric-item-value type-warehouse">{displayMetrics.warehouses}</span>
							</div>
						</div>
						
						<div class="metric-item" onclick={() => handleFilterByType('pickup_point')}>
							<span class="metric-item-icon">📍</span>
							<div class="metric-item-content">
								<span class="metric-item-label">Pickup Points</span>
								<span class="metric-item-value type-pickup">{displayMetrics.pickupPoints}</span>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Capabilities breakdown -->
				<div class="metrics-section">
					<h5 class="section-title">Location Capabilities</h5>
					<div class="metrics-row">
						<div class="metric-item" onclick={() => handleFilterByCapability('fulfillment')}>
							<div class="metric-item-content">
								<span class="metric-item-label">Fulfillment Centers</span>
								<span class="metric-item-value capability-fulfillment">{displayMetrics.fulfillmentCenters}</span>
							</div>
						</div>
						
						<div class="metric-item" onclick={() => handleFilterByCapability('pickup')}>
							<div class="metric-item-content">
								<span class="metric-item-label">Pickup Locations</span>
								<span class="metric-item-value capability-pickup">{displayMetrics.pickupLocations}</span>
							</div>
						</div>
						
						{#if displayMetrics.defaultLocation}
							<div class="metric-item">
								<div class="metric-item-content">
									<span class="metric-item-label">Default Location</span>
									<span class="metric-item-value default-location">{displayMetrics.defaultLocation.name}</span>
								</div>
								<div class="status-indicator status-info"></div>
							</div>
						{/if}
					</div>
				</div>
				
				<!-- Activity insights -->
				{#if displayMetrics.total > 0}
					<div class="metrics-section">
						<h5 class="section-title">Activity Insights</h5>
						<div class="metrics-row">
							<div class="metric-item">
								<span class="metric-item-label">Active Rate</span>
								<span class="metric-item-value">{Math.round((displayMetrics.active / displayMetrics.total) * 100)}%</span>
							</div>
							<div class="metric-item">
								<span class="metric-item-label">Fulfillment Coverage</span>
								<span class="metric-item-value">{Math.round((displayMetrics.fulfillmentCenters / displayMetrics.total) * 100)}%</span>
							</div>
							<div class="metric-item">
								<span class="metric-item-label">Pickup Availability</span>
								<span class="metric-item-value">{Math.round((displayMetrics.pickupLocations / displayMetrics.total) * 100)}%</span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
		
		<!-- Quick actions -->
		<div class="metrics-actions">
			<button class="btn-ghost btn-sm" onclick={() => console.log('Export location metrics')}>
				📊 Export Report
			</button>
			<button class="btn-ghost btn-sm" onclick={() => console.log('View location map')}>
				🗺️ View Map
			</button>
		</div>
	{:else}
		<div class="metrics-empty">
			<div class="empty-icon">📍</div>
			<h4>No Location Data</h4>
			<p>No location analytics available to display</p>
		</div>
	{/if}
</div>

<style>
	.location-metrics {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		padding: 1.5rem;
		width: 100%;
	}
	
	/* Loading state */
	.metrics-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
	}
	
	.metrics-loading p {
		margin-top: 1rem;
		color: #6d7175;
		font-size: 0.875rem;
	}
	
	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid #e1e1e1;
		border-top: 2px solid #1a73e8;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	/* Header */
	.metrics-header {
		margin-bottom: 1.5rem;
	}
	
	.metrics-title {
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
		margin: 0;
	}
	
	/* Primary metrics grid */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	
	.metric-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: #fafbfb;
		border-radius: 8px;
		border: 1px solid #f0f0f0;
		transition: all 0.15s ease;
	}
	
	.metric-card.metric-clickable {
		cursor: pointer;
	}
	
	.metric-card:hover,
	.metric-card.metric-clickable:hover {
		background: #f6f6f7;
		border-color: #e1e1e1;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	
	.metric-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
		opacity: 0.8;
	}
	
	.metric-content {
		flex: 1;
		min-width: 0;
	}
	
	.metric-label {
		font-size: 0.75rem;
		color: #6d7175;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 0.25rem;
	}
	
	.metric-value {
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
	}
	
	.metric-value.status-success {
		color: #0d7462;
	}
	
	.metric-value.status-info {
		color: #1a73e8;
	}
	
	.metric-value.status-warning {
		color: #d97706;
	}
	
	/* Detailed metrics */
	.detailed-metrics {
		border-top: 1px solid #f0f0f0;
		padding-top: 1.5rem;
		margin-bottom: 1.5rem;
	}
	
	.metrics-section {
		margin-bottom: 1.5rem;
	}
	
	.metrics-section:last-child {
		margin-bottom: 0;
	}
	
	.section-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
		margin: 0 0 1rem 0;
	}
	
	.metrics-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}
	
	.metric-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: white;
		border-radius: 6px;
		border: 1px solid #f0f0f0;
		transition: all 0.15s ease;
		cursor: pointer;
	}
	
	.metric-item:hover {
		border-color: #e1e1e1;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.metric-item-icon {
		font-size: 1rem;
		margin-right: 0.5rem;
	}
	
	.metric-item-content {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.metric-item-label {
		font-size: 0.875rem;
		color: #6d7175;
		font-weight: 500;
	}
	
	.metric-item-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
	}
	
	.metric-item-value.status-success {
		color: #0d7462;
	}
	
	.metric-item-value.status-error {
		color: #c53030;
	}
	
	.metric-item-value.status-warning {
		color: #d97706;
	}
	
	.metric-item-value.status-info {
		color: #1a73e8;
	}
	
	.metric-item-value.type-store {
		color: #1a73e8;
	}
	
	.metric-item-value.type-warehouse {
		color: #d97706;
	}
	
	.metric-item-value.type-pickup {
		color: #0d7462;
	}
	
	.metric-item-value.capability-fulfillment {
		color: #1a73e8;
	}
	
	.metric-item-value.capability-pickup {
		color: #d97706;
	}
	
	.metric-item-value.default-location {
		color: #7c3aed;
	}
	
	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-left: 0.5rem;
	}
	
	.status-indicator.status-success {
		background: #0d7462;
	}
	
	.status-indicator.status-error {
		background: #c53030;
	}
	
	.status-indicator.status-warning {
		background: #d97706;
	}
	
	.status-indicator.status-info {
		background: #1a73e8;
	}
	
	/* Actions */
	.metrics-actions {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		border-top: 1px solid #f0f0f0;
		padding-top: 1rem;
	}
	
	.btn-sm {
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
	}
	
	/* Empty state */
	.metrics-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 2rem;
	}
	
	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.6;
	}
	
	.metrics-empty h4 {
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
		margin: 0 0 0.5rem 0;
	}
	
	.metrics-empty p {
		font-size: 0.875rem;
		color: #6d7175;
		margin: 0;
	}
	
	/* Responsive adjustments */
	@media (max-width: 768px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.metrics-row {
			grid-template-columns: 1fr;
		}
		
		.metrics-actions {
			flex-direction: column;
		}
		
		.metrics-actions .btn-ghost {
			width: 100%;
			justify-content: center;
		}
	}
	
	@media (max-width: 480px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
		
		.metric-card {
			flex-direction: column;
			text-align: center;
		}
		
		.metric-item {
			flex-direction: column;
			text-align: center;
			gap: 0.5rem;
		}
		
		.metric-item-content {
			flex-direction: column;
			text-align: center;
		}
		
		.status-indicator {
			margin-left: 0;
			margin-top: 0.25rem;
		}
	}
</style>