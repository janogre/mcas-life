/**
 * Auth Service Unit Tests
 * 
 * Comprehensive testing of authentication functionality
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth/authService.js';
import {
  mockUser,
  mockRegistrationData,
  mockLoginCredentials,
  mockClientInfo,
  mockDb,
  resetMocks,
  testErrorScenarios,
  mockTokenPayload
} from './testHelpers.js';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn()
  }
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn()
  }
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    resetMocks();
    authService = new AuthService();
    
    // Setup default mock implementations
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password');
    vi.mocked(bcrypt.compare).mockResolvedValue(true);
    vi.mocked(jwt.sign).mockReturnValue('mock_token');
    vi.mocked(jwt.verify).mockReturnValue(mockTokenPayload);
  });

  describe('User Registration', () => {
    test('should successfully register a new user with MCAS profile', async () => {
      // Mock database responses for successful registration
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No existing user
          })
        })
      });

      const result = await authService.register(mockRegistrationData, mockClientInfo);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.tokens).toHaveProperty('access_token');
      expect(result.tokens).toHaveProperty('refresh_token');
      expect(result.tokens.token_type).toBe('Bearer');
    });

    test('should reject registration with duplicate email', async () => {
      // Mock existing user found
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

    test('should reject registration with duplicate username', async () => {
      // Mock: email check passes, username check fails
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]) // No user with email
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 2 }]) // User with username exists
            })
          })
        });

      await expect(
        authService.register(mockRegistrationData, mockClientInfo)
      ).rejects.toThrow('Username is already taken');
    });

    test('should hash password with correct bcrypt rounds', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      await authService.register(mockRegistrationData, mockClientInfo);

      expect(bcrypt.hash).toHaveBeenCalledWith(mockRegistrationData.password, 12);
    });
  });

  describe('User Login', () => {
    test('should successfully login with valid credentials', async () => {
      // Mock user found in database
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser])
          })
        })
      });

      const result = await authService.login(mockLoginCredentials, mockClientInfo);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(mockUser.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockLoginCredentials.password,
        mockUser.password_hash
      );
    });

    test('should reject login with invalid email', async () => {
      // Mock no user found
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      await expect(
        authService.login(mockLoginCredentials, mockClientInfo)
      ).rejects.toThrow('Invalid email or password');
    });

    test('should reject login with invalid password', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser])
          })
        })
      });

      (bcrypt.compare as vi.MockedFunction<typeof bcrypt.compare>).mockResolvedValue(false);

      await expect(
        authService.login(mockLoginCredentials, mockClientInfo)
      ).rejects.toThrow('Invalid email or password');
    });

    test('should reject login for suspended account', async () => {
      const suspendedUser = { ...mockUser, account_status: 'suspended' };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([suspendedUser])
          })
        })
      });

      await expect(
        authService.login(mockLoginCredentials, mockClientInfo)
      ).rejects.toThrow('Account is suspended or deactivated');
    });

    test('should update login statistics on successful login', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser])
          })
        })
      });

      await authService.login(mockLoginCredentials, mockClientInfo);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    test('should generate valid access and refresh tokens', async () => {
      const tokens = await authService['generateTokens'](1, 'test@example.com', 'patient');

      expect(tokens).toHaveProperty('access_token');
      expect(tokens).toHaveProperty('refresh_token');
      expect(tokens).toHaveProperty('expires_in');
      expect(tokens.token_type).toBe('Bearer');
      expect(jwt.sign).toHaveBeenCalledTimes(2); // Access + refresh token
    });

    test('should successfully refresh valid token', async () => {
      const refreshToken = 'valid_refresh_token';
      
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: refreshToken }])
            })
          })
        });

      const result = await authService.refreshToken(refreshToken);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(jwt.verify).toHaveBeenCalledWith(refreshToken, expect.any(String));
    });

    test('should reject invalid refresh token', async () => {
      (jwt.verify as vi.MockedFunction<typeof jwt.verify>).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        authService.refreshToken('invalid_token')
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    test('should verify valid access token', async () => {
      const accessToken = 'valid_access_token';
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser])
          })
        })
      });

      const result = await authService.verifyToken(accessToken);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
      expect(result.userId).toBe(mockTokenPayload.userId);
    });

    test('should reject token with wrong type', async () => {
      const wrongTypePayload = { ...mockTokenPayload, type: 'refresh' };
      (jwt.verify as vi.MockedFunction<typeof jwt.verify>).mockReturnValue(wrongTypePayload);

      await expect(
        authService.verifyToken('access_token')
      ).rejects.toThrow('Invalid token type');
    });
  });

  describe('Password Management', () => {
    test('should successfully change password', async () => {
      const userId = 1;
      const passwordData = {
        current_password: 'oldpass123',
        new_password: 'NewPass123!'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ password_hash: 'old_hash' }])
          })
        })
      });

      await authService.changePassword(userId, passwordData);

      expect(bcrypt.compare).toHaveBeenCalledWith('oldpass123', 'old_hash');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 12);
      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should reject password change with wrong current password', async () => {
      const userId = 1;
      const passwordData = {
        current_password: 'wrongpass',
        new_password: 'NewPass123!'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ password_hash: 'old_hash' }])
          })
        })
      });

      (bcrypt.compare as vi.MockedFunction<typeof bcrypt.compare>).mockResolvedValue(false);

      await expect(
        authService.changePassword(userId, passwordData)
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('Session Management', () => {
    test('should successfully logout user session', async () => {
      const refreshToken = 'user_refresh_token';

      await authService.logout(refreshToken);

      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should logout all user sessions', async () => {
      const userId = 1;

      await authService.logoutAll(userId);

      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should get user active sessions', async () => {
      const userId = 1;
      const mockSessions = [
        {
          id: 'session1',
          device_info: 'Chrome',
          ip_address: '127.0.0.1',
          last_activity: new Date(),
          created_at: new Date()
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockSessions)
        })
      });

      const sessions = await authService.getUserSessions(userId);

      expect(sessions).toEqual(mockSessions);
    });
  });
});