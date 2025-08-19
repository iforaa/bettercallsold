<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';

    // Get discount ID from URL params
    let discountId = $derived($page.params.id);

    // Form state - reusing the same structure as the new discount form
    let formData = $state({
        title: '',
        description: '',
        discount_type: '',
        method: 'code', // 'code' or 'automatic'
        value_type: 'percentage', // 'percentage' or 'fixed_amount'
        value: '',
        minimum_requirement_type: 'none', // 'none', 'minimum_amount', 'minimum_quantity'
        minimum_amount: '',
        minimum_quantity: '',
        usage_limit: '',
        usage_limit_per_customer: '',
        can_combine_with_product_discounts: false,
        can_combine_with_order_discounts: false,
        can_combine_with_shipping_discounts: false,
        customer_eligibility: 'all', // 'all', 'specific_segments', 'specific_customers'
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
        status: 'enabled' // Track status for enable/disable
    });

    // UI state
    let loading = $state(true);
    let saving = $state(false);
    let error = $state('');
    let validationErrors = $state({});
    let discount = $state(null);

    // Computed
    let discountTypeTitle = $derived(getDiscountTypeTitle(formData.discount_type));

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

            const response = await fetch(`/api/discounts/${discountId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    error = 'Discount not found';
                    return;
                }
                throw new Error('Failed to load discount');
            }

            const data = await response.json();
            discount = data;

            // Populate form data
            populateFormData(discount);

        } catch (err) {
            console.error('Load discount error:', err);
            error = 'Failed to load discount';
        } finally {
            loading = false;
        }
    }

    // Populate form data from discount
    function populateFormData(discountData) {
        // Parse dates with null checks
        const startsAt = discountData.starts_at ? new Date(discountData.starts_at) : new Date();
        const endsAt = discountData.ends_at ? new Date(discountData.ends_at) : null;

        formData.title = discountData.title || '';
        formData.description = discountData.description || '';
        formData.discount_type = discountData.discount_type || '';
        formData.method = discountData.method || 'code';
        formData.value_type = discountData.value_type || 'percentage';
        formData.value = discountData.value?.toString() || '';
        formData.minimum_requirement_type = discountData.minimum_requirement_type || 'none';
        formData.minimum_amount = discountData.minimum_amount?.toString() || '';
        formData.minimum_quantity = discountData.minimum_quantity?.toString() || '';
        formData.usage_limit = discountData.usage_limit?.toString() || '';
        formData.usage_limit_per_customer = discountData.usage_limit_per_customer?.toString() || '';
        formData.can_combine_with_product_discounts = discountData.can_combine_with_product_discounts || false;
        formData.can_combine_with_order_discounts = discountData.can_combine_with_order_discounts || false;
        formData.can_combine_with_shipping_discounts = discountData.can_combine_with_shipping_discounts || false;
        formData.customer_eligibility = discountData.customer_eligibility || 'all';
        formData.applies_to_subscription = discountData.applies_to_subscription !== false;
        formData.applies_to_one_time = discountData.applies_to_one_time !== false;
        formData.available_on_online_store = discountData.available_on_online_store !== false;
        formData.available_on_mobile_app = discountData.available_on_mobile_app !== false;
        formData.discount_code = discountData.code || '';
        formData.status = discountData.status === 'active' ? 'enabled' : 'disabled';

        // Format dates
        formData.starts_at = startsAt.toISOString().split('T')[0];
        formData.start_time = startsAt.toTimeString().slice(0, 5);
        
        if (endsAt) {
            formData.set_end_date = true;
            formData.ends_at = endsAt.toISOString().split('T')[0];
            formData.end_time = endsAt.toTimeString().slice(0, 5);
        }
    }

    // Get discount type title
    function getDiscountTypeTitle(type) {
        switch (type) {
            case 'amount_off_order': return 'Amount off order';
            case 'amount_off_products': return 'Amount off products';
            case 'buy_x_get_y': return 'Buy X get Y';
            case 'free_shipping': return 'Free shipping';
            default: return 'Discount';
        }
    }

    // Generate discount code
    async function generateDiscountCode() {
        try {
            const response = await fetch('/api/discounts/generate-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                formData.discount_code = data.code;
            }
        } catch (err) {
            console.error('Failed to generate discount code:', err);
        }
    }

    // Handle method change
    function handleMethodChange(newMethod) {
        formData.method = newMethod;
        
        if (newMethod === 'code' && !formData.discount_code) {
            generateDiscountCode();
        } else if (newMethod === 'automatic') {
            formData.discount_code = '';
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
    async function handleSubmit() {
        if (!validateForm()) {
            return;
        }

        try {
            saving = true;
            error = '';

            // Format dates
            const startsAt = new Date(`${formData.starts_at}T${formData.start_time}:00Z`);
            let endsAt = null;
            
            if (formData.set_end_date && formData.ends_at && formData.end_time) {
                endsAt = new Date(`${formData.ends_at}T${formData.end_time}:00Z`);
            }

            // Prepare request data
            const requestData = {
                title: formData.title,
                description: formData.description,
                discount_type: formData.discount_type,
                method: formData.method,
                value_type: formData.value_type,
                value: parseFloat(formData.value),
                minimum_requirement_type: formData.minimum_requirement_type,
                minimum_amount: formData.minimum_amount ? parseFloat(formData.minimum_amount) : null,
                minimum_quantity: formData.minimum_quantity ? parseInt(formData.minimum_quantity) : null,
                usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
                usage_limit_per_customer: formData.usage_limit_per_customer ? parseInt(formData.usage_limit_per_customer) : null,
                can_combine_with_product_discounts: formData.can_combine_with_product_discounts,
                can_combine_with_order_discounts: formData.can_combine_with_order_discounts,
                can_combine_with_shipping_discounts: formData.can_combine_with_shipping_discounts,
                customer_eligibility: formData.customer_eligibility,
                applies_to_subscription: formData.applies_to_subscription,
                applies_to_one_time: formData.applies_to_one_time,
                starts_at: startsAt.toISOString(),
                ends_at: endsAt ? endsAt.toISOString() : null,
                available_on_online_store: formData.available_on_online_store,
                available_on_mobile_app: formData.available_on_mobile_app,
                discount_code: formData.method === 'code' ? formData.discount_code : undefined,
                status: formData.status
            };

            const response = await fetch(`/api/discounts/${discountId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                // Redirect to discounts list
                goto('/discounts');
            } else {
                const data = await response.json();
                error = data.message || 'Failed to update discount';
            }

        } catch (err) {
            console.error('Update discount error:', err);
            error = 'An error occurred while updating the discount';
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
            const response = await fetch(`/api/discounts/${discountId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                goto('/discounts');
            } else {
                const data = await response.json();
                error = data.message || 'Failed to delete discount';
            }
        } catch (err) {
            console.error('Delete discount error:', err);
            error = 'Failed to delete discount';
        }
    }

    // Toggle discount status
    async function toggleStatus() {
        const newStatus = formData.status === 'enabled' ? 'disabled' : 'enabled';
        
        try {
            const response = await fetch(`/api/discounts/${discountId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...formData,
                    status: newStatus,
                    // Convert string values to numbers where needed
                    value: parseFloat(formData.value),
                    minimum_amount: formData.minimum_amount ? parseFloat(formData.minimum_amount) : null,
                    minimum_quantity: formData.minimum_quantity ? parseInt(formData.minimum_quantity) : null,
                    usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
                    usage_limit_per_customer: formData.usage_limit_per_customer ? parseInt(formData.usage_limit_per_customer) : null
                })
            });

            if (response.ok) {
                formData.status = newStatus;
                // Refresh the discount data
                await loadDiscount();
            } else {
                const data = await response.json();
                error = data.message || `Failed to ${newStatus === 'enabled' ? 'enable' : 'disable'} discount`;
            }
        } catch (err) {
            console.error('Toggle status error:', err);
            error = `Failed to ${newStatus === 'enabled' ? 'enable' : 'disable'} discount`;
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
                </div>
            {/if}
        </div>
    </div>

    <div class="page-content">
        {#if loading}
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading discount...</p>
            </div>
        {:else if error && !discount}
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Error</h3>
                <p>{error}</p>
                <button class="btn btn-primary" onclick={() => loadDiscount()}>
                    Retry
                </button>
            </div>
        {:else}
            <div class="form-layout">
                <!-- Main form content -->
                <div class="form-main">
                    <!-- Discount type header -->
                    <div class="discount-type-header">
                        <h1>{discountTypeTitle}</h1>
                        <div class="discount-status">
                            <span class="status-badge {formData.status === 'enabled' ? 'status-badge-active' : 'status-badge-disabled'}">
                                {formData.status === 'enabled' ? 'Active' : 'Disabled'}
                            </span>
                        </div>
                    </div>

                    {#if error}
                        <div class="error-alert">
                            <span class="error-icon">⚠</span>
                            {error}
                        </div>
                    {/if}

                    <!-- Method selection -->
                    <div class="form-section">
                        <h2>Method</h2>
                        <div class="method-tabs">
                            <button 
                                class="method-tab {formData.method === 'code' ? 'active' : ''}"
                                onclick={() => handleMethodChange('code')}
                            >
                                Discount code
                            </button>
                            <button 
                                class="method-tab {formData.method === 'automatic' ? 'active' : ''}"
                                onclick={() => handleMethodChange('automatic')}
                            >
                                Automatic discount
                            </button>
                        </div>

                        {#if formData.method === 'code'}
                            <div class="form-field">
                                <label class="form-label" for="discount-code">
                                    Discount Code
                                    {#if validationErrors.discount_code}
                                        <span class="field-error">({validationErrors.discount_code})</span>
                                    {/if}
                                </label>
                                <div class="code-input-group">
                                    <input 
                                        id="discount-code"
                                        type="text" 
                                        class="form-input {validationErrors.discount_code ? 'error' : ''}"
                                        bind:value={formData.discount_code}
                                        placeholder="Enter discount code"
                                    />
                                    <button 
                                        type="button" 
                                        class="btn btn-secondary"
                                        onclick={generateDiscountCode}
                                    >
                                        Generate random code
                                    </button>
                                </div>
                                <p class="form-help">Customers must enter this code at checkout.</p>
                            </div>
                        {/if}
                    </div>

                    <!-- Discount value -->
                    <div class="form-section">
                        <h2>Discount Value</h2>
                        
                        <div class="value-input-group">
                            <select 
                                class="form-select value-type-select"
                                bind:value={formData.value_type}
                            >
                                <option value="percentage">Percentage</option>
                                <option value="fixed_amount">Fixed amount</option>
                            </select>
                            
                            <div class="value-input-container">
                                <input 
                                    type="number" 
                                    class="form-input value-input {validationErrors.value ? 'error' : ''}"
                                    bind:value={formData.value}
                                    placeholder={formData.value_type === 'percentage' ? '0' : '0.00'}
                                    step={formData.value_type === 'percentage' ? '1' : '0.01'}
                                    min="0"
                                    max={formData.value_type === 'percentage' ? '100' : undefined}
                                />
                                <span class="value-suffix">
                                    {formData.value_type === 'percentage' ? '%' : '$'}
                                </span>
                            </div>
                        </div>
                        {#if validationErrors.value}
                            <p class="field-error">{validationErrors.value}</p>
                        {/if}
                    </div>

                    <!-- Purchase type -->
                    <div class="form-section">
                        <h2>Purchase type</h2>
                        <div class="purchase-type-options">
                            <label class="radio-label">
                                <input 
                                    type="radio" 
                                    bind:group={formData.applies_to_one_time}
                                    value={true}
                                    checked
                                />
                                One-time purchase
                            </label>
                        </div>
                    </div>

                    <!-- Customer eligibility -->
                    <div class="form-section">
                        <h2>Eligibility</h2>
                        <p class="section-description">Available on all sales channels</p>
                        
                        <div class="eligibility-options">
                            <label class="radio-label">
                                <input 
                                    type="radio" 
                                    bind:group={formData.customer_eligibility}
                                    value="all"
                                />
                                All customers
                            </label>
                            <label class="radio-label">
                                <input 
                                    type="radio" 
                                    bind:group={formData.customer_eligibility}
                                    value="specific_segments"
                                    disabled
                                />
                                Specific customer segments
                                <span class="coming-soon">Coming soon</span>
                            </label>
                            <label class="radio-label">
                                <input 
                                    type="radio" 
                                    bind:group={formData.customer_eligibility}
                                    value="specific_customers"
                                    disabled
                                />
                                Specific customers
                                <span class="coming-soon">Coming soon</span>
                            </label>
                        </div>
                    </div>

                    <!-- Minimum purchase requirements -->
                    <div class="form-section">
                        <h2>Minimum purchase requirements</h2>
                        
                        <div class="minimum-requirements">
                            <label class="radio-label">
                                <input 
                                    type="radio" 
                                    bind:group={formData.minimum_requirement_type}
                                    value="none"
                                />
                                No minimum requirements
                            </label>
                            
                            <label class="radio-label">
                                <input 
                                    type="radio" 
                                    bind:group={formData.minimum_requirement_type}
                                    value="minimum_amount"
                                />
                                Minimum purchase amount ($)
                            </label>
                            {#if formData.minimum_requirement_type === 'minimum_amount'}
                                <div class="nested-input">
                                    <input 
                                        type="number" 
                                        class="form-input {validationErrors.minimum_amount ? 'error' : ''}"
                                        bind:value={formData.minimum_amount}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                    />
                                    {#if validationErrors.minimum_amount}
                                        <p class="field-error">{validationErrors.minimum_amount}</p>
                                    {/if}
                                </div>
                            {/if}
                            
                            <label class="radio-label">
                                <input 
                                    type="radio" 
                                    bind:group={formData.minimum_requirement_type}
                                    value="minimum_quantity"
                                />
                                Minimum quantity of items
                            </label>
                            {#if formData.minimum_requirement_type === 'minimum_quantity'}
                                <div class="nested-input">
                                    <input 
                                        type="number" 
                                        class="form-input {validationErrors.minimum_quantity ? 'error' : ''}"
                                        bind:value={formData.minimum_quantity}
                                        placeholder="0"
                                        min="0"
                                    />
                                    {#if validationErrors.minimum_quantity}
                                        <p class="field-error">{validationErrors.minimum_quantity}</p>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Maximum discount uses -->
                    <div class="form-section">
                        <h2>Maximum discount uses</h2>
                        
                        <div class="usage-limits">
                            <label class="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    bind:checked={formData.usage_limit}
                                />
                                Limit number of times this discount can be used in total
                            </label>
                            {#if formData.usage_limit}
                                <div class="nested-input">
                                    <input 
                                        type="number" 
                                        class="form-input"
                                        bind:value={formData.usage_limit}
                                        placeholder="0"
                                        min="1"
                                    />
                                </div>
                            {/if}

                            <label class="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    bind:checked={formData.usage_limit_per_customer}
                                />
                                Limit to one use per customer
                            </label>
                            {#if formData.usage_limit_per_customer}
                                <div class="nested-input">
                                    <input 
                                        type="number" 
                                        class="form-input"
                                        bind:value={formData.usage_limit_per_customer}
                                        placeholder="1"
                                        min="1"
                                    />
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Combinations -->
                    <div class="form-section">
                        <h2>Combinations</h2>
                        
                        <div class="combinations">
                            <label class="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    bind:checked={formData.can_combine_with_product_discounts}
                                />
                                Product discounts
                            </label>

                            <label class="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    bind:checked={formData.can_combine_with_order_discounts}
                                />
                                Order discounts
                            </label>

                            <label class="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    bind:checked={formData.can_combine_with_shipping_discounts}
                                />
                                Shipping discounts
                            </label>
                        </div>
                    </div>

                    <!-- Active dates -->
                    <div class="form-section">
                        <h2>Active dates</h2>
                        
                        <div class="date-inputs">
                            <div class="date-group">
                                <div class="date-field">
                                    <label class="form-label" for="start-date">
                                        Start date
                                        {#if validationErrors.starts_at}
                                            <span class="field-error">({validationErrors.starts_at})</span>
                                        {/if}
                                    </label>
                                    <input 
                                        id="start-date"
                                        type="date" 
                                        class="form-input {validationErrors.starts_at ? 'error' : ''}"
                                        bind:value={formData.starts_at}
                                    />
                                </div>
                                
                                <div class="time-field">
                                    <label class="form-label" for="start-time">
                                        Start time (EDT)
                                        {#if validationErrors.start_time}
                                            <span class="field-error">({validationErrors.start_time})</span>
                                        {/if}
                                    </label>
                                    <input 
                                        id="start-time"
                                        type="time" 
                                        class="form-input {validationErrors.start_time ? 'error' : ''}"
                                        bind:value={formData.start_time}
                                    />
                                </div>
                            </div>

                            <label class="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    bind:checked={formData.set_end_date}
                                />
                                Set end date
                            </label>

                            {#if formData.set_end_date}
                                <div class="date-group">
                                    <div class="date-field">
                                        <label class="form-label" for="end-date">End date</label>
                                        <input 
                                            id="end-date"
                                            type="date" 
                                            class="form-input"
                                            bind:value={formData.ends_at}
                                        />
                                    </div>
                                    
                                    <div class="time-field">
                                        <label class="form-label" for="end-time">End time (EDT)</label>
                                        <input 
                                            id="end-time"
                                            type="time" 
                                            class="form-input"
                                            bind:value={formData.end_time}
                                        />
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="form-sidebar">
                    <div class="sidebar-section">
                        <div class="preview-header">
                            <h3>Summary</h3>
                        </div>
                        
                        <div class="discount-preview">
                            <div class="preview-title">
                                {formData.title || 'No discount code yet'}
                            </div>
                            <div class="preview-subtitle">{formData.method === 'code' ? 'Code' : 'Automatic'}</div>
                            
                            <div class="preview-section">
                                <div class="preview-label">Type</div>
                                <div class="preview-value">{discountTypeTitle}</div>
                                <div class="preview-icon">💰</div>
                            </div>

                            <div class="preview-section">
                                <div class="preview-label">Details</div>
                                <div class="preview-details">
                                    <div>• All customers</div>
                                    <div>• Applies to one-time purchases</div>
                                    {#if formData.minimum_requirement_type === 'none'}
                                        <div>• No minimum purchase requirement</div>
                                    {:else if formData.minimum_requirement_type === 'minimum_amount'}
                                        <div>• Minimum purchase of ${formData.minimum_amount || '0.00'}</div>
                                    {:else if formData.minimum_requirement_type === 'minimum_quantity'}
                                        <div>• Minimum {formData.minimum_quantity || '0'} items</div>
                                    {/if}
                                    <div>• No usage limits</div>
                                    <div>• Can't combine with other discounts</div>
                                    <div>• Active from {formData.starts_at || 'today'}</div>
                                </div>
                            </div>

                            {#if discount?.total_usage_count !== undefined}
                                <div class="preview-section">
                                    <div class="preview-label">Usage</div>
                                    <div class="preview-value">{discount.total_usage_count || 0} times used</div>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Save actions -->
                    <div class="save-actions">
                        <button 
                            class="btn btn-primary btn-lg" 
                            onclick={handleSubmit}
                            disabled={saving}
                        >
                            {#if saving}
                                <span class="loading-spinner"></span>
                                Saving...
                            {:else}
                                Save discount
                            {/if}
                        </button>
                        
                        <button 
                            class="btn btn-secondary btn-lg" 
                            onclick={handleCancel}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Reuse styles from new discount page */
    .form-layout {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: var(--space-6);
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--space-4);
    }

    .form-main {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    .form-sidebar {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .form-section {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--space-5);
    }

    .form-section h2 {
        margin: 0 0 var(--space-4) 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
    }

    .section-description {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        margin-bottom: var(--space-4);
    }

    /* Discount type header with status */
    .discount-type-header {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--space-5);
        display: flex;
        justify-content: space-between;
        align-items: center;
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

    /* Error alert */
    .error-alert {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
        border-radius: var(--radius-md);
        padding: var(--space-3);
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .error-icon {
        font-size: var(--font-size-lg);
    }

    /* Method tabs */
    .method-tabs {
        display: flex;
        gap: var(--space-1);
        margin-bottom: var(--space-4);
        border-bottom: 1px solid var(--color-border);
    }

    .method-tab {
        background: none;
        border: none;
        padding: var(--space-3) var(--space-4);
        color: var(--color-text-secondary);
        cursor: pointer;
        font-weight: var(--font-weight-medium);
        border-bottom: 2px solid transparent;
        transition: all var(--transition-fast);
    }

    .method-tab:hover {
        color: var(--color-text-primary);
    }

    .method-tab.active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
    }

    /* Form fields */
    .form-field {
        margin-bottom: var(--space-4);
    }

    .form-label {
        display: block;
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
        margin-bottom: var(--space-2);
        font-size: var(--font-size-sm);
    }

    .form-input,
    .form-select {
        width: 100%;
        padding: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        font-size: var(--font-size-sm);
        transition: border-color var(--transition-fast);
    }

    .form-input:focus,
    .form-select:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }

    .form-input.error {
        border-color: #dc2626;
    }

    .form-help {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
        margin-top: var(--space-1);
        margin-bottom: 0;
    }

    .field-error {
        color: #dc2626;
        font-size: var(--font-size-xs);
        margin-top: var(--space-1);
    }

    /* Input groups */
    .code-input-group {
        display: flex;
        gap: var(--space-3);
        align-items: flex-start;
    }

    .code-input-group .form-input {
        flex: 1;
    }

    .value-input-group {
        display: flex;
        gap: var(--space-3);
        align-items: flex-start;
    }

    .value-type-select {
        width: 150px;
    }

    .value-input-container {
        flex: 1;
        position: relative;
    }

    .value-input {
        padding-right: 40px;
    }

    .value-suffix {
        position: absolute;
        right: var(--space-3);
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-text-secondary);
        pointer-events: none;
    }

    /* Radio and checkbox labels */
    .radio-label,
    .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-bottom: var(--space-3);
        cursor: pointer;
        font-size: var(--font-size-sm);
    }

    .radio-label:last-child,
    .checkbox-label:last-child {
        margin-bottom: 0;
    }

    .coming-soon {
        font-size: var(--font-size-xs);
        background: var(--color-warning);
        color: var(--color-warning-text);
        padding: 2px var(--space-1);
        border-radius: var(--radius-sm);
        font-weight: var(--font-weight-medium);
        margin-left: var(--space-2);
    }

    /* Nested inputs */
    .nested-input {
        margin-left: var(--space-5);
        margin-top: var(--space-2);
        margin-bottom: var(--space-2);
    }

    .nested-input .form-input {
        max-width: 200px;
    }

    /* Date inputs */
    .date-group {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
        margin-bottom: var(--space-3);
    }

    .date-field,
    .time-field {
        display: flex;
        flex-direction: column;
    }

    /* Status badges */
    .status-badge {
        padding: 4px var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        text-transform: capitalize;
    }

    .status-badge-active {
        background: #dcfce7;
        color: #166534;
    }

    .status-badge-disabled {
        background: #f3f4f6;
        color: #6b7280;
    }

    /* Sidebar */
    .sidebar-section {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        overflow: hidden;
    }

    .preview-header {
        padding: var(--space-4);
        border-bottom: 1px solid var(--color-border);
        background: var(--color-background-secondary);
    }

    .preview-header h3 {
        margin: 0;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .discount-preview {
        padding: var(--space-4);
    }

    .preview-title {
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-1);
    }

    .preview-subtitle {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin-bottom: var(--space-4);
    }

    .preview-section {
        margin-bottom: var(--space-4);
        position: relative;
    }

    .preview-section:last-child {
        margin-bottom: 0;
    }

    .preview-label {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.025em;
        margin-bottom: var(--space-2);
    }

    .preview-value {
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
        margin-bottom: var(--space-2);
    }

    .preview-icon {
        position: absolute;
        top: 0;
        right: 0;
        font-size: var(--font-size-lg);
    }

    .preview-details {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        line-height: 1.5;
    }

    .preview-details > div {
        margin-bottom: var(--space-1);
    }

    /* Save actions */
    .save-actions {
        position: sticky;
        bottom: var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .btn-lg {
        padding: var(--space-3) var(--space-4);
        font-size: var(--font-size-base);
        width: 100%;
    }

    /* Loading spinner */
    .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top-color: currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: var(--space-2);
        display: inline-block;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* States */
    .loading-state,
    .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--space-8);
        text-align: center;
        color: var(--color-text-secondary);
    }

    .loading-state .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--color-border);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: var(--space-4);
        margin-right: 0;
    }

    .error-state .error-icon {
        font-size: 3rem;
        margin-bottom: var(--space-4);
        opacity: 0.6;
    }

    /* Responsive */
    @media (max-width: 1024px) {
        .form-layout {
            grid-template-columns: 1fr;
            gap: var(--space-4);
        }

        .form-sidebar {
            order: -1;
        }

        .save-actions {
            position: static;
        }
    }

    @media (max-width: 768px) {
        .form-layout {
            padding: var(--space-2);
        }

        .date-group {
            grid-template-columns: 1fr;
        }

        .code-input-group,
        .value-input-group {
            flex-direction: column;
        }

        .value-type-select {
            width: 100%;
        }
    }
</style>