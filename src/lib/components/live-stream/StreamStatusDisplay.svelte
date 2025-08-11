<script lang="ts">
	import type { StreamStatusDisplayProps } from '$lib/types/live-stream';
	
	let { 
		status,
		metrics,
		isCompact = false
	}: StreamStatusDisplayProps = $props();
	
	// Get status indicator classes
	function getIndicatorClass() {
		return `status-indicator ${status.statusClass}`;
	}
	
	// Format connection info
	function getConnectionInfo() {
		if (status.isLive) {
			return { text: 'Live Selling Active', class: 'live-active' };
		}
		if (status.isActive) {
			return { text: 'Stream Active', class: 'stream-active' };
		}
		return { text: status.statusText, class: 'stream-inactive' };
	}
	
	let connectionInfo = $derived(getConnectionInfo());
</script>

<div class="stream-status-display" class:compact={isCompact}>
	{#if isCompact}
		<!-- Compact view for header -->
		<div class="status-compact">
			<div class="status-group">
				<div class={getIndicatorClass()}></div>
				<span class="status-text">{connectionInfo.text}</span>
			</div>
			{#if status.isLive}
				<div class="live-badge">
					<span class="live-dot"></span>
					LIVE
				</div>
			{/if}
		</div>
	{:else}
		<!-- Full view for detailed display -->
		<div class="status-card">
			<div class="status-header">
				<div class="status-main">
					<div class={getIndicatorClass()}></div>
					<div class="status-info">
						<h4 class="status-title">{connectionInfo.text}</h4>
						<p class="status-subtitle">Connection: {status.statusText}</p>
					</div>
				</div>
				{#if status.isLive}
					<div class="live-badge live-badge-large">
						<span class="live-dot"></span>
						LIVE
					</div>
				{/if}
			</div>
			
			<!-- Metrics -->
			<div class="metrics-grid">
				<div class="metric-item">
					<span class="metric-label">Duration</span>
					<span class="metric-value">{metrics.duration}</span>
				</div>
				<div class="metric-item">
					<span class="metric-label">Viewers</span>
					<span class="metric-value">{metrics.viewers}</span>
				</div>
				<div class="metric-item">
					<span class="metric-label">Status</span>
					<span class="metric-value {status.statusColor}">{status.statusText}</span>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.stream-status-display {
		width: 100%;
	}

	/* Compact view styles */
	.status-compact {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.status-group {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.status-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
	}

	/* Full view styles */
	.status-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
	}

	.status-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-4);
	}

	.status-main {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.status-info {
		flex: 1;
	}

	.status-title {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-1) 0;
	}

	.status-subtitle {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
	}

	/* Status indicators */
	.status-indicator {
		width: 12px;
		height: 12px;
		border-radius: var(--radius-full);
		background: var(--color-text-muted);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.status-indicator.connected {
		background: var(--color-success);
		animation: pulse 2s infinite;
	}

	.status-indicator.connecting {
		background: var(--color-warning);
		animation: blink 1s infinite;
	}

	.status-indicator.connection-failed,
	.status-indicator.token-expired {
		background: var(--color-error);
	}

	/* Live badge */
	.live-badge {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: var(--color-error);
		color: white;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.live-badge-large {
		padding: var(--space-2) var(--space-3);
		font-size: var(--font-size-sm);
	}

	.live-dot {
		width: 6px;
		height: 6px;
		background: white;
		border-radius: var(--radius-full);
		animation: pulse-fast 1s infinite;
	}

	/* Metrics grid */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border-light);
	}

	.metric-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.metric-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.metric-value {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	.metric-value.success {
		color: var(--color-success);
	}

	.metric-value.warning {
		color: var(--color-warning);
	}

	.metric-value.error {
		color: var(--color-error);
	}

	/* Animations */
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	@keyframes pulse-fast {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.status-compact {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}
		
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.status-header {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-3);
		}
	}
</style>