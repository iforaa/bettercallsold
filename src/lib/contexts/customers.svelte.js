/**
 * Customer Context - Component-tree scoped state
 * Handles UI state for customer detail page including tabs, modals, and forms
 */

import { setContext, getContext } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { get } from 'svelte/store';
import { CustomerService } from '$lib/services/CustomerService.js';

const CUSTOMER_CONTEXT = 'customer';

export function createCustomerContext() {
  // Local component-tree state
  const state = $state({
    // Single customer state
    currentCustomer: null,
    customerLoading: false,
    customerError: '',
    
    // Customer orders state
    customerOrders: [],
    ordersLoading: false,
    ordersError: '',
    
    // Customer waitlists state
    customerWaitlists: [],
    waitlistsLoading: false,
    waitlistsError: '',
    
    // Customer cart state
    customerCart: [],
    cartLoading: false,
    cartError: '',
    
    // Customer credits state
    customerCredits: null,
    creditsLoading: false,
    creditsError: '',
    
    // UI state
    activeTab: 'orders',
    
    // Modal state
    showAdjustCreditsModal: false,
    showEditCustomerModal: false,
    
    // Form state
    adjustCreditsForm: {
      amount: '',
      description: '',
      type: 'add'
    },
    editCustomerForm: {
      name: '',
      email: '',
      phone: '',
      address: '',
      facebook_id: '',
      instagram_id: ''
    },
    
    // Form loading state
    adjustingCredits: false,
    updatingCustomer: false
  });

  const actions = {
    // === DATA LOADING ===
    
    async loadCustomer(id) {
      if (!id) return;
      
      state.customerLoading = true;
      state.customerError = '';
      
      try {
        const customer = await CustomerService.getCustomer(id);
        state.currentCustomer = CustomerService.formatCustomerData(customer);
      } catch (error) {
        console.error('Load customer error:', error);
        state.customerError = error.message || 'Failed to load customer details';
        state.currentCustomer = null;
      } finally {
        state.customerLoading = false;
      }
    },

    async loadCustomerOrders(id) {
      if (!id) return;
      
      state.ordersLoading = true;
      state.ordersError = '';
      
      try {
        const orders = await CustomerService.getCustomerOrders(id);
        state.customerOrders = orders;
      } catch (error) {
        console.error('Load customer orders error:', error);
        state.ordersError = error.message || 'Failed to load customer orders';
        state.customerOrders = [];
      } finally {
        state.ordersLoading = false;
      }
    },

    async loadCustomerWaitlists(id) {
      if (!id) return;
      
      state.waitlistsLoading = true;
      state.waitlistsError = '';
      
      try {
        const waitlists = await CustomerService.getCustomerWaitlists(id);
        state.customerWaitlists = waitlists;
      } catch (error) {
        console.error('Load customer waitlists error:', error);
        state.waitlistsError = error.message || 'Failed to load customer waitlists';
        state.customerWaitlists = [];
      } finally {
        state.waitlistsLoading = false;
      }
    },

    async loadCustomerCart(id) {
      if (!id) return;
      
      state.cartLoading = true;
      state.cartError = '';
      
      try {
        const cartItems = await CustomerService.getCustomerCart(id);
        state.customerCart = cartItems;
      } catch (error) {
        console.error('Load customer cart error:', error);
        state.cartError = error.message || 'Failed to load customer cart';
        state.customerCart = [];
      } finally {
        state.cartLoading = false;
      }
    },

    async loadCustomerCredits(id) {
      if (!id) return;
      
      state.creditsLoading = true;
      state.creditsError = '';
      
      try {
        const creditsData = await CustomerService.getCustomerCredits(id);
        state.customerCredits = creditsData;
      } catch (error) {
        console.error('Load customer credits error:', error);
        state.creditsError = error.message || 'Failed to load customer credits';
        state.customerCredits = {
          balance: { balance: 0, total_earned: 0, total_spent: 0 },
          transactions: []
        };
      } finally {
        state.creditsLoading = false;
      }
    },

    async refreshCustomerData() {
      if (!state.currentCustomer?.id) return;
      
      const customerId = state.currentCustomer.id;
      
      // Reload all customer data
      await Promise.all([
        this.loadCustomer(customerId),
        this.loadCustomerOrders(customerId),
        this.loadCustomerWaitlists(customerId),
        this.loadCustomerCart(customerId),
        this.loadCustomerCredits(customerId)
      ]);
    },

    // === CUSTOMER MANAGEMENT ===
    
    async updateCustomer(id, updates) {
      if (!id) return false;
      
      state.updatingCustomer = true;
      
      try {
        const updatedCustomer = await CustomerService.updateCustomer(id, updates);
        state.currentCustomer = CustomerService.formatCustomerData(updatedCustomer);
        this.closeEditCustomerModal();
        return true;
      } catch (error) {
        console.error('Update customer error:', error);
        return false;
      } finally {
        state.updatingCustomer = false;
      }
    },

    // === CREDITS MANAGEMENT ===
    
    async adjustCredits(customerId, amount, description, type) {
      if (!customerId || !amount || !description) return false;
      
      state.adjustingCredits = true;
      
      try {
        await CustomerService.adjustCredits(customerId, amount, description, type);
        
        // Refresh customer data to get updated credits
        await Promise.all([
          this.loadCustomer(customerId),
          this.loadCustomerCredits(customerId)
        ]);
        
        this.closeAdjustCreditsModal();
        return true;
      } catch (error) {
        console.error('Adjust credits error:', error);
        return false;
      } finally {
        state.adjustingCredits = false;
      }
    },

    // === UI STATE MANAGEMENT ===
    
    setActiveTab(tab) {
      state.activeTab = tab;
    },

    // === MODAL MANAGEMENT ===
    
    openAdjustCreditsModal() {
      state.adjustCreditsForm = { amount: '', description: '', type: 'add' };
      state.showAdjustCreditsModal = true;
    },

    closeAdjustCreditsModal() {
      state.showAdjustCreditsModal = false;
      state.adjustCreditsForm = { amount: '', description: '', type: 'add' };
    },

    openEditCustomerModal() {
      if (state.currentCustomer) {
        state.editCustomerForm = {
          name: state.currentCustomer.name || '',
          email: state.currentCustomer.email || '',
          phone: state.currentCustomer.phone || '',
          address: state.currentCustomer.address || '',
          facebook_id: state.currentCustomer.facebook_id || '',
          instagram_id: state.currentCustomer.instagram_id || ''
        };
      }
      state.showEditCustomerModal = true;
    },

    closeEditCustomerModal() {
      state.showEditCustomerModal = false;
      state.editCustomerForm = {
        name: '',
        email: '',
        phone: '',
        address: '',
        facebook_id: '',
        instagram_id: ''
      };
    },

    // === FORM MANAGEMENT ===
    
    updateAdjustCreditsForm(field, value) {
      state.adjustCreditsForm[field] = value;
    },

    updateEditCustomerForm(field, value) {
      state.editCustomerForm[field] = value;
    },

    resetForms() {
      state.adjustCreditsForm = { amount: '', description: '', type: 'add' };
      state.editCustomerForm = {
        name: '',
        email: '',
        phone: '',
        address: '',
        facebook_id: '',
        instagram_id: ''
      };
    },

    // === NAVIGATION ===
    
    navigateBack(from, orderId, waitlistId) {
      const currentPage = get(page);
      const fromParam = from || currentPage.url.searchParams.get('from');
      const orderIdParam = orderId || currentPage.url.searchParams.get('orderId');
      const waitlistIdParam = waitlistId || currentPage.url.searchParams.get('waitlistId');
      
      if (fromParam === 'order' && orderIdParam) {
        goto(`/orders/${orderIdParam}`);
      } else if (fromParam === 'waitlist' && waitlistIdParam) {
        goto(`/waitlists/${waitlistIdParam}`);
      } else {
        goto('/customers');
      }
    },

    goToOrder(orderId) {
      if (orderId && state.currentCustomer) {
        goto(`/orders/${orderId}?from=customer&customerId=${state.currentCustomer.id}`);
      }
    },

    goToProduct(productId) {
      if (productId && state.currentCustomer) {
        goto(`/products/${productId}?from=customer&customerId=${state.currentCustomer.id}`);
      }
    },

    // === ERROR HANDLING ===
    
    clearErrors() {
      state.customerError = '';
      state.ordersError = '';
      state.waitlistsError = '';
      state.cartError = '';
      state.creditsError = '';
    },

    async retry() {
      if (state.currentCustomer?.id) {
        await this.refreshCustomerData();
      }
    }
  };

  // Derived values for the context
  const hasCustomer = $derived(state.currentCustomer !== null);
  const hasOrders = $derived(state.customerOrders.length > 0);
  const hasWaitlists = $derived(state.customerWaitlists.length > 0);
  const hasCartItems = $derived(state.customerCart.length > 0);
  const hasCredits = $derived(state.customerCredits !== null);
  const isLoading = $derived(
    state.customerLoading || 
    state.ordersLoading || 
    state.waitlistsLoading || 
    state.cartLoading || 
    state.creditsLoading
  );
  const hasErrors = $derived(
    !!state.customerError || 
    !!state.ordersError || 
    !!state.waitlistsError || 
    !!state.cartError || 
    !!state.creditsError
  );
  const canAdjustCredits = $derived(hasCustomer && !state.adjustingCredits);
  const formattedCreditBalance = $derived(() => {
    if (!state.customerCredits?.balance) return '$0.00';
    return CustomerService.formatCurrency(state.customerCredits.balance.balance);
  });
  const customerSinceFormatted = $derived(() => {
    if (!state.currentCustomer?.created_at) return '';
    return CustomerService.getCustomerSince(state.currentCustomer.created_at);
  });

  const derived = {
    get hasCustomer() { return hasCustomer; },
    get hasOrders() { return hasOrders; },
    get hasWaitlists() { return hasWaitlists; },
    get hasCartItems() { return hasCartItems; },
    get hasCredits() { return hasCredits; },
    get isLoading() { return isLoading; },
    get hasErrors() { return hasErrors; },
    get canAdjustCredits() { return canAdjustCredits; },
    get formattedCreditBalance() { return formattedCreditBalance; },
    get customerSinceFormatted() { return customerSinceFormatted; }
  };

  const context = { state, actions, derived };
  setContext(CUSTOMER_CONTEXT, context);
  
  return context;
}

export function getCustomerContext() {
  const context = getContext(CUSTOMER_CONTEXT);
  if (!context) {
    throw new Error('getCustomerContext must be called within a component that has createCustomerContext in its tree');
  }
  return context;
}