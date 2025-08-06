<script>
    import { onMount } from 'svelte';
    import { toastService } from '$lib/services/ToastService.js';
    
    // Temporarily make this a standalone component for testing
    let selectedProducts = $state([]);
    let onProductsChange = null;
    
    let allProducts = $state([]);
    let filteredProducts = $state([]);
    let loading = $state(true);
    let searchQuery = $state("");
    let showAddModal = $state(false);
    
    onMount(async () => {
        await loadProducts();
    });
    
    async function loadProducts() {
        try {
            loading = true;
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            
            allProducts = await response.json();
            filteredProducts = allProducts;
            
        } catch (error) {
            console.error('Failed to load products:', error);
            toastService.error('Failed to load products');
        } finally {
            loading = false;
        }
    }
    
    // Filter products based on search query
    $effect(() => {
        if (searchQuery.trim()) {
            filteredProducts = allProducts.filter(product => 
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        } else {
            filteredProducts = allProducts;
        }
    });
    
    function addProductToList(product) {
        if (selectedProducts.find(p => p.id === product.id)) {
            toastService.warning('Product already added to list');
            return;
        }
        
        const updatedProducts = [...selectedProducts, product];
        if (onProductsChange) {
            onProductsChange(updatedProducts);
        }
        
        toastService.success(`Added "${product.name}" to products list`);
        showAddModal = false;
    }
    
    function removeProductFromList(productId) {
        const updatedProducts = selectedProducts.filter(p => p.id !== productId);
        if (onProductsChange) {
            onProductsChange(updatedProducts);
        }
        
        toastService.info('Product removed from list');
    }
    
    function getProductImage(product) {
        if (product.images && product.images.length > 0) {
            return product.images[0].url;
        }
        return null;
    }
    
    function truncateText(text, maxLength = 50) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
</script>

<div class="products-list">
    <div class="products-header">
        <h3>Selected Products</h3>
        <div class="products-info">
            <span class="product-count">{selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}</span>
            <button class="btn-primary btn-sm" onclick={() => showAddModal = true}>
                + Add Product
            </button>
        </div>
    </div>

    <div class="selected-products">
        {#if selectedProducts.length === 0}
            <div class="no-products">
                <div class="products-icon">📦</div>
                <p>No products selected</p>
                <p class="hint">Add products to feature in your live stream</p>
            </div>
        {:else}
            <div class="products-grid">
                {#each selectedProducts as product (product.id)}
                    <div class="product-card">
                        <div class="product-image">
                            {#if getProductImage(product)}
                                <img src={getProductImage(product)} alt={product.name} />
                            {:else}
                                <div class="image-placeholder">
                                    <span>📷</span>
                                </div>
                            {/if}
                            <button 
                                class="remove-btn"
                                onclick={() => removeProductFromList(product.id)}
                                title="Remove product"
                            >
                                ×
                            </button>
                        </div>
                        <div class="product-info">
                            <div class="product-name" title={product.name}>
                                {truncateText(product.name, 30)}
                            </div>
                            <div class="product-price">${product.price}</div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- Add Product Modal -->
{#if showAddModal}
    <div class="modal-overlay" onclick={() => showAddModal = false}>
        <div class="modal-content" onclick|stopPropagation>
            <div class="modal-header">
                <h3>Add Products to Stream</h3>
                <button class="close-modal" onclick={() => showAddModal = false}>×</button>
            </div>
            
            <div class="modal-body">
                <div class="search-box">
                    <input
                        type="text"
                        bind:value={searchQuery}
                        placeholder="Search products..."
                        class="search-input"
                    />
                </div>
                
                {#if loading}
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading products...</p>
                    </div>
                {:else}
                    <div class="modal-products-grid">
                        {#each filteredProducts as product (product.id)}
                            {@const isSelected = selectedProducts.find(p => p.id === product.id)}
                            <div class="modal-product-card" class:selected={isSelected}>
                                <div class="modal-product-image">
                                    {#if getProductImage(product)}
                                        <img src={getProductImage(product)} alt={product.name} />
                                    {:else}
                                        <div class="image-placeholder">
                                            <span>📷</span>
                                        </div>
                                    {/if}
                                </div>
                                <div class="modal-product-info">
                                    <div class="modal-product-name" title={product.name}>
                                        {truncateText(product.name, 40)}
                                    </div>
                                    <div class="modal-product-price">${product.price}</div>
                                </div>
                                <div class="modal-product-actions">
                                    {#if isSelected}
                                        <button class="btn-selected" disabled>
                                            ✓ Added
                                        </button>
                                    {:else}
                                        <button 
                                            class="btn-add"
                                            onclick={() => addProductToList(product)}
                                        >
                                            Add
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                        
                        {#if filteredProducts.length === 0 && !loading}
                            <div class="no-results">
                                <p>No products found</p>
                                {#if searchQuery}
                                    <p class="hint">Try a different search term</p>
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .products-list {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 0;
        display: flex;
        flex-direction: column;
        height: 400px;
    }

    .products-header {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }

    .products-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
    }

    .products-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .product-count {
        font-size: 0.875rem;
        color: #6d7175;
    }

    .selected-products {
        flex: 1;
        padding: 1rem 1.5rem;
        overflow-y: auto;
        background: #fafbfb;
    }

    .no-products {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: #6d7175;
    }

    .products-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.6;
    }

    .no-products p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
    }

    .hint {
        font-size: 0.75rem;
        opacity: 0.8;
    }

    .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 1rem;
    }

    .product-card {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        transition: all 0.15s ease;
    }

    .product-card:hover {
        border-color: #c9cccf;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .product-image {
        position: relative;
        width: 100%;
        height: 80px;
        overflow: hidden;
        background: #f6f6f7;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .product-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .image-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        color: #6d7175;
        opacity: 0.5;
    }

    .remove-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(215, 44, 13, 0.9);
        color: white;
        border: none;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
    }

    .remove-btn:hover {
        background: #d72c0d;
        transform: scale(1.1);
    }

    .product-info {
        padding: 0.5rem;
    }

    .product-name {
        font-size: 0.75rem;
        font-weight: 500;
        color: #202223;
        line-height: 1.3;
        margin-bottom: 0.25rem;
    }

    .product-price {
        font-size: 0.875rem;
        font-weight: 600;
        color: #005bd3;
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 2rem;
    }

    .modal-content {
        background: white;
        border-radius: 12px;
        width: 100%;
        max-width: 800px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #202223;
    }

    .close-modal {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #6d7175;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }

    .close-modal:hover {
        background: #f6f6f7;
        color: #202223;
    }

    .modal-body {
        padding: 1.5rem;
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .search-box {
        margin-bottom: 1.5rem;
        flex-shrink: 0;
    }

    .search-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 8px;
        font-size: 0.875rem;
        background: white;
    }

    .search-input:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
    }

    .modal-products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
        overflow-y: auto;
        flex: 1;
        padding-right: 0.5rem;
    }

    .modal-product-card {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.15s ease;
        display: flex;
        flex-direction: column;
    }

    .modal-product-card:hover {
        border-color: #005bd3;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .modal-product-card.selected {
        border-color: #00a96e;
        background: #f0f9f6;
    }

    .modal-product-image {
        width: 100%;
        height: 120px;
        overflow: hidden;
        background: #f6f6f7;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-product-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .modal-product-info {
        padding: 0.75rem;
        flex: 1;
    }

    .modal-product-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: #202223;
        line-height: 1.3;
        margin-bottom: 0.5rem;
    }

    .modal-product-price {
        font-size: 1rem;
        font-weight: 600;
        color: #005bd3;
    }

    .modal-product-actions {
        padding: 0.75rem;
        border-top: 1px solid #f0f0f0;
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: #6d7175;
    }

    .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f0f0f0;
        border-top-color: #005bd3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }

    .no-results {
        grid-column: 1/-1;
        text-align: center;
        padding: 3rem;
        color: #6d7175;
    }

    .no-results p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
    }

    /* Button Styles */
    .btn-primary,
    .btn-add,
    .btn-selected {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        text-align: center;
        width: 100%;
    }

    .btn-primary {
        background: #005bd3;
        color: white;
    }

    .btn-primary:hover {
        background: #004bb5;
    }

    .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
    }

    .btn-add {
        background: #005bd3;
        color: white;
    }

    .btn-add:hover {
        background: #004bb5;
    }

    .btn-selected {
        background: #00a96e;
        color: white;
        cursor: default;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
        .modal-overlay {
            padding: 1rem;
        }

        .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 0.75rem;
        }

        .modal-products-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        }

        .products-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
        }

        .products-info {
            justify-content: space-between;
        }
    }
</style>