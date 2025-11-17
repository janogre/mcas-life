/**
 * Test Helpers for MCAS-Life Auth Service
 * 
 * Mock database and utility functions for testing
 */

import { vi } from 'vitest';
import type { User } from '../db/schema.js';
// Note: Using table inference types instead of interface types that don't exist
type McasProfile = typeof import('../db/schema.js').mcasProfiles.$inferSelect;
type UserPreferences = typeof import('../db/schema.js').userPreferences.$inferSelect;

// Mock user data for testing
export const mockUser: Partial<User> = {
  id: 1,
  email: 'test@mcaslife.no',
  username: 'testuser',
  password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKd3DYOe7g8QO8W', // 'testpass123'
  first_name: 'Test',
  last_name: 'User',
  timezone: 'Europe/Oslo',
  language: 'no',
  role: 'patient',
  email_verified: true,
  account_status: 'active',
  onboarding_completed: true,
  total_logins: 5,
  days_active: 10,
  subscription_tier: 'free',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-15')
};

export const mockMcasProfile = {
  id: 1,
  user_id: 1,
  severity: 'moderate',
  confirmed_by_doctor: true,
  comorbidities: {
    mastocytosis: false,
    histamine_intolerance: true,
    pots: false,
    eds: false,
    food_allergies: true,
    other: []
  },
  current_medications: ['Antihistamine H1', 'Antihistamine H2'],
  current_supplements: ['DAO supplement', 'Vitamin C'],
  known_food_triggers: [],
  known_environmental_triggers: ['Stress', 'Heat'],
  known_stress_triggers: ['Work pressure'],
  histamine_tolerance_level: 'low',
  exercise_tolerance: 'moderate',
  stress_tolerance: 'low',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-15')
};

export const mockUserPreferences = {
  id: 1,
  user_id: 1,
  notification_preferences: {
    supplement_reminders: true,
    daily_check_in: true,
    symptom_followup: true,
    trigger_alerts: true,
    pattern_insights: true,
    community_updates: false,
    research_participation: false,
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false
  },
  privacy_settings: {
    share_anonymous_data: false,
    share_improvement_data: false,
    public_profile: false,
    show_in_expert_network: false,
    allow_expert_contact: false,
    share_reports_with_doctors: true,
    auto_delete_old_data: false,
    data_retention_months: 24
  },
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-15')
};

// Mock database responses
export const createMockDbResponse = (data: any) => ({
  rows: Array.isArray(data) ? data : [data],
  rowCount: Array.isArray(data) ? data.length : 1
});

// Mock transaction function
export const mockTransaction = (callback: Function) => {
  return callback({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockUser])
      })
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        })
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 })
      })
    })
  });
};

// Enhanced mock database instance with full query builder support
export const mockDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        })
      }),
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      }),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      })
    })
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockUser]),
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockUser])
      })
    })
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      returning: vi.fn().mockResolvedValue([mockUser])
    })
  }),
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue({ rowCount: 1 })
  }),
  execute: vi.fn().mockResolvedValue([{ count: 1 }]),
  transaction: vi.fn().mockImplementation(mockTransaction)
};

// Helper function to reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks();
  
  // Reset database mock implementations
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        })
      }),
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      }),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      })
    })
  });
  
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockUser]),
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockUser])
      })
    })
  });
  
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      returning: vi.fn().mockResolvedValue([mockUser])
    })
  });
};

// Mock client info for testing
export const mockClientInfo = {
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0 (Test Browser)',
  deviceInfo: 'Test Device'
};

// Valid registration data for testing
export const mockRegistrationData = {
  email: 'newuser@mcaslife.no',
  username: 'newuser',
  password: 'TestPass123!',
  first_name: 'New',
  last_name: 'User',
  timezone: 'Europe/Oslo',
  language: 'no' as const,
  mcas_severity: 'moderate' as const,
  confirmed_diagnosis: true,
  accept_terms: true,
  accept_privacy: true,
  join_research: false
};

// Valid login credentials for testing
export const mockLoginCredentials = {
  email: 'test@mcaslife.no',
  password: 'testpass123',
  remember_me: false
};

// JWT token helpers
export const mockTokenPayload = {
  userId: 1,
  email: 'test@mcaslife.no',
  role: 'patient',
  type: 'access',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
};

export const mockRefreshTokenPayload = {
  userId: 1,
  type: 'refresh',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
};

// Error scenarios for testing
export const testErrorScenarios = {
  duplicateEmail: new Error('User with this email already exists'),
  duplicateUsername: new Error('Username is already taken'),
  invalidPassword: new Error('Invalid email or password'),
  accountSuspended: new Error('Account is suspended or deactivated'),
  userNotFound: new Error('User not found'),
  invalidToken: new Error('Invalid or expired token'),
  weakPassword: new Error('Password must contain at least one lowercase letter, one uppercase letter, and one number')
};