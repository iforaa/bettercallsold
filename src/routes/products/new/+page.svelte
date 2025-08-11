<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { productsState, productsActions } from '$lib/state/products.svelte.js';
	import { ToastService } from '$lib/services/ToastService.js';
	import ProductForm from '$lib/components/products/ProductForm.svelte';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import type { ProductFormData } from '$lib/types/products';

	let { data }: { data: PageData } = $props();
	
	// Initialize form data
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
	let collections = $derived(productsState.collections);
	let creating = $derived(productsState.loading.creating);
	let uploading = $derived(productsState.form.uploading);
	let unsavedChanges = $derived(productsState.form.unsavedChanges);

	// Load collections on mount
	$effect(() => {
		if (!productsState.collections.length) {
			productsActions.loadCollections();
		}
	});

	// Track form changes
	$effect(() => {
		const hasContent = formData.title || formData.description || formData.price || 
		                  formData.images.length > 0 || formData.collections.length > 0;
		if (hasContent) {
			productsActions.setFormData(formData);
		}
	});

	// Handle form field changes
	function handleFormChange(updatedData: Partial<ProductFormData>) {
		formData = { ...formData, ...updatedData };
	}

	// Handle form submission
	async function handleSubmit(data: ProductFormData) {
		try {
			const result = await productsActions.createProduct(data, data.images);
			ToastService.show('Product created successfully!', 'success');
			
			// Clear form and redirect
			productsActions.clearForm();
			setTimeout(() => {
				goto(`/products/${result.data.id}`);
			}, 1000);
		} catch (error) {
			ToastService.show('Error creating product: ' + error.message, 'error');
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
</script>

<svelte:head>
	<title>Add product - BetterCallSold</title>
</svelte:head>

<div class="page">
	<!-- Header -->
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<button class="btn-icon" onclick={() => goto('/products')}>
					←
				</button>
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item">Add product</span>
					{#if unsavedChanges}
						<span class="badge badge-warning" style="margin-left: var(--space-2);">● Unsaved</span>
					{/if}
				</div>
			</div>
			<div class="page-actions">
				<button class="btn btn-secondary" onclick={discardChanges}>
					Discard
				</button>
				<button class="btn btn-primary" onclick={() => handleSubmit(formData)} disabled={creating || uploading}>
					{#if creating || uploading}
						<span class="loading-spinner"></span>
					{/if}
					{uploading ? 'Uploading...' : creating ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>

	<div class="page-content">
		{#if productsState.loading.collections}
			<div class="page-content-padded">
				<LoadingState 
					message="Loading collections..." 
					size="md"
				/>
			</div>
		{:else}
			<!-- Product Form Component -->
			<ProductForm 
				{formData}
				collections={collections}
				uploading={uploading}
				onSubmit={handleSubmit}
				onFormChange={handleFormChange}
			/>
		{/if}
	</div>
</div>

<style>
	/* Products new page specific styles - minimal since most is handled by components */
</style>