<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	let user = $derived(data.user);
</script>

<svelte:head>
	<title>{user.name} - BetterCallSold</title>
</svelte:head>

<nav>
	<a href="/">← Home</a> | <a href="/users">← Users</a>
</nav>

<h1>{user.name}</h1>

<div class="user-details">
	<p><strong>ID:</strong> {user.id}</p>
	<p><strong>Email:</strong> {user.email}</p>
	<p><strong>Name:</strong> {user.name}</p>
</div>

<style>
	nav {
		margin-bottom: 1rem;
	}
	
	nav a {
		text-decoration: none;
		color: #007acc;
	}
	
	.user-details {
		background: #f5f5f5;
		padding: 1rem;
		border-radius: 8px;
		max-width: 400px;
	}
	
	.user-details p {
		margin: 0.5rem 0;
	}
</style>