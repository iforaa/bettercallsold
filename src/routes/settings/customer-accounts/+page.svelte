<script lang="ts"></script>

<svelte:head>
	<title>Customer accounts - BetterCallSold Settings</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-content">
			<h1>
				<span class="page-icon">👤</span>
				Customer accounts
			</h1>
		</div>
		<div class="breadcrumb">
			<span>Settings</span>
			<span class="breadcrumb-separator">›</span>
			<span>Customer accounts</span>
		</div>
	</div>

	<div class="page-content">
		<div class="settings-card">
			<h2>Account settings</h2>
			<p>Control how customers create and manage their accounts.</p>
			<div class="settings-list">
				<div class="setting-item">
					<h3>👥 Account creation</h3>
					<p>Allow customers to create accounts in your store</p>
				</div>
				<div class="setting-item">
					<h3>🔑 Login options</h3>
					<p>Configure login methods and social authentication</p>
				</div>
				<div class="setting-item">
					<h3>📝 Customer profiles</h3>
					<p>Customize customer profile fields and information</p>
				</div>
				<div class="setting-item">
					<h3>📧 Email verification</h3>
					<p>Require email verification for new accounts</p>
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

	.settings-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.setting-item {
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f0f0f0;
	}

	.setting-item h3 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
	}

	.setting-item p {
		margin: 0;
		font-size: 0.8125rem;
		color: #6d7175;
		line-height: 1.4;
	}
</style>