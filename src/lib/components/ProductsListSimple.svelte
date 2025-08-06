<script>
    import { onMount } from 'svelte';
    import { PusherService } from '$lib/services/PusherService.js';
    
    let allProducts = $state([]);
    let selectedProducts = $state([]);
    let loading = $state(true);
    let showModal = $state(false);
    let searchQuery = $state("");
    let filteredProducts = $state([]);
    let currentShowingProductId = $state(null);
    let shownProductIds = $state(new Set());
    let pusherService = null;
    
    onMount(async () => {
        await loadProducts();
        // Initialize Pusher service for sending product messages
        pusherService = new PusherService();
        await pusherService.init('private-live-chat');
    });
    
    async function loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            allProducts = await response.json();
            filteredProducts = allProducts;
        } catch (error) {
            console.error('Failed to load products:', error);
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
    
    function getFirstImage(product) {
        if (!product.images) return null;
        
        let images = product.images;
        if (typeof images === 'string') {
            images = JSON.parse(images);
        }
        
        if (Array.isArray(images) && images.length > 0) {
            const firstImage = images[0];
            if (typeof firstImage === 'string') {
                return firstImage;
            } else if (firstImage && firstImage.url) {
                return firstImage.url;
            }
        }
        return null;
    }
    
    function addProduct(product) {
        if (selectedProducts.find(p => p.id === product.id)) {
            return; // Already selected
        }
        selectedProducts = [...selectedProducts, product];
    }
    
    function removeProduct(productId) {
        selectedProducts = selectedProducts.filter(p => p.id !== productId);
        // Reset states if removing currently showing or shown products
        if (currentShowingProductId === productId) {
            currentShowingProductId = null;
        }
        shownProductIds.delete(productId);
        shownProductIds = new Set(shownProductIds);
    }
    
    async function handleProductClick(product) {
        // If clicking the currently showing product, do nothing
        if (currentShowingProductId === product.id) {
            return;
        }
        
        // Move current showing product to shown (if exists)
        if (currentShowingProductId) {
            shownProductIds.add(currentShowingProductId);
            shownProductIds = new Set(shownProductIds);
        }
        
        // Set new showing product
        currentShowingProductId = product.id;
        
        // Remove from shown set if it was there
        shownProductIds.delete(product.id);
        shownProductIds = new Set(shownProductIds);
        
        // Send product message to chat
        await sendProductMessage(product);
    }
    
    async function sendProductMessage(product) {
        if (!pusherService || !pusherService.connected) {
            console.log('Pusher not connected, skipping product message');
            return;
        }
        
        try {
            // Create special product message
            await pusherService.sendProductMessage({
                type: 'product-highlight',
                product: {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: getFirstImage(product),
                    description: product.description
                },
                message: `🛍️ Now featuring: ${product.name} - $${product.price}`
            });
        } catch (error) {
            console.error('Failed to send product message:', error);
        }
    }
    
    function getProductStatus(productId) {
        if (currentShowingProductId === productId) {
            return 'showing';
        }
        if (shownProductIds.has(productId)) {
            return 'shown';
        }
        return 'ready';
    }
    
    function getStatusText(status) {
        switch (status) {
            case 'showing': return 'Showing';
            case 'shown': return 'Shown';
            case 'ready': return 'Ready';
            default: return 'Ready';
        }
    }
    
    function openModal() {
        showModal = true;
        searchQuery = ""; // Reset search
    }
    
    function closeModal() {
        showModal = false;
    }
    
    function truncateText(text, maxLength = 30) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
</script>

<div class="products-list">
    <div class="products-header">
        <h3>Products</h3>
        <div class="products-count">
            {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}
        </div>
    </div>

    <div class="products-content">
        {#if selectedProducts.length === 0}
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <p>No products selected</p>
                <button class="add-products-btn" onclick={openModal}>
                    <span class="plus-icon">+</span>
                    Add Products
                </button>
            </div>
        {:else}
            <div class="selected-products-list">
                {#each selectedProducts as product (product.id)}
                    {@const status = getProductStatus(product.id)}
                    <div class="product-item status-{status}" onclick={() => handleProductClick(product)}>
                        <div class="status-label">
                            {getStatusText(status)}
                        </div>
                        <div class="product-info">
                            <div class="product-image">
                                {#if getFirstImage(product)}
                                    <img 
                                        src={getFirstImage(product)} 
                                        alt={product.name}
                                        loading="lazy"
                                        onerror={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextElementSibling.style.display = 'flex';
                                        }}
                                    />
                                    <div class="image-fallback" style="display: none;">📦</div>
                                {:else}
                                    <div class="image-placeholder">📦</div>
                                {/if}
                            </div>
                            <div class="product-details">
                                <div class="product-title" title={product.name}>
                                    {truncateText(product.name)}
                                </div>
                                <div class="product-price">${product.price}</div>
                            </div>
                        </div>
                    </div>
                {/each}
                
                <button class="add-more-btn" onclick={openModal} title="Add more products">
                    <span class="plus-icon">+</span>
                </button>
            </div>
        {/if}
    </div>
</div>

<!-- Modal -->
{#if showModal}
    <div class="modal-overlay" onclick={closeModal}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3>Add Products to Stream</h3>
                <button class="close-btn" onclick={closeModal}>×</button>
            </div>
            
            <div class="modal-body">
                <div class="search-section">
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
                    <div class="modal-products-list">
                        {#each filteredProducts as product (product.id)}
                            {@const isSelected = selectedProducts.find(p => p.id === product.id)}
                            <div class="modal-product-item" class:selected={isSelected}>
                                <div class="product-info">
                                    <div class="product-image">
                                        {#if getFirstImage(product)}
                                            <img 
                                                src={getFirstImage(product)} 
                                                alt={product.name}
                                                loading="lazy"
                                                onerror={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextElementSibling.style.display = 'flex';
                                                }}
                                            />
                                            <div class="image-fallback" style="display: none;">📦</div>
                                        {:else}
                                            <div class="image-placeholder">📦</div>
                                        {/if}
                                    </div>
                                    <div class="product-details">
                                        <div class="product-title">{product.name}</div>
                                        <div class="product-price">${product.price}</div>
                                    </div>
                                </div>
                                <div class="product-actions">
                                    {#if isSelected}
                                        <button 
                                            class="remove-btn-modal"
                                            onclick={() => removeProduct(product.id)}
                                        >
                                            Remove
                                        </button>
                                    {:else}
                                        <button 
                                            class="add-btn"
                                            onclick={() => addProduct(product)}
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
            
            <div class="modal-footer">
                <button class="done-btn" onclick={closeModal}>
                    Done ({selectedProducts.length})
                </button>
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

    .products-count {
        font-size: 0.875rem;
        color: #6d7175;
    }

    .products-content {
        flex: 1;
        padding: 1.5rem;
        overflow-y: auto;
        background: #fafbfb;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: #6d7175;
    }

    .empty-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.6;
    }

    .empty-state p {
        margin: 0.5rem 0 1rem 0;
        font-size: 0.875rem;
    }

    .add-products-btn {
        background: #005bd3;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .add-products-btn:hover {
        background: #004bb5;
    }

    .plus-icon {
        font-size: 1rem;
        font-weight: bold;
    }

    .selected-products-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding-bottom: 1rem;
    }

    .product-item {
        display: flex;
        flex-direction: column;
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 8px;
        padding: 0.75rem;
        transition: all 0.15s ease;
        cursor: pointer;
        position: relative;
    }

    .product-item:hover {
        border-color: #c9cccf;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transform: translateY(-1px);
    }

    .product-item.status-ready {
        background: #fef3c7; /* Yellow background */
        border-color: #f59e0b;
    }

    .product-item.status-showing {
        background: #e0e7ff; /* Purple background */
        border-color: #7c3aed;
    }

    .product-item.status-shown {
        background: #d1fae5; /* Green background */
        border-color: #10b981;
    }

    .status-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 0.5rem;
        text-align: center;
    }

    .product-item.status-ready .status-label {
        color: #92400e;
    }

    .product-item.status-showing .status-label {
        color: #5b21b6;
    }

    .product-item.status-shown .status-label {
        color: #047857;
    }

    .product-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
        width: 100%;
    }

    .product-image {
        width: 40px;
        height: 40px;
        background: #f6f6f7;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
    }

    .product-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 6px;
        transition: transform 0.2s ease;
    }

    .product-item:hover .product-image img {
        transform: scale(1.05);
    }

    .image-placeholder,
    .image-fallback {
        color: #9ca3af;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    .product-details {
        flex: 1;
    }

    .product-title {
        font-weight: 500;
        color: #202223;
        font-size: 0.875rem;
        line-height: 1.3;
        margin-bottom: 0.25rem;
    }

    .product-price {
        color: #005bd3;
        font-weight: 600;
        font-size: 0.875rem;
    }

    .remove-btn-modal {
        background: #d72c0d;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .remove-btn-modal:hover {
        background: #b8240b;
    }

    .add-more-btn {
        background: #f6f6f7;
        border: 2px dashed #c9cccf;
        border-radius: 8px;
        padding: 1rem;
        font-size: 1.5rem;
        color: #6d7175;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 0.5rem;
    }

    .add-more-btn:hover {
        background: #f0f0f0;
        border-color: #005bd3;
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
        max-width: 700px;
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

    .close-btn {
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

    .close-btn:hover {
        background: #f6f6f7;
        color: #202223;
    }

    .modal-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .search-section {
        padding: 1.5rem;
        border-bottom: 1px solid #f0f0f0;
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

    .modal-products-list {
        flex: 1;
        padding: 0 1.5rem 1.5rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .modal-product-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 8px;
        padding: 0.75rem;
        transition: all 0.15s ease;
    }

    .modal-product-item:hover {
        border-color: #005bd3;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .modal-product-item.selected {
        border-color: #00a96e;
        background: #f0f9f6;
    }

    .product-actions {
        margin-left: 1rem;
    }

    .add-btn {
        background: #005bd3;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .add-btn:hover {
        background: #004bb5;
    }

    .selected-badge {
        color: #00a96e;
        font-size: 0.875rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
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
        text-align: center;
        padding: 3rem;
        color: #6d7175;
    }

    .no-results p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
    }

    .hint {
        font-size: 0.75rem;
        opacity: 0.8;
    }

    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid #f0f0f0;
        flex-shrink: 0;
    }

    .done-btn {
        background: #005bd3;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 2rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        width: 100%;
    }

    .done-btn:hover {
        background: #004bb5;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
        .modal-overlay {
            padding: 1rem;
        }

        .product-item {
            padding: 0.5rem;
        }

        .product-info {
            gap: 0.5rem;
        }

        .product-title {
            font-size: 0.75rem;
        }
    }
</style>