/**
 * Staff Management API
 * Handles staff-specific user operations (admin, staff, manager roles)
 */

import { json } from '@sveltejs/kit';
import { query } from '$lib/database.js';

// Default tenant for development
const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';

export async function GET({ url }) {
	try {
		const searchTerm = url.searchParams.get('search') || '';
		const role = url.searchParams.get('role') || '';
		
		let staffQuery = `
			SELECT 
				id,
				tenant_id,
				email,
				name,
				role,
				phone,
				settings,
				created_at,
				updated_at,
				'active' as status
			FROM users 
			WHERE tenant_id = $1 
			AND role IN ('admin', 'staff', 'manager')
		`;
		
		const params = [DEFAULT_TENANT_ID];
		let paramIndex = 2;
		
		// Add search filter
		if (searchTerm) {
			staffQuery += ` AND (
				name ILIKE $${paramIndex} OR 
				email ILIKE $${paramIndex}
			)`;
			params.push(`%${searchTerm}%`);
			paramIndex++;
		}
		
		// Add role filter
		if (role && role !== 'all') {
			staffQuery += ` AND role = $${paramIndex}`;
			params.push(role);
		}
		
		staffQuery += ' ORDER BY created_at DESC';
		
		const result = await query(staffQuery, params);
		
		return json(result.rows);
		
	} catch (error) {
		console.error('Failed to fetch staff:', error);
		return json(
			{ error: 'Failed to fetch staff members' },
			{ status: 500 }
		);
	}
}

export async function POST({ request }) {
	try {
		const { name, email, role = 'staff', phone } = await request.json();
		
		// Validate required fields
		if (!name || !email) {
			return json(
				{ error: 'Name and email are required' },
				{ status: 400 }
			);
		}
		
		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json(
				{ error: 'Invalid email format' },
				{ status: 400 }
			);
		}
		
		// Validate role
		if (!['admin', 'staff', 'manager'].includes(role)) {
			return json(
				{ error: 'Invalid role. Must be admin, staff, or manager' },
				{ status: 400 }
			);
		}
		
		// Check if user already exists
		const existingUserResult = await query(
			'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
			[DEFAULT_TENANT_ID, email.toLowerCase()]
		);
		
		if (existingUserResult.rows.length > 0) {
			return json(
				{ error: 'A user with this email already exists' },
				{ status: 409 }
			);
		}
		
		// Create new staff member
		const insertQuery = `
			INSERT INTO users (
				tenant_id,
				email,
				name,
				role,
				phone,
				settings,
				created_at,
				updated_at
			)
			VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
			RETURNING 
				id,
				tenant_id,
				email,
				name,
				role,
				phone,
				settings,
				created_at,
				updated_at,
				'active' as status
		`;
		
		const result = await query(insertQuery, [
			DEFAULT_TENANT_ID,
			email.toLowerCase(),
			name.trim(),
			role,
			phone || null,
			JSON.stringify({
				invited_at: new Date().toISOString(),
				invited_by: 'system' // TODO: Replace with actual user ID when auth is implemented
			})
		]);
		
		const newStaff = result.rows[0];
		
		return json(newStaff, { status: 201 });
		
	} catch (error) {
		console.error('Failed to create staff member:', error);
		
		// Handle unique constraint violations
		if (error.code === '23505') {
			return json(
				{ error: 'A user with this email already exists' },
				{ status: 409 }
			);
		}
		
		return json(
			{ error: 'Failed to create staff member' },
			{ status: 500 }
		);
	}
}

export async function PATCH({ request }) {
	try {
		const { userIds, updates } = await request.json();
		
		if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
			return json(
				{ error: 'User IDs are required' },
				{ status: 400 }
			);
		}
		
		if (!updates || typeof updates !== 'object') {
			return json(
				{ error: 'Updates are required' },
				{ status: 400 }
			);
		}
		
		// Build dynamic update query
		const allowedFields = ['name', 'email', 'role', 'phone'];
		const updateFields = [];
		const params = [DEFAULT_TENANT_ID];
		let paramIndex = 2;
		
		for (const [field, value] of Object.entries(updates)) {
			if (allowedFields.includes(field) && value !== undefined) {
				updateFields.push(`${field} = $${paramIndex}`);
				params.push(value);
				paramIndex++;
			}
		}
		
		if (updateFields.length === 0) {
			return json(
				{ error: 'No valid fields to update' },
				{ status: 400 }
			);
		}
		
		// Add updated_at
		updateFields.push(`updated_at = NOW()`);
		
		// Create placeholders for user IDs
		const userIdPlaceholders = userIds.map((_, index) => `$${paramIndex + index}`).join(',');
		params.push(...userIds);
		
		const updateQuery = `
			UPDATE users 
			SET ${updateFields.join(', ')}
			WHERE tenant_id = $1 
			AND id IN (${userIdPlaceholders})
			AND role IN ('admin', 'staff', 'manager')
			RETURNING 
				id,
				tenant_id,
				email,
				name,
				role,
				phone,
				settings,
				created_at,
				updated_at,
				'active' as status
		`;
		
		const result = await query(updateQuery, params);
		
		return json({
			updated: result.rows,
			count: result.rowCount
		});
		
	} catch (error) {
		console.error('Failed to update staff members:', error);
		return json(
			{ error: 'Failed to update staff members' },
			{ status: 500 }
		);
	}
}

export async function DELETE({ request }) {
	try {
		const { userIds } = await request.json();
		
		if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
			return json(
				{ error: 'User IDs are required' },
				{ status: 400 }
			);
		}
		
		// Create placeholders for user IDs
		const userIdPlaceholders = userIds.map((_, index) => `$${2 + index}`).join(',');
		const params = [DEFAULT_TENANT_ID, ...userIds];
		
		// Prevent deletion of admin users (safety measure)
		const deleteQuery = `
			DELETE FROM users 
			WHERE tenant_id = $1 
			AND id IN (${userIdPlaceholders})
			AND role IN ('staff', 'manager')
		`;
		
		const result = await query(deleteQuery, params);
		
		return json({
			deleted: result.rowCount,
			message: `${result.rowCount} staff member(s) removed`
		});
		
	} catch (error) {
		console.error('Failed to delete staff members:', error);
		return json(
			{ error: 'Failed to delete staff members' },
			{ status: 500 }
		);
	}
}