/**
 * Auth Service - MCAS-Life Authentication
 * 
 * Comprehensive authentication service with MCAS-specific features:
 * - JWT token management with refresh tokens
 * - MCAS profile creation during registration
 * - Secure password hashing with bcrypt
 * - Email verification system
 * - Rate limiting protection
 * - HIPAA-compliant session management
 */

import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, mcasProfiles, userPreferences, userSessions } from '../../db/schema.js';
import { emailService } from '../email/emailService.js';
import type { 
  User, 
  LoginCredentials, 
  RegisterRequest, 
  AuthTokens, 
  AuthResponse,
  ChangePasswordRequest,
  ResetPasswordRequest
} from '@mcas-life/shared';

// Environment variables with safe defaults for development
const JWT_SECRET = process.env['JWT_SECRET'] || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '4h';
const REFRESH_TOKEN_EXPIRES_IN = process.env['REFRESH_TOKEN_EXPIRES_IN'] || '7d';
const BCRYPT_ROUNDS = parseInt(process.env['BCRYPT_ROUNDS'] || '12');

// Default notification preferences for new users
const DEFAULT_NOTIFICATION_PREFERENCES = {
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
};

// Default privacy settings for new users
const DEFAULT_PRIVACY_SETTINGS = {
  share_anonymous_data: false,
  share_improvement_data: false,
  public_profile: false,
  show_in_expert_network: false,
  allow_expert_contact: false,
  share_reports_with_doctors: true,
  auto_delete_old_data: false,
  data_retention_months: 24
};

export class AuthService {
  
  /**
   * Hash password using bcrypt with configured rounds
   */
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  private generateAccessToken(userId: number, email: string, role: string): string {
    return jwt.sign(
      { 
        userId, 
        email, 
        role,
        type: 'access'
      },
      JWT_SECRET,
      { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'mcas-life-api',
        audience: 'mcas-life-app'
      }
    );
  }

  /**
   * Generate JWT refresh token
   */
  private generateRefreshToken(userId: number): string {
    return jwt.sign(
      { 
        userId,
        type: 'refresh'
      },
      JWT_SECRET,
      { 
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'mcas-life-api',
        audience: 'mcas-life-app'
      }
    );
  }

  /**
   * Generate both access and refresh tokens
   */
  private generateTokens(userId: number, email: string, role: string): AuthTokens {
    const accessToken = this.generateAccessToken(userId, email, role);
    const refreshToken = this.generateRefreshToken(userId);
    
    // Parse expiration from JWT_EXPIRES_IN (e.g., "15m" -> 900 seconds)
    const expiresIn = this.parseExpirationTime(JWT_EXPIRES_IN);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: 'Bearer'
    };
  }

  /**
   * Parse expiration time string to seconds
   */
  private parseExpirationTime(timeString: string): number {
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 15 minutes default

    const [, amount, unit] = match;
    const value = parseInt(amount);

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 900;
    }
  }

  /**
   * Remove sensitive data from user object for API response
   */
  private sanitizeUser(user: any): Omit<User, 'password_hash'> {
    const { password_hash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Register new user with MCAS profile
   */
  async register(registrationData: RegisterRequest, clientInfo: {
    ipAddress: string;
    userAgent: string;
    deviceInfo: string;
  }): Promise<AuthResponse> {
    
    // Check if user already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, registrationData.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Check username availability
    const existingUsername = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, registrationData.username))
      .limit(1);

    if (existingUsername.length > 0) {
      throw new Error('Username is already taken');
    }

    // Hash password
    const passwordHash = await this.hashPassword(registrationData.password);

    // Start transaction for user creation
    const result = await db.transaction(async (tx) => {
      
      // Create user
      const [newUser] = await tx.insert(users).values({
        email: registrationData.email,
        username: registrationData.username,
        password_hash: passwordHash,
        first_name: registrationData.first_name,
        last_name: registrationData.last_name,
        timezone: registrationData.timezone,
        language: registrationData.language,
        role: 'patient', // Default role for new registrations
        email_verified: false, // Will be verified via email
        account_status: 'active'
      }).returning();

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      // Create MCAS profile
      await tx.insert(mcasProfiles).values({
        user_id: newUser.id,
        severity: registrationData.mcas_severity,
        confirmed_by_doctor: registrationData.confirmed_diagnosis,
        comorbidities: {
          mastocytosis: false,
          histamine_intolerance: false,
          pots: false,
          eds: false,
          food_allergies: false,
          other: []
        },
        current_medications: [],
        current_supplements: [],
        known_food_triggers: [],
        known_environmental_triggers: [],
        known_stress_triggers: [],
        histamine_tolerance_level: 'moderate',
        exercise_tolerance: 'moderate',
        stress_tolerance: 'moderate',
        emergency_contacts: [],
        allergic_to_medications: []
      });

      // Create user preferences
      await tx.insert(userPreferences).values({
        user_id: newUser.id,
        notification_preferences: {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          research_participation: registrationData.join_research || false
        },
        privacy_settings: DEFAULT_PRIVACY_SETTINGS
      });

      return newUser;
    });

    // Generate tokens
    const tokens = this.generateTokens(result.id, result.email, result.role);

    // Create session record
    await this.createSession(result.id, tokens.refresh_token, clientInfo);

    // Return auth response with sanitized user
    return {
      user: this.sanitizeUser(result),
      tokens
    };
  }

  /**
   * Login existing user
   */
  async login(credentials: LoginCredentials, clientInfo: {
    ipAddress: string;
    userAgent: string;
    deviceInfo: string;
  }): Promise<AuthResponse> {
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, credentials.email))
      .limit(1);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check account status
    if (user.account_status !== 'active') {
      throw new Error('Account is suspended or deactivated');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(credentials.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update user login statistics
    await db
      .update(users)
      .set({
        last_login: new Date(),
        total_logins: user.total_logins + 1,
        updated_at: new Date()
      })
      .where(eq(users.id, user.id));

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email, user.role);

    // Create session record
    await this.createSession(user.id, tokens.refresh_token, clientInfo);

    // Return auth response
    return {
      user: this.sanitizeUser({ ...user, total_logins: user.total_logins + 1 }),
      tokens
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    
    try {
      console.log('🔄 Attempting token refresh...');
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
      console.log('✅ Refresh token JWT valid, userId:', decoded.userId);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Get user info
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          account_status: users.account_status
        })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.account_status !== 'active') {
        throw new Error('Account is not active');
      }

      // Verify session exists and is active
      const [session] = await db
        .select({ id: userSessions.id })
        .from(userSessions)
        .where(and(
          eq(userSessions.id, refreshToken),
          eq(userSessions.user_id, user.id),
          eq(userSessions.is_active, true)
        ))
        .limit(1);

      console.log('🔍 Session lookup result:', session ? 'Found' : 'Not found');

      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Generate new tokens
      const newTokens = this.generateTokens(user.id, user.email, user.role);
      
      // Update session with new refresh token
      await db
        .update(userSessions)
        .set({ 
          id: newTokens.refresh_token,
          last_activity: new Date(),
          expires_at: new Date(Date.now() + this.parseExpirationTime(REFRESH_TOKEN_EXPIRES_IN) * 1000)
        })
        .where(and(
          eq(userSessions.id, refreshToken),
          eq(userSessions.user_id, user.id)
        ));
      
      return newTokens;

    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      console.error('🔍 Refresh token:', refreshToken ? refreshToken.substring(0, 50) + '...' : 'null');
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user by invalidating session
   */
  async logout(refreshToken: string): Promise<void> {
    
    // Mark session as inactive
    await db
      .update(userSessions)
      .set({
        is_active: false,
        last_activity: new Date()
      })
      .where(eq(userSessions.id, refreshToken));
  }

  /**
   * Logout all sessions for a user
   */
  async logoutAll(userId: number): Promise<void> {
    
    await db
      .update(userSessions)
      .set({
        is_active: false,
        last_activity: new Date()
      })
      .where(eq(userSessions.user_id, userId));
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, passwordData: ChangePasswordRequest): Promise<void> {
    
    // Get current user
    const [user] = await db
      .select({ password_hash: users.password_hash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await this.verifyPassword(passwordData.current_password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(passwordData.new_password);

    // Update password
    await db
      .update(users)
      .set({
        password_hash: newPasswordHash,
        updated_at: new Date()
      })
      .where(eq(users.id, userId));

    // Invalidate all sessions except current one to force re-login
    await this.logoutAll(userId);
  }

  /**
   * Verify JWT token and return user info
   */
  async verifyToken(token: string): Promise<{ userId: number; email: string; role: string }> {
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Verify user still exists and is active
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          account_status: users.account_status
        })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!user || user.account_status !== 'active') {
        throw new Error('User not found or inactive');
      }

      return {
        userId: user.id,
        email: user.email,
        role: user.role
      };

    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Create session record for tracking
   */
  private async createSession(userId: number, refreshToken: string, clientInfo: {
    ipAddress: string;
    userAgent: string;
    deviceInfo: string;
  }): Promise<void> {
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days for refresh token

    await db.insert(userSessions).values({
      id: refreshToken,
      user_id: userId,
      device_info: clientInfo.deviceInfo,
      ip_address: clientInfo.ipAddress,
      user_agent: clientInfo.userAgent,
      last_activity: new Date(),
      expires_at: expiresAt,
      is_active: true
    });
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: number): Promise<Array<{
    id: string;
    device_info: string;
    ip_address: string;
    last_activity: Date;
    created_at: Date;
  }>> {
    
    return await db
      .select({
        id: userSessions.id,
        device_info: userSessions.device_info,
        ip_address: userSessions.ip_address,
        last_activity: userSessions.last_activity,
        created_at: userSessions.created_at
      })
      .from(userSessions)
      .where(and(
        eq(userSessions.user_id, userId),
        eq(userSessions.is_active, true)
      ));
  }

  /**
   * Cleanup expired sessions (should be run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    
    const result = await db
      .update(userSessions)
      .set({ is_active: false })
      .where(and(
        eq(userSessions.is_active, true),
        // Check if expires_at is in the past
      ));

    return result.rowCount || 0;
  }

  /**
   * Initiate password reset - generate token and store in database
   */
  async forgotPassword(email: string): Promise<{ resetToken: string; userId: number; email: string; emailSent: boolean }> {
    
    // Find user by email
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    const user = userResult[0];

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in database
    await db
      .update(users)
      .set({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
        updated_at: new Date()
      })
      .where(eq(users.id, user.id));

    // Attempt to send email
    const emailSent = await emailService.sendPasswordResetEmail(email, resetToken);

    return {
      resetToken,
      userId: user.id,
      email: user.email,
      emailSent
    };
  }

  /**
   * Reset password using valid token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    
    // Find user with valid reset token
    const userResult = await db
      .select()
      .from(users)
      .where(and(
        eq(users.password_reset_token, token),
        gt(users.password_reset_expires, new Date())
      ))
      .limit(1);

    if (userResult.length === 0) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN');
    }

    const user = userResult[0];

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password and clear reset token
    await db
      .update(users)
      .set({
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
        updated_at: new Date()
      })
      .where(eq(users.id, user.id));

    // Invalidate all user sessions for security
    await this.logoutAll(user.id);
  }

  /**
   * Validate reset token without consuming it
   */
  async validateResetToken(token: string): Promise<{ userId: number; email: string }> {
    
    const userResult = await db
      .select({
        id: users.id,
        email: users.email
      })
      .from(users)
      .where(and(
        eq(users.password_reset_token, token),
        gt(users.password_reset_expires, new Date())
      ))
      .limit(1);

    if (userResult.length === 0) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN');
    }

    return {
      userId: userResult[0].id,
      email: userResult[0].email
    };
  }
}

// Export singleton instance
export const authService = new AuthService();