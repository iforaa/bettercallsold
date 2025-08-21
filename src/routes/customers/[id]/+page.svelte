<script lang="ts">
	import { onMount } from 'svelte';
	import { createCustomerContext, getCustomerContext } from '$lib/contexts/customers.svelte.js';
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import ToastNotifications from '$lib/components/ToastNotifications.svelte';
	
	// Customer Components
	import CustomerHeader from '$lib/components/customers/CustomerHeader.svelte';
	import CustomerTabs from '$lib/components/customers/CustomerTabs.svelte';
	import CustomerCredits from '$lib/components/customers/CustomerCredits.svelte';
	import AdjustCreditsModal from '$lib/components/customers/AdjustCreditsModal.svelte';
	
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	// Create customer context
	const customerContext = createCustomerContext();
	const { state, actions, derived } = customerContext;
	
	// Load customer data on mount
	onMount(async () => {
		if (data.customerId) {
			await actions.loadCustomer(data.customerId);
			
			// Load additional data based on customer stats
			if (state.currentCustomer?.stats.order_count > 0) {
				await actions.loadCustomerOrders(data.customerId);
			}
			
			if (state.currentCustomer?.stats.cart_items_count > 0) {
				await actions.loadCustomerCart(data.customerId);
			}
			
			// Always load waitlists and credits
			await Promise.all([
				actions.loadCustomerWaitlists(data.customerId),
				actions.loadCustomerCredits(data.customerId)
			]);
		}
	});
	
	// Handle modal submissions
	async function handleAdjustCredits(amount: string, description: string, type: 'add' | 'deduct') {
		if (state.currentCustomer) {
			await actions.adjustCredits(state.currentCustomer.id, amount, description, type);
		}
	}
</script>

<svelte:head>
	<title>{state.currentCustomer ? state.currentCustomer.name + ' - ' : ''}Customers - BetterCallSold</title>
</svelte:head>

<div class="page">
	{#if state.customerError}
		<ErrorState 
			error={state.customerError}
			onRetry={() => data.customerId && actions.loadCustomer(data.customerId)}
			onBack={() => history.back()}
			backLabel="Back to Customers"
		/>
	{:else if state.customerLoading}
		<LoadingState 
			message="Loading customer details..." 
			size="lg" 
		/>
	{:else if state.currentCustomer}
		<!-- Customer Header with profile, metrics, and navigation -->
		<CustomerHeader 
			customer={state.currentCustomer}
			creditBalance={state.customerCredits?.balance}
			onBack={() => history.back()}
		/>
		
		
		<!-- Account Credits Section (Always Visible) -->
		<div class="page-content-padded" style="padding-bottom: 0;">
			<CustomerCredits 
				creditsData={state.customerCredits}
				loading={state.creditsLoading}
				onAdjustCredits={() => actions.openAdjustCreditsModal()}
			/>
		</div>

		<!-- Overview Section with Tabs and Content -->
		<div class="page-content-padded" style="padding-bottom: 0;">
			<CustomerTabs 
				customer={state.currentCustomer}
				creditBalance={state.customerCredits?.balance}
				waitlistsCount={state.customerWaitlists.length}
				activeTab={state.activeTab}
				onTabChange={(tab) => actions.setActiveTab(tab)}
				customerOrders={state.customerOrders}
				ordersLoading={state.ordersLoading}
				customerCart={state.customerCart}
				cartLoading={state.cartLoading}
				customerWaitlists={state.customerWaitlists}
				waitlistsLoading={state.waitlistsLoading}
				customerCredits={state.customerCredits}
				creditsLoading={state.creditsLoading}
				onOrderClick={(orderId) => window.location.href = `/orders/${orderId}`}
				onProductClick={(productId) => window.location.href = `/products/${productId}`}
				onWaitlistClick={(waitlistId) => window.location.href = `/waitlists/${waitlistId}`}
			/>
		</div>

	{:else}
		<EmptyState 
			icon="👤"
			title="Customer not found"
			description="The customer you're looking for doesn't exist or has been removed"
			onBack={() => history.back()}
			backLabel="Back to Customers"
		/>
	{/if}
</div>

<!-- Credit Management Modal -->
<AdjustCreditsModal 
	show={state.showAdjustCreditsModal}
	customer={state.currentCustomer}
	creditBalance={state.customerCredits?.balance}
	formData={state.adjustCreditsForm}
	loading={state.adjustingCredits}
	onSubmit={handleAdjustCredits}
	onCancel={() => actions.closeAdjustCreditsModal()}
	onFieldChange={(field, value) => actions.updateAdjustCreditsForm(field, value)}
/>

<!-- Toast Notifications -->
<ToastNotifications />

