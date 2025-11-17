/**
 * System Settings Service
 *
 * Manages application-wide configuration stored in database
 */

import { db } from '../../db/connection.js';
import { systemSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Encryption key - should be stored securely in production
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

class SettingsService {
  /**
   * Encrypt a value
   */
  private encrypt(text: string): string {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a value
   */
  private decrypt(text: string): string {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Get a setting value
   */
  async getSetting(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.setting_key, key))
      .limit(1);

    if (!setting || !setting.setting_value) {
      return null;
    }

    // Decrypt if encrypted
    if (setting.encrypted) {
      try {
        return this.decrypt(setting.setting_value);
      } catch (error) {
        console.error('Error decrypting setting:', key, error);
        return null;
      }
    }

    return setting.setting_value;
  }

  /**
   * Set a setting value
   */
  async setSetting(
    key: string,
    value: string,
    userId?: number,
    encrypted: boolean = false
  ): Promise<void> {
    const settingValue = encrypted ? this.encrypt(value) : value;

    // Check if setting exists
    const [existing] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.setting_key, key))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(systemSettings)
        .set({
          setting_value: settingValue,
          encrypted,
          updated_by: userId,
          updated_at: new Date(),
        })
        .where(eq(systemSettings.setting_key, key));
    } else {
      // Insert new
      await db.insert(systemSettings).values({
        setting_key: key,
        setting_value: settingValue,
        encrypted,
        updated_by: userId,
      });
    }
  }

  /**
   * Get all settings (for admin UI)
   */
  async getAllSettings(): Promise<
    Array<{
      key: string;
      value: string | null;
      encrypted: boolean;
      description: string | null;
      updated_at: Date;
    }>
  > {
    const settings = await db.select().from(systemSettings);

    return settings.map((setting) => ({
      key: setting.setting_key,
      value: setting.encrypted && setting.setting_value ? '***ENCRYPTED***' : setting.setting_value,
      encrypted: setting.encrypted,
      description: setting.description,
      updated_at: setting.updated_at,
    }));
  }

  /**
   * Get Airthings credentials
   */
  async getAirthingsCredentials(): Promise<{
    clientId: string | null;
    clientSecret: string | null;
    redirectUri: string | null;
  }> {
    const [clientId, clientSecret, redirectUri] = await Promise.all([
      this.getSetting('airthings_client_id'),
      this.getSetting('airthings_client_secret'),
      this.getSetting('airthings_redirect_uri'),
    ]);

    return {
      clientId,
      clientSecret,
      redirectUri: redirectUri || 'http://localhost:3000/callback',
    };
  }

  /**
   * Save Airthings credentials
   */
  async saveAirthingsCredentials(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    userId: number
  ): Promise<void> {
    await Promise.all([
      this.setSetting('airthings_client_id', clientId, userId, false),
      this.setSetting('airthings_client_secret', clientSecret, userId, true),
      this.setSetting('airthings_redirect_uri', redirectUri, userId, false),
    ]);
  }
}

export const settingsService = new SettingsService();
