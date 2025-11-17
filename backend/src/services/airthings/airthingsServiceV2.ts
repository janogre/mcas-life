/**
 * Airthings Service V2 - Client Credentials Flow
 *
 * Uses admin's Airthings API credentials to fetch indoor air quality data
 * for all users. All users see data from admin's Airthings devices.
 */

import axios from 'axios';
import { settingsService } from '../settings/settingsService.js';

const AIRTHINGS_API_BASE = 'https://ext-api.airthings.com/v1';
const AIRTHINGS_TOKEN_URL = 'https://accounts-api.airthings.com/v1/token';

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
  temperature?: number;
  humidity?: number;
  co2?: number;
  voc?: number;
  pm25?: number;
  radonShortTermAvg?: number;
  pressure?: number;
  time?: number;
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

class AirthingsServiceV2 {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  /**
   * Get access token using Client Credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get credentials from database
    const credentials = await settingsService.getAirthingsCredentials();

    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error('Airthings credentials not configured');
    }

    console.log('🔑 Fetching new Airthings access token...');

    try {
      const response = await axios.post(
        AIRTHINGS_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          scope: 'read:device:current_values',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry 5 minutes before actual expiry to be safe
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      console.log('✅ Airthings access token obtained');
      return this.accessToken;
    } catch (error: any) {
      console.error('❌ Failed to get Airthings access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Airthings API');
    }
  }

  /**
   * Get all devices
   */
  async getDevices(): Promise<AirthingsDevice[]> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get(`${AIRTHINGS_API_BASE}/devices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.devices || [];
    } catch (error: any) {
      console.error('Failed to fetch Airthings devices:', error.response?.data || error.message);
      throw new Error('Failed to fetch devices from Airthings');
    }
  }

  /**
   * Get latest sensor data for a specific device
   */
  async getDeviceSensorData(deviceId: string): Promise<AirthingsSensorData> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${AIRTHINGS_API_BASE}/devices/${deviceId}/latest-samples`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data.data || {};
    } catch (error: any) {
      console.error(`Failed to fetch data for device ${deviceId}:`, error.response?.data || error.message);
      throw new Error('Failed to fetch sensor data from Airthings');
    }
  }

  /**
   * Get current indoor air quality from the first available device
   * Returns data from the first device with recent measurements
   */
  async getCurrentIndoorAirQuality(): Promise<IndoorAirQualityData | null> {
    try {
      const devices = await this.getDevices();

      if (devices.length === 0) {
        console.log('No Airthings devices found');
        return null;
      }

      // Get data from first device
      const device = devices[0];
      const sensorData = await this.getDeviceSensorData(device.id);

      // Transform to our format
      const airQuality: IndoorAirQualityData = {
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        co2: sensorData.co2,
        voc: sensorData.voc,
        pm25: sensorData.pm25,
        radon_short_term: sensorData.radonShortTermAvg,
        pressure: sensorData.pressure,
        room_name: device.segment?.name || 'Unknown',
        measured_at: sensorData.time ? new Date(sensorData.time * 1000).toISOString() : undefined,
      };

      return airQuality;
    } catch (error) {
      console.error('Error fetching indoor air quality:', error);
      return null;
    }
  }

  /**
   * Get air quality from all devices
   */
  async getAllDevicesAirQuality(): Promise<Array<IndoorAirQualityData & { device_id: string }>> {
    try {
      const devices = await this.getDevices();
      const results: Array<IndoorAirQualityData & { device_id: string }> = [];

      for (const device of devices) {
        try {
          const sensorData = await this.getDeviceSensorData(device.id);

          results.push({
            device_id: device.id,
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            co2: sensorData.co2,
            voc: sensorData.voc,
            pm25: sensorData.pm25,
            radon_short_term: sensorData.radonShortTermAvg,
            pressure: sensorData.pressure,
            room_name: device.segment?.name || 'Unknown',
            measured_at: sensorData.time ? new Date(sensorData.time * 1000).toISOString() : undefined,
          });
        } catch (error) {
          console.error(`Failed to get data for device ${device.id}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching all devices air quality:', error);
      return [];
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
    let severityScore = 0;

    // CO2 levels
    if (data.co2 !== undefined) {
      if (data.co2 > 1500) {
        riskFactors.push('Svært høy CO2 (over 1500 ppm) - kan gi hodepine og tretthet');
        recommendations.push('Åpne vinduer eller øk ventilasjon umiddelbart');
        severityScore += 3;
      } else if (data.co2 > 1000) {
        riskFactors.push('Høy CO2 (over 1000 ppm) - redusert luftkvalitet');
        recommendations.push('Øk ventilasjon');
        severityScore += 2;
      }
    }

    // VOC levels
    if (data.voc !== undefined) {
      if (data.voc > 2000) {
        riskFactors.push('Svært høy VOC (over 2000 ppb) - potensielt trigger for MCAS');
        recommendations.push('Fjern kilder til kjemikalier/parfyme, øk ventilasjon');
        severityScore += 3;
      } else if (data.voc > 500) {
        riskFactors.push('Forhøyet VOC (over 500 ppb)');
        recommendations.push('Sjekk for kilder til VOC (rengjøringsmidler, parfyme)');
        severityScore += 2;
      }
    }

    // PM2.5 levels
    if (data.pm25 !== undefined) {
      if (data.pm25 > 35) {
        riskFactors.push('Svært høy PM2.5 (over 35 μg/m³) - kan trigger luftveissymptomer');
        recommendations.push('Bruk luftrenser, unngå utendørs aktivitet');
        severityScore += 3;
      } else if (data.pm25 > 12) {
        riskFactors.push('Forhøyet PM2.5 (over 12 μg/m³)');
        recommendations.push('Vurder luftrenser');
        severityScore += 2;
      }
    }

    // Humidity
    if (data.humidity !== undefined) {
      if (data.humidity > 60) {
        riskFactors.push('Høy luftfuktighet (over 60%) - øker muggrisiko');
        recommendations.push('Reduser luftfuktighet med avfukter');
        severityScore += 1;
      } else if (data.humidity < 30) {
        riskFactors.push('Lav luftfuktighet (under 30%) - kan irritere slimhinner');
        recommendations.push('Øk luftfuktighet');
        severityScore += 1;
      }
    }

    // Radon
    if (data.radon_short_term !== undefined && data.radon_short_term > 100) {
      riskFactors.push('Forhøyet radon (over 100 Bq/m³)');
      recommendations.push('Vurder radontiltak på lang sikt');
      severityScore += 1;
    }

    // Determine severity
    let severity: 'low' | 'moderate' | 'high';
    if (severityScore >= 5) {
      severity = 'high';
    } else if (severityScore >= 2) {
      severity = 'moderate';
    } else {
      severity = 'low';
    }

    if (riskFactors.length === 0) {
      riskFactors.push('Ingen kritiske risikofaktorer');
      recommendations.push('Oppretthold god ventilasjon');
    }

    return {
      risk_factors: riskFactors,
      severity,
      recommendations,
    };
  }
}

export const airthingsServiceV2 = new AirthingsServiceV2();
