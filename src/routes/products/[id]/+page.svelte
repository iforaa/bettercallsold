<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { productsState, productsActions } from '$lib/state/products.svelte.js';
	import { ToastService } from '$lib/services/ToastService.js';
	import ProductForm from '$lib/components/products/ProductForm.svelte';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import type { ProductFormData } from '$lib/types/products';
	
	let { data }: { data: PageData } = $props();
	
	const productId = data.productId;
	
	// Form data for editing
	let formData: ProductFormData = $state({
		title: '',
		name: '',
		description: '',
		price: '',
		comparePrice: '',
		status: 'active',
		chargesTax: true,
		tags: '',
		collections: [],
		images: [],
		variants: []
	});

	// Computed values from global state
	let currentProduct = $derived(productsState.currentProduct);
	let collections = $derived(productsState.collections);
	let loading = $derived(productsState.loading.current); // Only check current product loading
	let hasErrors = $derived(Boolean(productsState.errors.current));
	let updating = $derived(productsState.loading.updating);
	let uploading = $derived(productsState.form.uploading);
	let unsavedChanges = $derived(productsState.form.unsavedChanges);

	// Initialize form data from loaded product
	function initializeFormData(productData: any) {
		if (!productData) return;

		formData = {
			title: productData.name || '',
			name: productData.name || '',
			description: productData.description || '',
			price: productData.price?.toString() || '',
			comparePrice: productData.compare_price?.toString() || '',
			status: productData.status || 'active',
			chargesTax: Boolean(productData.charges_tax),
			tags: Array.isArray(productData.tags) ? productData.tags.join(', ') : (productData.tags || ''),
			collections: productData.product_collections?.map(c => c.id) || [],
			images: [], // New images to upload (existing images handled separately)
			variants: productData.inventory_items?.map(item => ({
				id: item.id,
				size: item.variant_combination?.size || '',
				color: item.variant_combination?.color || '',
				price: item.price || productData.price,
				inventory_quantity: item.quantity || 0,
				sku: item.sku || '',
				position: item.position || 1
			})) || []
		};
	}

	// Load product and collections on mount and route changes
	$effect(() => {
		if (productId && (!currentProduct || currentProduct.id !== productId)) {
			productsActions.loadProduct(productId);
		}
	});

	$effect(() => {
		if (!collections.length) {
			productsActions.loadCollections();
		}
	});

	// Initialize form when product loads
	$effect(() => {
		if (currentProduct && currentProduct.id === productId) {
			initializeFormData(currentProduct);
		}
	});
	// Handle form field changes
	function handleFormChange(updatedData: Partial<ProductFormData>) {
		formData = { ...formData, ...updatedData };
	}

	// Handle form submission for updates
	async function handleSubmit(data: ProductFormData) {
		if (!currentProduct) return;
		
		try {
			const result = await productsActions.updateProduct(currentProduct.id, data, data.images);
			ToastService.show('Product updated successfully!', 'success');
			
			// Clear new images after successful update
			formData.images = [];
			productsActions.clearForm();
		} catch (error) {
			ToastService.show('Error updating product: ' + error.message, 'error');
		}
	}

	// Delete product handler  
	async function handleDelete() {
		if (!currentProduct) return;
		
		if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
			try {
				await productsActions.deleteProduct(currentProduct.id);
				ToastService.show('Product deleted successfully!', 'success');
				
				setTimeout(() => {
					goto('/products');
				}, 1000);
			} catch (error) {
				ToastService.show('Error deleting product: ' + error.message, 'error');
			}
		}
	}

	function discardChanges() {
		if (unsavedChanges && confirm('You have unsaved changes. Are you sure you want to discard them?')) {
			productsActions.clearForm();
			goto('/products');
		} else if (!unsavedChanges) {
			goto('/products');
		}
	}

	function handleRetry() {
		productsActions.retry();
	}
</script>

<svelte:head>
	<title>{currentProduct?.name || 'Product'} - BetterCallSold</title>
</svelte:head>

{#if loading}
	<LoadingState 
		message="Loading product details..."
		subMessage="Please wait while we fetch the product information"
		showBackButton={true}
		onBack={() => goto('/products')}
	/>
{:else if hasErrors}
	<ErrorState 
		message="Error Loading Product"
		errorText={productsState.errors.current || 'Unable to load product details'}
		onRetry={handleRetry}
		showBackButton={true}
		onBack={() => goto('/products')}
	/>
{:else if currentProduct}
	<div class="page">
		<!-- Header -->
		<div class="page-header page-header-sticky">
			<div class="page-header-content">
				<div class="flex-header">
					<button class="btn btn-icon" onclick={discardChanges}>
						←
					</button>
					<h1 class="page-title">{currentProduct.name}</h1>
					{#if unsavedChanges}
						<span class="status-badge status-warning">● Unsaved changes</span>
					{/if}
				</div>
				<div class="page-actions">
					<button class="btn btn-danger" onclick={handleDelete}>
						Delete
					</button>
					<button class="btn btn-secondary" onclick={discardChanges}>
						Discard
					</button>
					<button class="btn btn-primary" onclick={() => handleSubmit(formData)} disabled={updating || uploading}>
						{#if updating || uploading}
							<span class="spinner"></span>
						{/if}
						{uploading ? 'Uploading...' : updating ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
		</div>

		<div class="page-content">
			<ProductForm 
				formData={formData}
				collections={collections}
				uploading={uploading}
				onSubmit={handleSubmit}
				onFormChange={handleFormChange}
			/>

			<!-- Additional Product Info Sidebar -->
			<div class="content-sidebar">
				<div class="sidebar-section">
					<h3 class="sidebar-title">Product Info</h3>
					<div class="details">
						<div class="detail-item">
							<span class="detail-label">Created:</span>
							<span class="detail-value">{new Date(currentProduct.created_at).toLocaleDateString()}</span>
						</div>
						<div class="detail-item">
							<span class="detail-label">Updated:</span>
							<span class="detail-value">{new Date(currentProduct.updated_at).toLocaleDateString()}</span>
						</div>
						<div class="detail-item">
							<span class="detail-label">ID:</span>
							<span class="detail-value">{currentProduct.id}</span>
						</div>
						{#if currentProduct.inventory_items && currentProduct.inventory_items.length > 0}
							<div class="detail-item">
								<span class="detail-label">Total Inventory:</span>
								<span class="detail-value">
									{currentProduct.inventory_items.reduce((total, item) => total + (item.quantity || 0), 0)} available
								</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Quick Variant Access -->
				{#if currentProduct.inventory_items && currentProduct.inventory_items.length > 0}
					<div class="sidebar-section">
						<h3 class="sidebar-title">Quick Actions</h3>
						<div class="sidebar-actions">
							<button class="btn btn-secondary btn-sm" onclick={() => goto(`/products/${productId}/variants`)}>
								Manage Variants
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<ErrorState 
		message="Product Not Found"
		errorText="The product you're looking for doesn't exist or has been removed."
		icon="📦"
		showBackButton={true}
		onBack={() => goto('/products')}
		backButtonText="Back to Products"
	/>
{/if}

<style>
	/* Sidebar specific styles for product details */
	.sidebar-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-border-light);
	}

	.detail-item:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
	}

	.detail-value {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		font-weight: var(--font-weight-medium);
	}
</style>