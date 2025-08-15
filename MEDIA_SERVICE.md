# 📸 MediaService - Centralized File Upload System

## Overview

The MediaService provides a centralized, flexible solution for all file upload operations in BetterCallSold. It replaces the scattered upload logic with a unified interface that supports multiple providers and advanced features.

## Key Features

✅ **Centralized Management** - Single point for all upload operations
✅ **Multiple Providers** - Cloudflare, AWS S3, Local storage support
✅ **Flexible Configuration** - Environment-based provider selection
✅ **Image Optimization** - URL transformations and resizing
✅ **Caching** - Upload result caching for performance
✅ **Error Handling** - Graceful fallbacks and retry mechanisms
✅ **Batch Uploads** - Parallel or sequential file processing
✅ **Download & Re-upload** - For external media imports (CommentSold)

## Quick Start

### Basic Upload
```javascript
import { MediaService } from '$lib/services/MediaService.js';

// Upload single file
const result = await MediaService.uploadFile(file, {
  provider: 'cloudflare',
  cache: true
});
console.log('Uploaded to:', result.url);

// Upload multiple files
const { results, errors } = await MediaService.uploadFiles(files, {
  provider: 'cloudflare',
  parallel: true
});
```

### CommentSold Media Import
```javascript
// Download and re-upload external media
const urls = await MediaService.downloadAndUpload(externalUrls, {
  provider: 'cloudflare',
  productName: 'Product Name',
  stopOnError: false
});
```

### Image Optimization
```javascript
// Get optimized URL with transformations
const optimizedUrl = MediaService.getOptimizedUrl(originalUrl, {
  width: 300,
  height: 300,
  quality: 80
});
```

## Configuration

### Provider Setup
```javascript
// In /src/lib/config/media.js
export const MEDIA_CONFIG = {
  defaultProvider: 'cloudflare',
  
  providers: {
    cloudflare: {
      uploadUrl: 'https://quartergate.org/upload',
      maxFileSize: 100 * 1024 * 1024, // 100MB
      features: {
        imageOptimization: true,
        videoProcessing: true
      }
    },
    
    local: {
      uploadUrl: '/api/upload',
      maxFileSize: 10 * 1024 * 1024 // 10MB
    }
  }
};
```

### Environment-Based Selection
- **Development**: Uses local provider by default
- **Production**: Uses Cloudflare provider
- **Override**: Set provider explicitly in options

## Advanced Usage

### Custom Upload Options
```javascript
const result = await MediaService.uploadFile(file, {
  provider: 'cloudflare',
  cache: true,
  maxSize: 5 * 1024 * 1024, // 5MB limit
  allowedTypes: ['image/jpeg', 'image/png'],
  fileName: 'custom-name.jpg',
  urlTransform: (url) => url.replace('http://', 'https://')
});
```

### Batch Processing with Error Handling
```javascript
const { results, errors } = await MediaService.uploadFiles(files, {
  provider: 'cloudflare',
  parallel: true, // Upload in parallel
  stopOnError: false // Continue on individual failures
});

console.log(`Uploaded ${results.length} files`);
console.log(`Failed ${errors.length} files`);
```

### Cache Management
```javascript
// Clear upload cache
MediaService.clearCache();

// Upload with custom cache key
const result = await MediaService.uploadFile(file, {
  cache: true,
  cacheKey: 'custom-cache-key'
});
```

## Migration from Old System

### Before (ProductService)
```javascript
// Old scattered upload logic
const formData = new FormData();
formData.append('video', image);
formData.append('fileName', image.name);
const response = await fetch('https://quartergate.org/upload', {
  method: 'POST',
  body: formData
});
```

### After (MediaService)
```javascript
// New centralized approach
const result = await MediaService.uploadFile(image, {
  provider: 'cloudflare'
});
```

## Provider Details

### Cloudflare Provider
- **Endpoint**: `https://quartergate.org/upload`
- **Max Size**: 100MB
- **Features**: Image optimization, video processing
- **Field Name**: Uses 'video' for compatibility

### Local Provider
- **Endpoint**: `/api/upload`
- **Max Size**: 10MB
- **Storage**: `./static/uploads`
- **Features**: Basic file storage

### AWS Provider (Future)
- **Status**: Configured but not implemented
- **Features**: S3 storage, CloudFront CDN

## Testing

Test the MediaService:
```bash
curl http://localhost:5175/api/test/media
```

## Benefits of Centralization

1. **🔧 Easy Configuration**: Change upload provider in one place
2. **🚀 Performance**: Built-in caching and parallel uploads
3. **🛡️ Security**: Centralized validation and error handling
4. **📈 Scalability**: Easy to add new providers or features
5. **🧪 Testability**: Centralized testing and monitoring
6. **🔄 Consistency**: Uniform upload behavior across the app

## Error Handling

The MediaService provides comprehensive error handling:
- File validation (size, type)
- Network error retries
- Graceful fallbacks
- Detailed error messages
- Partial success for batch uploads

## Future Enhancements

- [ ] **Image Processing**: Automatic resizing, format conversion
- [ ] **CDN Integration**: Automatic CDN URL generation
- [ ] **Progress Tracking**: Real-time upload progress
- [ ] **Background Processing**: Queue-based uploads
- [ ] **Security**: Upload scanning, access controls
- [ ] **Analytics**: Upload metrics and monitoring