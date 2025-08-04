<script lang="ts">
</script>

<svelte:head>
	<title>Setup - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1>Setup</h1>
		<div class="breadcrumb">
			<span class="breadcrumb-icon">⚙️</span>
			<span>Setup</span>
		</div>
	</div>

	<div class="page-content">
		<div class="empty-state">
			<h2>Setup & Configuration</h2>
			<p>Use the navigation menu to access different setup options and sales channels.</p>
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

	.page-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
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

	.page-content {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e3e3e3;
	}

	.empty-state h2 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #374151;
	}

	.empty-state p {
		margin: 0;
		color: #6b7280;
		font-size: 1.1rem;
	}
</style>