<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();
	
	// State management
	let inventory: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	// Client-side data fetching
	async function loadInventory() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch('/api/inventory/details');
			
			if (!response.ok) {
				throw new Error('Failed to fetch inventory');
			}

			const data = await response.json();
			inventory = data;
		} catch (err) {
			console.error('Load inventory error:', err);
			error = 'Failed to load inventory from backend';
			inventory = [];
		} finally {
			loading = false;
		}
	}

	// Load inventory when component mounts
	onMount(() => {
		loadInventory();
	});
	let selectedItems: string[] = $state([]);
	let selectAll = $state(false);
	let editingQuantities = $state({});
	let toasts = $state([]);
	let showAdjustModal = $state(false);
	let adjustingItem = $state(null);
	let adjustBy = $state(0);
	let newQuantity = $state(0);
	let adjustReason = $state('Correction (default)');
	let saving = $state(false);

	function toggleSelectAll() {
		if (selectAll) {
			selectedItems = inventory?.map(item => item.id) || [];
		} else {
			selectedItems = [];
		}
	}

	function toggleItem(itemId: string) {
		if (selectedItems.includes(itemId)) {
			selectedItems = selectedItems.filter(id => id !== itemId);
		} else {
			selectedItems = [...selectedItems, itemId];
		}
		selectAll = selectedItems.length === inventory?.length;
	}

	function formatProductTitle(item: any): string {
		let title = item.product_name || 'Unknown Product';
		
		const variants = [];
		if (item.color?.Valid && item.color.String) {
			variants.push(item.color.String);
		}
		if (item.size?.Valid && item.size.String) {
			variants.push(item.size.String);
		}
		
		if (variants.length > 0) {
			title += ` | ${variants.join(' / ')}`;
		}
		
		return title;
	}

	function formatSKU(item: any): string {
		return item.sku?.Valid ? item.sku.String : '-';
	}

	function formatLocation(item: any): string {
		return item.location?.Valid ? item.location.String : '-';
	}

	function getUnavailableCount(item: any): number {
		return item.unavailable || 0;
	}

	function getCommittedCount(item: any): number {
		return item.committed || 0;
	}

	function getAvailableCount(item: any): number {
		return item.available || item.quantity || 0;
	}

	function getOnHandCount(item: any): number {
		return item.on_hand || item.quantity || 0;
	}

	// Toast notification system
	function showToast(message: string, type: 'success' | 'error' = 'success') {
		const id = Date.now();
		const toast = { id, message, type };
		toasts = [...toasts, toast];
		
		setTimeout(() => {
			toasts = toasts.filter(t => t.id !== id);
		}, 4000);
	}
	
	function removeToast(id: number) {
		toasts = toasts.filter(t => t.id !== id);
	}

	// Navigate to variant page
	function goToVariant(item: any) {
		const variantId = item.id;
		const productId = item.product_id;
		goto(`/products/${productId}/variants/${variantId}?fromInventory=true`);
	}

	// Update quantity
	async function updateQuantity(item: any, newQuantity: number) {
		try {
			const response = await fetch('/api/inventory/details', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: item.id,
					quantity: newQuantity,
					reason: 'Quick edit'
				})
			});

			if (response.ok) {
				showToast('Quantity updated successfully!', 'success');
				// Update local state
				item.quantity = newQuantity;
				item.available = newQuantity;
				item.on_hand = newQuantity;
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update quantity');
			}
		} catch (error) {
			showToast('Error updating quantity: ' + error.message, 'error');
		}
	}

	// Handle quantity input change
	function handleQuantityChange(item: any, event: Event) {
		const input = event.target as HTMLInputElement;
		const newQuantity = parseInt(input.value) || 0;
		updateQuantity(item, newQuantity);
	}

	// Open adjustment modal
	function openAdjustModal(item: any, field: 'available' | 'on_hand') {
		adjustingItem = { ...item, field };
		const currentValue = field === 'available' ? item.available : item.on_hand;
		newQuantity = currentValue;
		adjustBy = 0;
		showAdjustModal = true;
	}

	// Update adjust by value
	function updateAdjustBy() {
		if (adjustingItem) {
			const currentValue = adjustingItem.field === 'available' ? adjustingItem.available : adjustingItem.on_hand;
			newQuantity = currentValue + adjustBy;
		}
	}

	// Update new quantity value
	function updateNewQuantity() {
		if (adjustingItem) {
			const currentValue = adjustingItem.field === 'available' ? adjustingItem.available : adjustingItem.on_hand;
			adjustBy = newQuantity - currentValue;
		}
	}

	// Save adjustment
	async function saveAdjustment() {
		if (!adjustingItem) return;
		
		saving = true;
		try {
			const response = await fetch('/api/inventory/details', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: adjustingItem.id,
					quantity: newQuantity,
					reason: adjustReason
				})
			});

			if (response.ok) {
				const result = await response.json();
				showToast('Quantity updated successfully!', 'success');
				
				// Update the inventory item in the local state
				const itemIndex = inventory.findIndex(item => item.id === adjustingItem.id);
				if (itemIndex !== -1) {
					inventory[itemIndex].quantity = newQuantity;
					inventory[itemIndex].available = newQuantity;
					inventory[itemIndex].on_hand = newQuantity;
					inventory[itemIndex].updated_at = result.item.updated_at;
				}
				
				showAdjustModal = false;
				adjustingItem = null;
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update quantity');
			}
		} catch (error) {
			showToast('Error updating quantity: ' + error.message, 'error');
		} finally {
			saving = false;
		}
	}

	// Cancel adjustment
	function cancelAdjustment() {
		showAdjustModal = false;
		adjustingItem = null;
		adjustBy = 0;
		newQuantity = 0;
	}
</script>

<svelte:head>
	<title>Inventory - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">📊</span>
				Inventory
			</h1>
			<div class="header-right">
				<div class="shop-location">
					<span class="location-label">Shop location</span>
					<select class="location-select">
						<option>All locations</option>
						<option>Warehouse A</option>
						<option>Warehouse B</option>
						<option>Electronics</option>
					</select>
				</div>
				<div class="header-actions">
					<button class="btn-secondary">Export</button>
				</div>
			</div>
		</div>
	</div>

	<div class="page-content">
		<!-- Tabs - Always show immediately -->
		<div class="tabs">
			<button class="tab active" disabled={loading}>All</button>
			<button class="tab-add" disabled={loading}>+</button>
		</div>

		{#if error}
			<div class="error-state">
				<p>{error}</p>
				<button class="btn-secondary" onclick={() => loadInventory()}>Retry</button>
			</div>
		{:else if loading}
			<!-- Loading state -->
			<div class="loading-state">
				<div class="loading-content">
					<div class="loading-spinner-large"></div>
					<h3>Loading inventory...</h3>
					<p>This may take a moment</p>
				</div>
			</div>
		{:else if inventory && inventory.length > 0}
			<!-- Table -->
			<div class="table-container">
				<table class="inventory-table">
					<thead>
						<tr>
							<th class="checkbox-col">
								<input 
									type="checkbox" 
									bind:checked={selectAll}
									onchange={toggleSelectAll}
								/>
							</th>
							<th class="product-col">Product</th>
							<th class="sku-col">SKU</th>
							<th class="number-col">Unavailable</th>
							<th class="number-col">Committed</th>
							<th class="number-col">Available</th>
							<th class="number-col">On hand</th>
						</tr>
					</thead>
					<tbody>
						{#each inventory as item}
							<tr class="inventory-row clickable" onclick={() => goToVariant(item)}>
								<td class="checkbox-col" onclick={(e) => e.stopPropagation()}>
									<input 
										type="checkbox" 
										checked={selectedItems.includes(item.id)}
										onchange={() => toggleItem(item.id)}
									/>
								</td>
								<td class="product-col">
									<div class="product-info">
										<div class="product-image">
											📦
										</div>
										<div class="product-details">
											<div class="product-title">{formatProductTitle(item)}</div>
											<div class="product-subtitle">{formatLocation(item)}</div>
										</div>
									</div>
								</td>
								<td class="sku-col">
									<span class="sku">{formatSKU(item)}</span>
								</td>
								<td class="number-col">
									<span class="quantity">{getUnavailableCount(item)}</span>
								</td>
								<td class="number-col">
									<span class="quantity">{getCommittedCount(item)}</span>
								</td>
								<td class="number-col" onclick={(e) => e.stopPropagation()}>
									<button 
										class="quantity-button" 
										onclick={() => openAdjustModal(item, 'available')}
									>
										{getAvailableCount(item)}
									</button>
								</td>
								<td class="number-col" onclick={(e) => e.stopPropagation()}>
									<button 
										class="quantity-button" 
										onclick={() => openAdjustModal(item, 'on_hand')}
									>
										{getOnHandCount(item)}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="pagination">
				<span class="pagination-info">1-{inventory.length}</span>
			</div>
		{:else}
			<!-- Empty state -->
			<div class="empty-state">
				<div class="empty-content">
					<div class="empty-icon">📊</div>
					<h3>No inventory items found</h3>
					<p>Add products to start tracking inventory</p>
				</div>
			</div>
		{/if}
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
					{:else}
						<span class="toast-icon">⚠</span>
					{/if}
					<span class="toast-message">{toast.message}</span>
				</div>
				<button class="toast-close" onclick={() => removeToast(toast.id)}>×</button>
			</div>
		{/each}
	</div>
{/if}

<!-- Adjustment Modal -->
{#if showAdjustModal && adjustingItem}
	<div class="modal-overlay" onclick={cancelAdjustment}>
		<div class="modal-content adjust-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3 class="modal-title">Adjust {adjustingItem.field === 'available' ? 'Available' : 'On hand'}</h3>
				<button class="modal-close" onclick={cancelAdjustment}>×</button>
			</div>
			
			<div class="modal-body">
				<div class="adjust-fields">
					<div class="field-group">
						<label class="field-label">Adjust by</label>
						<input 
							type="number" 
							class="adjust-input"
							bind:value={adjustBy}
							oninput={updateAdjustBy}
							placeholder="0"
						/>
					</div>
					
					<div class="field-group">
						<label class="field-label">New</label>
						<input 
							type="number" 
							class="adjust-input"
							bind:value={newQuantity}
							oninput={updateNewQuantity}
							placeholder="0"
							min="0"
						/>
					</div>
				</div>
				
				<div class="reason-section">
					<label class="field-label">Reason</label>
					<select class="reason-select" bind:value={adjustReason}>
						<option value="Correction (default)">Correction (default)</option>
						<option value="Cycle count">Cycle count</option>
						<option value="Damaged">Damaged</option>
						<option value="Quality control">Quality control</option>
						<option value="Received">Received</option>
						<option value="Sold">Sold</option>
						<option value="Other">Other</option>
					</select>
				</div>
			</div>
			
			<div class="modal-actions">
				<button class="btn-secondary" onclick={cancelAdjustment}>
					Cancel
				</button>
				<button class="btn-primary" onclick={saveAdjustment} disabled={saving}>
					{#if saving}
						<span class="loading-spinner"></span>
					{/if}
					{saving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
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
		padding: 1rem 2rem;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-main h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-icon {
		font-size: 1rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.shop-location {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.location-label {
		font-size: 0.875rem;
		color: #6d7175;
	}

	.location-select {
		padding: 0.375rem 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-primary, .btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s ease;
	}

	.btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.btn-secondary:hover {
		background: #f6f6f7;
	}

	.page-content {
		padding: 0;
	}

	.tabs {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		display: flex;
		align-items: center;
		padding: 0 2rem;
	}

	.tab {
		background: none;
		border: none;
		padding: 0.75rem 1rem;
		cursor: pointer;
		color: #6d7175;
		font-size: 0.875rem;
		border-bottom: 2px solid transparent;
		transition: all 0.15s ease;
	}

	.tab.active {
		color: #202223;
		border-bottom-color: #202223;
	}

	.tab:hover {
		color: #202223;
	}

	.tab-add {
		background: none;
		border: none;
		padding: 0.75rem 1rem;
		cursor: pointer;
		color: #6d7175;
		font-size: 1rem;
		margin-left: auto;
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.tab-add:hover {
		background: #f6f6f7;
	}

	.table-container {
		background: white;
		overflow-x: auto;
	}

	.inventory-table {
		width: 100%;
		border-collapse: collapse;
	}

	.inventory-table th {
		background: #fafbfb;
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: 500;
		font-size: 0.75rem;
		color: #6d7175;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		border-bottom: 1px solid #e1e1e1;
	}

	.inventory-table td {
		padding: 1rem;
		border-bottom: 1px solid #e1e1e1;
		vertical-align: middle;
	}

	.checkbox-col {
		width: 40px;
		padding: 1rem 0.5rem 1rem 1rem;
	}

	.product-col {
		min-width: 300px;
	}

	.sku-col {
		width: 120px;
	}

	.number-col {
		width: 100px;
		text-align: center;
		padding: 1rem 0.5rem;
	}

	.product-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.product-image {
		width: 40px;
		height: 40px;
		background: #f6f6f7;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		opacity: 0.6;
	}

	.product-details {
		flex: 1;
	}

	.product-title {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.product-subtitle {
		color: #6d7175;
		font-size: 0.8125rem;
		line-height: 1.3;
	}

	.sku {
		color: #202223;
		font-size: 0.875rem;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', monospace;
	}

	.quantity {
		color: #202223;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.quantity-input {
		width: 60px;
		padding: 0.375rem 0.5rem;
		border: 1px solid #c9cccf;
		border-radius: 4px;
		font-size: 0.875rem;
		text-align: center;
		background: white;
	}

	.quantity-input:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}

	.quantity-input:read-only {
		background: #f6f6f7;
		cursor: not-allowed;
	}

	.quantity-input.editable {
		background: white;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.quantity-input.editable:hover {
		border-color: #005bd3;
	}

	.quantity-button {
		background: white;
		border: 1px solid #c9cccf;
		border-radius: 4px;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #202223;
		cursor: pointer;
		transition: all 0.15s ease;
		min-width: 60px;
		text-align: center;
	}

	.quantity-button:hover {
		border-color: #005bd3;
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}

	.quantity-button:active {
		transform: translateY(1px);
	}

	.inventory-row.clickable {
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.inventory-row.clickable:hover {
		background: #fafbfb;
	}

	.pagination {
		padding: 1rem 2rem;
		background: white;
		border-top: 1px solid #e1e1e1;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.pagination-info {
		font-size: 0.875rem;
		color: #6d7175;
	}

	.empty-state {
		background: white;
		padding: 4rem 2rem;
		text-align: center;
	}

	.empty-content {
		max-width: 400px;
		margin: 0 auto;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.4;
	}

	.empty-state h3 {
		color: #202223;
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.empty-state p {
		color: #6d7175;
		margin-bottom: 2rem;
		line-height: 1.5;
	}

	.error-state {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 1rem 2rem;
		margin: 1rem 2rem;
		border-radius: 6px;
	}

	input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.inventory-row:hover {
		background: #fafbfb;
	}

	@media (max-width: 768px) {
		.header-main {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
		
		.header-right {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
		
		.inventory-table {
			min-width: 800px;
		}
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

	/* Adjustment Modal */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.modal-content.adjust-modal {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 480px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		overflow: hidden;
	}

	.modal-header {
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #e1e3e5;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.modal-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #6d7175;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.modal-close:hover {
		color: #202223;
	}

	.modal-body {
		padding: 2rem;
	}

	.adjust-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.field-group {
		display: flex;
		flex-direction: column;
	}

	.field-label {
		font-weight: 500;
		color: #202223;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.adjust-input {
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.15s ease;
		background: white;
	}

	.adjust-input:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 3px rgba(0, 91, 211, 0.1);
	}

	.reason-section {
		display: flex;
		flex-direction: column;
	}

	.reason-select {
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 8px;
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
		transition: border-color 0.15s ease;
	}

	.reason-select:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 3px rgba(0, 91, 211, 0.1);
	}

	.modal-actions {
		padding: 1.5rem 2rem;
		border-top: 1px solid #e1e3e5;
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		background: #fafbfb;
	}

	.modal-actions .btn-primary,
	.modal-actions .btn-secondary {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.modal-actions .btn-primary {
		background: #202223;
		color: white;
		border: none;
	}

	.modal-actions .btn-primary:hover:not(:disabled) {
		background: #1a1a1a;
	}

	.modal-actions .btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.modal-actions .btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.modal-actions .btn-secondary:hover {
		background: #f6f6f7;
		border-color: #b3b7bb;
	}

	.loading-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 0.8s ease-in-out infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Loading States */
	.loading-state {
		background: white;
		padding: 4rem 2rem;
		text-align: center;
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-content {
		max-width: 400px;
		margin: 0 auto;
	}

	.loading-spinner-large {
		display: inline-block;
		width: 48px;
		height: 48px;
		border: 4px solid #f3f4f6;
		border-radius: 50%;
		border-top-color: #005bd3;
		animation: spin 1s ease-in-out infinite;
		margin-bottom: 1.5rem;
	}

	.loading-state h3 {
		color: #202223;
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.loading-state p {
		color: #6d7175;
		margin-bottom: 0;
		line-height: 1.5;
	}

	/* Disabled tab styles */
	.tab:disabled,
	.tab-add:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
	}
</style>