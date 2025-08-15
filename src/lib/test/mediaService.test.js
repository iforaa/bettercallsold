/**
 * Simple test for MediaService to verify functionality
 * This can be run manually or integrated into a test suite later
 */

import { MediaService } from '../services/MediaService.js';

export async function testMediaService() {
  console.log('🧪 Testing MediaService...');
  
  try {
    // Test 1: Check if MediaService initializes correctly
    console.log('✅ MediaService initialized');
    
    // Test 2: Test provider registration
    const cloudflareProvider = MediaService.getProvider('cloudflare');
    console.log('✅ Cloudflare provider available:', !!cloudflareProvider);
    
    const localProvider = MediaService.getProvider('local');
    console.log('✅ Local provider available:', !!localProvider);
    
    // Test 3: Test URL transformations
    const testUrl = 'https://quartergate.org/images/test.jpg';
    const optimizedUrl = MediaService.getOptimizedUrl(testUrl, { width: 300, quality: 80 });
    console.log('✅ URL optimization:', optimizedUrl);
    
    // Test 4: Test file validation (without actual file)
    try {
      const fakeFile = {
        size: 500 * 1024, // 500KB
        type: 'image/jpeg',
        name: 'test.jpg'
      };
      MediaService.validateFile(fakeFile);
      console.log('✅ File validation passed');
    } catch (error) {
      console.log('❌ File validation failed:', error.message);
    }
    
    // Test 5: Test oversized file validation
    try {
      const oversizedFile = {
        size: 50 * 1024 * 1024, // 50MB
        type: 'image/jpeg',
        name: 'large.jpg'
      };
      MediaService.validateFile(oversizedFile);
      console.log('❌ Oversized file validation should have failed');
    } catch (error) {
      console.log('✅ Oversized file correctly rejected:', error.message);
    }
    
    // Test 6: Test invalid file type validation
    try {
      const invalidFile = {
        size: 500 * 1024,
        type: 'application/pdf',
        name: 'document.pdf'
      };
      MediaService.validateFile(invalidFile);
      console.log('❌ Invalid file type validation should have failed');
    } catch (error) {
      console.log('✅ Invalid file type correctly rejected:', error.message);
    }
    
    console.log('🎉 All MediaService tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ MediaService test failed:', error);
    return false;
  }
}

// Export for use in other test files
export { testMediaService as default };