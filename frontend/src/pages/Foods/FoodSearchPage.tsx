import React, { useState, useEffect } from 'react';
import { Search, Filter, Heart, AlertTriangle, CheckCircle, XCircle, WifiOff } from 'lucide-react';
import { useApiCall } from '../../hooks/useAsync';
import { useOfflineData } from '../../hooks/useOfflineData';
import { foodApi } from '../../lib/api';
import { LoadingSpinner, SectionLoading } from '../../components/UI/LoadingSpinner';
import { ErrorDisplay, NetworkError } from '../../components/UI/ErrorDisplay';
import type { Food, FoodSearchRequest } from '../../types/shared';

const COMPATIBILITY_LABELS = {
  0: { label: 'Safe', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
  1: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: AlertTriangle },
  2: { label: 'Incompatible', color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertTriangle },
  3: { label: 'Severe', color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle },
};

interface SearchFilters {
  compatibility?: number[];
  category?: string[];
  triggers?: string[];
}

export function FoodSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isUsingOfflineData, setIsUsingOfflineData] = useState(false);

  const { isOnline, getCachedFoodData, storeOfflineData } = useOfflineData();

  const {
    data: searchResults,
    loading,
    error,
    execute: performSearch,
    retry
  } = useApiCall(
    (params: FoodSearchRequest) => foodApi.search(params),
    { immediate: false }
  );

  // Perform search when term changes (debounced)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSearch = async () => {
    const searchParams: FoodSearchRequest = {
      query: searchTerm.trim(),
      limit: 20,
      offset: 0,
      ...filters
    };

    if (isOnline) {
      setIsUsingOfflineData(false);
      const result = await performSearch(searchParams);
      
      // Cache successful results
      if (result) {
        const cacheKey = searchTerm.trim() || 'recent-foods';
        storeOfflineData(cacheKey, result);
      }
    } else {
      // Try to get cached data when offline
      const cachedData = getCachedFoodData(searchTerm.trim());
      if (cachedData) {
        setIsUsingOfflineData(true);
        // You would need to set this data in your component state
        // This is a simplified example - you'd need to adapt based on your state management
      }
    }
  };

  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    if (searchTerm.trim()) {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilters({});
  };

  const FoodCard = ({ food }: { food: Food }) => {
    const compatibilityInfo = COMPATIBILITY_LABELS[food.compatibility as keyof typeof COMPATIBILITY_LABELS];
    const CompatIcon = compatibilityInfo.icon;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {food.name_en || food.name_no}
            </h3>
            {food.name_en && food.name_no && food.name_en !== food.name_no && (
              <p className="text-sm text-gray-600">{food.name_no}</p>
            )}
          </div>
          
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${compatibilityInfo.bgColor} ${compatibilityInfo.color}`}>
            <CompatIcon className="w-3 h-3" />
            <span>{compatibilityInfo.label}</span>
          </div>
        </div>

        {food.category && (
          <p className="text-sm text-gray-500 mb-2">{food.category}</p>
        )}

        {food.triggers && food.triggers.length > 0 && (
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-700 mr-2">Triggers:</span>
            <div className="inline-flex flex-wrap gap-1">
              {food.triggers.map((trigger, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"
                >
                  {trigger}
                </span>
              ))}
            </div>
          </div>
        )}

        {(food.remarks_en || food.remarks_no) && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
            {food.remarks_en || food.remarks_no}
          </div>
        )}

        <div className="mt-3 flex justify-between items-center">
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Add to Diary
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <Heart className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const FilterPanel = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <h3 className="font-medium text-gray-900 mb-4">Filter Foods</h3>
      
      {/* Compatibility Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Compatibility Level
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(COMPATIBILITY_LABELS).map(([level, info]) => (
            <button
              key={level}
              onClick={() => {
                const numLevel = parseInt(level);
                const newCompatibility = filters.compatibility?.includes(numLevel)
                  ? filters.compatibility.filter(c => c !== numLevel)
                  : [...(filters.compatibility || []), numLevel];
                
                handleFilterChange({ ...filters, compatibility: newCompatibility });
              }}
              className={`px-3 py-2 rounded-full text-sm font-medium border transition-colors ${
                filters.compatibility?.includes(parseInt(level))
                  ? `${info.bgColor} ${info.color} border-current`
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {info.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => handleFilterChange({})}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          SIGHI Food Database
        </h1>
        <p className="text-gray-600">
          Search over 1,000 foods and their MCAS compatibility levels
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search foods (e.g. spinach, tomato, cheese)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {Object.keys(filters).length > 0 && (
              <span className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs">
                {Object.values(filters).flat().length}
              </span>
            )}
          </button>

          {searchTerm && (
            <button
              onClick={clearSearch}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && <FilterPanel />}

      {/* Search Results */}
      <div>
        {loading && (
          <SectionLoading message="Searching food database..." />
        )}

        {error && !loading && (
          <div className="mb-6">
            {error.includes('network') || error.includes('fetch') ? (
              <NetworkError onRetry={retry} />
            ) : (
              <ErrorDisplay
                error={error}
                onRetry={retry}
                showRetry={true}
              />
            )}
          </div>
        )}

        {searchResults && !loading && !error && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Search Results
                </h2>
                {isUsingOfflineData && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-50 text-yellow-800 rounded-full text-xs font-medium">
                    <WifiOff className="w-3 h-3" />
                    <span>Offline Data</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {searchResults.foods?.length || 0} foods found
                {searchResults.pagination?.total && (
                  <span> of {searchResults.pagination.total} total</span>
                )}
              </p>
            </div>

            {searchResults.foods && searchResults.foods.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchResults.foods.map((food) => (
                  <FoodCard key={food.id} food={food} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No foods found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </>
        )}

        {!searchTerm && !loading && !error && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start searching
            </h3>
            <p className="text-gray-600">
              Enter a food name to search the SIGHI database
            </p>
          </div>
        )}
      </div>
    </div>
  );
}