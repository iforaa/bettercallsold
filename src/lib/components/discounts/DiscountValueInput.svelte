<script lang="ts">
	import type { DiscountValueType } from '$lib/types/discounts';

	interface Props {
		valueType: DiscountValueType;
		value: string;
		onValueTypeChange: (type: DiscountValueType) => void;
		onValueChange: (value: string) => void;
		validationError?: string;
	}

	let {
		valueType,
		value,
		onValueTypeChange,
		onValueChange,
		validationError
	}: Props = $props();
</script>

<div class="form-section">
	<h2>Discount Value</h2>
	
	<div class="form-field {validationError ? 'form-field-error' : ''}">
		<div class="form-input-group">
			<select 
				class="form-select"
				value={valueType}
				onchange={(e) => onValueTypeChange(e.target.value as DiscountValueType)}
				style="width: 150px;"
			>
				<option value="percentage">Percentage</option>
				<option value="fixed_amount">Fixed amount</option>
			</select>
			
			<div class="currency-input">
				<span class="currency-symbol">
					{valueType === 'percentage' ? '%' : '$'}
				</span>
				<input 
					type="number" 
					class="form-input"
					value={value}
					oninput={(e) => onValueChange(e.target.value)}
					placeholder={valueType === 'percentage' ? '0' : '0.00'}
					step={valueType === 'percentage' ? '1' : '0.01'}
					min="0"
					max={valueType === 'percentage' ? '100' : undefined}
				/>
			</div>
		</div>
		{#if validationError}
			<div class="form-error">{validationError}</div>
		{/if}
	</div>
</div>

<style>
	.form-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
		margin-bottom: var(--space-6);
	}

	.form-section h2 {
		margin: 0 0 var(--space-4) 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}

	/* Custom validation error state - extends design system */
	.form-field-error .form-input,
	.form-field-error .form-select {
		border-color: var(--color-error);
		box-shadow: 0 0 0 2px var(--color-error-light);
	}

	.currency-input {
		position: relative;
		flex: 1;
	}

	.currency-symbol {
		position: absolute;
		left: var(--space-3);
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-secondary);
		pointer-events: none;
		z-index: 1;
	}

	.currency-input .form-input {
		padding-left: var(--space-6);
	}
</style>