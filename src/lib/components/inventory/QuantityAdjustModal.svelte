<script lang="ts">
	import { inventoryActions, getAdjustmentModalData } from '$lib/state/inventory.svelte.js';
	import { ToastService } from '$lib/services/ToastService.js';
	import type { AdjustmentReason } from '$lib/types/inventory';

	// Reactive modal data from global state
	let modalData = $derived(getAdjustmentModalData());

	// Computed values
	let isVisible = $derived(modalData.showAdjustModal && modalData.adjustingItem);
	let isLoading = $derived(modalData.isLoading);
	let hasErrors = $derived(modalData.hasErrors);
	let errorMessage = $derived(modalData.errorMessage);

	// Local reactive values for form inputs
	let adjustBy = $derived(modalData.adjustBy);
	let newQuantity = $derived(modalData.newQuantity);
	let adjustReason = $derived(modalData.adjustReason);

	// Available adjustment reasons
	const adjustmentReasons: AdjustmentReason[] = [
		'Correction (default)',
		'Cycle count',
		'Damaged',
		'Quality control',
		'Received',
		'Sold',
		'Other'
	];

	// Handle adjust by input change
	function handleAdjustByChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = parseInt(input.value) || 0;
		inventoryActions.updateAdjustBy(value);
	}

	// Handle new quantity input change
	function handleNewQuantityChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = parseInt(input.value) || 0;
		inventoryActions.updateNewQuantity(value);
	}

	// Handle reason change
	function handleReasonChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		modalData.adjustReason = select.value as AdjustmentReason;
	}

	// Handle save
	async function handleSave() {
		try {
			await inventoryActions.saveAdjustment();
			ToastService.show('Quantity updated successfully!', 'success');
		} catch (error) {
			ToastService.show('Error updating quantity: ' + error.message, 'error');
		}
	}

	// Handle cancel
	function handleCancel() {
		inventoryActions.closeAdjustModal();
	}

	// Handle overlay click
	function handleOverlayClick(event: Event) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
</script>

{#if isVisible}
	<div class="modal-overlay" onclick={handleOverlayClick}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3 class="modal-title">
					Adjust {modalData.adjustingItem?.field === 'available' ? 'Available' : 'On hand'}
				</h3>
				<button class="modal-close" onclick={handleCancel}>×</button>
			</div>
			
			<div class="modal-body">
				{#if modalData.adjustingItem}
					<div class="adjustment-item-info">
						<div class="item-title">{modalData.adjustingItem.formattedTitle}</div>
						<div class="item-subtitle">
							Current: {modalData.adjustingItem.field === 'available' 
								? modalData.adjustingItem.availableCount 
								: modalData.adjustingItem.onHandCount}
						</div>
					</div>
				{/if}

				{#if hasErrors}
					<div class="notice notice-error">
						<div class="notice-icon">⚠</div>
						<div class="notice-content">
							<p class="notice-message">{errorMessage}</p>
						</div>
					</div>
				{/if}

				<div class="form-field-group">
					<div class="form-field">
						<label class="form-label" for="adjust-by">Adjust by</label>
						<input 
							id="adjust-by"
							type="number" 
							class="form-input"
							value={adjustBy}
							oninput={handleAdjustByChange}
							placeholder="0"
							disabled={isLoading}
						/>
						<div class="form-help">
							Use positive numbers to increase, negative to decrease
						</div>
					</div>
					
					<div class="form-field">
						<label class="form-label" for="new-quantity">New quantity</label>
						<input 
							id="new-quantity"
							type="number" 
							class="form-input"
							value={newQuantity}
							oninput={handleNewQuantityChange}
							placeholder="0"
							min="0"
							disabled={isLoading}
						/>
					</div>
				</div>
				
				<div class="form-field">
					<label class="form-label" for="adjust-reason">Reason</label>
					<select 
						id="adjust-reason"
						class="form-select" 
						value={adjustReason}
						onchange={handleReasonChange}
						disabled={isLoading}
					>
						{#each adjustmentReasons as reason}
							<option value={reason}>{reason}</option>
						{/each}
					</select>
				</div>
			</div>
			
			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={handleCancel} disabled={isLoading}>
					Cancel
				</button>
				<button class="btn btn-primary" onclick={handleSave} disabled={isLoading}>
					{#if isLoading}
						<span class="loading-spinner loading-spinner-sm"></span>
					{/if}
					{isLoading ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.adjustment-item-info {
		background: var(--color-surface-secondary);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
		padding: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.item-title {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--space-1);
	}

	.item-subtitle {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.form-help {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-top: var(--space-1);
	}

	.loading-spinner-sm {
		width: 16px;
		height: 16px;
		margin-right: var(--space-2);
	}
</style>