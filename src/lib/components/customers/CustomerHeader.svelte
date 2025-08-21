<script lang="ts">
    import type {
        CustomerFormatted,
        CustomerCreditBalance,
    } from "$lib/types/customers";
    import { CustomerService } from "$lib/services/CustomerService.js";

    interface Props {
        customer: CustomerFormatted;
        creditBalance?: CustomerCreditBalance;
        loading?: boolean;
        onBack?: () => void;
        className?: string;
    }

    let {
        customer,
        creditBalance,
        loading = false,
        onBack,
        className = "",
    }: Props = $props();

    function getInitials(name: string) {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }
</script>

<div class="page-header {className}">
    <div class="page-header-content">
        <div class="page-header-nav">
            <div class="breadcrumb">
                {#if onBack}
                    <button
                        class="breadcrumb-item"
                        onclick={onBack}
                        disabled={loading}
                    >
                        ← Back
                    </button>
                    <span class="breadcrumb-separator">•</span>
                {/if}
                <span class="breadcrumb-item current">👤 Customer</span>
            </div>
        </div>
        <div class="page-actions">
            <!-- Page actions can be added here if needed -->
        </div>
    </div>
</div>

<div class="page-content-padded">
    <!-- Customer Profile Header Card -->
    <div class="header-card">
        <div class="header-card-content">
            <div class="customer-profile">
                <div class="customer-avatar">
                    <div class="customer-avatar-placeholder">
                        {getInitials(customer.name)}
                    </div>
                </div>
                <div class="customer-info">
                    <h1 class="header-card-title">{customer.name}</h1>
                    <div class="customer-meta">
                        <div class="customer-id">
                            ID: {customer.id.slice(0, 8)}...
                        </div>
                        <div class="customer-date">
                            Customer since: {customer.customerSince}
                        </div>
                    </div>
                    <div class="customer-details">
                        <!-- Column 1: Contact Information -->
                        <div class="details-column">
                            <div class="detail-item-horizontal">
                                <span class="detail-label">Email:</span>
                                <span class="detail-value">{customer.email}</span>
                            </div>
                            {#if customer.phone}
                                <div class="detail-item-horizontal">
                                    <span class="detail-label">Phone:</span>
                                    <span class="detail-value">{customer.phone}</span>
                                </div>
                            {/if}
                            {#if customer.address}
                                <div class="detail-item-horizontal">
                                    <span class="detail-label">Address:</span>
                                    <span class="detail-value">{customer.address}</span>
                                </div>
                            {/if}
                        </div>
                        
                        <!-- Column 2: Account Information -->
                        <div class="details-column">
                            <div class="detail-item-horizontal">
                                <span class="detail-label">Total Orders:</span>
                                <span class="detail-value">{customer.stats.order_count}</span>
                            </div>
                            <div class="detail-item-horizontal">
                                <span class="detail-label">Customer Since:</span>
                                <span class="detail-value">{customer.customerSince}</span>
                            </div>
                            <div class="detail-item-horizontal">
                                <span class="detail-label">Last Updated:</span>
                                <span class="detail-value">{customer.formattedUpdatedAt}</span>
                            </div>
                        </div>
                        
                        <!-- Social Media IDs (spans both columns if present) -->
                        {#if customer.facebook_id || customer.instagram_id}
                            <div class="details-column-full">
                                {#if customer.facebook_id}
                                    <div class="detail-item-horizontal">
                                        <span class="detail-label">Facebook ID:</span>
                                        <span class="detail-value">{customer.facebook_id}</span>
                                    </div>
                                {/if}
                                {#if customer.instagram_id}
                                    <div class="detail-item-horizontal">
                                        <span class="detail-label">Instagram ID:</span>
                                        <span class="detail-value">{customer.instagram_id}</span>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
        <div class="header-card-aside">
            <div class="metric-display metric-display-inline">
                <div class="metric-value">
                    {CustomerService.formatCurrency(customer.stats.total_spent)}
                </div>
                <div class="metric-label">Total Spent</div>
            </div>
        </div>
    </div>
</div>

<style>
    .customer-profile {
        display: flex;
        align-items: flex-start;
        gap: var(--space-6);
    }

    .customer-avatar {
        width: 80px;
        height: 80px;
        border-radius: var(--radius-full);
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-primary);
    }

    .customer-avatar-placeholder {
        color: white;
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-semibold);
    }

    .customer-info {
        flex: 1;
        min-width: 0;
    }

    .customer-meta {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        margin-bottom: var(--space-4);
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
    }

    .customer-id {
        font-family: monospace;
        font-size: var(--font-size-xs);
        background: var(--color-surface-hover);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
    }

    .customer-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-6) var(--space-8);
        align-items: start;
    }

    .details-column {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .details-column-full {
        grid-column: 1 / -1;
        display: flex;
        gap: var(--space-6);
        margin-top: var(--space-2);
        padding-top: var(--space-4);
        border-top: 1px solid var(--color-border-light);
    }

    .detail-item-horizontal {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        min-height: var(--space-6);
    }

    .detail-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        font-weight: var(--font-weight-medium);
        flex-shrink: 0;
        min-width: 90px;
    }

    .detail-value {
        font-size: var(--font-size-sm);
        color: var(--color-text);
        word-break: break-word;
    }

    .metric-display {
        text-align: right;
        margin-bottom: var(--space-4);
    }

    .metric-display:last-child {
        margin-bottom: 0;
    }

    .metric-display-inline .metric-value {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        margin-bottom: var(--space-1);
        line-height: 1;
    }

    .metric-display-inline .metric-label {
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--space-2);
    }

    .credit-positive {
        color: var(--color-success) !important;
    }

    .credit-action-btn {
        margin-top: var(--space-2);
        width: 100%;
    }

    .breadcrumb-separator {
        color: var(--color-text-muted);
        margin: 0 var(--space-2);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .customer-profile {
            flex-direction: column;
            gap: var(--space-4);
            text-align: left;
        }

        .customer-avatar {
            width: 60px;
            height: 60px;
            align-self: flex-start;
        }

        .customer-avatar-placeholder {
            font-size: var(--font-size-lg);
        }

        .customer-details {
            grid-template-columns: 1fr;
            gap: var(--space-4);
        }

        .details-column {
            gap: var(--space-3);
        }

        .details-column-full {
            flex-direction: column;
            gap: var(--space-3);
            margin-top: var(--space-3);
            padding-top: var(--space-3);
        }

        .customer-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-2);
        }

        .metric-display {
            text-align: left;
        }
    }
</style>
