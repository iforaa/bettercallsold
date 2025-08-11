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
		<div class="page-header-content">
			<div class="flex-header">
				<div class="klarna-logo">klarna</div>
				<div>
					<h1 class="page-title">Klarna</h1>
					<p class="page-subtitle">Buy Now, Pay Later Solutions</p>
				</div>
			</div>
			<div class="page-actions">
				<div class="breadcrumb">
					<div class="breadcrumb-item">
						<span class="page-icon">💳</span>
						<span>Plugins</span>
					</div>
					<span class="breadcrumb-separator">›</span>
					<div class="breadcrumb-item">
						<span>Klarna</span>
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
									<div style="font-size: 4rem; margin-bottom: var(--space-6);">💳</div>
									<h2 class="section-title" style="margin-bottom: var(--space-2);">Connect Klarna</h2>
									<p class="section-description" style="max-width: 500px;">
										Integrate Klarna's flexible payment solutions to increase conversion rates and average order value. 
										Let customers pay how they want with Buy Now, Pay Later options.
									</p>
								</div>
								
								<div class="grid grid-cols-2 gap-6" style="margin-bottom: var(--space-10);">
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">💰</span>
										<span>Pay in 4 installments</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">📅</span>
										<span>30-day payment terms</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">🛡️</span>
										<span>Fraud protection</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">📊</span>
										<span>Real-time analytics</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">🌍</span>
										<span>Global payment options</span>
									</div>
									<div class="flex-start text-sm">
										<span style="margin-right: var(--space-3); font-size: 1.25rem;">🎯</span>
										<span>Increased conversion</span>
									</div>
								</div>
								
								<div class="flex-column" style="align-items: center; gap: var(--space-4);">
									<button class="btn btn-primary btn-xl klarna-btn" on:click={connectKlarna}>
										Connect Klarna Account
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
									<h3 class="card-title font-semibold">Connected to Klarna</h3>
									<p class="card-subtitle">Merchant ID: <span class="font-medium text-mono">KL_demo_12345</span></p>
								</div>
							</div>
							<button class="btn btn-secondary btn-sm" on:click={disconnectKlarna}>Disconnect</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Overview Stats -->
			<div class="content-section">
				<div class="section-header">
					<h3 class="section-title">Payment Overview</h3>
					<p class="section-description">Key metrics for your Klarna integration performance</p>
				</div>
				<div class="metrics-grid">
					<div class="metric-card metric-card-bordered metric-card-success">
						<div class="metric-card-value">$12,456</div>
						<div class="metric-card-label">Total Volume (30d)</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-accent">
						<div class="metric-card-value">234</div>
						<div class="metric-card-label">Transactions</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-warning">
						<div class="metric-card-value">89.5%</div>
						<div class="metric-card-label">Approval Rate</div>
					</div>
					<div class="metric-card metric-card-bordered metric-card-error">
						<div class="metric-card-value">+15.2%</div>
						<div class="metric-card-label">Conversion Lift</div>
					</div>
				</div>
			</div>

			<!-- Payment Methods -->
			<div class="grid grid-cols-2 gap-6">
				<div class="card">
					<div class="card-header">
						<div class="card-header-content">
							<div>
								<h3 class="card-title">Payment Methods</h3>
								<p class="card-subtitle">Configure available Klarna payment options</p>
							</div>
						</div>
					</div>
					<div class="card-body">
						<div class="space-y-6">
							{#each paymentMethods as method, index}
								<div class="flex-between items-start" style="padding: var(--space-4); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-surface-alt);">
									<div class="flex-column" style="gap: var(--space-1);">
										<h4 class="font-semibold text-sm">{method.name}</h4>
										<p class="text-xs text-muted">{method.description}</p>
									</div>
									<label class="toggle-switch" style="flex-shrink: 0;">
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
				</div>

				<!-- Integration Settings -->
				<div class="card">
					<div class="card-header">
						<div class="card-header-content">
							<div>
								<h3 class="card-title">Integration Settings</h3>
								<p class="card-subtitle">Configure your Klarna integration settings</p>
							</div>
						</div>
					</div>
					<div class="card-body">
						<div class="space-y-6">
							<div class="flex-between items-start" style="padding: var(--space-4); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-surface-alt);">
								<div class="flex-column" style="gap: var(--space-1);">
									<h4 class="font-semibold text-sm">Test Mode</h4>
									<p class="text-xs text-muted">Use Klarna's sandbox environment for testing</p>
								</div>
								<label class="toggle-switch" style="flex-shrink: 0;">
									<input type="checkbox" checked />
									<span class="toggle-slider"></span>
								</label>
							</div>
							<div class="flex-between items-start" style="padding: var(--space-4); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-surface-alt);">
								<div class="flex-column" style="gap: var(--space-1);">
									<h4 class="font-semibold text-sm">Auto-capture</h4>
									<p class="text-xs text-muted">Automatically capture payments on order fulfillment</p>
								</div>
								<label class="toggle-switch" style="flex-shrink: 0;">
									<input type="checkbox" checked />
									<span class="toggle-slider"></span>
								</label>
							</div>
							<div class="flex-between items-start" style="padding: var(--space-4); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-surface-alt);">
								<div class="flex-column" style="gap: var(--space-1);">
									<h4 class="font-semibold text-sm">Klarna Badge</h4>
									<p class="text-xs text-muted">Show Klarna promotional messages on product pages</p>
								</div>
								<label class="toggle-switch" style="flex-shrink: 0;">
									<input type="checkbox" checked />
									<span class="toggle-slider"></span>
								</label>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Recent Transactions -->
			<div class="content-section">
				<div class="card">
					<div class="card-header">
						<div class="card-header-content">
							<h3 class="card-title">Recent Transactions</h3>
							<div class="card-actions">
								<button class="btn btn-secondary btn-sm">View All</button>
							</div>
						</div>
					</div>
					<div class="table-responsive">
						<table class="data-table">
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
										<td class="table-id">{transaction.id}</td>
										<td class="table-customer-name">{transaction.customer}</td>
										<td class="table-amount">{transaction.amount}</td>
										<td>{transaction.method}</td>
										<td>
											<span class="status-badge {transaction.status.toLowerCase()}">{transaction.status}</span>
										</td>
										<td class="text-muted text-sm">{transaction.date}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
			</div>

		{/if}
	</div>
</div>

<style>
	/* Klarna brand styling only */
	.klarna-logo {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #FFB3D9, #FF1493);
		color: white;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		text-transform: lowercase;
	}

	.klarna-btn {
		background: linear-gradient(135deg, #FFB3D9, #FF1493) !important;
		transition: all var(--transition-fast);
	}

	.klarna-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(255, 20, 147, 0.3);
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
		background: linear-gradient(135deg, #FFB3D9, #FF1493);
	}

	input:checked + .toggle-slider:before {
		transform: translateX(20px);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.grid-cols-2 {
			grid-template-columns: 1fr !important;
		}
		
		.flex-between {
			flex-direction: column;
			align-items: flex-start !important;
			gap: var(--space-3);
		}
		
		.toggle-switch {
			align-self: flex-end;
		}
	}
</style>