<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	// Client-side state management
	let product = $state(null);
	let variants = $state([]);
	let currentVariant = $state(null);
	let loading = $state(true);
	let error = $state('');
	let retrying = $state(false);
	
	// Get data from load function - reactive to route changes
	let productId = $derived(data.productId);
	let variantId = $derived(data.variantId);
	let fromInventory = $derived(data.fromInventory);
	
	// Form state
	let color = $state(currentVariant?.color || '');
	let size = $state(currentVariant?.size || '');
	let price = $state(currentVariant?.price?.toString() || '');
	let comparePrice = $state(currentVariant?.compare_at_price?.toString() || '');
	let sku = $state(currentVariant?.sku || '');
	let barcode = $state(currentVariant?.barcode || '');
	let inventoryQuantity = $state(currentVariant?.inventory_quantity || 0);
	let trackQuantity = $state(currentVariant?.track_quantity || true);
	let continueSelling = $state(currentVariant?.continue_selling_when_out_of_stock || false);
	let weight = $state(currentVariant?.weight || 0);
	let weightUnit = $state(currentVariant?.weight_unit || 'lb');
	let requiresShipping = $state(currentVariant?.requires_shipping || true);
	
	let saving = $state(false);
	let toasts = $state([]);
	let searchTerm = $state('');
	
	// Adjustment modal state
	let showAdjustModal = $state(false);
	let adjustingField = $state(null);
	let adjustBy = $state(0);
	let newQuantity = $state(0);
	let adjustReason = $state('Correction (default)');
	
	// Client-side data fetching with parallel API calls
	async function loadVariantData() {
		if (!browser || !productId || !variantId) return;
		
		try {
			loading = true;
			error = '';
			
			// Make both API calls in parallel for better performance
			const [variantsResponse, variantResponse] = await Promise.all([
				fetch(`/api/products/${productId}/variants`),
				fetch(`/api/products/${productId}/variants/${variantId}`)
			]);
			
			// Check for 404 errors
			if (variantsResponse.status === 404 || variantResponse.status === 404) {
				error = 'Product or variant not found';
				product = null;
				variants = [];
				currentVariant = null;
				return;
			}
			
			// Check if both requests succeeded
			if (!variantsResponse.ok || !variantResponse.ok) {
				throw new Error('Failed to fetch variant data');
			}
			
			// Parse responses
			const variantsData = await variantsResponse.json();
			const variantData = await variantResponse.json();
			
			// Set data
			product = variantsData.product;
			variants = variantsData.variants || [];
			currentVariant = variantData;
			
			// Initialize form data with the loaded variant
			initializeFormData(variantData);
		} catch (err) {
			console.error('Load variant data error:', err);
			error = 'Failed to load variant data. Please try again.';
			product = null;
			variants = [];
			currentVariant = null;
		} finally {
			loading = false;
			retrying = false;
		}
	}
	
	// Initialize form data from variant
	function initializeFormData(variantData: any) {
		if (variantData) {
			color = variantData.color || '';
			size = variantData.size || '';
			price = variantData.price?.toString() || '';
			comparePrice = variantData.compare_at_price?.toString() || '';
			sku = variantData.sku || '';
			barcode = variantData.barcode || '';
			inventoryQuantity = variantData.inventory_quantity || 0;
			trackQuantity = variantData.track_quantity || true;
			continueSelling = variantData.continue_selling_when_out_of_stock || false;
			weight = variantData.weight || 0;
			weightUnit = variantData.weight_unit || 'lb';
			requiresShipping = variantData.requires_shipping || true;
		}
	}
	
	// Retry function for error states
	async function retryLoad() {
		retrying = true;
		await loadVariantData();
	}
	
	// Load variant data on mount
	onMount(() => {
		loadVariantData();
	});
	
	// Reload data when variant ID changes (for navigation between variants)
	$effect(() => {
		if (browser && variantId) {
			loadVariantData();
		}
	});
	
	// Update form when current variant changes
	$effect(() => {
		if (currentVariant) {
			initializeFormData(currentVariant);
		}
	});
	
	// Toast notification system
	function showToast(message: string, type: 'success' | 'error' = 'success') {
		const id = Date.now();
		const toast = { id, message, type };
		toasts = [...toasts, toast];
		
		setTimeout(() => {
			toasts = toasts.filter(t => t.id !== id);
		}, 4000);
	}
	
	function removeToast(id: number) {
		toasts = toasts.filter(t => t.id !== id);
	}
	
	// Filter variants based on search
	let filteredVariants = $derived(
		variants.filter(variant => 
			variant.title.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);
	
	// Navigate to different variant
	function selectVariant(variant: any) {
		const url = `/products/${productId}/variants/${variant.id}${fromInventory ? '?fromInventory=true' : ''}`;
		goto(url);
	}
	
	// Save variant changes
	async function saveVariant() {
		saving = true;
		
		try {
			const updateData = {
				color,
				size,
				price: parseFloat(price) || 0,
				compare_at_price: comparePrice ? parseFloat(comparePrice) : null,
				inventory_quantity: inventoryQuantity,
				track_quantity: trackQuantity,
				continue_selling_when_out_of_stock: continueSelling,
				weight: weight,
				weight_unit: weightUnit,
				requires_shipping: requiresShipping
			};
			
			const response = await fetch(`/api/products/${productId}/variants/${variantId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			});
			
			if (response.ok) {
				showToast('Variant updated successfully!', 'success');
				// Refresh the page data
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				throw new Error('Failed to update variant');
			}
		} catch (error) {
			showToast('Error updating variant: ' + error.message, 'error');
		} finally {
			saving = false;
		}
	}
	
	// Navigate back
	function goBack() {
		if (fromInventory) {
			goto('/inventory');
		} else {
			goto(`/products/${productId}`);
		}
	}
	
	// Open adjustment modal
	function openAdjustModal(field: 'available' | 'on_hand') {
		adjustingField = field;
		newQuantity = inventoryQuantity;
		adjustBy = 0;
		showAdjustModal = true;
	}
	
	// Update adjust by value
	function updateAdjustBy() {
		newQuantity = inventoryQuantity + adjustBy;
	}
	
	// Update new quantity value
	function updateNewQuantity() {
		adjustBy = newQuantity - inventoryQuantity;
	}
	
	// Save adjustment
	async function saveAdjustment() {
		if (!adjustingField) return;
		
		saving = true;
		try {
			const response = await fetch(`/api/products/${productId}/variants/${variantId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					inventory_quantity: newQuantity
				})
			});
			
			if (response.ok) {
				showToast('Quantity updated successfully!', 'success');
				inventoryQuantity = newQuantity;
				showAdjustModal = false;
				adjustingField = null;
			} else {
				throw new Error('Failed to update quantity');
			}
		} catch (error) {
			showToast('Error updating quantity: ' + error.message, 'error');
		} finally {
			saving = false;
		}
	}
	
	// Cancel adjustment
	function cancelAdjustment() {
		showAdjustModal = false;
		adjustingField = null;
		adjustBy = 0;
		newQuantity = 0;
	}
	
	// Get first image for product
	function getFirstImage(product: any): string | null {
		try {
			if (!product.images) return null;
			
			let images = product.images;
			if (typeof images === 'string') {
				images = JSON.parse(images);
			}
			
			if (Array.isArray(images) && images.length > 0) {
				// Handle both simple URL strings and complex image objects
				const firstImage = images[0];
				if (typeof firstImage === 'string') {
					return firstImage; // Simple URL string
				} else if (firstImage && typeof firstImage === 'object' && firstImage.url) {
					return firstImage.url; // Complex image object with url property
				}
			}
			
			return null;
		} catch (e) {
			return null;
		}
	}
</script>

<svelte:head>
	<title>{currentVariant?.title} - {product?.name} - BetterCallSold</title>
</svelte:head>

{#if loading}
	<!-- Loading State -->
	<div class="page loading-page">
		<div class="page-header">
			<div class="header-main">
				<div class="header-left">
					<button class="back-button" onclick={goBack}>
						←
					</button>
					<div class="loading-skeleton title-skeleton"></div>
				</div>
				<div class="header-actions">
					<div class="loading-skeleton button-skeleton"></div>
					<div class="loading-skeleton button-skeleton"></div>
				</div>
			</div>
		</div>
		<div class="page-content">
			<div class="loading-content">
				<div class="loading-spinner-large"></div>
				<p class="loading-text">Loading variant details...</p>
			</div>
		</div>
	</div>
{:else if error}
	<!-- Error State -->
	<div class="error-page">
		<div class="error-content">
			<div class="error-icon">⚠</div>
			<h1>Error Loading Variant</h1>
			<p>{error}</p>
			<div class="error-actions">
				<button onclick={retryLoad} class="btn-primary" disabled={retrying}>
					{#if retrying}
						<span class="loading-spinner"></span>
					{/if}
					{retrying ? 'Retrying...' : 'Try Again'}
				</button>
				<button onclick={goBack} class="btn-secondary">Go Back</button>
			</div>
		</div>
	</div>
{:else if product && currentVariant}
	<div class="page">
		<!-- Header -->
		<div class="page-header">
			<div class="header-main">
				<div class="header-left">
					<button class="back-button" onclick={goBack}>
						←
					</button>
					<div class="breadcrumb">
						<span class="breadcrumb-item">100%</span>
						<span class="breadcrumb-separator">›</span>
						<span class="breadcrumb-item">{currentVariant.title}</span>
					</div>
				</div>
				<div class="header-actions">
					<button class="btn-secondary">Duplicate</button>
					<div class="more-actions">
						<button class="btn-secondary dropdown-trigger">
							More actions ▼
						</button>
					</div>
				</div>
			</div>
		</div>

		<div class="page-content">
			<div class="content-layout">
				<!-- Sidebar with variants list -->
				<div class="variants-sidebar">
					<div class="product-info">
						<div class="product-image">
							{#if getFirstImage(product)}
								<img src={getFirstImage(product)} alt={product.name} />
							{:else}
								<div class="image-placeholder">📦</div>
							{/if}
						</div>
						<div class="product-details">
							<h3 class="product-name">{product.name}</h3>
							<span class="product-status active">Active</span>
							<p class="variants-count">{variants.length} variants</p>
						</div>
					</div>
					
					<div class="search-box">
						<input 
							type="text" 
							placeholder="Search variants"
							bind:value={searchTerm}
							class="search-input"
						/>
					</div>
					
					<div class="variant-filters">
						<button class="filter-btn">Color ▼</button>
						<button class="filter-btn">Size ▼</button>
					</div>
					
					<div class="variants-list">
						{#each filteredVariants as variant}
							<button 
								class="variant-item {variant.id === currentVariant.id ? 'active' : ''}"
								onclick={() => selectVariant(variant)}
							>
								<span class="variant-icon">📦</span>
								<span class="variant-title">{variant.title}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Main content -->
				<div class="main-content">
					<!-- Options -->
					<div class="form-section">
						<h3 class="section-title">Options</h3>
						
						<div class="form-grid">
							<div class="form-field">
								<label class="form-label">Color</label>
								<input 
									type="text" 
									class="form-input"
									bind:value={color}
									placeholder="Enter color"
								/>
							</div>
							
							<div class="form-field">
								<label class="form-label">Size</label>
								<input 
									type="text" 
									class="form-input"
									bind:value={size}
									placeholder="Enter size"
								/>
							</div>
						</div>
						
						<div class="image-upload-area">
							<button class="btn-secondary add-image">+ Add image</button>
							<p class="upload-hint">or drop an image to upload</p>
						</div>
					</div>

					<!-- Pricing -->
					<div class="form-section">
						<h3 class="section-title">Pricing</h3>
						
						<div class="pricing-grid">
							<div class="form-field">
								<label class="form-label">Price</label>
								<div class="price-input">
									<span class="currency">$</span>
									<input 
										type="number" 
										class="form-input"
										bind:value={price}
										placeholder="0.00"
										step="0.01"
									/>
								</div>
							</div>
							
							<div class="form-field">
								<label class="form-label">Compare-at price</label>
								<div class="price-input">
									<span class="currency">$</span>
									<input 
										type="number" 
										class="form-input"
										bind:value={comparePrice}
										placeholder="0.00"
										step="0.01"
									/>
								</div>
							</div>
						</div>
						
						<div class="checkbox-field">
							<input type="checkbox" id="charge-tax" checked />
							<label for="charge-tax">Charge tax on this variant</label>
						</div>
						
						<div class="cost-fields">
							<div class="form-field">
								<label class="form-label">Cost per item</label>
								<div class="price-input">
									<span class="currency">$</span>
									<input 
										type="number" 
										class="form-input"
										placeholder="0.00"
										step="0.01"
									/>
								</div>
							</div>
							
							<div class="form-field">
								<label class="form-label">Profit</label>
								<input 
									type="text" 
									class="form-input"
									placeholder="--"
									readonly
								/>
							</div>
							
							<div class="form-field">
								<label class="form-label">Margin</label>
								<input 
									type="text" 
									class="form-input"
									placeholder="--"
									readonly
								/>
							</div>
						</div>
					</div>

					<!-- Inventory -->
					<div class="form-section">
						<div class="section-header">
							<h3 class="section-title">Inventory</h3>
							<button class="adjustment-history">Adjustment history</button>
						</div>
						
						<div class="inventory-fields">
							<div class="form-field">
								<label class="form-label">SKU (Stock Keeping Unit)</label>
								<input 
									type="text" 
									class="form-input"
									bind:value={sku}
									placeholder="Enter SKU"
								/>
							</div>
							
							<div class="form-field">
								<label class="form-label">Barcode (ISBN, UPC, GTIN, etc.)</label>
								<input 
									type="text" 
									class="form-input"
									bind:value={barcode}
									placeholder="Enter barcode"
								/>
							</div>
						</div>
						
						<div class="checkbox-field">
							<input type="checkbox" id="track-quantity" bind:checked={trackQuantity} />
							<label for="track-quantity">Track quantity</label>
						</div>
						
						<div class="checkbox-field">
							<input type="checkbox" id="continue-selling" bind:checked={continueSelling} />
							<label for="continue-selling">Continue selling when out of stock</label>
						</div>
						
						<div class="quantity-section">
							<div class="quantity-header">
								<h4>Quantity</h4>
								<button class="edit-locations">Edit locations</button>
							</div>
							
							<div class="quantity-table">
								<div class="quantity-row header">
									<div class="location-col">Location</div>
									<div class="number-col">Unavailable</div>
									<div class="number-col">Committed</div>
									<div class="number-col">Available</div>
									<div class="number-col">On hand</div>
								</div>
								
								<div class="quantity-row">
									<div class="location-col">Shop location</div>
									<div class="number-col">
										<select class="quantity-select">
											<option>0</option>
										</select>
									</div>
									<div class="number-col">
										<select class="quantity-select">
											<option>0</option>
										</select>
									</div>
									<div class="number-col">
										<button 
											class="quantity-button" 
											onclick={() => openAdjustModal('available')}
										>
											{inventoryQuantity}
										</button>
									</div>
									<div class="number-col">
										<button 
											class="quantity-button" 
											onclick={() => openAdjustModal('on_hand')}
										>
											{inventoryQuantity}
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Shipping -->
					<div class="form-section">
						<h3 class="section-title">Shipping</h3>
						
						<div class="checkbox-field">
							<input type="checkbox" id="physical-product" bind:checked={requiresShipping} />
							<label for="physical-product">This is a physical product</label>
						</div>
						
						<div class="weight-field">
							<label class="form-label">Weight</label>
							<div class="weight-input">
								<input 
									type="number" 
									class="form-input"
									bind:value={weight}
									placeholder="0.0"
									step="0.1"
								/>
								<select class="weight-unit" bind:value={weightUnit}>
									<option value="lb">lb</option>
									<option value="oz">oz</option>
									<option value="kg">kg</option>
									<option value="g">g</option>
								</select>
							</div>
						</div>
					</div>

					<!-- Save Button -->
					<div class="save-section">
						<button class="btn-primary" onclick={saveVariant} disabled={saving}>
							{#if saving}
								<span class="loading-spinner"></span>
							{/if}
							{saving ? 'Saving...' : 'Save'}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Variant not found or no data -->
	<div class="error-page">
		<div class="error-content">
			<div class="error-icon">📦</div>
			<h1>Variant Not Found</h1>
			<p>The variant you're looking for doesn't exist or has been removed.</p>
			<div class="error-actions">
				<button onclick={goBack} class="btn-primary">Go Back</button>
			</div>
		</div>
	</div>
{/if}

<!-- Toast Notifications -->
{#if toasts.length > 0}
	<div class="toast-container">
		{#each toasts as toast (toast.id)}
			<div class="toast toast-{toast.type}">
				<div class="toast-content">
					{#if toast.type === 'success'}
						<span class="toast-icon">✓</span>
					{:else}
						<span class="toast-icon">⚠</span>
					{/if}
					<span class="toast-message">{toast.message}</span>
				</div>
				<button class="toast-close" onclick={() => removeToast(toast.id)}>×</button>
			</div>
		{/each}
	</div>
{/if}

<!-- Adjustment Modal -->
{#if showAdjustModal && adjustingField}
	<div class="modal-overlay" onclick={cancelAdjustment}>
		<div class="modal-content adjust-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3 class="modal-title">Adjust {adjustingField === 'available' ? 'Available' : 'On hand'}</h3>
				<button class="modal-close" onclick={cancelAdjustment}>×</button>
			</div>
			
			<div class="modal-body">
				<div class="adjust-fields">
					<div class="field-group">
						<label class="field-label">Adjust by</label>
						<input 
							type="number" 
							class="adjust-input"
							bind:value={adjustBy}
							oninput={updateAdjustBy}
							placeholder="0"
						/>
					</div>
					
					<div class="field-group">
						<label class="field-label">New</label>
						<input 
							type="number" 
							class="adjust-input"
							bind:value={newQuantity}
							oninput={updateNewQuantity}
							placeholder="0"
							min="0"
						/>
					</div>
				</div>
				
				<div class="reason-section">
					<label class="field-label">Reason</label>
					<select class="reason-select" bind:value={adjustReason}>
						<option value="Correction (default)">Correction (default)</option>
						<option value="Cycle count">Cycle count</option>
						<option value="Damaged">Damaged</option>
						<option value="Quality control">Quality control</option>
						<option value="Received">Received</option>
						<option value="Sold">Sold</option>
						<option value="Other">Other</option>
					</select>
				</div>
			</div>
			
			<div class="modal-actions">
				<button class="btn-secondary" onclick={cancelAdjustment}>
					Cancel
				</button>
				<button class="btn-primary" onclick={saveAdjustment} disabled={saving}>
					{#if saving}
						<span class="loading-spinner"></span>
					{/if}
					{saving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page {
		min-height: 100vh;
		background: #f6f6f7;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		padding: 1rem 2rem;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-button {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		color: #6d7175;
		padding: 0.25rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.breadcrumb-separator {
		color: #6d7175;
		font-weight: normal;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.btn-primary, .btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-primary {
		background: #202223;
		color: white;
		border: none;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1a1a1a;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.btn-secondary:hover {
		background: #f6f6f7;
	}

	.page-content {
		padding: 2rem;
	}

	.content-layout {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	/* Sidebar */
	.variants-sidebar {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 1.5rem;
		height: fit-content;
		position: sticky;
		top: 6rem;
	}

	.product-info {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #e1e1e1;
	}

	.product-image {
		width: 64px;
		height: 64px;
		background: #f6f6f7;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		overflow: hidden;
		border: 1px solid #e1e3e5;
		flex-shrink: 0;
	}

	.product-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 7px;
	}

	.image-placeholder {
		opacity: 0.6;
	}

	.product-details {
		flex: 1;
	}

	.product-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
		margin: 0 0 0.5rem 0;
	}

	.product-status {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
		margin-bottom: 0.5rem;
	}

	.product-status.active {
		background: #d1fae5;
		color: #047857;
	}

	.variants-count {
		color: #6d7175;
		font-size: 0.8125rem;
		margin: 0;
	}

	.search-box {
		margin-bottom: 1rem;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}

	.variant-filters {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.filter-btn {
		background: white;
		border: 1px solid #c9cccf;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		color: #6d7175;
	}

	.filter-btn:hover {
		background: #f6f6f7;
	}

	.variants-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.variant-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: none;
		border: none;
		border-radius: 6px;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.15s ease;
		width: 100%;
	}

	.variant-item:hover {
		background: #f6f6f7;
	}

	.variant-item.active {
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
	}

	.variant-icon {
		font-size: 1rem;
		opacity: 0.6;
	}

	.variant-title {
		font-size: 0.875rem;
		color: #202223;
		font-weight: 500;
	}

	/* Main content */
	.main-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-section {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
		margin: 0 0 1rem 0;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.adjustment-history {
		background: none;
		border: none;
		color: #005bd3;
		font-size: 0.875rem;
		cursor: pointer;
		text-decoration: underline;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
	}

	.form-label {
		font-weight: 500;
		color: #202223;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.form-input {
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
		transition: border-color 0.15s ease;
	}

	.form-input:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}

	.image-upload-area {
		border: 2px dashed #c9cccf;
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
		margin-top: 1rem;
	}

	.add-image {
		margin-bottom: 0.5rem;
	}

	.upload-hint {
		color: #6d7175;
		font-size: 0.8125rem;
		margin: 0;
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.price-input {
		position: relative;
		display: flex;
		align-items: center;
	}

	.currency {
		position: absolute;
		left: 0.75rem;
		color: #6d7175;
		font-size: 0.875rem;
		pointer-events: none;
	}

	.price-input .form-input {
		padding-left: 1.75rem;
	}

	.checkbox-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.checkbox-field input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.cost-fields {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1rem;
	}

	.inventory-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.quantity-section {
		margin-top: 1rem;
	}

	.quantity-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.quantity-header h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
	}

	.edit-locations {
		background: none;
		border: none;
		color: #005bd3;
		font-size: 0.875rem;
		cursor: pointer;
		text-decoration: underline;
	}

	.quantity-table {
		border: 1px solid #e1e1e1;
		border-radius: 6px;
		overflow: hidden;
	}

	.quantity-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
		align-items: center;
	}

	.quantity-row.header {
		background: #fafbfb;
		padding: 0.75rem 1rem;
		font-weight: 500;
		font-size: 0.75rem;
		color: #6d7175;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.quantity-row:not(.header) {
		padding: 1rem;
		border-top: 1px solid #e1e1e1;
	}

	.location-col {
		text-align: left;
	}

	.number-col {
		text-align: center;
	}

	.quantity-select {
		padding: 0.375rem 0.5rem;
		border: 1px solid #c9cccf;
		border-radius: 4px;
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
		width: 60px;
	}

	.quantity-button {
		background: white;
		border: 1px solid #c9cccf;
		border-radius: 4px;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #202223;
		cursor: pointer;
		transition: all 0.15s ease;
		min-width: 60px;
		text-align: center;
	}

	.quantity-button:hover {
		border-color: #005bd3;
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}

	.quantity-button:active {
		transform: translateY(1px);
	}

	.weight-field {
		display: flex;
		flex-direction: column;
		max-width: 300px;
	}

	.weight-input {
		display: flex;
		gap: 0.5rem;
	}

	.weight-input .form-input {
		flex: 1;
	}

	.weight-unit {
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
		min-width: 80px;
	}

	.save-section {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 1.5rem;
		text-align: right;
	}

	.loading-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 0.8s ease-in-out infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Loading States */
	.loading-page {
		min-height: 100vh;
		background: #f6f6f7;
	}
	
	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		text-align: center;
		padding: 2rem;
		gap: 1rem;
	}
	
	.loading-spinner-large {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(0, 91, 211, 0.1);
		border-radius: 50%;
		border-top-color: #005bd3;
		animation: spin 0.8s ease-in-out infinite;
	}
	
	.loading-text {
		color: #6d7175;
		font-size: 0.875rem;
		margin: 0;
	}
	
	.loading-skeleton {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
	}
	
	.title-skeleton {
		height: 28px;
		width: 200px;
	}
	
	.button-skeleton {
		height: 36px;
		width: 80px;
	}
	
	@keyframes loading {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
	
	/* Error States */
	.error-page {
		min-height: 100vh;
		background: #f6f6f7;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}
	
	.error-content {
		background: white;
		border-radius: 12px;
		padding: 3rem 2rem;
		text-align: center;
		max-width: 480px;
		width: 100%;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		border: 1px solid #e1e3e5;
	}
	
	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.6;
	}
	
	.error-content h1 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #202223;
	}
	
	.error-content p {
		margin: 0 0 2rem 0;
		color: #6d7175;
		line-height: 1.5;
	}
	
	.error-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	/* Toast Notifications */
	.toast-container {
		position: fixed;
		top: 5rem;
		right: 2rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		pointer-events: none;
	}

	.toast {
		background: white;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
		border: 1px solid #e1e3e5;
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-width: 320px;
		max-width: 480px;
		pointer-events: auto;
		animation: slideIn 0.3s ease-out;
	}

	.toast-success {
		border-left: 4px solid #00a96e;
	}

	.toast-error {
		border-left: 4px solid #d72c0d;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.toast-icon {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.toast-success .toast-icon {
		background: #00a96e;
		color: white;
	}

	.toast-error .toast-icon {
		background: #d72c0d;
		color: white;
	}

	.toast-message {
		font-size: 0.875rem;
		color: #202223;
		font-weight: 500;
	}

	.toast-close {
		background: none;
		border: none;
		color: #6d7175;
		cursor: pointer;
		font-size: 1.25rem;
		padding: 0;
		margin-left: 1rem;
		transition: color 0.15s ease;
	}

	.toast-close:hover {
		color: #202223;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@media (max-width: 1024px) {
		.content-layout {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		
		.variants-sidebar {
			position: static;
		}
	}

	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}
		
		.header-main {
			flex-direction: column;
			gap: 1rem;
		}
		
		.form-grid,
		.pricing-grid,
		.inventory-fields,
		.cost-fields {
			grid-template-columns: 1fr;
		}
	}

	/* Adjustment Modal */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.modal-content.adjust-modal {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 480px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		overflow: hidden;
	}

	.modal-header {
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #e1e3e5;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.modal-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #6d7175;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.modal-close:hover {
		color: #202223;
	}

	.modal-body {
		padding: 2rem;
	}

	.adjust-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.field-group {
		display: flex;
		flex-direction: column;
	}

	.field-label {
		font-weight: 500;
		color: #202223;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.adjust-input {
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.15s ease;
		background: white;
	}

	.adjust-input:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 3px rgba(0, 91, 211, 0.1);
	}

	.reason-section {
		display: flex;
		flex-direction: column;
	}

	.reason-select {
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 8px;
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
		transition: border-color 0.15s ease;
	}

	.reason-select:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 3px rgba(0, 91, 211, 0.1);
	}

	.modal-actions {
		padding: 1.5rem 2rem;
		border-top: 1px solid #e1e3e5;
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		background: #fafbfb;
	}

	.modal-actions .btn-primary,
	.modal-actions .btn-secondary {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.modal-actions .btn-primary {
		background: #202223;
		color: white;
		border: none;
	}

	.modal-actions .btn-primary:hover:not(:disabled) {
		background: #1a1a1a;
	}

	.modal-actions .btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.modal-actions .btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.modal-actions .btn-secondary:hover {
		background: #f6f6f7;
		border-color: #b3b7bb;
	}
</style>