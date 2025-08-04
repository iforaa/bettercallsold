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
		<div class="header-content">
			<div class="header-icon">🏪</div>
			<h1>Point of Sale</h1>
		</div>
		<div class="breadcrumb">
			<span class="breadcrumb-icon">🏪</span>
			<span>Sales Channels</span>
			<span class="breadcrumb-separator">›</span>
			<span>Point of Sale</span>
		</div>
	</div>

	<div class="page-content">
		<div class="pos-content">
			<div class="section-header">
				<h2 class="section-title">Point of Sale</h2>
				<div class="status-badge not-available">Not Available Yet</div>
			</div>
			
			<!-- United States Section -->
			<div class="country-section">
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
						<div class="metrics-row">
							<div class="metric-card">
								<div class="metric-label">Total orders</div>
								<div class="metric-value">0</div>
							</div>
							<div class="metric-card">
								<div class="metric-label">Returns</div>
								<div class="metric-value">$0 —</div>
							</div>
							<div class="metric-card">
								<div class="metric-label">Customers</div>
								<div class="metric-value">0</div>
							</div>
						</div>

						<!-- Management Sections -->
						<div class="management-sections">
							<div class="management-item">
								<div class="management-icon">📍</div>
								<div class="management-content">
									<div class="management-title">POS location</div>
									<div class="management-subtitle">1 Pro</div>
								</div>
								<div class="management-badge">1</div>
								<div class="management-arrow">›</div>
							</div>

							<div class="management-item">
								<div class="management-icon">💰</div>
								<div class="management-content">
									<div class="management-title">Cash tracking</div>
									<div class="management-subtitle">No open sessions</div>
								</div>
								<div class="management-arrow">›</div>
							</div>

							<div class="management-item">
								<div class="management-icon">👥</div>
								<div class="management-content">
									<div class="management-title">Staff</div>
								</div>
								<div class="management-arrow">›</div>
							</div>
						</div>

						<!-- Recommended Section -->
						<div class="recommended-section">
							<h3 class="recommended-title">Recommended for you</h3>
							
							<div class="recommendation-cards">
								<div class="recommendation-card">
									<div class="rec-icon">
										<div class="hardware-icon">🖥️</div>
									</div>
									<div class="rec-content">
										<div class="rec-title">Shop POS hardware</div>
										<div class="rec-description">Offer best-in-class checkouts at the counter and in store</div>
									</div>
									<button class="rec-button">Shop hardware</button>
								</div>

								<div class="recommendation-card">
									<div class="rec-icon">
										<div class="segments-icon">📊</div>
									</div>
									<div class="rec-content">
										<div class="rec-title">Drive store loyalty with retail-first customer segments</div>
										<div class="rec-description">Harness the power of customer segments to target loyal in-store customers with exclusive offers or events.</div>
									</div>
									<button class="rec-button">Create segment</button>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Canada Section -->
			<div class="country-section">
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
						<div class="metrics-row">
							<div class="metric-card">
								<div class="metric-label">Total orders</div>
								<div class="metric-value">0</div>
							</div>
							<div class="metric-card">
								<div class="metric-label">Returns</div>
								<div class="metric-value">$0 —</div>
							</div>
							<div class="metric-card">
								<div class="metric-label">Customers</div>
								<div class="metric-value">0</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
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
		gap: 0.5rem;
	}

	.header-icon {
		font-size: 1.5rem;
		color: #005bd3;
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

	.breadcrumb-separator {
		margin: 0 0.5rem;
		color: #d1d5db;
	}

	.page-content {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.pos-content {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e3e3e3;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.section-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-badge.not-available {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fbbf24;
	}

	.country-section {
		margin-bottom: 2rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
	}

	.country-header {
		width: 100%;
		padding: 1rem 1.5rem;
		background: #f9fafb;
		border: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.country-header:hover {
		background: #f3f4f6;
	}

	.country-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.flag {
		font-size: 1.25rem;
	}

	.country-name {
		font-size: 1rem;
		font-weight: 500;
		color: #1a1a1a;
	}

	.expand-arrow {
		font-size: 0.75rem;
		color: #6b7280;
		transition: transform 0.2s;
		transform: rotate(-90deg);
	}

	.expand-arrow.expanded {
		transform: rotate(0deg);
	}

	.country-content {
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.metrics-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.metric-card {
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
	}

	.metric-label {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	.metric-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.management-sections {
		margin-bottom: 2rem;
	}

	.management-item {
		display: flex;
		align-items: center;
		padding: 1rem 0;
		border-bottom: 1px solid #f3f4f6;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.management-item:hover {
		background: #f9fafb;
		margin: 0 -1rem;
		padding: 1rem;
		border-radius: 6px;
	}

	.management-item:last-child {
		border-bottom: none;
	}

	.management-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f3f4f6;
		border-radius: 8px;
		margin-right: 1rem;
		font-size: 1.25rem;
	}

	.management-content {
		flex: 1;
	}

	.management-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1a1a1a;
		margin-bottom: 0.25rem;
	}

	.management-subtitle {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.management-badge {
		background: #e5e7eb;
		color: #374151;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		margin-right: 0.5rem;
	}

	.management-arrow {
		color: #9ca3af;
		font-size: 1.25rem;
		font-weight: 300;
	}

	.recommended-section {
		border-top: 1px solid #e5e7eb;
		padding-top: 1.5rem;
	}

	.recommended-title {
		font-size: 1rem;
		font-weight: 600;
		color: #1a1a1a;
		margin-bottom: 1.5rem;
	}

	.recommendation-cards {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.recommendation-card {
		display: flex;
		align-items: center;
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
		gap: 1rem;
	}

	.rec-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.hardware-icon {
		width: 48px;
		height: 48px;
		background: #f3f4f6;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
	}

	.segments-icon {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #10b981, #059669);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
	}

	.rec-content {
		flex: 1;
	}

	.rec-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1a1a1a;
		margin-bottom: 0.5rem;
	}

	.rec-description {
		font-size: 0.8125rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.rec-button {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.rec-button:hover {
		background: #e5e7eb;
	}

	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}

		.pos-content {
			padding: 1rem;
		}

		.metrics-row {
			grid-template-columns: 1fr;
		}

		.recommendation-card {
			flex-direction: column;
			align-items: flex-start;
			text-align: left;
		}

		.rec-button {
			align-self: flex-start;
		}
	}
</style>