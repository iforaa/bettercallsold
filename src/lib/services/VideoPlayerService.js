/**
 * VideoPlayerService - Video player management for replays
 * Handles HLS video streaming, URL generation, and player lifecycle
 */

export class VideoPlayerService {
  /**
   * Generate video URL from replay data
   */
  static getVideoUrl(replay) {
    if (!replay) return null;

    // First try the source_url if available
    if (replay.source_url && replay.source_url.trim() !== '') {
      return replay.source_url;
    }
    
    // Try to construct video URL from CommentSold thumbnail patterns
    if (replay.animated_thumb) {
      // Convert thumbnail URL to video URL
      // Example: https://vod2.commentsold.com/dist/divas/3233/thumbnails/240p.webp
      // to: https://vod2.commentsold.com/dist/divas/3233/playlist.m3u8
      const thumbnailUrl = replay.animated_thumb;
      const baseUrl = thumbnailUrl.replace(/\/thumbnails\/.*$/, '');
      
      // Return HLS stream URL - playlist.m3u8 is the most common format
      return baseUrl + '/playlist.m3u8';
    }
    
    return null;
  }

  /**
   * Generate all possible video sources for fallback
   */
  static getVideoSources(replay) {
    if (!replay) return [];

    const sources = [];
    
    // First try the source_url if available
    if (replay.source_url && replay.source_url.trim() !== '') {
      const sourceUrl = replay.source_url;
      
      if (sourceUrl.includes('.m3u8')) {
        sources.push({ src: sourceUrl, type: 'application/x-mpegURL' });
      } else if (sourceUrl.includes('.mp4')) {
        sources.push({ src: sourceUrl, type: 'video/mp4' });
      } else {
        // Default to mp4 if extension is unclear
        sources.push({ src: sourceUrl, type: 'video/mp4' });
      }
    }
    
    // Try to construct video URLs from CommentSold patterns
    if (replay.animated_thumb) {
      const baseUrl = replay.animated_thumb.replace(/\/thumbnails\/.*$/, '');
      
      // Add multiple possible video formats in priority order
      sources.push(
        { src: baseUrl + '/playlist.m3u8', type: 'application/x-mpegURL' },
        { src: baseUrl + '/index.m3u8', type: 'application/x-mpegURL' },
        { src: baseUrl + '/video.m3u8', type: 'application/x-mpegURL' },
        { src: baseUrl + '/video.mp4', type: 'video/mp4' }
      );
    }
    
    return sources;
  }

  /**
   * Get poster image for video player
   */
  static getPosterImage(replay) {
    if (!replay) return null;
    return replay.source_thumb || replay.animated_thumb || null;
  }

  /**
   * Check if video is available
   */
  static hasVideo(replay) {
    return !!this.getVideoUrl(replay);
  }

  /**
   * Check if replay has thumbnail
   */
  static hasThumbnail(replay) {
    if (!replay) return false;
    return !!(replay.source_thumb || replay.animated_thumb);
  }

  /**
   * Initialize HLS player with error handling
   */
  static initializeHLSPlayer(videoElement, videoUrl, options = {}) {
    if (!videoElement || !videoUrl) {
      console.warn('VideoPlayerService.initializeHLSPlayer: Missing video element or URL');
      return null;
    }

    console.log('Initializing HLS player with URL:', videoUrl);

    // Default HLS configuration
    const hlsConfig = {
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      ...options
    };

    // Check if HLS.js is available globally
    if (typeof window !== 'undefined' && window.Hls) {
      const Hls = window.Hls;
      
      if (Hls.isSupported()) {
        console.log('HLS.js is supported, creating instance');
        const hlsInstance = new Hls(hlsConfig);
        
        hlsInstance.loadSource(videoUrl);
        hlsInstance.attachMedia(videoElement);
        
        // Set up event listeners
        hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('HLS: Media attached successfully');
        });
        
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS: Manifest parsed successfully');
        });
        
        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          this.handleHLSError(hlsInstance, data);
        });
        
        return hlsInstance;
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari and other browsers with native HLS support
        console.log('Using native HLS support');
        videoElement.src = videoUrl;
        return 'native';
      } else {
        console.warn('HLS not supported, trying MP4 fallback');
        // Try MP4 fallback
        const mp4Url = videoUrl.replace('.m3u8', '.mp4');
        videoElement.src = mp4Url;
        return 'fallback';
      }
    } else {
      console.error('HLS.js not loaded');
      return null;
    }
  }

  /**
   * Handle HLS errors with recovery strategies
   */
  static handleHLSError(hlsInstance, errorData) {
    if (!hlsInstance || !errorData.fatal) return;

    console.error('Fatal HLS error, attempting recovery:', errorData);

    const Hls = window.Hls;
    
    switch (errorData.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        console.log('Network error detected, restarting load...');
        hlsInstance.startLoad();
        break;
        
      case Hls.ErrorTypes.MEDIA_ERROR:
        console.log('Media error detected, attempting recovery...');
        hlsInstance.recoverMediaError();
        break;
        
      default:
        console.log('Unrecoverable error, destroying HLS instance');
        hlsInstance.destroy();
        return false;
    }
    
    return true;
  }

  /**
   * Destroy HLS player instance safely
   */
  static destroyHLSPlayer(hlsInstance) {
    if (hlsInstance && typeof hlsInstance.destroy === 'function') {
      try {
        hlsInstance.destroy();
        console.log('HLS player destroyed successfully');
      } catch (error) {
        console.error('Error destroying HLS player:', error);
      }
    }
  }

  /**
   * Check if HLS.js is loaded and available
   */
  static isHLSAvailable() {
    return typeof window !== 'undefined' && !!window.Hls;
  }

  /**
   * Load HLS.js library dynamically if needed
   */
  static async loadHLSLibrary() {
    // Check if already loaded
    if (this.isHLSAvailable()) {
      return true;
    }

    try {
      // Load HLS.js from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.async = true;
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          console.log('HLS.js loaded successfully');
          resolve(true);
        };
        
        script.onerror = (error) => {
          console.error('Failed to load HLS.js:', error);
          reject(false);
        };
        
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('Error loading HLS.js:', error);
      return false;
    }
  }

  /**
   * Get video metadata and capabilities
   */
  static getVideoMetadata(replay) {
    const videoUrl = this.getVideoUrl(replay);
    const sources = this.getVideoSources(replay);
    const poster = this.getPosterImage(replay);
    
    return {
      hasVideo: !!videoUrl,
      hasThumbnail: !!poster,
      primaryUrl: videoUrl,
      allSources: sources,
      posterImage: poster,
      isHLS: videoUrl && videoUrl.includes('.m3u8'),
      isMP4: videoUrl && videoUrl.includes('.mp4'),
      displayName: replay?.name || replay?.title || 'Untitled Replay'
    };
  }

  /**
   * Validate video URL accessibility
   */
  static async validateVideoUrl(url) {
    if (!url) return false;

    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Video URL validation failed:', error);
      return false;
    }
  }

  /**
   * Get optimal video quality based on connection and device
   */
  static getOptimalVideoQuality() {
    // Simple heuristics based on connection and screen size
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const screenWidth = window.screen.width;
    
    if (connection) {
      // Use connection API if available
      if (connection.effectiveType === '4g' && screenWidth > 1080) {
        return 'high';
      } else if (connection.effectiveType === '3g' || screenWidth <= 720) {
        return 'medium';
      }
    }
    
    // Default to medium quality
    return 'medium';
  }

  /**
   * Format video duration for display
   */
  static formatVideoDuration(seconds) {
    if (!seconds || seconds <= 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}