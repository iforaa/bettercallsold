<script lang="ts">
	import type { DiscountMethod } from '$lib/types/discounts';

	interface Props {
		method: DiscountMethod;
		discountCode: string;
		onMethodChange: (method: DiscountMethod) => void;
		onCodeChange: (code: string) => void;
		onGenerateCode: () => void;
		validationError?: string;
	}

	let {
		method,
		discountCode,
		onMethodChange,
		onCodeChange,
		onGenerateCode,
		validationError
	}: Props = $props();
</script>

<div class="form-section">
	<h2>Method</h2>
	<div class="button-group">
		<button 
			class="button-group-segment {method === 'code' ? 'active' : ''}"
			onclick={() => onMethodChange('code')}
		>
			Discount code
		</button>
		<button 
			class="button-group-segment {method === 'automatic' ? 'active' : ''}"
			onclick={() => onMethodChange('automatic')}
		>
			Automatic discount
		</button>
	</div>

	{#if method === 'code'}
		<div class="form-field {validationError ? 'form-field-error' : ''}">
			<label class="form-label" for="discount-code">Discount Code</label>
			<div class="form-input-group">
				<input 
					id="discount-code"
					type="text" 
					class="form-input"
					value={discountCode}
					oninput={(e) => onCodeChange(e.target.value)}
					placeholder="Enter discount code"
				/>
				<button 
					type="button" 
					class="btn btn-secondary"
					onclick={onGenerateCode}
				>
					Generate random code
				</button>
			</div>
			{#if validationError}
				<div class="form-error">{validationError}</div>
			{/if}
			<p class="form-help">Customers must enter this code at checkout.</p>
		</div>
	{/if}
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

	.form-field {
		margin-top: var(--space-4);
	}

	/* Custom validation error state - extends design system */
	.form-field-error .form-input {
		border-color: var(--color-error);
		box-shadow: 0 0 0 2px var(--color-error-light);
	}
</style>