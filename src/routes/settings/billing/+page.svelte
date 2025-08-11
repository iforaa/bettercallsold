<script lang="ts">
    // Billing information state
    let billingInfo = $state({
        plan: "BetterCallSold Basic",
        price: "$29/month",
        nextBilling: "2025-09-07",
        billingCycle: "Monthly",
        status: "Active",
    });

    let paymentMethod = $state({
        type: "Credit Card",
        brand: "Visa",
        last4: "4242",
        expiry: "12/26",
        isDefault: true,
    });

    let billingHistory = $state([
        {
            id: "inv-001",
            date: "2024-08-07",
            amount: "$29.00",
            status: "Paid",
            description: "BetterCallSold Basic - Monthly",
            downloadUrl: "#",
        },
        {
            id: "inv-002",
            date: "2024-07-07",
            amount: "$29.00",
            status: "Paid",
            description: "BetterCallSold Basic - Monthly",
            downloadUrl: "#",
        },
        {
            id: "inv-003",
            date: "2024-06-07",
            amount: "$29.00",
            status: "Paid",
            description: "BetterCallSold Basic - Monthly",
            downloadUrl: "#",
        },
    ]);

    let billingAddress = $state({
        name: "John Smith",
        company: "BetterCallSold Inc.",
        address: "1 Rodeo Drive",
        city: "Los Angeles",
        state: "CA",
        zip: "94102",
        country: "United States",
        taxId: "12-3456789",
    });

    let showPaymentModal = $state(false);
    let showAddressModal = $state(false);
    let isEditing = $state(false);

    function updatePaymentMethod() {
        showPaymentModal = true;
    }

    function updateBillingAddress() {
        showAddressModal = true;
        isEditing = true;
    }

    function downloadInvoice(invoice: any) {
        // Simulate download
        console.log("Downloading invoice:", invoice.id);
    }

    function saveBillingAddress() {
        showAddressModal = false;
        isEditing = false;
    }

    function getStatusBadgeClass(status: string): string {
        switch (status.toLowerCase()) {
            case "paid":
                return "status-paid";
            case "pending":
                return "status-pending";
            case "overdue":
                return "status-overdue";
            default:
                return "status-default";
        }
    }
</script>

<svelte:head>
    <title>Billing - BetterCallSold Settings</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="header-content">
            <h1>
                <span class="page-icon">🧾</span>
                Billing
            </h1>
        </div>
        <div class="breadcrumb">
            <span>Settings</span>
            <span class="breadcrumb-separator">›</span>
            <span>Billing</span>
        </div>
    </div>

    <div class="page-content">
        <!-- Current Subscription -->
        <div class="billing-card">
            <div class="card-header">
                <h2>Current subscription</h2>
                <div class="header-actions">
                    <a href="/setup/plan" class="btn-secondary">Change plan</a>
                </div>
            </div>
            <div class="subscription-details">
                <div class="subscription-info">
                    <div class="plan-name">{billingInfo.plan}</div>
                    <div class="plan-price">{billingInfo.price}</div>
                    <div class="plan-status">
                        <span class="status-indicator active"></span>
                        {billingInfo.status}
                    </div>
                </div>
                <div class="billing-summary">
                    <div class="summary-item">
                        <span class="label">Billing cycle:</span>
                        <span class="value">{billingInfo.billingCycle}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Next billing date:</span>
                        <span class="value">{billingInfo.nextBilling}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Payment Method -->
        <div class="billing-card">
            <div class="card-header">
                <h2>Payment method</h2>
                <div class="header-actions">
                    <button class="btn-secondary" onclick={updatePaymentMethod}
                        >Update</button
                    >
                </div>
            </div>
            <div class="payment-method-details">
                <div class="payment-card">
                    <div class="card-info">
                        <div class="card-brand">{paymentMethod.brand}</div>
                        <div class="card-number">
                            •••• •••• •••• {paymentMethod.last4}
                        </div>
                        <div class="card-expiry">
                            Expires {paymentMethod.expiry}
                        </div>
                    </div>
                    <div class="card-badge">
                        {#if paymentMethod.isDefault}
                            <span class="default-badge">Default</span>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- Billing Address -->
        <div class="billing-card">
            <div class="card-header">
                <h2>Billing address</h2>
                <div class="header-actions">
                    <button class="btn-secondary" onclick={updateBillingAddress}
                        >Edit</button
                    >
                </div>
            </div>
            <div class="address-details">
                <div class="address-info">
                    <div class="address-name">{billingAddress.name}</div>
                    {#if billingAddress.company}
                        <div class="address-company">
                            {billingAddress.company}
                        </div>
                    {/if}
                    <div class="address-street">{billingAddress.address}</div>
                    <div class="address-location">
                        {billingAddress.city}, {billingAddress.state}
                        {billingAddress.zip}
                    </div>
                    <div class="address-country">{billingAddress.country}</div>
                    {#if billingAddress.taxId}
                        <div class="address-tax">
                            Tax ID: {billingAddress.taxId}
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Billing History -->
        <div class="billing-card">
            <div class="card-header">
                <h2>Billing history</h2>
                <div class="header-actions">
                    <button class="btn-secondary">View all</button>
                </div>
            </div>
            <div class="billing-history">
                <div class="history-table">
                    <div class="table-header">
                        <div class="header-cell">Invoice</div>
                        <div class="header-cell">Date</div>
                        <div class="header-cell">Description</div>
                        <div class="header-cell">Amount</div>
                        <div class="header-cell">Status</div>
                        <div class="header-cell">Actions</div>
                    </div>
                    {#each billingHistory as invoice}
                        <div class="table-row">
                            <div class="table-cell">
                                <span class="invoice-id">{invoice.id}</span>
                            </div>
                            <div class="table-cell">
                                <span class="invoice-date">{invoice.date}</span>
                            </div>
                            <div class="table-cell">
                                <span class="invoice-description"
                                    >{invoice.description}</span
                                >
                            </div>
                            <div class="table-cell">
                                <span class="invoice-amount"
                                    >{invoice.amount}</span
                                >
                            </div>
                            <div class="table-cell">
                                <span
                                    class="status-badge {getStatusBadgeClass(
                                        invoice.status,
                                    )}">{invoice.status}</span
                                >
                            </div>
                            <div class="table-cell">
                                <button
                                    class="action-btn"
                                    onclick={() => downloadInvoice(invoice)}
                                >
                                    Download
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>

        <!-- Tax Settings -->
        <div class="billing-card">
            <div class="card-header">
                <h2>Tax information</h2>
            </div>
            <div class="tax-info">
                <div class="tax-notice">
                    <span class="notice-icon">ℹ️</span>
                    <div class="notice-content">
                        <p>
                            Tax rates are determined by your billing address. If
                            you're tax-exempt, please contact support with your
                            exemption certificate.
                        </p>
                    </div>
                </div>
                <div class="tax-details">
                    <div class="tax-item">
                        <span class="tax-label">Current tax rate:</span>
                        <span class="tax-value">8.75%</span>
                    </div>
                    <div class="tax-item">
                        <span class="tax-label">Tax jurisdiction:</span>
                        <span class="tax-value">California, United States</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Payment Method Modal -->
{#if showPaymentModal}
    <div class="modal-overlay" onclick={() => (showPaymentModal = false)}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3>Update payment method</h3>
                <button
                    class="modal-close"
                    onclick={() => (showPaymentModal = false)}>&times;</button
                >
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Card number</label>
                    <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        class="form-input"
                    />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Expiry date</label>
                        <input
                            type="text"
                            placeholder="MM/YY"
                            class="form-input"
                        />
                    </div>
                    <div class="form-group">
                        <label>CVC</label>
                        <input
                            type="text"
                            placeholder="123"
                            class="form-input"
                        />
                    </div>
                </div>
                <div class="form-group">
                    <label>Cardholder name</label>
                    <input
                        type="text"
                        placeholder="John Smith"
                        class="form-input"
                    />
                </div>
            </div>
            <div class="modal-actions">
                <button
                    class="btn-secondary"
                    onclick={() => (showPaymentModal = false)}>Cancel</button
                >
                <button
                    class="btn-primary"
                    onclick={() => (showPaymentModal = false)}
                    >Update payment method</button
                >
            </div>
        </div>
    </div>
{/if}

<!-- Billing Address Modal -->
{#if showAddressModal}
    <div class="modal-overlay" onclick={() => (showAddressModal = false)}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3>Edit billing address</h3>
                <button
                    class="modal-close"
                    onclick={() => (showAddressModal = false)}>&times;</button
                >
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Full name</label>
                    <input
                        type="text"
                        bind:value={billingAddress.name}
                        class="form-input"
                    />
                </div>
                <div class="form-group">
                    <label>Company (optional)</label>
                    <input
                        type="text"
                        bind:value={billingAddress.company}
                        class="form-input"
                    />
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <input
                        type="text"
                        bind:value={billingAddress.address}
                        class="form-input"
                    />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>City</label>
                        <input
                            type="text"
                            bind:value={billingAddress.city}
                            class="form-input"
                        />
                    </div>
                    <div class="form-group">
                        <label>State/Province</label>
                        <input
                            type="text"
                            bind:value={billingAddress.state}
                            class="form-input"
                        />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>ZIP/Postal code</label>
                        <input
                            type="text"
                            bind:value={billingAddress.zip}
                            class="form-input"
                        />
                    </div>
                    <div class="form-group">
                        <label>Country</label>
                        <select
                            bind:value={billingAddress.country}
                            class="form-input"
                        >
                            <option>United States</option>
                            <option>Canada</option>
                            <option>United Kingdom</option>
                            <option>Australia</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Tax ID (optional)</label>
                    <input
                        type="text"
                        bind:value={billingAddress.taxId}
                        class="form-input"
                    />
                </div>
            </div>
            <div class="modal-actions">
                <button
                    class="btn-secondary"
                    onclick={() => (showAddressModal = false)}>Cancel</button
                >
                <button class="btn-primary" onclick={saveBillingAddress}
                    >Save address</button
                >
            </div>
        </div>
    </div>
{/if}

<style>
    .page {
        min-height: 100vh;
        background: #f6f6f7;
    }

    .page-header {
        background: white;
        border-bottom: 1px solid #e1e1e1;
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-content h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #202223;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .page-icon {
        font-size: 1rem;
    }

    .breadcrumb {
        display: flex;
        align-items: center;
        color: #6d7175;
        font-size: 0.875rem;
    }

    .breadcrumb-separator {
        margin: 0 0.5rem;
        color: #d1d5db;
    }

    .page-content {
        padding: 2rem;
        max-width: 1000px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .billing-card {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 2rem;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #f0f0f0;
    }

    .card-header h2 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
    }

    .header-actions {
        display: flex;
        gap: 0.75rem;
    }

    .subscription-details {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }

    .subscription-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .plan-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: #202223;
    }

    .plan-price {
        font-size: 1rem;
        color: #6d7175;
    }

    .plan-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #047857;
    }

    .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    .status-indicator.active {
        background: #10b981;
    }

    .billing-summary {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        text-align: right;
    }

    .summary-item {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
    }

    .summary-item .label {
        color: #6d7175;
    }

    .summary-item .value {
        color: #202223;
        font-weight: 500;
    }

    .payment-method-details {
        display: flex;
        align-items: center;
    }

    .payment-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e1e1e1;
    }

    .card-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .card-brand {
        font-weight: 600;
        color: #202223;
        text-transform: capitalize;
    }

    .card-number {
        font-family: monospace;
        color: #6d7175;
        font-size: 0.875rem;
    }

    .card-expiry {
        font-size: 0.8125rem;
        color: #6d7175;
    }

    .default-badge {
        background: #10b981;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .address-details {
        display: flex;
    }

    .address-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
        color: #202223;
    }

    .address-name {
        font-weight: 600;
    }

    .address-company {
        color: #6d7175;
    }

    .address-tax {
        color: #6d7175;
        font-size: 0.8125rem;
    }

    .billing-history {
        display: flex;
        flex-direction: column;
    }

    .history-table {
        display: flex;
        flex-direction: column;
    }

    .table-header,
    .table-row {
        display: grid;
        grid-template-columns: 100px 100px 1fr 100px 80px 100px;
        gap: 1rem;
        align-items: center;
    }

    .table-header {
        padding: 0.75rem 0;
        border-bottom: 2px solid #f0f0f0;
    }

    .header-cell {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6d7175;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .table-row {
        padding: 1rem 0;
        border-bottom: 1px solid #f0f0f0;
    }

    .table-row:last-child {
        border-bottom: none;
    }

    .table-cell {
        font-size: 0.875rem;
    }

    .invoice-id {
        font-family: monospace;
        color: #6d7175;
    }

    .invoice-date {
        color: #6d7175;
    }

    .invoice-description {
        color: #202223;
    }

    .invoice-amount {
        font-weight: 600;
        color: #202223;
    }

    .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .status-paid {
        background: #dcfce7;
        color: #166534;
    }

    .status-pending {
        background: #fef3c7;
        color: #92400e;
    }

    .status-overdue {
        background: #fecaca;
        color: #991b1b;
    }

    .action-btn {
        background: none;
        border: none;
        color: #005bd3;
        font-size: 0.875rem;
        cursor: pointer;
        text-decoration: underline;
    }

    .action-btn:hover {
        color: #004bb5;
    }

    .tax-info {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .tax-notice {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
    }

    .notice-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
    }

    .notice-content p {
        margin: 0;
        color: #0369a1;
        font-size: 0.875rem;
        line-height: 1.5;
    }

    .tax-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .tax-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
    }

    .tax-label {
        color: #6d7175;
    }

    .tax-value {
        color: #202223;
        font-weight: 500;
    }

    .btn-primary,
    .btn-secondary {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        transition: all 0.15s ease;
        border: none;
    }

    .btn-primary {
        background: #202223;
        color: white;
    }

    .btn-primary:hover {
        background: #1a1a1a;
    }

    .btn-secondary {
        background: white;
        color: #6d7175;
        border: 1px solid #c9cccf;
    }

    .btn-secondary:hover {
        background: #f6f6f7;
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e1e1e1;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #202223;
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #6d7175;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
    }

    .modal-close:hover {
        background: #f6f6f7;
    }

    .modal-body {
        padding: 1.5rem;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #202223;
        margin-bottom: 0.5rem;
    }

    .form-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 6px;
        font-size: 0.875rem;
        box-sizing: border-box;
    }

    .form-input:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 1.5rem;
        border-top: 1px solid #e1e1e1;
    }

    @media (max-width: 768px) {
        .page-content {
            padding: 1rem;
        }

        .subscription-details {
            flex-direction: column;
            gap: 1rem;
        }

        .billing-summary {
            text-align: left;
        }

        .table-header,
        .table-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
        }

        .table-header {
            display: none;
        }

        .table-cell {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
        }

        .table-cell::before {
            content: attr(data-label);
            font-weight: 600;
            color: #6d7175;
            font-size: 0.75rem;
            text-transform: uppercase;
        }

        .form-row {
            grid-template-columns: 1fr;
        }
    }
</style>
