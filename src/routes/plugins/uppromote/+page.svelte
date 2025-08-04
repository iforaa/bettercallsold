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
		<div class="header-content">
			<div class="plugin-logo">
				<div class="uppromote-logo">UP</div>
			</div>
			<div class="header-text">
				<h1>UpPromote</h1>
				<p>Affiliate & Referral Marketing</p>
			</div>
		</div>
		<div class="breadcrumb">
			<span class="breadcrumb-icon">🤝</span>
			<span>Plugins</span>
			<span class="breadcrumb-separator">›</span>
			<span>UpPromote</span>
		</div>
	</div>

	<div class="page-content">
		<div class="plugin-content">
			{#if !isConnected}
				<!-- Connection Setup -->
				<div class="connection-section">
					<div class="connection-card">
						<div class="connection-header">
							<div class="connection-icon">🤝</div>
							<h2>Connect UpPromote</h2>
						</div>
						<p class="connection-description">
							Build a powerful affiliate marketing program to grow your business through referrals. 
							Recruit affiliates, track performance, and automate commission payments.
						</p>
						<div class="connection-features">
							<div class="feature-item">
								<span class="feature-icon">👥</span>
								<span>Affiliate recruitment</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">🔗</span>
								<span>Custom referral links</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">💰</span>
								<span>Automated commissions</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">📊</span>
								<span>Performance tracking</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">🎯</span>
								<span>Multi-tier programs</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">📱</span>
								<span>Mobile affiliate portal</span>
							</div>
						</div>
						<button class="connect-button" on:click={connectUpPromote}>
							Connect UpPromote Account
						</button>
						<div class="connection-note">
							<span class="note-icon">ℹ️</span>
							<span>Demo mode - This will simulate a connection for testing purposes</span>
						</div>
					</div>
				</div>
			{:else}
				<!-- Connected Dashboard -->
				<div class="status-section">
					<div class="status-card connected">
						<div class="status-info">
							<div class="status-icon">✅</div>
							<div class="status-text">
								<h3>Connected to UpPromote</h3>
								<p>Program: BetterCallSold Affiliate Program</p>
							</div>
						</div>
						<button class="disconnect-button" on:click={disconnectUpPromote}>Disconnect</button>
					</div>
				</div>

				<div class="dashboard-grid">
					<!-- Overview Stats -->
					<div class="stats-section">
						<h3>Program Overview</h3>
						<div class="stats-grid">
							<div class="stat-card">
								<div class="stat-value">25</div>
								<div class="stat-label">Active Affiliates</div>
							</div>
							<div class="stat-card">
								<div class="stat-value">$8,460</div>
								<div class="stat-label">Total Sales (30d)</div>
							</div>
							<div class="stat-card">
								<div class="stat-value">$847</div>
								<div class="stat-label">Commissions Paid</div>
							</div>
							<div class="stat-card">
								<div class="stat-value">172</div>
								<div class="stat-label">Referrals</div>
							</div>
						</div>
					</div>

					<!-- Commission Tiers -->
					<div class="tiers-section">
						<div class="section-header">
							<h3>Commission Tiers</h3>
							<button class="edit-button">Edit Tiers</button>
						</div>
						<div class="tiers-grid">
							{#each commissionRules as tier}
								<div class="tier-card {tier.tier.toLowerCase()}">
									<div class="tier-header">
										<h4>{tier.tier}</h4>
										<span class="tier-commission">{tier.commission}</span>
									</div>
									<div class="tier-range">{tier.minSales} - {tier.maxSales}</div>
									<div class="tier-affiliates">{tier.affiliates} affiliates</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Active Campaigns -->
					<div class="campaigns-section">
						<div class="section-header">
							<h3>Affiliate Campaigns</h3>
							<button class="create-button">+ Create Campaign</button>
						</div>
						<div class="table-container">
							<table class="campaigns-table">
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
											<td class="campaign-name">{campaign.name}</td>
											<td>{campaign.type}</td>
											<td>
												<span class="status-badge {campaign.status.toLowerCase()}">{campaign.status}</span>
											</td>
											<td>{campaign.affiliates}</td>
											<td>{campaign.conversions}</td>
											<td>
												<button class="action-button">Edit</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Top Affiliates -->
					<div class="affiliates-section">
						<div class="section-header">
							<h3>Top Affiliates</h3>
							<button class="manage-button">Manage All</button>
						</div>
						<div class="affiliates-list">
							{#each affiliates as affiliate}
								<div class="affiliate-card">
									<div class="affiliate-avatar">
										{affiliate.name.split(' ').map(n => n[0]).join('')}
									</div>
									<div class="affiliate-info">
										<h4>{affiliate.name}</h4>
										<p>{affiliate.email}</p>
									</div>
									<div class="affiliate-stats">
										<div class="stat-item">
											<span class="stat-value">{affiliate.sales}</span>
											<span class="stat-label">Sales</span>
										</div>
										<div class="stat-item">
											<span class="stat-value">{affiliate.referrals}</span>
											<span class="stat-label">Referrals</span>
										</div>
									</div>
									<div class="affiliate-commission">{affiliate.commission}</div>
									<span class="affiliate-status {affiliate.status.toLowerCase()}">{affiliate.status}</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Program Settings -->
					<div class="settings-section">
						<h3>Program Settings</h3>
						<div class="settings-grid">
							<div class="setting-item">
								<div class="setting-label">
									<h4>Auto-approve affiliates</h4>
									<p>Automatically approve new affiliate applications</p>
								</div>
								<label class="toggle-switch">
									<input type="checkbox" />
									<span class="toggle-slider"></span>
								</label>
							</div>
							<div class="setting-item">
								<div class="setting-label">
									<h4>Cookie duration</h4>
									<p>How long referral tracking lasts (in days)</p>
								</div>
								<select class="setting-select">
									<option>30 days</option>
									<option>60 days</option>
									<option selected>90 days</option>
									<option>120 days</option>
								</select>
							</div>
							<div class="setting-item">
								<div class="setting-label">
									<h4>Minimum payout</h4>
									<p>Minimum commission amount for payments</p>
								</div>
								<select class="setting-select">
									<option>$10</option>
									<option selected>$50</option>
									<option>$100</option>
									<option>$200</option>
								</select>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.page {
		padding: 0;
		min-height: 100vh;
		background-color: #f8fafc;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e5e7eb;
		padding: 1.5rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.plugin-logo {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.uppromote-logo {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #10b981, #059669);
		color: white;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: bold;
	}

	.header-text h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
	}

	.header-text p {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		color: #6b7280;
		font-size: 0.9rem;
	}

	.breadcrumb-icon {
		margin-right: 0.5rem;
	}

	.breadcrumb-separator {
		margin: 0 0.5rem;
		color: #d1d5db;
	}

	.page-content {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.plugin-content {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e3e3e3;
	}

	.connection-section {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	.connection-card {
		max-width: 600px;
		text-align: center;
	}

	.connection-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.connection-icon {
		font-size: 3rem;
	}

	.connection-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.connection-description {
		font-size: 1rem;
		color: #6b7280;
		line-height: 1.6;
		margin-bottom: 2rem;
	}

	.connection-features {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.feature-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #374151;
	}

	.feature-icon {
		font-size: 1rem;
	}

	.connect-button {
		background: linear-gradient(135deg, #10b981, #059669);
		color: white;
		border: none;
		padding: 0.75rem 2rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		margin-bottom: 1rem;
	}

	.connect-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
	}

	.connection-note {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: #6b7280;
		background: #f9fafb;
		padding: 0.75rem;
		border-radius: 6px;
		border: 1px solid #e5e7eb;
	}

	.status-section {
		margin-bottom: 2rem;
	}

	.status-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.status-card.connected {
		background: #f0fdf4;
		border-color: #bbf7d0;
	}

	.status-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.status-icon {
		font-size: 1.5rem;
	}

	.status-text h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #166534;
	}

	.status-text p {
		margin: 0;
		font-size: 0.875rem;
		color: #16a34a;
	}

	.disconnect-button {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.disconnect-button:hover {
		background: #e5e7eb;
	}

	.dashboard-grid {
		display: grid;
		gap: 2rem;
	}

	.stats-section h3,
	.tiers-section h3,
	.campaigns-section h3,
	.affiliates-section h3,
	.settings-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
		text-align: center;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1a1a1a;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.create-button,
	.edit-button,
	.manage-button {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.edit-button {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.manage-button {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.create-button:hover {
		background: #2563eb;
	}

	.edit-button:hover,
	.manage-button:hover {
		background: #e5e7eb;
	}

	.tiers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.tier-card {
		padding: 1.5rem;
		border-radius: 8px;
		background: white;
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

	.tier-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.tier-header h4 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.tier-commission {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.tier-range {
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
		opacity: 0.8;
	}

	.tier-affiliates {
		font-size: 0.8125rem;
		opacity: 0.7;
	}

	.table-container {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
		margin-bottom: 2rem;
	}

	.campaigns-table {
		width: 100%;
		border-collapse: collapse;
	}

	.campaigns-table th {
		background: #f9fafb;
		padding: 0.75rem;
		text-align: left;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #374151;
		border-bottom: 1px solid #e5e7eb;
	}

	.campaigns-table td {
		padding: 0.75rem;
		border-bottom: 1px solid #f3f4f6;
		font-size: 0.875rem;
		color: #1a1a1a;
	}

	.campaign-name {
		font-weight: 500;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-badge.active {
		background: #dcfce7;
		color: #166534;
	}

	.status-badge.draft {
		background: #f3f4f6;
		color: #374151;
	}

	.action-button {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-button:hover {
		background: #e5e7eb;
	}

	.affiliates-list {
		display: grid;
		gap: 1rem;
	}

	.affiliate-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
	}

	.affiliate-avatar {
		width: 40px;
		height: 40px;
		background: #10b981;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.affiliate-info {
		flex: 1;
	}

	.affiliate-info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.affiliate-info p {
		margin: 0;
		font-size: 0.8125rem;
		color: #6b7280;
	}

	.affiliate-stats {
		display: flex;
		gap: 1rem;
	}

	.stat-item {
		text-align: center;
	}

	.stat-item .stat-value {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.stat-item .stat-label {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.affiliate-commission {
		font-size: 0.875rem;
		font-weight: 600;
		color: #10b981;
		margin-right: 1rem;
	}

	.affiliate-status {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.affiliate-status.active {
		background: #dcfce7;
		color: #166534;
	}

	.affiliate-status.pending {
		background: #fef3c7;
		color: #92400e;
	}

	.settings-grid {
		display: grid;
		gap: 1rem;
	}

	.setting-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
	}

	.setting-label {
		flex: 1;
	}

	.setting-label h4 {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.setting-label p {
		margin: 0;
		font-size: 0.8125rem;
		color: #6b7280;
	}

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
		background-color: #ccc;
		transition: .4s;
		border-radius: 24px;
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: .4s;
		border-radius: 50%;
	}

	input:checked + .toggle-slider {
		background-color: #10b981;
	}

	input:checked + .toggle-slider:before {
		transform: translateX(20px);
	}

	.setting-select {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #374151;
		background: white;
	}

	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}

		.plugin-content {
			padding: 1rem;
		}

		.connection-features {
			grid-template-columns: 1fr;
		}

		.stats-grid {
			grid-template-columns: 1fr 1fr;
		}

		.tiers-grid {
			grid-template-columns: 1fr;
		}

		.campaigns-table {
			font-size: 0.75rem;
		}

		.campaigns-table th,
		.campaigns-table td {
			padding: 0.5rem 0.25rem;
		}

		.affiliate-card {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.affiliate-stats {
			width: 100%;
			justify-content: space-around;
		}

		.setting-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
	}
</style>