/**
 * Airthings API Routes V2 - Client Credentials Flow
 *
 * Simplified flow where admin configures API credentials once,
 * and all users can view data from admin's Airthings devices.
 */

import express from 'express';
import { airthingsServiceV2 } from '../services/airthings/airthingsServiceV2.js';

const router = express.Router();

/**
 * GET /api/airthings/status
 * Check if Airthings is configured and working
 */
router.get('/status', async (req, res) => {
  try {
    const devices = await airthingsServiceV2.getDevices();

    res.json({
      success: true,
      data: {
        configured: devices.length > 0,
        deviceCount: devices.length,
        devices: devices,
      },
    });
  } catch (error: any) {
    // If error is about missing credentials, return not configured
    if (error.message.includes('not configured')) {
      return res.json({
        success: true,
        data: {
          configured: false,
          deviceCount: 0,
          devices: [],
        },
      });
    }

    console.error('Error checking Airthings status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check Airthings status',
    });
  }
});

/**
 * GET /api/airthings/devices
 * Get all available Airthings devices
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await airthingsServiceV2.getDevices();

    res.json({
      success: true,
      data: { devices },
    });
  } catch (error) {
    console.error('Error fetching Airthings devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Airthings devices',
    });
  }
});

/**
 * GET /api/airthings/current
 * Get current indoor air quality data (from first device)
 */
router.get('/current', async (req, res) => {
  try {
    const airQuality = await airthingsServiceV2.getCurrentIndoorAirQuality();

    if (!airQuality) {
      return res.status(404).json({
        success: false,
        error: 'No air quality data available',
      });
    }

    // Analyze MCAS impact
    const impact = airthingsServiceV2.analyzeIndoorAirQualityImpact(airQuality);

    res.json({
      success: true,
      data: {
        air_quality: airQuality,
        impact,
      },
    });
  } catch (error) {
    console.error('Error fetching current air quality:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch air quality data',
    });
  }
});

/**
 * GET /api/airthings/all
 * Get air quality data from all devices
 */
router.get('/all', async (req, res) => {
  try {
    const allData = await airthingsServiceV2.getAllDevicesAirQuality();

    const devicesWithImpact = allData.map((data) => ({
      air_quality: data,
      impact: airthingsServiceV2.analyzeIndoorAirQualityImpact(data),
    }));

    res.json({
      success: true,
      data: { devices: devicesWithImpact },
    });
  } catch (error) {
    console.error('Error fetching all devices air quality:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch air quality data',
    });
  }
});

export { router as airthingsRoutesV2 };
