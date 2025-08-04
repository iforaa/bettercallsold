<script lang="ts">
	import { authenticate } from '$lib/stores/auth.js';
	
	let secretInput = $state('');
	let error = $state('');
	let isLoading = $state(false);
	
	function handleSubmit() {
		if (!secretInput.trim()) {
			error = 'Please enter the secret code';
			return;
		}
		
		isLoading = true;
		error = '';
		
		// Add a small delay for better UX
		setTimeout(() => {
			const success = authenticate(secretInput.trim());
			
			if (success) {
				// Authentication successful - the store will update and hide the wall
				error = '';
			} else {
				error = 'Incorrect secret code. Try again.';
				secretInput = '';
			}
			
			isLoading = false;
		}, 500);
	}
	
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	}
	
</script>

<div class="auth-wall">
	<div class="background-image"></div>
	<div class="overlay"></div>
	
	<div class="content">
		<div class="brand-showcase">
			<div class="old-brands">
				<div class="brand-container">
					<div class="brand-text commentsold">CommentSold</div>
					<div class="brand-remark boring">slippin'</div>
				</div>
				<div class="brand-container">
					<div class="brand-text shopify">Shopify</div>
					<div class="brand-remark expensive">chicanery</div>
				</div>
			</div>
			
			<div class="new-brand">
				<div class="brand-text bettercallsold">BetterCallSold</div>
			</div>
		</div>
		
		<div class="auth-form">
			<div class="form-container">
				<h2 class="form-title">BETTER CALL SOLD</h2>
<p class="form-subtitle">Criminal? You need a lawyer. E-commerce? You need us.</p>
				
				<div class="input-group">
					<input
						type="password"
						bind:value={secretInput}
						onkeydown={handleKeydown}
						placeholder="Better enter that code..."
						class="secret-input"
						class:error={error}
						disabled={isLoading}
					/>
					<button
						onclick={handleSubmit}
						class="submit-btn"
						disabled={isLoading || !secretInput.trim()}
					>
						{#if isLoading}
							<div class="loading-spinner"></div>
						{:else}
							→
						{/if}
					</button>
				</div>
				
				{#if error}
					<div class="error-message">{error}</div>
				{/if}
				
			</div>
		</div>
		
		<div class="footer">
			<p class="footer-text">© 2025 BetterCallSold - "Did you know you have rights? So do your customers!"</p>
		</div>
	</div>
</div>

<style>
	.auth-wall {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	
	.background-image {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, #2c1810 0%, #8b4513 30%, #daa520 60%, #2c1810 100%);
		filter: brightness(0.7);
	}
	
	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: 
			linear-gradient(45deg, transparent 0%, rgba(0,0,0,0.3) 50%, transparent 100%),
			repeating-linear-gradient(
				90deg,
				transparent,
				transparent 2px,
				rgba(0,0,0,0.1) 2px,
				rgba(0,0,0,0.1) 4px
			);
	}
	
	.content {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		padding: 2rem;
		text-align: center;
	}
	
	.brand-showcase {
		margin-bottom: 3rem;
		position: relative;
	}
	
	.old-brands {
		margin-bottom: 2rem;
		opacity: 0.4;
	}
	
	.brand-container {
		position: relative;
		display: inline-block;
		margin: 0.5rem 1rem;
	}
	
	.brand-remark {
		position: absolute;
		font-size: clamp(1.2rem, 3vw, 1.8rem);
		font-weight: 700;
		font-style: italic;
		text-transform: lowercase;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
		animation: float 3s ease-in-out infinite;
		pointer-events: none;
		filter: brightness(1.3) contrast(1.2);
	}
	
	.brand-remark.boring {
		top: 20%;
		right: -80px;
		color: #ff6b35;
		transform: rotate(15deg);
		animation-delay: 0.5s;
		text-shadow: 
			2px 2px 4px rgba(0,0,0,0.8),
			0 0 10px rgba(255, 107, 53, 0.5);
	}
	
	.brand-remark.expensive {
		bottom: 10%;
		left: -80px;
		color: #ffd700;
		transform: rotate(-12deg);
		animation-delay: 1s;
		animation-name: floatExpensive;
		text-shadow: 
			2px 2px 4px rgba(0,0,0,0.8),
			0 0 15px rgba(255, 215, 0, 0.6);
	}
	
	@keyframes float {
		0%, 100% { transform: rotate(15deg) translateY(0px); }
		50% { transform: rotate(15deg) translateY(-5px); }
	}
	
	@keyframes floatExpensive {
		0%, 100% { transform: rotate(-12deg) translateY(0px); }
		50% { transform: rotate(-12deg) translateY(-5px); }
	}
	
	.brand-text {
		font-weight: 900;
		font-family: 'Arial Black', Arial, sans-serif;
		text-transform: uppercase;
		letter-spacing: -0.02em;
		line-height: 0.8;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		margin: 0.5rem 0;
	}
	
	.commentsold {
		font-size: clamp(4rem, 12vw, 8rem);
		color: #666;
		text-decoration: line-through;
		text-decoration-color: #ff4444;
		text-decoration-thickness: 8px;
		transform: rotate(-2deg);
		filter: sepia(50%) hue-rotate(20deg);
	}
	
	.shopify {
		font-size: clamp(3.5rem, 10vw, 7rem);
		color: #5cb85c;
		text-decoration: line-through;
		text-decoration-color: #ff4444;
		text-decoration-thickness: 6px;
		transform: rotate(1deg);
		margin-left: 2rem;
		filter: sepia(50%) hue-rotate(20deg);
	}
	
	.bettercallsold {
		font-size: clamp(3.5rem, 10vw, 8rem);
		font-family: 'Courier New', monospace;
		color: #d4af37;
		text-shadow: 
			3px 3px 0px #8b4513,
			6px 6px 10px rgba(0,0,0,0.5),
			0 0 20px rgba(212, 175, 55, 0.3);
		position: relative;
		transform: perspective(500px) rotateX(15deg);
		letter-spacing: 0.1em;
		animation: neonFlicker 2s infinite alternate;
	}
	
	.bettercallsold::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
		animation: shine 2s ease-in-out infinite;
		pointer-events: none;
	}
	
	@keyframes neonFlicker {
		0%, 100% { 
			text-shadow: 
				3px 3px 0px #8b4513,
				6px 6px 10px rgba(0,0,0,0.5),
				0 0 20px rgba(212, 175, 55, 0.3);
		}
		50% { 
			text-shadow: 
				3px 3px 0px #8b4513,
				6px 6px 10px rgba(0,0,0,0.5),
				0 0 30px rgba(212, 175, 55, 0.6),
				0 0 40px rgba(212, 175, 55, 0.4);
		}
	}
	
	@keyframes shine {
		0%, 100% { transform: translateX(-100%); }
		50% { transform: translateX(100%); }
	}
	
	.auth-form {
		background: linear-gradient(145deg, #2c1810, #1a0f08);
		backdrop-filter: blur(10px);
		border-radius: 8px;
		padding: 2.5rem;
		box-shadow: 
			0 0 0 3px #d4af37,
			0 0 20px rgba(212, 175, 55, 0.3),
			inset 0 1px 0 rgba(255,255,255,0.1);
		border: 2px solid #8b4513;
		min-width: 400px;
		max-width: 500px;
		width: 100%;
		position: relative;
	}
	
	.form-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.form-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: #d4af37;
		margin: 0;
		text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
		font-family: 'Courier New', monospace;
		letter-spacing: 0.05em;
	}
	
	.form-subtitle {
		color: #cd853f;
		margin: 0;
		font-size: 1rem;
		font-family: 'Courier New', monospace;
		text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
	}
	
	.input-group {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}
	
	.secret-input {
		flex: 1;
		padding: 1rem 1.25rem;
		font-size: 1.1rem;
		border: 2px solid #8b4513;
		border-radius: 4px;
		background: linear-gradient(145deg, #1a0f08, #2c1810);
		color: #d4af37;
		transition: all 0.2s ease;
		font-weight: 500;
		letter-spacing: 0.5px;
		font-family: 'Courier New', monospace;
		box-shadow: inset 2px 2px 5px rgba(0,0,0,0.5);
	}
	
	.secret-input:focus {
		outline: none;
		border-color: #d4af37;
		box-shadow: 
			inset 2px 2px 5px rgba(0,0,0,0.5),
			0 0 0 3px rgba(212, 175, 55, 0.3),
			0 0 10px rgba(212, 175, 55, 0.2);
		transform: translateY(-1px);
		background: linear-gradient(145deg, #2c1810, #1a0f08);
	}
	
	.secret-input.error {
		border-color: #dc2626;
		box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.1);
	}
	
	.secret-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.submit-btn {
		padding: 1rem 1.5rem;
		background: linear-gradient(145deg, #d4af37, #b8941f);
		color: #2c1810;
		border: 2px solid #8b4513;
		border-radius: 4px;
		font-size: 1.2rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 60px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Courier New', monospace;
		text-shadow: 1px 1px 2px rgba(255,255,255,0.3);
		box-shadow: 
			0 4px 8px rgba(0,0,0,0.3),
			inset 0 1px 0 rgba(255,255,255,0.2);
	}
	
	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 
			0 6px 15px rgba(212, 175, 55, 0.4),
			inset 0 1px 0 rgba(255,255,255,0.3);
		background: linear-gradient(145deg, #e6c547, #d4af37);
	}
	
	.submit-btn:active:not(:disabled) {
		transform: translateY(0);
	}
	
	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}
	
	.loading-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 0.8s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	.error-message {
		color: #dc2626;
		font-size: 0.875rem;
		font-weight: 500;
		text-align: center;
		padding: 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		animation: shake 0.5s ease-in-out;
	}
	
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-5px); }
		75% { transform: translateX(5px); }
	}
	
	
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}
	
	.footer {
		margin-top: 3rem;
		opacity: 0.7;
	}
	
	.footer-text {
		color: white;
		font-size: 0.875rem;
		margin: 0;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
	}
	
	/* Responsive Design */
	@media (max-width: 768px) {
		.content {
			padding: 1rem;
		}
		
		.auth-form {
			min-width: auto;
			padding: 2rem;
		}
		
		.commentsold {
			font-size: clamp(2.5rem, 8vw, 4rem);
		}
		
		.shopify {
			font-size: clamp(2rem, 6vw, 3.5rem);
		}
		
		.bettercallsold {
			font-size: clamp(2.5rem, 8vw, 5rem);
		}
		
		.input-group {
			flex-direction: column;
			gap: 1rem;
		}
		
		.submit-btn {
			width: 100%;
		}
	}
	
	@media (max-width: 480px) {
		.auth-form {
			padding: 1.5rem;
		}
		
		.form-title {
			font-size: 1.5rem;
		}
		
		.form-subtitle {
			font-size: 0.875rem;
		}
	}
</style>