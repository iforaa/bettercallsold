import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Secret key for authentication
const SECRET_KEY = 'sweethomealabama';

// Check if user is authenticated from localStorage
function getInitialAuthState() {
	if (!browser) return null; // Return null during SSR to prevent flash
	return localStorage.getItem('bcs_authenticated') === 'true';
}

// Create the authentication store
export const isAuthenticated = writable(getInitialAuthState());

// Store to track if auth state has been loaded
export const authLoaded = writable(false);

// Initialize auth state on client side
if (browser) {
	// Set auth state immediately on client
	isAuthenticated.set(localStorage.getItem('bcs_authenticated') === 'true');
	authLoaded.set(true);
}

// Authentication functions
export function authenticate(inputSecret) {
	if (inputSecret === SECRET_KEY) {
		if (browser) {
			localStorage.setItem('bcs_authenticated', 'true');
		}
		isAuthenticated.set(true);
		return true;
	}
	return false;
}

export function logout() {
	if (browser) {
		localStorage.removeItem('bcs_authenticated');
	}
	isAuthenticated.set(false);
}