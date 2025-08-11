<script lang="ts"></script>

<svelte:head>
	<title>Locations - BetterCallSold Settings</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-content">
			<h1>
				<span class="page-icon">📍</span>
				Locations
			</h1>
		</div>
		<div class="breadcrumb">
			<span>Settings</span>
			<span class="breadcrumb-separator">›</span>
			<span>Locations</span>
		</div>
	</div>

	<div class="page-content">
		<div class="settings-card">
			<h2>Store locations</h2>
			<p>Manage your physical store locations and inventory tracking.</p>
			<div class="placeholder-content">
				<div class="placeholder-icon">📍</div>
				<h3>Manage store locations</h3>
				<p>Add and configure your store locations for inventory tracking, local delivery, and pickup options.</p>
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
	}

	.settings-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		padding: 2rem;
	}

	.settings-card h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.settings-card > p {
		margin: 0 0 2rem 0;
		color: #6d7175;
		line-height: 1.5;
	}

	.placeholder-content {
		text-align: center;
		padding: 3rem 2rem;
	}

	.placeholder-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.placeholder-content h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.placeholder-content p {
		margin: 0;
		color: #6d7175;
		line-height: 1.5;
	}
</style>