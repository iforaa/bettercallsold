<script>
  import { onMount } from 'svelte';
  
  let stripe;
  let elements;
  let cardElement;
  let paymentForm;
  let clientSecret = '';
  let isLoading = false;
  let message = '';
  let amount = 29.99;
  let stripeConfig = null;

  onMount(async () => {
    // Get Stripe configuration
    const configResponse = await fetch('/api/payments/config');
    stripeConfig = await configResponse.json();
    
    if (!stripeConfig.publishable_key) {
      message = '❌ Stripe not configured. Please add your API keys to .env file.';
      return;
    }

    // Load Stripe.js
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = initializeStripe;
    document.head.appendChild(script);
  });

  async function initializeStripe() {
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
          amount: amount,
          currency: 'usd',
          metadata: {
            test_payment: 'true',
            source: 'test-page'
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        clientSecret = data.client_secret;
        message = `✅ Payment intent created for $${data.amount}`;
        return true;
      } else {
        message = `❌ Error: ${data.error}`;
        return false;
      }
    } catch (error) {
      message = `❌ Network error: ${error.message}`;
      return false;
    }
  }

  async function handleSubmit() {
    if (!stripe || !elements) {
      message = '❌ Stripe not loaded';
      return;
    }

    isLoading = true;
    message = 'Creating payment intent...';

    // Create payment intent first
    const intentCreated = await createPaymentIntent();
    if (!intentCreated) {
      isLoading = false;
      return;
    }

    message = 'Processing payment...';

    // Confirm payment
    const {error, paymentIntent} = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: 'Test Customer',
          email: 'test@example.com'
        },
      }
    });

    isLoading = false;

    if (error) {
      message = `❌ Payment failed: ${error.message}`;
    } else if (paymentIntent.status === 'succeeded') {
      message = `🎉 Payment succeeded! ID: ${paymentIntent.id}`;
    } else {
      message = `⏳ Payment status: ${paymentIntent.status}`;
    }
  }
</script>

<svelte:head>
  <title>Stripe Payment Test - BetterCallSold</title>
</svelte:head>

<div class="container">
  <h1>🧪 Stripe Payment Test</h1>
  
  {#if stripeConfig?.test_mode}
    <div class="test-mode-banner">
      🚧 <strong>TEST MODE</strong> - No real charges will be made
    </div>
  {/if}

  <div class="payment-form">
    <form on:submit|preventDefault={handleSubmit} bind:this={paymentForm}>
      <div class="form-group">
        <label for="amount">Amount ($)</label>
        <input 
          type="number" 
          id="amount" 
          bind:value={amount} 
          min="0.50" 
          step="0.01" 
          disabled={isLoading}
        />
      </div>

      <div class="form-group">
        <label for="card-element">Card Details</label>
        <div id="card-element" class="card-element"></div>
        <div id="card-errors" class="error-message"></div>
      </div>

      <button type="submit" disabled={isLoading || !stripe} class="pay-button">
        {isLoading ? 'Processing...' : `Pay $${amount}`}
      </button>
    </form>

    {#if message}
      <div class="message" class:error={message.includes('❌')} class:success={message.includes('✅') || message.includes('🎉')}>
        {message}
      </div>
    {/if}
  </div>

  {#if stripeConfig?.test_cards}
    <div class="test-cards">
      <h3>🧪 Test Card Numbers</h3>
      <div class="card-grid">
        <div class="test-card">
          <strong>Visa Success:</strong><br>
          <code>4242 4242 4242 4242</code>
        </div>
        <div class="test-card">
          <strong>Visa Declined:</strong><br>
          <code>4000 0000 0000 0002</code>
        </div>
        <div class="test-card">
          <strong>Insufficient Funds:</strong><br>
          <code>4000 0000 0000 9995</code>
        </div>
        <div class="test-card">
          <strong>Expired Card:</strong><br>
          <code>4000 0000 0000 0069</code>
        </div>
      </div>
      <p class="test-note">
        💡 Use any future expiry date and any 3-digit CVC
      </p>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }

  h1 {
    text-align: center;
    color: #333;
    margin-bottom: 2rem;
  }

  .test-mode-banner {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
    margin-bottom: 2rem;
  }

  .payment-form {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
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

  input[type="number"] {
    width: 100%;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 16px;
  }

  .card-element {
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
  }

  .error-message {
    color: #dc2626;
    font-size: 14px;
    margin-top: 0.5rem;
  }

  .pay-button {
    width: 100%;
    background: #6366f1;
    color: white;
    border: none;
    padding: 16px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .pay-button:hover:not(:disabled) {
    background: #4f46e5;
  }

  .pay-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .message {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 6px;
    font-weight: 500;
  }

  .message.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .message.error {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .test-cards {
    background: #f9fafb;
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }

  .test-cards h3 {
    margin-top: 0;
    color: #374151;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .test-card {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
  }

  .test-card code {
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 14px;
  }

  .test-note {
    color: #6b7280;
    font-style: italic;
    text-align: center;
    margin: 1rem 0 0 0;
  }
</style>