/**
 * Live Stream Type Definitions
 * Complete TypeScript interfaces for the live streaming domain
 */

import type { BaseEntity } from './common';

// Live stream connection states
export type ConnectionStatus = 
  | 'Disconnected'
  | 'Connecting...'
  | 'CONNECTED'
  | 'Token Expired'
  | 'Connection Failed'
  | 'Token Required';

// Stream status colors for UI
export type StreamStatusColor = 'success' | 'warning' | 'error' | 'info' | 'default';

// Agora settings interface
export interface AgoraSettings {
  token: string;
  channel: string;
  lastUpdated: Date | null;
}

// Live selling form data
export interface LiveSellingFormData {
  name: string;
  description: string;
  agora_channel: string;
  agora_token: string;
}

// Connection state interface
export interface ConnectionState {
  joined: boolean;
  connectionStatus: ConnectionStatus;
  isStreamActive: boolean;
  isLiveSelling: boolean;
}

// Settings state interface
export interface SettingsState {
  agoraSettings: AgoraSettings;
  liveSellingForm: LiveSellingFormData;
}

// UI state interface
export interface LiveStreamUIState {
  showTokenPrompt: boolean;
  isTokenExpired: boolean;
  settingsLoaded: boolean;
  videoHandlers: VideoHandlers | null;
}

// Loading states for live stream operations
export interface LiveStreamLoadingStates {
  initializing: boolean;
  connecting: boolean;
  startingLiveSelling: boolean;
  stoppingLiveSelling: boolean;
  updatingSettings: boolean;
}

// Error states for live stream operations
export interface LiveStreamErrorStates {
  initialization: string;
  connection: string;
  liveSelling: string;
  settings: string;
  general: string;
}

// Stream metrics interface
export interface StreamMetrics {
  duration: string;
  viewers: number;
  isActive: boolean;
}

// Stream data interface
export interface StreamData {
  selectedProducts: any[];
  sessionStart: Date | null;
  metrics: StreamMetrics;
}

// Service instances interface
export interface LiveStreamServices {
  agoraService: any | null; // AgoraService type
  liveSellingService: any | null; // LiveSellingService type
  settingsService: any | null; // AgoraSettingsService type
}

// Complete live stream state interface
export interface LiveStreamState {
  services: LiveStreamServices;
  connection: ConnectionState;
  settings: SettingsState;
  ui: LiveStreamUIState;
  loading: LiveStreamLoadingStates;
  errors: LiveStreamErrorStates;
  stream: StreamData;
  lastFetch: Date | null;
  initialized: boolean;
}

// Stream status information
export interface StreamStatusInfo {
  statusClass: string;
  statusText: string;
  statusColor: StreamStatusColor;
  isActive: boolean;
  isLive: boolean;
  canStartLiveSelling: boolean;
  canStopLiveSelling: boolean;
}

// Video handlers interface (from components)
export interface VideoHandlers {
  displayLocalVideo: (videoTrack: any) => void;
  displayRemoteVideo: (user: any, videoTrack: any) => void;
  removeVideoContainer: (uid: string) => void;
  clearVideoContainer: () => void;
}

// Agora user interface
export interface AgoraUser {
  uid: string;
  videoTrack?: any;
  audioTrack?: any;
}

// Agora callbacks interface
export interface AgoraCallbacks {
  onUserPublished: (user: AgoraUser, mediaType: string) => void;
  onUserUnpublished: (user: AgoraUser, mediaType: string) => void;
  onUserLeft: (user: AgoraUser) => void;
  onConnectionStateChange: (state: ConnectionStatus) => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

// Live selling callbacks interface
export interface LiveSellingCallbacks {
  onStarted?: (result: any) => void;
  onStopped?: (result: any) => void;
  onError: (error: string) => void;
}

// Service initialization result
export interface ServiceInitResult {
  success: boolean;
  services: LiveStreamServices | null;
  settings: AgoraSettings | null;
  error: string | null;
}

// Operation result interface
export interface OperationResult {
  success: boolean;
  error: string | null;
}

// Settings update result
export interface SettingsUpdateResult extends OperationResult {
  settings?: AgoraSettings;
}

// Token submission result
export interface TokenSubmissionResult extends OperationResult {
  settings?: AgoraSettings;
}

// Form validation result
export interface FormValidationResult {
  valid: boolean;
  errors: string[];
}

// Stream configuration interface
export interface StreamConfiguration {
  appId: string;
  channel: string;
  token: string;
  userId?: string;
  enableAudio: boolean;
  enableVideo: boolean;
}

// Stream analytics interface
export interface StreamAnalytics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  viewerCount: number;
  peakViewers: number;
  totalMessages: number;
  productsShown: number;
  conversions: number;
  revenue: number;
}

// Stream event interface
export interface StreamEvent extends BaseEntity {
  streamId: string;
  eventType: 'started' | 'stopped' | 'user_joined' | 'user_left' | 'error' | 'reconnect';
  eventData: Record<string, any>;
  timestamp: Date;
  userId?: string;
}

// Live stream session interface
export interface LiveStreamSession extends BaseEntity {
  name: string;
  description: string;
  channel: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  hostId: string;
  viewerCount: number;
  maxViewers: number;
  productIds: string[];
  analytics: StreamAnalytics;
  settings: StreamConfiguration;
}

// Token information interface
export interface TokenInfo {
  token: string;
  expiresAt: Date;
  isExpired: boolean;
  remainingTime: number;
  channel: string;
  userId?: string;
}

// Stream quality metrics
export interface StreamQualityMetrics {
  bitrate: number;
  framerate: number;
  resolution: string;
  packetLoss: number;
  latency: number;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'bad';
}

// Viewer interface
export interface StreamViewer {
  userId: string;
  username: string;
  joinTime: Date;
  isActive: boolean;
  device: 'mobile' | 'desktop' | 'tablet';
  location?: string;
}

// Chat message interface
export interface ChatMessage extends BaseEntity {
  streamId: string;
  userId: string;
  username: string;
  message: string;
  messageType: 'text' | 'product' | 'emoji' | 'system';
  metadata?: Record<string, any>;
  isVisible: boolean;
}

// Product showcase interface
export interface ProductShowcase {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  showTime: Date;
  clickCount: number;
  viewCount: number;
}

// Stream settings interface
export interface StreamSettings {
  enableChat: boolean;
  enableProducts: boolean;
  enableRecording: boolean;
  maxViewers: number;
  isPrivate: boolean;
  allowScreenShare: boolean;
  chatModeration: boolean;
  autoStart: boolean;
  autoStop: boolean;
}

// Error codes for live streaming
export type StreamErrorCode = 
  | 'TOKEN_EXPIRED'
  | 'CHANNEL_INVALID'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'SERVICE_UNAVAILABLE'
  | 'INITIALIZATION_FAILED'
  | 'CONNECTION_FAILED'
  | 'STREAM_INACTIVE';

// Stream error interface
export interface StreamError {
  code: StreamErrorCode;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  recoverable: boolean;
}

// Configuration export/import interfaces
export interface StreamConfigExport {
  settings: StreamSettings;
  agoraSettings: AgoraSettings;
  formData: LiveSellingFormData;
  exportedAt: Date;
  version: string;
}

export interface StreamConfigImport {
  config: StreamConfigExport;
  overwriteExisting: boolean;
  validateToken: boolean;
}

// Webhooks for live stream events
export interface StreamWebhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  createdAt: Date;
  lastTriggered?: Date;
  successCount: number;
  failureCount: number;
}

// Real-time stats for dashboard
export interface LiveStreamStats {
  totalSessions: number;
  activeSessions: number;
  totalViewers: number;
  averageSessionDuration: number;
  totalRevenue: number;
  conversionRate: number;
  popularProducts: string[];
  peakHours: number[];
}

// Component props interfaces
export interface StreamConfigurationProps {
  settings: AgoraSettings;
  formData: LiveSellingFormData;
  isLoading: boolean;
  onUpdateSettings: (token: string, channel: string) => Promise<boolean>;
  onShowTokenPrompt: () => void;
}

export interface StreamStatusDisplayProps {
  status: StreamStatusInfo;
  metrics: StreamMetrics;
  isCompact?: boolean;
}

export interface LiveStreamControlsProps {
  canStart: boolean;
  canStop: boolean;
  isStarting: boolean;
  isStopping: boolean;
  formData: LiveSellingFormData;
  validation: FormValidationResult;
  onStartLiveSelling: () => Promise<boolean>;
  onStopLiveSelling: () => Promise<boolean>;
  onUpdateForm: (updates: Partial<LiveSellingFormData>) => void;
}

export interface StreamMetricsProps {
  metrics: StreamMetrics;
  analytics?: StreamAnalytics;
  showDetailed?: boolean;
}