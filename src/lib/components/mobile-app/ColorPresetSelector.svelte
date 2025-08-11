<script lang="ts">
	import type { ColorPreset } from '$lib/types/mobile-app';
	
	let { 
		presets = [],
		onSelectPreset 
	} = $props();
	
	function handlePresetClick(preset: ColorPreset) {
		if (onSelectPreset) {
			onSelectPreset(preset);
		}
	}
</script>

<div class="color-presets">
	<h4 class="content-subtitle">Quick Presets</h4>
	<div class="preset-grid">
		{#each presets as preset}
			<button
				class="preset-button"
				onclick={() => handlePresetClick(preset)}
				style="background: linear-gradient(135deg, {preset.colors.primary}, {preset.colors.secondary})"
				title="Apply {preset.name} color scheme"
			>
				<span class="preset-name">{preset.name}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.color-presets {
		margin-bottom: var(--space-6);
	}
	
	.content-subtitle {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--space-4);
	}

	.preset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: var(--space-3);
	}

	.preset-button {
		padding: var(--space-4) var(--space-2);
		border: none;
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: transform var(--transition-fast);
		color: white;
		font-weight: var(--font-weight-semibold);
		font-size: var(--font-size-xs);
		text-align: center;
		min-height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preset-button:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.preset-button:active {
		transform: translateY(0);
	}

	.preset-name {
		display: block;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.preset-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>