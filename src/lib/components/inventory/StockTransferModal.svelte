<script>
	import { InventoryService } from '$lib/services/InventoryService.js';
	import { ToastService } from '$lib/services/ToastService.js';

	let {
		show = false,
		sourceLocation = null,
		targetLocation = null,
		availableItems = [],
		locations = [],
		onClose = () => {},
		onTransferComplete = () => {}
	} = $props();

	// Transfer form state
	let selectedItems = $state([]);
	let transferQuantities = $state({});
	let transferReason = $state('Stock rebalancing');
	let loading = $state(false);
	let errors = $state({});

	// Available reasons for stock transfer
	const transferReasons = [
		'Stock rebalancing',
		'Customer request',
		'Fulfillment optimization',
		'Inventory consolidation',
		'Location closure',
		'Emergency stock transfer',
		'Other'
	];

	// Reset form when modal opens/closes
	$effect(() => {
		if (show) {
			selectedItems = [];
			transferQuantities = {};
			transferReason = 'Stock rebalancing';
			errors = {};
		}
	});

	// Computed values
	let totalSelectedItems = $derived(selectedItems.length);
	let totalTransferQuantity = $derived(
		selectedItems.reduce((sum, itemId) => sum + (transferQuantities[itemId] || 0), 0)
	);

	function toggleItemSelection(itemId) {
		const isSelected = selectedItems.includes(itemId);
		
		if (isSelected) {
			selectedItems = selectedItems.filter(id => id !== itemId);
			delete transferQuantities[itemId];
		} else {
			selectedItems = [...selectedItems, itemId];
			// Set default quantity to available amount
			const item = availableItems.find(item => item.id === itemId);
			transferQuantities[itemId] = item?.availableCount || 1;
		}
		
		// Clear errors when selection changes
		delete errors[itemId];
	}

	function updateTransferQuantity(itemId, quantity) {
		const item = availableItems.find(item => item.id === itemId);
		const maxQuantity = item?.availableCount || 0;
		
		// Validate quantity
		if (quantity < 0) {
			errors[itemId] = 'Quantity cannot be negative';
			return;
		}
		
		if (quantity > maxQuantity) {
			errors[itemId] = `Only ${maxQuantity} available at ${sourceLocation?.name}`;
			return;
		}
		
		// Update quantity and clear errors
		transferQuantities[itemId] = quantity;
		delete errors[itemId];
	}

	function selectAllItems() {
		if (selectedItems.length === availableItems.length) {
			// Deselect all
			selectedItems = [];
			transferQuantities = {};
		} else {
			// Select all
			selectedItems = availableItems.map(item => item.id);
			availableItems.forEach(item => {
				transferQuantities[item.id] = item.availableCount || 1;
			});
		}
		
		errors = {};
	}

	async function handleTransfer() {
		// Validate form
		const validationErrors = {};
		
		if (selectedItems.length === 0) {
			ToastService.show('Please select at least one item to transfer', 'error');
			return;
		}
		
		if (!targetLocation) {
			ToastService.show('Please select a target location', 'error');
			return;
		}
		
		// Validate each selected item
		selectedItems.forEach(itemId => {
			const quantity = transferQuantities[itemId];
			const item = availableItems.find(item => item.id === itemId);
			
			if (!quantity || quantity <= 0) {
				validationErrors[itemId] = 'Quantity must be greater than 0';
			} else if (quantity > (item?.availableCount || 0)) {
				validationErrors[itemId] = `Only ${item?.availableCount || 0} available`;
			}
		});
		
		if (Object.keys(validationErrors).length > 0) {
			errors = validationErrors;
			ToastService.show('Please fix validation errors before transferring', 'error');
			return;
		}
		
		// Perform transfer
		loading = true;
		
		try {
			// Prepare transfer data
			const transferData = {
				sourceLocationId: sourceLocation.id,
				targetLocationId: targetLocation.id,
				reason: transferReason,
				items: selectedItems.map(itemId => ({
					variantId: itemId,
					quantity: transferQuantities[itemId]
				}))
			};
			
			// Call transfer API
			const response = await fetch('/api/inventory/transfer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(transferData)
			});
			
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Transfer failed');
			}
			
			const result = await response.json();
			
			ToastService.show(
				`Successfully transferred ${totalSelectedItems} item(s) from ${sourceLocation.name} to ${targetLocation.name}`,
				'success'
			);
			
			// Close modal and notify parent
			onTransferComplete(result);
			onClose();
			
		} catch (error) {
			console.error('Transfer error:', error);
			ToastService.show('Error transferring stock: ' + error.message, 'error');
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		onClose();
	}

	function handleOverlayClick(event) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
</script>

{#if show}
	<div class="modal-overlay" onclick={handleOverlayClick}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2 class="modal-title">Transfer Stock</h2>
				<button class="modal-close" onclick={handleCancel}>×</button>
			</div>
			
			<div class="modal-body">
				<!-- Transfer Summary -->
				<div class="transfer-summary">
					<div class="transfer-route">
						<div class="location-badge">
							<div class="location-name">{sourceLocation?.name || 'Unknown'}</div>
							<div class="location-type">Source</div>
						</div>
						
						<div class="transfer-arrow">→</div>
						
						<div class="form-field">
							<label class="form-label">Target Location</label>
							<select 
								class="form-select" 
								bind:value={targetLocation}
								disabled={loading}
							>
								<option value={null}>Select location</option>
								{#each locations as location}
									{#if location.id !== sourceLocation?.id}
										<option value={location}>{location.name}</option>
									{/if}
								{/each}
							</select>
						</div>
					</div>
					
					{#if totalSelectedItems > 0}
						<div class="transfer-stats">
							<div class="stat">
								<span class="stat-value">{totalSelectedItems}</span>
								<span class="stat-label">Items</span>
							</div>
							<div class="stat">
								<span class="stat-value">{totalTransferQuantity}</span>
								<span class="stat-label">Total Qty</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Item Selection -->
				<div class="items-section">
					<div class="items-header">
						<h3>Select Items to Transfer</h3>
						<button 
							class="btn btn-ghost btn-sm" 
							onclick={selectAllItems}
							disabled={loading}
						>
							{selectedItems.length === availableItems.length ? 'Deselect All' : 'Select All'}
						</button>
					</div>
					
					{#if availableItems.length === 0}
						<div class="empty-state">
							<div class="empty-icon">📦</div>
							<div class="empty-message">No inventory available at {sourceLocation?.name}</div>
						</div>
					{:else}
						<div class="items-list">
							{#each availableItems as item}
								<div class="item-row" class:selected={selectedItems.includes(item.id)}>
									<div class="item-checkbox">
										<input 
											type="checkbox" 
											class="checkbox"
											checked={selectedItems.includes(item.id)}
											onchange={() => toggleItemSelection(item.id)}
											disabled={loading}
										/>
									</div>
									
									<div class="item-info">
										<div class="item-title">{item.formattedTitle}</div>
										<div class="item-details">
											<span class="item-sku">{item.formattedSKU}</span>
											<span class="item-available">
												{item.availableCount} available
											</span>
										</div>
									</div>
									
									{#if selectedItems.includes(item.id)}
										<div class="item-quantity">
											<label class="quantity-label">Quantity</label>
											<input 
												type="number" 
												class="form-input form-input-sm"
												class:error={errors[item.id]}
												value={transferQuantities[item.id] || 0}
												oninput={(e) => updateTransferQuantity(item.id, parseInt(e.target.value) || 0)}
												min="0"
												max={item.availableCount}
												disabled={loading}
											/>
											{#if errors[item.id]}
												<div class="error-message">{errors[item.id]}</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Transfer Reason -->
				<div class="form-field">
					<label class="form-label">Reason for Transfer</label>
					<select 
						class="form-select" 
						bind:value={transferReason}
						disabled={loading}
					>
						{#each transferReasons as reason}
							<option value={reason}>{reason}</option>
						{/each}
					</select>
				</div>
			</div>
			
			<div class="modal-actions">
				<button 
					class="btn btn-secondary" 
					onclick={handleCancel}
					disabled={loading}
				>
					Cancel
				</button>
				<button 
					class="btn btn-primary" 
					onclick={handleTransfer}
					disabled={loading || selectedItems.length === 0}
				>
					{#if loading}
						<span class="loading-spinner loading-spinner-sm"></span>
					{/if}
					{loading ? 'Transferring...' : `Transfer ${totalSelectedItems} Item${totalSelectedItems !== 1 ? 's' : ''}`}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.transfer-summary {
		background: var(--color-surface-secondary);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
		padding: var(--space-4);
		margin-bottom: var(--space-6);
	}

	.transfer-route {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.location-badge {
		text-align: center;
		padding: var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		min-width: 120px;
	}

	.location-name {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--space-1);
	}

	.location-type {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-transform: uppercase;
		font-weight: var(--font-weight-medium);
		letter-spacing: 0.05em;
	}

	.transfer-arrow {
		font-size: var(--font-size-lg);
		color: var(--color-primary);
		font-weight: bold;
	}

	.transfer-stats {
		display: flex;
		gap: var(--space-4);
		justify-content: center;
	}

	.stat {
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	.stat-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-transform: uppercase;
		font-weight: var(--font-weight-medium);
		letter-spacing: 0.05em;
	}

	.items-section {
		margin-bottom: var(--space-6);
	}

	.items-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.items-header h3 {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
	}

	.items-list {
		max-height: 400px;
		overflow-y: auto;
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
	}

	.item-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		border-bottom: 1px solid var(--color-border-light);
		transition: background-color 0.2s ease;
	}

	.item-row:last-child {
		border-bottom: none;
	}

	.item-row:hover {
		background: var(--color-surface-hover);
	}

	.item-row.selected {
		background: var(--color-primary-bg);
		border-color: var(--color-primary-light);
	}

	.item-info {
		flex: 1;
		min-width: 0;
	}

	.item-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		margin-bottom: var(--space-1);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-details {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}

	.item-sku {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
	}

	.item-available {
		font-size: var(--font-size-xs);
		color: var(--color-success);
		font-weight: var(--font-weight-medium);
	}

	.item-quantity {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
	}

	.quantity-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
	}

	.form-input-sm {
		width: 80px;
		text-align: right;
	}

	.error-message {
		font-size: var(--font-size-xs);
		color: var(--color-error);
		font-weight: var(--font-weight-medium);
		text-align: right;
	}

	.empty-state {
		text-align: center;
		padding: var(--space-8);
		color: var(--color-text-muted);
	}

	.empty-icon {
		font-size: var(--font-size-2xl);
		margin-bottom: var(--space-2);
	}

	.empty-message {
		font-size: var(--font-size-sm);
	}

	.loading-spinner-sm {
		width: 16px;
		height: 16px;
		margin-right: var(--space-2);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.transfer-route {
			flex-direction: column;
			gap: var(--space-2);
		}
		
		.transfer-arrow {
			transform: rotate(90deg);
		}
		
		.transfer-stats {
			margin-top: var(--space-4);
		}
		
		.item-row {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}
		
		.item-quantity {
			width: 100%;
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
	}
</style>