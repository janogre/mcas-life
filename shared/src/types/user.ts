/**
 * MCAS-Life User Types
 * 
 * User management, authentication, and profile types
 * with MCAS-specific preferences and settings.
 */

// User role system
export enum UserRole {
  PATIENT = 'patient',           // Regular MCAS patient user
  EXPERT = 'expert',             // Medical professional or verified expert
  RESEARCHER = 'researcher',     // Access to anonymized research data
  ADMIN = 'admin'               // System administration
}

// MCAS diagnosis and severity levels
export enum McasSeverity {
  MILD = 'mild',
  MODERATE = 'moderate', 
  SEVERE = 'severe',
  UNKNOWN = 'unknown'
}

// User preferences for notifications and reminders
export interface NotificationPreferences {
  // Medication/supplement reminders
  supplement_reminders: boolean;
  
  // Symptom tracking reminders
  daily_check_in: boolean;
  symptom_followup: boolean;      // Follow up on severe symptoms
  
  // AI insights and correlations
  trigger_alerts: boolean;        // Alert when potential trigger detected
  pattern_insights: boolean;      // Weekly/monthly pattern summaries
  
  // Community and research
  community_updates: boolean;
  research_participation: boolean;
  
  // Delivery preferences
  push_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
}

// Privacy and data sharing preferences
export interface PrivacySettings {
  // Data sharing for research (anonymized)
  share_anonymous_data: boolean;
  share_improvement_data: boolean;  // Success stories, anonymized
  
  // Community features
  public_profile: boolean;
  show_in_expert_network: boolean;
  
  // Professional access
  allow_expert_contact: boolean;
  share_reports_with_doctors: boolean;
  
  // Data retention
  auto_delete_old_data: boolean;
  data_retention_months: number;
}

// MCAS-specific user profile information
export interface McasProfile {
  // Diagnosis information
  diagnosis_date?: Date;
  severity: McasSeverity;
  confirmed_by_doctor: boolean;
  
  // Related conditions (common comorbidities)
  has_mastocytosis: boolean;
  has_histamine_intolerance: boolean;
  has_pots: boolean;              // Postural Orthostatic Tachycardia Syndrome
  has_eds: boolean;               // Ehlers-Danlos Syndrome
  has_food_allergies: boolean;
  other_conditions: string[];
  
  // Current treatments
  current_medications: string[];
  current_supplements: string[];
  treatment_plan?: string;
  
  // Known personal triggers
  known_food_triggers: number[];  // food_ids from foods table
  known_environmental_triggers: string[];
  known_stress_triggers: string[];
  
  // Tolerance levels (for AI personalization)
  histamine_tolerance_level: 'very_low' | 'low' | 'moderate' | 'high';
  exercise_tolerance: 'very_low' | 'low' | 'moderate' | 'high';
  stress_tolerance: 'very_low' | 'low' | 'moderate' | 'high';
  
  // Emergency contacts and medical info
  emergency_contacts?: string[];
  allergic_to_medications?: string[];
  emergency_action_plan?: string;
}

// Core user interface
export interface User {
  id: number;
  
  // Basic identification
  email: string;
  username: string;
  password_hash: string;          // Never expose in API responses
  
  // Personal information
  first_name?: string;
  last_name?: string;
  date_of_birth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Location (for research insights and localization)
  country?: string;
  timezone: string;
  language: 'no' | 'en' | 'da' | 'sv'; // Norwegian, English, Danish, Swedish
  
  // Account management
  role: UserRole;
  email_verified: boolean;
  account_status: 'active' | 'suspended' | 'deleted';
  
  // MCAS-specific profile
  mcas_profile: McasProfile;
  
  // Preferences
  notification_preferences: NotificationPreferences;
  privacy_settings: PrivacySettings;
  
  // App settings
  preferred_units: 'metric' | 'imperial';
  dark_mode: boolean;
  onboarding_completed: boolean;
  
  // Professional verification (for experts)
  verified_professional: boolean;
  professional_credentials?: string;
  verification_date?: Date;
  
  // Usage analytics (for improving app)
  last_login: Date;
  total_logins: number;
  days_active: number;
  
  // Subscription/premium features
  subscription_tier: 'free' | 'premium' | 'professional';
  subscription_expires?: Date;
  
  created_at: Date;
  updated_at: Date;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  timezone: string;
  language: 'no' | 'en' | 'da' | 'sv';
  
  // Initial MCAS information
  mcas_severity: McasSeverity;
  confirmed_diagnosis: boolean;
  
  // Terms acceptance
  accept_terms: boolean;
  accept_privacy: boolean;
  join_research?: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;            // seconds
  token_type: 'Bearer';
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>; // Never expose password hash
  tokens: AuthTokens;
}

// Profile update requests
export type UpdateUserProfileRequest = Partial<Omit<User, 'id' | 'created_at' | 'updated_at' | 'password_hash' | 'email' | 'role'>>;

export type UpdateMcasProfileRequest = Partial<McasProfile>;

export type UpdateNotificationPreferencesRequest = Partial<NotificationPreferences>;

export type UpdatePrivacySettingsRequest = Partial<PrivacySettings>;

// Password and security
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmPasswordResetRequest {
  token: string;
  new_password: string;
}

// Expert network types
export interface ExpertProfile {
  id: number;
  user_id: number;
  
  // Professional information
  title: string;                 // Dr., RN, etc.
  specialization: string[];      // ["MCAS", "Allergy/Immunology", etc.]
  institution?: string;
  location: string;
  
  // Verification
  license_number?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_by?: number;          // admin user_id
  verified_at?: Date;
  
  // Community engagement
  patients_helped: number;
  average_rating: number;
  total_consultations: number;
  
  // Availability
  accepting_consultations: boolean;
  consultation_fee?: number;
  available_languages: string[];
  
  // Profile information
  bio: string;
  website?: string;
  
  created_at: Date;
  updated_at: Date;
}

// Research participation
export interface ResearchParticipation {
  user_id: number;
  
  // Consent management
  general_research_consent: boolean;
  specific_study_consents: {
    study_id: string;
    study_name: string;
    consented_at: Date;
    withdrawn_at?: Date;
  }[];
  
  // Data sharing preferences
  share_symptom_data: boolean;
  share_food_data: boolean;
  share_treatment_data: boolean;
  share_demographic_data: boolean;
  
  // Engagement
  research_surveys_completed: number;
  last_research_activity: Date;
  
  created_at: Date;
  updated_at: Date;
}

// Session management
export interface UserSession {
  id: string;
  user_id: number;
  device_info: string;
  ip_address: string;
  user_agent: string;
  last_activity: Date;
  created_at: Date;
  expires_at: Date;
  is_active: boolean;
}