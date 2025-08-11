<script lang="ts">
    // Payment providers state
    let paymentProviders = $state([
        {
            id: "bettercallsold_payments",
            name: "BetterCallSold Payments",
            description:
                "Let customers pay with popular payment methods at checkout",
            logo: "💳",
            status: "active",
            processingFee: "2.9% + 30¢",
            isRecommended: true,
            features: [
                "No transaction fees",
                "Fraud protection",
                "Chargeback management",
                "Multi-currency",
            ],
        },
        {
            id: "paypal",
            name: "PayPal Express Checkout",
            description: "Let customers check out using their PayPal account",
            logo: "🅿️",
            status: "inactive",
            processingFee: "2.9% + 30¢",
            transactionFee: "2.0%",
            isRecommended: false,
            features: [
                "Express checkout",
                "PayPal Pay Later",
                "Venmo",
                "PayPal Credit",
            ],
        },
        {
            id: "stripe",
            name: "Stripe",
            description: "Accept credit cards and other payment methods",
            logo: "💫",
            status: "inactive",
            processingFee: "2.9% + 30¢",
            transactionFee: "2.0%",
            isRecommended: false,
            features: [
                "Credit cards",
                "Apple Pay",
                "Google Pay",
                "ACH payments",
            ],
        },
        {
            id: "amazon_pay",
            name: "Amazon Pay",
            description: "Let customers pay using their Amazon account",
            logo: "📦",
            status: "inactive",
            processingFee: "2.9% + 30¢",
            transactionFee: "2.0%",
            isRecommended: false,
            features: [
                "One-click checkout",
                "Fraud protection",
                "Mobile optimized",
            ],
        },
    ]);

    let manualPaymentMethods = $state([
        {
            id: "bank_deposit",
            name: "Bank deposit",
            description: "Let customers pay by bank transfer or deposit",
            enabled: true,
            instructions:
                "Transfer funds to:\nAccount: 123456789\nRouting: 987654321",
        },
        {
            id: "cash_on_delivery",
            name: "Cash on delivery (COD)",
            description: "Let customers pay when their order is delivered",
            enabled: false,
            instructions: "Payment will be collected upon delivery.",
        },
        {
            id: "money_order",
            name: "Money order",
            description: "Let customers pay using a money order",
            enabled: false,
            instructions:
                "Send money order to:\nBetterCallSold Inc.\n1 Rodeo dr\nLos Angeles, CA 90210",
        },
    ]);

    let showProviderModal = $state(false);
    let selectedProvider = $state(null);
    let showManualModal = $state(false);
    let selectedManualMethod = $state(null);

    function activateProvider(provider: any) {
        selectedProvider = provider;
        showProviderModal = true;
    }

    function deactivateProvider(provider: any) {
        provider.status = "inactive";
    }

    function toggleManualMethod(method: any) {
        method.enabled = !method.enabled;
        manualPaymentMethods = [...manualPaymentMethods];
    }

    function editManualMethod(method: any) {
        selectedManualMethod = method;
        showManualModal = true;
    }

    function confirmProviderActivation() {
        if (selectedProvider) {
            // Deactivate other providers if activating BetterCallSold Payments
            if (selectedProvider.id === "bettercallsold_payments") {
                paymentProviders = paymentProviders.map((p) => ({
                    ...p,
                    status:
                        p.id === selectedProvider.id ? "active" : "inactive",
                }));
            } else {
                selectedProvider.status = "active";
            }
            showProviderModal = false;
            selectedProvider = null;
        }
    }

    function saveManualMethod() {
        showManualModal = false;
        selectedManualMethod = null;
        manualPaymentMethods = [...manualPaymentMethods];
    }

    function getProviderStatusClass(status: string): string {
        return status === "active" ? "status-active" : "status-inactive";
    }
</script>

<svelte:head>
    <title>Payments - BetterCallSold Settings</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="header-content">
            <h1>
                <span class="page-icon">💳</span>
                Payments
            </h1>
        </div>
        <div class="breadcrumb">
            <span>Settings</span>
            <span class="breadcrumb-separator">›</span>
            <span>Payments</span>
        </div>
    </div>

    <div class="page-content">
        <!-- Payment Providers -->
        <div class="payment-section">
            <div class="section-header">
                <div class="section-title">
                    <h2>Payment providers</h2>
                    <p class="section-description">
                        Choose how customers can pay for their orders
                    </p>
                </div>
            </div>

            <div class="providers-grid">
                {#each paymentProviders as provider}
                    <div
                        class="provider-card"
                        class:active={provider.status === "active"}
                        class:recommended={provider.isRecommended}
                    >
                        {#if provider.isRecommended}
                            <div class="recommended-badge">Recommended</div>
                        {/if}

                        <div class="provider-header">
                            <div class="provider-info">
                                <div class="provider-logo">{provider.logo}</div>
                                <div class="provider-details">
                                    <h3>{provider.name}</h3>
                                    <p>{provider.description}</p>
                                </div>
                            </div>
                            <div class="provider-status">
                                <span
                                    class="status-badge {getProviderStatusClass(
                                        provider.status,
                                    )}"
                                >
                                    {provider.status === "active"
                                        ? "Active"
                                        : "Inactive"}
                                </span>
                            </div>
                        </div>

                        <div class="provider-features">
                            {#each provider.features as feature}
                                <div class="feature-item">
                                    <span class="feature-check">✓</span>
                                    {feature}
                                </div>
                            {/each}
                        </div>

                        <div class="provider-pricing">
                            <div class="pricing-item">
                                <span class="pricing-label"
                                    >Processing fee:</span
                                >
                                <span class="pricing-value"
                                    >{provider.processingFee}</span
                                >
                            </div>
                            {#if provider.transactionFee}
                                <div class="pricing-item">
                                    <span class="pricing-label"
                                        >Transaction fee:</span
                                    >
                                    <span class="pricing-value"
                                        >{provider.transactionFee}</span
                                    >
                                </div>
                            {/if}
                        </div>

                        <div class="provider-actions">
                            {#if provider.status === "active"}
                                <button
                                    class="btn-secondary"
                                    onclick={() => deactivateProvider(provider)}
                                >
                                    Deactivate
                                </button>
                                <button class="btn-primary">Manage</button>
                            {:else}
                                <button
                                    class="btn-primary"
                                    onclick={() => activateProvider(provider)}
                                >
                                    Activate
                                </button>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Manual Payment Methods -->
        <div class="payment-section">
            <div class="section-header">
                <div class="section-title">
                    <h2>Manual payment methods</h2>
                    <p class="section-description">
                        Accept payments outside of your online checkout
                    </p>
                </div>
            </div>

            <div class="manual-methods">
                {#each manualPaymentMethods as method}
                    <div
                        class="manual-method-card"
                        class:enabled={method.enabled}
                    >
                        <div class="method-header">
                            <div class="method-info">
                                <h3>{method.name}</h3>
                                <p>{method.description}</p>
                            </div>
                            <div class="method-controls">
                                <label class="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={method.enabled}
                                        onchange={() =>
                                            toggleManualMethod(method)}
                                    />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                        {#if method.enabled}
                            <div class="method-details">
                                <div class="method-instructions">
                                    <label>Payment instructions:</label>
                                    <div class="instructions-preview">
                                        {method.instructions}
                                    </div>
                                </div>
                                <button
                                    class="edit-btn"
                                    onclick={() => editManualMethod(method)}
                                >
                                    Edit instructions
                                </button>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>

        <!-- Payment Settings -->
        <div class="payment-section">
            <div class="section-header">
                <div class="section-title">
                    <h2>Additional settings</h2>
                </div>
            </div>

            <div class="settings-grid">
                <div class="setting-card">
                    <div class="setting-header">
                        <h3>Authorization and capture</h3>
                        <p>Control when payments are captured</p>
                    </div>
                    <div class="setting-options">
                        <label class="radio-option">
                            <input
                                type="radio"
                                name="capture"
                                value="automatic"
                                checked
                            />
                            <div class="option-content">
                                <span class="option-title"
                                    >Automatically capture payment</span
                                >
                                <span class="option-description"
                                    >Payment is captured immediately when order
                                    is placed</span
                                >
                            </div>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="capture" value="manual" />
                            <div class="option-content">
                                <span class="option-title"
                                    >Manually capture payment</span
                                >
                                <span class="option-description"
                                    >Payment is authorized but not captured
                                    until you manually capture it</span
                                >
                            </div>
                        </label>
                    </div>
                </div>

                <div class="setting-card">
                    <div class="setting-header">
                        <h3>Payment terms</h3>
                        <p>Set custom payment terms for manual methods</p>
                    </div>
                    <div class="setting-field">
                        <label>Custom terms</label>
                        <textarea
                            class="terms-input"
                            placeholder="Enter custom payment terms that will be shown to customers..."
                            rows="4"
                        ></textarea>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Provider Activation Modal -->
{#if showProviderModal}
    <div class="modal-overlay" onclick={() => (showProviderModal = false)}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3>Activate {selectedProvider?.name}</h3>
                <button
                    class="modal-close"
                    onclick={() => (showProviderModal = false)}>&times;</button
                >
            </div>
            <div class="modal-body">
                {#if selectedProvider}
                    <p>
                        You're about to activate <strong
                            >{selectedProvider.name}</strong
                        > as a payment provider.
                    </p>

                    {#if selectedProvider.id === "bettercallsold_payments"}
                        <div class="activation-notice">
                            <span class="notice-icon">ℹ️</span>
                            <div class="notice-content">
                                <p>
                                    <strong>Note:</strong> Activating BetterCallSold
                                    Payments will deactivate other payment providers.
                                    You can reactivate them later if needed.
                                </p>
                            </div>
                        </div>
                    {/if}

                    <div class="provider-summary">
                        <div class="summary-item">
                            <span class="label">Processing fee:</span>
                            <span class="value"
                                >{selectedProvider.processingFee}</span
                            >
                        </div>
                        {#if selectedProvider.transactionFee}
                            <div class="summary-item">
                                <span class="label">Transaction fee:</span>
                                <span class="value"
                                    >{selectedProvider.transactionFee}</span
                                >
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
            <div class="modal-actions">
                <button
                    class="btn-secondary"
                    onclick={() => (showProviderModal = false)}>Cancel</button
                >
                <button class="btn-primary" onclick={confirmProviderActivation}
                    >Activate provider</button
                >
            </div>
        </div>
    </div>
{/if}

<!-- Manual Method Edit Modal -->
{#if showManualModal}
    <div class="modal-overlay" onclick={() => (showManualModal = false)}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3>Edit {selectedManualMethod?.name}</h3>
                <button
                    class="modal-close"
                    onclick={() => (showManualModal = false)}>&times;</button
                >
            </div>
            <div class="modal-body">
                {#if selectedManualMethod}
                    <div class="form-group">
                        <label>Payment instructions</label>
                        <p class="field-help">
                            These instructions will be shown to customers when
                            they select this payment method.
                        </p>
                        <textarea
                            bind:value={selectedManualMethod.instructions}
                            class="instructions-textarea"
                            rows="6"
                        ></textarea>
                    </div>
                {/if}
            </div>
            <div class="modal-actions">
                <button
                    class="btn-secondary"
                    onclick={() => (showManualModal = false)}>Cancel</button
                >
                <button class="btn-primary" onclick={saveManualMethod}
                    >Save instructions</button
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
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 3rem;
    }

    .payment-section {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }

    .section-title h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #202223;
    }

    .section-description {
        margin: 0;
        color: #6d7175;
        font-size: 0.875rem;
    }

    .providers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;
    }

    .provider-card {
        background: white;
        border: 2px solid #e1e1e1;
        border-radius: 12px;
        padding: 2rem;
        position: relative;
        transition: all 0.15s ease;
    }

    .provider-card:hover {
        border-color: #005bd3;
    }

    .provider-card.active {
        border-color: #10b981;
        background: #f0fdf4;
    }

    .provider-card.recommended {
        border-color: #005bd3;
    }

    .recommended-badge {
        position: absolute;
        top: -1px;
        right: 2rem;
        background: #005bd3;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 0 0 8px 8px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .provider-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
    }

    .provider-info {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
    }

    .provider-logo {
        font-size: 2rem;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f6f6f7;
        border-radius: 8px;
        flex-shrink: 0;
    }

    .provider-details h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
    }

    .provider-details p {
        margin: 0;
        color: #6d7175;
        font-size: 0.875rem;
        line-height: 1.4;
    }

    .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .status-active {
        background: #dcfce7;
        color: #166534;
    }

    .status-inactive {
        background: #f3f4f6;
        color: #6b7280;
    }

    .provider-features {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .feature-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #202223;
    }

    .feature-check {
        color: #10b981;
        font-weight: 600;
    }

    .provider-pricing {
        background: #f9fafb;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .pricing-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
    }

    .pricing-label {
        color: #6d7175;
    }

    .pricing-value {
        color: #202223;
        font-weight: 500;
    }

    .provider-actions {
        display: flex;
        gap: 0.75rem;
    }

    .manual-methods {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .manual-method-card {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 1.5rem;
        transition: all 0.15s ease;
    }

    .manual-method-card.enabled {
        border-color: #10b981;
        background: #f0fdf4;
    }

    .method-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
    }

    .method-info h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #202223;
    }

    .method-info p {
        margin: 0;
        color: #6d7175;
        font-size: 0.875rem;
    }

    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
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

    .method-details {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .method-instructions label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #202223;
        margin-bottom: 0.5rem;
    }

    .instructions-preview {
        background: #f9fafb;
        border: 1px solid #e1e1e1;
        border-radius: 6px;
        padding: 0.75rem;
        font-size: 0.875rem;
        color: #202223;
        white-space: pre-line;
        font-family: monospace;
    }

    .edit-btn {
        background: none;
        border: none;
        color: #005bd3;
        font-size: 0.875rem;
        cursor: pointer;
        text-decoration: underline;
        align-self: flex-start;
    }

    .edit-btn:hover {
        color: #004bb5;
    }

    .settings-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 2rem;
    }

    .setting-card {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 2rem;
    }

    .setting-header {
        margin-bottom: 1.5rem;
    }

    .setting-header h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #202223;
    }

    .setting-header p {
        margin: 0;
        color: #6d7175;
        font-size: 0.875rem;
    }

    .setting-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .radio-option {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        cursor: pointer;
        padding: 1rem;
        border: 1px solid #e1e1e1;
        border-radius: 8px;
        transition: all 0.15s ease;
    }

    .radio-option:hover {
        border-color: #005bd3;
        background: #fafbff;
    }

    .radio-option input {
        margin-top: 0.125rem;
    }

    .option-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .option-title {
        font-size: 0.875rem;
        font-weight: 500;
        color: #202223;
    }

    .option-description {
        font-size: 0.8125rem;
        color: #6d7175;
    }

    .setting-field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .setting-field label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #202223;
    }

    .terms-input,
    .instructions-textarea {
        padding: 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 6px;
        font-size: 0.875rem;
        font-family: inherit;
        resize: vertical;
    }

    .terms-input:focus,
    .instructions-textarea:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
    }

    .btn-primary,
    .btn-secondary {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        border: none;
        flex: 1;
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

    .activation-notice {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
        margin: 1rem 0;
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

    .provider-summary {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: #f9fafb;
        border-radius: 8px;
        padding: 1rem;
        margin-top: 1rem;
    }

    .summary-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
    }

    .summary-item .label {
        color: #6d7175;
    }

    .summary-item .value {
        color: #202223;
        font-weight: 500;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .form-group label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #202223;
    }

    .field-help {
        margin: 0;
        font-size: 0.8125rem;
        color: #6d7175;
        line-height: 1.4;
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

        .providers-grid {
            grid-template-columns: 1fr;
        }

        .settings-grid {
            grid-template-columns: 1fr;
        }

        .provider-actions {
            flex-direction: column;
        }

        .method-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
        }
    }
</style>
