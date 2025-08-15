import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

/**
 * Get the status of the latest generated site
 */
export async function GET() {
  try {
    // Get the latest generated site for the tenant
    const siteQuery = await query(`
      SELECT 
        id, tenant_id, site_name, generation_config, api_config,
        last_generated_at, deployment_url, deployment_status,
        file_count, total_size_bytes, created_at, updated_at
      FROM generated_sites 
      WHERE tenant_id = $1
      ORDER BY last_generated_at DESC 
      LIMIT 1
    `, [DEFAULT_TENANT_ID]);

    if (siteQuery.rows.length === 0) {
      return jsonResponse({
        success: true,
        site_exists: false,
        message: 'No generated site found'
      });
    }

    const site = siteQuery.rows[0];

    return jsonResponse({
      success: true,
      site_exists: true,
      ...site,
      files: [], // We don't store individual files in the database
      download_info: {
        total_files: site.file_count || 0,
        total_size_mb: ((site.total_size_bytes || 0) / 1024 / 1024).toFixed(2),
        estimated_download_time: '< 1 minute'
      }
    });

  } catch (error) {
    console.error('Error fetching site status:', error);
    return internalServerErrorResponse('Failed to fetch site status');
  }
}