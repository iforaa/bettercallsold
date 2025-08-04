<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	// State management
	let customers: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	
	// Client-side data fetching
	async function loadCustomers() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch('/api/customers');
			
			if (!response.ok) {
				throw new Error('Failed to fetch customers');
			}

			const data = await response.json();
			customers = data;
		} catch (err) {
			console.error('Load customers error:', err);
			error = 'Failed to load customers from backend';
			customers = [];
		} finally {
			loading = false;
		}
	}

	// Load customers when component mounts
	onMount(() => {
		loadCustomers();
	});
	
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	// Navigate to customer detail page
	function goToCustomer(customerId: string) {
		goto(`/customers/${customerId}`);
	}

	// Navigate to customer edit page (placeholder for now)
	function editCustomer(customerId: string) {
		// For now, just navigate to customer detail page
		goToCustomer(customerId);
	}
</script>

<svelte:head>
	<title>Customers - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">👥</span>
				Customers
			</h1>
			<div class="header-actions">
				<button class="btn-secondary">Export</button>
				<button class="btn-primary">Add customer</button>
			</div>
		</div>
	</div>

	<div class="page-content">
		{#if error}
			<div class="error-state">
				<p>{error}</p>
				<button class="btn-secondary" onclick={() => loadCustomers()}>
					Retry
				</button>
			</div>
		{:else if loading}
			<!-- Loading state -->
			<div class="loading-state">
				<div class="loading-content">
					<div class="loading-spinner-large"></div>
					<h3>Loading customers...</h3>
					<p>This may take a moment</p>
				</div>
			</div>
		{:else if customers && customers.length > 0}
			<div class="table-container">
				<table class="customers-table">
					<thead>
						<tr>
							<th>Customer</th>
							<th>Email</th>
							<th>Role</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each customers as customer}
							<tr class="customer-row clickable" onclick={() => goToCustomer(customer.id)}>
								<td>
									<div class="customer-info">
										<div class="customer-avatar">
											{customer.name.charAt(0).toUpperCase()}
										</div>
										<div class="customer-details">
											<div class="customer-name">{customer.name}</div>
											<div class="customer-id">ID: {customer.id.slice(0, 8)}...</div>
										</div>
									</div>
								</td>
								<td>{customer.email}</td>
								<td>
									<span class="role-badge customer">
										{customer.role}
									</span>
								</td>
								<td>
									<span class="status-badge active">
										Active
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
			<div class="pagination">
				<span class="pagination-info">Showing {customers.length} customers</span>
			</div>
		{:else}
			<div class="empty-state">
				<div class="empty-content">
					<div class="empty-icon">👥</div>
					<h3>No customers yet</h3>
					<p>When customers sign up, they'll appear here</p>
					<button class="btn-primary">Add customer</button>
				</div>
			</div>
		{/if}
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
		border: none;
	}

	.btn-primary {
		background: #202223;
		color: white;
	}

	.btn-primary:hover {
		background: #1a1a1a;
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

	.table-container {
		background: white;
		overflow-x: auto;
	}

	.customers-table {
		width: 100%;
		border-collapse: collapse;
	}

	.customers-table th {
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

	.customers-table td {
		padding: 1rem;
		border-bottom: 1px solid #e1e1e1;
		vertical-align: middle;
	}

	.customer-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.customer-avatar {
		width: 40px;
		height: 40px;
		background: #3b82f6;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		color: white;
		font-size: 0.875rem;
	}

	.customer-details {
		flex: 1;
	}

	.customer-name {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.customer-id {
		color: #6d7175;
		font-size: 0.8125rem;
	}

	.role-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.role-badge.customer {
		background: #dbeafe;
		color: #1e40af;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-badge.active {
		background: #d1fae5;
		color: #047857;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		padding: 0.25rem 0.5rem;
		border: 1px solid #c9cccf;
		background: white;
		color: #6d7175;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: #f6f6f7;
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
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

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
		width: 40px;
		height: 40px;
		border: 4px solid #f3f4f6;
		border-radius: 50%;
		border-top-color: #202223;
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

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.customer-row.clickable {
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.customer-row.clickable:hover {
		background: #fafbfb;
	}

	@media (max-width: 768px) {
		.header-main {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
		
		.header-actions {
			justify-content: flex-end;
		}
		
		.customers-table {
			min-width: 800px;
		}
	}
</style>