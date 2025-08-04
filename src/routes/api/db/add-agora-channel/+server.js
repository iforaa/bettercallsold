import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function POST() {
  try {
    // Add agora_channel and agora_token columns to live_streams table
    await query(`
      ALTER TABLE live_streams 
      ADD COLUMN IF NOT EXISTS agora_channel VARCHAR(255),
      ADD COLUMN IF NOT EXISTS agora_token TEXT
    `);
    
    return jsonResponse({
      success: true,
      message: 'Added agora_channel and agora_token columns to live_streams table'
    });
    
  } catch (error) {
    console.error('Database update error:', error);
    return internalServerErrorResponse(`Failed to update database: ${error.message}`);
  }
}