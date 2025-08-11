<script lang="ts">
	let taxSettings = $state({
		chargesTaxes: true,
		includeTaxInPrices: false,
		showTaxBreakdown: true
	});
</script>

<svelte:head>
	<title>Taxes and duties - BetterCallSold Settings</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-content">
			<h1>
				<span class="page-icon">💰</span>
				Taxes and duties
			</h1>
		</div>
		<div class="breadcrumb">
			<span>Settings</span>
			<span class="breadcrumb-separator">›</span>
			<span>Taxes and duties</span>
		</div>
	</div>

	<div class="page-content">
		<div class="settings-card">
			<h2>Tax settings</h2>
			<div class="tax-options">
				<div class="option-item">
					<label>
						<input type="checkbox" bind:checked={taxSettings.chargesTaxes} />
						Charge taxes on this order
					</label>
				</div>
				<div class="option-item">
					<label>
						<input type="checkbox" bind:checked={taxSettings.includeTaxInPrices} />
						All prices include tax
					</label>
				</div>
				<div class="option-item">
					<label>
						<input type="checkbox" bind:checked={taxSettings.showTaxBreakdown} />
						Show tax breakdown to customers
					</label>
				</div>
			</div>
		</div>

		<div class="settings-card">
			<h2>Tax rates</h2>
			<p>Configure tax rates for different regions and product types.</p>
			<div class="tax-regions">
				<div class="region-item">
					<h3>🇺🇸 United States</h3>
					<p>Automatic tax calculation based on customer location</p>
					<button class="btn-secondary">Configure</button>
				</div>
				<div class="region-item">
					<h3>🇨🇦 Canada</h3>
					<p>GST/HST and provincial tax rates</p>
					<button class="btn-secondary">Configure</button>
				</div>
			</div>
		</div>
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
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-content h1 {
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

	.breadcrumb {
		display: flex;
		align-items: center;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.breadcrumb-separator {
		margin: 0 0.5rem;
		color: #d1d5db;
	}

	.page-content {
		padding: 2rem;
		max-width: 1000px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		padding: 2rem;
	}

	.settings-card h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.settings-card > p {
		margin: 0 0 1.5rem 0;
		color: #6d7175;
		line-height: 1.5;
	}

	.tax-options {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.option-item label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
		color: #202223;
		cursor: pointer;
	}

	.tax-regions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.region-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f0f0f0;
	}

	.region-item h3 {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
		min-width: 120px;
	}

	.region-item p {
		margin: 0;
		font-size: 0.8125rem;
		color: #6d7175;
		flex: 1;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.btn-secondary:hover {
		background: #f6f6f7;
	}
</style>