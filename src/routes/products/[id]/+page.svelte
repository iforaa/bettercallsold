<script lang="ts">
	import { goto } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	// Client-side state management
	let product = $state(null);
	let loading = $state(true);
	let error = $state('');
	let retrying = $state(false);
	const productId = data.productId;
	
	// Form state
	let title = $state('');
	let description = $state('');
	let price = $state('');
	let comparePrice = $state('');
	let status = $state('active');
	let chargesTax = $state(true);
	let tags = $state('');
	let images = $state([]);
	let variants = $state([]);
	let selectedImages = $state<File[]>([]);
	let uploading = $state(false);
	let saving = $state(false);
	let unsavedChanges = $state(false);
	let toasts = $state([]);
	
	// Collections
	let collections = $state([]);
	let selectedCollections = $state([]);
	let showCollectionDropdown = $state(false);
	let collectionSearchTerm = $state('');

	// Initialize form data from product
	function initializeFormData(productData: any) {
		title = productData.name || '';
		description = productData.description || '';
		price = productData.price?.toString() || '';
		status = productData.status || 'active';
		
		// Parse JSON fields safely and normalize image format
		try {
			const rawImages = productData.images ? (typeof productData.images === 'string' ? JSON.parse(productData.images) : productData.images) : [];
			// Normalize images to simple URL strings for consistent handling
			images = rawImages.map(img => {
				if (typeof img === 'string') {
					return img; // Already a URL string
				} else if (img && typeof img === 'object' && img.url) {
					return img.url; // Extract URL from object
				}
				return null; // Invalid format
			}).filter(url => url !== null); // Remove invalid entries
		} catch (e) {
			images = [];
		}
		
		try {
			// Convert inventory_items to variants format for form compatibility
			if (productData.inventory_items && Array.isArray(productData.inventory_items)) {
				variants = productData.inventory_items.map(item => ({
					id: item.id,
					size: item.variant_combination?.size || '',
					color: item.variant_combination?.color || '',
					price: item.price || productData.price,
					inventory_quantity: item.quantity || 0,
					sku: item.sku || '',
					position: item.position || 1
				}));
			} else {
				variants = [];
			}
		} catch (e) {
			variants = [];
		}
		
		try {
			tags = productData.tags ? (Array.isArray(productData.tags) ? productData.tags.join(', ') : productData.tags) : '';
		} catch (e) {
			tags = '';
		}
		
		// Load existing collections
		if (productData.product_collections && Array.isArray(productData.product_collections)) {
			selectedCollections = productData.product_collections;
		}
	}
	
	$effect(() => {
		// Mark as having unsaved changes when any field is modified
		if (product && (title !== product.name || description !== product.description || price !== product.price?.toString() || selectedImages.length > 0)) {
			unsavedChanges = true;
		}
	});
	
	// Toast notification system
	function showToast(message: string, type: 'success' | 'error' = 'success') {
		const id = Date.now();
		const toast = { id, message, type };
		toasts = [...toasts, toast];
		
		// Auto remove after 4 seconds
		setTimeout(() => {
			toasts = toasts.filter(t => t.id !== id);
		}, 4000);
	}
	
	function removeToast(id: number) {
		toasts = toasts.filter(t => t.id !== id);
	}
	
	// Load collections
	async function loadCollections() {
		try {
			const response = await fetch('/api/collections');
			if (response.ok) {
				collections = await response.json();
			}
		} catch (error) {
			console.error('Failed to load collections:', error);
		}
	}
	
	// Client-side data fetching
	async function loadProduct() {
		if (!browser || !productId) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch(`/api/products/${productId}`);
			
			if (response.status === 404) {
				error = 'Product not found';
				product = null;
				return;
			}
			
			if (!response.ok) {
				throw new Error('Failed to fetch product');
			}
			
			const productData = await response.json();
			product = productData;
			
			// Initialize form data with the loaded product
			initializeFormData(productData);
		} catch (err) {
			console.error('Load product error:', err);
			error = 'Failed to load product. Please try again.';
			product = null;
		} finally {
			loading = false;
			retrying = false;
		}
	}
	
	// Retry function for error states
	async function retryLoad() {
		retrying = true;
		await loadProduct();
	}
	
	// Load product and collections on mount
	onMount(() => {
		loadProduct();
		loadCollections();
	});
	
	// Collection management functions
	function toggleCollectionDropdown() {
		showCollectionDropdown = !showCollectionDropdown;
		if (showCollectionDropdown) {
			collectionSearchTerm = '';
		}
	}
	
	function toggleCollection(collection: any) {
		const isSelected = selectedCollections.some(c => c.id === collection.id);
		if (isSelected) {
			selectedCollections = selectedCollections.filter(c => c.id !== collection.id);
		} else {
			selectedCollections = [...selectedCollections, collection];
		}
		unsavedChanges = true;
	}
	
	function removeCollection(collectionId: string) {
		selectedCollections = selectedCollections.filter(c => c.id !== collectionId);
		unsavedChanges = true;
	}
	
	// Filter collections based on search term
	let filteredCollections = $derived(
		collections.filter(collection => 
			collection.name.toLowerCase().includes(collectionSearchTerm.toLowerCase())
		)
	);
	
	// Close dropdown when clicking outside
	function handleClickOutside(event: Event) {
		const target = event.target as Element;
		if (!target.closest('.collection-dropdown-container')) {
			showCollectionDropdown = false;
		}
	}
	
	$effect(() => {
		if (showCollectionDropdown) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
	
	async function uploadImages() {
		if (selectedImages.length === 0) return [];
		
		uploading = true;
		const uploadedUrls = [];
		
		try {
			for (const image of selectedImages) {
				const formData = new FormData();
				formData.append('file', image);
				
				// Use internal SvelteKit API route
				const response = await fetch('/api/upload', {
					method: 'POST',
					body: formData
				});
				
				if (response.ok) {
					const result = await response.json();
					uploadedUrls.push(result.url);
				} else {
					throw new Error(`Failed to upload ${image.name}`);
				}
			}
			
			return uploadedUrls;
		} catch (error) {
			showToast('Error uploading images: ' + error.message, 'error');
			throw error;
		} finally {
			uploading = false;
		}
	}
	
	async function saveProduct() {
		saving = true;
		
		try {
			// Upload new images first
			const newImageUrls = await uploadImages();
			
			// Combine existing images with new ones
			const allImages = [...(images || []), ...newImageUrls];
			
			const productData = {
				name: title,
				description: description,
				price: parseFloat(price) || 0,
				status: status.toLowerCase(),
				images: allImages,
				variants: variants,
				tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
				collections: selectedCollections.map(c => c.id)
			};
			
			// Use internal SvelteKit API route
			const response = await fetch(`/api/products/${product.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(productData)
			});
			
			if (response.ok) {
				unsavedChanges = false;
				// Update local images state to include new uploads
				images = allImages;
				selectedImages = [];
				showToast('Product updated successfully!', 'success');
			} else {
				throw new Error('Failed to update product');
			}
		} catch (error) {
			showToast('Error updating product: ' + error.message, 'error');
		} finally {
			saving = false;
		}
	}
	
	function discardChanges() {
		if (unsavedChanges && confirm('You have unsaved changes. Are you sure you want to discard them?')) {
			goto('/products');
		} else if (!unsavedChanges) {
			goto('/products');
		}
	}

	function handleImageUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			selectedImages = Array.from(input.files);
		}
	}
	
	function removeImage(index: number) {
		selectedImages = selectedImages.filter((_, i) => i !== index);
	}
	
	function removeExistingImage(index: number) {
		images = images.filter((_, i) => i !== index);
		unsavedChanges = true;
	}

	async function deleteProduct() {
		if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
			try {
				const response = await fetch(`/api/products/${product.id}`, {
					method: 'DELETE'
				});

				if (response.ok) {
					showToast('Product deleted successfully!', 'success');
					// Navigate back to products list after a short delay
					setTimeout(() => {
						goto('/products');
					}, 1000);
				} else {
					throw new Error('Failed to delete product');
				}
			} catch (error) {
				showToast('Error deleting product: ' + error.message, 'error');
			}
		}
	}
</script>

<svelte:head>
	<title>{product?.name || 'Product'} - BetterCallSold</title>
</svelte:head>

{#if loading}
	<!-- Loading State -->
	<div class="page loading-page">
		<div class="page-header">
			<div class="header-main">
				<div class="header-left">
					<button class="back-button" onclick={() => goto('/products')}>
						←
					</button>
					<div class="loading-skeleton title-skeleton"></div>
				</div>
				<div class="header-actions">
					<div class="loading-skeleton button-skeleton"></div>
					<div class="loading-skeleton button-skeleton"></div>
					<div class="loading-skeleton button-skeleton"></div>
				</div>
			</div>
		</div>
		<div class="page-content">
			<div class="loading-content">
				<div class="loading-spinner-large"></div>
				<p class="loading-text">Loading product details...</p>
			</div>
		</div>
	</div>
{:else if error}
	<div class="error-page">
		<div class="error-content">
			<div class="error-icon">⚠</div>
			<h1>Error Loading Product</h1>
			<p>{error}</p>
			<div class="error-actions">
				<button onclick={retryLoad} class="btn-primary" disabled={retrying}>
					{#if retrying}
						<span class="loading-spinner"></span>
					{/if}
					{retrying ? 'Retrying...' : 'Try Again'}
				</button>
				<button onclick={() => goto('/products')} class="btn-secondary">Back to Products</button>
			</div>
		</div>
	</div>
{:else if product}
	<div class="page">
		<!-- Header -->
		<div class="page-header">
			<div class="header-main">
				<div class="header-left">
					<button class="back-button" onclick={() => goto('/products')}>
						←
					</button>
					<h1>{product.name}</h1>
					{#if unsavedChanges}
						<span class="unsaved-indicator">● Unsaved changes</span>
					{/if}
				</div>
				<div class="header-actions">
					<button class="btn-secondary btn-danger" onclick={deleteProduct}>
						Delete
					</button>
					<button class="btn-secondary" onclick={discardChanges}>
						Discard
					</button>
					<button class="btn-primary" onclick={saveProduct} disabled={saving || uploading}>
						{#if saving || uploading}
							<span class="loading-spinner"></span>
						{/if}
						{uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
		</div>

		<div class="page-content">
			<div class="content-grid">
				<!-- Main Content -->
				<div class="main-content">
					<!-- Title -->
					<div class="form-section">
						<label class="form-label" for="title">Title</label>
						<input 
							id="title"
							type="text" 
							class="form-input"
							bind:value={title}
							placeholder="Short sleeve t-shirt"
						/>
					</div>

					<!-- Description -->
					<div class="form-section">
						<label class="form-label" for="description">Description</label>
						<div class="description-toolbar">
							<select class="toolbar-select">
								<option>Paragraph</option>
							</select>
							<div class="toolbar-buttons">
								<button type="button" class="toolbar-btn"><strong>B</strong></button>
								<button type="button" class="toolbar-btn"><em>I</em></button>
								<button type="button" class="toolbar-btn"><u>U</u></button>
								<button type="button" class="toolbar-btn">•</button>
								<button type="button" class="toolbar-btn">≡</button>
								<button type="button" class="toolbar-btn">🔗</button>
								<button type="button" class="toolbar-btn">📷</button>
								<button type="button" class="toolbar-btn">⚙️</button>
								<button type="button" class="toolbar-btn">&lt;/&gt;</button>
							</div>
						</div>
						<textarea 
							id="description"
							class="form-textarea"
							bind:value={description}
							rows="6"
							placeholder="Describe your product..."
						></textarea>
					</div>

					<!-- Media -->
					<div class="form-section">
						<label class="form-label">Media</label>
						<div class="media-upload">
							{#if images && images.length > 0}
								<div class="existing-images">
									<h4>Current Images</h4>
									<div class="image-preview-grid">
										{#each images as imageUrl, index}
											<div class="image-preview">
												<img src={imageUrl} alt="Product image" />
												<button type="button" class="remove-image" onclick={() => removeExistingImage(index)}>×</button>
											</div>
										{/each}
									</div>
								</div>
							{/if}
							{#if selectedImages.length > 0}
								<div class="new-images">
									<h4>New Images to Upload</h4>
									<div class="image-preview-grid">
										{#each selectedImages as image, index}
											<div class="image-preview">
												<img src={URL.createObjectURL(image)} alt="Preview" />
												<button type="button" class="remove-image" onclick={() => removeImage(index)}>×</button>
												<span class="image-name">{image.name}</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
							<div class="upload-area">
								<input type="file" id="image-upload" multiple accept="image/*" onchange={handleImageUpload} class="file-input" />
								<label for="image-upload" class="upload-label">
									<div class="upload-content">
										<span class="upload-icon">📷</span>
										<span class="upload-text">Click to upload new images</span>
										<span class="upload-hint">Supports PNG, JPG, GIF up to 10MB each</span>
									</div>
								</label>
							</div>
						</div>
					</div>


					<!-- Pricing -->
					<div class="form-section">
						<h3 class="section-title">Pricing</h3>
						<div class="pricing-grid">
							<div class="form-field">
								<label class="form-label" for="price">Price</label>
								<div class="price-input">
									<span class="currency">$</span>
									<input 
										id="price"
										type="number" 
										class="form-input"
										bind:value={price}
										placeholder="0.00"
										step="0.01"
									/>
								</div>
							</div>
							<div class="form-field">
								<label class="form-label" for="compare-price">Compare-at price</label>
								<div class="price-input">
									<span class="currency">$</span>
									<input 
										id="compare-price"
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
							<input 
								id="charge-tax"
								type="checkbox" 
								bind:checked={chargesTax}
							/>
							<label for="charge-tax">Charge tax on this product</label>
						</div>
					</div>

				</div>

				<!-- Sidebar -->
				<div class="sidebar">
					<!-- Status -->
					<div class="sidebar-section">
						<h3 class="sidebar-title">Status</h3>
						<select class="form-select" bind:value={status}>
							<option value="active">Active</option>
							<option value="draft">Draft</option>
							<option value="archived">Archived</option>
						</select>
					</div>



					<!-- Product organization -->
					<div class="sidebar-section">
						<h3 class="sidebar-title">Product organization</h3>
						
						<div class="form-field">
							<label class="form-label" for="tags">Tags</label>
							<input 
								id="tags"
								type="text" 
								class="form-input"
								bind:value={tags}
								placeholder="Vintage, cotton, summer"
							/>
						</div>
						
						<!-- Collections -->
						<div class="form-field">
							<label class="form-label">Collections</label>
							<div class="collections-container">
								<!-- Selected Collections -->
								{#if selectedCollections.length > 0}
									<div class="selected-collections">
										{#each selectedCollections as collection}
											<div class="collection-tag">
												<span>{collection.name}</span>
												<button type="button" class="remove-collection" onclick={() => removeCollection(collection.id)}>×</button>
											</div>
										{/each}
									</div>
								{/if}
								
								<!-- Collection Dropdown -->
								<div class="collection-dropdown-container">
									<button 
										type="button" 
										class="collection-dropdown-trigger"
										onclick={toggleCollectionDropdown}
									>
										Add to collection
									</button>
									
									{#if showCollectionDropdown}
										<div class="collection-dropdown">
											<!-- Add new collection option -->
											<div class="collection-option add-new">
												<span class="add-icon">+</span>
												<span>Add new collection</span>
											</div>
											
											<!-- Collection list -->
											{#if filteredCollections.length > 0}
												{#each filteredCollections as collection}
													<div class="collection-option">
														<input 
															type="checkbox" 
															id="collection-{collection.id}"
															checked={selectedCollections.some(c => c.id === collection.id)}
															onchange={() => toggleCollection(collection)}
														/>
														<label for="collection-{collection.id}" class="collection-label">
															{collection.name}
														</label>
													</div>
												{/each}
											{/if}
											
											<!-- Search input -->
											<div class="collection-search">
												<input 
													type="text" 
													placeholder="Search collections"
													bind:value={collectionSearchTerm}
													class="collection-search-input"
												/>
											</div>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<!-- Theme template -->
					<div class="sidebar-section">
						<h3 class="sidebar-title">Theme template</h3>
						<select class="form-select">
							<option>Default product</option>
						</select>
					</div>

					<!-- Product Info -->
					<div class="sidebar-section">
						<h3 class="sidebar-title">Product Info</h3>
						<div class="info-item">
							<span class="info-label">Created:</span>
							<span class="info-value">{new Date(product.created_at).toLocaleDateString()}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Updated:</span>
							<span class="info-value">{new Date(product.updated_at).toLocaleDateString()}</span>
						</div>
						<div class="info-item">
							<span class="info-label">ID:</span>
							<span class="info-value">{product.id}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Product not found or no data -->
	<div class="error-page">
		<div class="error-content">
			<div class="error-icon">📦</div>
			<h1>Product Not Found</h1>
			<p>The product you're looking for doesn't exist or has been removed.</p>
			<div class="error-actions">
				<button onclick={() => goto('/products')} class="btn-primary">Back to Products</button>
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

	.header-left h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
	}

	.unsaved-indicator {
		color: #bf5000;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn-primary, .btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
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

	.btn-danger {
		color: #d72c0d;
		border-color: #d72c0d;
	}

	.btn-danger:hover {
		background: #fef2f2;
	}

	.page-content {
		padding: 2rem;
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

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

	.form-label {
		display: block;
		font-weight: 500;
		color: #202223;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.form-input, .form-select, .form-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
		transition: border-color 0.15s ease;
	}

	.form-input:focus, .form-select:focus, .form-textarea:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}

	.description-toolbar {
		border: 1px solid #c9cccf;
		border-bottom: none;
		background: #f6f6f7;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 6px 6px 0 0;
	}

	.toolbar-select {
		padding: 0.25rem 0.5rem;
		border: 1px solid #c9cccf;
		border-radius: 4px;
		font-size: 0.8125rem;
		background: white;
	}

	.toolbar-buttons {
		display: flex;
		gap: 0.25rem;
	}

	.toolbar-btn {
		background: none;
		border: none;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 0.8125rem;
		border-radius: 4px;
		color: #6d7175;
	}

	.toolbar-btn:hover {
		background: #e1e1e1;
	}

	.form-textarea {
		border-radius: 0 0 6px 6px;
		border-top: none;
		resize: vertical;
		min-height: 120px;
	}

	.media-upload {
		border: 2px dashed #c9cccf;
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
	}

	.upload-buttons {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		margin-bottom: 0.5rem;
	}

	.upload-hint {
		color: #6d7175;
		font-size: 0.8125rem;
		margin: 0;
	}

	.form-hint {
		color: #6d7175;
		font-size: 0.8125rem;
		margin-top: 0.5rem;
		margin-bottom: 0;
		line-height: 1.4;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
		margin: 0 0 1rem 0;
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
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
	}

	.checkbox-field input[type="checkbox"] {
		width: auto;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.sidebar-section {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.sidebar-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
		margin: 0 0 1rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.info-icon {
		font-size: 0.75rem;
		opacity: 0.6;
	}

	.publishing-channels {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.channel {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #202223;
	}

	.channel-icon {
		margin-left: auto;
	}

	.region {
		padding: 0.5rem;
		background: #f6f6f7;
		border-radius: 4px;
		font-size: 0.875rem;
		color: #202223;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid #f3f4f6;
		font-size: 0.875rem;
	}

	.info-item:last-child {
		border-bottom: none;
	}

	.info-label {
		color: #6d7175;
		font-weight: 500;
	}

	.info-value {
		color: #202223;
		word-break: break-all;
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
		min-height: 60vh;
		text-align: center;
		padding: 2rem;
	}
	
	.loading-spinner-large {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(0, 91, 211, 0.1);
		border-radius: 50%;
		border-top-color: #005bd3;
		animation: spin 1s ease-in-out infinite;
		margin-bottom: 1rem;
	}
	
	.loading-text {
		color: #6d7175;
		font-size: 0.875rem;
		margin: 0;
	}
	
	.loading-skeleton {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: loading-skeleton 1.5s infinite;
		border-radius: 4px;
	}
	
	.title-skeleton {
		width: 200px;
		height: 24px;
	}
	
	.button-skeleton {
		width: 80px;
		height: 36px;
	}
	
	@keyframes loading-skeleton {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}
	
	/* Error States */
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: #f6f6f7;
		padding: 2rem;
	}
	
	.error-content {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		padding: 3rem 2rem;
		text-align: center;
		max-width: 400px;
		width: 100%;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}
	
	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.6;
	}

	.error-content h1 {
		color: #202223;
		margin-bottom: 0.5rem;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.error-content p {
		color: #6d7175;
		margin-bottom: 2rem;
		line-height: 1.5;
	}
	
	.error-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.file-input {
		display: none;
	}

	.upload-label {
		display: block;
		cursor: pointer;
		border: 2px dashed #c9cccf;
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
		transition: border-color 0.15s ease;
	}

	.upload-label:hover {
		border-color: #005bd3;
	}

	.upload-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.upload-icon {
		font-size: 2rem;
		opacity: 0.6;
	}

	.upload-text {
		font-weight: 500;
		color: #202223;
	}

	.upload-hint {
		color: #6d7175;
		font-size: 0.8125rem;
	}

	.image-preview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.image-preview {
		position: relative;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid #e1e1e1;
	}

	.image-preview img {
		width: 100%;
		height: 120px;
		object-fit: cover;
		display: block;
	}

	.remove-image {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		border: none;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
	}

	.remove-image:hover {
		background: rgba(0, 0, 0, 0.9);
	}

	.image-name {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.existing-images h4,
	.new-images h4 {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
	}

	@media (max-width: 1024px) {
		.content-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		
		.sidebar {
			order: -1;
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
		
		.pricing-grid {
			grid-template-columns: 1fr;
		}
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

	/* Loading Spinner */
	.loading-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 0.8s ease-in-out infinite;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.btn-primary:disabled .loading-spinner {
		border-color: rgba(255, 255, 255, 0.5);
		border-top-color: rgba(255, 255, 255, 0.8);
	}

	/* Collections Styles */
	.collections-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.selected-collections {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.collection-tag {
		display: flex;
		align-items: center;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		padding: 0.375rem 0.5rem;
		font-size: 0.875rem;
		color: #334155;
		gap: 0.5rem;
	}

	.remove-collection {
		background: none;
		border: none;
		color: #64748b;
		cursor: pointer;
		font-size: 1rem;
		padding: 0;
		line-height: 1;
		transition: color 0.15s ease;
	}

	.remove-collection:hover {
		color: #dc2626;
	}

	.collection-dropdown-container {
		position: relative;
	}

	.collection-dropdown-trigger {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		background: white;
		color: #6d7175;
		font-size: 0.875rem;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
	}

	.collection-dropdown-trigger:hover {
		border-color: #005bd3;
	}

	.collection-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #c9cccf;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
		z-index: 100;
		max-height: 300px;
		overflow-y: auto;
		margin-top: 0.25rem;
	}

	.collection-option {
		display: flex;
		align-items: center;
		padding: 0.75rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
		gap: 0.75rem;
	}

	.collection-option:hover {
		background: #f6f6f7;
	}

	.collection-option.add-new {
		border-bottom: 1px solid #e1e3e5;
		color: #005bd3;
		font-weight: 500;
	}

	.add-icon {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #005bd3;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.collection-option input[type="checkbox"] {
		width: 16px;
		height: 16px;
		margin: 0;
	}

	.collection-label {
		flex: 1;
		font-size: 0.875rem;
		color: #202223;
		cursor: pointer;
	}

	.collection-search {
		border-top: 1px solid #e1e3e5;
		padding: 0.75rem;
		background: #f9fafb;
	}

	.collection-search-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #c9cccf;
		border-radius: 4px;
		font-size: 0.875rem;
		background: white;
	}

	.collection-search-input:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}
</style>