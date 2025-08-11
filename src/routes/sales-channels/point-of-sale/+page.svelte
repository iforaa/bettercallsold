<script lang="ts">
	let expandedCountries = {
		us: true,
		canada: true
	};

	function toggleCountry(country: string) {
		expandedCountries[country] = !expandedCountries[country];
	}
</script>

<svelte:head>
	<title>Point of Sale (Not Available) - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item current">🏪 Point of Sale</span>
				</div>
			</div>
			<div class="page-header-aside">
				<div class="status-indicator">
					<span class="badge badge-warning">Not Available Yet</span>
				</div>
			</div>
		</div>
	</div>

	<div class="page-content">
		<div class="content-flow">
			
			<!-- United States Section -->
			<div class="content-section">
				<button class="country-header" on:click={() => toggleCountry('us')}>
					<div class="country-info">
						<span class="flag">🇺🇸</span>
						<span class="country-name">United States</span>
					</div>
					<span class="expand-arrow" class:expanded={expandedCountries.us}>▼</span>
				</button>
				
				{#if expandedCountries.us}
					<div class="country-content">
						<!-- Metrics Row -->
						<div class="metrics-grid">
							<div class="metric-card">
								<div class="metric-card-label">Total orders</div>
								<div class="metric-card-value">0</div>
							</div>
							<div class="metric-card">
								<div class="metric-card-label">Returns</div>
								<div class="metric-card-value">$0 —</div>
							</div>
							<div class="metric-card">
								<div class="metric-card-label">Customers</div>
								<div class="metric-card-value">0</div>
							</div>
						</div>

						<!-- Management Sections -->
						<div class="content-flow">
							<div class="card card-interactive">
								<div class="card-content">
									<div class="card-media">
										<div class="card-icon">📍</div>
									</div>
									<div class="card-details">
										<div class="card-title">POS location</div>
										<div class="card-subtitle">1 Pro</div>
									</div>
									<div class="card-action">
										<span class="badge badge-neutral">1</span>
									</div>
								</div>
							</div>

							<div class="card card-interactive">
								<div class="card-content">
									<div class="card-media">
										<div class="card-icon">💰</div>
									</div>
									<div class="card-details">
										<div class="card-title">Cash tracking</div>
										<div class="card-subtitle">No open sessions</div>
									</div>
								</div>
							</div>

							<div class="card card-interactive">
								<div class="card-content">
									<div class="card-media">
										<div class="card-icon">👥</div>
									</div>
									<div class="card-details">
										<div class="card-title">Staff</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Recommended Section -->
						<div class="content-subsection">
							<h4 class="content-subtitle">Recommended for you</h4>
							
							<div class="content-flow">
								<div class="card">
									<div class="card-content">
										<div class="card-media">
											<div class="card-icon hardware-icon">🖥️</div>
										</div>
										<div class="card-details">
											<div class="card-title">Shop POS hardware</div>
											<div class="card-subtitle">Offer best-in-class checkouts at the counter and in store</div>
										</div>
										<div class="card-action">
											<button class="btn btn-secondary btn-sm">Shop hardware</button>
										</div>
									</div>
								</div>

								<div class="card">
									<div class="card-content">
										<div class="card-media">
											<div class="card-icon segments-icon">📊</div>
										</div>
										<div class="card-details">
											<div class="card-title">Drive store loyalty with retail-first customer segments</div>
											<div class="card-subtitle">Harness the power of customer segments to target loyal in-store customers with exclusive offers or events.</div>
										</div>
										<div class="card-action">
											<button class="btn btn-secondary btn-sm">Create segment</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Canada Section -->
			<div class="content-section">
				<button class="country-header" on:click={() => toggleCountry('canada')}>
					<div class="country-info">
						<span class="flag">🇨🇦</span>
						<span class="country-name">Canada</span>
					</div>
					<span class="expand-arrow" class:expanded={expandedCountries.canada}>▼</span>
				</button>
				
				{#if expandedCountries.canada}
					<div class="country-content">
						<!-- Metrics Row -->
						<div class="metrics-grid">
							<div class="metric-card">
								<div class="metric-card-label">Total orders</div>
								<div class="metric-card-value">0</div>
							</div>
							<div class="metric-card">
								<div class="metric-card-label">Returns</div>
								<div class="metric-card-value">$0 —</div>
							</div>
							<div class="metric-card">
								<div class="metric-card-label">Customers</div>
								<div class="metric-card-value">0</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* Minimal custom styles - most styling now handled by design system */
	
	/* Custom collapsible country section styling */
	.country-header {
		width: 100%;
		padding: var(--space-4) var(--space-6);
		background: var(--color-surface-hover);
		border: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		transition: background-color var(--transition-fast);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
	}
	
	.country-header:hover {
		background: var(--color-surface-active);
	}
	
	.country-info {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	
	.flag {
		font-size: var(--font-size-lg);
	}
	
	.country-name {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
	}
	
	.expand-arrow {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		transition: transform var(--transition-fast);
		transform: rotate(-90deg);
	}
	
	.expand-arrow.expanded {
		transform: rotate(0deg);
	}
	
	.country-content {
		padding: var(--space-6);
		border-top: 1px solid var(--color-border);
	}
	
	/* Custom card icon styling */
	.card-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		border-radius: var(--radius-lg);
		font-size: var(--font-size-lg);
	}
	
	.hardware-icon {
		width: 48px;
		height: 48px;
		background: var(--color-surface-hover);
		border-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-xl);
	}
	
	.segments-icon {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, var(--color-success), var(--color-success-dark));
		border-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-xl);
		color: white;
	}
	
	/* Custom content-subsection styling */
	.content-subsection {
		border-top: 1px solid var(--color-border);
		padding-top: var(--space-6);
		margin-top: var(--space-6);
	}
	
	/* Status indicator spacing */
	.status-indicator {
		display: flex;
		align-items: center;
	}
</style>