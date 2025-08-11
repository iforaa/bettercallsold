<script lang="ts">
    // Plan management state
    let currentPlan = $state({
        name: "BetterCallSold Basic",
        price: "$29/month",
        status: "Active",
        billingCycle: "Monthly",
        nextBilling: "2025-09-07",
        trialDaysLeft: 0,
    });

    let availablePlans = $state([
        {
            id: "basic",
            name: "BetterCallSold Basic",
            price: 29,
            yearlyPrice: 290,
            features: [
                "Unlimited products",
                "Staff accounts: 2",
                "Online store",
                "Basic reports",
                "24/7 support",
            ],
            recommended: false,
        },
        {
            id: "pro",
            name: "BetterCallSold Pro",
            price: 79,
            yearlyPrice: 790,
            features: [
                "Everything in Basic",
                "Staff accounts: 5",
                "Professional reports",
                "Gift cards",
                "Advanced shipping",
            ],
            recommended: true,
        },
        {
            id: "enterprise",
            name: "BetterCallSold Enterprise",
            price: 299,
            yearlyPrice: 2990,
            features: [
                "Everything in Pro",
                "Staff accounts: 15",
                "Advanced reports",
                "Third-party shipping calculations",
                "Live selling tools",
            ],
            recommended: false,
        },
    ]);

    let billingCycle = $state("monthly");
    let showUpgradeModal = $state(false);
    let selectedPlan = $state(null);

    function formatPrice(price: number, cycle: string = billingCycle): string {
        if (cycle === "yearly") {
            const monthlyEquivalent = Math.round((price * 10) / 12) / 10;
            return `$${monthlyEquivalent}/month (billed yearly)`;
        }
        return `$${price}/month`;
    }

    function selectPlan(plan: any) {
        selectedPlan = plan;
        showUpgradeModal = true;
    }

    function confirmPlanChange() {
        if (selectedPlan) {
            currentPlan.name = selectedPlan.name;
            currentPlan.price = formatPrice(selectedPlan.price);
            showUpgradeModal = false;
            selectedPlan = null;
        }
    }
</script>

<svelte:head>
    <title>Plan - BetterCallSold Settings</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="header-content">
            <h1>
                <span class="page-icon">📊</span>
                Plan
            </h1>
        </div>
        <div class="breadcrumb">
            <span>Settings</span>
            <span class="breadcrumb-separator">›</span>
            <span>Plan</span>
        </div>
    </div>

    <div class="page-content">
        <!-- Current Plan Status -->
        <div class="plan-status-card">
            <div class="status-header">
                <div class="status-info">
                    <h2>Current Plan</h2>
                    <div class="plan-details">
                        <div class="plan-name">{currentPlan.name}</div>
                        <div class="plan-price">{currentPlan.price}</div>
                        <div class="plan-status active">
                            <span class="status-indicator"></span>
                            {currentPlan.status}
                        </div>
                    </div>
                </div>
                <div class="billing-info">
                    <div class="billing-detail">
                        <span class="label">Billing cycle:</span>
                        <span class="value">{currentPlan.billingCycle}</span>
                    </div>
                    <div class="billing-detail">
                        <span class="label">Next billing date:</span>
                        <span class="value">{currentPlan.nextBilling}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Plan Comparison -->
        <div class="plan-section">
            <div class="section-header">
                <h3>Choose your plan</h3>
                <div class="billing-toggle">
                    <label
                        class="toggle-option"
                        class:active={billingCycle === "monthly"}
                    >
                        <input
                            type="radio"
                            bind:group={billingCycle}
                            value="monthly"
                        />
                        Monthly
                    </label>
                    <label
                        class="toggle-option"
                        class:active={billingCycle === "yearly"}
                    >
                        <input
                            type="radio"
                            bind:group={billingCycle}
                            value="yearly"
                        />
                        Yearly <span class="savings">Save 10%</span>
                    </label>
                </div>
            </div>

            <div class="plans-grid">
                {#each availablePlans as plan}
                    <div
                        class="plan-card"
                        class:recommended={plan.recommended}
                        class:current={currentPlan.name === plan.name}
                    >
                        {#if plan.recommended}
                            <div class="recommended-badge">Most popular</div>
                        {/if}
                        {#if currentPlan.name === plan.name}
                            <div class="current-badge">Current plan</div>
                        {/if}

                        <div class="plan-header">
                            <h4>{plan.name}</h4>
                            <div class="plan-pricing">
                                <span class="price"
                                    >{formatPrice(
                                        billingCycle === "yearly"
                                            ? plan.yearlyPrice
                                            : plan.price,
                                    )}</span
                                >
                            </div>
                        </div>

                        <div class="plan-features">
                            {#each plan.features as feature}
                                <div class="feature">
                                    <span class="check">✓</span>
                                    {feature}
                                </div>
                            {/each}
                        </div>

                        <div class="plan-actions">
                            {#if currentPlan.name === plan.name}
                                <button class="btn-current" disabled
                                    >Current plan</button
                                >
                            {:else}
                                <button
                                    class="btn-primary"
                                    onclick={() => selectPlan(plan)}
                                >
                                    {plan.price > 29 ? "Upgrade" : "Downgrade"} to
                                    {plan.name}
                                </button>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Plan Features Details -->
        <div class="features-section">
            <h3>All plans include</h3>
            <div class="features-grid">
                <div class="feature-category">
                    <h4>🛒 Selling features</h4>
                    <ul>
                        <li>Unlimited products</li>
                        <li>Unlimited bandwidth</li>
                        <li>SSL certificate</li>
                        <li>Mobile-optimized checkout</li>
                        <li>Discount codes</li>
                    </ul>
                </div>
                <div class="feature-category">
                    <h4>📊 Analytics & reporting</h4>
                    <ul>
                        <li>Basic reports</li>
                        <li>Real-time visitor tracking</li>
                        <li>Inventory tracking</li>
                        <li>Tax reports</li>
                        <li>Financial reports</li>
                    </ul>
                </div>
                <div class="feature-category">
                    <h4>🚀 Marketing tools</h4>
                    <ul>
                        <li>SEO features</li>
                        <li>Email marketing integrations</li>
                        <li>Social media integration</li>
                        <li>Customer accounts</li>
                        <li>Abandoned cart recovery</li>
                    </ul>
                </div>
                <div class="feature-category">
                    <h4>🛡️ Support & security</h4>
                    <ul>
                        <li>24/7 support</li>
                        <li>Fraud analysis</li>
                        <li>PCI compliance</li>
                        <li>Data backup</li>
                        <li>99.9% uptime</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Plan Change Modal -->
{#if showUpgradeModal}
    <div class="modal-overlay" onclick={() => (showUpgradeModal = false)}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3>Confirm plan change</h3>
                <button
                    class="modal-close"
                    onclick={() => (showUpgradeModal = false)}>&times;</button
                >
            </div>
            <div class="modal-body">
                {#if selectedPlan}
                    <p>
                        You're about to change your plan to <strong
                            >{selectedPlan.name}</strong
                        >
                        for {formatPrice(selectedPlan.price)}.
                    </p>
                    <div class="change-details">
                        <div class="detail-row">
                            <span>New plan:</span>
                            <span>{selectedPlan.name}</span>
                        </div>
                        <div class="detail-row">
                            <span>Price:</span>
                            <span>{formatPrice(selectedPlan.price)}</span>
                        </div>
                        <div class="detail-row">
                            <span>Effective:</span>
                            <span>Immediately</span>
                        </div>
                    </div>
                {/if}
            </div>
            <div class="modal-actions">
                <button
                    class="btn-secondary"
                    onclick={() => (showUpgradeModal = false)}>Cancel</button
                >
                <button class="btn-primary" onclick={confirmPlanChange}
                    >Confirm change</button
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
        gap: 2rem;
    }

    .plan-status-card {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 2rem;
    }

    .status-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }

    .status-info h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
    }

    .plan-details {
        display: flex;
        gap: 2rem;
        align-items: center;
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
    }

    .plan-status.active {
        color: #047857;
    }

    .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
    }

    .billing-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        text-align: right;
    }

    .billing-detail {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
    }

    .billing-detail .label {
        color: #6d7175;
    }

    .billing-detail .value {
        color: #202223;
        font-weight: 500;
    }

    .plan-section {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 2rem;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    .section-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
    }

    .billing-toggle {
        display: flex;
        background: #f6f6f7;
        border-radius: 8px;
        padding: 4px;
        gap: 4px;
    }

    .toggle-option {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .toggle-option input {
        display: none;
    }

    .toggle-option.active {
        background: white;
        color: #202223;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .savings {
        background: #10b981;
        color: white;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .plans-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .plan-card {
        border: 2px solid #e1e1e1;
        border-radius: 12px;
        padding: 2rem;
        position: relative;
        transition: all 0.15s ease;
    }

    .plan-card:hover {
        border-color: #005bd3;
        box-shadow: 0 4px 12px rgba(0, 91, 211, 0.1);
    }

    .plan-card.recommended {
        border-color: #005bd3;
        background: #fafbff;
    }

    .plan-card.current {
        border-color: #10b981;
        background: #f0fdf4;
    }

    .recommended-badge,
    .current-badge {
        position: absolute;
        top: -1px;
        left: 50%;
        transform: translateX(-50%);
        padding: 0.25rem 0.75rem;
        border-radius: 0 0 8px 8px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .recommended-badge {
        background: #005bd3;
        color: white;
    }

    .current-badge {
        background: #10b981;
        color: white;
    }

    .plan-header {
        margin-bottom: 1.5rem;
    }

    .plan-header h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #202223;
    }

    .plan-pricing .price {
        font-size: 1.5rem;
        font-weight: 700;
        color: #202223;
    }

    .plan-features {
        margin-bottom: 2rem;
    }

    .feature {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
        font-size: 0.875rem;
        color: #202223;
    }

    .feature .check {
        color: #10b981;
        font-weight: 600;
    }

    .plan-actions {
        display: flex;
        gap: 0.75rem;
    }

    .btn-primary,
    .btn-secondary,
    .btn-current {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        border: none;
        width: 100%;
        text-align: center;
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

    .btn-current {
        background: #10b981;
        color: white;
        cursor: not-allowed;
    }

    .features-section {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 2rem;
    }

    .features-section h3 {
        margin: 0 0 1.5rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
    }

    .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
    }

    .feature-category h4 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #202223;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .feature-category ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .feature-category li {
        padding: 0.5rem 0;
        color: #6d7175;
        font-size: 0.875rem;
        border-bottom: 1px solid #f6f6f7;
    }

    .feature-category li:last-child {
        border-bottom: none;
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

    .change-details {
        margin-top: 1rem;
        background: #f6f6f7;
        border-radius: 8px;
        padding: 1rem;
    }

    .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
    }

    .detail-row:last-child {
        margin-bottom: 0;
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

        .status-header {
            flex-direction: column;
            gap: 1rem;
        }

        .plan-details {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
        }

        .billing-info {
            text-align: left;
        }

        .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
        }

        .plans-grid {
            grid-template-columns: 1fr;
        }

        .features-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
