/**
 * Auth Service Unit Tests - Simplified for Vitest
 * 
 * Testing core authentication functionality
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../services/auth/authService.js';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.BCRYPT_ROUNDS = '4';

// Mock the database
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn()
};

// Mock bcrypt
const mockBcrypt = {
  hash: vi.fn(),
  compare: vi.fn()
};

// Mock jwt
const mockJwt = {
  sign: vi.fn(),
  verify: vi.fn()
};

// Mock the modules
vi.mock('../../db/index.js', () => ({
  db: mockDb
}));

vi.mock('bcrypt', () => mockBcrypt);
vi.mock('jsonwebtoken', () => mockJwt);

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser = {
    id: 1,
    email: 'test@mcaslife.no',
    username: 'testuser',
    password_hash: 'hashed_password',
    first_name: 'Test',
    last_name: 'User',
    role: 'patient',
    account_status: 'active',
    total_logins: 0
  };

  const mockRegistrationData = {
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

  const mockClientInfo = {
    ipAddress: '127.0.0.1',
    userAgent: 'Test Browser',
    deviceInfo: 'Test Device'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();

    // Setup default mock implementations
    mockBcrypt.hash.mockResolvedValue('hashed_password');
    mockBcrypt.compare.mockResolvedValue(true);
    mockJwt.sign.mockReturnValue('mock_token');
    mockJwt.verify.mockReturnValue({
      userId: 1,
      email: 'test@mcaslife.no',
      role: 'patient',
      type: 'access'
    });
  });

  describe('Password Security', () => {
    test('should use proper bcrypt rounds for hashing', async () => {
      // Mock the database chain
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No existing user
          })
        })
      });

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockUser])
            })
          })
        });
      });

      await authService.register(mockRegistrationData, mockClientInfo);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('TestPass123!', 4);
    });

    test('should verify passwords correctly', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 1 })
        })
      });

      await authService.login({
        email: 'test@mcaslife.no',
        password: 'TestPass123!',
        remember_me: false
      }, mockClientInfo);

      expect(mockBcrypt.compare).toHaveBeenCalledWith('TestPass123!', 'hashed_password');
    });
  });

  describe('Token Generation', () => {
    test('should generate access and refresh tokens', () => {
      mockJwt.sign
        .mockReturnValueOnce('access_token_123')
        .mockReturnValueOnce('refresh_token_456');

      const result = authService['generateTokens'](1, 'test@test.com', 'patient');

      expect(result).toEqual({
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_456',
        expires_in: 900, // 15 minutes in seconds
        token_type: 'Bearer'
      });

      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
    });

    test('should create tokens with correct payload structure', () => {
      authService['generateTokens'](1, 'test@test.com', 'patient');

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: 1,
          email: 'test@test.com',
          role: 'patient',
          type: 'access'
        },
        'test-secret-key',
        expect.objectContaining({
          expiresIn: '15m',
          issuer: 'mcas-life-api',
          audience: 'mcas-life-app'
        })
      );
    });
  });

  describe('Data Sanitization', () => {
    test('should remove password hash from user object', () => {
      const userWithPassword = {
        id: 1,
        email: 'test@test.com',
        password_hash: 'secret_hash',
        first_name: 'Test'
      };

      const sanitized = authService['sanitizeUser'](userWithPassword);

      expect(sanitized).not.toHaveProperty('password_hash');
      expect(sanitized).toHaveProperty('email', 'test@test.com');
      expect(sanitized).toHaveProperty('first_name', 'Test');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for duplicate email registration', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1 }]) // Existing user
          })
        })
      });

      await expect(
        authService.register(mockRegistrationData, mockClientInfo)
      ).rejects.toThrow('User with this email already exists');
    });

    test('should throw error for invalid login credentials', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No user found
          })
        })
      });

      await expect(
        authService.login({
          email: 'invalid@test.com',
          password: 'wrongpass',
          remember_me: false
        }, mockClientInfo)
      ).rejects.toThrow('Invalid email or password');
    });

    test('should throw error for suspended account login', async () => {
      const suspendedUser = { ...mockUser, account_status: 'suspended' };
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([suspendedUser])
          })
        })
      });

      await expect(
        authService.login({
          email: 'suspended@test.com',
          password: 'password',
          remember_me: false
        }, mockClientInfo)
      ).rejects.toThrow('Account is suspended or deactivated');
    });
  });

  describe('Time Parsing', () => {
    test('should parse expiration time strings correctly', () => {
      expect(authService['parseExpirationTime']('15m')).toBe(900);
      expect(authService['parseExpirationTime']('1h')).toBe(3600);
      expect(authService['parseExpirationTime']('7d')).toBe(604800);
      expect(authService['parseExpirationTime']('30s')).toBe(30);
      expect(authService['parseExpirationTime']('invalid')).toBe(900); // default
    });
  });
});