<script lang="ts">
	import type { UserMetricsProps } from '$lib/types/users';
	import { UserService } from '$lib/services/UserService.js';
	
	let { 
		analytics,
		users,
		showDetailed = false,
		loading = false,
		className = ''
	}: UserMetricsProps = $props();
	
	// Compute analytics if not provided
	let displayAnalytics = $derived.by(() => {
		if (analytics) return analytics;
		if (users && users.length > 0) {
			return UserService.calculateUserAnalytics(users);
		}
		return null;
	});
</script>

<div class="user-metrics {className}">
	{#if loading}
		<div class="metrics-loading">
			<div class="loading-spinner loading-spinner-md"></div>
			<p>Loading user analytics...</p>
		</div>
	{:else if displayAnalytics}
		<div class="metrics-header">
			<h4 class="metrics-title">User Analytics</h4>
		</div>
		
		<!-- Primary metrics grid -->
		<div class="metrics-grid">
			<div class="metric-card">
				<div class="metric-icon">👥</div>
				<div class="metric-content">
					<div class="metric-label">Total Users</div>
					<div class="metric-value">{displayAnalytics.totalUsers.toLocaleString()}</div>
				</div>
			</div>
			
			<div class="metric-card">
				<div class="metric-icon">👨‍💼</div>
				<div class="metric-content">
					<div class="metric-label">Staff Members</div>
					<div class="metric-value">{displayAnalytics.totalStaff.toLocaleString()}</div>
				</div>
			</div>
			
			<div class="metric-card">
				<div class="metric-icon">🛒</div>
				<div class="metric-content">
					<div class="metric-label">Customers</div>
					<div class="metric-value">{displayAnalytics.totalCustomers.toLocaleString()}</div>
				</div>
			</div>
			
			<div class="metric-card">
				<div class="metric-icon">✅</div>
				<div class="metric-content">
					<div class="metric-label">Active Users</div>
					<div class="metric-value status-success">{displayAnalytics.totalActive.toLocaleString()}</div>
				</div>
			</div>
		</div>
		
		{#if showDetailed}
			<!-- Detailed analytics section -->
			<div class="detailed-metrics">
				<!-- Role breakdown -->
				<div class="metrics-section">
					<h5 class="section-title">Role Distribution</h5>
					<div class="metrics-row">
						{#each Object.entries(displayAnalytics.roleBreakdown) as [role, count]}
							<div class="metric-item">
								<span class="metric-item-icon">{UserService.getRoleInfo(role).icon}</span>
								<div class="metric-item-content">
									<span class="metric-item-label">{UserService.getRoleInfo(role).text}</span>
									<span class="metric-item-value role-{role}">{count}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
				
				<!-- Status breakdown -->
				<div class="metrics-section">
					<h5 class="section-title">Status Distribution</h5>
					<div class="metrics-row">
						{#each Object.entries(displayAnalytics.statusBreakdown) as [status, count]}
							<div class="metric-item">
								<div class="metric-item-content">
									<span class="metric-item-label">{UserService.getStatusInfo(status).text}</span>
									<span class="metric-item-value status-{UserService.getStatusInfo(status).color}">{count}</span>
								</div>
								<div class="status-indicator status-{UserService.getStatusInfo(status).color}"></div>
							</div>
						{/each}
					</div>
				</div>
				
				<!-- Activity metrics -->
				{#if displayAnalytics.totalUsers > 0}
					<div class="metrics-section">
						<h5 class="section-title">Activity Insights</h5>
						<div class="metrics-row">
							<div class="metric-item">
								<span class="metric-item-label">Recent Signups (30 days)</span>
								<span class="metric-item-value recent-count">{displayAnalytics.recentUsers}</span>
							</div>
							<div class="metric-item">
								<span class="metric-item-label">Active User Rate</span>
								<span class="metric-item-value">{Math.round((displayAnalytics.totalActive / displayAnalytics.totalUsers) * 100)}%</span>
							</div>
							<div class="metric-item">
								<span class="metric-item-label">Staff Ratio</span>
								<span class="metric-item-value">{Math.round((displayAnalytics.totalStaff / displayAnalytics.totalUsers) * 100)}%</span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
		
		<!-- Quick actions -->
		<div class="metrics-actions">
			<button class="btn btn-ghost btn-sm" onclick={() => console.log('Export user metrics')}>
				📊 Export Report
			</button>
			<button class="btn btn-ghost btn-sm" onclick={() => console.log('View detailed analytics')}>
				📈 View Details
			</button>
		</div>
	{:else}
		<div class="metrics-empty">
			<div class="empty-icon">📊</div>
			<h4>No User Data</h4>
			<p>No user analytics available to display</p>
		</div>
	{/if}
</div>

<style>
	.user-metrics {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		width: 100%;
	}
	
	/* Loading state */
	.metrics-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-8);
		text-align: center;
	}
	
	.metrics-loading p {
		margin-top: var(--space-4);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}
	
	/* Header */
	.metrics-header {
		margin-bottom: var(--space-6);
	}
	
	.metrics-title {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
	}
	
	/* Primary metrics grid */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}
	
	.metric-card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--color-surface-secondary);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-light);
	}
	
	.metric-icon {
		font-size: var(--font-size-xl);
		flex-shrink: 0;
		opacity: 0.8;
	}
	
	.metric-content {
		flex: 1;
		min-width: 0;
	}
	
	.metric-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: var(--space-1);
	}
	
	.metric-value {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}
	
	.metric-value.status-success {
		color: var(--color-success);
	}
	
	/* Detailed metrics */
	.detailed-metrics {
		border-top: 1px solid var(--color-border-light);
		padding-top: var(--space-6);
		margin-bottom: var(--space-6);
	}
	
	.metrics-section {
		margin-bottom: var(--space-6);
	}
	
	.metrics-section:last-child {
		margin-bottom: 0;
	}
	
	.section-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-4) 0;
	}
	
	.metrics-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
	}
	
	.metric-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3);
		background: var(--color-surface);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-light);
	}
	
	.metric-item-icon {
		font-size: var(--font-size-base);
		margin-right: var(--space-2);
	}
	
	.metric-item-content {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.metric-item-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
	}
	
	.metric-item-value {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}
	
	.metric-item-value.role-admin {
		color: var(--color-error);
	}
	
	.metric-item-value.role-staff {
		color: var(--color-info);
	}
	
	.metric-item-value.role-manager {
		color: var(--color-warning);
	}
	
	.metric-item-value.role-customer {
		color: var(--color-success);
	}
	
	.metric-item-value.status-success {
		color: var(--color-success);
	}
	
	.metric-item-value.status-error {
		color: var(--color-error);
	}
	
	.metric-item-value.status-warning {
		color: var(--color-warning);
	}
	
	.metric-item-value.status-info {
		color: var(--color-info);
	}
	
	.metric-item-value.recent-count {
		color: var(--color-primary);
	}
	
	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-left: var(--space-2);
	}
	
	.status-indicator.status-success {
		background: var(--color-success);
	}
	
	.status-indicator.status-error {
		background: var(--color-error);
	}
	
	.status-indicator.status-warning {
		background: var(--color-warning);
	}
	
	.status-indicator.status-info {
		background: var(--color-info);
	}
	
	/* Actions */
	.metrics-actions {
		display: flex;
		justify-content: center;
		gap: var(--space-2);
		border-top: 1px solid var(--color-border-light);
		padding-top: var(--space-4);
	}
	
	.btn-sm {
		padding: var(--space-2) var(--space-3);
		font-size: var(--font-size-xs);
	}
	
	/* Empty state */
	.metrics-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-8);
	}
	
	.empty-icon {
		font-size: var(--font-size-3xl);
		margin-bottom: var(--space-4);
		opacity: 0.6;
	}
	
	.metrics-empty h4 {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-2) 0;
	}
	
	.metrics-empty p {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
	}
	
	/* Responsive adjustments */
	@media (max-width: 768px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.metrics-row {
			grid-template-columns: 1fr;
		}
		
		.metrics-actions {
			flex-direction: column;
		}
		
		.metrics-actions .btn {
			width: 100%;
			justify-content: center;
		}
	}
	
	@media (max-width: 480px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
		
		.metric-card {
			flex-direction: column;
			text-align: center;
		}
		
		.metric-item {
			flex-direction: column;
			text-align: center;
			gap: var(--space-2);
		}
		
		.metric-item-content {
			flex-direction: column;
			text-align: center;
		}
		
		.status-indicator {
			margin-left: 0;
			margin-top: var(--space-1);
		}
	}
</style>