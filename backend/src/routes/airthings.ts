/**
 * Airthings API Routes
 *
 * Endpoints for connecting to Airthings and fetching indoor air quality data
 */

import express from 'express';
import { z } from 'zod';
import { airthingsService } from '../services/airthings/airthingsService.js';
import { settingsService } from '../services/settings/settingsService.js';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { ValidationError } from '../middleware/errorHandler.js';
import { authenticateToken } from '../services/auth/index.js';

const router = express.Router();

// Validation schemas
const connectSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
});

/**
 * GET /api/airthings/auth-url
 * Get the Airthings OAuth authorization URL
 */
router.get('/auth-url', async (req, res) => {
  try {
    const credentials = await settingsService.getAirthingsCredentials();

    if (!credentials.clientId) {
      return res.status(500).json({
        success: false,
        error: 'Airthings integration not configured. Please contact administrator.',
      });
    }

    // Using correct scope from Airthings documentation
    // NOTE: DO NOT encodeURIComponent the redirect_uri here - Airthings does it automatically
    const authUrl = `https://accounts.airthings.com/authorize?client_id=${credentials.clientId}&redirect_uri=${credentials.redirectUri}&response_type=code&scope=read:device`;

    console.log('🔗 Generated Airthings auth URL');
    console.log('   Client ID:', credentials.clientId.substring(0, 8) + '...');
    console.log('   Redirect URI (raw):', credentials.redirectUri);
    console.log('   Scope: read:device');
    console.log('   Full URL:', authUrl);

    res.json({
      success: true,
      data: {
        authUrl,
      },
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL',
    });
  }
});

/**
 * POST /api/airthings/connect
 * Complete OAuth flow and save tokens
 */
router.post('/connect', authenticateToken, async (req, res, next) => {
  try {
    const { code } = connectSchema.parse(req.body);
    const userId = req.user!.userId;

    const credentials = await settingsService.getAirthingsCredentials();

    if (!credentials.clientId || !credentials.clientSecret) {
      return res.status(500).json({
        success: false,
        error: 'Airthings integration not configured. Please contact administrator.',
      });
    }

    // Exchange code for tokens
    const tokenData = await airthingsService.exchangeAuthCode(
      code,
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Save tokens to database
    await db
      .update(users)
      .set({
        airthings_access_token: tokenData.access_token,
        airthings_refresh_token: tokenData.refresh_token,
        airthings_token_expires_at: expiresAt,
        airthings_connected: true,
      })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: 'Successfully connected to Airthings',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid connection data'));
    } else {
      console.error('Error connecting to Airthings:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to connect to Airthings',
      });
    }
  }
});

/**
 * POST /api/airthings/disconnect
 * Disconnect Airthings integration
 */
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    await db
      .update(users)
      .set({
        airthings_access_token: null,
        airthings_refresh_token: null,
        airthings_token_expires_at: null,
        airthings_connected: false,
      })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: 'Airthings disconnected',
    });
  } catch (error) {
    console.error('Error disconnecting Airthings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Airthings',
    });
  }
});

/**
 * GET /api/airthings/status
 * Check if user has connected Airthings
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const [user] = await db
      .select({
        airthings_connected: users.airthings_connected,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({
      success: true,
      data: {
        connected: user?.airthings_connected || false,
      },
    });
  } catch (error) {
    console.error('Error checking Airthings status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check Airthings status',
    });
  }
});

/**
 * GET /api/airthings/devices
 * Get list of user's Airthings devices
 */
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const accessToken = await airthingsService.getValidAccessToken(userId);

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Airthings not connected or token expired',
      });
    }

    const devices = await airthingsService.getDevices(accessToken);

    res.json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch devices',
    });
  }
});

/**
 * GET /api/airthings/current
 * Get current indoor air quality data
 */
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const airQuality = await airthingsService.getCurrentIndoorAirQuality(
      userId
    );

    if (!airQuality) {
      return res.status(404).json({
        success: false,
        error: 'No air quality data available',
      });
    }

    const impact = airthingsService.analyzeIndoorAirQualityImpact(airQuality);

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

export { router as airthingsRoutes };
