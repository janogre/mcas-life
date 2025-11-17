/**
 * Weather API Client for MCAS-Life Frontend
 *
 * Automatically fetches weather data for symptom correlation
 */

import api from './api';

export interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  weather_code: number;
  weather_description: string;
  feels_like: number;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    city?: string;
  };
}

export interface WeatherImpact {
  risk_factors: string[];
  severity: 'low' | 'moderate' | 'high';
  recommendations: string[];
}

export interface WeatherResponse {
  weather: WeatherData;
  impact: WeatherImpact;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
}

/**
 * Get current weather for a city
 */
export async function getWeatherByCity(cityName: string): Promise<WeatherResponse> {
  const response = await api.get<{ success: boolean; data: WeatherResponse }>(
    `/weather/city/${encodeURIComponent(cityName)}`
  );
  return response.data.data;
}

/**
 * Get current weather by coordinates
 */
export async function getWeatherByCoordinates(
  latitude: number,
  longitude: number,
  city?: string
): Promise<WeatherResponse> {
  const response = await api.get<{ success: boolean; data: WeatherResponse }>('/weather/current', {
    params: {
      latitude,
      longitude,
      city
    }
  });
  return response.data.data;
}

/**
 * Get weather from browser geolocation API
 */
export async function getWeatherFromBrowser(): Promise<WeatherResponse> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const weather = await getWeatherByCoordinates(
            position.coords.latitude,
            position.coords.longitude
          );
          resolve(weather);
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  });
}

/**
 * Get weather automatically - tries browser location first, falls back to user's city
 */
export async function getWeatherAutomatically(
  fallbackCity?: string
): Promise<WeatherResponse | null> {
  try {
    // Try browser geolocation first
    return await getWeatherFromBrowser();
  } catch (browserError) {
    console.warn('Browser geolocation failed, trying fallback city:', browserError);

    // If fallback city is provided, try that
    if (fallbackCity) {
      try {
        return await getWeatherByCity(fallbackCity);
      } catch (cityError) {
        console.error('Fallback city weather fetch failed:', cityError);
        return null;
      }
    }

    return null;
  }
}

/**
 * Format weather data for display
 */
export function formatWeatherData(weather: WeatherData): string {
  return `${weather.temperature.toFixed(1)}°C, ${weather.humidity}% humidity, ${weather.pressure.toFixed(0)} hPa`;
}

/**
 * Get weather emoji based on weather code
 */
export function getWeatherEmoji(weatherCode: number): string {
  const emojiMap: Record<number, string> = {
    0: '☀️',
    1: '🌤️',
    2: '⛅',
    3: '☁️',
    45: '🌫️',
    48: '🌫️',
    51: '🌦️',
    53: '🌧️',
    55: '🌧️',
    61: '🌧️',
    63: '🌧️',
    65: '⛈️',
    71: '🌨️',
    73: '🌨️',
    75: '❄️',
    77: '❄️',
    80: '🌦️',
    81: '🌧️',
    82: '⛈️',
    85: '🌨️',
    86: '❄️',
    95: '⛈️',
    96: '⛈️',
    99: '⛈️'
  };

  return emojiMap[weatherCode] || '🌡️';
}
