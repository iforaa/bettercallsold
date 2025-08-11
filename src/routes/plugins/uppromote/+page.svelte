<script lang="ts">
	let isConnected = true;
	let affiliates = [
		{ id: 1, name: 'Sarah Johnson', email: 'sarah@example.com', status: 'Active', commission: '10%', sales: '$2,450', referrals: 12 },
		{ id: 2, name: 'Mike Wilson', email: 'mike@example.com', status: 'Pending', commission: '8%', sales: '$890', referrals: 5 },
		{ id: 3, name: 'Emma Davis', email: 'emma@example.com', status: 'Active', commission: '12%', sales: '$3,120', referrals: 18 },
	];

	let campaigns = [
		{ id: 1, name: 'Summer Sale 2024', type: 'Discount', status: 'Active', affiliates: 8, conversions: 45 },
		{ id: 2, name: 'Influencer Program', type: 'Commission', status: 'Active', affiliates: 23, conversions: 127 },
		{ id: 3, name: 'Back to School', type: 'Fixed Amount', status: 'Draft', affiliates: 0, conversions: 0 },
	];

	let commissionRules = [
		{ tier: 'Bronze', minSales: '$0', maxSales: '$999', commission: '5%', affiliates: 12 },
		{ tier: 'Silver', minSales: '$1,000', maxSales: '$4,999', commission: '8%', affiliates: 8 },
		{ tier: 'Gold', minSales: '$5,000', maxSales: '$9,999', commission: '12%', affiliates: 3 },
		{ tier: 'Platinum', minSales: '$10,000+', maxSales: '∞', commission: '15%', affiliates: 2 },
	];

	function connectUpPromote() {
		isConnected = true;
	}

	function disconnectUpPromote() {
		isConnected = false;
	}
</script>

<svelte:head>
	<title>UpPromote Integration - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="flex-header">
				<div class="uppromote-logo">UP</div>
				<div>
					<h1 class="page-title">UpPromote</h1>
					<p class="page-subtitle">Affiliate & Referral Marketing</p>
				</div>
			</div>
			<div class="page-actions">
				<div class="breadcrumb">
					<div class="breadcrumb-item">
						<span class="page-icon">🤝</span>
						<span>Plugins</span>
					</div>
					<span class="breadcrumb-separator">›</span>
					<div class="breadcrumb-item">
						<span>UpPromote</span>
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
									<div style="font-size: 4rem; margin-bottom: var(--space-6);">🤝</div>
									<h2 class="section-title" style="margin-bottom: var(--space-2);">Connect UpPromote</h2>
									<p class="section-description" style="max-width: 500px;">
										Build a powerful affiliate marketing program to grow your business through referrals. 
										Recruit affiliates, track performance, and automate commission payments.
									</p>
								</div>
								
								<div class="grid grid-cols-2 gap-6" style="margin-bottom: var(--space-10);">
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">👥</span>
										<span>Affiliate recruitment</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">🔗</span>
										<span>Custom referral links</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">💰</span>
										<span>Automated commissions</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">📊</span>
										<span>Performance tracking</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">🎯</span>
										<span>Multi-tier programs</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">📱</span>
										<span>Mobile affiliate portal</span>
									</div>
								</div>
								
								<div class="flex-column" style="align-items: center; gap: var(--space-4);">
									<button class="btn btn-primary btn-xl uppromote-btn" on:click={connectUpPromote}>
										Connect UpPromote Account
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
									<h3 class="card-title font-semibold">Connected to UpPromote</h3>
									<p class="card-subtitle">Program: <span class="font-medium">BetterCallSold Affiliate Program</span></p>
								</div>
							</div>
							<button class="btn btn-secondary btn-sm" on:click={disconnectUpPromote}>Disconnect</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Overview Stats -->
			<div class="content-section">
				<div class="section-header">
					<h3 class="section-title">Affiliate Program Overview</h3>
					<p class="section-description">Performance metrics for your affiliate marketing program</p>
				</div>
				<div class="metrics-grid">
					<div class="metric-card metric-card-bordered metric-card-accent">
						<div class="metric-card-value">25</div>
						<div class="metric-card-label">Active Affiliates</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-success">
						<div class="metric-card-value">$8,460</div>
						<div class="metric-card-label">Total Sales (30d)</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-warning">
						<div class="metric-card-value">$847</div>
						<div class="metric-card-label">Commissions Paid</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-error">
						<div class="metric-card-value">172</div>
						<div class="metric-card-label">Referrals</div>
					</div>
				</div>
			</div>

			<!-- Commission Tiers -->
			<div class="content-section">
				<div class="card">
					<div class="card-header">
						<div class="card-header-content">
							<h3 class="card-title">Commission Tiers</h3>
							<div class="card-actions">
								<button class="btn btn-secondary btn-sm">Edit Tiers</button>
							</div>
						</div>
					</div>
					<div class="card-body">
						<div class="grid grid-cols-4 gap-4">
							{#each commissionRules as tier}
								<div class="tier-card {tier.tier.toLowerCase()}">
									<div class="flex-between items-start" style="margin-bottom: var(--space-3);">
										<h4 class="font-semibold text-sm">{tier.tier}</h4>
										<span class="tier-commission">{tier.commission}</span>
									</div>
									<div class="text-xs opacity-80" style="margin-bottom: var(--space-2);">{tier.minSales} - {tier.maxSales}</div>
									<div class="text-xs opacity-70">{tier.affiliates} affiliates</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Active Campaigns & Top Affiliates -->
			<div class="grid grid-cols-2 gap-6">
				<!-- Active Campaigns -->
				<div class="card">
					<div class="card-header">
						<div class="card-header-content">
							<h3 class="card-title">Affiliate Campaigns</h3>
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
									<th>Affiliates</th>
									<th>Conversions</th>
									<th>Actions</th>
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
										<td class="text-sm text-muted">{campaign.affiliates}</td>
										<td class="text-sm text-muted">{campaign.conversions}</td>
										<td>
											<button class="btn btn-secondary btn-xs">Edit</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Top Affiliates -->
				<div class="card">
					<div class="card-header">
						<div class="card-header-content">
							<h3 class="card-title">Top Affiliates</h3>
							<div class="card-actions">
								<button class="btn btn-secondary btn-sm">Manage All</button>
							</div>
						</div>
					</div>
					<div class="card-body">
						<div class="space-y-4">
							{#each affiliates as affiliate}
								<div class="flex-header" style="padding: var(--space-3); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-surface-alt);">
									<div class="affiliate-avatar">
										{affiliate.name.split(' ').map(n => n[0]).join('')}
									</div>
									<div class="flex-1">
										<h4 class="font-semibold text-sm" style="margin-bottom: var(--space-1);">{affiliate.name}</h4>
										<p class="text-xs text-muted" style="margin: 0;">{affiliate.email}</p>
									</div>
									<div class="flex-header gap-4">
										<div class="text-center">
											<div class="font-semibold text-sm">{affiliate.sales}</div>
											<div class="text-xs text-muted">Sales</div>
										</div>
										<div class="text-center">
											<div class="font-semibold text-sm">{affiliate.referrals}</div>
											<div class="text-xs text-muted">Referrals</div>
										</div>
									</div>
									<div class="font-semibold text-sm" style="color: var(--color-success);">{affiliate.commission}</div>
									<span class="status-badge {affiliate.status.toLowerCase()}">{affiliate.status}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Program Settings -->
			<div class="content-section">
				<div class="card">
					<div class="card-header">
						<div class="card-header-content">
							<h3 class="card-title">Program Settings</h3>
						</div>
					</div>
					<div class="card-body">
						<div class="space-y-6">
							<div class="flex-between items-start" style="padding: var(--space-4); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-surface-alt);">
								<div class="flex-column" style="gap: var(--space-1);">
									<h4 class="font-semibold text-sm">Auto-approve affiliates</h4>
									<p class="text-xs text-muted">Automatically approve new affiliate applications</p>
								</div>
								<label class="toggle-switch" style="flex-shrink: 0;">
									<input type="checkbox" />
									<span class="toggle-slider"></span>
								</label>
							</div>
							<div class="flex-between items-start" style="padding: var(--space-4); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-surface-alt);">
								<div class="flex-column" style="gap: var(--space-1);">
									<h4 class="font-semibold text-sm">Cookie duration</h4>
									<p class="text-xs text-muted">How long referral tracking lasts (in days)</p>
								</div>
								<select class="select select-sm" style="flex-shrink: 0;">
									<option>30 days</option>
									<option>60 days</option>
									<option selected>90 days</option>
									<option>120 days</option>
								</select>
							</div>
							<div class="flex-between items-start" style="padding: var(--space-4); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-surface-alt);">
								<div class="flex-column" style="gap: var(--space-1);">
									<h4 class="font-semibold text-sm">Minimum payout</h4>
									<p class="text-xs text-muted">Minimum commission amount for payments</p>
								</div>
								<select class="select select-sm" style="flex-shrink: 0;">
									<option>$10</option>
									<option selected>$50</option>
									<option>$100</option>
									<option>$200</option>
								</select>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* UpPromote brand styling only */
	.uppromote-logo {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #10b981, #059669);
		color: white;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: var(--font-weight-bold);
	}

	.uppromote-btn {
		background: linear-gradient(135deg, #10b981, #059669) !important;
		transition: all var(--transition-fast);
	}

	.uppromote-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
	}

	/* Commission tier cards */
	.tier-card {
		padding: var(--space-4);
		border-radius: var(--radius-md);
		border: 2px solid;
		text-align: center;
	}

	.tier-card.bronze {
		border-color: #cd7f32;
		background: linear-gradient(135deg, #fef3c7, #fbbf24);
	}

	.tier-card.silver {
		border-color: #c0c0c0;
		background: linear-gradient(135deg, #f3f4f6, #d1d5db);
	}

	.tier-card.gold {
		border-color: #ffd700;
		background: linear-gradient(135deg, #fef3c7, #f59e0b);
	}

	.tier-card.platinum {
		border-color: #e5e7eb;
		background: linear-gradient(135deg, #f9fafb, #6b7280);
		color: white;
	}

	.tier-commission {
		font-size: 1.25rem;
		font-weight: var(--font-weight-bold);
	}

	/* Affiliate avatar */
	.affiliate-avatar {
		width: 40px;
		height: 40px;
		background: linear-gradient(135deg, #10b981, #059669);
		color: white;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		flex-shrink: 0;
	}

	/* Toggle switch component (keep custom as design system doesn't have it) */
	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: var(--color-border-dark);
		transition: var(--transition-normal);
		border-radius: var(--radius-full);
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: var(--color-surface);
		transition: var(--transition-normal);
		border-radius: 50%;
	}

	input:checked + .toggle-slider {
		background: linear-gradient(135deg, #10b981, #059669);
	}

	input:checked + .toggle-slider:before {
		transform: translateX(20px);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.grid-cols-2 {
			grid-template-columns: 1fr !important;
		}
		
		.grid-cols-4 {
			grid-template-columns: repeat(2, 1fr) !important;
		}
		
		.flex-between {
			flex-direction: column;
			align-items: flex-start !important;
			gap: var(--space-3);
		}
		
		.toggle-switch, .select {
			align-self: flex-end;
		}
	}
</style>