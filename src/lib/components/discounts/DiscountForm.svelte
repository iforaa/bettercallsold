<script lang="ts">
	import DiscountMethodSelector from './DiscountMethodSelector.svelte';
	import DiscountValueInput from './DiscountValueInput.svelte';
	import DiscountPreview from './DiscountPreview.svelte';
	import type { DiscountFormData } from '$lib/types/discounts';

	interface Props {
		formData: DiscountFormData;
		validationErrors?: Record<string, string>;
		onSubmit: (data: DiscountFormData) => void;
		onFormChange: (data: Partial<DiscountFormData>) => void;
		mode: 'create' | 'edit';
		loading?: boolean;
		usageCount?: number;
		showSaveButton?: boolean;
	}

	let {
		formData,
		validationErrors = {},
		onSubmit,
		onFormChange,
		mode,
		loading = false,
		usageCount,
		showSaveButton = false
	}: Props = $props();

	function updateField(field: keyof DiscountFormData, value: any) {
		onFormChange({ [field]: value });
	}

	function handleMethodChange(newMethod: 'code' | 'automatic') {
		updateField('method', newMethod);
	}

	function handleCodeChange(code: string) {
		updateField('discount_code', code);
	}

	function handleGenerateCode() {
		// This will be handled by parent component
		// For now, just clear the code to trigger generation
		updateField('discount_code', '');
	}

	function handleValueTypeChange(valueType: 'percentage' | 'fixed_amount') {
		updateField('value_type', valueType);
	}

	function handleValueChange(value: string) {
		updateField('value', value);
	}

	function handleSubmit() {
		onSubmit(formData);
	}
</script>

<div class="form-layout">
	<!-- Main form content -->
	<div class="form-main">
		<!-- Title -->
		<div class="form-section">
			<h2>Title</h2>
			<div class="form-group">
				<input 
					id="discount-title"
					type="text" 
					class="form-input {validationErrors.title ? 'error' : ''}"
					bind:value={formData.title}
					placeholder="Enter discount title"
				/>
				{#if validationErrors.title}
					<p class="field-error">{validationErrors.title}</p>
				{/if}
			</div>
		</div>

		<!-- Method selection -->
		<DiscountMethodSelector 
			method={formData.method}
			discountCode={formData.discount_code}
			onMethodChange={handleMethodChange}
			onCodeChange={handleCodeChange}
			onGenerateCode={handleGenerateCode}
			validationError={validationErrors.discount_code}
		/>

		<!-- Discount value -->
		<DiscountValueInput 
			valueType={formData.value_type}
			value={formData.value}
			onValueTypeChange={handleValueTypeChange}
			onValueChange={handleValueChange}
			validationError={validationErrors.value}
		/>

		<!-- Purchase type -->
		<div class="form-section">
			<h2>Purchase type</h2>
			<div class="form-radio">
				<input 
					type="radio" 
					id="purchase-onetime"
					bind:group={formData.applies_to_one_time}
					value={true}
					checked
				/>
				<label class="form-radio-label" for="purchase-onetime">
					One-time purchase
				</label>
			</div>
		</div>

		<!-- Customer eligibility -->
		<div class="form-section">
			<h2>Eligibility</h2>
			<p class="section-description">Available on all sales channels</p>
			
			<div class="form-radio">
				<input 
					type="radio" 
					id="eligibility-all"
					bind:group={formData.customer_eligibility}
					value="all"
				/>
				<label class="form-radio-label" for="eligibility-all">
					All customers
				</label>
			</div>
			
			<div class="form-radio">
				<input 
					type="radio" 
					id="eligibility-segments"
					bind:group={formData.customer_eligibility}
					value="specific_segments"
					disabled
				/>
				<label class="form-radio-label" for="eligibility-segments">
					Specific customer segments
					<span class="badge badge-warning badge-sm">Coming soon</span>
				</label>
			</div>
			
			<div class="form-radio">
				<input 
					type="radio" 
					id="eligibility-customers"
					bind:group={formData.customer_eligibility}
					value="specific_customers"
					disabled
				/>
				<label class="form-radio-label" for="eligibility-customers">
					Specific customers
					<span class="badge badge-warning badge-sm">Coming soon</span>
				</label>
			</div>
		</div>

		<!-- Minimum purchase requirements -->
		<div class="form-section">
			<h2>Minimum purchase requirements</h2>
			
			<div class="minimum-requirements">
				<label class="radio-label">
					<input 
						type="radio" 
						bind:group={formData.minimum_requirement_type}
						value="none"
					/>
					No minimum requirements
				</label>
				
				<label class="radio-label">
					<input 
						type="radio" 
						bind:group={formData.minimum_requirement_type}
						value="minimum_amount"
					/>
					Minimum purchase amount ($)
				</label>
				{#if formData.minimum_requirement_type === 'minimum_amount'}
					<div class="nested-input">
						<input 
							type="number" 
							class="form-input {validationErrors.minimum_amount ? 'error' : ''}"
							bind:value={formData.minimum_amount}
							placeholder="0.00"
							step="0.01"
							min="0"
						/>
						{#if validationErrors.minimum_amount}
							<p class="field-error">{validationErrors.minimum_amount}</p>
						{/if}
					</div>
				{/if}
				
				<label class="radio-label">
					<input 
						type="radio" 
						bind:group={formData.minimum_requirement_type}
						value="minimum_quantity"
					/>
					Minimum quantity of items
				</label>
				{#if formData.minimum_requirement_type === 'minimum_quantity'}
					<div class="nested-input">
						<input 
							type="number" 
							class="form-input {validationErrors.minimum_quantity ? 'error' : ''}"
							bind:value={formData.minimum_quantity}
							placeholder="0"
							min="0"
						/>
						{#if validationErrors.minimum_quantity}
							<p class="field-error">{validationErrors.minimum_quantity}</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Maximum discount uses -->
		<div class="form-section">
			<h2>Maximum discount uses</h2>
			
			<div class="usage-limits">
				<label class="checkbox-label">
					<input 
						type="checkbox" 
						bind:checked={formData.usage_limit}
					/>
					Limit number of times this discount can be used in total
				</label>
				{#if formData.usage_limit}
					<div class="nested-input">
						<input 
							type="number" 
							class="form-input"
							bind:value={formData.usage_limit}
							placeholder="0"
							min="1"
						/>
					</div>
				{/if}

				<label class="checkbox-label">
					<input 
						type="checkbox" 
						bind:checked={formData.usage_limit_per_customer}
					/>
					Limit to one use per customer
				</label>
				{#if formData.usage_limit_per_customer}
					<div class="nested-input">
						<input 
							type="number" 
							class="form-input"
							bind:value={formData.usage_limit_per_customer}
							placeholder="1"
							min="1"
						/>
					</div>
				{/if}
			</div>
		</div>

		<!-- Combinations -->
		<div class="form-section">
			<h2>Combinations</h2>
			
			<div class="combinations">
				<label class="checkbox-label">
					<input 
						type="checkbox" 
						bind:checked={formData.can_combine_with_product_discounts}
					/>
					Product discounts
				</label>

				<label class="checkbox-label">
					<input 
						type="checkbox" 
						bind:checked={formData.can_combine_with_order_discounts}
					/>
					Order discounts
				</label>

				<label class="checkbox-label">
					<input 
						type="checkbox" 
						bind:checked={formData.can_combine_with_shipping_discounts}
					/>
					Shipping discounts
				</label>
			</div>
		</div>

		<!-- Active dates -->
		<div class="form-section">
			<h2>Active dates</h2>
			
			<div class="date-inputs">
				<div class="date-group">
					<div class="date-field">
						<label class="form-label" for="start-date">
							Start date
							{#if validationErrors.starts_at}
								<span class="field-error">({validationErrors.starts_at})</span>
							{/if}
						</label>
						<input 
							id="start-date"
							type="date" 
							class="form-input {validationErrors.starts_at ? 'error' : ''}"
							bind:value={formData.starts_at}
						/>
					</div>
					
					<div class="time-field">
						<label class="form-label" for="start-time">
							Start time (EDT)
							{#if validationErrors.start_time}
								<span class="field-error">({validationErrors.start_time})</span>
							{/if}
						</label>
						<input 
							id="start-time"
							type="time" 
							class="form-input {validationErrors.start_time ? 'error' : ''}"
							bind:value={formData.start_time}
						/>
					</div>
				</div>

				<label class="checkbox-label">
					<input 
						type="checkbox" 
						bind:checked={formData.set_end_date}
					/>
					Set end date
				</label>

				{#if formData.set_end_date}
					<div class="date-group">
						<div class="date-field">
							<label class="form-label" for="end-date">End date</label>
							<input 
								id="end-date"
								type="date" 
								class="form-input"
								bind:value={formData.ends_at}
							/>
						</div>
						
						<div class="time-field">
							<label class="form-label" for="end-time">End time (EDT)</label>
							<input 
								id="end-time"
								type="time" 
								class="form-input"
								bind:value={formData.end_time}
							/>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Sidebar -->
	<div class="form-sidebar">
		<DiscountPreview 
			discount={formData} 
			usageCount={usageCount}
		/>

		<!-- Save actions -->
		{#if showSaveButton}
			<div class="save-actions">
				<button 
					class="btn btn-primary btn-lg {loading ? 'btn-loading' : ''}" 
					onclick={handleSubmit}
					disabled={loading}
				>
					{loading ? 'Saving...' : (mode === 'create' ? 'Save discount' : 'Update discount')}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Layout */
	.form-layout {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: var(--space-6);
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-4);
	}

	.form-main {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.form-sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
	}

	.form-section h2 {
		margin: 0 0 var(--space-4) 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}

	.section-description {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-4);
	}

	/* Radio and checkbox labels */
	.radio-label,
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		cursor: pointer;
		font-size: var(--font-size-sm);
	}

	.radio-label:last-child,
	.checkbox-label:last-child {
		margin-bottom: 0;
	}

	/* Nested inputs */
	.nested-input {
		margin-left: var(--space-5);
		margin-top: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.nested-input .form-input {
		max-width: 200px;
	}

	/* Date inputs */
	.date-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.date-field,
	.time-field {
		display: flex;
		flex-direction: column;
	}

	/* Save actions */
	.save-actions {
		position: sticky;
		bottom: var(--space-4);
	}

	.btn-lg {
		padding: var(--space-3) var(--space-4);
		font-size: var(--font-size-base);
		width: 100%;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.form-layout {
			grid-template-columns: 1fr;
			gap: var(--space-4);
		}

		.form-sidebar {
			order: -1;
		}

		.save-actions {
			position: static;
		}
	}

	@media (max-width: 768px) {
		.form-layout {
			padding: var(--space-2);
		}

		.date-group {
			grid-template-columns: 1fr;
		}
	}
</style>