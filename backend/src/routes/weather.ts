/**
 * Weather API Routes
 *
 * Endpoints for fetching weather data for symptom correlation
 */

import express from 'express';
import { z } from 'zod';
import { weatherService } from '../services/weather/weatherService.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const currentWeatherSchema = z.object({
  latitude: z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < -90 || num > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    return num;
  }),
  longitude: z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < -180 || num > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    return num;
  }),
  city: z.string().optional()
});

const cityWeatherSchema = z.object({
  city: z.string().min(1, 'City name is required')
});

const weatherHistorySchema = z.object({
  latitude: z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < -90 || num > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    return num;
  }),
  longitude: z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < -180 || num > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    return num;
  }),
  days: z.string().optional().transform((val) => {
    if (!val) return 7;
    const num = parseInt(val);
    if (isNaN(num) || num < 1 || num > 30) {
      throw new Error('Days must be between 1 and 30');
    }
    return num;
  })
});

const citySearchSchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters')
});

// GET /api/weather/search - Search for cities
router.get('/search', async (req, res, next) => {
  try {
    const query = citySearchSchema.parse(req.query);

    const results = await weatherService.searchCities(query.q);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid search query'));
    } else {
      next(error);
    }
  }
});

// GET /api/weather/current - Get current weather for coordinates
router.get('/current', async (req, res, next) => {
  try {
    const query = currentWeatherSchema.parse(req.query);

    const weather = await weatherService.getCurrentWeather(
      query.latitude,
      query.longitude,
      query.city
    );

    const impact = weatherService.analyzeWeatherImpact(weather);

    res.json({
      success: true,
      data: {
        weather,
        impact
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid weather query parameters'));
    } else {
      next(error);
    }
  }
});

// GET /api/weather/city/:cityName - Get current weather by city name
router.get('/city/:cityName', async (req, res, next) => {
  try {
    const cityName = req.params.cityName;

    // Geocode city to coordinates
    const location = await weatherService.geocodeCity(cityName);

    // Get weather for coordinates
    const weather = await weatherService.getCurrentWeather(
      location.latitude,
      location.longitude,
      location.city
    );

    const impact = weatherService.analyzeWeatherImpact(weather);

    res.json({
      success: true,
      data: {
        weather,
        impact,
        location
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/weather/history - Get weather history for correlation analysis
router.get('/history', async (req, res, next) => {
  try {
    const query = weatherHistorySchema.parse(req.query);

    const history = await weatherService.getWeatherHistory(
      query.latitude,
      query.longitude,
      query.days
    );

    res.json({
      success: true,
      data: {
        history,
        period: {
          days: query.days,
          start: history[0]?.date,
          end: history[history.length - 1]?.date
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid weather history parameters'));
    } else {
      next(error);
    }
  }
});

export { router as weatherRoutes };
