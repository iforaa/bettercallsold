<script lang="ts">
    // General store settings
    let storeInfo = $state({
        storeName: "BetterCallSold",
        email: "admin@bettercallsold.com",
        phone: "+1 (555) 123-4567",
        address: "1 Rodeo Drive",
        city: "Los Angeles",
        state: "CA",
        zipCode: "90210",
        country: "United States",
        currency: "USD",
        timezone: "America/Los_Angeles",
    });

    let storeSettings = $state({
        enableCustomerAccounts: true,
        enableGuestCheckout: true,
        showVendor: true,
        enableInventoryTracking: true,
        lowStockThreshold: 10,
        enableTaxes: true,
        pricesIncludeTax: false,
    });

    let contactInfo = $state({
        customerSupportEmail: "support@bettercallsold.com",
        orderNotificationEmail: "orders@bettercallsold.com",
        supportPhone: "+1 (555) 123-4567",
        businessHours: "9:00 AM - 6:00 PM PST",
    });

    let showEditModal = $state(false);
    let editSection = $state("");

    function editStoreInfo() {
        editSection = "store";
        showEditModal = true;
    }

    function editContactInfo() {
        editSection = "contact";
        showEditModal = true;
    }

    function saveChanges() {
        showEditModal = false;
        console.log("Saving changes...");
    }
</script>

<svelte:head>
    <title>Settings - BetterCallSold</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="header-content">
            <h1>
                <span class="page-icon">⚙️</span>
                Settings
            </h1>
        </div>
    </div>

    <div class="page-content">
        <!-- Store Information -->
        <div class="settings-card">
            <div class="card-header">
                <h2>Store information</h2>
                <button class="btn-secondary" onclick={editStoreInfo}
                    >Edit</button
                >
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <label>Store name</label>
                    <span class="info-value">{storeInfo.storeName}</span>
                </div>
                <div class="info-item">
                    <label>Email</label>
                    <span class="info-value">{storeInfo.email}</span>
                </div>
                <div class="info-item">
                    <label>Phone</label>
                    <span class="info-value">{storeInfo.phone}</span>
                </div>
                <div class="info-item">
                    <label>Address</label>
                    <span class="info-value">
                        {storeInfo.address}<br />
                        {storeInfo.city}, {storeInfo.state}
                        {storeInfo.zipCode}<br />
                        {storeInfo.country}
                    </span>
                </div>
                <div class="info-item">
                    <label>Currency</label>
                    <span class="info-value">{storeInfo.currency}</span>
                </div>
                <div class="info-item">
                    <label>Timezone</label>
                    <span class="info-value">{storeInfo.timezone}</span>
                </div>
            </div>
        </div>

        <!-- Store Settings -->
        <div class="settings-card">
            <div class="card-header">
                <h2>Store settings</h2>
            </div>
            <div class="settings-list">
                <div class="setting-row">
                    <div class="setting-info">
                        <h3>Customer accounts</h3>
                        <p>
                            Allow customers to create accounts and track orders
                        </p>
                    </div>
                    <label class="toggle-switch">
                        <input
                            type="checkbox"
                            bind:checked={storeSettings.enableCustomerAccounts}
                        />
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-row">
                    <div class="setting-info">
                        <h3>Guest checkout</h3>
                        <p>
                            Allow customers to checkout without creating an
                            account
                        </p>
                    </div>
                    <label class="toggle-switch">
                        <input
                            type="checkbox"
                            bind:checked={storeSettings.enableGuestCheckout}
                        />
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-row">
                    <div class="setting-info">
                        <h3>Show product vendor</h3>
                        <p>Display the vendor/brand name on product pages</p>
                    </div>
                    <label class="toggle-switch">
                        <input
                            type="checkbox"
                            bind:checked={storeSettings.showVendor}
                        />
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-row">
                    <div class="setting-info">
                        <h3>Inventory tracking</h3>
                        <p>Track product quantities and show stock levels</p>
                    </div>
                    <label class="toggle-switch">
                        <input
                            type="checkbox"
                            bind:checked={storeSettings.enableInventoryTracking}
                        />
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                {#if storeSettings.enableInventoryTracking}
                    <div class="setting-row sub-setting">
                        <div class="setting-info">
                            <h3>Low stock threshold</h3>
                            <p>
                                Get notified when inventory drops below this
                                level
                            </p>
                        </div>
                        <div class="number-input">
                            <input
                                type="number"
                                bind:value={storeSettings.lowStockThreshold}
                                min="0"
                                class="threshold-input"
                            />
                            <span class="input-suffix">items</span>
                        </div>
                    </div>
                {/if}

                <div class="setting-row">
                    <div class="setting-info">
                        <h3>Charge taxes</h3>
                        <p>Apply tax rates to orders based on location</p>
                    </div>
                    <label class="toggle-switch">
                        <input
                            type="checkbox"
                            bind:checked={storeSettings.enableTaxes}
                        />
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                {#if storeSettings.enableTaxes}
                    <div class="setting-row sub-setting">
                        <div class="setting-info">
                            <h3>Prices include tax</h3>
                            <p>
                                Product prices already include applicable taxes
                            </p>
                        </div>
                        <label class="toggle-switch">
                            <input
                                type="checkbox"
                                bind:checked={storeSettings.pricesIncludeTax}
                            />
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Contact Information -->
        <div class="settings-card">
            <div class="card-header">
                <h2>Contact information</h2>
                <button class="btn-secondary" onclick={editContactInfo}
                    >Edit</button
                >
            </div>
            <div class="contact-grid">
                <div class="contact-item">
                    <label>Customer support email</label>
                    <span class="contact-value"
                        >{contactInfo.customerSupportEmail}</span
                    >
                </div>
                <div class="contact-item">
                    <label>Order notification email</label>
                    <span class="contact-value"
                        >{contactInfo.orderNotificationEmail}</span
                    >
                </div>
                <div class="contact-item">
                    <label>Support phone</label>
                    <span class="contact-value">{contactInfo.supportPhone}</span
                    >
                </div>
                <div class="contact-item">
                    <label>Business hours</label>
                    <span class="contact-value"
                        >{contactInfo.businessHours}</span
                    >
                </div>
            </div>
        </div>

        <!-- Standards and Formats -->
        <div class="settings-card">
            <div class="card-header">
                <h2>Standards and formats</h2>
            </div>
            <div class="standards-info">
                <div class="standard-item">
                    <span class="standard-label">Weight unit:</span>
                    <span class="standard-value">Pounds (lb)</span>
                </div>
                <div class="standard-item">
                    <span class="standard-label">Date format:</span>
                    <span class="standard-value">MM/DD/YYYY</span>
                </div>
                <div class="standard-item">
                    <span class="standard-label">Time format:</span>
                    <span class="standard-value">12-hour</span>
                </div>
                <div class="standard-item">
                    <span class="standard-label">Number format:</span>
                    <span class="standard-value">1,234.56</span>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Edit Modal -->
{#if showEditModal}
    <div class="modal-overlay" onclick={() => (showEditModal = false)}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3>
                    {#if editSection === "store"}
                        Edit store information
                    {:else if editSection === "contact"}
                        Edit contact information
                    {/if}
                </h3>
                <button
                    class="modal-close"
                    onclick={() => (showEditModal = false)}>&times;</button
                >
            </div>
            <div class="modal-body">
                {#if editSection === "store"}
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Store name</label>
                            <input
                                type="text"
                                bind:value={storeInfo.storeName}
                                class="form-input"
                            />
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                bind:value={storeInfo.email}
                                class="form-input"
                            />
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input
                                type="tel"
                                bind:value={storeInfo.phone}
                                class="form-input"
                            />
                        </div>
                        <div class="form-group full-width">
                            <label>Address</label>
                            <input
                                type="text"
                                bind:value={storeInfo.address}
                                class="form-input"
                            />
                        </div>
                        <div class="form-group">
                            <label>City</label>
                            <input
                                type="text"
                                bind:value={storeInfo.city}
                                class="form-input"
                            />
                        </div>
                        <div class="form-group">
                            <label>State/Province</label>
                            <input
                                type="text"
                                bind:value={storeInfo.state}
                                class="form-input"
                            />
                        </div>
                    </div>
                {:else if editSection === "contact"}
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Customer support email</label>
                            <input
                                type="email"
                                bind:value={contactInfo.customerSupportEmail}
                                class="form-input"
                            />
                        </div>
                        <div class="form-group">
                            <label>Order notification email</label>
                            <input
                                type="email"
                                bind:value={contactInfo.orderNotificationEmail}
                                class="form-input"
                            />
                        </div>
                        <div class="form-group">
                            <label>Support phone</label>
                            <input
                                type="tel"
                                bind:value={contactInfo.supportPhone}
                                class="form-input"
                            />
                        </div>
                        <div class="form-group">
                            <label>Business hours</label>
                            <input
                                type="text"
                                bind:value={contactInfo.businessHours}
                                class="form-input"
                            />
                        </div>
                    </div>
                {/if}
            </div>
            <div class="modal-actions">
                <button
                    class="btn-secondary"
                    onclick={() => (showEditModal = false)}>Cancel</button
                >
                <button class="btn-primary" onclick={saveChanges}
                    >Save changes</button
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

    .page-content {
        padding: 2rem;
        max-width: 1000px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .settings-card {
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

    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
    }

    .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .info-item label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #6d7175;
    }

    .info-value {
        color: #202223;
        font-size: 0.875rem;
        line-height: 1.4;
    }

    .settings-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #f0f0f0;
    }

    .setting-row.sub-setting {
        margin-left: 2rem;
        background: #f6f6f7;
    }

    .setting-info {
        flex: 1;
        margin-right: 1rem;
    }

    .setting-info h3 {
        margin: 0 0 0.25rem 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: #202223;
    }

    .setting-info p {
        margin: 0;
        font-size: 0.8125rem;
        color: #6d7175;
        line-height: 1.4;
    }

    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
    }

    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: 0.4s;
        border-radius: 24px;
    }

    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
    }

    input:checked + .toggle-slider {
        background-color: #10b981;
    }

    input:checked + .toggle-slider:before {
        transform: translateX(20px);
    }

    .number-input {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .threshold-input {
        width: 80px;
        padding: 0.5rem;
        border: 1px solid #c9cccf;
        border-radius: 4px;
        font-size: 0.875rem;
        text-align: center;
    }

    .input-suffix {
        font-size: 0.875rem;
        color: #6d7175;
    }

    .contact-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
    }

    .contact-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .contact-item label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #6d7175;
    }

    .contact-value {
        color: #202223;
        font-size: 0.875rem;
    }

    .standards-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .standard-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: #f9fafb;
        border-radius: 6px;
        font-size: 0.875rem;
    }

    .standard-label {
        color: #6d7175;
    }

    .standard-value {
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
        max-width: 700px;
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

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .form-group.full-width {
        grid-column: 1 / -1;
    }

    .form-group label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #202223;
    }

    .form-input {
        padding: 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 6px;
        font-size: 0.875rem;
    }

    .form-input:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
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

        .info-grid,
        .contact-grid {
            grid-template-columns: 1fr;
        }

        .setting-row {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
        }

        .setting-row.sub-setting {
            margin-left: 1rem;
        }

        .standards-info {
            grid-template-columns: 1fr;
        }

        .form-grid {
            grid-template-columns: 1fr;
        }

        .form-group.full-width {
            grid-column: 1;
        }
    }
</style>
