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
		<div class="header-content">
			<div class="plugin-logo">
				<div class="klaviyo-logo">K</div>
			</div>
			<div class="header-text">
				<h1>Klaviyo</h1>
				<p>Email Marketing & Automation</p>
			</div>
		</div>
		<div class="breadcrumb">
			<span class="breadcrumb-icon">📧</span>
			<span>Plugins</span>
			<span class="breadcrumb-separator">›</span>
			<span>Klaviyo</span>
		</div>
	</div>

	<div class="page-content">
		<div class="plugin-content">
			{#if !isConnected}
				<!-- Connection Setup -->
				<div class="connection-section">
					<div class="connection-card">
						<div class="connection-header">
							<div class="connection-icon">🔗</div>
							<h2>Connect Klaviyo</h2>
						</div>
						<p class="connection-description">
							Connect your Klaviyo account to sync customer data, send targeted emails, and automate your marketing campaigns.
						</p>
						<div class="connection-features">
							<div class="feature-item">
								<span class="feature-icon">✉️</span>
								<span>Automated email campaigns</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">👥</span>
								<span>Customer segmentation</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">📊</span>
								<span>Performance analytics</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">🎯</span>
								<span>Personalized recommendations</span>
							</div>
						</div>
						<button class="connect-button" on:click={connectKlaviyo}>
							Connect Klaviyo Account
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
								<h3>Connected to Klaviyo</h3>
								<p>Account: demo@bettercallsold.com</p>
							</div>
						</div>
						<button class="disconnect-button" on:click={disconnectKlaviyo}>Disconnect</button>
					</div>
				</div>

				<div class="dashboard-grid">
					<!-- Overview Stats -->
					<div class="stats-section">
						<h3>Overview</h3>
						<div class="stats-grid">
							<div class="stat-card">
								<div class="stat-value">2,341</div>
								<div class="stat-label">Total Subscribers</div>
							</div>
							<div class="stat-card">
								<div class="stat-value">24.3%</div>
								<div class="stat-label">Open Rate</div>
							</div>
							<div class="stat-card">
								<div class="stat-value">3.8%</div>
								<div class="stat-label">Click Rate</div>
							</div>
							<div class="stat-card">
								<div class="stat-value">$12,456</div>
								<div class="stat-label">Revenue (30d)</div>
							</div>
						</div>
					</div>

					<!-- Campaigns -->
					<div class="campaigns-section">
						<div class="section-header">
							<h3>Email Campaigns</h3>
							<button class="create-button">+ Create Campaign</button>
						</div>
						<div class="table-container">
							<table class="campaigns-table">
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
											<td class="campaign-name">{campaign.name}</td>
											<td>{campaign.type}</td>
											<td>
												<span class="status-badge {campaign.status.toLowerCase()}">{campaign.status}</span>
											</td>
											<td>{campaign.sent}</td>
											<td>{campaign.opened}</td>
											<td>{campaign.clicked}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Segments -->
					<div class="segments-section">
						<div class="section-header">
							<h3>Customer Segments</h3>
							<button class="create-button">+ Create Segment</button>
						</div>
						<div class="segments-list">
							{#each segments as segment}
								<div class="segment-card">
									<div class="segment-header">
										<h4>{segment.name}</h4>
										<span class="segment-count">{segment.count} customers</span>
									</div>
									<p class="segment-criteria">{segment.criteria}</p>
								</div>
							{/each}
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

	.klaviyo-logo {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #7B68EE, #6A5ACD);
		color: white;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
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
		max-width: 500px;
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
		grid-template-columns: 1fr 1fr;
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
		background: linear-gradient(135deg, #7B68EE, #6A5ACD);
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
		box-shadow: 0 4px 12px rgba(123, 104, 238, 0.3);
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
	.campaigns-section h3,
	.segments-section h3 {
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

	.create-button {
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

	.create-button:hover {
		background: #2563eb;
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

	.segments-list {
		display: grid;
		gap: 1rem;
	}

	.segment-card {
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
	}

	.segment-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.segment-header h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.segment-count {
		font-size: 0.75rem;
		color: #6b7280;
		background: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.segment-criteria {
		margin: 0;
		font-size: 0.8125rem;
		color: #6b7280;
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

		.campaigns-table {
			font-size: 0.75rem;
		}

		.campaigns-table th,
		.campaigns-table td {
			padding: 0.5rem 0.25rem;
		}
	}
</style>