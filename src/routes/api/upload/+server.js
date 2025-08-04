import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { jsonResponse, badRequestResponse, internalServerErrorResponse } from '$lib/response.js';

const UPLOAD_DIR = './static/uploads';
const ALLOWED_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return badRequestResponse('No file provided');
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return badRequestResponse('File too large. Maximum size is 10MB');
    }
    
    // Check file type
    const fileName = file.name;
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    if (!ALLOWED_TYPES.includes(extension)) {
      return badRequestResponse('Invalid file type. Only images are allowed');
    }
    
    // Create uploads directory if it doesn't exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${fileName}`;
    const filePath = join(UPLOAD_DIR, uniqueFileName);
    
    // Save file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);
    
    // Return relative URL
    const relativeUrl = `/uploads/${uniqueFileName}`;
    
    return jsonResponse({
      url: relativeUrl,
      filename: uniqueFileName
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return internalServerErrorResponse('Failed to upload file');
  }
}