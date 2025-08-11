<script lang="ts">
	let isConnected = true;
	let campaigns = [
		{ id: 1, name: 'Welcome Series', type: 'Automated', status: 'Active', sent: '2,341', opened: '1,876', clicked: '423' },
		{ id: 2, name: 'Holiday Sale 2024', type: 'Campaign', status: 'Draft', sent: '0', opened: '0', clicked: '0' },
		{ id: 3, name: 'Abandoned Cart Recovery', type: 'Automated', status: 'Active', sent: '1,567', opened: '892', clicked: '234' },
	];

	let segments = [
		{ id: 1, name: 'VIP Customers', count: 234, criteria: 'Placed 5+ orders, Total spent > $500' },
		{ id: 2, name: 'Recent Customers', count: 1456, criteria: 'Placed order in last 30 days' },
		{ id: 3, name: 'At-Risk Customers', count: 78, criteria: 'No purchase in 90+ days' },
	];

	function connectKlaviyo() {
		isConnected = true;
	}

	function disconnectKlaviyo() {
		isConnected = false;
	}
</script>

<svelte:head>
	<title>Klaviyo Integration - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="flex-header">
				<div class="klaviyo-logo">K</div>
				<div>
					<h1 class="page-title">Klaviyo</h1>
					<p class="page-subtitle">Email Marketing & Automation</p>
				</div>
			</div>
			<div class="page-actions">
				<div class="breadcrumb">
					<div class="breadcrumb-item">
						<span class="page-icon">📧</span>
						<span>Plugins</span>
					</div>
					<span class="breadcrumb-separator">›</span>
					<div class="breadcrumb-item">
						<span>Klaviyo</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="page-content-padded">
		{#if !isConnected}
			<!-- Connection Setup -->
			<div class="content-section">
				<div class="flex-center" style="min-height: 50vh;">
					<div class="content-narrow">
						<div class="card">
							<div class="card-body" style="text-align: center; padding: var(--space-12);">
								<div class="flex-column" style="align-items: center; margin-bottom: var(--space-8);">
									<div style="font-size: 4rem; margin-bottom: var(--space-6);">🔗</div>
									<h2 class="section-title" style="margin-bottom: var(--space-2);">Connect Klaviyo</h2>
									<p class="section-description" style="max-width: 500px;">
										Connect your Klaviyo account to sync customer data, send targeted emails, and automate your marketing campaigns.
									</p>
								</div>
								
								<div class="grid grid-cols-2 gap-6" style="margin-bottom: var(--space-10);">
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">✉️</span>
										<span>Automated email campaigns</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">👥</span>
										<span>Customer segmentation</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">📊</span>
										<span>Performance analytics</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">🎯</span>
										<span>Personalized recommendations</span>
									</div>
								</div>
								
								<div class="flex-column" style="align-items: center; gap: var(--space-4);">
									<button class="btn btn-primary btn-xl klaviyo-btn" on:click={connectKlaviyo}>
										Connect Klaviyo Account
									</button>
									<div class="bg-surface-alt rounded-md" style="padding: var(--space-4); max-width: 400px;">
										<div class="flex-center text-xs text-muted">
											<span style="margin-right: var(--space-2);">ℹ️</span>
											<span>Demo mode - This will simulate a connection for testing purposes</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Connected Dashboard -->
			<div class="content-section">
				<div class="card bg-success">
					<div class="card-body">
						<div class="flex-between items-center">
							<div class="flex-header">
								<div class="flex-center" style="width: 56px; height: 56px; background: rgba(22, 101, 52, 0.1); border-radius: var(--radius-full);">
									<span style="font-size: 1.75rem;">✅</span>
								</div>
								<div>
									<h3 class="card-title font-semibold">Connected to Klaviyo</h3>
									<p class="card-subtitle">Account: <span class="font-medium">demo@bettercallsold.com</span></p>
								</div>
							</div>
							<button class="btn btn-secondary btn-sm" on:click={disconnectKlaviyo}>Disconnect</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Overview Stats -->
			<div class="content-section">
				<div class="section-header">
					<h3 class="section-title">Email Marketing Overview</h3>
					<p class="section-description">Key metrics for your email campaigns and subscriber engagement</p>
				</div>
				<div class="metrics-grid">
					<div class="metric-card metric-card-bordered metric-card-accent">
						<div class="metric-card-value">2,341</div>
						<div class="metric-card-label">Total Subscribers</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-warning">
						<div class="metric-card-value">24.3%</div>
						<div class="metric-card-label">Open Rate</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-error">
						<div class="metric-card-value">3.8%</div>
						<div class="metric-card-label">Click Rate</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-success">
						<div class="metric-card-value">$12,456</div>
						<div class="metric-card-label">Revenue (30d)</div>
					</div>
				</div>
			</div>

			<!-- Campaigns -->
			<div class="grid grid-cols-2 gap-6">
				<div class="card">
					<div class="card-header">
						<div class="card-header-content">
							<h3 class="card-title">Email Campaigns</h3>
							<div class="card-actions">
								<button class="btn btn-primary btn-sm">+ Create Campaign</button>
							</div>
						</div>
					</div>
					<div class="table-responsive">
						<table class="data-table">
							<thead>
								<tr>
									<th>Campaign</th>
									<th>Type</th>
									<th>Status</th>
									<th>Sent</th>
									<th>Opened</th>
									<th>Clicked</th>
								</tr>
							</thead>
							<tbody>
								{#each campaigns as campaign}
									<tr>
										<td class="table-cell-title">{campaign.name}</td>
										<td class="text-sm">{campaign.type}</td>
										<td>
											<span class="status-badge {campaign.status.toLowerCase()}">{campaign.status}</span>
										</td>
										<td class="text-sm text-muted">{campaign.sent}</td>
										<td class="text-sm text-muted">{campaign.opened}</td>
										<td class="text-sm text-muted">{campaign.clicked}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Customer Segments -->
				<div class="card">
					<div class="card-header">
						<div class="card-header-content">
							<h3 class="card-title">Customer Segments</h3>
							<div class="card-actions">
								<button class="btn btn-primary btn-sm">+ Create Segment</button>
							</div>
						</div>
					</div>
					<div class="card-body">
						<div class="space-y-4">
							{#each segments as segment}
								<div class="bg-surface-alt" style="padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
									<div class="flex-between items-start" style="margin-bottom: var(--space-2);">
										<h4 class="font-semibold text-sm">{segment.name}</h4>
										<span class="bg-surface" style="padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); font-size: var(--font-size-xs); color: var(--color-text-muted);">{segment.count} customers</span>
									</div>
									<p class="text-xs text-muted" style="margin: 0;">{segment.criteria}</p>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Klaviyo brand styling only */
	.klaviyo-logo {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #7B68EE, #6A5ACD);
		color: white;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: var(--font-weight-bold);
	}

	.klaviyo-btn {
		background: linear-gradient(135deg, #7B68EE, #6A5ACD) !important;
		transition: all var(--transition-fast);
	}

	.klaviyo-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(123, 104, 238, 0.3);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.grid-cols-2 {
			grid-template-columns: 1fr !important;
		}
	}
</style>