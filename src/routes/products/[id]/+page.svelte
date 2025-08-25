<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import type { PageData } from "./$types";
    import {
        productsState,
        productsActions,
    } from "$lib/state/products.svelte.js";
    import { toastService } from "$lib/services/ToastService.js";
    import ProductForm from "$lib/components/products/ProductForm.svelte";
    import LoadingState from "$lib/components/states/LoadingState.svelte";
    import ErrorState from "$lib/components/states/ErrorState.svelte";
    import type { ProductFormData } from "$lib/types/products";

    let { data }: { data: PageData } = $props();

    const productId = data.productId;

    // Track if form has been initialized to prevent loops
    let formInitialized = $state(false);

    // Track attempted loads to prevent infinite retry on 404
    let attemptedProductIds = $state(new Set());

    // Form data for editing
    let formData: ProductFormData = $state({
        title: "",
        name: "",
        description: "",
        price: "",
        comparePrice: "",
        status: "active",
        chargesTax: true,
        tags: "",
        collections: [],
        images: [],
        variants: [],
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
            title: productData.title || "",
            name: productData.title || "",
            description: productData.description || "",
            price: productData.price?.toString() || "",
            comparePrice: productData.compare_price?.toString() || "",
            status: productData.status || "active",
            chargesTax: Boolean(productData.charges_tax),
            tags: Array.isArray(productData.tags)
                ? productData.tags.join(", ")
                : productData.tags || "",
            collections:
                productData.product_collections?.map((c) => c.id) || [],
            images: [], // New images to upload (existing images handled separately)
            variants:
                productData.inventory_items?.map((item) => ({
                    id: item.id,
                    size: item.variant_combination?.size || "",
                    color: item.variant_combination?.color || "",
                    price: item.price || productData.price,
                    inventory_quantity: item.quantity || 0,
                    sku: item.sku || "",
                    position: item.position || 1,
                })) || [],
        };

        console.log(
            "Product Detail - Form initialized with",
            formData.collections?.length || 0,
            "collections",
        );
    }

    // Load product and collections on mount and route changes
    $effect(() => {
        if (
            productId &&
            (!currentProduct || currentProduct.id !== productId) &&
            !productsState.loading.current &&
            !attemptedProductIds.has(productId)
        ) {
            console.log("Product Detail - Loading product:", productId);
            attemptedProductIds.add(productId);
            productsActions.loadProduct(productId);
        }
    });

    // Load collections once if not already loaded
    $effect(() => {
        if (!collections.length && !productsState.loading.collections) {
            productsActions.loadCollections();
        }
    });

    // Initialize form when product loads (once per product)
    $effect(() => {
        if (
            currentProduct &&
            currentProduct.id === productId &&
            !formInitialized
        ) {
            console.log(
                "Product Detail - Initializing form for product:",
                currentProduct.id,
            );
            console.log(
                "Product Detail - Product collections:",
                currentProduct.product_collections,
            );

            initializeFormData(currentProduct);
            formInitialized = true;
        }
    });

    // Reset form state when navigating to different product
    $effect(() => {
        formInitialized = false;
        // Clear attempted product IDs when route changes to allow retry on navigation
        attemptedProductIds.clear();
        console.log("Product Detail - Route changed to product:", productId);
    });
    // Handle form field changes
    // Handle form submission for updates
    async function handleSubmit(data: ProductFormData) {
        if (!currentProduct) return;

        try {
            const result = await productsActions.updateProduct(
                currentProduct.id,
                data,
                data.images,
            );
            toastService.show("Product updated successfully!", "success");

            // Clear new images after successful update
            formData.images = [];
            productsActions.clearForm();
        } catch (error) {
            toastService.show(
                "Error updating product: " + error.message,
                "error",
            );
        }
    }

    // Delete product handler
    async function handleDelete() {
        if (!currentProduct) return;

        if (
            confirm(
                "Are you sure you want to delete this product? This action cannot be undone.",
            )
        ) {
            try {
                await productsActions.deleteProduct(currentProduct.id);
                toastService.show("Product deleted successfully!", "success");

                setTimeout(() => {
                    goto("/products");
                }, 1000);
            } catch (error) {
                toastService.show(
                    "Error deleting product: " + error.message,
                    "error",
                );
            }
        }
    }

    function discardChanges() {
        if (
            unsavedChanges &&
            confirm(
                "You have unsaved changes. Are you sure you want to discard them?",
            )
        ) {
            productsActions.clearForm();
            navigateBack();
        } else if (!unsavedChanges) {
            navigateBack();
        }
    }

    function navigateBack() {
        // Check if we came from a collection, order, customer, waitlist, or replay details page
        const from = data.from || $page.url.searchParams.get("from");
        const orderId = data.orderId || $page.url.searchParams.get("orderId");
        const customerId =
            data.customerId || $page.url.searchParams.get("customerId");
        const waitlistId = $page.url.searchParams.get("waitlistId");
        const fromCollection =
            data.fromCollection || $page.url.searchParams.get("fromCollection");
        const fromInventory =
            data.fromInventory || $page.url.searchParams.get("fromInventory");
        const replayId =
            data.replayId || $page.url.searchParams.get("replayId");

        if (fromInventory) {
            goto("/inventory");
        } else if (fromCollection) {
            goto(`/collections/${fromCollection}`);
        } else if (from === "replay" && replayId) {
            goto(`/replays/${replayId}`);
        } else if (from === "customer" && customerId) {
            goto(`/customers/${customerId}`);
        } else if (from === "order" && orderId) {
            goto(`/orders/${orderId}`);
        } else if (from === "waitlist" && waitlistId) {
            goto(`/waitlists/${waitlistId}`);
        } else {
            goto("/products");
        }
    }

    function handleRetry() {
        // Reset the attempted product ID to allow retry
        attemptedProductIds.delete(productId);
        productsActions.retry();
    }

    // Handle form changes (debounced to prevent excessive updates)
    function handleFormChange(updatedData: Partial<ProductFormData>) {
        // Only update the specific fields that changed
        Object.assign(formData, updatedData);
        productsActions.setFormData(formData);
    }
</script>

<svelte:head>
    <title>{currentProduct?.title || "Product"} - BetterCallSold</title>
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
        message={productsState.errors.current?.includes("not found")
            ? "Product Not Found"
            : "Error Loading Product"}
        errorText={productsState.errors.current?.includes("not found")
            ? "This product may have been removed or is not available."
            : productsState.errors.current || "Unable to load product details"}
        onRetry={productsState.errors.current?.includes("not found")
            ? undefined
            : handleRetry}
        showBackButton={true}
        onBack={navigateBack}
        retryLabel={productsState.errors.current?.includes("not found")
            ? undefined
            : "Try Again"}
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
                        <span class="status-badge status-warning"
                            >● Unsaved changes</span
                        >
                    {/if}
                </div>
                <div class="page-actions">
                    <button class="btn btn-danger" onclick={handleDelete}>
                        Delete
                    </button>
                    <button class="btn btn-secondary" onclick={discardChanges}>
                        Discard
                    </button>
                    <button
                        class="btn btn-primary"
                        onclick={() => handleSubmit(formData)}
                        disabled={updating || uploading}
                    >
                        {#if updating || uploading}
                            <span class="spinner"></span>
                        {/if}
                        {uploading
                            ? "Uploading..."
                            : updating
                              ? "Saving..."
                              : "Save"}
                    </button>
                </div>
            </div>
        </div>

        <div class="page-content-padded">
            <ProductForm
                {formData}
                {collections}
                {uploading}
                {currentProduct}
                existingImages={currentProduct?.images
                    ? Array.isArray(currentProduct.images)
                        ? currentProduct.images
                        : JSON.parse(currentProduct.images || "[]")
                    : []}
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
        onBack={navigateBack}
        backButtonText={data.from === "replay"
            ? "Back to Replay"
            : "Back to Products"}
    />
{/if}

<style>
	/* Mobile-specific improvements for product details */
	@media (max-width: 768px) {
		.page-header-sticky .page-header-content {
			flex-direction: column;
			gap: var(--space-3);
			align-items: flex-start;
		}
		
		.flex-header {
			width: 100%;
			flex-wrap: wrap;
			gap: var(--space-2);
		}
		
		.page-title {
			font-size: var(--font-size-lg);
			word-break: break-word;
			max-width: 100%;
		}
		
		.page-actions {
			width: 100%;
			flex-wrap: wrap;
			gap: var(--space-2);
			justify-content: flex-start;
		}
		
		.status-badge {
			font-size: var(--font-size-xs);
		}
		
		.btn {
			flex: 1;
			min-width: calc(33% - var(--space-1));
		}
		
		.btn-icon {
			min-width: var(--mobile-touch-target);
			flex: none;
		}
	}
	
	@media (max-width: 480px) {
		.page-title {
			font-size: var(--font-size-base);
		}
		
		.btn {
			min-width: calc(50% - var(--space-1));
		}
		
		.flex-header {
			gap: var(--space-1);
		}
	}
</style>
