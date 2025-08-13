<script lang="ts">
	import type { LiveStreamControlsProps } from '$lib/types/live-stream';
	
	let { 
		canStart,
		canStop,
		isStarting,
		isStopping,
		formData,
		validation,
		onStartLiveSelling,
		onStopLiveSelling,
		onUpdateForm
	}: LiveStreamControlsProps = $props();
	
	// Handle form changes
	function handleNameChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (onUpdateForm) {
			onUpdateForm({ name: input.value });
		}
	}
	
	function handleDescriptionChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (onUpdateForm) {
			onUpdateForm({ description: input.value });
		}
	}
	
	// Handle control actions
	async function handleStart() {
		if (onStartLiveSelling && canStart) {
			await onStartLiveSelling();
		}
	}
	
	async function handleStop() {
		if (onStopLiveSelling && canStop) {
			await onStopLiveSelling();
		}
	}
	
	// Get form state classes
	function getFormFieldClass(hasError: boolean) {
		return hasError ? 'form-field has-error' : 'form-field';
	}
	
	// Check if specific field has error
	function hasFieldError(fieldName: string) {
		return validation.errors.some(error => 
			error.toLowerCase().includes(fieldName.toLowerCase())
		);
	}
</script>

<div class="live-stream-controls">
	<div class="content-section">
		<div class="content-header">
			<h3 class="content-title">Live Selling Controls</h3>
			<p class="content-description">Start and manage your live selling session</p>
		</div>
		
		<div class="content-body">
			
			<!-- Validation Errors -->
			{#if !validation.valid && validation.errors.length > 0}
				<div class="validation-errors">
					<div class="alert-banner alert-banner-error">
						<div class="alert-banner-content">
							<span class="alert-banner-icon">⚠</span>
							<div>
								<strong>Please fix the following issues:</strong>
								<ul class="error-list">
									{#each validation.errors as error}
										<li>{error}</li>
									{/each}
								</ul>
							</div>
						</div>
					</div>
				</div>
			{/if}
			
			<!-- Control Buttons -->
			<div class="control-actions">
				{#if canStop}
					<!-- Stop Live Selling -->
					<button 
						class="btn btn-error btn-lg" 
						onclick={handleStop}
						disabled={isStopping}
					>
						{#if isStopping}
							<span class="loading-spinner loading-spinner-sm"></span>
							Stopping Live Selling...
						{:else}
							🛑 Stop Live Selling
						{/if}
					</button>
				{:else if canStart}
					<!-- Start Live Selling -->
					<button 
						class="btn btn-success btn-lg" 
						onclick={handleStart}
						disabled={isStarting || !validation.valid}
					>
						{#if isStarting}
							<span class="loading-spinner loading-spinner-sm"></span>
							Starting Live Selling...
						{:else}
							🚀 Start Live Selling
						{/if}
					</button>
				{:else}
					<!-- Disabled state -->
					<button class="btn btn-secondary btn-lg" disabled>
						📡 Connect to Stream First
					</button>
				{/if}
			</div>
			
			<!-- Connection Requirements -->
			{#if !canStart && !canStop}
				<div class="requirements-notice">
					<div class="notice notice-info">
						<div class="notice-icon">ℹ️</div>
						<div class="notice-content">
							<h4 class="notice-title">Connection Required</h4>
							<p class="notice-message">
								You need to be connected to an Agora channel before starting live selling. 
								Please check your token and connection status above.
							</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.live-stream-controls {
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

	/* Form sections */
	.form-section {
		margin-bottom: var(--space-6);
	}

	.form-section-title {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-4) 0;
	}

	.form-field-group {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
	}

	/* Form field error state */
	.form-field.has-error .form-input {
		border-color: var(--color-error);
		background: var(--color-error-bg);
	}

	.form-error {
		font-size: var(--font-size-xs);
		color: var(--color-error);
		margin-top: var(--space-1);
	}

	/* Validation errors */
	.validation-errors {
		margin-bottom: var(--space-6);
	}

	.error-list {
		margin: var(--space-2) 0 0 var(--space-4);
		padding: 0;
	}

	.error-list li {
		margin-bottom: var(--space-1);
	}

	/* Control actions */
	.control-actions {
		display: flex;
		justify-content: center;
		margin-bottom: var(--space-6);
	}

	.btn-lg {
		padding: var(--space-4) var(--space-6);
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		min-width: 200px;
	}

	/* Loading spinner for buttons */
	.loading-spinner-sm {
		width: 16px;
		height: 16px;
		margin-right: var(--space-2);
	}

	/* Requirements notice */
	.requirements-notice {
		margin-top: var(--space-4);
	}

	.notice {
		display: flex;
		padding: var(--space-4);
		border-radius: var(--radius-md);
		border-left: 4px solid;
	}

	.notice-info {
		background: var(--color-info-bg);
		border-left-color: var(--color-info);
		color: var(--color-info-text);
	}

	.notice-icon {
		margin-right: var(--space-3);
		font-size: var(--font-size-lg);
		flex-shrink: 0;
	}

	.notice-content {
		flex: 1;
	}

	.notice-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		margin: 0 0 var(--space-1) 0;
	}

	.notice-message {
		font-size: var(--font-size-sm);
		margin: 0;
		opacity: 0.9;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.form-field-group {
			grid-template-columns: 1fr;
		}
		
		.control-actions {
			flex-direction: column;
			align-items: stretch;
		}
		
		.btn-lg {
			min-width: auto;
			width: 100%;
		}
	}
</style>