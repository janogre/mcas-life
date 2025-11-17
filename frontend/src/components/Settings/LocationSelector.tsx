import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, Cloud, AlertCircle, X } from 'lucide-react';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { getWeatherByCity, formatWeatherData, getWeatherEmoji, type WeatherResponse } from '../../lib/weatherApi';
import api from '../../lib/api';

interface City {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code: string;
  admin1?: string;
}

interface LocationSelectorProps {
  currentCity?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  onLocationSelect: (location: {
    city: string;
    latitude: number;
    longitude: number;
    country: string;
  }) => void;
  onCancel?: () => void;
}

export function LocationSelector({
  currentCity,
  currentLatitude,
  currentLongitude,
  onLocationSelect,
  onCancel
}: LocationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [weatherPreview, setWeatherPreview] = useState<WeatherResponse | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Search for cities as user types
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const response = await api.get<{ success: boolean; data: City[] }>(
          '/weather/search',
          { params: { q: searchQuery } }
        );
        setSearchResults(response.data.data || []);
      } catch (err) {
        console.error('Error searching cities:', err);
        setError('Kunne ikke søke etter byer. Prøv igjen.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Load weather preview when city is selected
  const loadWeatherPreview = async (city: City) => {
    setIsLoadingWeather(true);
    setError(null);

    try {
      const weather = await getWeatherByCity(city.name);
      setWeatherPreview(weather);
    } catch (err) {
      console.error('Error loading weather preview:', err);
      setError('Kunne ikke laste værdata');
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleCitySelect = async (city: City) => {
    setSelectedCity(city);
    setSearchQuery('');
    setSearchResults([]);
    await loadWeatherPreview(city);
  };

  const handleUseCurrentLocation = () => {
    setIsUsingCurrentLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Din nettleser støtter ikke lokalisering');
      setIsUsingCurrentLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Reverse geocode to get city name
          const response = await api.get<{ success: boolean; data: WeatherResponse }>(
            '/weather/current',
            {
              params: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            }
          );

          const weatherData = response.data.data;

          if (weatherData.location) {
            const locationData = {
              city: weatherData.location.city,
              latitude: weatherData.location.latitude,
              longitude: weatherData.location.longitude,
              country: weatherData.location.country
            };

            setSelectedCity({
              id: 0,
              name: locationData.city,
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              country: locationData.country,
              country_code: locationData.country.substring(0, 2)
            });
            setWeatherPreview(weatherData);
          }
        } catch (err) {
          console.error('Error getting location:', err);
          setError('Kunne ikke hente din posisjon');
        } finally {
          setIsUsingCurrentLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Kunne ikke få tilgang til din posisjon');
        setIsUsingCurrentLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const handleSaveLocation = () => {
    if (selectedCity) {
      onLocationSelect({
        city: selectedCity.name,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
        country: selectedCity.country_code
      });
    }
  };

  const getCityDisplayName = (city: City) => {
    let name = city.name;
    if (city.admin1 && city.admin1 !== city.name) {
      name += `, ${city.admin1}`;
    }
    name += `, ${city.country}`;
    return name;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-600" />
          Velg lokasjon
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Lukk"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Current location button */}
      <button
        onClick={handleUseCurrentLocation}
        disabled={isUsingCurrentLocation}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUsingCurrentLocation ? (
          <LoadingSpinner size="sm" />
        ) : (
          <Navigation className="w-4 h-4" />
        )}
        <span>Bruk min nåværende posisjon</span>
      </button>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Søk etter by..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
          {searchResults.map((city) => (
            <button
              key={city.id}
              onClick={() => handleCitySelect(city)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">{getCityDisplayName(city)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Selected city and weather preview */}
      {selectedCity && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Valgt lokasjon:</p>
            <p className="text-lg font-semibold text-gray-900">
              {getCityDisplayName(selectedCity)}
            </p>
            <p className="text-sm text-gray-500">
              {selectedCity.latitude.toFixed(4)}°, {selectedCity.longitude.toFixed(4)}°
            </p>
          </div>

          {/* Weather preview */}
          {isLoadingWeather ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" message="Laster værdata..." />
            </div>
          ) : weatherPreview ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">
                  {getWeatherEmoji(weatherPreview.weather.weather_code)}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Nåværende vær:
                  </p>
                  <p className="text-sm text-gray-700">
                    {formatWeatherData(weatherPreview.weather)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {weatherPreview.weather.weather_description}
                  </p>

                  {/* MCAS impact */}
                  {weatherPreview.impact && weatherPreview.impact.risk_factors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        MCAS påvirkningsfaktorer:
                      </p>
                      <div className="space-y-1">
                        {weatherPreview.impact.risk_factors.map((factor, index) => (
                          <p key={index} className="text-xs text-gray-600">
                            • {factor}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Save button */}
          <div className="flex gap-2">
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Avbryt
              </button>
            )}
            <button
              onClick={handleSaveLocation}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Lagre lokasjon
            </button>
          </div>
        </div>
      )}

      {/* Current location info */}
      {currentCity && !selectedCity && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600 mb-1">Nåværende lokasjon:</p>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{currentCity}</span>
          </div>
          {currentLatitude && currentLongitude && (
            <p className="text-xs text-gray-500 ml-6">
              {currentLatitude.toFixed(4)}°, {currentLongitude.toFixed(4)}°
            </p>
          )}
        </div>
      )}
    </div>
  );
}
