<script lang="ts">
	// Minimal store layout - no admin functionality, plugins, or auth
	let { children } = $props();
</script>

<svelte:head>
	<!-- Store-specific meta tags and styles only -->
	<meta name="robots" content="index, follow">
	<meta name="theme-color" content="#3b82f6">
</svelte:head>

<!-- Pure store layout without any admin/SaaS dependencies -->
{@render children()}

<style>
	/* Global store styles - completely independent from admin */
	:global(html, body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		line-height: 1.6;
		color: #1f2937;
		background: #ffffff;
	}

	:global(*) {
		box-sizing: border-box;
	}

	/* Reset any admin panel styles that might interfere */
	:global(.store-content) {
		all: initial;
		font-family: inherit;
		display: block;
	}

	/* Store-specific utility classes */
	:global(.store-container) {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	:global(.store-section) {
		padding: 2rem 0;
	}

	:global(.store-grid) {
		display: grid;
		gap: 2rem;
	}

	/* Responsive design for store */
	@media (max-width: 768px) {
		:global(body) {
			font-size: 14px;
		}
		
		:global(.store-container) {
			padding: 0 0.5rem;
		}
	}
</style>