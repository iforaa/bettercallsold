<script lang="ts">
	import type { CustomerFormatted, AssignCreditsFormData } from '$lib/types/customers';

	interface Props {
		show: boolean;
		customer?: CustomerFormatted;
		formData: AssignCreditsFormData;
		loading?: boolean;
		onSubmit: (amount: string, description: string) => Promise<void>;
		onCancel: () => void;
		onFieldChange: (field: keyof AssignCreditsFormData, value: string) => void;
		className?: string;
	}

	let { 
		show,
		customer,
		formData,
		loading = false,
		onSubmit,
		onCancel,
		onFieldChange,
		className = ''
	}: Props = $props();

	async function handleSubmit(event: Event) {
		event.preventDefault();
		
		if (!formData.amount || !formData.description) {
			return;
		}

		await onSubmit(formData.amount, formData.description);
	}

	function handleCancel() {
		onCancel();
	}

	function handleFieldChange(field: keyof AssignCreditsFormData, value: string) {
		onFieldChange(field, value);
	}

	// Calculate preview amount
	function getPreviewAmount() {
		const amount = parseFloat(formData.amount || '0');
		return isNaN(amount) ? 0 : amount;
	}
</script>

{#if show}
	<div class="modal-overlay {className}" onclick={handleCancel}>
		<div class="modal-content modal-content-md modal-form" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div>
					<h2 class="modal-title">Assign Credits</h2>
					{#if customer}
						<p class="modal-subtitle">Add credits to {customer.name}'s account</p>
					{/if}
				</div>
				<button class="modal-close" onclick={handleCancel} disabled={loading}>×</button>
			</div>

			<form onsubmit={handleSubmit}>
				<div class="modal-body">
					<div class="modal-section">
						<h3 class="modal-section-title">Credit Details</h3>
						<p class="modal-section-description">
							Enter the amount and reason for assigning credits to this customer.
						</p>

						<div class="form-field">
							<label for="amount" class="form-label">Credit Amount *</label>
							<div class="form-input-group">
								<span class="form-input-prefix">$</span>
								<input 
									id="amount"
									type="number"
									step="0.01"
									min="0"
									class="form-input"
									placeholder="0.00"
									bind:value={formData.amount}
									oninput={(e) => handleFieldChange('amount', e.target.value)}
									disabled={loading}
									required
								/>
							</div>
							{#if formData.amount}
								<div class="form-help">
									Preview: +${getPreviewAmount().toFixed(2)} will be added to the customer's account
								</div>
							{/if}
						</div>

						<div class="form-field">
							<label for="description" class="form-label">Description/Reason *</label>
							<textarea 
								id="description"
								class="form-textarea"
								placeholder="Enter reason for assigning credits (e.g., 'Compensation for delayed order', 'Promotional credit', etc.)"
								rows="3"
								bind:value={formData.description}
								oninput={(e) => handleFieldChange('description', e.target.value)}
								disabled={loading}
								required
							></textarea>
							<div class="form-help">
								This will be visible in the customer's credit transaction history.
							</div>
						</div>
					</div>

					{#if getPreviewAmount() > 0}
						<div class="modal-section">
							<div class="preview-card">
								<div class="preview-header">
									<h4 class="preview-title">Credit Assignment Preview</h4>
								</div>
								<div class="preview-content">
									<div class="preview-row">
										<span class="preview-label">Customer:</span>
										<span class="preview-value">{customer?.name || 'Unknown'}</span>
									</div>
									<div class="preview-row">
										<span class="preview-label">Credit Amount:</span>
										<span class="preview-value preview-amount">+${getPreviewAmount().toFixed(2)}</span>
									</div>
									<div class="preview-row">
										<span class="preview-label">Transaction Type:</span>
										<span class="preview-value">Admin Grant</span>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<div class="modal-footer">
					<div class="modal-actions">
						<button 
							type="button" 
							class="btn btn-secondary" 
							onclick={handleCancel}
							disabled={loading}
						>
							Cancel
						</button>
						<button 
							type="submit" 
							class="btn btn-primary" 
							disabled={loading || !formData.amount || !formData.description}
						>
							{#if loading}
								Assigning Credits...
							{:else}
								Assign Credits
							{/if}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.form-input-group {
		position: relative;
		display: flex;
		align-items: center;
	}

	.form-input-prefix {
		position: absolute;
		left: var(--space-3);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
		pointer-events: none;
		z-index: 1;
	}

	.form-input-group .form-input {
		padding-left: var(--space-6);
	}

	.form-help {
		margin-top: var(--space-2);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		line-height: var(--line-height-relaxed);
	}

	.preview-card {
		background: var(--color-success-bg);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.preview-header {
		background: var(--color-success);
		color: white;
		padding: var(--space-3) var(--space-4);
	}

	.preview-title {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
	}

	.preview-content {
		padding: var(--space-4);
	}

	.preview-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2) 0;
		border-bottom: 1px solid rgba(0, 169, 110, 0.2);
	}

	.preview-row:last-child {
		border-bottom: none;
	}

	.preview-label {
		font-size: var(--font-size-sm);
		color: var(--color-success-text);
		font-weight: var(--font-weight-medium);
	}

	.preview-value {
		font-size: var(--font-size-sm);
		color: var(--color-success-text);
		font-weight: var(--font-weight-semibold);
	}

	.preview-amount {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-bold);
		color: var(--color-success);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.modal-content {
			max-width: 95vw;
		}

		.preview-row {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
		}

		.preview-value {
			font-weight: var(--font-weight-bold);
		}
	}
</style>