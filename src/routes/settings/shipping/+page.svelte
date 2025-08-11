<script lang="ts">
	let shippingZones = $state([
		{ id: 1, name: 'United States', countries: 'United States', rates: 3 },
		{ id: 2, name: 'Canada', countries: 'Canada', rates: 2 },
		{ id: 3, name: 'International', countries: 'Rest of world', rates: 1 }
	]);
</script>

<svelte:head>
	<title>Shipping and delivery - BetterCallSold Settings</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-content">
			<h1>
				<span class="page-icon">📦</span>
				Shipping and delivery
			</h1>
		</div>
		<div class="breadcrumb">
			<span>Settings</span>
			<span class="breadcrumb-separator">›</span>
			<span>Shipping and delivery</span>
		</div>
	</div>

	<div class="page-content">
		<div class="settings-card">
			<div class="card-header">
				<h2>Shipping zones</h2>
				<button class="btn-primary">Create shipping zone</button>
			</div>
			<div class="zones-list">
				{#each shippingZones as zone}
					<div class="zone-item">
						<div class="zone-info">
							<h3>{zone.name}</h3>
							<p>{zone.countries}</p>
						</div>
						<div class="zone-rates">{zone.rates} rate{zone.rates !== 1 ? 's' : ''}</div>
						<button class="btn-secondary">Manage</button>
					</div>
				{/each}
			</div>
		</div>

		<div class="settings-card">
			<div class="card-header">
				<h2>General settings</h2>
			</div>
			<div class="general-settings">
				<div class="setting-item">
					<h3>Package dimensions</h3>
					<p>Set default package dimensions for shipping calculations</p>
					<button class="btn-secondary">Configure</button>
				</div>
				<div class="setting-item">
					<h3>Shipping origin</h3>
					<p>The address orders will ship from</p>
					<button class="btn-secondary">Edit address</button>
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

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #f0f0f0;
	}

	.card-header h2 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.zones-list, .general-settings {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.zone-item, .setting-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f0f0f0;
	}

	.zone-info, .setting-item {
		flex: 1;
	}

	.zone-info h3, .setting-item h3 {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
	}

	.zone-info p, .setting-item p {
		margin: 0;
		font-size: 0.8125rem;
		color: #6d7175;
	}

	.zone-rates {
		font-size: 0.875rem;
		color: #6d7175;
		min-width: 80px;
	}

	.btn-primary, .btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
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

		.zone-item {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.zone-rates {
			min-width: auto;
		}
	}
</style>