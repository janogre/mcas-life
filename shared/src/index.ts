/**
 * MCAS-Life Shared Types and Utilities
 * 
 * Main export file for all shared types, interfaces, and utilities
 * used across the MCAS-Life application ecosystem.
 */

// Export all food-related types
export * from './types/food.js';

// Export all health-related types  
export * from './types/health.js';

// Export all user-related types
export * from './types/user.js';

// Export all API-related types
export * from './types/api.js';

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Common timestamp types
export type ISODateString = string;
export type UnixTimestamp = number;

// Common ID types for type safety
export type UserId = number;
export type FoodId = number;
export type SymptomId = number;
export type DiaryEntryId = number;

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Common utility functions (type guards)
export const isNotNull = <T>(value: T | null): value is T => value !== null;
export const isNotUndefined = <T>(value: T | undefined): value is T => value !== undefined;
export const isDefined = <T>(value: T | null | undefined): value is T => value != null;

// Common validation patterns
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[\d\s\-\(\)]+$/;
export const PASSWORD_MIN_LENGTH = 8;

// Common constants for MCAS application
export const MCAS_CONSTANTS = {
  // Symptom severity scale
  SEVERITY_MIN: 1,
  SEVERITY_MAX: 10,
  
  // Correlation analysis window (hours)
  CORRELATION_WINDOW_MIN: 2,
  CORRELATION_WINDOW_MAX: 72,
  CORRELATION_WINDOW_DEFAULT: 24,
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // File upload limits
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  
  // Rate limiting
  API_RATE_LIMIT_REQUESTS: 100,
  API_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  
  // Data retention
  DEFAULT_DATA_RETENTION_MONTHS: 24,
  MIN_DATA_RETENTION_MONTHS: 6,
  MAX_DATA_RETENTION_MONTHS: 120, // 10 years
  
  // AI analysis thresholds
  MIN_DATA_POINTS_FOR_CORRELATION: 10,
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.6,
  
  // Supported locales
  SUPPORTED_LOCALES: ['no', 'en', 'da', 'sv'] as const,
  DEFAULT_LOCALE: 'no' as const,
  
  // Timezone defaults
  DEFAULT_TIMEZONE: 'Europe/Oslo',
  
  // Version information
  API_VERSION: 'v1',
  
  // Feature flags
  FEATURES: {
    AI_CORRELATION: true,
    VOICE_INPUT: false,           // Future feature
    PHOTO_RECOGNITION: false,     // Future feature
    EXPERT_NETWORK: false,        // Future feature
    RESEARCH_PARTICIPATION: true,
    COMMUNITY_FEATURES: true
  } as const
} as const;

// Type for MCAS constants (for type checking)
export type McasConstants = typeof MCAS_CONSTANTS;

// Utility type for extracting enum values
export type EnumValues<T> = T[keyof T];

// Utility type for making specific fields optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Utility type for making specific fields required
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Deep partial type for nested objects
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Create type from array of strings (for enum-like behavior)
export type ArrayToUnion<T extends readonly string[]> = T[number];

// Type for supported locales
export type SupportedLocale = ArrayToUnion<typeof MCAS_CONSTANTS.SUPPORTED_LOCALES>;

// Common error messages (for consistent UX)
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_TOO_SHORT: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  INVALID_DATE: 'Please enter a valid date',
  SEVERITY_OUT_OF_RANGE: `Severity must be between ${MCAS_CONSTANTS.SEVERITY_MIN} and ${MCAS_CONSTANTS.SEVERITY_MAX}`,
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NETWORK_ERROR: 'Network error. Please check your connection',
  SERVER_ERROR: 'Server error. Please try again later',
  DATA_NOT_FOUND: 'The requested data was not found',
  UPLOAD_TOO_LARGE: `File size must be less than ${MCAS_CONSTANTS.MAX_FILE_SIZE_MB}MB`,
  INVALID_FILE_TYPE: 'Invalid file type. Please upload an image file'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Successfully saved',
  DELETED: 'Successfully deleted',
  UPDATED: 'Successfully updated',
  CREATED: 'Successfully created',
  EMAIL_SENT: 'Email sent successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  SYMPTOM_LOGGED: 'Symptom logged successfully',
  SUPPLEMENT_ADDED: 'Supplement added successfully'
} as const;

// Export constants as named exports for convenience
export { MCAS_CONSTANTS as Constants };
export { ERROR_MESSAGES as Errors };
export { SUCCESS_MESSAGES as Success };