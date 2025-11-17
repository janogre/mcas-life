/**
 * Airthings Service for MCAS-Life
 *
 * Integrates with Airthings Consumer API to fetch indoor air quality data
 * for symptom correlation analysis.
 *
 * Indoor air quality factors affecting MCAS:
 * - CO2 levels (high CO2 can trigger symptoms)
 * - VOCs (Volatile Organic Compounds - chemicals that trigger reactions)
 * - PM2.5 (Particulate Matter - dust, allergens)
 * - Humidity (high humidity worsens symptoms)
 * - Radon (long-term health concern)
 * - Temperature (extreme temps trigger symptoms)
 */

import axios from 'axios';
import { db } from '../../db/connection.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { settingsService } from '../settings/settingsService.js';

// Airthings API endpoints
const AIRTHINGS_API_BASE = 'https://ext-api.airthings.com/v1';
const AIRTHINGS_ACCOUNTS_API = 'https://accounts-api.airthings.com';
const AIRTHINGS_TOKEN_URL = `${AIRTHINGS_ACCOUNTS_API}/v1/token`;

export interface AirthingsDevice {
  id: string;
  deviceType: string;
  sensors: string[];
  segment: {
    id: string;
    name: string; // Room name
  };
}

export interface AirthingsSensorData {
  temperature?: number; // Celsius
  humidity?: number; // Percentage
  co2?: number; // ppm
  voc?: number; // ppb
  pm25?: number; // μg/m³
  radonShortTermAvg?: number; // Bq/m³
  pressure?: number; // mbar
  mold?: number; // Mold risk index 0-10
  virusRisk?: number; // Virus risk index 0-10
  time?: number; // Unix timestamp
}

export interface AirthingsLatestSamples {
  [deviceId: string]: {
    data: AirthingsSensorData;
    roomName: string;
  };
}

export interface IndoorAirQualityData {
  temperature?: number;
  humidity?: number;
  co2?: number;
  voc?: number;
  pm25?: number;
  radon_short_term?: number;
  pressure?: number;
  room_name?: string;
  measured_at?: string;
}

class AirthingsService {
  /**
   * Exchange authorization code for access token
   */
  async exchangeAuthCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      const response = await axios.post(
        AIRTHINGS_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error exchanging Airthings auth code:', error);
      throw new Error('Failed to connect to Airthings');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      const response = await axios.post(
        AIRTHINGS_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error refreshing Airthings token:', error);
      throw new Error('Failed to refresh Airthings token');
    }
  }

  /**
   * Get list of user's Airthings devices
   */
  async getDevices(accessToken: string): Promise<AirthingsDevice[]> {
    try {
      const response = await axios.get(`${AIRTHINGS_API_BASE}/devices`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.devices || [];
    } catch (error) {
      console.error('Error fetching Airthings devices:', error);
      throw new Error('Failed to fetch Airthings devices');
    }
  }

  /**
   * Get latest sensor values for a device
   */
  async getDeviceLatestSamples(
    accessToken: string,
    deviceId: string
  ): Promise<AirthingsSensorData> {
    try {
      const response = await axios.get(
        `${AIRTHINGS_API_BASE}/devices/${deviceId}/latest-samples`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.data || {};
    } catch (error) {
      console.error(`Error fetching device ${deviceId} data:`, error);
      return {};
    }
  }

  /**
   * Get latest samples from all user's devices
   */
  async getAllDevicesLatestSamples(
    accessToken: string
  ): Promise<AirthingsLatestSamples> {
    const devices = await this.getDevices(accessToken);
    const samples: AirthingsLatestSamples = {};

    for (const device of devices) {
      const data = await this.getDeviceLatestSamples(accessToken, device.id);
      samples[device.id] = {
        data,
        roomName: device.segment?.name || 'Unknown Room',
      };
    }

    return samples;
  }

  /**
   * Get valid access token for user (refresh if needed)
   */
  async getValidAccessToken(userId: number): Promise<string | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (
      !user ||
      !user.airthings_connected ||
      !user.airthings_access_token ||
      !user.airthings_refresh_token
    ) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiresAt = user.airthings_token_expires_at;

    if (expiresAt && expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
      // Token is still valid
      return user.airthings_access_token;
    }

    // Token expired or about to expire, refresh it
    try {
      const credentials = await settingsService.getAirthingsCredentials();

      if (!credentials.clientId || !credentials.clientSecret) {
        console.error('Airthings credentials not configured in database');
        return null;
      }

      const tokenData = await this.refreshAccessToken(
        user.airthings_refresh_token,
        credentials.clientId,
        credentials.clientSecret
      );

      // Update user with new tokens
      const newExpiresAt = new Date(
        Date.now() + tokenData.expires_in * 1000
      );

      await db
        .update(users)
        .set({
          airthings_access_token: tokenData.access_token,
          airthings_refresh_token: tokenData.refresh_token,
          airthings_token_expires_at: newExpiresAt,
        })
        .where(eq(users.id, userId));

      return tokenData.access_token;
    } catch (error) {
      console.error('Failed to refresh Airthings token:', error);
      // Mark as disconnected
      await db
        .update(users)
        .set({ airthings_connected: false })
        .where(eq(users.id, userId));
      return null;
    }
  }

  /**
   * Get current indoor air quality data for user
   * Returns data from the most recently active device
   */
  async getCurrentIndoorAirQuality(
    userId: number
  ): Promise<IndoorAirQualityData | null> {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) {
      return null;
    }

    try {
      const allSamples = await this.getAllDevicesLatestSamples(accessToken);

      // Find the most recent sample across all devices
      let latestSample: {
        data: AirthingsSensorData;
        roomName: string;
      } | null = null;
      let latestTime = 0;

      for (const deviceId in allSamples) {
        const sample = allSamples[deviceId];
        const time = sample.data.time || 0;
        if (time > latestTime) {
          latestTime = time;
          latestSample = sample;
        }
      }

      if (!latestSample) {
        return null;
      }

      // Convert to our format
      const airQuality: IndoorAirQualityData = {
        temperature: latestSample.data.temperature,
        humidity: latestSample.data.humidity,
        co2: latestSample.data.co2,
        voc: latestSample.data.voc,
        pm25: latestSample.data.pm25,
        radon_short_term: latestSample.data.radonShortTermAvg,
        pressure: latestSample.data.pressure,
        room_name: latestSample.roomName,
        measured_at: latestSample.data.time
          ? new Date(latestSample.data.time * 1000).toISOString()
          : new Date().toISOString(),
      };

      return airQuality;
    } catch (error) {
      console.error('Error fetching indoor air quality:', error);
      return null;
    }
  }

  /**
   * Analyze indoor air quality impact on MCAS symptoms
   */
  analyzeIndoorAirQualityImpact(data: IndoorAirQualityData): {
    risk_factors: string[];
    severity: 'low' | 'moderate' | 'high';
    recommendations: string[];
  } {
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // CO2 levels
    if (data.co2 && data.co2 > 1000) {
      riskFactors.push(`Høyt CO2-nivå (${data.co2} ppm)`);
      recommendations.push('Ventiler rommet, åpne vinduer');
    }

    // VOC levels
    if (data.voc && data.voc > 500) {
      riskFactors.push(`Høye VOC-nivåer (${data.voc} ppb)`);
      recommendations.push(
        'Fjern kilder til kjemikalier, bruk luftrenser'
      );
    }

    // PM2.5 levels
    if (data.pm25 && data.pm25 > 25) {
      riskFactors.push(
        `Forhøyet PM2.5 partikler (${data.pm25.toFixed(1)} μg/m³)`
      );
      recommendations.push('Bruk luftrenser med HEPA-filter');
    }

    // High humidity
    if (data.humidity && data.humidity > 60) {
      riskFactors.push(`Høy luftfuktighet (${data.humidity}%)`);
      recommendations.push('Bruk avfukter, ventiler');
    } else if (data.humidity && data.humidity < 30) {
      riskFactors.push(`Lav luftfuktighet (${data.humidity}%)`);
      recommendations.push('Bruk luftfukter');
    }

    // Temperature extremes
    if (data.temperature) {
      if (data.temperature > 24) {
        riskFactors.push(`Høy temperatur (${data.temperature.toFixed(1)}°C)`);
        recommendations.push('Kjøl ned rommet');
      } else if (data.temperature < 18) {
        riskFactors.push(`Lav temperatur (${data.temperature.toFixed(1)}°C)`);
        recommendations.push('Varm opp rommet');
      }
    }

    // Determine severity
    let severity: 'low' | 'moderate' | 'high' = 'low';
    if (riskFactors.length >= 3) {
      severity = 'high';
    } else if (riskFactors.length >= 1) {
      severity = 'moderate';
    }

    return {
      risk_factors: riskFactors,
      severity,
      recommendations,
    };
  }
}

export const airthingsService = new AirthingsService();
