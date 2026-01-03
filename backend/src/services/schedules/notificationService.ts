/**
 * Notification Service - Manages push notifications for scheduled reminders
 * Handles web push subscriptions and notification delivery
 */

import webpush from 'web-push';
import { db } from '../../db/index.js';
import {
  pushSubscriptions,
  scheduleNotifications,
  type PushSubscription as PushSubscriptionType,
  type NewPushSubscription,
  type ScheduleNotification,
  type NewScheduleNotification
} from '../../db/schema.js';
import { eq, and, lte, gte } from 'drizzle-orm';
import { scheduleService, type ScheduleInstance } from './scheduleService.js';

// VAPID keys configuration
// In production, these should be environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@mcas-life.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    scheduleId: number;
    instanceDate: string;
    instanceTime: string;
    scheduleType: string;
  };
}

class NotificationService {
  /**
   * Subscribe a user to push notifications
   */
  async subscribeToPush(userId: number, subscription: PushSubscriptionData): Promise<PushSubscriptionType> {
    // Check if subscription already exists
    const [existing] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.user_id, userId))
      .limit(1);

    if (existing) {
      // Update existing subscription
      const [updated] = await db
        .update(pushSubscriptions)
        .set({
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          is_active: true,
          updated_at: new Date()
        })
        .where(eq(pushSubscriptions.user_id, userId))
        .returning();

      return updated;
    } else {
      // Create new subscription
      const [newSub] = await db
        .insert(pushSubscriptions)
        .values({
          user_id: userId,
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          is_active: true
        })
        .returning();

      return newSub;
    }
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribeFromPush(userId: number): Promise<void> {
    await db
      .update(pushSubscriptions)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(pushSubscriptions.user_id, userId));
  }

  /**
   * Get user's push subscription
   */
  async getUserSubscription(userId: number): Promise<PushSubscriptionType | null> {
    const [subscription] = await db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.user_id, userId),
        eq(pushSubscriptions.is_active, true)
      ))
      .limit(1);

    return subscription || null;
  }

  /**
   * Schedule notifications for upcoming instances of a schedule
   */
  async scheduleNotifications(scheduleId: number, userId: number, daysAhead: number = 7): Promise<void> {
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + daysAhead);

    // Get instances for this schedule
    const instances = await scheduleService.generateInstances(scheduleId, userId, fromDate, toDate);

    // Check if user has push subscription
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      console.log(`User ${userId} has no active push subscription`);
      return;
    }

    // Create notification records for each instance
    for (const instance of instances) {
      const scheduledFor = new Date(`${instance.date}T${instance.time}:00`);

      // Check if notification already exists
      const [existing] = await db
        .select()
        .from(scheduleNotifications)
        .where(and(
          eq(scheduleNotifications.schedule_id, scheduleId),
          eq(scheduleNotifications.user_id, userId),
          eq(scheduleNotifications.scheduled_for, scheduledFor)
        ))
        .limit(1);

      if (!existing) {
        await db.insert(scheduleNotifications).values({
          schedule_id: scheduleId,
          user_id: userId,
          scheduled_for: scheduledFor,
          notification_type: 'reminder',
          status: 'pending'
        });
      }
    }
  }

  /**
   * Cancel all pending notifications for a schedule
   */
  async cancelScheduledNotifications(scheduleId: number): Promise<void> {
    await db
      .update(scheduleNotifications)
      .set({ status: 'dismissed' })
      .where(and(
        eq(scheduleNotifications.schedule_id, scheduleId),
        eq(scheduleNotifications.status, 'pending')
      ));
  }

  /**
   * Send a push notification for a specific notification record
   */
  async sendScheduleReminder(notificationId: number): Promise<void> {
    const [notification] = await db
      .select()
      .from(scheduleNotifications)
      .where(eq(scheduleNotifications.id, notificationId))
      .limit(1);

    if (!notification || notification.status !== 'pending') {
      return;
    }

    // Get user subscription
    const subscription = await this.getUserSubscription(notification.user_id);
    if (!subscription) {
      await db
        .update(scheduleNotifications)
        .set({ status: 'failed' })
        .where(eq(scheduleNotifications.id, notificationId));
      return;
    }

    // Get schedule details
    const schedule = await scheduleService.getSchedule(notification.schedule_id, notification.user_id);
    if (!schedule) {
      return;
    }

    // Build notification payload
    const payload = this.buildNotificationPayload(schedule, notification);

    // Send push notification
    const pushSubscriptionObject = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys_p256dh,
        auth: subscription.keys_auth
      }
    };

    try {
      await webpush.sendNotification(
        pushSubscriptionObject,
        JSON.stringify(payload)
      );

      // Mark as sent
      await db
        .update(scheduleNotifications)
        .set({
          status: 'sent',
          sent_at: new Date()
        })
        .where(eq(scheduleNotifications.id, notificationId));

      console.log(`Notification sent for schedule ${notification.schedule_id}`);
    } catch (error) {
      console.error('Failed to send push notification:', error);

      // Mark as failed
      await db
        .update(scheduleNotifications)
        .set({ status: 'failed' })
        .where(eq(scheduleNotifications.id, notificationId));

      // If subscription is invalid (410 Gone), deactivate it
      if (error.statusCode === 410) {
        await this.unsubscribeFromPush(notification.user_id);
      }
    }
  }

  /**
   * Process upcoming notifications (run every 5 minutes via cron)
   */
  async processUpcomingNotifications(): Promise<void> {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Get pending notifications scheduled in the next 5 minutes
    const notifications = await db
      .select()
      .from(scheduleNotifications)
      .where(and(
        eq(scheduleNotifications.status, 'pending'),
        lte(scheduleNotifications.scheduled_for, fiveMinutesFromNow),
        gte(scheduleNotifications.scheduled_for, now)
      ));

    console.log(`Processing ${notifications.length} upcoming notifications`);

    for (const notification of notifications) {
      await this.sendScheduleReminder(notification.id);
    }
  }

  /**
   * Check for missed schedules and send notifications (run hourly)
   */
  async checkMissedSchedules(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get notifications that should have been sent but weren't
    const missedNotifications = await db
      .select()
      .from(scheduleNotifications)
      .where(and(
        eq(scheduleNotifications.status, 'pending'),
        lte(scheduleNotifications.scheduled_for, oneHourAgo)
      ));

    console.log(`Found ${missedNotifications.length} missed notifications`);

    for (const notification of missedNotifications) {
      // Update notification type to 'missed'
      await db
        .update(scheduleNotifications)
        .set({ notification_type: 'missed' })
        .where(eq(scheduleNotifications.id, notification.id));

      // Send notification
      await this.sendScheduleReminder(notification.id);
    }
  }

  /**
   * Build notification payload based on schedule type
   */
  private buildNotificationPayload(schedule: any, notification: ScheduleNotification): NotificationPayload {
    let title = '';
    let body = '';

    const instanceDate = notification.scheduled_for.toISOString().split('T')[0];
    const instanceTime = notification.scheduled_for.toTimeString().substring(0, 5);

    switch (schedule.schedule_type) {
      case 'medication':
        const medName = schedule.medication_custom_name ||
          `Medisin #${schedule.medication_catalog_id}`;
        title = `Tid for ${medName}`;
        body = schedule.dosage
          ? `${schedule.dosage} ${schedule.dosage_unit || ''}`
          : 'Husk å ta medisinen din';
        break;

      case 'meal':
        const mealTypeMap = {
          breakfast: 'Frokost',
          lunch: 'Lunsj',
          dinner: 'Middag',
          snack: 'Mellommåltid',
          other: 'Måltid'
        };
        title = `Tid for ${mealTypeMap[schedule.meal_type] || 'måltid'}`;
        body = schedule.notes || 'Husk å registrere måltidet ditt';
        break;

      case 'activity':
        const activityTypeMap = {
          temperature_change: 'Temperaturendring',
          social_trigger: 'Sosial trigger',
          physical_activity: 'Fysisk aktivitet'
        };
        title = `Tid for ${activityTypeMap[schedule.activity_type] || 'aktivitet'}`;
        body = schedule.notes || 'Husk å registrere aktiviteten din';
        break;

      default:
        title = 'Påminnelse';
        body = 'Du har en planlagt aktivitet';
    }

    // Add "missed" indicator if this is a missed notification
    if (notification.notification_type === 'missed') {
      title = `Glemt: ${title}`;
    }

    return {
      title,
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        scheduleId: schedule.id,
        instanceDate,
        instanceTime,
        scheduleType: schedule.schedule_type
      }
    };
  }

  /**
   * Generate VAPID keys (run once during setup)
   * This is a utility method, not typically used in production
   */
  static generateVapidKeys(): { publicKey: string; privateKey: string } {
    const vapidKeys = webpush.generateVAPIDKeys();
    return {
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey
    };
  }
}

export const notificationService = new NotificationService();
