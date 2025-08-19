import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

// Generate random discount code
export async function POST() {
  try {
    // Generate random code with format: DISCOUNT_XXXXXX (6 random alphanumeric characters)
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `DISCOUNT_${randomPart}`;

    // Check if code already exists and generate new one if needed
    let attempts = 0;
    let finalCode = code;
    
    while (attempts < 10) { // Max 10 attempts to avoid infinite loop
      const existingCode = await query('SELECT id FROM discount_codes WHERE code = $1', [finalCode]);
      
      if (existingCode.rows.length === 0) {
        // Code is unique, we can use it
        break;
      }
      
      // Generate new code
      const newRandomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      finalCode = `DISCOUNT_${newRandomPart}`;
      attempts++;
    }

    if (attempts >= 10) {
      // Fallback to timestamp-based code if we can't find a unique one
      finalCode = `DISCOUNT_${Date.now().toString(36).toUpperCase()}`;
    }

    return jsonResponse({
      code: finalCode,
      success: true
    });

  } catch (error) {
    console.error('Generate discount code error:', error);
    return internalServerErrorResponse('Failed to generate discount code');
  }
}