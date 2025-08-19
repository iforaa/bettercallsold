<script>
	import { locationsState, locationsActions } from '$lib/state/locations.svelte.js';
	import { LocationService } from '$lib/services/LocationService.js';
	import { toastService } from '$lib/services/ToastService.js';

	// Reactive values from global state
	let creating = $derived(locationsState.operationLoading.creating);
	let updating = $derived(locationsState.operationLoading.updating);
	let errors = $derived(locationsState.operationErrors.creating || locationsState.operationErrors.updating);
	let isEditing = $derived(locationsState.form.isEditing);
	let editingId = $derived(locationsState.form.editingId);

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

	// Get current location for editing
	let currentLocation = $derived(
		isEditing && editingId 
			? locationsState.locations?.find(loc => loc.id === editingId)
			: null
	);

	// Effect to populate form when editing a location
	$effect(() => {
		if (isEditing && currentLocation) {
			// Populate form with existing location data
			formData.name = currentLocation.name || '';
			formData.description = currentLocation.description || '';
			formData.location_type = currentLocation.location_type || 'store';
			formData.address_line_1 = currentLocation.address_line_1 || '';
			formData.address_line_2 = currentLocation.address_line_2 || '';
			formData.city = currentLocation.city || '';
			formData.state_province = currentLocation.state_province || '';
			formData.postal_code = currentLocation.postal_code || '';
			formData.country = currentLocation.country || 'United States';
			formData.phone = currentLocation.phone || '';
			formData.email = currentLocation.email || '';
			formData.status = currentLocation.status || 'active';
			formData.is_default = currentLocation.is_default || false;
			formData.is_pickup_location = currentLocation.is_pickup_location || false;
			formData.is_fulfillment_center = currentLocation.is_fulfillment_center || false;
		} else if (!isEditing) {
			// Reset form for adding new location
			resetForm();
		}
	});

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
			if (isEditing && editingId) {
				await locationsActions.updateLocation(editingId, formData);
				toastService.show('Location updated successfully!', 'success');
			} else {
				await locationsActions.createLocation(formData);
				toastService.show('Location created successfully!', 'success');
			}
			handleClose();
		} catch (error) {
			const action = isEditing ? 'updating' : 'creating';
			toastService.show(`Error ${action} location: ${error.message}`, 'error');
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

<div class="modal-overlay" onclick={handleBackdropClick}>
	<div class="modal-content modal-content-lg modal-form" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h3 class="modal-title">{isEditing ? 'Edit Location' : 'Add Location'}</h3>
			<button class="modal-close" onclick={handleClose}>×</button>
		</div>

		<div class="modal-body">
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<!-- Basic Information -->
				<div class="form-section">
					<h4 class="form-section-title">Basic Information</h4>
					
					<div class="form-field">
						<label class="form-label form-label-required" for="location-name">Location name</label>
						<input 
							id="location-name"
							type="text"
							class="form-input"
							bind:value={formData.name}
							placeholder="e.g., Main Store, Downtown Location"
							required
						/>
					</div>

					<div class="form-field-group">
						<div class="form-field">
							<label class="form-label" for="location-type">Location type</label>
							<select 
								id="location-type"
								class="form-select"
								bind:value={formData.location_type}
							>
								{#each locationTypes as type}
									<option value={type.value}>{type.label} - {type.description}</option>
								{/each}
							</select>
						</div>
						
						<div class="form-field">
							<label class="form-label" for="description">Description</label>
							<textarea 
								id="description"
								class="form-textarea form-textarea-sm"
								bind:value={formData.description}
								placeholder="Brief description..."
							></textarea>
						</div>
					</div>
				</div>

				<!-- Address Information -->
				<div class="form-section">
					<h4 class="form-section-title">Address</h4>
					
					<div class="form-field">
						<label class="form-label form-label-required" for="address-line-1">Street address</label>
						<input 
							id="address-line-1"
							type="text"
							class="form-input"
							bind:value={formData.address_line_1}
							placeholder="123 Main Street"
							required
						/>
					</div>

					<div class="form-field">
						<label class="form-label" for="address-line-2">Apartment, suite, etc.</label>
						<input 
							id="address-line-2"
							type="text"
							class="form-input"
							bind:value={formData.address_line_2}
							placeholder="Suite 100"
						/>
					</div>

					<div class="form-field-group">
						<div class="form-field">
							<label class="form-label form-label-required" for="city">City</label>
							<input 
								id="city"
								type="text"
								class="form-input"
								bind:value={formData.city}
								placeholder="New York"
								required
							/>
						</div>

						<div class="form-field">
							<label class="form-label" for="state-province">State/Province</label>
							{#if formData.country === 'United States'}
								<select 
									id="state-province"
									class="form-select"
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
									class="form-input"
									bind:value={formData.state_province}
									placeholder="State or Province"
								/>
							{/if}
						</div>

						<div class="form-field">
							<label class="form-label" for="postal-code">Postal code</label>
							<input 
								id="postal-code"
								type="text"
								class="form-input"
								bind:value={formData.postal_code}
								placeholder="10001"
							/>
						</div>
					</div>

					<div class="form-field">
						<label class="form-label form-label-required" for="country">Country</label>
						<select 
							id="country"
							class="form-select"
							bind:value={formData.country}
							required
						>
							{#each countries as country}
								<option value={country}>{country}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Contact & Settings -->
				<div class="form-section">
					<h4 class="form-section-title">Contact & Settings</h4>
					
					<div class="form-field-group">
						<div class="form-field">
							<label class="form-label" for="phone">Phone number</label>
							<input 
								id="phone"
								type="tel"
								class="form-input"
								bind:value={formData.phone}
								placeholder="+1 (555) 123-4567"
							/>
						</div>

						<div class="form-field">
							<label class="form-label" for="email">Email address</label>
							<input 
								id="email"
								type="email"
								class="form-input"
								bind:value={formData.email}
								placeholder="store@example.com"
							/>
						</div>
					</div>

					<div class="form-field">
						<label class="form-label">Location capabilities</label>
						<div class="form-help">Select the services this location will provide</div>
						
						<div class="form-checkbox">
							<input 
								type="checkbox"
								id="pickup-location"
								bind:checked={formData.is_pickup_location}
							/>
							<label class="form-checkbox-label" for="pickup-location">
								Customer pickup location
							</label>
						</div>
						
						<div class="form-checkbox">
							<input 
								type="checkbox"
								id="fulfillment-center"
								bind:checked={formData.is_fulfillment_center}
							/>
							<label class="form-checkbox-label" for="fulfillment-center">
								Fulfillment center
							</label>
						</div>
						
						<div class="form-checkbox">
							<input 
								type="checkbox"
								id="default-location"
								bind:checked={formData.is_default}
							/>
							<label class="form-checkbox-label" for="default-location">
								Set as default location
							</label>
						</div>
					</div>
				</div>

				<!-- Validation Errors -->
				{#if validationErrors.length > 0}
					<div class="form-field-error">
						<div class="form-error">
							<strong>Please fix the following errors:</strong>
							{#each validationErrors as error}
								<div>{error}</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- General Error -->
				{#if errors}
					<div class="form-field-error">
						<div class="form-error">{errors}</div>
					</div>
				{/if}
			</form>
		</div>

		<div class="modal-footer">
			<div class="modal-actions">
				<button 
					type="button"
					class="btn btn-secondary"
					onclick={handleClose}
					disabled={creating || updating}
				>
					Cancel
				</button>
				<button 
					type="button"
					class="btn btn-primary"
					onclick={handleSubmit}
					disabled={(creating || updating) || !formData.name.trim() || !formData.address_line_1.trim() || !formData.city.trim()}
				>
					{#if creating || updating}
						{isEditing ? 'Updating...' : 'Creating...'}
					{:else}
						{isEditing ? 'Update Location' : 'Add Location'}
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>

