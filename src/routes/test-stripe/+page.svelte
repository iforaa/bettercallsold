<script>
  import { onMount } from 'svelte';
  
  let stripe = null;
  let elements = null;
  let cardElement = null;
  let clientSecret = '';
  let paymentAmount = 19.99;
  let processing = false;
  let paymentStatus = '';
  let stripeConfig = null;
  
  onMount(async () => {
    // Load Stripe configuration
    const configResponse = await fetch('/api/payments/config');
    stripeConfig = await configResponse.json();
    
    if (!stripeConfig.publishable_key) {
      paymentStatus = 'Error: Stripe not configured. Please add your API keys to .env';
      return;
    }
    
    // Load Stripe.js
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = initializeStripe;
    document.head.appendChild(script);
  });
  
  function initializeStripe() {
    stripe = Stripe(stripeConfig.publishable_key);
    elements = stripe.elements();
    
    // Create card element
    cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
      },
    });
    
    // Mount card element
    cardElement.mount('#card-element');
    
    cardElement.on('change', ({error}) => {
      const displayError = document.getElementById('card-errors');
      if (error) {
        displayError.textContent = error.message;
      } else {
        displayError.textContent = '';
      }
    });
  }
  
  async function createPaymentIntent() {
    try {
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: paymentAmount,
          currency: 'usd',
          metadata: {
            test_payment: 'true',
            source: 'test-stripe-page'
          }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        clientSecret = result.client_secret;
        paymentStatus = `Payment intent created: $${result.amount}`;
      } else {
        paymentStatus = 'Failed to create payment intent';
      }
    } catch (error) {
      paymentStatus = `Error: ${error.message}`;
    }
  }
  
  async function confirmPayment() {
    if (!stripe || !cardElement || !clientSecret) {
      paymentStatus = 'Stripe not ready or no payment intent';
      return;
    }
    
    processing = true;
    paymentStatus = 'Processing payment...';
    
    const {error, paymentIntent} = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: 'Test User',
          email: 'test@example.com'
        },
      }
    });
    
    processing = false;
    
    if (error) {
      paymentStatus = `Payment failed: ${error.message}`;
    } else if (paymentIntent.status === 'succeeded') {
      paymentStatus = `Payment successful! Payment ID: ${paymentIntent.id}`;
    } else {
      paymentStatus = `Payment status: ${paymentIntent.status}`;
    }
  }
  
  function useTestCard(cardNumber) {
    // This is for display purposes - in a real implementation,
    // you'd need to manually enter the test card
    navigator.clipboard.writeText(cardNumber);
    paymentStatus = `Test card ${cardNumber} copied to clipboard!`;
  }
</script>

<svelte:head>
  <title>Stripe Payment Test - BetterCallSold</title>
</svelte:head>

<div class="container">
  <div class="payment-form">
    <h1>🔷 Stripe Payment Test</h1>
    
    {#if stripeConfig?.test_mode}
      <div class="alert alert-info">
        <h3>🧪 Test Mode Active</h3>
        <p>You're in Stripe test mode. Use these test cards:</p>
        <div class="test-cards">
          <button on:click={() => useTestCard('4242424242424242')}>
            Visa Success: 4242424242424242
          </button>
          <button on:click={() => useTestCard('4000000000000002')}>
            Declined: 4000000000000002
          </button>
          <button on:click={() => useTestCard('4000000000009995')}>
            Insufficient Funds: 4000000000009995
          </button>
        </div>
        <p><small>Use any future date for expiry and any 3-digit CVC</small></p>
      </div>
    {/if}
    
    <div class="form-group">
      <label for="amount">Amount ($USD)</label>
      <input 
        id="amount"
        type="number" 
        bind:value={paymentAmount} 
        step="0.01" 
        min="0.50"
      />
    </div>
    
    <button 
      class="btn btn-primary" 
      on:click={createPaymentIntent}
      disabled={!stripeConfig}
    >
      Create Payment Intent
    </button>
    
    {#if clientSecret}
      <div class="payment-section">
        <h3>💳 Enter Payment Details</h3>
        
        <!-- Stripe Elements will mount here -->
        <div id="card-element"></div>
        <div id="card-errors" role="alert"></div>
        
        <button 
          class="btn btn-success" 
          on:click={confirmPayment}
          disabled={processing}
        >
          {processing ? 'Processing...' : `Pay $${paymentAmount}`}
        </button>
      </div>
    {/if}
    
    {#if paymentStatus}
      <div class="status">
        <h4>Status:</h4>
        <p>{paymentStatus}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
  }
  
  .payment-form {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  h1 {
    color: #1a202c;
    margin-bottom: 1.5rem;
    text-align: center;
  }
  
  .alert {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }
  
  .alert-info {
    background-color: #ebf8ff;
    border: 1px solid #bee3f8;
    color: #2c5282;
  }
  
  .test-cards {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  
  .test-cards button {
    background: #4299e1;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-family: monospace;
    font-size: 0.9rem;
  }
  
  .test-cards button:hover {
    background: #3182ce;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #374151;
  }
  
  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
  }
  
  input:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    margin-bottom: 1rem;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background: #4f46e5;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #4338ca;
  }
  
  .btn-success {
    background: #10b981;
    color: white;
  }
  
  .btn-success:hover:not(:disabled) {
    background: #059669;
  }
  
  .payment-section {
    background: #f9fafb;
    padding: 1.5rem;
    border-radius: 8px;
    margin-top: 1.5rem;
  }
  
  #card-element {
    background: white;
    padding: 1rem;
    border: 2px solid #d1d5db;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  
  #card-errors {
    color: #dc2626;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  
  .status {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1.5rem;
  }
  
  .status h4 {
    margin: 0 0 0.5rem 0;
    color: #0c4a6e;
  }
  
  .status p {
    margin: 0;
    color: #075985;
    word-wrap: break-word;
  }
</style>