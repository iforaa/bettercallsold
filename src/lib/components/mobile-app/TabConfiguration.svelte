<script lang="ts">
	import type { AppTab } from '$lib/types/mobile-app';
	
	let { 
		tabs = [],
		availableIcons = [],
		onToggleTab,
		onUpdateTab 
	} = $props();
	
	function handleTabToggle(tabIndex: number) {
		if (onToggleTab) {
			onToggleTab(tabIndex);
		}
	}
	
	function handleTabUpdate(tabIndex: number, field: string, value: any) {
		if (onUpdateTab) {
			onUpdateTab(tabIndex, { [field]: value });
		}
	}
</script>

<div class="tab-configuration">
	<div class="tabs-config">
		{#each tabs as tab, index}
			<div
				class="tab-config-item"
				class:disabled={!tab.enabled}
			>
				<div class="tab-header">
					<div class="tab-info">
						<span class="tab-icon">📌</span>
						<span class="tab-title">{tab.title}</span>
						<span class="tab-key">({tab.key})</span>
					</div>
					<label class="toggle-switch">
						<input
							type="checkbox"
							checked={tab.enabled}
							onchange={() => handleTabToggle(index)}
						/>
						<span class="toggle-slider"></span>
					</label>
				</div>

				{#if tab.enabled}
					<div class="tab-details">
						<div class="form-field">
							<label class="form-label">Tab Title</label>
							<input
								type="text"
								value={tab.title}
								onchange={(e) => handleTabUpdate(index, 'title', e.target.value)}
								class="form-input form-input-sm"
								placeholder="Enter tab title"
							/>
						</div>
						<div class="form-field">
							<label class="form-label">Icon</label>
							<select
								value={tab.icon}
								onchange={(e) => handleTabUpdate(index, 'icon', e.target.value)}
								class="form-select form-select-sm"
							>
								{#each availableIcons as icon}
									<option value={icon}>{icon}</option>
								{/each}
							</select>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
	
	<!-- Tab Summary -->
	<div class="tab-summary">
		<div class="summary-stat">
			<span class="stat-label">Total Tabs:</span>
			<span class="stat-value">{tabs.length}</span>
		</div>
		<div class="summary-stat">
			<span class="stat-label">Enabled:</span>
			<span class="stat-value">{tabs.filter(t => t.enabled).length}</span>
		</div>
		<div class="summary-stat">
			<span class="stat-label">Disabled:</span>
			<span class="stat-value">{tabs.filter(t => !t.enabled).length}</span>
		</div>
	</div>
</div>

<style>
	.tab-configuration {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	/* Tab configuration styling */
	.tabs-config {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.tab-config-item {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		transition: opacity var(--transition-fast);
		background: var(--color-surface);
	}

	.tab-config-item.disabled {
		opacity: 0.5;
		background: var(--color-surface-secondary);
	}

	.tab-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-2);
	}

	.tab-info {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.tab-title {
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
	}

	.tab-key {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
	}

	/* Toggle switch styling */
	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 50px;
		height: 24px;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: var(--color-border);
		transition: var(--transition-normal);
		border-radius: 24px;
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: var(--transition-normal);
		border-radius: 50%;
	}

	input:checked + .toggle-slider {
		background-color: var(--color-primary);
	}

	input:checked + .toggle-slider:before {
		transform: translateX(26px);
	}

	.tab-details {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border-light);
	}

	/* Tab summary */
	.tab-summary {
		display: flex;
		justify-content: space-around;
		padding: var(--space-4);
		background: var(--color-surface-secondary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-light);
	}

	.summary-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.stat-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
	}

	.stat-value {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.tab-details {
			grid-template-columns: 1fr;
		}
		
		.tab-summary {
			flex-direction: column;
			gap: var(--space-3);
		}
		
		.summary-stat {
			flex-direction: row;
			justify-content: space-between;
		}
	}
</style>