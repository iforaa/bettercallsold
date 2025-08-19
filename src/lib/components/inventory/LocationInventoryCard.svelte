<script>
	import { InventoryService } from '$lib/services/InventoryService.js';

	let {
		location,
		inventoryItems = [],
		totalValue = 0,
		onTransferStock = () => {},
		onAdjustStock = () => {},
		loading = false
	} = $props();

	// Calculate location metrics
	let metrics = $derived({
		totalItems: inventoryItems.reduce((sum, item) => sum + (item.availableCount || 0), 0),
		totalProducts: inventoryItems.length,
		lowStockCount: inventoryItems.filter(item => InventoryService.isLowStock(item)).length,
		outOfStockCount: inventoryItems.filter(item => (item.availableCount || 0) === 0).length,
		totalValue: inventoryItems.reduce((sum, item) => sum + (item.availableCount || 0) * (item.cost || item.price || 0), 0)
	});

	function handleTransferClick() {
		onTransferStock(location);
	}

	function handleStockAdjustment(item) {
		onAdjustStock(item, location);
	}
</script>

<div class="location-card" class:loading>
	<div class="location-card-header">
		<div class="location-info">
			<h3 class="location-name">{location.name}</h3>
			<div class="location-address">
				{location.address_line_1}
				{#if location.city}, {location.city}{/if}
			</div>
		</div>
		
		<div class="location-badges">
			{#if location.is_fulfillment_center}
				<span class="status-badge status-accent">Fulfillment</span>
			{/if}
			{#if location.is_pickup_location}
				<span class="status-badge status-warning">Pickup</span>
			{/if}
			{#if location.is_default}
				<span class="status-badge status-success">Default</span>
			{/if}
		</div>
	</div>

	<div class="location-metrics">
		<div class="metric-grid">
			<div class="metric-item">
				<div class="metric-value">{metrics.totalItems}</div>
				<div class="metric-label">Total Items</div>
			</div>
			<div class="metric-item">
				<div class="metric-value">{metrics.totalProducts}</div>
				<div class="metric-label">Products</div>
			</div>
			<div class="metric-item">
				<div class="metric-value">{metrics.lowStockCount}</div>
				<div class="metric-label">Low Stock</div>
			</div>
			<div class="metric-item">
				<div class="metric-value">{InventoryService.formatCurrency(metrics.totalValue)}</div>
				<div class="metric-label">Value</div>
			</div>
		</div>
	</div>

	{#if inventoryItems.length > 0}
		<div class="location-inventory">
			<div class="inventory-header">
				<h4>Top Inventory Items</h4>
				<button class="btn btn-ghost btn-sm" onclick={handleTransferClick}>
					🔄 Transfer Stock
				</button>
			</div>
			
			<div class="inventory-list">
				{#each inventoryItems.slice(0, 5) as item}
					<div class="inventory-item">
						<div class="item-info">
							<div class="item-name">{item.formattedTitle}</div>
							<div class="item-sku">{item.formattedSKU}</div>
						</div>
						
						<div class="item-stock">
							<div class="stock-levels">
								<span class="stock-available">{item.availableCount} available</span>
								<span class="stock-onhand">{item.onHandCount} on hand</span>
								{#if item.committedCount > 0}
									<span class="stock-committed">{item.committedCount} committed</span>
								{/if}
							</div>
							
							<button 
								class="btn btn-ghost btn-xs" 
								onclick={() => handleStockAdjustment(item)}
								title="Adjust stock levels"
							>
								✏️
							</button>
						</div>
					</div>
				{/each}
			</div>
			
			{#if inventoryItems.length > 5}
				<div class="inventory-footer">
					<a href="/inventory?location={encodeURIComponent(location.name)}" class="view-all-link">
						View all {inventoryItems.length} items →
					</a>
				</div>
			{/if}
		</div>
	{:else}
		<div class="empty-inventory">
			<div class="empty-icon">📦</div>
			<div class="empty-message">No inventory at this location</div>
			<button class="btn btn-primary btn-sm" onclick={handleTransferClick}>
				Transfer Stock Here
			</button>
		</div>
	{/if}
</div>

<style>
	.location-card {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		background: var(--color-surface);
		transition: all 0.2s ease;
	}

	.location-card:hover {
		border-color: var(--color-border-focus);
		box-shadow: var(--shadow-md);
	}

	.location-card.loading {
		opacity: 0.6;
		pointer-events: none;
	}

	.location-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-4);
	}

	.location-name {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-1) 0;
	}

	.location-address {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		line-height: var(--line-height-relaxed);
	}

	.location-badges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: flex-start;
	}

	.location-metrics {
		margin-bottom: var(--space-6);
	}

	.metric-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-4);
	}

	.metric-item {
		text-align: center;
		padding: var(--space-3);
		background: var(--color-surface-secondary);
		border-radius: var(--radius-md);
	}

	.metric-value {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--space-1);
	}

	.metric-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-transform: uppercase;
		font-weight: var(--font-weight-medium);
		letter-spacing: 0.05em;
	}

	.inventory-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.inventory-header h4 {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
	}

	.inventory-list {
		space-y: var(--space-3);
	}

	.inventory-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		margin-bottom: var(--space-2);
	}

	.inventory-item:hover {
		background: var(--color-surface-hover);
	}

	.item-info {
		flex: 1;
		min-width: 0;
	}

	.item-name {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		margin-bottom: var(--space-1);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-sku {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
	}

	.item-stock {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.stock-levels {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
		font-size: var(--font-size-xs);
	}

	.stock-available {
		color: var(--color-success);
		font-weight: var(--font-weight-medium);
	}

	.stock-onhand {
		color: var(--color-text-muted);
	}

	.stock-committed {
		color: var(--color-warning);
	}

	.inventory-footer {
		margin-top: var(--space-4);
		text-align: center;
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-border-light);
	}

	.view-all-link {
		color: var(--color-primary);
		text-decoration: none;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}

	.view-all-link:hover {
		text-decoration: underline;
	}

	.empty-inventory {
		text-align: center;
		padding: var(--space-8) var(--space-4);
		color: var(--color-text-muted);
	}

	.empty-icon {
		font-size: var(--font-size-2xl);
		margin-bottom: var(--space-2);
	}

	.empty-message {
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-4);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.metric-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.location-card-header {
			flex-direction: column;
			gap: var(--space-3);
		}
		
		.inventory-item {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}
		
		.item-stock {
			width: 100%;
			justify-content: space-between;
		}
	}
</style>