<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	// Client-side state management
	let collection = $state(null);
	let loading = $state(true);
	let error = $state('');
	let retrying = $state(false);
	const collectionId = data.collectionId;
	
	let products = $derived(collection?.products || []);
	
	// Form state
	let name = $state('');
	let description = $state('');
	let imageUrl = $state('');
	let sortOrder = $state(0);
	let selectedImages = $state<File[]>([]);
	let uploading = $state(false);
	let saving = $state(false);
	let unsavedChanges = $state(false);
	let toasts = $state([]);
	
	// Product management
	let searchTerm = $state('');
	let availableProducts = $state([]);
	let showProductBrowser = $state(false);
	let loadingProducts = $state(false);
	
	// Initialize form data from collection
	function initializeFormData(collectionData: any) {
		name = collectionData.name || '';
		description = collectionData.description || '';
		imageUrl = collectionData.image_url || '';
		sortOrder = collectionData.sort_order || 0;
	}
	
	// Client-side data fetching
	async function loadCollection() {
		if (!browser || !collectionId) return;
		
		try {
			loading = true;
			error = '';
			
			const response = await fetch(`/api/collections/${collectionId}`);
			
			if (response.status === 404) {
				error = 'Collection not found';
				collection = null;
				return;
			}
			
			if (!response.ok) {
				throw new Error('Failed to fetch collection');
			}
			
			const collectionData = await response.json();
			collection = collectionData;
			
			// Initialize form data with the loaded collection
			initializeFormData(collectionData);
		} catch (err) {
			console.error('Load collection error:', err);
			error = 'Failed to load collection. Please try again.';
			collection = null;
		} finally {
			loading = false;
			retrying = false;
		}
	}
	
	// Retry function for error states
	async function retryLoad() {
		retrying = true;
		await loadCollection();
	}
	
	// Load collection on mount
	onMount(() => {
		loadCollection();
	});
	
	$effect(() => {
		// Mark as having unsaved changes when any field is modified
		if (collection && (name !== collection.name || description !== collection.description || imageUrl !== collection.image_url || selectedImages.length > 0)) {
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
	
	async function uploadImages() {
		if (selectedImages.length === 0) return null;
		
		uploading = true;
		try {
			const image = selectedImages[0]; // Take first image only
			const formData = new FormData();
			formData.append('file', image);
			
			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});
			
			if (response.ok) {
				const result = await response.json();
				return result.url;
			} else {
				throw new Error(`Failed to upload ${image.name}`);
			}
		} catch (error) {
			showToast('Error uploading image: ' + error.message, 'error');
			throw error;
		} finally {
			uploading = false;
		}
	}
	
	async function saveCollection() {
		saving = true;
		
		try {
			// Upload new image if selected
			let finalImageUrl = imageUrl;
			if (selectedImages.length > 0) {
				finalImageUrl = await uploadImages();
			}
			
			const collectionData = {
				name: name,
				description: description,
				image_url: finalImageUrl,
				sort_order: sortOrder
			};
			
			const response = await fetch(`/api/collections/${collection.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(collectionData)
			});
			
			if (response.ok) {
				unsavedChanges = false;
				selectedImages = [];
				if (finalImageUrl) imageUrl = finalImageUrl;
				showToast('Collection updated successfully!', 'success');
			} else {
				throw new Error('Failed to update collection');
			}
		} catch (error) {
			showToast('Error updating collection: ' + error.message, 'error');
		} finally {
			saving = false;
		}
	}
	
	async function deleteCollection() {
		if (confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
			try {
				const response = await fetch(`/api/collections/${collection.id}`, {
					method: 'DELETE'
				});

				if (response.ok) {
					showToast('Collection deleted successfully!', 'success');
					setTimeout(() => {
						goto('/collections');
					}, 1000);
				} else {
					throw new Error('Failed to delete collection');
				}
			} catch (error) {
				showToast('Error deleting collection: ' + error.message, 'error');
			}
		}
	}
	
	function discardChanges() {
		if (unsavedChanges && confirm('You have unsaved changes. Are you sure you want to discard them?')) {
			goto('/collections');
		} else if (!unsavedChanges) {
			goto('/collections');
		}
	}
	
	function handleImageUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			selectedImages = Array.from(input.files);
		}
	}
	
	function removeImage() {
		selectedImages = [];
		imageUrl = '';
		unsavedChanges = true;
	}
	
	// Load available products for browsing
	async function loadAvailableProducts() {
		if (loadingProducts) return;
		
		loadingProducts = true;
		try {
			const response = await fetch('/api/products');
			if (response.ok) {
				availableProducts = await response.json();
			}
		} catch (error) {
			console.error('Failed to load products:', error);
		} finally {
			loadingProducts = false;
		}
	}
	
	function toggleProductBrowser() {
		showProductBrowser = !showProductBrowser;
		if (showProductBrowser && availableProducts.length === 0) {
			loadAvailableProducts();
		}
	}
	
	async function removeProductFromCollection(productId: string) {
		try {
			// Remove from collection via API
			const currentProductIds = products.filter(p => p.id !== productId).map(p => p.id);
			
			const response = await fetch(`/api/collections/${collection.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name,
					description,
					image_url: imageUrl,
					sort_order: sortOrder,
					product_ids: currentProductIds
				})
			});
			
			if (response.ok) {
				// Update local state
				collection.products = products.filter(p => p.id !== productId);
				showToast('Product removed from collection', 'success');
			} else {
				throw new Error('Failed to remove product');
			}
		} catch (error) {
			showToast('Error removing product: ' + error.message, 'error');
		}
	}
	
	// Filter available products to exclude those already in collection
	let filteredAvailableProducts = $derived(
		availableProducts.filter(product => 
			!products.some(p => p.id === product.id) &&
			product.name.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);
	
	async function addProductToCollection(product: any) {
		try {
			const currentProductIds = products.map(p => p.id);
			const newProductIds = [...currentProductIds, product.id];
			
			const response = await fetch(`/api/collections/${collection.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name,
					description,
					image_url: imageUrl,
					sort_order: sortOrder,
					product_ids: newProductIds
				})
			});
			
			if (response.ok) {
				// Update local state
				collection.products = [...products, product];
				showToast('Product added to collection', 'success');
			} else {
				throw new Error('Failed to add product');
			}
		} catch (error) {
			showToast('Error adding product: ' + error.message, 'error');
		}
	}
	
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
	<title>{collection?.name || 'Collection'} - BetterCallSold</title>
</svelte:head>

{#if loading}
	<!-- Loading State -->
	<div class="page loading-page">
		<div class="page-header">
			<div class="header-main">
				<div class="header-left">
					<button class="back-button" onclick={() => goto('/collections')}>
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
			<div class="content-grid">
				<div class="main-content">
					<div class="form-section">
						<div class="loading-skeleton" style="height: 40px; margin-bottom: 1rem;"></div>
						<div class="loading-skeleton" style="height: 120px;"></div>
					</div>
				</div>
				<div class="sidebar">
					<div class="sidebar-section">
						<div class="loading-skeleton" style="height: 100px;"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else if error}
	<div class="error-page">
		<div class="error-content">
			<div class="error-icon">⚠</div>
			<h1>Error Loading Collection</h1>
			<p>{error}</p>
			<div class="error-actions">
				<button onclick={retryLoad} class="btn-primary" disabled={retrying}>
					{#if retrying}
						<span class="loading-spinner"></span>
					{/if}
					{retrying ? 'Retrying...' : 'Try Again'}
				</button>
				<button onclick={() => goto('/collections')} class="btn-secondary">Back to Collections</button>
			</div>
		</div>
	</div>
{:else if collection}
	<div class="page">
		<!-- Header -->
		<div class="page-header">
			<div class="header-main">
				<div class="header-left">
					<button class="back-button" onclick={() => goto('/collections')}>
						←
					</button>
					<h1>{collection.name}</h1>
					{#if unsavedChanges}
						<span class="unsaved-indicator">● Unsaved changes</span>
					{/if}
				</div>
				<div class="header-actions">
					<button class="btn-secondary">View</button>
					<div class="more-actions">
						<button class="btn-secondary dropdown-trigger">
							More actions ▼
						</button>
						<div class="dropdown-menu">
							<button class="dropdown-item danger" onclick={deleteCollection}>
								Delete collection
							</button>
						</div>
					</div>
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
							bind:value={name}
							placeholder="e.g. Summer collection, Under $100, Staff picks"
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
							placeholder="Describe your collection..."
						></textarea>
					</div>

					<!-- Products -->
					<div class="form-section">
						<div class="products-header">
							<h3 class="section-title">Products</h3>
							<div class="products-controls">
								<div class="search-box">
									<input 
										type="text" 
										placeholder="Search products"
										bind:value={searchTerm}
										class="search-input"
									/>
								</div>
								<button class="btn-secondary" onclick={toggleProductBrowser}>
									Browse
								</button>
								<div class="sort-dropdown">
									<select class="form-select">
										<option>Sort: Best selling</option>
										<option>Sort: Alphabetical</option>
										<option>Sort: Date added</option>
									</select>
								</div>
							</div>
						</div>

						{#if products.length > 0}
							<div class="products-list">
								{#each products as product, index}
									<div class="product-item">
										<div class="product-number">{index + 1}.</div>
										<div class="product-image">
											{#if getFirstImage(product)}
												<img 
													src={getFirstImage(product)} 
													alt={product.name}
													loading="lazy"
												/>
											{:else}
												<div class="image-placeholder">📦</div>
											{/if}
										</div>
										<div class="product-details">
											<div class="product-name">{product.name}</div>
											<div class="product-status">
												<span class="status-badge active">Active</span>
											</div>
										</div>
										<button 
											class="remove-product" 
											onclick={() => removeProductFromCollection(product.id)}
											title="Remove from collection"
										>
											×
										</button>
									</div>
								{/each}
							</div>
						{:else}
							<div class="empty-products">
								<p>No products in this collection yet.</p>
								<button class="btn-primary" onclick={toggleProductBrowser}>
									Add products
								</button>
							</div>
						{/if}

						<!-- Product Browser Modal -->
						{#if showProductBrowser}
							<div class="modal-overlay" onclick={toggleProductBrowser}>
								<div class="modal-content" onclick={(e) => e.stopPropagation()}>
									<div class="modal-header">
										<h3>Add Products to Collection</h3>
										<button class="modal-close" onclick={toggleProductBrowser}>×</button>
									</div>
									<div class="modal-body">
										<div class="search-box">
											<input 
												type="text" 
												placeholder="Search products..."
												bind:value={searchTerm}
												class="search-input"
											/>
										</div>
										{#if loadingProducts}
											<div class="loading">Loading products...</div>
										{:else if filteredAvailableProducts.length > 0}
											<div class="available-products">
												{#each filteredAvailableProducts as product}
													<div class="available-product-item">
														<div class="product-image">
															{#if getFirstImage(product)}
																<img 
																	src={getFirstImage(product)} 
																	alt={product.name}
																	loading="lazy"
																/>
															{:else}
																<div class="image-placeholder">📦</div>
															{/if}
														</div>
														<div class="product-details">
															<div class="product-name">{product.name}</div>
															<div class="product-price">${product.price}</div>
														</div>
														<button 
															class="btn-primary btn-sm"
															onclick={() => addProductToCollection(product)}
														>
															Add
														</button>
													</div>
												{/each}
											</div>
										{:else}
											<div class="no-products">
												<p>No products available to add.</p>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Sidebar -->
				<div class="sidebar">
					<!-- Publishing -->
					<div class="sidebar-section">
						<div class="section-header">
							<h3 class="sidebar-title">Publishing</h3>
							<button class="manage-link">Manage</button>
						</div>
						
						<div class="publishing-info">
							<div class="channel-status">
								<div class="channel-indicator active"></div>
								<span>Online Store</span>
								<button class="channel-settings">⚙</button>
							</div>
							<div class="publishing-note">
								<div class="info-icon">ℹ</div>
								<div class="note-content">
									<p>To add this collection to your online store's navigation, you need to <a href="#" class="link">update your menu</a></p>
								</div>
								<button class="dismiss-note">×</button>
							</div>
						</div>
					</div>

					<!-- Image -->
					<div class="sidebar-section">
						<h3 class="sidebar-title">Image</h3>
						<div class="image-upload">
							{#if imageUrl && selectedImages.length === 0}
								<div class="current-image">
									<img src={imageUrl} alt="Collection image" />
									<button type="button" class="remove-image" onclick={removeImage}>×</button>
								</div>
							{/if}
							{#if selectedImages.length > 0}
								<div class="image-preview">
									<img src={URL.createObjectURL(selectedImages[0])} alt="Preview" />
									<button type="button" class="remove-image" onclick={() => selectedImages = []}>×</button>
								</div>
							{/if}
							<div class="upload-area">
								<input type="file" id="image-upload" accept="image/*" onchange={handleImageUpload} class="file-input" />
								<label for="image-upload" class="upload-label">
									<div class="upload-content">
										<span class="upload-text">Add image</span>
										<span class="upload-hint">or drop an image to upload</span>
									</div>
								</label>
							</div>
						</div>
					</div>

					<!-- Theme template -->
					<div class="sidebar-section">
						<h3 class="sidebar-title">Theme template</h3>
						<select class="form-select">
							<option>Default collection</option>
						</select>
					</div>

					<!-- Save/Discard -->
					<div class="sidebar-actions">
						<button class="btn-secondary" onclick={discardChanges}>
							Discard
						</button>
						<button class="btn-primary" onclick={saveCollection} disabled={saving || uploading}>
							{#if saving || uploading}
								<span class="loading-spinner"></span>
							{/if}
							{uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save'}
						</button>
					</div>
				</div>
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
		align-items: center;
	}

	.more-actions {
		position: relative;
	}

	.dropdown-trigger {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		background: white;
		border: 1px solid #c9cccf;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		z-index: 100;
		min-width: 180px;
		margin-top: 0.25rem;
		display: none;
	}

	.more-actions:hover .dropdown-menu {
		display: block;
	}

	.dropdown-item {
		width: 100%;
		background: none;
		border: none;
		padding: 0.75rem 1rem;
		text-align: left;
		cursor: pointer;
		font-size: 0.875rem;
		color: #202223;
	}

	.dropdown-item:hover {
		background: #f6f6f7;
	}

	.dropdown-item.danger {
		color: #d72c0d;
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

	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
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

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
		margin: 0 0 1rem 0;
	}

	.products-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.products-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.search-box {
		position: relative;
	}

	.search-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
		width: 200px;
	}

	.sort-dropdown select {
		padding: 0.5rem 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
	}

	.products-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.product-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid #e1e3e5;
		border-radius: 8px;
		background: white;
	}

	.product-number {
		font-weight: 500;
		color: #6d7175;
		min-width: 20px;
	}

	.product-image {
		width: 48px;
		height: 48px;
		background: #f6f6f7;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
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
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.product-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-badge.active {
		background: #d1fae5;
		color: #047857;
	}

	.remove-product {
		background: none;
		border: none;
		color: #6d7175;
		cursor: pointer;
		font-size: 1.25rem;
		padding: 0.25rem;
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.remove-product:hover {
		background: #fef2f2;
		color: #d72c0d;
	}

	.empty-products {
		text-align: center;
		padding: 2rem;
		color: #6d7175;
	}

	.empty-products p {
		margin-bottom: 1rem;
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

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.sidebar-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
		margin: 0;
	}

	.manage-link {
		background: none;
		border: none;
		color: #005bd3;
		font-size: 0.875rem;
		cursor: pointer;
		text-decoration: underline;
	}

	.publishing-info {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.channel-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.channel-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #00a96e;
	}

	.channel-settings {
		background: none;
		border: none;
		color: #6d7175;
		cursor: pointer;
		margin-left: auto;
	}

	.publishing-note {
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.info-icon {
		color: #0284c7;
		font-weight: bold;
		flex-shrink: 0;
	}

	.note-content {
		flex: 1;
		font-size: 0.875rem;
		color: #334155;
		line-height: 1.4;
	}

	.note-content p {
		margin: 0;
	}

	.link {
		color: #005bd3;
		text-decoration: none;
	}

	.link:hover {
		text-decoration: underline;
	}

	.dismiss-note {
		background: none;
		border: none;
		color: #64748b;
		cursor: pointer;
		font-size: 1rem;
		flex-shrink: 0;
	}

	.image-upload {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.current-image, .image-preview {
		position: relative;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid #e1e3e5;
	}

	.current-image img, .image-preview img {
		width: 100%;
		height: 150px;
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

	.upload-text {
		font-weight: 500;
		color: #202223;
	}

	.upload-hint {
		color: #6d7175;
		font-size: 0.8125rem;
	}

	.sidebar-actions {
		display: flex;
		gap: 0.75rem;
	}

	.sidebar-actions .btn-secondary,
	.sidebar-actions .btn-primary {
		flex: 1;
		justify-content: center;
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

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		text-align: center;
		padding: 2rem;
	}

	/* Loading Skeleton Styles */
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
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: #f6f6f7;
		padding: 2rem;
	}
	
	.error-content {
		text-align: center;
		max-width: 400px;
		background: white;
		border-radius: 12px;
		padding: 3rem 2rem;
		border: 1px solid #e1e1e1;
	}
	
	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		color: #d72c0d;
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
		gap: 1rem;
		justify-content: center;
	}

	/* Modal Styles */
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

	.modal-content {
		background: white;
		border-radius: 12px;
		max-width: 600px;
		width: 100%;
		max-height: 80vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #e1e3e5;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.modal-header h3 {
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
	}

	.modal-body {
		padding: 1.5rem 2rem;
		overflow-y: auto;
		flex: 1;
	}

	.available-products {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.available-product-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		border: 1px solid #e1e3e5;
		border-radius: 8px;
		background: #fafbfb;
	}

	.product-price {
		color: #6d7175;
		font-size: 0.875rem;
	}

	.no-products {
		text-align: center;
		padding: 2rem;
		color: #6d7175;
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
		
		.products-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}
		
		.products-controls {
			flex-wrap: wrap;
		}
	}
</style>