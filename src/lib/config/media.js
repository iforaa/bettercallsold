/**
 * Media configuration - Centralized settings for file uploads and media management
 */

import { dev } from '$app/environment';

export const MEDIA_CONFIG = {
  // Default provider to use for uploads
  defaultProvider: dev ? 'local' : 'cloudflare',
  
  // Global file upload settings
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'],
  
  // Cache settings
  cache: {
    enabled: true,
    ttl: 60 * 60 * 1000, // 1 hour in milliseconds
    maxEntries: 1000
  },
  
  // Provider-specific configurations
  providers: {
    cloudflare: {
      uploadUrl: 'https://quartergate.org/upload',
      cdnUrl: 'https://quartergate.org',
      maxFileSize: 100 * 1024 * 1024, // 100MB for Cloudflare
      features: {
        imageOptimization: true,
        videoProcessing: true,
        bulkUpload: true
      }
    },
    
    local: {
      uploadUrl: '/api/upload',
      baseUrl: '',
      uploadDir: './static/uploads',
      maxFileSize: 10 * 1024 * 1024, // 10MB for local
      features: {
        imageOptimization: false,
        videoProcessing: false,
        bulkUpload: true
      }
    },
    
    aws: {
      region: 'us-east-1',
      bucket: 'your-bucket-name',
      accessKeyId: '', // Set via environment variables
      secretAccessKey: '', // Set via environment variables
      maxFileSize: 50 * 1024 * 1024, // 50MB for AWS
      features: {
        imageOptimization: true,
        videoProcessing: true,
        bulkUpload: true
      }
    }
  },
  
  // Image optimization presets
  imagePresets: {
    thumbnail: { width: 150, height: 150, quality: 80 },
    small: { width: 300, height: 300, quality: 85 },
    medium: { width: 600, height: 600, quality: 90 },
    large: { width: 1200, height: 1200, quality: 95 },
    original: { quality: 100 }
  },
  
  // File naming strategies
  naming: {
    strategy: 'timestamp', // 'timestamp', 'uuid', 'original', 'custom'
    prefix: '',
    suffix: '',
    includeOriginalName: true,
    maxLength: 100
  },
  
  // URL transformation settings
  urlTransforms: {
    // Add CDN domain if needed
    useCdn: true,
    // Add image optimization parameters
    autoOptimize: true,
    // Add security tokens if needed
    signUrls: false
  },
  
  // Upload behavior settings
  upload: {
    retries: 3,
    retryDelay: 1000, // milliseconds
    timeout: 30000, // 30 seconds
    parallel: true, // Upload multiple files in parallel
    chunkSize: 1024 * 1024, // 1MB chunks for large files
    progressCallback: null // Function to call with upload progress
  },
  
  // Validation settings
  validation: {
    checkMimeType: true,
    checkFileExtension: true,
    scanForMalware: false, // Would require external service
    validateImageDimensions: false
  }
};

// Environment-specific overrides
if (dev) {
  // Development overrides
  MEDIA_CONFIG.cache.enabled = false; // Disable cache in development
  MEDIA_CONFIG.upload.retries = 1; // Fewer retries in development
}

// Helper function to get provider config
export function getProviderConfig(providerName) {
  return MEDIA_CONFIG.providers[providerName];
}

// Helper function to get image preset
export function getImagePreset(presetName) {
  return MEDIA_CONFIG.imagePresets[presetName];
}

// Helper function to check if feature is supported by provider
export function isFeatureSupported(providerName, feature) {
  const provider = getProviderConfig(providerName);
  return provider?.features?.[feature] || false;
}