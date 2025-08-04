<script lang="ts">
	let isConnected = true;
	let transactions = [
		{ id: 'KL001', customer: 'John Smith', amount: '$299.99', status: 'Paid', method: 'Pay in 4', date: '2024-08-03' },
		{ id: 'KL002', customer: 'Sarah Wilson', amount: '$89.50', status: 'Pending', method: 'Pay Later', date: '2024-08-02' },
		{ id: 'KL003', customer: 'Mike Johnson', amount: '$159.99', status: 'Paid', method: 'Pay Now', date: '2024-08-01' },
	];

	let paymentMethods = [
		{ name: 'Pay Now', description: 'Direct bank payment', enabled: true },
		{ name: 'Pay Later', description: '30 days to pay', enabled: true },
		{ name: 'Pay in 4', description: '4 interest-free installments', enabled: true },
		{ name: 'Financing', description: '6-36 month financing', enabled: false },
	];

	function connectKlarna() {
		isConnected = true;
	}

	function disconnectKlarna() {
		isConnected = false;
	}

	function togglePaymentMethod(index: number) {
		paymentMethods[index].enabled = !paymentMethods[index].enabled;
		paymentMethods = [...paymentMethods];
	}
</script>

<svelte:head>
	<title>Klarna Integration - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-content">
			<div class="plugin-logo">
				<div class="klarna-logo">klarna</div>
			</div>
			<div class="header-text">
				<h1>Klarna</h1>
				<p>Buy Now, Pay Later Solutions</p>
			</div>
		</div>
		<div class="breadcrumb">
			<span class="breadcrumb-icon">💳</span>
			<span>Plugins</span>
			<span class="breadcrumb-separator">›</span>
			<span>Klarna</span>
		</div>
	</div>

	<div class="page-content">
		<div class="plugin-content">
			{#if !isConnected}
				<!-- Connection Setup -->
				<div class="connection-section">
					<div class="connection-card">
						<div class="connection-header">
							<div class="connection-icon">💳</div>
							<h2>Connect Klarna</h2>
						</div>
						<p class="connection-description">
							Integrate Klarna's flexible payment solutions to increase conversion rates and average order value. 
							Let customers pay how they want with Buy Now, Pay Later options.
						</p>
						<div class="connection-features">
							<div class="feature-item">
								<span class="feature-icon">💰</span>
								<span>Pay in 4 installments</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">📅</span>
								<span>30-day payment terms</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">🛡️</span>
								<span>Fraud protection</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">📊</span>
								<span>Real-time analytics</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">🌍</span>
								<span>Global payment options</span>
							</div>
							<div class="feature-item">
								<span class="feature-icon">🎯</span>
								<span>Increased conversion</span>
							</div>
						</div>
						<button class="connect-button" on:click={connectKlarna}>
							Connect Klarna Account
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
								<h3>Connected to Klarna</h3>
								<p>Merchant ID: KL_demo_12345</p>
							</div>
						</div>
						<button class="disconnect-button" on:click={disconnectKlarna}>Disconnect</button>
					</div>
				</div>

				<div class="dashboard-grid">
					<!-- Overview Stats -->
					<div class="stats-section">
						<h3>Payment Overview</h3>
						<div class="stats-grid">
							<div class="stat-card">
								<div class="stat-value">$12,456</div>
								<div class="stat-label">Total Volume (30d)</div>
							</div>
							<div class="stat-card">
								<div class="stat-value">234</div>
								<div class="stat-label">Transactions</div>
							</div>
							<div class="stat-card">
								<div class="stat-value">89.5%</div>
								<div class="stat-label">Approval Rate</div>
							</div>
							<div class="stat-card">
								<div class="stat-value">+15.2%</div>
								<div class="stat-label">Conversion Lift</div>
							</div>
						</div>
					</div>

					<!-- Payment Methods -->
					<div class="payment-methods-section">
						<div class="section-header">
							<h3>Payment Methods</h3>
							<div class="section-subtitle">Configure available Klarna payment options</div>
						</div>
						<div class="payment-methods-grid">
							{#each paymentMethods as method, index}
								<div class="payment-method-card">
									<div class="method-info">
										<h4>{method.name}</h4>
										<p>{method.description}</p>
									</div>
									<label class="toggle-switch">
										<input
											type="checkbox"
											checked={method.enabled}
											on:change={() => togglePaymentMethod(index)}
										/>
										<span class="toggle-slider"></span>
									</label>
								</div>
							{/each}
						</div>
					</div>

					<!-- Recent Transactions -->
					<div class="transactions-section">
						<div class="section-header">
							<h3>Recent Transactions</h3>
							<button class="view-all-button">View All</button>
						</div>
						<div class="table-container">
							<table class="transactions-table">
								<thead>
									<tr>
										<th>Transaction ID</th>
										<th>Customer</th>
										<th>Amount</th>
										<th>Payment Method</th>
										<th>Status</th>
										<th>Date</th>
									</tr>
								</thead>
								<tbody>
									{#each transactions as transaction}
										<tr>
											<td class="transaction-id">{transaction.id}</td>
											<td>{transaction.customer}</td>
											<td class="amount">{transaction.amount}</td>
											<td>{transaction.method}</td>
											<td>
												<span class="status-badge {transaction.status.toLowerCase()}">{transaction.status}</span>
											</td>
											<td class="date">{transaction.date}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Integration Settings -->
					<div class="settings-section">
						<h3>Integration Settings</h3>
						<div class="settings-grid">
							<div class="setting-item">
								<div class="setting-label">
									<h4>Test Mode</h4>
									<p>Use Klarna's sandbox environment for testing</p>
								</div>
								<label class="toggle-switch">
									<input type="checkbox" checked />
									<span class="toggle-slider"></span>
								</label>
							</div>
							<div class="setting-item">
								<div class="setting-label">
									<h4>Auto-capture</h4>
									<p>Automatically capture payments on order fulfillment</p>
								</div>
								<label class="toggle-switch">
									<input type="checkbox" checked />
									<span class="toggle-slider"></span>
								</label>
							</div>
							<div class="setting-item">
								<div class="setting-label">
									<h4>Klarna Badge</h4>
									<p>Show Klarna promotional messages on product pages</p>
								</div>
								<label class="toggle-switch">
									<input type="checkbox" checked />
									<span class="toggle-slider"></span>
								</label>
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

	.klarna-logo {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #FFB3D9, #FF1493);
		color: white;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: bold;
		text-transform: lowercase;
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
		background: linear-gradient(135deg, #FFB3D9, #FF1493);
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
		box-shadow: 0 4px 12px rgba(255, 20, 147, 0.3);
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
	.payment-methods-section h3,
	.transactions-section h3,
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
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.section-subtitle {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.payment-methods-grid {
		display: grid;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.payment-method-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
	}

	.method-info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.method-info p {
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
		background-color: #FFB3D9;
	}

	input:checked + .toggle-slider:before {
		transform: translateX(20px);
	}

	.view-all-button {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.view-all-button:hover {
		background: #e5e7eb;
	}

	.table-container {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
		margin-bottom: 2rem;
	}

	.transactions-table {
		width: 100%;
		border-collapse: collapse;
	}

	.transactions-table th {
		background: #f9fafb;
		padding: 0.75rem;
		text-align: left;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #374151;
		border-bottom: 1px solid #e5e7eb;
	}

	.transactions-table td {
		padding: 0.75rem;
		border-bottom: 1px solid #f3f4f6;
		font-size: 0.875rem;
		color: #1a1a1a;
	}

	.transaction-id {
		font-family: monospace;
		color: #6b7280;
	}

	.amount {
		font-weight: 600;
	}

	.date {
		color: #6b7280;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-badge.paid {
		background: #dcfce7;
		color: #166534;
	}

	.status-badge.pending {
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

		.transactions-table {
			font-size: 0.75rem;
		}

		.transactions-table th,
		.transactions-table td {
			padding: 0.5rem 0.25rem;
		}

		.setting-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
	}
</style>