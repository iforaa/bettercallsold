<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();
	
	// State management
	let waitlists: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let selectedWaitlists: string[] = $state([]);
	let selectAll = $state(false);

	// Import goto for navigation
	import { goto } from '$app/navigation';

	// Client-side data fetching
	async function loadWaitlists() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch('/api/waitlists');
			
			if (!response.ok) {
				throw new Error('Failed to fetch waitlists');
			}

			const data = await response.json();
			waitlists = data;
		} catch (err) {
			console.error('Load waitlists error:', err);
			error = 'Failed to load waitlists from backend';
			waitlists = [];
		} finally {
			loading = false;
		}
	}

	// Load waitlists when component mounts
	onMount(() => {
		loadWaitlists();
	});
	
	function formatCurrency(amount: number) {
		if (!amount) return '$0.00';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}
	
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getOrderSourceBadgeColor(source: number) {
		switch (source) {
			case 1: return 'blue'; // Instagram
			case 2: return 'purple'; // Facebook
			case 3: return 'green'; // Website
			case 4: return 'orange'; // TikTok
			default: return 'gray';
		}
	}

	function getOrderSourceLabel(source: number) {
		switch (source) {
			case 1: return 'Instagram';
			case 2: return 'Facebook';
			case 3: return 'Website';
			case 4: return 'TikTok';
			default: return 'Other';
		}
	}

	function toggleSelectAll() {
		if (selectAll) {
			selectedWaitlists = waitlists?.map(w => w.id) || [];
		} else {
			selectedWaitlists = [];
		}
	}

	function toggleWaitlist(waitlistId: string) {
		if (selectedWaitlists.includes(waitlistId)) {
			selectedWaitlists = selectedWaitlists.filter(id => id !== waitlistId);
		} else {
			selectedWaitlists = [...selectedWaitlists, waitlistId];
		}
		selectAll = selectedWaitlists.length === waitlists?.length;
	}
</script>

<svelte:head>
	<title>Waitlists - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">⏱️</span>
				Waitlists
			</h1>
			<div class="header-actions">
				<button class="btn-secondary">Export</button>
				<button class="btn-primary" onclick={() => alert('Add to waitlist coming soon!')}>
					Add to waitlist
				</button>
			</div>
		</div>
	</div>

	<div class="page-content">
		{#if error}
			<div class="error-state">
				<p>{error}</p>
				<button class="btn-secondary" onclick={() => loadWaitlists()}>
					Retry
				</button>
			</div>
		{:else if loading}
			<!-- Loading state -->
			<div class="loading-state">
				<div class="loading-content">
					<div class="loading-spinner-large"></div>
					<h3>Loading waitlists...</h3>
					<p>This may take a moment</p>
				</div>
			</div>
		{:else if waitlists && waitlists.length > 0}
			<!-- Table -->
			<div class="table-container">
				<table class="waitlists-table">
					<thead>
						<tr>
							<th class="checkbox-col">
								<input 
									type="checkbox" 
									bind:checked={selectAll}
									onchange={toggleSelectAll}
								/>
							</th>
							<th class="customer-col">Customer</th>
							<th class="product-col">Product</th>
							<th>Position</th>
							<th>Status</th>
							<th>Source</th>
							<th>Date</th>
						</tr>
					</thead>
					<tbody>
						{#each waitlists as waitlist}
							<tr class="waitlist-row" onclick={() => goto(`/waitlists/${waitlist.id}`)}>
								<td class="checkbox-col" onclick={(e) => e.stopPropagation()}>
									<input 
										type="checkbox" 
										checked={selectedWaitlists.includes(waitlist.id)}
										onchange={() => toggleWaitlist(waitlist.id)}
									/>
								</td>
								<td class="customer-col">
									<div class="customer-info">
										<div class="customer-name">{waitlist.user_name || 'Unknown User'}</div>
										{#if waitlist.user_email}
											<div class="customer-email">{waitlist.user_email}</div>
										{/if}
									</div>
								</td>
								<td class="product-col">
									<div class="product-info">
										<div class="product-image">
											📦
										</div>
										<div class="product-details">
											<div class="product-title">{waitlist.product_name || 'No Product'}</div>
											<div class="product-variants">
												{#if waitlist.color || waitlist.size}
													{#if waitlist.color}<span class="variant-badge">{waitlist.color}</span>{/if}
													{#if waitlist.size}<span class="variant-badge">{waitlist.size}</span>{/if}
												{:else}
													<span class="price">{formatCurrency(waitlist.product_price || 0)}</span>
												{/if}
											</div>
										</div>
									</div>
								</td>
								<td>
									<span class="position-number">#{waitlist.position || 'N/A'}</span>
								</td>
								<td>
									{#if waitlist.authorized_at}
										<span class="status-badge authorized">Authorized</span>
									{:else}
										<span class="status-badge pending">Pending</span>
									{/if}
								</td>
								<td>
									<span class="source-badge {getOrderSourceBadgeColor(waitlist.order_source)}">
										{getOrderSourceLabel(waitlist.order_source)}
									</span>
								</td>
								<td>
									<span class="date">{formatDate(waitlist.created_at)}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="pagination">
				<span class="pagination-info">1-{waitlists.length}</span>
			</div>
		{:else}
			<div class="empty-state">
				<div class="empty-icon">⏱️</div>
				<h3>No waitlists found</h3>
				<p>Waitlist entries will appear here when customers join product waitlists.</p>
				<button class="btn-primary" onclick={() => alert('Add to waitlist coming soon!')}>
					Add First Entry
				</button>
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
	}

	.btn-primary {
		background: #202223;
		color: white;
		border: none;
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

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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

	.table-container {
		background: white;
		overflow-x: auto;
	}

	.waitlists-table {
		width: 100%;
		border-collapse: collapse;
	}

	.waitlists-table th {
		background: #fafbfb;
		padding: 0.5rem 1rem;
		text-align: left;
		font-weight: 500;
		font-size: 0.75rem;
		color: #6d7175;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		border-bottom: 1px solid #e1e1e1;
	}

	.waitlists-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e1e1e1;
		vertical-align: middle;
	}

	.checkbox-col {
		width: 40px;
		padding: 0.75rem 0.5rem 0.75rem 1rem;
	}

	.customer-col {
		min-width: 200px;
		width: 25%;
	}

	.product-col {
		min-width: 250px;
		width: 30%;
	}

	.customer-info {
		display: flex;
		flex-direction: column;
	}

	.customer-name {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.customer-email {
		color: #6d7175;
		font-size: 0.8125rem;
	}

	.product-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.product-image {
		width: 40px;
		height: 40px;
		background: #f6f6f7;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		overflow: hidden;
		border: 1px solid #e1e3e5;
		flex-shrink: 0;
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

	.product-variants {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.variant-badge {
		background: #f3f4f6;
		color: #374151;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.price {
		color: #6d7175;
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.position-number {
		font-family: monospace;
		font-weight: 600;
		color: #202223;
		font-size: 0.875rem;
	}

	.source-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.source-badge.blue {
		background: #dbeafe;
		color: #1e40af;
	}

	.source-badge.purple {
		background: #ede9fe;
		color: #7c3aed;
	}

	.source-badge.green {
		background: #d1fae5;
		color: #047857;
	}

	.source-badge.orange {
		background: #fef3c7;
		color: #92400e;
	}

	.source-badge.gray {
		background: #f3f4f6;
		color: #6d7175;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-badge.authorized {
		background: #d1fae5;
		color: #047857;
	}

	.status-badge.pending {
		background: #fef3c7;
		color: #92400e;
	}

	.date {
		font-size: 0.875rem;
		color: #6d7175;
	}

	.waitlist-row {
		cursor: pointer;
	}

	.waitlist-row:hover {
		background: #fafbfb;
	}

	input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
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
		text-align: center;
		padding: 4rem 2rem;
		background: white;
		border-radius: 8px;
		border: 1px solid #e1e1e1;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		margin: 2rem;
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

	@media (max-width: 768px) {
		.header-main {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
		
		.header-actions {
			justify-content: flex-end;
		}
		
		.waitlists-table {
			min-width: 800px;
		}
		
		.empty-state {
			margin: 1rem;
		}
	}
</style>