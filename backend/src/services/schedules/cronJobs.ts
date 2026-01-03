/**
 * Cron Jobs for Schedule Notifications
 * Runs periodic tasks for processing notifications
 */

import cron from 'node-cron';
import { notificationService } from './notificationService.js';

export function initializeScheduleCronJobs() {
  console.log('🕐 Initializing schedule cron jobs...');

  // Process upcoming notifications every 5 minutes
  // Cron pattern: "*/5 * * * *" = every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Processing upcoming notifications...');
    try {
      await notificationService.processUpcomingNotifications();
    } catch (error) {
      console.error('[CRON] Error processing notifications:', error);
    }
  });

  // Check for missed schedules every hour
  // Cron pattern: "0 * * * *" = at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Checking for missed schedules...');
    try {
      await notificationService.checkMissedSchedules();
    } catch (error) {
      console.error('[CRON] Error checking missed schedules:', error);
    }
  });

  console.log('✅ Schedule cron jobs initialized');
  console.log('   - Notification processor: every 5 minutes');
  console.log('   - Missed schedule checker: every hour');
}
