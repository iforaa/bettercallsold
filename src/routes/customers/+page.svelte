<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
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
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item current">👥 Customers</span>
				</div>
			</div>
			<div class="page-actions">
				<!-- Actions removed as requested -->
			</div>
		</div>
	</div>

	<div class="page-content-padded">
		{#if error}
			<div class="error-state">
				<div class="error-state-content">
					<div class="error-state-icon">⚠</div>
					<h1 class="error-state-title">Error Loading Customers</h1>
					<p class="error-state-message">{error}</p>
					<div class="error-state-actions">
						<button class="btn btn-primary" onclick={() => loadCustomers()}>
							Retry
						</button>
					</div>
				</div>
			</div>
		{:else if loading}
			<LoadingState message="Loading customers..." size="lg" />
		{:else if customers && customers.length > 0}
			<div class="content-section">
				<div class="table-container">
					<table class="table">
					<thead>
						<tr>
							<th class="table-cell-main">Customer</th>
							<th>Email</th>
							<th>Orders</th>
							<th>Amount spent</th>
							<th>Location</th>
						</tr>
					</thead>
					<tbody>
						{#each customers as customer}
							<tr class="table-row table-row-clickable" onclick={() => goToCustomer(customer.id)}>
								<td class="table-cell-main">
									<div class="table-cell-content">
										<div class="table-cell-media">
											<div class="table-cell-placeholder">
												{customer.name.charAt(0).toUpperCase()}
											</div>
										</div>
										<div class="table-cell-details">
											<span class="table-cell-title">{customer.name}</span>
											<span class="table-cell-subtitle">ID: {customer.id.slice(0, 8)}...</span>
										</div>
									</div>
								</td>
								<td>
									<span class="table-cell-text">{customer.email}</span>
								</td>
								<td>
									<span class="table-cell-text">{customer.order_count || 0}</span>
								</td>
								<td>
									<span class="table-cell-text">${parseFloat(customer.total_spent || 0).toFixed(2)}</span>
								</td>
								<td>
									<span class="table-cell-text">{customer.location || 'No location'}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
			<div class="content-footer">
				<div class="table-summary">Showing {customers.length} of {customers.length} customers</div>
			</div>
		</div>
		{:else}
			<div class="empty-state">
				<div class="empty-state-content">
					<div class="empty-state-icon">👥</div>
					<h1 class="empty-state-title">No customers yet</h1>
					<p class="empty-state-message">When customers sign up, they'll appear here</p>
					<div class="empty-state-actions">
						<button class="btn btn-primary">Add customer</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Minimal custom styles - most styling now handled by design system */
	
	/* Responsive adjustments not covered by design system */
	@media (max-width: 768px) {
		.table {
			min-width: 600px;
		}
		
		.page-actions {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-2);
		}
	}
</style>