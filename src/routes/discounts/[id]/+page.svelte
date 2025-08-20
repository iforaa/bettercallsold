<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import { DiscountService } from '$lib/services/DiscountService.js';
    import { getDiscountTypeDisplay } from '$lib/utils/status';
    import LoadingState from '$lib/components/states/LoadingState.svelte';
    import ErrorState from '$lib/components/states/ErrorState.svelte';
    import DiscountForm from '$lib/components/discounts/DiscountForm.svelte';
    import DiscountStatusBadge from '$lib/components/discounts/DiscountStatusBadge.svelte';
    import type { DiscountFormData } from '$lib/types/discounts';

    // Get discount ID from URL params
    let discountId = $derived($page.params.id);

    // Form state - reusing the same structure as the new discount form
    let formData: DiscountFormData = $state({
        title: '',
        description: '',
        discount_type: 'amount_off_order' as any,
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
        discount_code: '',
        status: 'enabled'
    });

    // UI state
    let loading = $state(true);
    let saving = $state(false);
    let error = $state('');
    let validationErrors = $state({});
    let discount = $state(null);

    // Computed
    let discountTypeTitle = $derived(getDiscountTypeDisplay(formData.discount_type));

    // Load discount on mount
    onMount(() => {
        if (browser) {
            loadDiscount();
        }
    });

    // Load discount from API
    async function loadDiscount() {
        try {
            loading = true;
            error = '';

            const data = await DiscountService.getDiscount(discountId);
            discount = data;

            // Populate form data using service method
            const populatedData = DiscountService.populateFormData(discount);
            Object.assign(formData, populatedData);

        } catch (err) {
            console.error('Load discount error:', err);
            error = err.message || 'Failed to load discount';
        } finally {
            loading = false;
        }
    }


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
            saving = true;
            error = '';

            // Use service to prepare and submit data
            const requestData = DiscountService.prepareDiscountData(submittedFormData);
            await DiscountService.updateDiscount(discountId, requestData);
            
            // Redirect to discounts list
            goto('/discounts');

        } catch (err) {
            console.error('Update discount error:', err);
            error = err.message || 'An error occurred while updating the discount';
        } finally {
            saving = false;
        }
    }

    // Handle cancel
    function handleCancel() {
        goto('/discounts');
    }

    // Handle delete
    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this discount?')) {
            return;
        }

        try {
            await DiscountService.deleteDiscount(discountId);
            goto('/discounts');
        } catch (err) {
            console.error('Delete discount error:', err);
            error = err.message || 'Failed to delete discount';
        }
    }

    // Toggle discount status
    async function toggleStatus() {
        const newStatus = formData.status === 'enabled' ? 'disabled' : 'enabled';
        
        try {
            // Update status and use service to prepare full form data
            const updatedFormData = { ...formData, status: newStatus };
            const requestData = DiscountService.prepareDiscountData(updatedFormData);
            
            await DiscountService.updateDiscount(discountId, requestData);
            formData.status = newStatus;
            
            // Refresh the discount data
            await loadDiscount();
        } catch (err) {
            console.error('Toggle status error:', err);
            error = err.message || `Failed to ${newStatus === 'enabled' ? 'enable' : 'disable'} discount`;
        }
    }
</script>

<svelte:head>
    <title>{loading ? 'Loading...' : formData.title || 'Discount'} - BetterCallSold</title>
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
                    <span class="breadcrumb-item current">{loading ? 'Loading...' : formData.title || 'Discount'}</span>
                </div>
            </div>
            {#if !loading && discount}
                <div class="page-actions">
                    <button 
                        class="btn btn-secondary"
                        onclick={toggleStatus}
                    >
                        {formData.status === 'enabled' ? 'Disable' : 'Enable'}
                    </button>
                    <button 
                        class="btn btn-danger"
                        onclick={handleDelete}
                    >
                        Delete
                    </button>
                    <button 
                        class="btn btn-primary {saving ? 'btn-loading' : ''}"
                        onclick={() => handleSubmit(formData)}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Update discount'}
                    </button>
                </div>
            {/if}
        </div>
    </div>

    <div class="page-content-padded">
        {#if loading}
            <LoadingState message="Loading discount..." size="lg" />
        {:else if error && !discount}
            <ErrorState 
                error={error}
                title="Error"
                onRetry={loadDiscount}
                retryLabel="Retry"
            />
        {:else}
            <!-- Discount type header -->
            <div class="discount-header-container">
                <div class="discount-type-header">
                    <h1>{discountTypeTitle}</h1>
                    <div class="discount-status">
                        <DiscountStatusBadge 
                            status={formData.status}
                            size="md"
                        />
                    </div>
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
                    mode="edit"
                    loading={saving}
                    usageCount={discount?.total_usage_count}
                />
            {/if}
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
        display: flex;
        justify-content: space-between;
        align-items: center;
        grid-column: 1;  /* Only take the first column */
    }

    .discount-type-header h1 {
        margin: 0;
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
    }

    .discount-status {
        display: flex;
        align-items: center;
    }

    /* Page header navigation styling */
    .page-header-nav {
        display: flex;
        align-items: center;
        gap: var(--space-3);
    }
</style>