<script lang="ts">
	import type { ReplayMetricsProps } from '$lib/types/replays';
	import { ReplayService } from '$lib/services/ReplayService.js';
	
	let { 
		replay,
		analytics,
		showDetailed = false,
		className = ''
	}: ReplayMetricsProps = $props();
	
	// Format data for display
	let formattedReplay = $derived(replay ? ReplayService.formatReplay(replay) : null);
	let displayAnalytics = $derived(analytics || (formattedReplay ? {
		totalReplays: 1,
		totalViewers: replay?.peak_viewers || 0,
		totalDuration: replay?.duration || 0,
		averageViewers: replay?.peak_viewers || 0,
		averageDuration: replay?.duration || 0,
		formattedTotalDuration: ReplayService.formatDuration(replay?.duration || 0),
		formattedAverageDuration: ReplayService.formatDuration(replay?.duration || 0),
		liveCount: replay?.is_live ? 1 : 0,
		replayCount: replay?.is_live ? 0 : 1
	} : null));
</script>

<div class="replay-metrics {className}">
	{#if displayAnalytics}
		<div class="metrics-header">
			<h4 class="metrics-title">
				{replay ? 'Replay Statistics' : 'Analytics Overview'}
			</h4>
			{#if replay && formattedReplay?.statusInfo}
				<div class="status-badge {formattedReplay.statusInfo.class}">
					{formattedReplay.statusInfo.text}
				</div>
			{/if}
		</div>
		
		<!-- Primary metrics grid -->
		<div class="metrics-grid">
			{#if replay}
				<!-- Single replay metrics -->
				<div class="metric-card">
					<div class="metric-icon">⏱️</div>
					<div class="metric-content">
						<div class="metric-label">Duration</div>
						<div class="metric-value">{formattedReplay?.formattedDuration || 'Unknown'}</div>
					</div>
				</div>
				
				<div class="metric-card">
					<div class="metric-icon">👥</div>
					<div class="metric-content">
						<div class="metric-label">Peak Viewers</div>
						<div class="metric-value">{formattedReplay?.formattedViewers || '0'}</div>
					</div>
				</div>
				
				<div class="metric-card">
					<div class="metric-icon">📦</div>
					<div class="metric-content">
						<div class="metric-label">Products</div>
						<div class="metric-value">{formattedReplay?.productsCount || 0}</div>
					</div>
				</div>
				
				<div class="metric-card">
					<div class="metric-icon">📊</div>
					<div class="metric-content">
						<div class="metric-label">Status</div>
						<div class="metric-value status-{formattedReplay?.statusInfo.color}">
							{formattedReplay?.statusInfo.text || 'Unknown'}
						</div>
					</div>
				</div>
			{:else}
				<!-- Analytics overview -->
				<div class="metric-card">
					<div class="metric-icon">🎬</div>
					<div class="metric-content">
						<div class="metric-label">Total Replays</div>
						<div class="metric-value">{displayAnalytics.totalReplays.toLocaleString()}</div>
					</div>
				</div>
				
				<div class="metric-card">
					<div class="metric-icon">👥</div>
					<div class="metric-content">
						<div class="metric-label">Total Viewers</div>
						<div class="metric-value">{ReplayService.formatViewers(displayAnalytics.totalViewers)}</div>
					</div>
				</div>
				
				<div class="metric-card">
					<div class="metric-icon">⏱️</div>
					<div class="metric-content">
						<div class="metric-label">Total Duration</div>
						<div class="metric-value">{displayAnalytics.formattedTotalDuration || ReplayService.formatDuration(displayAnalytics.totalDuration)}</div>
					</div>
				</div>
				
				<div class="metric-card">
					<div class="metric-icon">📊</div>
					<div class="metric-content">
						<div class="metric-label">Avg. Viewers</div>
						<div class="metric-value">{ReplayService.formatViewers(displayAnalytics.averageViewers)}</div>
					</div>
				</div>
			{/if}
		</div>
		
		{#if showDetailed && !replay}
			<!-- Detailed analytics section -->
			<div class="detailed-metrics">
				<div class="metrics-section">
					<h5 class="section-title">Performance Averages</h5>
					<div class="metrics-row">
						<div class="metric-item">
							<span class="metric-item-label">Average Duration</span>
							<span class="metric-item-value">{displayAnalytics.formattedAverageDuration || ReplayService.formatDuration(displayAnalytics.averageDuration)}</span>
						</div>
						<div class="metric-item">
							<span class="metric-item-label">Average Viewers</span>
							<span class="metric-item-value">{ReplayService.formatViewers(displayAnalytics.averageViewers)}</span>
						</div>
					</div>
				</div>
				
				<div class="metrics-section">
					<h5 class="section-title">Content Breakdown</h5>
					<div class="metrics-row">
						<div class="metric-item">
							<span class="metric-item-label">Live Streams</span>
							<span class="metric-item-value live-count">{displayAnalytics.liveCount}</span>
						</div>
						<div class="metric-item">
							<span class="metric-item-label">Replays</span>
							<span class="metric-item-value replay-count">{displayAnalytics.replayCount}</span>
						</div>
					</div>
				</div>
				
				{#if displayAnalytics.totalReplays > 0}
					<div class="metrics-section">
						<h5 class="section-title">Engagement Insights</h5>
						<div class="metrics-row">
							<div class="metric-item">
								<span class="metric-item-label">Avg. Viewers per Replay</span>
								<span class="metric-item-value">{Math.round(displayAnalytics.totalViewers / displayAnalytics.totalReplays).toLocaleString()}</span>
							</div>
							<div class="metric-item">
								<span class="metric-item-label">Live Stream Rate</span>
								<span class="metric-item-value">{Math.round((displayAnalytics.liveCount / displayAnalytics.totalReplays) * 100)}%</span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
		
		<!-- Quick actions -->
		{#if replay}
			<div class="metrics-actions">
				<button class="btn btn-ghost btn-sm" onclick={() => console.log('Export replay metrics')}>
					📊 Export Stats
				</button>
				<button class="btn btn-ghost btn-sm" onclick={() => console.log('View detailed analytics')}>
					📈 View Details
				</button>
			</div>
		{/if}
	{:else}
		<div class="metrics-empty">
			<div class="empty-icon">📊</div>
			<h4>No Metrics Available</h4>
			<p>No replay data to display metrics for</p>
		</div>
	{/if}
</div>

<style>
	.replay-metrics {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		width: 100%;
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
	
	.status-badge.success {
		background: var(--color-success-bg);
		color: var(--color-success-text);
	}
	
	.status-badge.error {
		background: var(--color-error-bg);
		color: var(--color-error-text);
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
	
	.metric-value.status-error {
		color: var(--color-error);
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
	
	.metric-item-value.live-count {
		color: var(--color-error);
	}
	
	.metric-item-value.replay-count {
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
		.metrics-grid {
			grid-template-columns: 1fr;
		}
		
		.metric-card {
			flex-direction: column;
			text-align: center;
		}
	}
</style>