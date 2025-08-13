<script>
	import { locationsState, locationsActions } from '$lib/state/locations.svelte.js';
	import { LocationService } from '$lib/services/LocationService.js';
	import { toastService } from '$lib/services/ToastService.js';

	// Reactive values from global state
	let creating = $derived(locationsState.operationLoading.creating);
	let errors = $derived(locationsState.operationErrors.creating);

	// Form state
	let formData = $state({
		name: '',
		description: '',
		location_type: 'store',
		address_line_1: '',
		address_line_2: '',
		city: '',
		state_province: '',
		postal_code: '',
		country: 'United States',
		phone: '',
		email: '',
		status: 'active',
		is_default: false,
		is_pickup_location: true,
		is_fulfillment_center: false
	});

	let validationErrors = $state([]);

	// Get form options
	const locationTypes = [
		{ value: 'store', label: 'Store', description: 'Physical retail location' },
		{ value: 'warehouse', label: 'Warehouse', description: 'Fulfillment center' },
		{ value: 'pickup_point', label: 'Pickup Point', description: 'Customer pickup location' },
		{ value: 'office', label: 'Office', description: 'Administrative office' }
	];

	const countries = LocationService.getCountriesList();
	const usStates = LocationService.getUSStatesList();

	// Form validation
	function validateForm() {
		const validation = LocationService.validateLocation(formData);
		validationErrors = validation.errors;
		return validation.isValid;
	}

	// Handle form submission
	async function handleSubmit() {
		if (!validateForm()) {
			toastService.show('Please fix the errors below', 'error');
			return;
		}

		try {
			await locationsActions.createLocation(formData);
			toastService.show('Location created successfully!', 'success');
			handleClose();
		} catch (error) {
			toastService.show(`Error creating location: ${error.message}`, 'error');
		}
	}

	// Modal controls
	function handleClose() {
		locationsActions.hideModal();
		resetForm();
	}

	function resetForm() {
		formData = {
			name: '',
			description: '',
			location_type: 'store',
			address_line_1: '',
			address_line_2: '',
			city: '',
			state_province: '',
			postal_code: '',
			country: 'United States',
			phone: '',
			email: '',
			status: 'active',
			is_default: false,
			is_pickup_location: true,
			is_fulfillment_center: false
		};
		validationErrors = [];
	}

	// Handle backdrop click
	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	// Handle escape key
	function handleKeydown(event) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div class="modal-container">
		<div class="modal-header">
			<h2 class="modal-title">Add location</h2>
			<button class="btn-ghost btn-sm modal-close" onclick={handleClose}>×</button>
		</div>

		<div class="modal-content">
			<div class="form-layout">
				<!-- Basic Information -->
				<div class="form-section">
					<h3 class="form-section-title">Basic Information</h3>
					
					<div class="form-field">
						<label class="form-field-label" for="location-name">Location name *</label>
						<input 
							id="location-name"
							type="text"
							class="form-field-input"
							bind:value={formData.name}
							placeholder="e.g., Main Store, Downtown Location"
							required
						/>
					</div>

					<div class="form-field">
						<label class="form-field-label" for="location-type">Location type</label>
						<select 
							id="location-type"
							class="form-field-input"
							bind:value={formData.location_type}
						>
							{#each locationTypes as type}
								<option value={type.value}>{type.label} - {type.description}</option>
							{/each}
						</select>
					</div>

					<div class="form-field">
						<label class="form-field-label" for="description">Description</label>
						<textarea 
							id="description"
							class="form-field-input form-field-textarea"
							bind:value={formData.description}
							placeholder="Brief description of this location..."
							rows="3"
						></textarea>
					</div>
				</div>

				<!-- Address Information -->
				<div class="form-section">
					<h3 class="form-section-title">Address</h3>
					
					<div class="form-field">
						<label class="form-field-label" for="address-line-1">Street address *</label>
						<input 
							id="address-line-1"
							type="text"
							class="form-field-input"
							bind:value={formData.address_line_1}
							placeholder="123 Main Street"
							required
						/>
					</div>

					<div class="form-field">
						<label class="form-field-label" for="address-line-2">Apartment, suite, etc.</label>
						<input 
							id="address-line-2"
							type="text"
							class="form-field-input"
							bind:value={formData.address_line_2}
							placeholder="Suite 100"
						/>
					</div>

					<div class="form-field-grid">
						<div class="form-field">
							<label class="form-field-label" for="city">City *</label>
							<input 
								id="city"
								type="text"
								class="form-field-input"
								bind:value={formData.city}
								placeholder="New York"
								required
							/>
						</div>

						<div class="form-field">
							<label class="form-field-label" for="state-province">State/Province</label>
							{#if formData.country === 'United States'}
								<select 
									id="state-province"
									class="form-field-input"
									bind:value={formData.state_province}
								>
									<option value="">Select state</option>
									{#each usStates as state}
										<option value={state}>{state}</option>
									{/each}
								</select>
							{:else}
								<input 
									id="state-province"
									type="text"
									class="form-field-input"
									bind:value={formData.state_province}
									placeholder="State or Province"
								/>
							{/if}
						</div>
					</div>

					<div class="form-field-grid">
						<div class="form-field">
							<label class="form-field-label" for="postal-code">Postal code</label>
							<input 
								id="postal-code"
								type="text"
								class="form-field-input"
								bind:value={formData.postal_code}
								placeholder="10001"
							/>
						</div>

						<div class="form-field">
							<label class="form-field-label" for="country">Country *</label>
							<select 
								id="country"
								class="form-field-input"
								bind:value={formData.country}
								required
							>
								{#each countries as country}
									<option value={country}>{country}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<!-- Contact & Settings -->
				<div class="form-section">
					<h3 class="form-section-title">Contact & Settings</h3>
					
					<div class="form-field-grid">
						<div class="form-field">
							<label class="form-field-label" for="phone">Phone number</label>
							<input 
								id="phone"
								type="tel"
								class="form-field-input"
								bind:value={formData.phone}
								placeholder="+1 (555) 123-4567"
							/>
						</div>

						<div class="form-field">
							<label class="form-field-label" for="email">Email address</label>
							<input 
								id="email"
								type="email"
								class="form-field-input"
								bind:value={formData.email}
								placeholder="store@example.com"
							/>
						</div>
					</div>

					<div class="form-field">
						<label class="form-field-label">Location capabilities</label>
						<div class="form-field-checkboxes">
							<label class="form-field-checkbox">
								<input 
									type="checkbox"
									class="form-checkbox"
									bind:checked={formData.is_pickup_location}
								/>
								<div class="form-checkbox-content">
									<span class="form-checkbox-label">Customer pickup location</span>
									<span class="form-checkbox-help">Customers can pick up orders from this location</span>
								</div>
							</label>

							<label class="form-field-checkbox">
								<input 
									type="checkbox"
									class="form-checkbox"
									bind:checked={formData.is_fulfillment_center}
								/>
								<div class="form-checkbox-content">
									<span class="form-checkbox-label">Fulfillment center</span>
									<span class="form-checkbox-help">This location can fulfill online orders</span>
								</div>
							</label>

							<label class="form-field-checkbox">
								<input 
									type="checkbox"
									class="form-checkbox"
									bind:checked={formData.is_default}
								/>
								<div class="form-checkbox-content">
									<span class="form-checkbox-label">Set as default location</span>
									<span class="form-checkbox-help">Use this location when no other is specified</span>
								</div>
							</label>
						</div>
					</div>
				</div>

				<!-- Validation Errors -->
				{#if validationErrors.length > 0}
					<div class="alert alert-error">
						<h4 class="alert-title">Please fix the following errors:</h4>
						<ul class="alert-list">
							{#each validationErrors as error}
								<li>{error}</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- General Error -->
				{#if errors}
					<div class="alert alert-error">
						{errors}
					</div>
				{/if}
			</div>
		</div>

		<div class="modal-footer">
			<div class="modal-actions">
				<button 
					class="btn-secondary"
					onclick={handleClose}
					disabled={creating}
				>
					Cancel
				</button>
				<button 
					class="btn-primary"
					onclick={handleSubmit}
					disabled={creating || !formData.name.trim() || !formData.address_line_1.trim() || !formData.city.trim()}
				>
					{#if creating}
						<span class="loading-spinner loading-spinner-sm"></span>
					{/if}
					Create Location
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	/* Modal base styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-container {
		background: white;
		border-radius: 12px;
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
		width: 100%;
		max-width: 700px;
		max-height: 90vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #e1e1e1;
		flex-shrink: 0;
	}

	.modal-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
	}

	.modal-close {
		font-size: 1.25rem;
		width: auto;
		height: auto;
		padding: 0.25rem;
	}

	.modal-content {
		padding: 0 2rem 1.5rem 2rem;
		flex: 1;
		overflow-y: auto;
	}

	.form-layout {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-section-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #f0f0f0;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-field-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-field-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #202223;
	}

	.form-field-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #202223;
		background: white;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		box-sizing: border-box;
	}

	.form-field-input:focus {
		outline: none;
		border-color: #1a73e8;
		box-shadow: 0 0 0 2px #e1e7f5;
	}

	.form-field-textarea {
		resize: vertical;
		min-height: 80px;
	}

	.form-field-checkboxes {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-field-checkbox {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		cursor: pointer;
	}

	.form-checkbox {
		margin-top: 0.125rem;
		flex-shrink: 0;
	}

	.form-checkbox-content {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.form-checkbox-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #202223;
		line-height: 1.4;
	}

	.form-checkbox-help {
		font-size: 0.75rem;
		color: #6d7175;
		line-height: 1.4;
	}

	.alert {
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid;
	}

	.alert-error {
		background: #fef2f2;
		border-color: #fecaca;
		color: #dc2626;
	}

	.alert-title {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.alert-list {
		margin: 0;
		padding-left: 1.25rem;
	}

	.alert-list li {
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		padding: 1.5rem 2rem;
		border-top: 1px solid #e1e1e1;
		flex-shrink: 0;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.modal-backdrop {
			padding: 0.5rem;
		}

		.modal-header,
		.modal-content,
		.modal-footer {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}

		.form-field-grid {
			grid-template-columns: 1fr;
		}

		.modal-footer {
			flex-direction: column;
			gap: 1rem;
		}

		.modal-actions {
			width: 100%;
			flex-direction: column;
		}

		.modal-actions button {
			width: 100%;
		}
	}
</style>