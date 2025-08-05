import { json } from '@sveltejs/kit';
import { query } from '$lib/database.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// GET /api/agora/settings - Retrieve Agora settings
export async function GET({ url }) {
    try {
        const tenant_id = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
        
        // Get Agora settings (no need to set RLS context, just filter by tenant_id)
        const result = await query(`
            SELECT setting_key, setting_value, metadata, updated_at
            FROM settings 
            WHERE tenant_id = $1 AND setting_key LIKE 'agora_%'
            ORDER BY setting_key
        `, [tenant_id]);

        // Transform to key-value object
        const settings = {};
        result.rows.forEach(row => {
            const key = row.setting_key.replace('agora_', ''); // Remove prefix
            settings[key] = {
                value: row.setting_value,
                metadata: row.metadata,
                updated_at: row.updated_at
            };
        });

        return json({
            success: true,
            settings,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Get Agora settings error:', error);
        return json({
            success: false,
            error: 'Failed to retrieve Agora settings',
            details: error.message
        }, { status: 500 });
    }
}

// POST /api/agora/settings - Save Agora settings
export async function POST({ request, url }) {
    try {
        const body = await request.json();
        const { settings } = body;
        const tenant_id = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;

        if (!settings || typeof settings !== 'object') {
            return json({
                success: false,
                error: 'Settings object is required'
            }, { status: 400 });
        }

        // Save each setting (no need to set RLS context, just use tenant_id in queries)
        const savedSettings = {};
        
        for (const [key, value] of Object.entries(settings)) {
            const setting_key = `agora_${key}`;
            const setting_value = typeof value === 'object' ? value.value : value;
            const metadata = typeof value === 'object' ? (value.metadata || {}) : {};

            // Upsert setting
            const result = await query(`
                INSERT INTO settings (tenant_id, setting_key, setting_value, metadata)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (tenant_id, setting_key)
                DO UPDATE SET 
                    setting_value = EXCLUDED.setting_value,
                    metadata = EXCLUDED.metadata,
                    updated_at = now()
                RETURNING setting_key, setting_value, metadata, updated_at
            `, [tenant_id, setting_key, setting_value, metadata]);

            if (result.rows.length > 0) {
                savedSettings[key] = {
                    value: result.rows[0].setting_value,
                    metadata: result.rows[0].metadata,
                    updated_at: result.rows[0].updated_at
                };
            }
        }

        return json({
            success: true,
            settings: savedSettings,
            message: `Saved ${Object.keys(savedSettings).length} Agora setting(s)`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Save Agora settings error:', error);
        return json({
            success: false,
            error: 'Failed to save Agora settings',
            details: error.message
        }, { status: 500 });
    }
}

// PUT /api/agora/settings - Update specific setting
export async function PUT({ request, url }) {
    try {
        const body = await request.json();
        const { key, value, metadata = {} } = body;
        const tenant_id = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;

        if (!key || value === undefined) {
            return json({
                success: false,
                error: 'Key and value are required'
            }, { status: 400 });
        }

        const setting_key = `agora_${key}`;

        // Update specific setting
        const result = await query(`
            INSERT INTO settings (tenant_id, setting_key, setting_value, metadata)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tenant_id, setting_key)
            DO UPDATE SET 
                setting_value = EXCLUDED.setting_value,
                metadata = EXCLUDED.metadata,
                updated_at = now()
            RETURNING setting_key, setting_value, metadata, updated_at
        `, [tenant_id, setting_key, value, metadata]);

        if (result.rows.length === 0) {
            return json({
                success: false,
                error: 'Failed to update setting'
            }, { status: 500 });
        }

        return json({
            success: true,
            setting: {
                key,
                value: result.rows[0].setting_value,
                metadata: result.rows[0].metadata,
                updated_at: result.rows[0].updated_at
            },
            message: `Updated Agora setting: ${key}`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Update Agora setting error:', error);
        return json({
            success: false,
            error: 'Failed to update Agora setting',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE /api/agora/settings - Delete setting
export async function DELETE({ url }) {
    try {
        const key = url.searchParams.get('key');
        const tenant_id = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;

        if (!key) {
            return json({
                success: false,
                error: 'Setting key is required'
            }, { status: 400 });
        }

        const setting_key = `agora_${key}`;

        // Delete setting
        const result = await query(`
            DELETE FROM settings 
            WHERE tenant_id = $1 AND setting_key = $2
            RETURNING setting_key
        `, [tenant_id, setting_key]);

        if (result.rows.length === 0) {
            return json({
                success: false,
                error: 'Setting not found'
            }, { status: 404 });
        }

        return json({
            success: true,
            message: `Deleted Agora setting: ${key}`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Delete Agora setting error:', error);
        return json({
            success: false,
            error: 'Failed to delete Agora setting',
            details: error.message
        }, { status: 500 });
    }
}