<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import { DiscountService } from '$lib/services/DiscountService.js';
    import { getDiscountTypeDisplay } from '$lib/utils/status';
    import DiscountForm from '$lib/components/discounts/DiscountForm.svelte';
    import ErrorState from '$lib/components/states/ErrorState.svelte';
    import type { DiscountFormData } from '$lib/types/discounts';

    // Get URL parameters
    let discountType = $derived($page.url.searchParams.get('type') || 'amount_off_order');
    let discountTitle = $derived(getDiscountTypeDisplay($page.url.searchParams.get('type') || 'amount_off_order'));

    // Form state
    let formData: DiscountFormData = $state({
        title: '',
        description: '',
        discount_type: discountType as any,
        method: 'code',
        value_type: 'percentage',
        value: '',
        minimum_requirement_type: 'none',
        minimum_amount: '',
        minimum_quantity: '',
        usage_limit: '',
        usage_limit_per_customer: '',
        can_combine_with_product_discounts: false,
        can_combine_with_order_discounts: false,
        can_combine_with_shipping_discounts: false,
        customer_eligibility: 'all',
        applies_to_subscription: true,
        applies_to_one_time: true,
        starts_at: '',
        start_time: '',
        ends_at: '',
        end_time: '',
        set_end_date: false,
        available_on_online_store: true,
        available_on_mobile_app: true,
        discount_code: ''
    });

    // Form state management
    let loading = $state(false);
    let error = $state('');
    let validationErrors = $state({});

    // Initialize form on mount
    onMount(() => {
        if (browser) {
            // Set default start date/time to now
            const now = new Date();
            const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
            const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
            
            formData.starts_at = today;
            formData.start_time = currentTime;

            // Generate random discount code if method is 'code'
            if (formData.method === 'code') {
                generateDiscountCode();
            }
        }
    });

    // Generate discount code
    async function generateDiscountCode() {
        try {
            const data = await DiscountService.generateCode();
            formData.discount_code = data.code;
        } catch (err) {
            console.error('Failed to generate discount code:', err);
        }
    }

    // Handle form changes
    function handleFormChange(changes: Partial<DiscountFormData>) {
        Object.assign(formData, changes);
        
        // Handle method change logic
        if ('method' in changes) {
            if (changes.method === 'code' && !formData.discount_code) {
                generateDiscountCode();
            } else if (changes.method === 'automatic') {
                formData.discount_code = '';
            }
        }
    }

    // Validate form
    function validateForm() {
        const errors = {};

        if (!formData.title.trim()) {
            errors.title = 'Title is required';
        }

        if (!formData.value || parseFloat(formData.value) <= 0) {
            errors.value = 'Discount value must be greater than 0';
        }

        if (formData.value_type === 'percentage' && parseFloat(formData.value) > 100) {
            errors.value = 'Percentage cannot exceed 100%';
        }

        if (formData.method === 'code' && !formData.discount_code.trim()) {
            errors.discount_code = 'Discount code is required';
        }

        if (formData.minimum_requirement_type === 'minimum_amount' && (!formData.minimum_amount || parseFloat(formData.minimum_amount) <= 0)) {
            errors.minimum_amount = 'Minimum amount must be greater than 0';
        }

        if (formData.minimum_requirement_type === 'minimum_quantity' && (!formData.minimum_quantity || parseInt(formData.minimum_quantity) <= 0)) {
            errors.minimum_quantity = 'Minimum quantity must be greater than 0';
        }

        if (!formData.starts_at) {
            errors.starts_at = 'Start date is required';
        }

        if (!formData.start_time) {
            errors.start_time = 'Start time is required';
        }

        validationErrors = errors;
        return Object.keys(errors).length === 0;
    }

    // Handle form submission
    async function handleSubmit(submittedFormData: DiscountFormData) {
        if (!validateForm()) {
            return;
        }

        try {
            loading = true;
            error = '';

            // Use service to prepare and submit data
            const requestData = DiscountService.prepareDiscountData(submittedFormData);
            await DiscountService.createDiscount(requestData);
            
            // Redirect to discounts list
            goto('/discounts');

        } catch (err) {
            console.error('Create discount error:', err);
            error = err.message || 'An error occurred while creating the discount';
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Create discount - BetterCallSold</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="page-header-content">
            <div class="page-header-nav">
                <button 
                    class="btn btn-secondary btn-sm"
                    onclick={() => goto('/discounts')}
                    title="Back to discounts"
                >
                    ← Back
                </button>
                <div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
                    <a href="/discounts" class="breadcrumb-item">🏷️ Discounts</a>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item current">Create discount</span>
                </div>
            </div>
            <div class="page-actions">
                <button 
                    class="btn btn-primary {loading ? 'btn-loading' : ''}"
                    onclick={() => handleSubmit(formData)}
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save discount'}
                </button>
            </div>
        </div>
    </div>

    <div class="page-content-padded">
        <!-- Discount type header -->
        <div class="discount-header-container">
            <div class="discount-type-header">
                <h1>{discountTitle}</h1>
            </div>
        </div>

        {#if error}
            <ErrorState 
                error={error}
                title="Error"
            />
        {:else}
            <DiscountForm 
                {formData}
                {validationErrors}
                onSubmit={handleSubmit}
                onFormChange={handleFormChange}
                mode="create"
                {loading}
            />
        {/if}
    </div>
</div>

<style>
    /* Header container that matches DiscountForm layout exactly */
    .discount-header-container {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: var(--space-6);
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--space-4);
        margin-bottom: var(--space-6);
    }
    
    .discount-type-header {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--space-5);
        grid-column: 1;  /* Only take the first column */
    }

    .discount-type-header h1 {
        margin: 0;
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
    }

    /* Page header navigation styling */
    .page-header-nav {
        display: flex;
        align-items: center;
        gap: var(--space-3);
    }
</style>