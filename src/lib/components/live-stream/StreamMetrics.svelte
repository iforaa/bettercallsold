<script lang="ts">
	import type { StreamMetricsProps } from '$lib/types/live-stream';
	
	let { 
		metrics,
		analytics = null,
		showDetailed = false
	}: StreamMetricsProps = $props();
	
	// Format duration for display
	function formatDuration(duration: string) {
		if (duration === '0:00') return 'Not started';
		return duration;
	}
	
	// Get status badge info
	function getStatusBadge() {
		if (metrics.isActive) {
			return { text: 'Active', class: 'badge-success' };
		}
		return { text: 'Inactive', class: 'badge-secondary' };
	}
	
	// Format number with commas
	function formatNumber(num: number) {
		return new Intl.NumberFormat().format(num);
	}
	
	// Calculate conversion rate if analytics available
	function getConversionRate() {
		if (!analytics || !analytics.viewerCount) return '0%';
		const rate = (analytics.conversions / analytics.viewerCount) * 100;
		return `${rate.toFixed(1)}%`;
	}
	
	let statusBadge = $derived(getStatusBadge());
	let formattedDuration = $derived(formatDuration(metrics.duration));
</script>

<div class="stream-metrics" class:detailed={showDetailed}>
	<div class="metrics-header">
		<h4 class="metrics-title">Stream Metrics</h4>
		<div class="status-badge {statusBadge.class}">
			{statusBadge.text}
		</div>
	</div>
	
	<!-- Basic Metrics -->
	<div class="metrics-grid">
		<div class="metric-card">
			<div class="metric-icon">⏱️</div>
			<div class="metric-content">
				<div class="metric-label">Duration</div>
				<div class="metric-value">{formattedDuration}</div>
			</div>
		</div>
		
		<div class="metric-card">
			<div class="metric-icon">👥</div>
			<div class="metric-content">
				<div class="metric-label">Viewers</div>
				<div class="metric-value">{formatNumber(metrics.viewers)}</div>
			</div>
		</div>
		
		<div class="metric-card">
			<div class="metric-icon">📊</div>
			<div class="metric-content">
				<div class="metric-label">Status</div>
				<div class="metric-value {metrics.isActive ? 'active' : 'inactive'}">
					{metrics.isActive ? 'Active' : 'Inactive'}
				</div>
			</div>
		</div>
	</div>
	
	<!-- Detailed Analytics (if available and enabled) -->
	{#if showDetailed && analytics}
		<div class="analytics-section">
			<h5 class="analytics-title">Session Analytics</h5>
			
			<div class="analytics-grid">
				<div class="analytics-item">
					<span class="analytics-label">Peak Viewers</span>
					<span class="analytics-value">{formatNumber(analytics.peakViewers)}</span>
				</div>
				
				<div class="analytics-item">
					<span class="analytics-label">Total Messages</span>
					<span class="analytics-value">{formatNumber(analytics.totalMessages)}</span>
				</div>
				
				<div class="analytics-item">
					<span class="analytics-label">Products Shown</span>
					<span class="analytics-value">{analytics.productsShown}</span>
				</div>
				
				<div class="analytics-item">
					<span class="analytics-label">Conversions</span>
					<span class="analytics-value">{analytics.conversions}</span>
				</div>
				
				<div class="analytics-item">
					<span class="analytics-label">Conversion Rate</span>
					<span class="analytics-value">{getConversionRate()}</span>
				</div>
				
				<div class="analytics-item">
					<span class="analytics-label">Revenue</span>
					<span class="analytics-value revenue">${formatNumber(analytics.revenue)}</span>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Quick Actions -->
	<div class="metrics-actions">
		<button class="btn btn-ghost btn-sm" onclick={() => console.log('Export metrics')}>
			📊 Export
		</button>
		<button class="btn btn-ghost btn-sm" onclick={() => console.log('View detailed analytics')}>
			📈 View Details
		</button>
	</div>
</div>

<style>
	.stream-metrics {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		width: 100%;
	}

	.stream-metrics.detailed {
		max-height: none;
	}

	/* Header */
	.metrics-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-6);
	}

	.metrics-title {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
	}

	.status-badge {
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.badge-success {
		background: var(--color-success-bg);
		color: var(--color-success-text);
	}

	.badge-secondary {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}

	/* Basic metrics grid */
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

	.metric-value.active {
		color: var(--color-success);
	}

	.metric-value.inactive {
		color: var(--color-text-muted);
	}

	/* Analytics section */
	.analytics-section {
		border-top: 1px solid var(--color-border-light);
		padding-top: var(--space-6);
		margin-bottom: var(--space-6);
	}

	.analytics-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-4) 0;
	}

	.analytics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: var(--space-3);
	}

	.analytics-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--space-1);
		padding: var(--space-3);
		background: var(--color-surface);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-light);
	}

	.analytics-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
	}

	.analytics-value {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	.analytics-value.revenue {
		color: var(--color-success);
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

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
		
		.analytics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.metrics-header {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
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
		.analytics-grid {
			grid-template-columns: 1fr;
		}
		
		.metric-card {
			flex-direction: column;
			text-align: center;
		}
	}
</style>