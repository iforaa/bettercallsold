<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    // Client-side state management
    let product = $state(null);
    let variants = $state([]);
    let currentVariant = $state(null);
    let locations = $state([]);
    let loading = $state(true);
    let loadingLocations = $state(true);
    let error = $state("");
    let retrying = $state(false);

    // Get data from load function - reactive to route changes
    let productId = $derived(data.productId);
    let variantId = $derived(data.variantId);
    let fromInventory = $derived(data.fromInventory);

    // Form state
    let color = $state(currentVariant?.color || "");
    let size = $state(currentVariant?.size || "");
    let price = $state(currentVariant?.price?.toString() || "");
    let comparePrice = $state(
        currentVariant?.compare_at_price?.toString() || "",
    );
    let sku = $state(currentVariant?.sku || "");
    let barcode = $state(currentVariant?.barcode || "");
    let inventoryQuantity = $state(currentVariant?.inventory_quantity || 0);
    let trackQuantity = $state(currentVariant?.track_quantity || true);
    let continueSelling = $state(
        currentVariant?.continue_selling_when_out_of_stock || false,
    );
    let weight = $state(currentVariant?.weight || 0);
    let weightUnit = $state(currentVariant?.weight_unit || "lb");
    let requiresShipping = $state(currentVariant?.requires_shipping || true);
    let cost = $state(currentVariant?.cost || 0);

    // Computed profit and margin calculations
    let profit = $derived(() => {
        const priceNum = parseFloat(price) || 0;
        const costNum = parseFloat(cost) || 0;
        return priceNum - costNum;
    });

    let margin = $derived(() => {
        const priceNum = parseFloat(price) || 0;
        const costNum = parseFloat(cost) || 0;
        if (priceNum === 0) return 0;
        return ((priceNum - costNum) / priceNum) * 100;
    });

    let saving = $state(false);
    let toasts = $state([]);
    let searchTerm = $state("");

    // Adjustment modal state
    let showAdjustModal = $state(false);
    let adjustingField = $state(null);
    let adjustingLocation = $state(null);
    let adjustBy = $state(0);
    let newQuantity = $state(0);
    let adjustReason = $state("Correction (default)");

    // Client-side data fetching with parallel API calls
    async function loadVariantData() {
        if (!browser || !productId || !variantId) return;

        try {
            loading = true;
            error = "";

            // Make all API calls in parallel for better performance
            const [variantsResponse, variantResponse, locationsResponse] = await Promise.all([
                fetch(`/api/products/${productId}/variants`),
                fetch(`/api/products/${productId}/variants/${variantId}`),
                fetch('/api/locations'),
            ]);

            // Check for 404 errors
            if (
                variantsResponse.status === 404 ||
                variantResponse.status === 404
            ) {
                error = "Product or variant not found";
                product = null;
                variants = [];
                currentVariant = null;
                return;
            }

            // Check if all requests succeeded
            if (!variantsResponse.ok || !variantResponse.ok || !locationsResponse.ok) {
                throw new Error("Failed to fetch variant or location data");
            }

            // Parse responses
            const variantsData = await variantsResponse.json();
            const variantData = await variantResponse.json();
            const locationsData = await locationsResponse.json();

            // Set data
            product = variantsData.product;
            variants = variantsData.variants || [];
            currentVariant = variantData;
            locations = locationsData || [];

            // Initialize form data with the loaded variant
            initializeFormData(variantData);
            loadingLocations = false;
        } catch (err) {
            console.error("Load variant data error:", err);
            error = "Failed to load variant data. Please try again.";
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
            color = variantData.color || "";
            size = variantData.size || "";
            price = variantData.price?.toString() || "";
            comparePrice = variantData.compare_at_price?.toString() || "";
            sku = variantData.sku || "";
            barcode = variantData.barcode || "";
            inventoryQuantity = variantData.inventory_quantity || 0;
            trackQuantity = variantData.track_quantity || true;
            continueSelling =
                variantData.continue_selling_when_out_of_stock || false;
            weight = variantData.weight || 0;
            weightUnit = variantData.weight_unit || "lb";
            requiresShipping = variantData.requires_shipping || true;
            cost = variantData.cost || 0;
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
    function showToast(message: string, type: "success" | "error" = "success") {
        const id = Date.now();
        const toast = { id, message, type };
        toasts = [...toasts, toast];

        setTimeout(() => {
            toasts = toasts.filter((t) => t.id !== id);
        }, 4000);
    }

    function removeToast(id: number) {
        toasts = toasts.filter((t) => t.id !== id);
    }

    // Filter variants based on search
    let filteredVariants = $derived(
        variants.filter((variant) =>
            variant.title.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    );

    // Navigate to different variant
    function selectVariant(variant: any) {
        const url = `/products/${productId}/variants/${variant.id}${fromInventory ? "?fromInventory=true" : ""}`;
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
                compare_at_price: comparePrice
                    ? parseFloat(comparePrice)
                    : null,
                sku: sku,
                barcode: barcode,
                inventory_quantity: inventoryQuantity,
                track_quantity: trackQuantity,
                continue_selling_when_out_of_stock: continueSelling,
                weight: weight,
                weight_unit: weightUnit,
                requires_shipping: requiresShipping,
                cost: parseFloat(cost) || 0,
            };

            const response = await fetch(
                `/api/products/${productId}/variants/${variantId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updateData),
                },
            );

            if (response.ok) {
                showToast("Variant updated successfully!", "success");
                // Refresh the page data
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                throw new Error("Failed to update variant");
            }
        } catch (error) {
            showToast("Error updating variant: " + error.message, "error");
        } finally {
            saving = false;
        }
    }

    // Navigate back
    function goBack() {
        if (fromInventory) {
            goto("/inventory");
        } else {
            goto(`/products/${productId}`);
        }
    }

    // Open adjustment modal
    function openAdjustModal(field: "available" | "on_hand", location = null) {
        adjustingField = field;
        adjustingLocation = location;
        
        // Get current quantity for the specific location or total if no location
        let currentQuantity = inventoryQuantity;
        if (location && currentVariant?.inventory_levels) {
            const locationInventory = currentVariant.inventory_levels.find(inv => inv.location_id === location.id);
            currentQuantity = locationInventory ? locationInventory[field] : 0;
        }
        
        newQuantity = currentQuantity;
        adjustBy = 0;
        showAdjustModal = true;
    }

    // Update adjust by value
    function updateAdjustBy() {
        let currentQuantity = inventoryQuantity;
        if (adjustingLocation && currentVariant?.inventory_levels) {
            const locationInventory = currentVariant.inventory_levels.find(inv => inv.location_id === adjustingLocation.id);
            currentQuantity = locationInventory ? locationInventory[adjustingField] : 0;
        }
        newQuantity = currentQuantity + adjustBy;
    }

    // Update new quantity value
    function updateNewQuantity() {
        let currentQuantity = inventoryQuantity;
        if (adjustingLocation && currentVariant?.inventory_levels) {
            const locationInventory = currentVariant.inventory_levels.find(inv => inv.location_id === adjustingLocation.id);
            currentQuantity = locationInventory ? locationInventory[adjustingField] : 0;
        }
        adjustBy = newQuantity - currentQuantity;
    }

    // Save adjustment
    async function saveAdjustment() {
        if (!adjustingField) return;

        saving = true;
        try {
            const updateData = {
                inventory_quantity: newQuantity,
            };

            // If adjusting for a specific location, include location_id
            if (adjustingLocation) {
                updateData.location_id = adjustingLocation.id;
            }

            const response = await fetch(
                `/api/products/${productId}/variants/${variantId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updateData),
                },
            );

            if (response.ok) {
                showToast("Quantity updated successfully!", "success");
                
                // Update the appropriate inventory values
                if (adjustingLocation) {
                    // Update location-specific inventory in currentVariant
                    if (currentVariant?.inventory_levels) {
                        const locationIndex = currentVariant.inventory_levels.findIndex(
                            inv => inv.location_id === adjustingLocation.id
                        );
                        if (locationIndex >= 0) {
                            currentVariant.inventory_levels[locationIndex][adjustingField] = newQuantity;
                            // Also update on_hand if adjusting available (keep them in sync for now)
                            if (adjustingField === 'available') {
                                currentVariant.inventory_levels[locationIndex].on_hand = newQuantity;
                            }
                        } else {
                            // Add new inventory level for this location
                            currentVariant.inventory_levels.push({
                                location_id: adjustingLocation.id,
                                location_name: adjustingLocation.name,
                                [adjustingField]: newQuantity,
                                available: adjustingField === 'available' ? newQuantity : 0,
                                on_hand: adjustingField === 'on_hand' ? newQuantity : (adjustingField === 'available' ? newQuantity : 0),
                                committed: 0,
                                reserved: 0
                            });
                        }
                    }
                    
                    // Recalculate total inventory quantity
                    if (currentVariant?.inventory_levels) {
                        inventoryQuantity = currentVariant.inventory_levels.reduce(
                            (total, level) => total + (level.available || 0), 0
                        );
                    }
                } else {
                    // Update total inventory quantity for backward compatibility
                    inventoryQuantity = newQuantity;
                }

                showAdjustModal = false;
                adjustingField = null;
                adjustingLocation = null;
            } else {
                throw new Error("Failed to update quantity");
            }
        } catch (error) {
            showToast("Error updating quantity: " + error.message, "error");
        } finally {
            saving = false;
        }
    }

    // Cancel adjustment
    function cancelAdjustment() {
        showAdjustModal = false;
        adjustingField = null;
        adjustingLocation = null;
        adjustBy = 0;
        newQuantity = 0;
    }

    // Get first image for product
    function getFirstImage(product: any): string | null {
        try {
            if (!product.images) return null;

            let images = product.images;
            if (typeof images === "string") {
                images = JSON.parse(images);
            }

            if (Array.isArray(images) && images.length > 0) {
                // Handle both simple URL strings and complex image objects
                const firstImage = images[0];
                if (typeof firstImage === "string") {
                    return firstImage; // Simple URL string
                } else if (
                    firstImage &&
                    typeof firstImage === "object" &&
                    firstImage.url
                ) {
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
    <div class="page">
        <div class="page-header">
            <div class="page-header-content">
                <div class="page-header-nav">
                    <button class="btn-icon" onclick={goBack}> ← </button>
                    <div class="skeleton skeleton-text skeleton-lg"></div>
                </div>
                <div class="page-actions">
                    <div class="skeleton skeleton-btn"></div>
                    <div class="skeleton skeleton-btn"></div>
                </div>
            </div>
        </div>
        <div class="page-content">
            <div class="loading-state">
                <div class="loading-spinner loading-spinner-lg"></div>
                <p class="loading-text">Loading variant details...</p>
            </div>
        </div>
    </div>
{:else if error}
    <!-- Error State -->
    <div class="error-state">
        <div class="error-state-content">
            <div class="error-state-icon">⚠</div>
            <h1 class="error-state-title">Error Loading Variant</h1>
            <p class="error-state-message">{error}</p>
            <div class="error-state-actions">
                <button
                    onclick={retryLoad}
                    class="btn-primary"
                    disabled={retrying}
                >
                    {#if retrying}
                        <span class="loading-spinner"></span>
                    {/if}
                    {retrying ? "Retrying..." : "Try Again"}
                </button>
                <button onclick={goBack} class="btn-secondary">Go Back</button>
            </div>
        </div>
    </div>
{:else if product && currentVariant}
    <div class="page">
        <!-- Header -->
        <div class="page-header">
            <div class="page-header-content">
                <div class="page-header-nav">
                    <button class="btn-icon" onclick={goBack}> ← </button>
                    <div
                        class="breadcrumb"
                        style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);"
                    >
                        <span class="breadcrumb-item">{product.name}</span>
                        <span class="breadcrumb-separator">›</span>
                        <span class="breadcrumb-item current"
                            >{currentVariant.title}</span
                        >
                    </div>
                </div>
                <div class="page-actions">
                    <button
                        class="btn btn-primary"
                        onclick={saveVariant}
                        disabled={saving}
                    >
                        {#if saving}
                            <span class="loading-spinner"></span>
                        {/if}
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>

        <div class="page-content">
            <div class="content-layout">
                <!-- Sidebar with variants list -->
                <div class="content-sidebar content-sidebar-sticky">
                    <div class="sidebar-section">
                        <div class="nav-context">
                            <div class="nav-context-info">
                                <div class="nav-context-icon">
                                    {#if getFirstImage(product)}
                                        <img
                                            src={getFirstImage(product)}
                                            alt={product.name}
                                            style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm);"
                                        />
                                    {:else}
                                        📦
                                    {/if}
                                </div>
                                <div class="nav-context-details">
                                    <h3 class="nav-context-title">
                                        {product.name}
                                    </h3>
                                    <p class="nav-context-subtitle">
                                        <span class="badge badge-success"
                                            >Active</span
                                        >
                                        {variants.length} variants
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="form-field">
                            <input
                                type="text"
                                placeholder="Search variants"
                                bind:value={searchTerm}
                                class="form-input form-input-sm"
                            />
                        </div>

                        <div class="nav-pills">
                            <button class="nav-pill active">All</button>
                            <button class="nav-pill">Color</button>
                            <button class="nav-pill">Size</button>
                        </div>

                        <nav class="nav-list">
                            {#each filteredVariants as variant}
                                <div class="nav-item">
                                    <button
                                        class="nav-link {variant.id ===
                                        currentVariant.id
                                            ? 'active'
                                            : ''}"
                                        onclick={() => selectVariant(variant)}
                                    >
                                        <span class="nav-link-icon">📦</span>
                                        <span class="nav-link-text"
                                            >{variant.title}</span
                                        >
                                    </button>
                                </div>
                            {/each}
                        </nav>
                    </div>
                </div>

                <!-- Main content -->
                <div class="content-main">
                    <!-- Options -->
                    <div class="content-section content-section-padded">
                        <h3 class="content-title">Options</h3>

                        <div class="form-field-group">
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

                        <div class="media-upload-area">
                            <div class="media-upload-content">
                                <div class="media-upload-actions">
                                    <button class="btn-secondary"
                                        >+ Add image</button
                                    >
                                </div>
                                <p class="media-upload-hint">
                                    or drop an image to upload
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Pricing -->
                    <div class="content-section content-section-padded">
                        <h3 class="content-title">Pricing</h3>

                        <div class="form-field-group">
                            <div class="form-field">
                                <label class="form-label">Price</label>
                                <div class="currency-input">
                                    <span class="currency-symbol">$</span>
                                    <input
                                        type="number"
                                        class="form-input currency-input-field"
                                        bind:value={price}
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div class="form-field">
                                <label class="form-label"
                                    >Compare-at price</label
                                >
                                <div class="currency-input">
                                    <span class="currency-symbol">$</span>
                                    <input
                                        type="number"
                                        class="form-input currency-input-field"
                                        bind:value={comparePrice}
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="form-field">
                            <div class="form-checkbox-field">
                                <input
                                    type="checkbox"
                                    id="charge-tax"
                                    checked
                                />
                                <label
                                    for="charge-tax"
                                    class="form-checkbox-label"
                                    >Charge tax on this variant</label
                                >
                            </div>
                        </div>

                        <div class="cost-fields">
                            <div class="form-field">
                                <label class="form-label">Cost per item</label>
                                <div class="currency-input">
                                    <span class="currency-symbol">$</span>
                                    <input
                                        type="number"
                                        class="form-input currency-input-field"
                                        bind:value={cost}
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div class="form-field">
                                <label class="form-label">Profit</label>
                                <div class="currency-input">
                                    <span class="currency-symbol">$</span>
                                    <input
                                        type="text"
                                        class="form-input currency-input-field"
                                        value={profit() > 0 ? profit().toFixed(2) : '--'}
                                        readonly
                                    />
                                </div>
                            </div>

                            <div class="form-field">
                                <label class="form-label">Margin</label>
                                <div class="form-input-group">
                                    <input
                                        type="text"
                                        class="form-input"
                                        value={margin() > 0 ? margin().toFixed(1) : '--'}
                                        readonly
                                    />
                                    <span class="form-input-addon-right">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Inventory -->
                    <div class="content-section">
                        <div class="content-header content-header-clean">
                            <h3 class="content-title">Inventory</h3>
                        </div>
                        <div class="content-body">
                            <div class="form-field-group">
                                <div class="form-field">
                                    <label class="form-label"
                                        >SKU (Stock Keeping Unit)</label
                                    >
                                    <input
                                        type="text"
                                        class="form-input"
                                        bind:value={sku}
                                        placeholder="Enter SKU"
                                    />
                                </div>

                                <div class="form-field">
                                    <label class="form-label"
                                        >Barcode (ISBN, UPC, GTIN, etc.)</label
                                    >
                                    <input
                                        type="text"
                                        class="form-input"
                                        bind:value={barcode}
                                        placeholder="Enter barcode"
                                    />
                                </div>
                            </div>

                            <div class="form-field">
                                <div class="form-checkbox-field">
                                    <input
                                        type="checkbox"
                                        id="track-quantity"
                                        bind:checked={trackQuantity}
                                    />
                                    <label
                                        for="track-quantity"
                                        class="form-checkbox-label"
                                        >Track quantity</label
                                    >
                                </div>
                            </div>

                            <div class="form-field">
                                <div class="form-checkbox-field">
                                    <input
                                        type="checkbox"
                                        id="continue-selling"
                                        bind:checked={continueSelling}
                                    />
                                    <label
                                        for="continue-selling"
                                        class="form-checkbox-label"
                                        >Continue selling when out of stock</label
                                    >
                                </div>
                            </div>

                            <div
                                class="content-section content-section-compact"
                            >
                                <div
                                    class="content-header content-header-clean"
                                >
                                    <h4 class="content-title">Quantity</h4>
                                    <a
                                        href="/settings/locations"
                                        class="btn-link">Edit locations</a
                                    >
                                </div>

                                <div class="table-container">
                                    <table class="table table-compact">
                                        <thead>
                                            <tr>
                                                <th class="table-cell-main"
                                                    >Location</th
                                                >
                                                <th class="table-cell-numeric"
                                                    >Unavailable</th
                                                >
                                                <th class="table-cell-numeric"
                                                    >Committed</th
                                                >
                                                <th class="table-cell-numeric"
                                                    >Available</th
                                                >
                                                <th class="table-cell-numeric"
                                                    >On hand</th
                                                >
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#if locations.length > 0 && currentVariant?.inventory_levels}
                                                {#each locations as location}
                                                    {@const locationInventory = currentVariant.inventory_levels.find(inv => inv.location_id === location.id)}
                                                    <tr class="table-row">
                                                        <td class="table-cell-main">
                                                            <span class="table-cell-text">{location.name}</span>
                                                        </td>
                                                        <td class="table-cell-numeric">
                                                            <span class="table-cell-text">{locationInventory ? (locationInventory.on_hand - locationInventory.available) : 0}</span>
                                                        </td>
                                                        <td class="table-cell-numeric">
                                                            <span class="table-cell-text">{locationInventory ? locationInventory.committed : 0}</span>
                                                        </td>
                                                        <td class="table-cell-numeric">
                                                            <button
                                                                class="btn-ghost btn-sm"
                                                                onclick={() => openAdjustModal("available", location)}
                                                            >
                                                                {locationInventory ? locationInventory.available : 0}
                                                            </button>
                                                        </td>
                                                        <td class="table-cell-numeric">
                                                            <button
                                                                class="btn-ghost btn-sm"
                                                                onclick={() => openAdjustModal("on_hand", location)}
                                                            >
                                                                {locationInventory ? locationInventory.on_hand : 0}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                {/each}
                                            {:else}
                                                <tr class="table-row">
                                                    <td colspan="5" class="table-cell-main">
                                                        <span class="table-cell-text table-cell-muted">
                                                            {loadingLocations ? 'Loading locations...' : 'No locations found'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            {/if}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Shipping -->
                    <div class="content-section content-section-padded">
                        <h3 class="content-title">Shipping</h3>

                        <div class="form-field">
                            <div class="form-checkbox-field">
                                <input
                                    type="checkbox"
                                    id="physical-product"
                                    bind:checked={requiresShipping}
                                />
                                <label
                                    for="physical-product"
                                    class="form-checkbox-label"
                                    >This is a physical product</label
                                >
                            </div>
                        </div>

                        <div class="form-field">
                            <label class="form-label">Weight</label>
                            <div class="form-input-group">
                                <input
                                    type="number"
                                    class="form-input"
                                    bind:value={weight}
                                    placeholder="0.0"
                                    step="0.1"
                                />
                                <select
                                    class="form-select form-input-group-addon"
                                    bind:value={weightUnit}
                                >
                                    <option value="lb">lb</option>
                                    <option value="oz">oz</option>
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
{:else}
    <!-- Variant not found or no data -->
    <div class="error-state">
        <div class="error-state-content">
            <div class="error-state-icon">📦</div>
            <h1 class="error-state-title">Variant Not Found</h1>
            <p class="error-state-message">
                The variant you're looking for doesn't exist or has been
                removed.
            </p>
            <div class="error-state-actions">
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
                    <div class="toast-icon">
                        {#if toast.type === "success"}
                            ✓
                        {:else if toast.type === "error"}
                            ⚠
                        {:else}
                            ℹ
                        {/if}
                    </div>
                    <div class="toast-message">
                        <div class="toast-title">{toast.message}</div>
                    </div>
                </div>
                <button
                    class="toast-close"
                    onclick={() => removeToast(toast.id)}>×</button
                >
            </div>
        {/each}
    </div>
{/if}

<!-- Adjustment Modal -->
{#if showAdjustModal && adjustingField}
    <div class="modal-overlay" onclick={cancelAdjustment}>
        <div
            class="modal-content modal-content-md modal-form"
            onclick={(e) => e.stopPropagation()}
        >
            <div class="modal-header">
                <h3 class="modal-title">
                    Adjust {adjustingField === "available"
                        ? "Available"
                        : "On hand"}{adjustingLocation ? ` - ${adjustingLocation.name}` : ""}
                </h3>
                <button class="modal-close" onclick={cancelAdjustment}>×</button
                >
            </div>

            <div class="modal-body">
                <div class="form-group">
                    <div class="form-field">
                        <label class="form-label">Adjust by</label>
                        <input
                            type="number"
                            class="form-input"
                            bind:value={adjustBy}
                            oninput={updateAdjustBy}
                            placeholder="0"
                        />
                    </div>

                    <div class="form-field">
                        <label class="form-label">New quantity</label>
                        <input
                            type="number"
                            class="form-input"
                            bind:value={newQuantity}
                            oninput={updateNewQuantity}
                            placeholder="0"
                            min="0"
                        />
                    </div>
                </div>

                <div class="form-field">
                    <label class="form-label">Reason</label>
                    <select class="form-select" bind:value={adjustReason}>
                        <option value="Correction (default)"
                            >Correction (default)</option
                        >
                        <option value="Cycle count">Cycle count</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Quality control">Quality control</option>
                        <option value="Received">Received</option>
                        <option value="Sold">Sold</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            <div class="modal-footer">
                <div class="modal-actions">
                    <button class="btn-secondary" onclick={cancelAdjustment}>
                        Cancel
                    </button>
                    <button
                        class="btn-primary"
                        onclick={saveAdjustment}
                        disabled={saving}
                    >
                        {#if saving}
                            <span class="loading-spinner"></span>
                        {/if}
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Minimal custom styles - most styling now handled by design system */

    /* Specific layout adjustments not covered by design system */
    .content-layout {
        grid-template-columns: 280px 1fr;
    }

    /* All sidebar and navigation styles now handled by design system */

    /* All form and content styles now handled by design system */

    /* Cost fields specific layout not in design system */
    .cost-fields {
        display: grid;
        grid-template-columns: 3fr 1fr 1fr; /* Give much more space to first column for "Cost per item" */
        gap: var(--space-2); /* Reduce gap for better space usage */
    }

    /* Ensure labels don't break */
    .cost-fields .form-label {
        white-space: nowrap;
        min-width: max-content;
    }

    /* All inventory, quantity, and weight styles now handled by design system */

    /* All loading and error states now handled by design system */

    /* All toast notification styles now handled by design system */

    /* Checkbox layout improvements */
    .form-checkbox-field {
        display: flex;
        align-items: flex-start;
        gap: var(--space-2);
        margin-bottom: var(--space-3);
        line-height: var(--line-height-normal);
    }

    .form-checkbox-field input[type="checkbox"] {
        margin-top: 2px; /* Align checkbox with first line of text */
        flex-shrink: 0;
    }

    .form-checkbox-label {
        margin: 0;
        line-height: var(--line-height-normal);
    }

    .form-field .form-checkbox-field:last-child {
        margin-bottom: 0;
    }

    /* Responsive adjustments not fully covered by design system */
    @media (max-width: 768px) {
        .cost-fields {
            grid-template-columns: 1fr;
        }
    }

    /* All modal styles now handled by design system */
</style>
