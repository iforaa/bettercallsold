<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	// State management
	let purchaseOrders = $state(data.purchaseOrders || []);
	let suppliers = $state(data.suppliers || []);
	let selectedOrders = $state([]);
	let selectAll = $state(false);
	let searchTerm = $state('');
	let statusFilter = $state('all');
	let supplierFilter = $state('all');
	let sortBy = $state('orderDate');
	let sortOrder = $state('desc');
	let showCreateModal = $state(false);
	let showOrderDetails = $state(false);
	let selectedOrder = $state(null);
	let toasts = $state([]);
	
	// Create Purchase Order Modal State
	let newOrder = $state({
		supplier: '',
		expectedDelivery: '',
		notes: '',
		items: []
	});
	
	// Filter and sort purchase orders
	let filteredOrders = $derived(() => {
		let filtered = purchaseOrders.filter(order => {
			const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
				order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
			const matchesSupplier = supplierFilter === 'all' || order.supplier.name === supplierFilter;
			
			return matchesSearch && matchesStatus && matchesSupplier;
		});
		
		// Sort orders
		filtered.sort((a, b) => {
			let aValue, bValue;
			
			switch (sortBy) {
				case 'orderDate':
					aValue = new Date(a.orderDate || '1900-01-01');
					bValue = new Date(b.orderDate || '1900-01-01');
					break;
				case 'totalAmount':
					aValue = a.totalAmount;
					bValue = b.totalAmount;
					break;
				case 'supplier':
					aValue = a.supplier.name.toLowerCase();
					bValue = b.supplier.name.toLowerCase();
					break;
				case 'status':
					aValue = a.status;
					bValue = b.status;
					break;
				default:
					aValue = a.id;
					bValue = b.id;
			}
			
			if (sortOrder === 'asc') {
				return aValue > bValue ? 1 : -1;
			} else {
				return aValue < bValue ? 1 : -1;
			}
		});
		
		return filtered;
	});
	
	// Statistics
	let stats = $derived(() => {
		const total = purchaseOrders.length;
		const pending = purchaseOrders.filter(po => po.status === 'pending').length;
		const shipped = purchaseOrders.filter(po => po.status === 'shipped').length;
		const delivered = purchaseOrders.filter(po => po.status === 'delivered').length;
		const draft = purchaseOrders.filter(po => po.status === 'draft').length;
		const totalValue = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
		
		return { total, pending, shipped, delivered, draft, totalValue };
	});
	
	// Functions
	function toggleSelectAll() {
		if (selectAll) {
			selectedOrders = filteredOrders.map(order => order.id);
		} else {
			selectedOrders = [];
		}
	}
	
	function toggleOrder(orderId: string) {
		if (selectedOrders.includes(orderId)) {
			selectedOrders = selectedOrders.filter(id => id !== orderId);
		} else {
			selectedOrders = [...selectedOrders, orderId];
		}
		selectAll = selectedOrders.length === filteredOrders.length;
	}
	
	function getStatusBadgeClass(status: string) {
		switch (status) {
			case 'draft': return 'status-draft';
			case 'pending': return 'status-pending';
			case 'shipped': return 'status-shipped';
			case 'delivered': return 'status-delivered';
			default: return 'status-draft';
		}
	}
	
	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}
	
	function formatDate(dateString: string) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
	
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
	
	function openCreateModal() {
		newOrder = {
			supplier: '',
			expectedDelivery: '',
			notes: '',
			items: []
		};
		showCreateModal = true;
	}
	
	function closeCreateModal() {
		showCreateModal = false;
	}
	
	function addItemToNewOrder() {
		newOrder.items = [...newOrder.items, {
			productName: '',
			sku: '',
			color: '',
			size: '',
			quantity: 1,
			unitCost: 0,
			totalCost: 0
		}];
	}
	
	function removeItemFromNewOrder(index: number) {
		newOrder.items = newOrder.items.filter((_, i) => i !== index);
	}
	
	function updateItemTotal(index: number) {
		const item = newOrder.items[index];
		item.totalCost = item.quantity * item.unitCost;
		newOrder.items[index] = item;
	}
	
	function createPurchaseOrder() {
		if (!newOrder.supplier || newOrder.items.length === 0) {
			showToast('Please select a supplier and add at least one item', 'error');
			return;
		}
		
		const totalAmount = newOrder.items.reduce((sum, item) => sum + item.totalCost, 0);
		const supplier = suppliers.find(s => s.name === newOrder.supplier);
		
		const newPO = {
			id: `PO-2025-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
			supplier: supplier,
			status: 'draft',
			orderDate: new Date().toISOString().split('T')[0],
			expectedDelivery: newOrder.expectedDelivery,
			totalAmount: totalAmount,
			items: newOrder.items,
			notes: newOrder.notes
		};
		
		purchaseOrders = [...purchaseOrders, newPO];
		showToast(`Purchase Order ${newPO.id} created successfully!`, 'success');
		closeCreateModal();
	}
	
	function viewOrderDetails(order: any) {
		selectedOrder = order;
		showOrderDetails = true;
	}
	
	function closeOrderDetails() {
		showOrderDetails = false;
		selectedOrder = null;
	}
	
	function updateOrderStatus(orderId: string, newStatus: string) {
		const orderIndex = purchaseOrders.findIndex(po => po.id === orderId);
		if (orderIndex !== -1) {
			purchaseOrders[orderIndex].status = newStatus;
			if (newStatus === 'pending' && !purchaseOrders[orderIndex].orderDate) {
				purchaseOrders[orderIndex].orderDate = new Date().toISOString().split('T')[0];
			}
			purchaseOrders = [...purchaseOrders];
			showToast(`Order ${orderId} status updated to ${newStatus}`, 'success');
		}
	}
	
	function bulkUpdateStatus(newStatus: string) {
		if (selectedOrders.length === 0) {
			showToast('Please select orders to update', 'error');
			return;
		}
		
		selectedOrders.forEach(orderId => {
			updateOrderStatus(orderId, newStatus);
		});
		
		selectedOrders = [];
		selectAll = false;
		showToast(`${selectedOrders.length} orders updated to ${newStatus}`, 'success');
	}
	
	function duplicateOrder(order: any) {
		const newPO = {
			...order,
			id: `PO-2025-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
			status: 'draft',
			orderDate: null,
			expectedDelivery: null,
			shippedDate: null,
			deliveredDate: null,
			trackingNumber: null
		};
		
		purchaseOrders = [...purchaseOrders, newPO];
		showToast(`Purchase Order ${newPO.id} duplicated successfully!`, 'success');
	}
</script>

<svelte:head>
	<title>Purchase Orders - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item current">📄 Purchase Orders</span>
				</div>
			</div>
			<div class="page-actions">
				<button class="btn btn-secondary" onclick={() => goto('/suppliers')}>
					Manage Suppliers
				</button>
				<button class="btn btn-primary" onclick={openCreateModal}>
					Create Purchase Order
				</button>
			</div>
		</div>
		
		<!-- Stats Cards -->
		<div class="metrics-grid">
			<div class="metric-card">
				<div class="metric-card-value">{stats.total}</div>
				<div class="metric-card-label">Total Orders</div>
			</div>
			<div class="metric-card metric-card-warning">
				<div class="metric-card-value">{stats.pending}</div>
				<div class="metric-card-label">Pending</div>
			</div>
			<div class="metric-card metric-card-accent">
				<div class="metric-card-value">{stats.shipped}</div>
				<div class="metric-card-label">Shipped</div>
			</div>
			<div class="metric-card metric-card-success">
				<div class="metric-card-value">{stats.delivered}</div>
				<div class="metric-card-label">Delivered</div>
			</div>
			<div class="metric-card">
				<div class="metric-card-value">{formatCurrency(stats.totalValue)}</div>
				<div class="metric-card-label">Total Value</div>
			</div>
		</div>
	</div>

	<div class="page-content">
		<!-- Filters and Search -->
		<div class="filters-section">
			<div class="search-box">
				<input 
					type="text" 
					placeholder="Search orders..." 
					bind:value={searchTerm}
					class="search-input"
				/>
			</div>
			
			<div class="filters">
				<select bind:value={statusFilter} class="filter-select">
					<option value="all">All Statuses</option>
					<option value="draft">Draft</option>
					<option value="pending">Pending</option>
					<option value="shipped">Shipped</option>
					<option value="delivered">Delivered</option>
				</select>
				
				<select bind:value={supplierFilter} class="filter-select">
					<option value="all">All Suppliers</option>
					{#each suppliers as supplier}
						<option value={supplier.name}>{supplier.name}</option>
					{/each}
				</select>
				
				<select bind:value={sortBy} class="filter-select">
					<option value="orderDate">Order Date</option>
					<option value="totalAmount">Total Amount</option>
					<option value="supplier">Supplier</option>
					<option value="status">Status</option>
				</select>
				
				<button 
					class="sort-order-btn"
					onclick={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
				>
					{sortOrder === 'asc' ? '↑' : '↓'}
				</button>
			</div>
		</div>

		<!-- Bulk Actions -->
		{#if selectedOrders.length > 0}
			<div class="bulk-actions">
				<span class="selected-count">{selectedOrders.length} orders selected</span>
				<div class="bulk-buttons">
					<button class="btn-secondary" onclick={() => bulkUpdateStatus('pending')}>
						Mark as Pending
					</button>
					<button class="btn-secondary" onclick={() => bulkUpdateStatus('shipped')}>
						Mark as Shipped
					</button>
					<button class="btn-secondary" onclick={() => bulkUpdateStatus('delivered')}>
						Mark as Delivered
					</button>
				</div>
			</div>
		{/if}

		<!-- Purchase Orders Table -->
		<div class="table-container">
			<table class="orders-table">
				<thead>
					<tr>
						<th class="checkbox-col">
							<input 
								type="checkbox" 
								bind:checked={selectAll}
								onchange={toggleSelectAll}
							/>
						</th>
						<th>Order ID</th>
						<th>Supplier</th>
						<th>Status</th>
						<th>Order Date</th>
						<th>Expected Delivery</th>
						<th>Total Amount</th>
						<th>Items</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredOrders as order}
						<tr class="order-row">
							<td class="checkbox-col">
								<input 
									type="checkbox" 
									checked={selectedOrders.includes(order.id)}
									onchange={() => toggleOrder(order.id)}
								/>
							</td>
							<td class="order-id">
								<button class="link-button" onclick={() => viewOrderDetails(order)}>
									{order.id}
								</button>
							</td>
							<td class="supplier-cell">
								<div class="supplier-info">
									<div class="supplier-name">{order.supplier.name}</div>
									<div class="supplier-email">{order.supplier.email}</div>
								</div>
							</td>
							<td>
								<span class="status-badge {getStatusBadgeClass(order.status)}">
									{order.status}
								</span>
							</td>
							<td>{formatDate(order.orderDate)}</td>
							<td>{formatDate(order.expectedDelivery)}</td>
							<td class="amount-cell">{formatCurrency(order.totalAmount)}</td>
							<td class="items-count">{order.items.length} items</td>
							<td class="actions-cell">
								<div class="action-buttons">
									<button 
										class="action-btn" 
										onclick={() => viewOrderDetails(order)}
										title="View Details"
									>
										👁️
									</button>
									{#if order.status === 'draft'}
										<button 
											class="action-btn" 
											onclick={() => updateOrderStatus(order.id, 'pending')}
											title="Send Order"
										>
											📤
										</button>
									{/if}
									{#if order.status === 'pending'}
										<button 
											class="action-btn" 
											onclick={() => updateOrderStatus(order.id, 'shipped')}
											title="Mark as Shipped"
										>
											🚚
										</button>
									{/if}
									{#if order.status === 'shipped'}
										<button 
											class="action-btn" 
											onclick={() => updateOrderStatus(order.id, 'delivered')}
											title="Mark as Delivered"
										>
											✅
										</button>
									{/if}
									<button 
										class="action-btn" 
										onclick={() => duplicateOrder(order)}
										title="Duplicate Order"
									>
										📋
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Empty State -->
		{#if filteredOrders.length === 0}
			<div class="empty-state">
				<div class="empty-content">
					<div class="empty-icon">📄</div>
					<h3>No purchase orders found</h3>
					<p>Create your first purchase order to start managing inventory from suppliers</p>
					<button class="btn-primary" onclick={openCreateModal}>
						Create Purchase Order
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Create Purchase Order Modal -->
{#if showCreateModal}
	<div class="modal-overlay" onclick={closeCreateModal}>
		<div class="modal-content create-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3 class="modal-title">Create Purchase Order</h3>
				<button class="modal-close" onclick={closeCreateModal}>×</button>
			</div>
			
			<div class="modal-body">
				<div class="form-grid">
					<div class="form-group">
						<label class="form-label">Supplier</label>
						<select bind:value={newOrder.supplier} class="form-select">
							<option value="">Select a supplier...</option>
							{#each suppliers as supplier}
								<option value={supplier.name}>{supplier.name}</option>
							{/each}
						</select>
					</div>
					
					<div class="form-group">
						<label class="form-label">Expected Delivery</label>
						<input 
							type="date" 
							bind:value={newOrder.expectedDelivery}
							class="form-input"
						/>
					</div>
				</div>
				
				<div class="form-group">
					<label class="form-label">Notes</label>
					<textarea 
						bind:value={newOrder.notes}
						placeholder="Additional notes or special instructions..."
						class="form-textarea"
					></textarea>
				</div>
				
				<!-- Items Section -->
				<div class="items-section">
					<div class="items-header">
						<h4>Order Items</h4>
						<button class="btn-secondary" onclick={addItemToNewOrder}>
							Add Item
						</button>
					</div>
					
					{#each newOrder.items as item, index}
						<div class="item-row">
							<div class="item-fields">
								<input 
									type="text" 
									placeholder="Product Name"
									bind:value={item.productName}
									class="item-input"
								/>
								<input 
									type="text" 
									placeholder="SKU"
									bind:value={item.sku}
									class="item-input small"
								/>
								<input 
									type="text" 
									placeholder="Color"
									bind:value={item.color}
									class="item-input small"
								/>
								<input 
									type="text" 
									placeholder="Size"
									bind:value={item.size}
									class="item-input small"
								/>
								<input 
									type="number" 
									placeholder="Qty"
									bind:value={item.quantity}
									oninput={() => updateItemTotal(index)}
									class="item-input small"
								/>
								<input 
									type="number" 
									step="0.01"
									placeholder="Unit Cost"
									bind:value={item.unitCost}
									oninput={() => updateItemTotal(index)}
									class="item-input"
								/>
								<div class="item-total">
									{formatCurrency(item.totalCost || 0)}
								</div>
							</div>
							<button 
								class="remove-item-btn"
								onclick={() => removeItemFromNewOrder(index)}
							>
								🗑️
							</button>
						</div>
					{/each}
					
					{#if newOrder.items.length === 0}
						<div class="no-items">
							<p>No items added yet. Click "Add Item" to start building your order.</p>
						</div>
					{/if}
				</div>
				
				{#if newOrder.items.length > 0}
					<div class="order-total">
						<strong>Total: {formatCurrency(newOrder.items.reduce((sum, item) => sum + (item.totalCost || 0), 0))}</strong>
					</div>
				{/if}
			</div>
			
			<div class="modal-actions">
				<button class="btn-secondary" onclick={closeCreateModal}>
					Cancel
				</button>
				<button class="btn-primary" onclick={createPurchaseOrder}>
					Create Purchase Order
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Order Details Modal -->
{#if showOrderDetails && selectedOrder}
	<div class="modal-overlay" onclick={closeOrderDetails}>
		<div class="modal-content details-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3 class="modal-title">Purchase Order Details - {selectedOrder.id}</h3>
				<button class="modal-close" onclick={closeOrderDetails}>×</button>
			</div>
			
			<div class="modal-body">
				<div class="details-grid">
					<div class="details-section">
						<h4>Order Information</h4>
						<div class="detail-row">
							<span class="detail-label">Status:</span>
							<span class="status-badge {getStatusBadgeClass(selectedOrder.status)}">
								{selectedOrder.status}
							</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Order Date:</span>
							<span>{formatDate(selectedOrder.orderDate)}</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Expected Delivery:</span>
							<span>{formatDate(selectedOrder.expectedDelivery)}</span>
						</div>
						{#if selectedOrder.shippedDate}
							<div class="detail-row">
								<span class="detail-label">Shipped Date:</span>
								<span>{formatDate(selectedOrder.shippedDate)}</span>
							</div>
						{/if}
						{#if selectedOrder.deliveredDate}
							<div class="detail-row">
								<span class="detail-label">Delivered Date:</span>
								<span>{formatDate(selectedOrder.deliveredDate)}</span>
							</div>
						{/if}
						{#if selectedOrder.trackingNumber}
							<div class="detail-row">
								<span class="detail-label">Tracking Number:</span>
								<span class="tracking-number">{selectedOrder.trackingNumber}</span>
							</div>
						{/if}
					</div>
					
					<div class="details-section">
						<h4>Supplier Information</h4>
						<div class="detail-row">
							<span class="detail-label">Name:</span>
							<span>{selectedOrder.supplier.name}</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Email:</span>
							<span>{selectedOrder.supplier.email}</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Phone:</span>
							<span>{selectedOrder.supplier.phone}</span>
						</div>
					</div>
				</div>
				
				{#if selectedOrder.notes}
					<div class="notes-section">
						<h4>Notes</h4>
						<p class="notes-text">{selectedOrder.notes}</p>
					</div>
				{/if}
				
				<div class="items-details">
					<h4>Order Items</h4>
					<table class="items-table">
						<thead>
							<tr>
								<th>Product</th>
								<th>SKU</th>
								<th>Color</th>
								<th>Size</th>
								<th>Qty</th>
								<th>Unit Cost</th>
								<th>Total</th>
							</tr>
						</thead>
						<tbody>
							{#each selectedOrder.items as item}
								<tr>
									<td>{item.productName}</td>
									<td class="sku-cell">{item.sku}</td>
									<td>{item.color}</td>
									<td>{item.size}</td>
									<td class="qty-cell">{item.quantity}</td>
									<td class="cost-cell">{formatCurrency(item.unitCost)}</td>
									<td class="cost-cell">{formatCurrency(item.totalCost)}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="total-row">
								<td colspan="6"><strong>Total Amount:</strong></td>
								<td class="cost-cell"><strong>{formatCurrency(selectedOrder.totalAmount)}</strong></td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
			
			<div class="modal-actions">
				<button class="btn-secondary" onclick={closeOrderDetails}>
					Close
				</button>
				{#if selectedOrder.status !== 'delivered'}
					<button class="btn-primary" onclick={() => {
						const nextStatus = selectedOrder.status === 'draft' ? 'pending' : 
										selectedOrder.status === 'pending' ? 'shipped' : 'delivered';
						updateOrderStatus(selectedOrder.id, nextStatus);
						closeOrderDetails();
					}}>
						{selectedOrder.status === 'draft' ? 'Send Order' : 
						 selectedOrder.status === 'pending' ? 'Mark as Shipped' : 'Mark as Delivered'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

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

<style>
	.page {
		min-height: 100vh;
		background: #f6f6f7;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		padding: 1.5rem 2rem;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
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

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.stat-icon {
		font-size: 1.5rem;
		opacity: 0.7;
	}

	.stat-content {
		flex: 1;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: #202223;
		line-height: 1;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6d7175;
		margin-top: 0.25rem;
	}

	/* Filters */
	.filters-section {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		padding: 1rem 2rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.search-box {
		flex: 1;
		min-width: 300px;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.filters {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-select {
		padding: 0.5rem 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
	}

	.sort-order-btn {
		padding: 0.5rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 1rem;
	}

	/* Bulk Actions */
	.bulk-actions {
		background: #f0f8ff;
		border: 1px solid #b3d9ff;
		padding: 0.75rem 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.selected-count {
		font-weight: 500;
		color: #005bd3;
	}

	.bulk-buttons {
		display: flex;
		gap: 0.5rem;
	}

	/* Table */
	.table-container {
		background: white;
		overflow-x: auto;
	}

	.orders-table {
		width: 100%;
		border-collapse: collapse;
	}

	.orders-table th {
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

	.orders-table td {
		padding: 1rem;
		border-bottom: 1px solid #e1e1e1;
		vertical-align: middle;
	}

	.checkbox-col {
		width: 40px;
		text-align: center;
	}

	.order-row:hover {
		background: #fafbfb;
	}

	.order-id {
		font-weight: 500;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
	}

	.link-button {
		background: none;
		border: none;
		color: #005bd3;
		cursor: pointer;
		text-decoration: underline;
		font-family: inherit;
		font-size: inherit;
	}

	.supplier-cell {
		min-width: 200px;
	}

	.supplier-name {
		font-weight: 500;
		color: #202223;
	}

	.supplier-email {
		font-size: 0.8125rem;
		color: #6d7175;
		margin-top: 0.25rem;
	}

	.amount-cell {
		font-weight: 500;
		text-align: right;
	}

	.items-count {
		text-align: center;
		color: #6d7175;
	}

	.actions-cell {
		width: 120px;
	}

	.action-buttons {
		display: flex;
		gap: 0.25rem;
	}

	.action-btn {
		background: none;
		border: 1px solid #c9cccf;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: #f6f6f7;
		border-color: #005bd3;
	}

	/* Status Badges */
	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.status-draft {
		background: #f3f4f6;
		color: #374151;
	}

	.status-pending {
		background: #fef3c7;
		color: #92400e;
	}

	.status-shipped {
		background: #dbeafe;
		color: #1e40af;
	}

	.status-delivered {
		background: #d1fae5;
		color: #065f46;
	}

	/* Buttons */
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
		border: none;
	}

	.btn-primary {
		background: #005bd3;
		color: white;
	}

	.btn-primary:hover {
		background: #004499;
	}

	.btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.btn-secondary:hover {
		background: #f6f6f7;
	}

	/* Empty State */
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

	/* Modals */
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

	.modal-content {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.create-modal {
		max-width: 800px;
	}

	.details-modal {
		max-width: 900px;
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

	.modal-body {
		padding: 2rem;
	}

	.modal-actions {
		padding: 1.5rem 2rem;
		border-top: 1px solid #e1e3e5;
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		background: #fafbfb;
	}

	/* Form Elements */
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-label {
		font-weight: 500;
		color: #202223;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.form-input, .form-select, .form-textarea {
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 8px;
		font-size: 0.875rem;
		transition: border-color 0.15s ease;
	}

	.form-input:focus, .form-select:focus, .form-textarea:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 3px rgba(0, 91, 211, 0.1);
	}

	.form-textarea {
		resize: vertical;
		min-height: 80px;
	}

	/* Items Section */
	.items-section {
		margin-top: 1.5rem;
	}

	.items-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.items-header h4 {
		margin: 0;
		color: #202223;
	}

	.item-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		padding: 0.75rem;
		background: #f6f6f7;
		border-radius: 8px;
	}

	.item-fields {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 0.8fr 1fr 1fr;
		gap: 0.5rem;
		flex: 1;
		align-items: center;
	}

	.item-input {
		padding: 0.5rem;
		border: 1px solid #c9cccf;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.item-input.small {
		min-width: 80px;
	}

	.item-total {
		font-weight: 500;
		color: #202223;
		text-align: right;
	}

	.remove-item-btn {
		background: #fee2e2;
		border: 1px solid #fecaca;
		color: #dc2626;
		border-radius: 4px;
		padding: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.remove-item-btn:hover {
		background: #fca5a5;
	}

	.no-items {
		text-align: center;
		color: #6d7175;
		padding: 2rem;
		font-style: italic;
	}

	.order-total {
		text-align: right;
		padding: 1rem;
		background: #f0f8ff;
		border: 1px solid #b3d9ff;
		border-radius: 8px;
		margin-top: 1rem;
		font-size: 1.125rem;
	}

	/* Details Modal Specific */
	.details-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-bottom: 1.5rem;
	}

	.details-section h4 {
		margin: 0 0 1rem 0;
		color: #202223;
		font-size: 1rem;
		font-weight: 600;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.detail-label {
		font-weight: 500;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.tracking-number {
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
		background: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8125rem;
	}

	.notes-section {
		margin-bottom: 1.5rem;
	}

	.notes-section h4 {
		margin: 0 0 0.5rem 0;
		color: #202223;
	}

	.notes-text {
		background: #f6f6f7;
		padding: 0.75rem;
		border-radius: 6px;
		color: #374151;
		line-height: 1.5;
		margin: 0;
	}

	.items-details h4 {
		margin: 0 0 1rem 0;
		color: #202223;
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		overflow: hidden;
	}

	.items-table th {
		background: #fafbfb;
		padding: 0.75rem;
		text-align: left;
		font-weight: 500;
		font-size: 0.8125rem;
		color: #6d7175;
		border-bottom: 1px solid #e1e1e1;
	}

	.items-table td {
		padding: 0.75rem;
		border-bottom: 1px solid #f3f4f6;
		font-size: 0.875rem;
	}

	.sku-cell {
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
		font-size: 0.8125rem;
	}

	.qty-cell, .cost-cell {
		text-align: right;
	}

	.total-row {
		background: #fafbfb;
		font-weight: 500;
	}

	.total-row td {
		border-bottom: none;
	}

	/* Toast Notifications */
	.toast-container {
		position: fixed;
		top: 5rem;
		right: 2rem;
		z-index: 1100;
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

	/* Responsive */
	@media (max-width: 768px) {
		.header-main {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
		
		.header-actions {
			justify-content: space-between;
		}
		
		.stats-grid {
			grid-template-columns: 1fr;
		}
		
		.filters-section {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}
		
		.search-box {
			min-width: auto;
		}
		
		.filters {
			flex-wrap: wrap;
		}
		
		.orders-table {
			min-width: 800px;
		}
		
		.form-grid {
			grid-template-columns: 1fr;
		}
		
		.item-fields {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		
		.details-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
</style>