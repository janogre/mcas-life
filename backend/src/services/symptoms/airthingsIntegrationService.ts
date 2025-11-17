import { airthingsServiceV2 } from '../airthings/airthingsServiceV2.js';

/**
 * Airthings Integration Service for Symptom Registration
 *
 * Provides functionality to track room exposure and correlate indoor air quality
 * with symptom occurrences. Used in the symptom registration flow to automatically
 * capture environmental context.
 */

interface RoomExposure {
  room_id: string;
  room_name: string;
  time_spent_minutes?: number;
  air_quality?: {
    co2?: number;
    voc?: number;
    humidity?: number;
    temperature?: number;
    radon?: number;
    pm25?: number;
  };
}

interface AirQualitySnapshot {
  timestamp: Date;
  room_id: string;
  room_name: string;
  metrics: {
    co2?: number;
    voc?: number;
    humidity?: number;
    temperature?: number;
    radon?: number;
    pm25?: number;
    pressure?: number;
  };
}

export class AirthingsIntegrationService {
  /**
   * Get recent room exposure for a user based on Airthings data
   * Estimates time spent in each room based on sensor data activity
   *
   * @param userId - User ID (for future multi-user support)
   * @param hours - Number of hours to look back (default: 2)
   * @returns Array of rooms with estimated exposure time
   */
  async getRecentRoomExposure(userId: number, hours: number = 2): Promise<RoomExposure[]> {
    try {
      // Get all devices (rooms)
      const devices = await airthingsServiceV2.getDevices();

      if (!devices || devices.length === 0) {
        return [];
      }

      // Get current air quality for each room
      const roomExposures: RoomExposure[] = [];

      for (const device of devices) {
        try {
          // Get latest sensor data for this device
          const sensorData = await airthingsServiceV2.getDeviceSensorData(device.id);

          if (!sensorData) {
            continue;
          }

          roomExposures.push({
            room_id: device.id,
            room_name: device.segment?.name || device.deviceType || 'Unknown Room',
            // Time spent estimation would require historical tracking
            // For now, we just mark that the room was active during this period
            time_spent_minutes: undefined,
            air_quality: {
              co2: sensorData.co2,
              voc: sensorData.voc,
              humidity: sensorData.humidity,
              temperature: sensorData.temp,
              radon: sensorData.radonShortTermAvg,
              pm25: sensorData.pm25,
            },
          });
        } catch (error) {
          console.error(`Failed to get exposure data for device ${device.id}:`, error);
          // Continue with other rooms
        }
      }

      return roomExposures;
    } catch (error) {
      console.error('Error getting recent room exposure:', error);
      return [];
    }
  }

  /**
   * Get room air quality history for correlation analysis
   *
   * @param roomId - Device/room ID
   * @param hours - Number of hours to look back (default: 2)
   * @returns Historical air quality snapshots
   */
  async getRoomAirQualityHistory(roomId: string, hours: number = 2): Promise<AirQualitySnapshot[]> {
    try {
      // Note: Airthings API provides current data, not historical
      // For now, we return the current snapshot
      // Future enhancement: Store historical data in our database

      const sensorData = await airthingsServiceV2.getDeviceSensorData(roomId);
      const devices = await airthingsServiceV2.getDevices();
      const device = devices.find(d => d.id === roomId);

      if (!sensorData || !device) {
        return [];
      }

      return [{
        timestamp: new Date(),
        room_id: roomId,
        room_name: device.segment?.name || device.deviceType || 'Unknown Room',
        metrics: {
          co2: sensorData.co2,
          voc: sensorData.voc,
          humidity: sensorData.humidity,
          temperature: sensorData.temp,
          radon: sensorData.radonShortTermAvg,
          pm25: sensorData.pm25,
          pressure: sensorData.pressure,
        },
      }];
    } catch (error) {
      console.error(`Error getting air quality history for room ${roomId}:`, error);
      return [];
    }
  }

  /**
   * Get all available rooms (Airthings devices) for room selection
   * Used in symptom registration UI to let users select which rooms they've been in
   *
   * @returns Array of available rooms
   */
  async getAvailableRooms(): Promise<Array<{ id: string; name: string; type: string }>> {
    try {
      const devices = await airthingsServiceV2.getDevices();

      if (!devices || devices.length === 0) {
        return [];
      }

      return devices.map(device => ({
        id: device.id,
        name: device.segment?.name || device.deviceType || 'Unknown Room',
        type: device.deviceType,
      }));
    } catch (error) {
      console.error('Error getting available rooms:', error);
      return [];
    }
  }

  /**
   * Get aggregated air quality metrics for a symptom entry
   * Combines data from multiple rooms weighted by exposure time
   *
   * @param roomExposures - Array of room exposures with time spent
   * @returns Aggregated air quality metrics
   */
  getAggregatedAirQuality(roomExposures: RoomExposure[]): {
    avg_co2?: number;
    avg_voc?: number;
    avg_humidity?: number;
    avg_temperature?: number;
    avg_radon?: number;
    avg_pm25?: number;
    dominant_room?: string;
  } {
    if (!roomExposures || roomExposures.length === 0) {
      return {};
    }

    // Filter rooms with air quality data
    const roomsWithData = roomExposures.filter(room => room.air_quality);

    if (roomsWithData.length === 0) {
      return {};
    }

    // Calculate averages (simple average, not weighted by time since we don't have time data yet)
    const sum = roomsWithData.reduce(
      (acc, room) => {
        const aq = room.air_quality!;
        return {
          co2: acc.co2 + (aq.co2 || 0),
          voc: acc.voc + (aq.voc || 0),
          humidity: acc.humidity + (aq.humidity || 0),
          temperature: acc.temperature + (aq.temperature || 0),
          radon: acc.radon + (aq.radon || 0),
          pm25: acc.pm25 + (aq.pm25 || 0),
        };
      },
      { co2: 0, voc: 0, humidity: 0, temperature: 0, radon: 0, pm25: 0 }
    );

    const count = roomsWithData.length;

    return {
      avg_co2: sum.co2 / count,
      avg_voc: sum.voc / count,
      avg_humidity: sum.humidity / count,
      avg_temperature: sum.temperature / count,
      avg_radon: sum.radon / count,
      avg_pm25: sum.pm25 / count,
      dominant_room: roomsWithData[0]?.room_name, // First room for now
    };
  }

  /**
   * Assess air quality risk level based on metrics
   * Returns a risk score and description
   *
   * @param metrics - Air quality metrics
   * @returns Risk assessment
   */
  assessAirQualityRisk(metrics: {
    avg_co2?: number;
    avg_voc?: number;
    avg_humidity?: number;
    avg_radon?: number;
    avg_pm25?: number;
  }): {
    risk_level: 'low' | 'moderate' | 'high' | 'unknown';
    risk_score: number; // 0-100
    concerns: string[];
  } {
    const concerns: string[] = [];
    let riskScore = 0;

    // CO2 thresholds (ppm)
    if (metrics.avg_co2) {
      if (metrics.avg_co2 > 1500) {
        concerns.push('Very high CO2 levels');
        riskScore += 30;
      } else if (metrics.avg_co2 > 1000) {
        concerns.push('Elevated CO2 levels');
        riskScore += 20;
      } else if (metrics.avg_co2 > 800) {
        concerns.push('Slightly elevated CO2');
        riskScore += 10;
      }
    }

    // VOC thresholds (ppb)
    if (metrics.avg_voc) {
      if (metrics.avg_voc > 2000) {
        concerns.push('Very high VOC levels');
        riskScore += 25;
      } else if (metrics.avg_voc > 500) {
        concerns.push('Elevated VOC levels');
        riskScore += 15;
      } else if (metrics.avg_voc > 250) {
        concerns.push('Slightly elevated VOC');
        riskScore += 8;
      }
    }

    // Humidity thresholds (%)
    if (metrics.avg_humidity) {
      if (metrics.avg_humidity > 70 || metrics.avg_humidity < 30) {
        concerns.push('Humidity outside optimal range');
        riskScore += 15;
      } else if (metrics.avg_humidity > 60 || metrics.avg_humidity < 40) {
        concerns.push('Humidity suboptimal');
        riskScore += 8;
      }
    }

    // Radon thresholds (Bq/m³)
    if (metrics.avg_radon) {
      if (metrics.avg_radon > 150) {
        concerns.push('High radon levels');
        riskScore += 20;
      } else if (metrics.avg_radon > 100) {
        concerns.push('Elevated radon');
        riskScore += 10;
      }
    }

    // PM2.5 thresholds (µg/m³)
    if (metrics.avg_pm25) {
      if (metrics.avg_pm25 > 35) {
        concerns.push('High particulate matter');
        riskScore += 20;
      } else if (metrics.avg_pm25 > 12) {
        concerns.push('Elevated particulate matter');
        riskScore += 10;
      }
    }

    let riskLevel: 'low' | 'moderate' | 'high' | 'unknown' = 'unknown';
    if (riskScore === 0 && concerns.length === 0) {
      riskLevel = 'low';
    } else if (riskScore < 30) {
      riskLevel = 'moderate';
    } else {
      riskLevel = 'high';
    }

    return {
      risk_level: riskLevel,
      risk_score: Math.min(100, riskScore),
      concerns,
    };
  }
}

// Export singleton instance
export const airthingsIntegrationService = new AirthingsIntegrationService();
