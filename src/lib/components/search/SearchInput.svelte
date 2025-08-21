<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { createEventDispatcher, onMount } from 'svelte';

	interface Props {
		placeholder?: string;
		className?: string;
		autoFocus?: boolean;
		initialValue?: string;
	}

	let {
		placeholder = 'Search',
		className = '',
		autoFocus = false,
		initialValue = ''
	}: Props = $props();

	const dispatch = createEventDispatcher();

	// State
	let query = $state(initialValue);
	let debounceTimer: number | null = null;
	let originalPage = $state(''); // Track where user was before searching

	
	// Element references
	let searchInput: HTMLInputElement;

	// Auto focus if requested and track original page
	onMount(() => {
		// Store original page when component mounts (before any navigation)
		if (!$page.url.pathname.startsWith('/search')) {
			originalPage = $page.url.pathname + $page.url.search;
		}

		if (autoFocus && searchInput) {
			searchInput.focus();
		}
		
		// Global keyboard shortcut (Cmd/Ctrl + K)
		function handleGlobalKeydown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
				event.preventDefault();
				searchInput?.focus();
				// Update original page when using keyboard shortcut
				if (!$page.url.pathname.startsWith('/search')) {
					originalPage = $page.url.pathname + $page.url.search;
				}
			}
		}
		
		document.addEventListener('keydown', handleGlobalKeydown);
		
		return () => {
			document.removeEventListener('keydown', handleGlobalKeydown);
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}
		};
	});

	// Auto-navigate to search page with debounce
	function autoNavigateToSearch(searchQuery: string) {
		if (searchQuery.trim().length > 0) {
			goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`).then(() => {
				// Refocus the input after navigation
				setTimeout(() => {
					searchInput?.focus();
				}, 100);
			});
		}
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		query = target.value;

		// Store original page when user starts typing (if not already on search page)
		if (query.length === 1 && !$page.url.pathname.startsWith('/search')) {
			originalPage = $page.url.pathname + $page.url.search;
		}

		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// If query is empty, go back to original page
		if (query.trim().length === 0 && originalPage) {
			debounceTimer = setTimeout(() => {
				goto(originalPage);
				originalPage = ''; // Reset after going back
			}, 300); // Shorter debounce for going back
		} else if (query.trim().length > 0) {
			// Debounce navigation to search page
			debounceTimer = setTimeout(() => {
				autoNavigateToSearch(query);
			}, 500); // Slightly longer debounce for navigation
		}

		dispatch('input', { query });
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				searchInput.blur();
				break;

			case 'Enter':
				event.preventDefault();
				if (query.trim()) {
					// Navigate immediately on Enter
					goto(`/search?q=${encodeURIComponent(query.trim())}`).then(() => {
						// Refocus the input after navigation
						setTimeout(() => {
							searchInput?.focus();
						}, 100);
					});
				}
				break;
		}
	}

	function handleFocus() {
		dispatch('focus', { query });
	}

	function handleBlur() {
		dispatch('blur', { query });
	}

	function clearSearch() {
		query = '';
		
		// Clear the debounce timer to prevent navigation
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		
		// Go back to original page if we have one
		if (originalPage) {
			goto(originalPage);
			originalPage = ''; // Reset after going back
		}
		
		searchInput.focus();
		dispatch('clear');
	}
</script>

<div class="search-container {className}">
	<div class="search-input-wrapper">
		<div class="search-icon">🔍</div>
		<input
			bind:this={searchInput}
			type="text"
			placeholder={placeholder}
			class="search-input"
			bind:value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={handleFocus}
			onblur={handleBlur}
			autocomplete="off"
			spellcheck="false"
		/>
		
		{#if query}
			<button 
				class="search-clear" 
				onclick={clearSearch}
				title="Clear search"
				type="button"
			>
				×
			</button>
		{/if}
		
	</div>
</div>

<style>
	.search-container {
		position: relative;
		width: 100%;
		max-width: 360px;
	}

	.search-input-wrapper {
		position: relative;
		width: 100%;
	}

	.search-input {
		width: 100%;
		height: 28px;
		padding: 0 32px 0 28px;
		background: #2a2a2a;
		border: 1px solid transparent;
		border-radius: 6px;
		color: #e3e3e3;
		font-size: 13px;
		outline: none;
		font-weight: 400;
		transition: all 0.2s ease;
	}

	.search-input::placeholder {
		color: #b5b5b5;
		font-weight: 400;
	}

	.search-input:focus {
		background: #3a3a3a;
		border-color: #4a90e2;
		box-shadow: 0 0 0 1px #4a90e2;
	}

	.search-icon {
		position: absolute;
		left: 8px;
		top: 50%;
		transform: translateY(-50%);
		color: #b5b5b5;
		font-size: 14px;
		pointer-events: none;
		z-index: 2;
	}

	.search-clear {
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		width: 16px;
		height: 16px;
		background: transparent;
		border: none;
		color: #b5b5b5;
		font-size: 16px;
		line-height: 1;
		cursor: pointer;
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.1s ease;
		z-index: 2;
	}

	.search-clear:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #e3e3e3;
	}

	/* Focus states */
	.search-container:focus-within .search-input {
		background: #3a3a3a;
		border-color: #4a90e2;
		box-shadow: 0 0 0 1px #4a90e2;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.search-container {
			max-width: 100%;
		}
		
		.search-input {
			font-size: 16px; /* Prevent zoom on iOS */
			height: 32px;
		}
	}
</style>