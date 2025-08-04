import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Secret key for authentication
const SECRET_KEY = 'sweethomealabama';

// API bypass key for programmatic access
export const API_BYPASS_KEY = 'sweethomealabama';

// Check if user is authenticated from localStorage or bypass cookie
function getInitialAuthState() {
	if (!browser) return null; // Return null during SSR to prevent flash
	
	// Check for auth bypass cookie first
	const cookies = document.cookie.split(';').reduce((acc, cookie) => {
		const [key, value] = cookie.trim().split('=');
		acc[key] = value;
		return acc;
	}, {});
	
	if (cookies.auth_bypass === 'true') {
		return true;
	}
	
	return localStorage.getItem('bcs_authenticated') === 'true';
}

// Create the authentication store
export const isAuthenticated = writable(getInitialAuthState());

// Store to track if auth state has been loaded
export const authLoaded = writable(false);

// Initialize auth state on client side
if (browser) {
	// Check for bypass cookie first, then localStorage
	const cookies = document.cookie.split(';').reduce((acc, cookie) => {
		const [key, value] = cookie.trim().split('=');
		acc[key] = value;
		return acc;
	}, {});
	
	const isAuthenticatedValue = cookies.auth_bypass === 'true' || localStorage.getItem('bcs_authenticated') === 'true';
	isAuthenticated.set(isAuthenticatedValue);
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