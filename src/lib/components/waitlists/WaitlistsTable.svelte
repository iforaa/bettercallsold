<script>
    import { currency, date } from '$lib/utils/index';
    import { getOrderSourceLabel, getOrderSourceColor } from '$lib/utils/status';
    import { goto } from '$app/navigation';
    
    let { 
        waitlists = [], 
        loading = false,
        selectedWaitlists = [],
        selectAll = false,
        onToggleSelect,
        onToggleSelectAll 
    } = $props();
    
    function handleRowClick(waitlist) {
        goto(`/waitlists/${waitlist.id}`);
    }
    
    function handleCheckboxClick(event) {
        event.stopPropagation();
    }
    
    function formatPosition(position) {
        return position ? `#${position}` : 'N/A';
    }
</script>

<div class="table-container">
    <table class="data-table">
        <thead>
            <tr>
                <th class="checkbox-col">
                    <input 
                        type="checkbox" 
                        checked={selectAll}
                        onchange={onToggleSelectAll}
                    />
                </th>
                <th class="customer-col">Customer</th>
                <th class="product-col">Product</th>
                <th>Position</th>
                <th>Status</th>
                <th>Source</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            {#if loading}
                {#each Array(5) as _, i}
                    <tr>
                        <td class="checkbox-col">
                            <div class="skeleton skeleton-checkbox"></div>
                        </td>
                        <td class="customer-col">
                            <div class="customer-info">
                                <div class="skeleton skeleton-text"></div>
                                <div class="skeleton skeleton-text-sm"></div>
                            </div>
                        </td>
                        <td class="product-col">
                            <div class="product-info">
                                <div class="skeleton skeleton-image"></div>
                                <div class="product-details">
                                    <div class="skeleton skeleton-text"></div>
                                    <div class="skeleton skeleton-text-sm"></div>
                                </div>
                            </div>
                        </td>
                        <td><div class="skeleton skeleton-text-sm"></div></td>
                        <td><div class="skeleton skeleton-badge"></div></td>
                        <td><div class="skeleton skeleton-badge"></div></td>
                        <td><div class="skeleton skeleton-text-sm"></div></td>
                    </tr>
                {/each}
            {:else if waitlists && waitlists.length > 0}
                {#each waitlists as waitlist}
                    <tr class="waitlist-row" onclick={() => handleRowClick(waitlist)}>
                        <td class="checkbox-col" onclick={handleCheckboxClick}>
                            <input 
                                type="checkbox" 
                                checked={selectedWaitlists.includes(waitlist.id)}
                                onchange={() => onToggleSelect(waitlist.id)}
                            />
                        </td>
                        <td class="customer-col">
                            <div class="customer-info">
                                <div class="customer-name">{waitlist.user_name || 'Unknown User'}</div>
                                {#if waitlist.user_email}
                                    <div class="customer-email">{waitlist.user_email}</div>
                                {/if}
                            </div>
                        </td>
                        <td class="product-col">
                            <div class="product-info">
                                <div class="product-image">
                                    {#if waitlist.product_images && waitlist.product_images.length > 0}
                                        <img src="{waitlist.product_images[0].url}" alt="{waitlist.product_name}" />
                                    {:else}
                                        📦
                                    {/if}
                                </div>
                                <div class="product-details">
                                    <div class="product-title">{waitlist.product_name || 'No Product'}</div>
                                    <div class="product-variants">
                                        {#if waitlist.color || waitlist.size}
                                            {#if waitlist.color}<span class="variant-badge">{waitlist.color}</span>{/if}
                                            {#if waitlist.size}<span class="variant-badge">{waitlist.size}</span>{/if}
                                        {:else if waitlist.product_price}
                                            <span class="price">{currency(waitlist.product_price)}</span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="position-number">{formatPosition(waitlist.position)}</span>
                        </td>
                        <td>
                            {#if waitlist.authorized_at}
                                <span class="status-badge authorized">Authorized</span>
                            {:else}
                                <span class="status-badge pending">Pending</span>
                            {/if}
                        </td>
                        <td>
                            <span class="source-badge {getOrderSourceColor(waitlist.order_source)}">
                                {getOrderSourceLabel(waitlist.order_source)}
                            </span>
                        </td>
                        <td>
                            <span class="date">{date(waitlist.created_at)}</span>
                        </td>
                    </tr>
                {/each}
            {:else}
                <tr>
                    <td colspan="7" class="table-empty">No waitlist entries found.</td>
                </tr>
            {/if}
        </tbody>
    </table>
</div>

<style>
    /* Waitlist-specific table styles */
    .checkbox-col {
        width: 40px;
        padding: 0.75rem 0.5rem 0.75rem 1rem;
    }

    .customer-col {
        min-width: 200px;
        width: 25%;
    }

    .product-col {
        min-width: 250px;
        width: 30%;
    }

    .customer-info {
        display: flex;
        flex-direction: column;
    }

    .customer-name {
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        font-size: var(--font-size-sm);
        margin-bottom: var(--space-1);
    }

    .customer-email {
        color: var(--color-text-muted);
        font-size: var(--font-size-xs);
    }

    .product-info {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .product-image {
        width: 40px;
        height: 40px;
        background: var(--color-surface-hover);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-base);
        overflow: hidden;
        border: 1px solid var(--color-border);
        flex-shrink: 0;
        opacity: 0.6;
    }

    .product-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 1;
    }

    .product-details {
        flex: 1;
    }

    .product-title {
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        font-size: var(--font-size-sm);
        margin-bottom: var(--space-1);
    }

    .product-variants {
        display: flex;
        gap: var(--space-1);
        flex-wrap: wrap;
    }

    .variant-badge {
        background: var(--color-surface-alt);
        color: var(--color-secondary-dark);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
    }

    .price {
        color: var(--color-text-muted);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
    }

    .position-number {
        font-family: monospace;
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        font-size: var(--font-size-sm);
    }

    .source-badge {
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        text-transform: capitalize;
    }

    .source-badge.blue {
        background: var(--color-info-bg);
        color: var(--color-info-text);
    }

    .source-badge.purple {
        background: #ede9fe;
        color: #7c3aed;
    }

    .source-badge.green {
        background: var(--color-success-bg);
        color: var(--color-success-text);
    }

    .source-badge.orange {
        background: var(--color-warning-bg);
        color: var(--color-warning-text);
    }

    .source-badge.gray {
        background: var(--color-surface-alt);
        color: var(--color-text-muted);
    }

    .date {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
    }

    .waitlist-row {
        cursor: pointer;
    }

    .waitlist-row:hover {
        background: var(--color-surface-hover);
    }

    input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
    }

    /* Skeleton styles */
    .skeleton {
        background: var(--color-border);
        border-radius: var(--radius-sm);
        animation: pulse 1.5s ease-in-out infinite alternate;
    }

    .skeleton-checkbox {
        width: 16px;
        height: 16px;
    }

    .skeleton-text {
        height: 1rem;
        width: 70%;
        margin-bottom: var(--space-1);
    }

    .skeleton-text-sm {
        height: 0.875rem;
        width: 50%;
    }

    .skeleton-image {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-md);
    }

    .skeleton-badge {
        height: 1.5rem;
        width: 60px;
        border-radius: var(--radius-sm);
    }

    @keyframes pulse {
        0% { opacity: 1; }
        100% { opacity: 0.5; }
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .data-table {
            min-width: 800px;
        }
    }
</style>