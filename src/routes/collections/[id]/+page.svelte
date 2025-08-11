<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { collectionsState, collectionsActions, getCurrentCollectionDisplay } from '$lib/state/collections.svelte.js';
	import { productsState, productsActions } from '$lib/state/products.svelte.js';
	import { ToastService } from '$lib/services/ToastService.js';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import type { CollectionFormData } from '$lib/types/products';
	
	let { data }: { data: PageData } = $props();
	
	const collectionId = data.collectionId;
	
	// Form data for editing
	let formData: CollectionFormData = $state({
		name: '',
		description: '',
		image_url: '',
		sort_order: 0,
		images: []
	});
	
	// Product management state
	let searchTerm = $state('');
	let showProductBrowser = $state(false);
	
	// Computed values from global state
	let currentDisplay = $derived(getCurrentCollectionDisplay());
	let collection = $derived(collectionsState.currentCollection);
	let products = $derived(collection?.products || []);
	let loading = $derived(collectionsState.loading.current);
	let hasErrors = $derived(Boolean(collectionsState.errors.current));
	let updating = $derived(collectionsState.loading.updating);
	let uploading = $derived(collectionsState.form.uploading);
	let unsavedChanges = $derived(collectionsState.form.unsavedChanges);
	
	// Available products for browser
	let availableProducts = $derived(productsState.products);
	let loadingProducts = $derived(productsState.loading.list);
	
	
	// Initialize form data from collection
	function initializeFormData(collectionData: any) {
		formData = {
			name: collectionData.name || '',
			description: collectionData.description || '',
			image_url: collectionData.image_url || '',
			sort_order: collectionData.sort_order || 0,
			images: []
		};
	}
	
	// Load collection and available products on mount
	$effect(() => {
		if (collectionId && (!collection || collection.id !== collectionId)) {
			collectionsActions.loadCollection(collectionId);
		}
	});
	
	// Load products if not already loaded - with dependency tracking
	$effect(() => {
		if (!productsState.loading.list && (!productsState.lastFetch || productsState.products.length === 0)) {
			productsActions.loadProducts();
		}
	});
	
	// Initialize form when collection loads
	$effect(() => {
		if (collection && collection.id === collectionId) {
			initializeFormData(collection);
		}
	});
	
	// Track changes to mark as unsaved
	$effect(() => {
		// Mark as having unsaved changes when form data differs from collection
		if (collection && (
			formData.name !== collection.name ||
			formData.description !== collection.description ||
			formData.image_url !== collection.image_url ||
			formData.images.length > 0
		)) {
			collectionsActions.markUnsavedChanges();
		}
	});
	
	// Handle form field changes
	function handleFormChange(updatedData: Partial<CollectionFormData>) {
		formData = { ...formData, ...updatedData };
	}
	
	// Handle form submission for updates
	async function handleSubmit(data: CollectionFormData) {
		if (!collection) return;
		
		try {
			const result = await collectionsActions.updateCollection(collection.id, data, data.images);
			ToastService.show('Collection updated successfully!', 'success');
			
			// Clear new images after successful update
			formData.images = [];
			collectionsActions.clearForm();
		} catch (error) {
			ToastService.show('Error updating collection: ' + error.message, 'error');
		}
	}
	
	// Delete collection handler
	async function handleDelete() {
		if (!collection) return;
		
		if (confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
			try {
				await collectionsActions.deleteCollection(collection.id);
				ToastService.show('Collection deleted successfully!', 'success');
				
				setTimeout(() => {
					goto('/collections');
				}, 1000);
			} catch (error) {
				ToastService.show('Error deleting collection: ' + error.message, 'error');
			}
		}
	}
	
	function discardChanges() {
		if (unsavedChanges && confirm('You have unsaved changes. Are you sure you want to discard them?')) {
			collectionsActions.clearForm();
			goto('/collections');
		} else if (!unsavedChanges) {
			goto('/collections');
		}
	}
	
	function handleRetry() {
		collectionsActions.retry();
	}
	
	function handleImageUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			handleFormChange({ images: Array.from(input.files) });
		}
	}
	
	function removeImage(index: number) {
		const updatedImages = formData.images.filter((_, i) => i !== index);
		handleFormChange({ images: updatedImages, image_url: '' });
	}
	
	function toggleProductBrowser() {
		showProductBrowser = !showProductBrowser;
		if (showProductBrowser && availableProducts.length === 0 && !loadingProducts) {
			productsActions.loadProducts();
		}
	}
	
	async function removeProductFromCollection(productId: string) {
		if (!collection) return;
		
		try {
			await collectionsActions.removeProductsFromCollection(collection.id, [productId]);
			ToastService.show('Product removed from collection', 'success');
		} catch (error) {
			ToastService.show('Error removing product: ' + error.message, 'error');
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
		if (!collection) return;
		
		try {
			await collectionsActions.addProductsToCollection(collection.id, [product.id]);
			ToastService.show('Product added to collection', 'success');
		} catch (error) {
			ToastService.show('Error adding product: ' + error.message, 'error');
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
	<LoadingState 
		message="Loading collection details..."
		subMessage="Please wait while we fetch the collection information"
		showBackButton={true}
		onBack={() => goto('/collections')}
	/>
{:else if hasErrors}
	<ErrorState 
		message="Error Loading Collection"
		errorText={collectionsState.errors.current || 'Unable to load collection details'}
		onRetry={handleRetry}
		showBackButton={true}
		onBack={() => goto('/collections')}
	/>
{:else if collection}
	<div class="page">
		<!-- Header -->
		<div class="page-header">
			<div class="page-header-content">
				<div class="page-header-nav">
					<button class="btn-icon" onclick={() => goto('/collections')}>
						←
					</button>
					<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
						<span class="breadcrumb-item current">{collection.name}</span>
						{#if unsavedChanges}
							<span class="badge badge-warning" style="margin-left: var(--space-2);">● Unsaved</span>
						{/if}
					</div>
				</div>
				<div class="page-actions">
					<button class="btn btn-secondary">View</button>
					<div class="dropdown">
						<button class="btn btn-secondary dropdown-trigger">
							More actions
							<span class="dropdown-icon">▼</span>
						</button>
						<div class="dropdown-content">
							<div class="dropdown-item dropdown-item-danger" onclick={handleDelete}>
								Delete collection
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="page-content">
			<div class="content-layout">
				<!-- Main Content -->
				<div class="content-main">
					<!-- Title -->
					<div class="form-section">
						<div class="form-field">
							<label class="form-label" for="title">Title</label>
							<input 
								id="title"
								type="text" 
								class="form-input"
								value={formData.name}
								oninput={(e) => handleFormChange({ name: e.target.value })}
								placeholder="e.g. Summer collection, Under $100, Staff picks"
							/>
						</div>
					</div>

					<!-- Description -->
					<div class="form-section">
						<div class="form-field">
							<label class="form-label" for="description">Description</label>
							<div class="form-toolbar">
								<select class="form-toolbar-select">
									<option>Paragraph</option>
								</select>
								<div class="form-toolbar-buttons">
									<button type="button" class="form-toolbar-btn"><strong>B</strong></button>
									<button type="button" class="form-toolbar-btn"><em>I</em></button>
									<button type="button" class="form-toolbar-btn"><u>U</u></button>
									<button type="button" class="form-toolbar-btn">•</button>
									<button type="button" class="form-toolbar-btn">≡</button>
									<button type="button" class="form-toolbar-btn">🔗</button>
									<button type="button" class="form-toolbar-btn">📷</button>
									<button type="button" class="form-toolbar-btn">⚙️</button>
									<button type="button" class="form-toolbar-btn">&lt;/&gt;</button>
								</div>
							</div>
							<textarea 
								id="description"
								class="form-textarea"
								value={formData.description}
								oninput={(e) => handleFormChange({ description: e.target.value })}
								rows="6"
								placeholder="Describe your collection..."
							></textarea>
						</div>
					</div>

					<!-- Products -->
					<div class="content-section">
						<div class="content-header">
							<h3 class="content-title">Products</h3>
							<div class="content-controls">
								<div class="form-field form-field-inline" style="margin-bottom: 0;">
									<input 
										type="text" 
										placeholder="Search products"
										bind:value={searchTerm}
										class="form-input form-input-sm"
									/>
								</div>
								<button class="btn btn-secondary" onclick={toggleProductBrowser}>
									Browse
								</button>
								<div class="form-field form-field-inline" style="margin-bottom: 0;">
									<select class="form-select form-select-sm">
										<option>Sort: Best selling</option>
										<option>Sort: Alphabetical</option>
										<option>Sort: Date added</option>
									</select>
								</div>
							</div>
						</div>
						<div class="content-body">

						{#if products.length > 0}
							<div class="content-flow">
								{#each products as product, index}
									<div class="card card-interactive">
										<div class="card-content">
											<div class="card-meta">{index + 1}.</div>
											<div class="card-media">
												{#if getFirstImage(product)}
													<img 
														src={getFirstImage(product)} 
														alt={product.name}
														loading="lazy"
													/>
												{:else}
													<div class="card-media-placeholder">📦</div>
												{/if}
											</div>
											<div class="card-details">
												<div class="card-title">{product.name}</div>
												<div class="card-subtitle">
													<span class="badge badge-success">Active</span>
												</div>
											</div>
											<button 
												class="btn-icon btn-ghost card-action" 
												onclick={() => removeProductFromCollection(product.id)}
												title="Remove from collection"
											>
												×
											</button>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="empty-state">
								<div class="empty-state-content">
									<p class="empty-state-message">No products in this collection yet.</p>
									<div class="empty-state-actions">
										<button class="btn btn-primary" onclick={toggleProductBrowser}>
											Add products
										</button>
									</div>
								</div>
							</div>
						{/if}

						<!-- Product Browser Modal -->
						{#if showProductBrowser}
							<div class="modal-overlay" onclick={toggleProductBrowser}>
								<div class="modal-content modal-content-lg" onclick={(e) => e.stopPropagation()}>
									<div class="modal-header">
										<h3 class="modal-title">Add Products to Collection</h3>
										<button class="modal-close" onclick={toggleProductBrowser}>×</button>
									</div>
									<div class="modal-body">
										<div class="form-field">
											<input 
												type="text" 
												placeholder="Search products..."
												bind:value={searchTerm}
												class="form-input"
											/>
										</div>
										{#if loadingProducts}
											<div class="loading-state">
												<div class="loading-spinner"></div>
												<p class="loading-text">Loading products...</p>
											</div>
										{:else if filteredAvailableProducts.length > 0}
											<div class="content-flow">
												{#each filteredAvailableProducts as product}
													<div class="card">
														<div class="card-content">
															<div class="card-media">
																{#if getFirstImage(product)}
																	<img 
																		src={getFirstImage(product)} 
																		alt={product.name}
																		loading="lazy"
																	/>
																{:else}
																	<div class="card-media-placeholder">📦</div>
																{/if}
															</div>
															<div class="card-details">
																<div class="card-title">{product.name}</div>
																<div class="card-subtitle">${product.price}</div>
															</div>
															<button 
																class="btn btn-primary btn-sm"
																onclick={() => addProductToCollection(product)}
															>
																Add
															</button>
														</div>
													</div>
												{/each}
											</div>
										{:else}
											<div class="empty-state">
												<div class="empty-state-content">
													<p class="empty-state-message">No products available to add.</p>
												</div>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/if}
						</div>
					</div>
				</div>

				<!-- Sidebar -->
				<div class="content-sidebar">
					<!-- Publishing -->
					<div class="sidebar-section">
						<div class="sidebar-header">
							<h3 class="sidebar-title">Publishing</h3>
							<button class="btn btn-tertiary btn-sm">Manage</button>
						</div>
						
						<div class="form-field">
							<div class="form-status-item">
								<div class="status-indicator status-active"></div>
								<span class="status-label">Online Store</span>
								<button class="btn-icon btn-sm">⚙</button>
							</div>
						</div>
						<div class="notice notice-info">
							<div class="notice-icon">ℹ</div>
							<div class="notice-content">
								<p class="notice-message">To add this collection to your online store's navigation, you need to <a href="#" class="link">update your menu</a></p>
							</div>
							<button class="notice-dismiss">×</button>
						</div>
					</div>

					<!-- Image -->
					<div class="sidebar-section">
						<h3 class="sidebar-title">Image</h3>
						<div class="media-upload">
							{#if formData.image_url && formData.images.length === 0}
								<div class="image-preview">
									<img src={formData.image_url} alt="Collection image" />
									<div class="image-controls">
										<button type="button" class="image-control-btn danger" onclick={() => removeImage(0)}>×</button>
									</div>
								</div>
							{/if}
							{#if formData.images.length > 0}
								<div class="image-preview">
									<img src={URL.createObjectURL(formData.images[0])} alt="Preview" />
									<div class="image-controls">
										<button type="button" class="image-control-btn danger" onclick={() => handleFormChange({ images: [] })}>×</button>
									</div>
								</div>
							{/if}
							<input type="file" id="image-upload" accept="image/*" onchange={handleImageUpload} class="form-file-input" />
							<label for="image-upload" class="form-file-label">
								<div class="form-file-content">
									<div class="form-file-text">Add image</div>
									<div class="form-file-hint">or drop an image to upload</div>
								</div>
							</label>
						</div>
					</div>

					<!-- Theme template -->
					<div class="sidebar-section">
						<h3 class="sidebar-title">Theme template</h3>
						<div class="form-field">
							<select class="form-select">
								<option>Default collection</option>
							</select>
						</div>
					</div>

					<!-- Save/Discard -->
					<div class="sidebar-section">
						<div class="form-actions">
							<button class="btn btn-secondary" onclick={discardChanges}>
								Discard
							</button>
							<button class="btn btn-primary" onclick={() => handleSubmit(formData)} disabled={updating || uploading}>
								{#if updating || uploading}
									<span class="loading-spinner"></span>
								{/if}
								{uploading ? 'Uploading...' : updating ? 'Saving...' : 'Save'}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}


<style>
	/* Minimal custom styles - most styling now handled by design system */
	
	/* Content layout specific to collections detail page */
	.content-layout {
		grid-template-columns: 1fr 300px;
	}

	/* All header, form, table, modal, toast, sidebar, and other component styles now handled by design system */
	
	/* Responsive adjustments not covered by design system */
	@media (max-width: 1024px) {
		.content-layout {
			grid-template-columns: 1fr;
		}
		
		.content-sidebar {
			order: -1;
		}
	}

	@media (max-width: 768px) {
		.products-grid {
			grid-template-columns: 1fr;
			gap: var(--space-3);
		}
	}
</style>
