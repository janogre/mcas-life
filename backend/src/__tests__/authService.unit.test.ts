/**
 * Auth Service Unit Tests - Simplified for Vitest
 * 
 * Testing core authentication functionality
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../services/auth/authService.js';
import { mockDb } from '../__tests__/setup.js';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.BCRYPT_ROUNDS = '4';

// Note: Mocks are defined in setup.ts and automatically applied

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

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked modules
    const bcrypt = await import('bcrypt');
    const jwt = await import('jsonwebtoken');
    
    // Setup default mock implementations
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(jwt.sign).mockReturnValue('mock_token' as never);
    vi.mocked(jwt.verify).mockReturnValue({
      userId: 1,
      email: 'test@mcaslife.no',
      role: 'patient',
      type: 'access'
    } as never);
    
    authService = new AuthService();
  });

  describe('Password Security', () => {
    test('should use proper bcrypt rounds for hashing', async () => {
      const bcrypt = await import('bcrypt');
      
      // Mock database responses for successful registration
      const selectChain = mockDb.select();
      selectChain.from().where().limit.mockResolvedValue([]);
      
      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback) => {
        const txMock = {
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
          })
        };
        return await callback(txMock);
      });

      await authService.register(mockRegistrationData, mockClientInfo);

      expect(bcrypt.hash).toHaveBeenCalledWith('TestPass123!', 4);
    });

    test('should verify passwords correctly', async () => {
      const bcrypt = await import('bcrypt');
      
      // Mock database responses
      const selectChain = mockDb.select();
      selectChain.from().where().limit.mockResolvedValue([mockUser]);
      
      const updateChain = mockDb.update();
      updateChain.set().where.mockResolvedValue({ rowCount: 1 });
      
      const insertChain = mockDb.insert();
      insertChain.values.mockResolvedValue({ id: 'session-id' });

      await authService.login({
        email: 'test@mcaslife.no',
        password: 'TestPass123!',
        remember_me: false
      }, mockClientInfo);

      expect(bcrypt.compare).toHaveBeenCalledWith('TestPass123!', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKd3DYOe7g8QO8W');
    });
  });

  describe('Token Generation', () => {
    test('should generate access and refresh tokens', async () => {
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.sign)
        .mockReturnValueOnce('access_token_123' as never)
        .mockReturnValueOnce('refresh_token_456' as never);

      const result = authService['generateTokens'](1, 'test@test.com', 'patient');

      expect(result).toEqual({
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_456',
        expires_in: 900, // 15 minutes in seconds
        token_type: 'Bearer'
      });

      expect(jwt.sign).toHaveBeenCalledTimes(2);
    });

    test('should create tokens with correct payload structure', async () => {
      const jwt = await import('jsonwebtoken');
      
      authService['generateTokens'](1, 'test@test.com', 'patient');

      expect(jwt.sign).toHaveBeenCalledWith(
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