/**
 * Weather Service for MCAS-Life
 *
 * Fetches current weather conditions for symptom correlation analysis.
 * Uses Open-Meteo API (free, no API key required)
 *
 * Weather factors that may affect MCAS symptoms:
 * - Temperature (extreme heat/cold)
 * - Humidity (high humidity can worsen symptoms)
 * - Barometric pressure (pressure changes trigger symptoms)
 * - Weather conditions (rain, snow, wind)
 */

import axios from 'axios';

export interface WeatherData {
  temperature: number; // Celsius
  humidity: number; // Percentage (0-100)
  pressure: number; // hPa (hectopascal/millibar)
  wind_speed: number; // km/h
  weather_code: number; // WMO weather code
  weather_description: string;
  feels_like: number; // Celsius (apparent temperature)
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    city?: string;
  };
}

export interface WeatherHistoryData {
  date: string;
  temperature_max: number;
  temperature_min: number;
  humidity_avg: number;
  pressure_avg: number;
  weather_code: number;
}

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

class WeatherService {
  private readonly apiBaseUrl = 'https://api.open-meteo.com/v1';

  /**
   * Get current weather for a location
   */
  async getCurrentWeather(
    latitude: number,
    longitude: number,
    city?: string
  ): Promise<WeatherData> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/forecast`, {
        params: {
          latitude,
          longitude,
          current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'pressure_msl',
            'wind_speed_10m',
            'weather_code'
          ].join(','),
          timezone: 'auto'
        },
        timeout: 5000
      });

      const current = response.data.current;

      return {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        pressure: current.pressure_msl,
        wind_speed: current.wind_speed_10m,
        weather_code: current.weather_code,
        weather_description: WEATHER_CODES[current.weather_code] || 'Unknown',
        feels_like: current.apparent_temperature,
        timestamp: current.time,
        location: {
          latitude,
          longitude,
          city
        }
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw new Error('Failed to fetch weather data');
    }
  }

  /**
   * Get weather history for symptom correlation (last 7 days)
   */
  async getWeatherHistory(
    latitude: number,
    longitude: number,
    days: number = 7
  ): Promise<WeatherHistoryData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const response = await axios.get(`${this.apiBaseUrl}/forecast`, {
        params: {
          latitude,
          longitude,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          daily: [
            'temperature_2m_max',
            'temperature_2m_min',
            'relative_humidity_2m_mean',
            'pressure_msl_mean',
            'weather_code'
          ].join(','),
          timezone: 'auto'
        },
        timeout: 5000
      });

      const daily = response.data.daily;

      return daily.time.map((date: string, index: number) => ({
        date,
        temperature_max: daily.temperature_2m_max[index],
        temperature_min: daily.temperature_2m_min[index],
        humidity_avg: daily.relative_humidity_2m_mean[index],
        pressure_avg: daily.pressure_msl_mean[index],
        weather_code: daily.weather_code[index]
      }));
    } catch (error) {
      console.error('Error fetching weather history:', error);
      throw new Error('Failed to fetch weather history');
    }
  }

  /**
   * Search for cities by name (for autocomplete)
   */
  async searchCities(query: string): Promise<Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    country_code: string;
    admin1?: string;
  }>> {
    try {
      const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: {
          name: query,
          count: 10,
          language: 'en',
          format: 'json'
        },
        timeout: 5000
      });

      if (!response.data.results || response.data.results.length === 0) {
        return [];
      }

      return response.data.results.map((result: any) => ({
        id: result.id,
        name: result.name,
        latitude: result.latitude,
        longitude: result.longitude,
        country: result.country,
        country_code: result.country_code,
        admin1: result.admin1
      }));
    } catch (error) {
      console.error('Error searching cities:', error);
      return [];
    }
  }

  /**
   * Geocode city name to coordinates (using Open-Meteo Geocoding API)
   */
  async geocodeCity(cityName: string): Promise<{
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  }> {
    try {
      const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: {
          name: cityName,
          count: 1,
          language: 'no',
          format: 'json'
        },
        timeout: 5000
      });

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error(`City not found: ${cityName}`);
      }

      const result = response.data.results[0];

      return {
        latitude: result.latitude,
        longitude: result.longitude,
        city: result.name,
        country: result.country
      };
    } catch (error) {
      console.error('Error geocoding city:', error);
      throw new Error('Failed to geocode city');
    }
  }

  /**
   * Analyze weather impact on MCAS symptoms
   */
  analyzeWeatherImpact(weather: WeatherData): {
    risk_factors: string[];
    severity: 'low' | 'moderate' | 'high';
    recommendations: string[];
  } {
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // Temperature extremes
    if (weather.temperature > 30) {
      riskFactors.push('High temperature (>30°C)');
      recommendations.push('Stay in air-conditioned spaces, stay hydrated');
    } else if (weather.temperature < 0) {
      riskFactors.push('Freezing temperature (<0°C)');
      recommendations.push('Dress warmly, avoid prolonged cold exposure');
    }

    // High humidity
    if (weather.humidity > 70) {
      riskFactors.push('High humidity (>70%)');
      recommendations.push('Use dehumidifier if indoors, limit outdoor activities');
    }

    // Low pressure (often triggers symptoms)
    if (weather.pressure < 1000) {
      riskFactors.push('Low barometric pressure (<1000 hPa)');
      recommendations.push('Be prepared for potential symptom flare-ups');
    }

    // Strong winds
    if (weather.wind_speed > 30) {
      riskFactors.push('Strong winds (>30 km/h)');
      recommendations.push('Avoid outdoor activities, protect from allergens');
    }

    // Storm or severe weather
    if ([95, 96, 99].includes(weather.weather_code)) {
      riskFactors.push('Severe weather (thunderstorms)');
      recommendations.push('Stay indoors, monitor symptoms closely');
    }

    // Calculate severity
    let severity: 'low' | 'moderate' | 'high' = 'low';
    if (riskFactors.length >= 3) {
      severity = 'high';
    } else if (riskFactors.length >= 1) {
      severity = 'moderate';
    }

    return {
      risk_factors: riskFactors,
      severity,
      recommendations
    };
  }
}

export const weatherService = new WeatherService();
