/**
 * Admin Service - MCAS-Life User Management
 *
 * Admin-only service for managing users and assigning roles.
 * Provides functionality for alpha testing user setup.
 */

import * as bcrypt from 'bcrypt';
import crypto from 'crypto';
import { eq, desc, sql, and, or, like, ilike } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, mcasProfiles, userPreferences, userSessions } from '../../db/schema.js';

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

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: 'patient' | 'expert' | 'researcher' | 'admin';
}

export interface UpdateUserRoleRequest {
  role: 'patient' | 'expert' | 'researcher' | 'admin';
}

export interface UserListItem {
  id: number;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  account_status: string;
  email_verified: boolean;
  created_at: Date;
  last_login: Date | null;
  total_logins: number;
}

export class AdminService {

  /**
   * Get all users with pagination and filtering
   */
  async listUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{ users: UserListItem[]; total: number; page: number; limit: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (params?.search) {
      conditions.push(
        or(
          ilike(users.email, `%${params.search}%`),
          ilike(users.username, `%${params.search}%`),
          ilike(users.first_name, `%${params.search}%`),
          ilike(users.last_name, `%${params.search}%`)
        )
      );
    }

    if (params?.role) {
      conditions.push(eq(users.role, params.role as any));
    }

    if (params?.status) {
      conditions.push(eq(users.account_status, params.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    // Get paginated users
    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        first_name: users.first_name,
        last_name: users.last_name,
        role: users.role,
        account_status: users.account_status,
        email_verified: users.email_verified,
        created_at: users.created_at,
        last_login: users.last_login,
        total_logins: users.total_logins
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.created_at))
      .limit(limit)
      .offset(offset);

    return {
      users: userList,
      total,
      page,
      limit
    };
  }

  /**
   * Get single user by ID with full details
   */
  async getUserById(userId: number): Promise<any> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Get MCAS profile if exists
    const mcasProfile = await db
      .select()
      .from(mcasProfiles)
      .where(eq(mcasProfiles.user_id, userId))
      .limit(1);

    // Get preferences if exists
    const preferences = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.user_id, userId))
      .limit(1);

    // Get active sessions count
    const sessionCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userSessions)
      .where(eq(userSessions.user_id, userId));

    return {
      ...user[0],
      password_hash: undefined, // Don't return password hash
      mcas_profile: mcasProfile[0] || null,
      preferences: preferences[0] || null,
      active_sessions: sessionCount[0]?.count || 0
    };
  }

  /**
   * Create new user (admin only)
   */
  async createUser(data: CreateUserRequest): Promise<{ id: number; email: string; username: string; role: string }> {
    // Check if email already exists
    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);

    if (existingEmail.length > 0) {
      throw new Error('Email already exists');
    }

    // Check if username already exists
    const existingUsername = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, data.username))
      .limit(1);

    if (existingUsername.length > 0) {
      throw new Error('Username already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        username: data.username,
        password_hash,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        role: data.role || 'patient',
        email_verified: false, // Admin can verify later if needed
        account_status: 'active',
        onboarding_completed: false
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role
      });

    const userId = newUser[0].id;

    // Create MCAS profile
    await db.insert(mcasProfiles).values({
      user_id: userId,
      severity: 'unknown',
      confirmed_by_doctor: false
    });

    // Create user preferences
    await db.insert(userPreferences).values({
      user_id: userId,
      notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      privacy_settings: DEFAULT_PRIVACY_SETTINGS
    });

    return newUser[0];
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: number, newRole: 'patient' | 'expert' | 'researcher' | 'admin'): Promise<void> {
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found');
    }

    await db
      .update(users)
      .set({
        role: newRole,
        updated_at: new Date()
      })
      .where(eq(users.id, userId));
  }

  /**
   * Update user account status (suspend/activate/delete)
   */
  async updateAccountStatus(
    userId: number,
    status: 'active' | 'suspended' | 'deleted'
  ): Promise<void> {
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found');
    }

    await db
      .update(users)
      .set({
        account_status: status,
        updated_at: new Date()
      })
      .where(eq(users.id, userId));

    // If deleting, also invalidate all sessions
    if (status === 'deleted') {
      await db
        .delete(userSessions)
        .where(eq(userSessions.user_id, userId));
    }
  }

  /**
   * Verify user email (admin can manually verify)
   */
  async verifyUserEmail(userId: number): Promise<void> {
    await db
      .update(users)
      .set({
        email_verified: true,
        updated_at: new Date()
      })
      .where(eq(users.id, userId));
  }

  /**
   * Reset user password (admin can reset without old password)
   */
  async resetUserPassword(userId: number, newPassword: string): Promise<void> {
    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await db
      .update(users)
      .set({
        password_hash,
        updated_at: new Date()
      })
      .where(eq(users.id, userId));

    // Invalidate all existing sessions
    await db
      .delete(userSessions)
      .where(eq(userSessions.user_id, userId));
  }

  /**
   * Delete user permanently (admin only)
   */
  async deleteUser(userId: number): Promise<void> {
    // Cascade delete will handle mcas_profiles, user_preferences, user_sessions
    await db
      .delete(users)
      .where(eq(users.id, userId));
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    byRole: Record<string, number>;
    recentSignups: number;
  }> {
    // Total users
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    // Active users
    const activeResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.account_status, 'active'));

    // Suspended users
    const suspendedResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.account_status, 'suspended'));

    // Users by role
    const roleResults = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)::int`
      })
      .from(users)
      .groupBy(users.role);

    const byRole: Record<string, number> = {};
    roleResults.forEach(r => {
      byRole[r.role] = r.count;
    });

    // Recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.created_at} >= ${sevenDaysAgo}`);

    return {
      total: totalResult[0]?.count || 0,
      active: activeResult[0]?.count || 0,
      suspended: suspendedResult[0]?.count || 0,
      byRole,
      recentSignups: recentResult[0]?.count || 0
    };
  }
}

export const adminService = new AdminService();
