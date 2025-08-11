<script lang="ts">
	import type { ReplayCardProps } from '$lib/types/replays';
	import { ReplayService } from '$lib/services/ReplayService.js';
	
	let { 
		replay,
		selected = false,
		onSelect,
		onClick,
		showThumbnail = true,
		showMetrics = true
	}: ReplayCardProps = $props();
	
	function handleCardClick(event: Event) {
		// Don't trigger card click if clicking on checkbox
		const target = event.target as HTMLElement;
		if (target.type === 'checkbox' || target.closest('input[type="checkbox"]')) {
			return;
		}
		
		if (onClick) {
			onClick(replay);
		}
	}
	
	function handleSelectChange() {
		if (onSelect) {
			onSelect(replay.id);
		}
	}
	
	// Format replay data
	let formattedReplay = $derived(ReplayService.formatReplay(replay));
	let statusInfo = $derived(formattedReplay.statusInfo);
</script>

<div 
	class="replay-card" 
	class:selected
	onclick={handleCardClick}
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleCardClick(e);
		}
	}}
>
	{#if onSelect}
		<div class="replay-card-checkbox" onclick={(e) => e.stopPropagation()}>
			<input 
				type="checkbox" 
				class="table-checkbox"
				checked={selected}
				onchange={handleSelectChange}
			/>
		</div>
	{/if}
	
	{#if showThumbnail && formattedReplay.displayThumbnail}
		<div class="replay-card-thumbnail">
			<img 
				src={formattedReplay.displayThumbnail} 
				alt={formattedReplay.displayName}
				loading="lazy"
			/>
			<div class="replay-card-overlay">
				<div class="play-button">▶</div>
			</div>
		</div>
	{:else}
		<div class="replay-card-placeholder">
			🎬
		</div>
	{/if}
	
	<div class="replay-card-content">
		<div class="replay-card-header">
			<h4 class="replay-card-title">{formattedReplay.displayName}</h4>
			<span class="badge badge-{statusInfo.color}">
				{statusInfo.text}
			</span>
		</div>
		
		<div class="replay-card-details">
			{#if replay.external_id}
				<div class="replay-card-id">ID: {replay.external_id}</div>
			{/if}
			
			{#if replay.started_at_formatted}
				<div class="replay-card-date">{replay.started_at_formatted}</div>
			{/if}
		</div>
		
		{#if showMetrics}
			<div class="replay-card-metrics">
				<div class="metric-item">
					<span class="metric-icon">⏱️</span>
					<span class="metric-value">{formattedReplay.formattedDuration}</span>
				</div>
				<div class="metric-item">
					<span class="metric-icon">👥</span>
					<span class="metric-value">{formattedReplay.formattedViewers}</span>
				</div>
				<div class="metric-item">
					<span class="metric-icon">📦</span>
					<span class="metric-value">{formattedReplay.productsCount}</span>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.replay-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: all var(--transition-fast);
		cursor: pointer;
		position: relative;
	}
	
	.replay-card:hover {
		border-color: var(--color-border-hover);
		box-shadow: var(--shadow-sm);
		transform: translateY(-1px);
	}
	
	.replay-card.selected {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 1px var(--color-primary);
	}
	
	.replay-card-checkbox {
		position: absolute;
		top: var(--space-3);
		left: var(--space-3);
		z-index: 2;
		background: rgba(0, 0, 0, 0.7);
		border-radius: var(--radius-sm);
		padding: var(--space-1);
	}
	
	.replay-card-thumbnail {
		position: relative;
		width: 100%;
		aspect-ratio: 16/9;
		overflow: hidden;
		background: var(--color-surface-hover);
	}
	
	.replay-card-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	
	.replay-card-placeholder {
		width: 100%;
		aspect-ratio: 16/9;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		font-size: var(--font-size-2xl);
		opacity: 0.6;
	}
	
	.replay-card-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity var(--transition-fast);
	}
	
	.replay-card:hover .replay-card-overlay {
		opacity: 1;
	}
	
	.play-button {
		color: white;
		font-size: var(--font-size-2xl);
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
	}
	
	.replay-card-content {
		padding: var(--space-4);
	}
	
	.replay-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: var(--space-3);
		gap: var(--space-3);
	}
	
	.replay-card-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
		flex: 1;
		min-width: 0;
		word-break: break-word;
		line-height: var(--line-height-tight);
	}
	
	.replay-card-details {
		margin-bottom: var(--space-4);
	}
	
	.replay-card-id,
	.replay-card-date {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-bottom: var(--space-1);
	}
	
	.replay-card-id {
		font-family: var(--font-mono);
	}
	
	.replay-card-metrics {
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
	}
	
	.metric-item {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		flex: 1;
		min-width: 0;
	}
	
	.metric-icon {
		font-size: var(--font-size-sm);
		opacity: 0.7;
		flex-shrink: 0;
	}
	
	.metric-value {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-muted);
		truncate: true;
	}
	
	/* Responsive adjustments */
	@media (max-width: 480px) {
		.replay-card-header {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}
		
		.replay-card-metrics {
			flex-direction: column;
			gap: var(--space-2);
		}
		
		.metric-item {
			justify-content: space-between;
		}
	}
</style>