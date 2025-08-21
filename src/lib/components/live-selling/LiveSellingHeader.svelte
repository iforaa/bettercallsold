<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	interface Props {
		// Additional content for the right side of header
		rightContent?: any;
		className?: string;
	}

	let { 
		rightContent,
		className = ''
	}: Props = $props();

	// Determine current section based on route
	let currentSection = $derived.by(() => {
		const pathname = $page.url.pathname;
		if (pathname.startsWith('/replays')) return 'replays';
		return 'live';
	});

	function handleSectionSwitch(section: 'live' | 'replays') {
		if (section === 'live') {
			goto('/live');
		} else {
			goto('/replays');
		}
	}
</script>

<div class="page-header {className}">
	<div class="page-header-content">
		<div class="page-header-nav">
			<div class="page-title-section">
				<div class="page-title">
					<span class="page-icon">📺</span>
					<span class="page-title-text">Live Selling</span>
				</div>
				
				<!-- Section Switcher -->
				<div class="section-switcher">
					<button 
						class="section-tab" 
						class:active={currentSection === 'live'}
						onclick={() => handleSectionSwitch('live')}
					>
						🔴 Live Sales
					</button>
					<button 
						class="section-tab" 
						class:active={currentSection === 'replays'}
						onclick={() => handleSectionSwitch('replays')}
					>
						🎬 Replays
					</button>
				</div>
			</div>
		</div>
		
		{#if rightContent}
			<div class="page-header-aside">
				{@render rightContent()}
			</div>
		{/if}
	</div>
</div>

<style>
	.page-title-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.page-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: 0;
	}

	.page-icon {
		font-size: var(--font-size-xl);
	}

	.page-title-text {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	/* Section Switcher */
	.section-switcher {
		display: flex;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-1);
		gap: var(--space-1);
	}

	.section-tab {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.section-tab:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.section-tab.active {
		background: var(--color-primary);
		color: white;
		box-shadow: var(--shadow-sm);
	}

	.page-header-aside {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.page-header-content {
			flex-direction: column;
			gap: var(--space-3);
			align-items: flex-start;
		}
		
		.page-title-section {
			width: 100%;
		}
		
		.section-switcher {
			width: 100%;
			justify-content: center;
		}
		
		.section-tab {
			flex: 1;
			justify-content: center;
		}
		
		.page-header-aside {
			width: 100%;
			justify-content: space-between;
		}
	}

	@media (max-width: 480px) {
		.page-title {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
		}
		
		.section-tab {
			padding: var(--space-3);
			font-size: var(--font-size-xs);
		}
	}
</style>