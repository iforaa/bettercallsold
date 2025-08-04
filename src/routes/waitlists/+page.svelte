<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();
	
	// State management
	let waitlists: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');

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
			<div class="waitlists-container">
				<div class="waitlists-summary">
					<div class="summary-card">
						<h3>Total Entries</h3>
						<div class="summary-number">{waitlists.length}</div>
					</div>
					<div class="summary-card">
						<h3>Products</h3>
						<div class="summary-number">{new Set(waitlists.map(w => w.product_id).filter(Boolean)).size}</div>
					</div>
					<div class="summary-card">
						<h3>Users</h3>
						<div class="summary-number">{new Set(waitlists.map(w => w.user_id).filter(Boolean)).size}</div>
					</div>
					<div class="summary-card">
						<h3>Authorized</h3>
						<div class="summary-number">{waitlists.filter(w => w.authorized_at).length}</div>
					</div>
				</div>

				<div class="waitlists-table-container">
					<table class="waitlists-table">
						<thead>
							<tr>
								<th>Position</th>
								<th>User</th>
								<th>Product</th>
								<th>Inventory</th>
								<th>Source</th>
								<th>Created</th>
								<th>Status</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each waitlists as waitlist}
								<tr>
									<td>
										<div class="position">
											<strong>#{waitlist.position || 'N/A'}</strong>
										</div>
									</td>
									<td>
										<div class="user-info">
											<strong>{waitlist.user_name || 'Unknown User'}</strong>
											{#if waitlist.user_email}
												<div class="user-email">{waitlist.user_email}</div>
											{/if}
										</div>
									</td>
									<td>
										<div class="product-info">
											<strong>{waitlist.product_name || 'No Product'}</strong>
											{#if waitlist.product_price}
												<div class="product-price">{formatCurrency(waitlist.product_price)}</div>
											{/if}
										</div>
									</td>
									<td>
										<div class="inventory-info">
											{#if waitlist.color || waitlist.size}
												<div class="inventory-details">
													{#if waitlist.color}<span class="detail-badge">{waitlist.color}</span>{/if}
													{#if waitlist.size}<span class="detail-badge">{waitlist.size}</span>{/if}
												</div>
											{/if}
											{#if waitlist.inventory_quantity !== null}
												<div class="inventory-quantity">
													Qty: {waitlist.inventory_quantity}
												</div>
											{/if}
										</div>
									</td>
									<td>
										<span class="source-badge {getOrderSourceBadgeColor(waitlist.order_source)}">
											{getOrderSourceLabel(waitlist.order_source)}
										</span>
									</td>
									<td>{formatDate(waitlist.created_at)}</td>
									<td>
										{#if waitlist.authorized_at}
											<span class="status-badge green">Authorized</span>
										{:else}
											<span class="status-badge orange">Pending</span>
										{/if}
									</td>
									<td>
										<div class="actions">
											<button class="btn-sm" onclick={() => alert('View waitlist details coming soon!')}>
												View
											</button>
											<button class="btn-sm secondary" onclick={() => alert('Edit waitlist coming soon!')}>
												Edit
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

	.waitlists-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem 2rem;
	}

	.waitlists-summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.summary-card {
		background: white;
		padding: 1.5rem;
		border-radius: 8px;
		border: 1px solid #e1e1e1;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		position: relative;
	}

	.summary-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4px;
		border-radius: 8px 8px 0 0;
		background: #005bd3;
	}

	.summary-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 0.75rem;
		color: #6d7175;
		text-transform: uppercase;
		font-weight: 500;
		letter-spacing: 0.5px;
	}

	.summary-number {
		font-size: 2rem;
		font-weight: 600;
		color: #202223;
	}

	.waitlists-table-container {
		background: white;
		border-radius: 8px;
		border: 1px solid #e1e1e1;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.waitlists-table {
		width: 100%;
		border-collapse: collapse;
	}

	.waitlists-table th {
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

	.waitlists-table td {
		padding: 1rem;
		border-bottom: 1px solid #e1e1e1;
		vertical-align: middle;
	}

	.waitlists-table tr:last-child td {
		border-bottom: none;
	}

	.position strong {
		color: #202223;
		font-family: monospace;
		font-size: 0.875rem;
	}

	.user-info strong {
		color: #202223;
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
	}

	.user-email {
		color: #6d7175;
		font-size: 0.8125rem;
	}

	.product-info strong {
		color: #202223;
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
	}

	.product-price {
		color: #6d7175;
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.inventory-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.inventory-details {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.detail-badge {
		background: #f3f4f6;
		color: #374151;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.inventory-quantity {
		color: #6d7175;
		font-size: 0.75rem;
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

	.status-badge.green {
		background: #d1fae5;
		color: #047857;
	}

	.status-badge.orange {
		background: #fef3c7;
		color: #92400e;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-sm {
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		border: none;
		background: #202223;
		color: white;
	}

	.btn-sm:hover {
		background: #1a1a1a;
	}

	.btn-sm.secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.btn-sm.secondary:hover {
		background: #f6f6f7;
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
		
		.waitlists-container {
			padding: 1rem;
		}
		
		.waitlists-summary {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.waitlists-table-container {
			overflow-x: auto;
		}
		
		.waitlists-table {
			min-width: 1000px;
		}
		
		.empty-state {
			margin: 1rem;
		}
	}
</style>