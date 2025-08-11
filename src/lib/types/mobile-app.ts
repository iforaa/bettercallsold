/**
 * Mobile App Type Definitions
 * Complete TypeScript interfaces for the mobile app configuration domain
 */

import type { BaseEntity } from './common';

// Color configuration interface
export interface AppColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

// Promo messages interface
export interface AppMessages {
  promoLine1: string;
  promoLine2: string;
}

// Tab configuration interface
export interface AppTab {
  key: string;
  title: string;
  icon: string;
  enabled: boolean;
}

// Complete mobile app configuration interface
export interface MobileAppConfig {
  appName: string;
  colors: AppColors;
  messages: AppMessages;
  tabs: AppTab[];
}

// Color preset interface
export interface ColorPreset {
  name: string;
  colors: AppColors;
}

// App configuration API response
export interface AppConfigResponse {
  success: boolean;
  config: MobileAppConfig;
  message?: string;
}

// App configuration save request
export interface AppConfigSaveRequest {
  config: MobileAppConfig;
}

// App configuration save response
export interface AppConfigSaveResponse {
  success: boolean;
  message?: string;
  savedAt?: string;
}

// Validation result interface
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

// Configuration summary for display
export interface ConfigSummary {
  appName: string;
  tabCount: number;
  colorScheme: 'Light' | 'Dark';
  hasPromoMessages: boolean;
  isValid: boolean;
}

// Loading states for mobile app operations
export interface MobileAppLoadingStates {
  config: boolean;
  saving: boolean;
  preview: boolean;
}

// Error states for mobile app operations
export interface MobileAppErrorStates {
  config: string;
  saving: string;
  validation: string[];
}

// UI state for mobile app configuration
export interface MobileAppUIState {
  previewOpen: boolean;
  activeSection: 'info' | 'colors' | 'messages' | 'tabs';
  isDirty: boolean;
}

// Form state for mobile app configuration
export interface MobileAppFormState {
  tempConfig: MobileAppConfig | null;
  validation: {
    valid: boolean;
    errors: string[];
  };
}

// Available options for configuration
export interface MobileAppOptions {
  colorPresets: ColorPreset[];
  availableIcons: string[];
}

// Complete mobile app state interface
export interface MobileAppState {
  config: MobileAppConfig;
  loading: MobileAppLoadingStates;
  errors: MobileAppErrorStates;
  ui: MobileAppUIState;
  form: MobileAppFormState;
  options: MobileAppOptions;
  lastFetch: Date | null;
  lastSave: Date | null;
}

// Tab update data
export interface TabUpdate {
  title?: string;
  icon?: string;
  enabled?: boolean;
}

// Color update data
export interface ColorUpdate {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}

// Messages update data
export interface MessagesUpdate {
  promoLine1?: string;
  promoLine2?: string;
}

// Configuration update data
export interface ConfigUpdate {
  appName?: string;
  colors?: Partial<AppColors>;
  messages?: Partial<AppMessages>;
  tabs?: AppTab[];
}

// Preview data for mobile app
export interface PreviewData {
  config: MobileAppConfig;
  enabledTabs: AppTab[];
  summary: ConfigSummary;
}

// Icon option for selects
export interface IconOption {
  value: string;
  label: string;
  icon?: string;
}

// Section configuration for UI navigation
export interface ConfigSection {
  id: 'info' | 'colors' | 'messages' | 'tabs';
  title: string;
  icon: string;
  description: string;
}

// Form field validation
export interface FieldValidation {
  field: string;
  valid: boolean;
  error?: string;
}

// Bulk validation result for forms
export interface FormValidationResult {
  valid: boolean;
  fieldErrors: FieldValidation[];
  globalErrors: string[];
}

// Mobile app metrics for analytics
export interface MobileAppMetrics {
  totalConfigurations: number;
  activeConfigurations: number;
  mostUsedColors: string[];
  averageTabCount: number;
  lastModified: Date | null;
}

// Export parameters for mobile app config
export interface MobileAppExportParams {
  format: 'json' | 'yaml' | 'env';
  includeMetadata: boolean;
  includeDefaults: boolean;
}

// Import data for mobile app config
export interface MobileAppImportData {
  config: MobileAppConfig;
  metadata?: {
    version: string;
    exportedAt: string;
    exportedBy?: string;
  };
}

// Activity log for configuration changes
export interface MobileAppActivityLog extends BaseEntity {
  action: 'created' | 'updated' | 'reset' | 'exported' | 'imported';
  section: 'info' | 'colors' | 'messages' | 'tabs' | 'all';
  changes: Record<string, any>;
  previousValues?: Record<string, any>;
  user_id?: string;
  metadata?: Record<string, any>;
}

// Theme configuration extended interface
export interface ThemeConfig extends AppColors {
  name: string;
  isDark: boolean;
  customProperties?: Record<string, string>;
}

// Advanced tab configuration
export interface AdvancedTabConfig extends AppTab {
  order?: number;
  permissions?: string[];
  customData?: Record<string, any>;
  isSystemTab?: boolean;
}

// Configuration comparison for diffs
export interface ConfigComparison {
  field: string;
  oldValue: any;
  newValue: any;
  changed: boolean;
}

// Backup configuration data
export interface ConfigBackup {
  id: string;
  config: MobileAppConfig;
  createdAt: Date;
  description?: string;
  isAutomatic: boolean;
}

// Configuration template
export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  config: MobileAppConfig;
  category: 'default' | 'seasonal' | 'promotional' | 'custom';
  tags: string[];
  isPublic: boolean;
}