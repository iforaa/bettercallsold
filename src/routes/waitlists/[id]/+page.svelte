<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	let waitlistEntry: any = $state(null);
	let loading = $state(true);
	let error = $state('');

	async function loadWaitlistEntry() {
		if (!browser) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch(`/api/waitlists/${data.waitlistId}`);
			
			if (!response.ok) {
				if (response.status === 404) {
					error = 'Waitlist entry not found';
				} else {
					throw new Error('Failed to fetch waitlist entry');
				}
				return;
			}

			const waitlistData = await response.json();
			waitlistEntry = waitlistData;
		} catch (err) {
			console.error('Load waitlist entry error:', err);
			error = 'Failed to load waitlist entry details';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadWaitlistEntry();
	});

	function formatCurrency(amount: number) {
		if (!amount) return '$0.00';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString();
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

	function getOrderSourceBadgeColor(source: number) {
		switch (source) {
			case 1: return 'blue'; // Instagram
			case 2: return 'purple'; // Facebook
			case 3: return 'green'; // Website
			case 4: return 'orange'; // TikTok
			default: return 'gray';
		}
	}

	function goBack() {
		goto('/waitlists');
	}
</script>

<svelte:head>
	<title>Waitlist Details - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<div class="header-left">
				<button class="back-btn" onclick={goBack}>
					← Back to Waitlists
				</button>
				<h1>
					<span class="page-icon">⏱️</span>
					Waitlist Details
				</h1>
			</div>
			<div class="header-right">
				<button class="btn-primary" onclick={() => alert('Edit waitlist functionality coming soon!')}>
					Edit Entry
				</button>
			</div>
		</div>
	</div>

	<div class="page-content">
		{#if error}
			<div class="error-state">
				<div class="error-content">
					<div class="error-icon">⚠️</div>
					<h3>Error</h3>
					<p>{error}</p>
					<div class="error-actions">
						<button class="btn-secondary" onclick={() => loadWaitlistEntry()}>
							Retry
						</button>
						<button class="btn-primary" onclick={goBack}>
							Back to Waitlists
						</button>
					</div>
				</div>
			</div>
		{:else if loading}
			<div class="loading-state">
				<div class="loading-content">
					<div class="loading-spinner-large"></div>
					<h3>Loading waitlist details...</h3>
					<p>Please wait while we fetch the waitlist information</p>
				</div>
			</div>
		{:else if waitlistEntry}
			<div class="waitlist-details">
				<div class="waitlist-header">
					<div class="waitlist-info">
						<h2>Waitlist Entry #{waitlistEntry.id.slice(0, 8)}...</h2>
						<div class="waitlist-meta">
							<span class="waitlist-date">{formatDate(waitlistEntry.created_at)}</span>
							<span class="position-badge">
								Position #{waitlistEntry.position || 'N/A'}
							</span>
							{#if waitlistEntry.authorized_at}
								<span class="status-badge green">Authorized</span>
							{:else}
								<span class="status-badge orange">Pending</span>
							{/if}
						</div>
					</div>
				</div>

				<div class="waitlist-content">
					<div class="waitlist-section">
						<h3>Customer Information</h3>
						<div class="info-card">
							<div class="customer-details clickable" onclick={() => goto(`/customers/${waitlistEntry.user_id}`)}>
								<div class="customer-name">{waitlistEntry.user_name}</div>
								<div class="customer-email">{waitlistEntry.user_email}</div>
								<div class="customer-id">Customer ID: {waitlistEntry.user_id}</div>
							</div>
						</div>
					</div>

					<div class="waitlist-section">
						<h3>Product Information</h3>
						<div class="info-card">
							<div class="product-details clickable" onclick={() => goto(`/products/${waitlistEntry.product_id}`)}>
								{#if waitlistEntry.product_images && waitlistEntry.product_images.length > 0}
									<div class="product-image">
										<img src="{waitlistEntry.product_images[0].url}" alt="{waitlistEntry.product_name}" />
									</div>
								{/if}
								<div class="product-info">
									<div class="product-name">{waitlistEntry.product_name}</div>
									{#if waitlistEntry.product_price}
										<div class="product-price">{formatCurrency(waitlistEntry.product_price)}</div>
									{/if}
									{#if waitlistEntry.color || waitlistEntry.size}
										<div class="product-variants">
											{#if waitlistEntry.color}<span class="variant-badge">{waitlistEntry.color}</span>{/if}
											{#if waitlistEntry.size}<span class="variant-badge">{waitlistEntry.size}</span>{/if}
										</div>
									{/if}
									{#if waitlistEntry.inventory_quantity !== null}
										<div class="inventory-info">Available: {waitlistEntry.inventory_quantity}</div>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<div class="waitlist-section">
						<h3>Waitlist Details</h3>
						<div class="info-card">
							<div class="waitlist-summary">
								<div class="summary-row">
									<span>Entry ID:</span>
									<span class="monospace">{waitlistEntry.id}</span>
								</div>
								<div class="summary-row">
									<span>Position:</span>
									<span class="position-highlight">#{waitlistEntry.position || 'N/A'}</span>
								</div>
								<div class="summary-row">
									<span>Source:</span>
									<span class="source-badge {getOrderSourceBadgeColor(waitlistEntry.order_source)}">
										{getOrderSourceLabel(waitlistEntry.order_source)}
									</span>
								</div>
								<div class="summary-row">
									<span>Created:</span>
									<span>{formatDate(waitlistEntry.created_at)}</span>
								</div>
								{#if waitlistEntry.authorized_at}
									<div class="summary-row">
										<span>Authorized:</span>
										<span>{formatDate(new Date(waitlistEntry.authorized_at * 1000).toISOString())}</span>
									</div>
								{/if}
								{#if waitlistEntry.comment_id}
									<div class="summary-row">
										<span>Comment ID:</span>
										<span class="monospace">{waitlistEntry.comment_id}</span>
									</div>
								{/if}
								{#if waitlistEntry.instagram_comment_id}
									<div class="summary-row">
										<span>Instagram Comment:</span>
										<span class="monospace">{waitlistEntry.instagram_comment_id}</span>
									</div>
								{/if}
								{#if waitlistEntry.local_pickup}
									<div class="summary-row">
										<span>Pickup:</span>
										<span class="status-badge blue">Local Pickup</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
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

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-btn {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		color: #6d7175;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.15s ease;
	}

	.back-btn:hover {
		background: #f6f6f7;
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

	.page-content {
		padding: 2rem;
	}

	.error-state, .loading-state {
		background: white;
		border-radius: 8px;
		padding: 4rem 2rem;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e1e1e1;
	}

	.error-content, .loading-content {
		max-width: 400px;
		margin: 0 auto;
	}

	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.6;
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

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.waitlist-details {
		max-width: 1200px;
		margin: 0 auto;
	}

	.waitlist-header {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		margin-bottom: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e1e1e1;
	}

	.waitlist-info h2 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #202223;
		font-family: monospace;
	}

	.waitlist-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.waitlist-date {
		color: #6d7175;
		font-size: 0.875rem;
	}

	.position-badge {
		padding: 0.25rem 0.5rem;
		background: #f3f4f6;
		color: #374151;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		font-family: monospace;
	}

	.waitlist-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
	}

	.waitlist-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.info-card {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e1e1e1;
	}

	.customer-details.clickable, .product-details.clickable {
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 6px;
		transition: all 0.15s ease;
		margin: -0.5rem;
	}

	.customer-details.clickable:hover, .product-details.clickable:hover {
		background: #f6f6f7;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.customer-name, .product-name {
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
		margin-bottom: 0.5rem;
	}

	.customer-email {
		color: #6d7175;
		margin-bottom: 0.5rem;
	}

	.customer-id {
		color: #6d7175;
		font-size: 0.875rem;
		font-family: monospace;
	}

	.product-details {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.product-image {
		width: 80px;
		height: 80px;
		border-radius: 6px;
		overflow: hidden;
		flex-shrink: 0;
		background: #f3f4f6;
	}

	.product-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.product-info {
		flex: 1;
	}

	.product-price {
		color: #202223;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.product-variants {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}

	.variant-badge {
		background: #e5e7eb;
		color: #374151;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.inventory-info {
		color: #6d7175;
		font-size: 0.875rem;
	}

	.waitlist-summary {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.summary-row:last-child {
		border-bottom: none;
	}

	.monospace {
		font-family: monospace;
		font-size: 0.875rem;
	}

	.position-highlight {
		font-family: monospace;
		font-weight: 600;
		color: #202223;
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

	.status-badge.blue {
		background: #dbeafe;
		color: #1e40af;
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

	.btn-primary, .btn-secondary {
		padding: 0.75rem 1.5rem;
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

	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}

		.waitlist-content {
			grid-template-columns: 1fr;
		}

		.waitlist-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.header-main {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.header-left {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.header-right {
			justify-content: flex-end;
		}

		.product-details {
			flex-direction: column;
		}

		.product-image {
			width: 100px;
			height: 100px;
			align-self: center;
		}
	}
</style>