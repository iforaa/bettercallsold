<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
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
			console.log('Product Detail - Current product loaded:', currentProduct);
			console.log('Product Detail - Raw images field:', currentProduct.images);
			console.log('Product Detail - Images type:', typeof currentProduct.images);
			
			// Parse images for logging
			let parsedImages = [];
			if (currentProduct.images) {
				try {
					parsedImages = Array.isArray(currentProduct.images) ? currentProduct.images : JSON.parse(currentProduct.images);
					console.log('Product Detail - Parsed images:', parsedImages);
				} catch (error) {
					console.log('Product Detail - Failed to parse images:', error);
				}
			}
			
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
			navigateBack();
		} else if (!unsavedChanges) {
			navigateBack();
		}
	}

	function navigateBack() {
		// Check if we came from an order or waitlist details page
		const from = $page.url.searchParams.get('from');
		const orderId = $page.url.searchParams.get('orderId');
		const waitlistId = $page.url.searchParams.get('waitlistId');
		
		if (from === 'order' && orderId) {
			goto(`/orders/${orderId}`);
		} else if (from === 'waitlist' && waitlistId) {
			goto(`/waitlists/${waitlistId}`);
		} else {
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
		onBack={navigateBack}
	/>
{:else if hasErrors}
	<ErrorState 
		message="Error Loading Product"
		errorText={productsState.errors.current || 'Unable to load product details'}
		onRetry={handleRetry}
		showBackButton={true}
		onBack={navigateBack}
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

		<div class="page-content-padded">
			<ProductForm 
				formData={formData}
				collections={collections}
				uploading={uploading}
				currentProduct={currentProduct}
				existingImages={currentProduct?.images ? (Array.isArray(currentProduct.images) ? currentProduct.images : JSON.parse(currentProduct.images || '[]')) : []}
				onSubmit={handleSubmit}
				onFormChange={handleFormChange}
			/>
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

