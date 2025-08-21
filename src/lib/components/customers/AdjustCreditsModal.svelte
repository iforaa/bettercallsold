<script lang="ts">
	import type { CustomerFormatted, CustomerCreditBalance, AdjustCreditsFormData } from '$lib/types/customers';

	interface Props {
		show: boolean;
		customer?: CustomerFormatted;
		creditBalance?: CustomerCreditBalance;
		formData: AdjustCreditsFormData;
		loading?: boolean;
		onSubmit: (amount: string, description: string, type: 'add' | 'deduct') => Promise<void>;
		onCancel: () => void;
		onFieldChange: (field: keyof AdjustCreditsFormData, value: string) => void;
		className?: string;
	}

	let { 
		show,
		customer,
		creditBalance,
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

		await onSubmit(formData.amount, formData.description, formData.type);
	}

	function handleCancel() {
		onCancel();
	}

	function handleFieldChange(field: keyof AdjustCreditsFormData, value: string) {
		onFieldChange(field, value);
	}

	function handleTypeChange(type: 'add' | 'deduct') {
		handleFieldChange('type', type);
	}

	// Calculate preview amounts
	function getAdjustmentAmount() {
		const amount = parseFloat(formData.amount || '0');
		return isNaN(amount) ? 0 : amount;
	}

	function getCurrentBalance() {
		return creditBalance?.balance || 0;
	}

	function getNewBalance() {
		const current = getCurrentBalance();
		const adjustment = getAdjustmentAmount();
		
		if (formData.type === 'add') {
			return current + adjustment;
		} else {
			return current - adjustment;
		}
	}

	function hasInsufficientFunds() {
		return formData.type === 'deduct' && getNewBalance() < 0;
	}

	function formatCurrency(amount: number) {
		return `$${amount.toFixed(2)}`;
	}
</script>

{#if show}
	<div class="modal-overlay {className}" onclick={handleCancel}>
		<div class="modal-content modal-content-md modal-form" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div>
					<h2 class="modal-title">Adjust Credit Balance</h2>
					{#if customer}
						<p class="modal-subtitle">Modify {customer.name}'s credit balance</p>
					{/if}
				</div>
				<button class="modal-close" onclick={handleCancel} disabled={loading}>×</button>
			</div>

			<form onsubmit={handleSubmit}>
				<div class="modal-body">
					<!-- Current Balance Display -->
					<div class="modal-section">
						<div class="balance-display">
							<div class="balance-label">Current Credit Balance</div>
							<div class="balance-amount">{formatCurrency(getCurrentBalance())}</div>
						</div>
					</div>

					<div class="modal-section">
						<h3 class="modal-section-title">Adjustment Details</h3>

						<!-- Adjustment Type -->
						<div class="form-field">
							<label class="form-label">Adjustment Type *</label>
							<div class="adjustment-type-selector">
								<button 
									type="button"
									class="adjustment-type-btn {formData.type === 'add' ? 'active add' : ''}"
									onclick={() => handleTypeChange('add')}
									disabled={loading}
								>
									<span class="adjustment-icon">+</span>
									Add Credits
								</button>
								<button 
									type="button"
									class="adjustment-type-btn {formData.type === 'deduct' ? 'active deduct' : ''}"
									onclick={() => handleTypeChange('deduct')}
									disabled={loading}
								>
									<span class="adjustment-icon">−</span>
									Deduct Credits
								</button>
							</div>
						</div>

						<div class="form-field">
							<label for="amount" class="form-label">
								{formData.type === 'add' ? 'Amount to Add' : 'Amount to Deduct'} *
							</label>
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
							{#if hasInsufficientFunds()}
								<div class="form-error">
									Warning: This would result in a negative balance ({formatCurrency(getNewBalance())})
								</div>
							{/if}
						</div>

						<div class="form-field">
							<label for="description" class="form-label">Description/Reason *</label>
							<textarea 
								id="description"
								class="form-textarea"
								placeholder="Enter reason for adjustment (e.g., 'Correction for billing error', 'Manager override', etc.)"
								rows="3"
								bind:value={formData.description}
								oninput={(e) => handleFieldChange('description', e.target.value)}
								disabled={loading}
								required
							></textarea>
						</div>
					</div>

					{#if getAdjustmentAmount() > 0}
						<div class="modal-section">
							<div class="preview-card {formData.type === 'add' ? 'preview-add' : 'preview-deduct'} {hasInsufficientFunds() ? 'preview-warning' : ''}">
								<div class="preview-header">
									<h4 class="preview-title">Balance Adjustment Preview</h4>
								</div>
								<div class="preview-content">
									<div class="preview-row">
										<span class="preview-label">Current Balance:</span>
										<span class="preview-value">{formatCurrency(getCurrentBalance())}</span>
									</div>
									<div class="preview-row">
										<span class="preview-label">Adjustment:</span>
										<span class="preview-value preview-adjustment">
											{formData.type === 'add' ? '+' : '−'}{formatCurrency(getAdjustmentAmount())}
										</span>
									</div>
									<div class="preview-row preview-total">
										<span class="preview-label">New Balance:</span>
										<span class="preview-value preview-new-balance {getNewBalance() < 0 ? 'negative' : ''}">
											{formatCurrency(getNewBalance())}
										</span>
									</div>
								</div>
								{#if hasInsufficientFunds()}
									<div class="preview-warning-message">
										⚠️ This adjustment will result in a negative balance. Proceed with caution.
									</div>
								{/if}
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
							class="btn {formData.type === 'add' ? 'btn-primary' : 'btn-warning'}" 
							disabled={loading || !formData.amount || !formData.description}
						>
							{#if loading}
								Adjusting Balance...
							{:else}
								{formData.type === 'add' ? 'Add Credits' : 'Deduct Credits'}
							{/if}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.balance-display {
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		text-align: center;
	}

	.balance-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin-bottom: var(--space-2);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: var(--font-weight-medium);
	}

	.balance-amount {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
	}

	.adjustment-type-selector {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.adjustment-type-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-4);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.adjustment-type-btn:hover {
		border-color: var(--color-border-dark);
		background: var(--color-surface-hover);
	}

	.adjustment-type-btn.active {
		font-weight: var(--font-weight-semibold);
		color: white;
	}

	.adjustment-type-btn.active.add {
		background: var(--color-success);
		border-color: var(--color-success);
	}

	.adjustment-type-btn.active.deduct {
		background: var(--color-warning);
		border-color: var(--color-warning);
	}

	.adjustment-icon {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.2);
	}

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

	.form-error {
		margin-top: var(--space-2);
		font-size: var(--font-size-xs);
		color: var(--color-error-text);
		line-height: var(--line-height-relaxed);
		font-weight: var(--font-weight-medium);
	}

	.preview-card {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.preview-card.preview-add {
		background: var(--color-success-bg);
		border-color: var(--color-success);
	}

	.preview-card.preview-deduct {
		background: var(--color-warning-bg);
		border-color: var(--color-warning);
	}

	.preview-card.preview-warning {
		background: var(--color-error-bg);
		border-color: var(--color-error);
	}

	.preview-header {
		padding: var(--space-3) var(--space-4);
		color: white;
	}

	.preview-card.preview-add .preview-header {
		background: var(--color-success);
	}

	.preview-card.preview-deduct .preview-header {
		background: var(--color-warning);
	}

	.preview-card.preview-warning .preview-header {
		background: var(--color-error);
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
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.preview-row:last-child {
		border-bottom: none;
	}

	.preview-total {
		border-top: 1px solid rgba(0, 0, 0, 0.2);
		margin-top: var(--space-2);
		padding-top: var(--space-3);
		font-weight: var(--font-weight-bold);
	}

	.preview-label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}

	.preview-value {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
	}

	.preview-new-balance.negative {
		color: var(--color-error);
		font-weight: var(--font-weight-bold);
	}

	.preview-warning-message {
		background: rgba(0, 0, 0, 0.1);
		padding: var(--space-3) var(--space-4);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-align: center;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.modal-content {
			max-width: 95vw;
		}

		.adjustment-type-selector {
			grid-template-columns: 1fr;
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