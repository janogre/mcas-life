/**
 * System Settings API Routes
 *
 * Admin endpoints for managing application configuration
 */

import express from 'express';
import { z } from 'zod';
import { settingsService } from '../services/settings/settingsService.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const airthingsCredentialsSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  redirectUri: z.string().url('Redirect URI must be a valid URL'),
});

/**
 * GET /api/settings/airthings
 * Get Airthings configuration status (does not return secrets)
 */
router.get('/airthings', async (req, res) => {
  try {
    const credentials = await settingsService.getAirthingsCredentials();

    res.json({
      success: true,
      data: {
        configured: !!(credentials.clientId && credentials.clientSecret),
        clientId: credentials.clientId ? `${credentials.clientId.substring(0, 8)}...` : null,
        redirectUri: credentials.redirectUri,
      },
    });
  } catch (error) {
    console.error('Error fetching Airthings settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Airthings settings',
    });
  }
});

/**
 * PUT /api/settings/airthings
 * Save Airthings API credentials (admin only)
 */
router.put('/airthings', async (req, res, next) => {
  try {
    const { clientId, clientSecret, redirectUri } = airthingsCredentialsSchema.parse(req.body);
    const userId = req.user!.userId;

    await settingsService.saveAirthingsCredentials(
      clientId,
      clientSecret,
      redirectUri,
      userId
    );

    res.json({
      success: true,
      message: 'Airthings credentials saved successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid Airthings credentials'));
    } else {
      console.error('Error saving Airthings credentials:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save Airthings credentials',
      });
    }
  }
});

/**
 * DELETE /api/settings/airthings
 * Remove Airthings API credentials
 */
router.delete('/airthings', async (req, res) => {
  try {
    const userId = req.user!.userId;

    await settingsService.saveAirthingsCredentials(
      '',
      '',
      'http://localhost:3000/settings/airthings/callback',
      userId
    );

    res.json({
      success: true,
      message: 'Airthings credentials removed',
    });
  } catch (error) {
    console.error('Error removing Airthings credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove Airthings credentials',
    });
  }
});

export { router as settingsRoutes };
