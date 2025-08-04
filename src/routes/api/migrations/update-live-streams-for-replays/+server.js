import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function POST({ request }) {
  try {
    console.log('Starting live_streams table migration for replays...');
    
    // Step 1: Clear existing data
    console.log('Clearing existing live_streams data...');
    await query('DELETE FROM live_streams');
    
    // Step 2: Remove columns we don't need for replays
    const columnsToRemove = ['stream_key'];
    
    for (const column of columnsToRemove) {
      try {
        await query(`ALTER TABLE live_streams DROP COLUMN IF EXISTS ${column}`);
        console.log(`Removed column: ${column}`);
      } catch (error) {
        console.log(`Column ${column} might not exist or already removed`);
      }
    }
    
    // Step 3: Add new columns for replays (CommentSold live-sales data)
    const newColumns = [
      'external_id INTEGER', // CommentSold live sale ID
      'name VARCHAR(255)', // Replaces title but more specific naming
      'source_url TEXT',
      'source_thumb TEXT', 
      'animated_thumb TEXT',
      'product_count INTEGER DEFAULT 0',
      'peak_viewers INTEGER DEFAULT 0',
      'is_live BOOLEAN DEFAULT FALSE',
      'label VARCHAR(255)',
      'is_wide_cell BOOLEAN DEFAULT FALSE',
      'metadata JSONB DEFAULT \'{}\'::jsonb' // Store additional CommentSold metadata
    ];
    
    for (const columnDef of newColumns) {
      try {
        await query(`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS ${columnDef}`);
        console.log(`Added column: ${columnDef}`);
      } catch (error) {
        console.log(`Error adding column ${columnDef}: ${error.message}`);
      }
    }
    
    // Step 4: Update existing column defaults and constraints
    try {
      // Update status default to be more appropriate for replays
      await query(`ALTER TABLE live_streams ALTER COLUMN status SET DEFAULT 'active'`);
      
      // Make tenant_id NOT NULL
      await query(`ALTER TABLE live_streams ALTER COLUMN tenant_id SET NOT NULL`);
      
      // Update title to be nullable since we have name now
      await query(`ALTER TABLE live_streams ALTER COLUMN title DROP NOT NULL`);
      
      console.log('Updated column constraints');
    } catch (error) {
      console.log(`Error updating constraints: ${error.message}`);
    }
    
    // Step 5: Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_live_streams_external_id ON live_streams(external_id)',
      'CREATE INDEX IF NOT EXISTS idx_live_streams_tenant_external ON live_streams(tenant_id, external_id)',
      'CREATE INDEX IF NOT EXISTS idx_live_streams_started_at ON live_streams(started_at)',
      'CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_live_streams_unique_external ON live_streams(tenant_id, external_id) WHERE external_id IS NOT NULL'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await query(indexSQL);
        console.log(`Created index: ${indexSQL.split(' ')[5]}`);
      } catch (error) {
        console.log(`Error creating index: ${error.message}`);
      }
    }
    
    // Step 6: Create replay_products table if it doesn't exist
    const createReplayProductsTable = `
      CREATE TABLE IF NOT EXISTS replay_products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        replay_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
        external_id INTEGER NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        brand VARCHAR(255),
        identifier VARCHAR(255),
        thumbnail TEXT,
        price DECIMAL(10,2) DEFAULT 0,
        price_label VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        badge_label VARCHAR(100),
        shown_at TIMESTAMP WITH TIME ZONE,
        hidden_at TIMESTAMP WITH TIME ZONE,
        is_favorite BOOLEAN DEFAULT FALSE,
        description TEXT,
        store_description TEXT,
        product_path VARCHAR(255),
        external_product_id VARCHAR(255),
        product_type VARCHAR(100),
        shopify_product_id VARCHAR(255),
        media JSONB DEFAULT '[]'::jsonb,
        overlay_texts JSONB DEFAULT '[]'::jsonb,
        inventory JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `;
    
    await query(createReplayProductsTable);
    console.log('Created replay_products table');
    
    // Create indexes for replay_products
    const replayProductIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_replay_products_replay_id ON replay_products(replay_id)',
      'CREATE INDEX IF NOT EXISTS idx_replay_products_external_id ON replay_products(external_id)',
      'CREATE INDEX IF NOT EXISTS idx_replay_products_shown_at ON replay_products(shown_at)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_replay_products_unique ON replay_products(replay_id, external_id)'
    ];
    
    for (const indexSQL of replayProductIndexes) {
      try {
        await query(indexSQL);
        console.log(`Created replay_products index: ${indexSQL.split(' ')[5]}`);
      } catch (error) {
        console.log(`Error creating replay_products index: ${error.message}`);
      }
    }
    
    console.log('✅ Live streams table migration for replays completed successfully');
    
    return jsonResponse({
      success: true,
      message: 'Live streams table successfully updated for replays functionality',
      changes: {
        columns_removed: columnsToRemove,
        columns_added: newColumns.map(col => col.split(' ')[0]),
        indexes_created: [
          'idx_live_streams_external_id',
          'idx_live_streams_tenant_external', 
          'idx_live_streams_started_at',
          'idx_live_streams_status',
          'idx_live_streams_unique_external'
        ],
        tables_created: ['replay_products'],
        replay_product_indexes: [
          'idx_replay_products_replay_id',
          'idx_replay_products_external_id',
          'idx_replay_products_shown_at',
          'idx_replay_products_unique'
        ]
      }
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    return internalServerErrorResponse(`Migration failed: ${error.message}`);
  }
}