/**
 * Mobile App Global State - Svelte 5 Runes
 * Universal reactivity for mobile app configuration across the entire app
 */

import { MobileAppService } from '../services/MobileAppService.js';
import { toastService } from '../services/ToastService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const mobileAppState = $state({
  // Configuration data
  config: MobileAppService.getDefaultConfig(),
  
  // Loading states for different operations
  loading: {
    config: false,
    saving: false,
    preview: false
  },
  
  // Error states for different operations
  errors: {
    config: '',
    saving: '',
    validation: []
  },
  
  // UI state
  ui: {
    previewOpen: false,
    activeSection: 'info', // 'info', 'colors', 'messages', 'tabs'
    isDirty: false, // Track unsaved changes
  },
  
  // Form state
  form: {
    tempConfig: null, // Temporary config for form editing
    validation: {
      valid: true,
      errors: []
    }
  },
  
  // Available options
  options: {
    colorPresets: MobileAppService.getColorPresets(),
    availableIcons: MobileAppService.getAvailableIcons()
  },
  
  // Metadata
  lastFetch: null,
  lastSave: null
});

// Computed functions (can't export $derived from modules)
export function getConfigSummary() {
  return MobileAppService.getConfigSummary(mobileAppState.config);
}

export function getEnabledTabs() {
  return MobileAppService.getEnabledTabs(mobileAppState.config);
}

export function hasUnsavedChanges() {
  return mobileAppState.ui.isDirty;
}

export function getValidationStatus() {
  const result = MobileAppService.validateConfig(mobileAppState.config);
  return {
    isValid: result.valid,
    errors: result.errors,
    hasErrors: result.errors.length > 0
  };
}

export function getFormattedLastSave() {
  if (!mobileAppState.lastSave) return null;
  
  const now = new Date();
  const diff = now - mobileAppState.lastSave;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  
  return mobileAppState.lastSave.toLocaleTimeString();
}

// Actions for state management
export const mobileAppActions = {
  async loadConfig() {
    // Prevent multiple concurrent loads
    if (mobileAppState.loading.config) {
      console.log('Config load already in progress, skipping');
      return;
    }
    
    mobileAppState.loading.config = true;
    mobileAppState.errors.config = '';
    
    try {
      const config = await MobileAppService.getAppConfig();
      mobileAppState.config = { ...mobileAppState.config, ...config };
      mobileAppState.lastFetch = new Date();
      mobileAppState.ui.isDirty = false;
      
      console.log('Mobile app configuration loaded successfully');
    } catch (error) {
      mobileAppState.errors.config = error.message;
      mobileAppState.config = MobileAppService.getDefaultConfig();
      console.error('Failed to load mobile app configuration:', error);
    } finally {
      mobileAppState.loading.config = false;
    }
  },

  async saveConfig() {
    // Validate before saving
    const validation = MobileAppService.validateConfig(mobileAppState.config);
    if (!validation.valid) {
      mobileAppState.errors.validation = validation.errors;
      toastService.show('Please fix validation errors before saving', 'error');
      return false;
    }
    
    // Prevent multiple concurrent saves
    if (mobileAppState.loading.saving) {
      console.log('Config save already in progress, skipping');
      return false;
    }
    
    mobileAppState.loading.saving = true;
    mobileAppState.errors.saving = '';
    mobileAppState.errors.validation = [];
    
    try {
      await MobileAppService.saveAppConfig(mobileAppState.config);
      mobileAppState.lastSave = new Date();
      mobileAppState.ui.isDirty = false;
      
      toastService.show('Configuration saved successfully!', 'success');
      console.log('Mobile app configuration saved successfully');
      return true;
    } catch (error) {
      mobileAppState.errors.saving = error.message;
      toastService.show('Failed to save configuration: ' + error.message, 'error');
      console.error('Failed to save mobile app configuration:', error);
      return false;
    } finally {
      mobileAppState.loading.saving = false;
    }
  },

  // Configuration management
  updateConfig(updates) {
    mobileAppState.config = { ...mobileAppState.config, ...updates };
    mobileAppState.ui.isDirty = true;
    
    // Clear validation errors when config changes
    mobileAppState.errors.validation = [];
  },

  updateAppName(appName) {
    mobileAppState.config.appName = appName;
    mobileAppState.ui.isDirty = true;
  },

  updateColors(colors) {
    mobileAppState.config.colors = { ...mobileAppState.config.colors, ...colors };
    mobileAppState.ui.isDirty = true;
  },

  updateMessages(messages) {
    mobileAppState.config.messages = { ...mobileAppState.config.messages, ...messages };
    mobileAppState.ui.isDirty = true;
  },

  // Color preset management
  applyColorPreset(preset) {
    mobileAppState.config = MobileAppService.applyColorPreset(mobileAppState.config, preset);
    mobileAppState.ui.isDirty = true;
    
    toastService.show(`Applied ${preset.name} color scheme`, 'success');
  },

  // Tab management
  toggleTab(tabIndex) {
    try {
      mobileAppState.config = MobileAppService.toggleTab(mobileAppState.config, tabIndex);
      mobileAppState.ui.isDirty = true;
    } catch (error) {
      toastService.show(error.message, 'error');
    }
  },

  updateTab(tabIndex, updates) {
    try {
      mobileAppState.config = MobileAppService.updateTab(mobileAppState.config, tabIndex, updates);
      mobileAppState.ui.isDirty = true;
    } catch (error) {
      toastService.show(error.message, 'error');
    }
  },

  // UI state management
  setActiveSection(section) {
    mobileAppState.ui.activeSection = section;
  },

  togglePreview() {
    mobileAppState.ui.previewOpen = !mobileAppState.ui.previewOpen;
  },

  closePreview() {
    mobileAppState.ui.previewOpen = false;
  },

  // Form management
  startFormEditing() {
    mobileAppState.form.tempConfig = JSON.parse(JSON.stringify(mobileAppState.config));
  },

  cancelFormEditing() {
    if (mobileAppState.form.tempConfig) {
      mobileAppState.config = mobileAppState.form.tempConfig;
      mobileAppState.form.tempConfig = null;
      mobileAppState.ui.isDirty = false;
    }
  },

  commitFormEditing() {
    mobileAppState.form.tempConfig = null;
  },

  // Validation
  validateCurrentConfig() {
    const validation = MobileAppService.validateConfig(mobileAppState.config);
    mobileAppState.form.validation = {
      valid: validation.valid,
      errors: validation.errors
    };
    mobileAppState.errors.validation = validation.errors;
    
    return validation.valid;
  },

  // Reset and clear
  resetToDefaults() {
    mobileAppState.config = MobileAppService.getDefaultConfig();
    mobileAppState.ui.isDirty = true;
    mobileAppState.errors.validation = [];
    
    toastService.show('Configuration reset to defaults', 'info');
  },

  clearErrors() {
    mobileAppState.errors = {
      config: '',
      saving: '',
      validation: []
    };
  },

  clearUnsavedChanges() {
    mobileAppState.ui.isDirty = false;
  },

  // Retry operations
  retry() {
    if (mobileAppState.errors.config) {
      return this.loadConfig();
    }
    if (mobileAppState.errors.saving) {
      return this.saveConfig();
    }
  }
};