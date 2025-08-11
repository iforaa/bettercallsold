<script lang="ts">
	import type { AppColors } from '$lib/types/mobile-app';
	
	let { 
		colors = {},
		messages = {},
		onUpdateColors,
		onUpdateMessages 
	} = $props();
	
	// Handle color changes
	function handleColorChange(colorKey: keyof AppColors, value: string) {
		if (onUpdateColors) {
			onUpdateColors({ [colorKey]: value });
		}
	}
	
	// Handle message changes
	function handleMessageChange(messageKey: string, value: string) {
		if (onUpdateMessages) {
			onUpdateMessages({ [messageKey]: value });
		}
	}
</script>

<div class="color-config-panel">
	<div class="color-inputs">
		<h4 class="content-subtitle">Custom Colors</h4>
		<div class="color-grid">
			<div class="form-field">
				<label class="form-label" for="primaryColor">Primary Color</label>
				<div class="color-input-wrapper">
					<input
						id="primaryColor"
						type="color"
						value={colors.primary}
						onchange={(e) => handleColorChange('primary', e.target.value)}
						class="color-picker"
					/>
					<input
						type="text"
						value={colors.primary}
						onchange={(e) => handleColorChange('primary', e.target.value)}
						class="form-input color-text"
						placeholder="#FF69B4"
					/>
				</div>
			</div>

			<div class="form-field">
				<label class="form-label" for="secondaryColor">Secondary Color</label>
				<div class="color-input-wrapper">
					<input
						id="secondaryColor"
						type="color"
						value={colors.secondary}
						onchange={(e) => handleColorChange('secondary', e.target.value)}
						class="color-picker"
					/>
					<input
						type="text"
						value={colors.secondary}
						onchange={(e) => handleColorChange('secondary', e.target.value)}
						class="form-input color-text"
						placeholder="#FF1493"
					/>
				</div>
			</div>

			<div class="form-field">
				<label class="form-label" for="accentColor">Accent Color</label>
				<div class="color-input-wrapper">
					<input
						id="accentColor"
						type="color"
						value={colors.accent}
						onchange={(e) => handleColorChange('accent', e.target.value)}
						class="color-picker"
					/>
					<input
						type="text"
						value={colors.accent}
						onchange={(e) => handleColorChange('accent', e.target.value)}
						class="form-input color-text"
						placeholder="#FFB6C1"
					/>
				</div>
			</div>

			<div class="form-field">
				<label class="form-label" for="backgroundColor">Background Color</label>
				<div class="color-input-wrapper">
					<input
						id="backgroundColor"
						type="color"
						value={colors.background}
						onchange={(e) => handleColorChange('background', e.target.value)}
						class="color-picker"
					/>
					<input
						type="text"
						value={colors.background}
						onchange={(e) => handleColorChange('background', e.target.value)}
						class="form-input color-text"
						placeholder="#FFFFFF"
					/>
				</div>
			</div>

			<div class="form-field">
				<label class="form-label" for="textColor">Text Color</label>
				<div class="color-input-wrapper">
					<input
						id="textColor"
						type="color"
						value={colors.text}
						onchange={(e) => handleColorChange('text', e.target.value)}
						class="color-picker"
					/>
					<input
						type="text"
						value={colors.text}
						onchange={(e) => handleColorChange('text', e.target.value)}
						class="form-input color-text"
						placeholder="#000000"
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- Live Preview -->
	<div class="color-preview">
		<h4 class="content-subtitle">Preview</h4>
		<div
			class="message-preview"
			style="background-color: {colors.primary}"
		>
			<div
				class="preview-line1"
				style="color: {colors.background}"
			>
				{messages.promoLine1 || 'Promo Message Line 1'}
			</div>
			<div
				class="preview-line2"
				style="color: {colors.background}"
			>
				{messages.promoLine2 || 'Promo Message Line 2'}
			</div>
		</div>
	</div>
</div>

<style>
	.color-config-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}
	
	.content-subtitle {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--space-4);
	}

	/* Color grid */
	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
	}

	/* Color input wrapper styling */
	.color-input-wrapper {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.color-picker {
		width: 48px;
		height: 36px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		background: var(--color-surface);
		transition: border-color var(--transition-fast);
	}

	.color-picker:hover {
		border-color: var(--color-border-hover);
	}

	.color-text {
		flex: 1;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
	}

	/* Message preview styling */
	.color-preview {
		margin-top: var(--space-4);
	}

	.message-preview {
		padding: var(--space-4);
		border-radius: var(--radius-lg);
		text-align: center;
		min-height: 80px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--space-2);
	}

	.preview-line1,
	.preview-line2 {
		font-weight: var(--font-weight-semibold);
		font-size: var(--font-size-sm);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.color-grid {
			grid-template-columns: 1fr;
		}
	}
</style>