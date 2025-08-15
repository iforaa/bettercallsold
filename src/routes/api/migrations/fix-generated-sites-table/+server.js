import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function GET() {
  try {
    console.log('Fixing generated_sites table constraint...');

    // Drop and recreate the table with proper constraint
    await query(`DROP TABLE IF EXISTS generated_sites;`);
    
    await query(`
      CREATE TABLE generated_sites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL UNIQUE,
        site_name VARCHAR(100) NOT NULL,
        generation_config JSONB DEFAULT '{}',
        api_config JSONB DEFAULT '{}',
        last_generated_at TIMESTAMP,
        deployment_url TEXT,
        deployment_status VARCHAR(20) DEFAULT 'pending',
        file_count INTEGER DEFAULT 0,
        total_size_bytes BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Generated sites table fixed successfully');

    return jsonResponse({
      success: true,
      message: 'Generated sites table fixed successfully'
    });

  } catch (error) {
    console.error('Error fixing generated sites table:', error);
    return internalServerErrorResponse('Failed to fix generated sites table');
  }
}