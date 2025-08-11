<script lang="ts">
	import type { StreamConfigurationProps } from '$lib/types/live-stream';
	
	let { 
		settings,
		formData,
		isLoading = false,
		onUpdateSettings,
		onShowTokenPrompt
	}: StreamConfigurationProps = $props();
	
	// Handle form updates
	function handleChannelChange(event: Event) {
		const input = event.target as HTMLInputElement;
		formData.agora_channel = input.value;
	}
	
	function handleTokenChange(event: Event) {
		const input = event.target as HTMLInputElement;
		formData.agora_token = input.value;
	}
	
	// Handle settings update
	async function handleUpdateSettings() {
		if (onUpdateSettings) {
			await onUpdateSettings(formData.agora_token, formData.agora_channel);
		}
	}
	
	// Handle token prompt
	function handleShowTokenPrompt() {
		if (onShowTokenPrompt) {
			onShowTokenPrompt();
		}
	}
	
	// Get token status info
	function getTokenStatus() {
		if (!settings.token) return { text: 'Missing', class: 'token-missing' };
		if (settings.lastUpdated) {
			// Handle both Date objects and string/number timestamps
			let lastUpdatedTime;
			if (settings.lastUpdated instanceof Date) {
				lastUpdatedTime = settings.lastUpdated.getTime();
			} else if (typeof settings.lastUpdated === 'string') {
				lastUpdatedTime = new Date(settings.lastUpdated).getTime();
			} else if (typeof settings.lastUpdated === 'number') {
				lastUpdatedTime = settings.lastUpdated;
			} else {
				// If we can't parse it, assume token is available but warn
				return { text: 'Available', class: 'token-available' };
			}
			
			const daysSince = Math.floor((Date.now() - lastUpdatedTime) / (1000 * 60 * 60 * 24));
			if (daysSince > 1) return { text: 'May be expired', class: 'token-warning' };
		}
		return { text: 'Available', class: 'token-available' };
	}
	
	let tokenStatus = $derived(getTokenStatus());
</script>

<div class="stream-configuration">
	<div class="content-section">
		<div class="content-header">
			<h3 class="content-title">Stream Configuration</h3>
			<p class="content-description">Configure your Agora streaming settings</p>
		</div>
		<div class="content-body">
			<div class="form-field-group">
				<div class="form-field">
					<label class="form-label">App ID</label>
					<input 
						type="text" 
						class="form-input" 
						value="Loading..." 
						readonly 
						disabled
					/>
					<div class="form-help">Your Agora App ID (read-only)</div>
				</div>
				
				<div class="form-field">
					<label class="form-label" for="channelConfig">Channel</label>
					<input
						id="channelConfig"
						type="text"
						class="form-input"
						value={formData.agora_channel}
						oninput={handleChannelChange}
						placeholder="test-channel"
						disabled={isLoading}
					/>
					<div class="form-help">The channel name for your stream</div>
				</div>
				
				<div class="form-field">
					<label class="form-label" for="tokenConfig">Token</label>
					<input
						id="tokenConfig"
						type="text"
						class="form-input token-input"
						value={formData.agora_token}
						oninput={handleTokenChange}
						placeholder="Paste Agora token..."
						disabled={isLoading}
					/>
					<div class="form-help">Your Agora authentication token</div>
				</div>
				
				<div class="form-field">
					<label class="form-label">Token Status</label>
					<input
						type="text"
						class="form-input {tokenStatus.class}"
						value={tokenStatus.text}
						readonly
						disabled
					/>
					<div class="form-help">Current token validation status</div>
				</div>
				
				{#if settings.lastUpdated}
					<div class="form-field">
						<label class="form-label">Last Updated</label>
						<input
							type="text"
							class="form-input"
							value={settings.lastUpdated.toLocaleString()}
							readonly
							disabled
						/>
						<div class="form-help">When settings were last modified</div>
					</div>
				{/if}
			</div>
			
			<div class="form-actions">
				<button 
					class="btn btn-secondary" 
					onclick={handleUpdateSettings}
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="loading-spinner loading-spinner-sm"></span>
						Updating...
					{:else}
						Update Settings
					{/if}
				</button>
				<button 
					class="btn btn-primary"
					onclick={handleShowTokenPrompt}
					disabled={isLoading}
				>
					🔑 Update Token
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.stream-configuration {
		width: 100%;
	}

	.content-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.content-header {
		padding: var(--space-6);
		border-bottom: 1px solid var(--color-border-light);
		background: var(--color-surface-secondary);
	}

	.content-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-1) 0;
	}

	.content-description {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
	}

	.content-body {
		padding: var(--space-6);
	}

	/* Form field group layout */
	.form-field-group {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}

	/* Token input styling */
	.token-input {
		font-size: var(--font-size-xs);
		font-family: var(--font-mono);
	}

	/* Token status styling */
	.token-available {
		color: var(--color-success-text);
		background: var(--color-success-bg);
		border-color: var(--color-success-light);
	}

	.token-warning {
		color: var(--color-warning-text);
		background: var(--color-warning-bg);
		border-color: var(--color-warning-light);
	}

	.token-missing {
		color: var(--color-error-text);
		background: var(--color-error-bg);
		border-color: var(--color-error-light);
	}

	/* Form help text */
	.form-help {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-top: var(--space-1);
	}

	/* Form actions */
	.form-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: flex-end;
	}

	/* Loading spinner for button */
	.loading-spinner-sm {
		width: 16px;
		height: 16px;
		margin-right: var(--space-2);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.form-field-group {
			grid-template-columns: 1fr;
		}
		
		.form-actions {
			flex-direction: column;
		}
		
		.form-actions .btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>