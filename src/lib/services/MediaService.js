/**
 * MediaService - Centralized file upload and media management
 * Provides a unified interface for all file upload operations with multiple provider support
 */

import { MEDIA_CONFIG } from '$lib/config/media.js';

export class MediaService {
  static providers = new Map();
  static defaultProvider = 'cloudflare';
  static cache = new Map();

  /**
   * Initialize the MediaService with providers
   */
  static initialize() {
    // Register available providers
    this.registerProvider('cloudflare', new CloudflareProvider());
    this.registerProvider('local', new LocalProvider());
    this.registerProvider('aws', new AWSProvider());
  }

  /**
   * Register a media provider
   */
  static registerProvider(name, provider) {
    this.providers.set(name, provider);
  }

  /**
   * Get the active provider
   */
  static getProvider(providerName = null) {
    const provider = providerName || MEDIA_CONFIG.defaultProvider || this.defaultProvider;
    
    if (!this.providers.has(provider)) {
      throw new Error(`Media provider '${provider}' not found`);
    }
    
    return this.providers.get(provider);
  }

  /**
   * Upload single file
   */
  static async uploadFile(file, options = {}) {
    try {
      const provider = this.getProvider(options.provider);
      
      // Validate file
      this.validateFile(file, options);
      
      // Generate upload metadata
      const metadata = this.generateMetadata(file, options);
      
      // Check cache if enabled
      if (options.cache && this.cache.has(metadata.cacheKey)) {
        return this.cache.get(metadata.cacheKey);
      }
      
      // Upload file
      const result = await provider.upload(file, metadata, options);
      
      // Transform URL if needed
      result.url = this.transformUrl(result.url, options);
      
      // Cache result if enabled
      if (options.cache) {
        this.cache.set(metadata.cacheKey, result);
      }
      
      return result;
      
    } catch (error) {
      console.error('MediaService upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadFiles(files, options = {}) {
    const results = [];
    const errors = [];
    
    // Upload files in parallel or series based on options
    if (options.parallel !== false) {
      const promises = files.map(async (file, index) => {
        try {
          const fileOptions = { ...options, index };
          const result = await this.uploadFile(file, fileOptions);
          return { success: true, result, index };
        } catch (error) {
          return { success: false, error: error.message, index };
        }
      });
      
      const outcomes = await Promise.all(promises);
      
      outcomes.forEach(outcome => {
        if (outcome.success) {
          results.push(outcome.result);
        } else {
          errors.push(outcome);
        }
      });
      
    } else {
      // Upload files in series
      for (let i = 0; i < files.length; i++) {
        try {
          const fileOptions = { ...options, index: i };
          const result = await this.uploadFile(files[i], fileOptions);
          results.push(result);
        } catch (error) {
          errors.push({ error: error.message, index: i });
        }
      }
    }
    
    return { results, errors };
  }

  /**
   * Download and re-upload external media (for CommentSold sync, etc.)
   */
  static async downloadAndUpload(mediaUrls, options = {}) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < mediaUrls.length; i++) {
      const mediaUrl = mediaUrls[i];
      try {
        console.log(`Downloading media from: ${mediaUrl}`);
        
        // Download the media file
        const downloadResponse = await fetch(mediaUrl);
        if (!downloadResponse.ok) {
          throw new Error(`Failed to download: HTTP ${downloadResponse.status}`);
        }

        // Get content type and create blob
        const contentType = downloadResponse.headers.get('content-type') || 'application/octet-stream';
        const buffer = await downloadResponse.arrayBuffer();
        const blob = new Blob([buffer], { type: contentType });
        
        // Generate filename
        const extension = this.getExtensionFromContentType(contentType) || this.getExtensionFromUrl(mediaUrl) || '.jpg';
        const fileName = this.generateFileName(options.productName || 'media', i, extension);
        
        // Create file object
        const file = new File([blob], fileName, { type: contentType });
        
        // Upload using the service
        const uploadOptions = {
          ...options,
          originalUrl: mediaUrl,
          index: i
        };
        
        const result = await this.uploadFile(file, uploadOptions);
        results.push(result);
        
        console.log(`Successfully uploaded ${fileName}: ${result.url}`);
        
      } catch (error) {
        console.error(`Failed to download and upload media from ${mediaUrl}:`, error);
        errors.push({ url: mediaUrl, error: error.message, index: i });
        
        // Continue with other files instead of failing completely
        if (!options.stopOnError) {
          console.warn(`Skipping media file ${mediaUrl} due to error: ${error.message}`);
        }
      }
    }
    
    return { results, errors };
  }

  /**
   * Delete uploaded file
   */
  static async deleteFile(url, options = {}) {
    try {
      const provider = this.getProvider(options.provider);
      
      if (provider.delete) {
        return await provider.delete(url, options);
      }
      
      console.warn(`Delete operation not supported by provider: ${options.provider}`);
      return { success: false, message: 'Delete not supported' };
      
    } catch (error) {
      console.error('MediaService delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Get optimized URL with transformations
   */
  static getOptimizedUrl(url, transformations = {}) {
    const provider = this.getProviderForUrl(url);
    
    if (provider && provider.getOptimizedUrl) {
      return provider.getOptimizedUrl(url, transformations);
    }
    
    return url;
  }

  /**
   * Clear upload cache
   */
  static clearCache() {
    this.cache.clear();
  }

  // ======================
  // Private Helper Methods
  // ======================

  static validateFile(file, options = {}) {
    const config = MEDIA_CONFIG;
    
    // Check file size
    if (file.size > (options.maxSize || config.maxFileSize)) {
      throw new Error(`File too large. Maximum size is ${this.formatFileSize(options.maxSize || config.maxFileSize)}`);
    }
    
    // Check file type
    const allowedTypes = options.allowedTypes || config.allowedTypes;
    const fileType = file.type.toLowerCase();
    
    if (!allowedTypes.some(type => fileType.includes(type))) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }

  static generateMetadata(file, options = {}) {
    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFileName(file.name);
    
    return {
      originalName: file.name,
      fileName: options.fileName || `${timestamp}_${sanitizedName}`,
      contentType: file.type,
      size: file.size,
      timestamp,
      cacheKey: options.cacheKey || `${file.name}_${file.size}_${file.lastModified}`
    };
  }

  static transformUrl(url, options = {}) {
    if (options.cdnUrl) {
      return url.replace(options.baseUrl || '', options.cdnUrl);
    }
    
    if (options.urlTransform && typeof options.urlTransform === 'function') {
      return options.urlTransform(url);
    }
    
    return url;
  }

  static getProviderForUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('quartergate.org') || hostname.includes('cloudflare')) {
        return this.getProvider('cloudflare');
      } else if (hostname.includes('amazonaws.com') || hostname.includes('s3')) {
        return this.getProvider('aws');
      } else if (hostname === 'localhost') {
        return this.getProvider('local');
      }
      
      return null;
    } catch {
      return null;
    }
  }

  static getExtensionFromContentType(contentType) {
    const map = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/mov': '.mov',
      'video/avi': '.avi'
    };
    
    return map[contentType.toLowerCase()];
  }

  static getExtensionFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.[a-zA-Z0-9]+$/);
      return match ? match[0] : null;
    } catch {
      return null;
    }
  }

  static generateFileName(baseName, index, extension) {
    const sanitized = this.sanitizeFileName(baseName);
    const timestamp = Date.now();
    return `${sanitized}_${index + 1}_${timestamp}${extension}`;
  }

  static sanitizeFileName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  }

  static formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${Math.round(size * 100) / 100}${units[unitIndex]}`;
  }
}

// ======================
// Provider Implementations
// ======================

class CloudflareProvider {
  async upload(file, metadata, options = {}) {
    const formData = new FormData();
    formData.append('video', file, metadata.fileName);
    formData.append('fileName', metadata.fileName);
    formData.append('contentType', metadata.contentType);
    
    const uploadUrl = options.uploadUrl || MEDIA_CONFIG.providers.cloudflare.uploadUrl;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Cloudflare upload failed: HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      url: result.fileUrl,
      provider: 'cloudflare',
      fileName: metadata.fileName,
      size: metadata.size,
      contentType: metadata.contentType
    };
  }

  getOptimizedUrl(url, transformations = {}) {
    // Add Cloudflare image transformations if needed
    const params = new URLSearchParams();
    
    if (transformations.width) params.set('width', transformations.width);
    if (transformations.height) params.set('height', transformations.height);
    if (transformations.quality) params.set('quality', transformations.quality);
    if (transformations.format) params.set('format', transformations.format);
    
    return params.toString() ? `${url}?${params.toString()}` : url;
  }
}

class LocalProvider {
  async upload(file, metadata, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Local upload failed: HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      url: result.url,
      provider: 'local',
      fileName: metadata.fileName,
      size: metadata.size,
      contentType: metadata.contentType
    };
  }
}

class AWSProvider {
  async upload(file, metadata, options = {}) {
    // Implementation for AWS S3 upload
    throw new Error('AWS provider not implemented yet');
  }
}

// Initialize the service
MediaService.initialize();