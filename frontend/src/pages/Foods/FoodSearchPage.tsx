import React, { useState, useEffect } from 'react';
import { Search, Filter, Heart, AlertTriangle, CheckCircle, XCircle, WifiOff, Plus, Shield, ShieldCheck } from 'lucide-react';
import { useApiCall } from '../../hooks/useAsync';
import { useOfflineData } from '../../hooks/useOfflineData';
import { foodApi, diaryApi, personalRatingApi } from '../../lib/api';
import { LoadingSpinner, SectionLoading } from '../../components/UI/LoadingSpinner';
import { ErrorDisplay, NetworkError } from '../../components/UI/ErrorDisplay';
import type { Food, FoodSearchRequest, ApprovedFood, PersonalFoodRating, SighiTrigger, TRIGGER_DISPLAY } from '../../types/shared';
import { TRIGGER_DISPLAY as TRIGGER_INFO } from '../../types/shared';

const COMPATIBILITY_LABELS = {
  0: { label: 'Safe', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
  1: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: AlertTriangle },
  2: { label: 'Incompatible', color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertTriangle },
  3: { label: 'Severe', color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle },
};

// SIGHI food categories for filtering
const FOOD_CATEGORIES = [
  'Eggs',
  'Dairy products', 
  'Meat',
  'Fish',
  'Sea food',
  'Starch suppliers',
  'Nuts',
  'Fats and oils',
  'Vegetables',
  'Herbs',
  'Fruits',
  'Seeds',
  'Mushrooms, fungi and algae',
  'Sweeteners',
  'Spices, seasoning, aroma',
  'Beverages',
  'Food additives',
  'Vitamins, dietary minerals, trace elements, stimulants',
  'Preparations, mixtures'
];

interface SearchFilters {
  compatibility?: number;
  category?: string;
  triggers?: SighiTrigger;
}

export function FoodSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isUsingOfflineData, setIsUsingOfflineData] = useState(false);
  const [approvedFoods, setApprovedFoods] = useState<ApprovedFood[]>([]);
  const [personalRatings, setPersonalRatings] = useState<PersonalFoodRating[]>([]);

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

  // Load approved foods and personal ratings on mount
  useEffect(() => {
    loadApprovedFoods();
    loadPersonalRatings();
  }, []);

  // Perform search when term changes (debounced)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const loadApprovedFoods = async () => {
    try {
      const approved = await foodApi.getApproved();
      setApprovedFoods(approved);
    } catch (error) {
      console.error('Failed to load approved foods:', error);
    }
  };

  const loadPersonalRatings = async () => {
    try {
      const ratings = await personalRatingApi.getUserRatings();
      setPersonalRatings(ratings);
      console.log('✅ Personal ratings loaded:', ratings.length, 'ratings');
    } catch (error) {
      console.error('❌ Failed to load personal ratings:', error);
      // For now, set empty array to avoid errors
      setPersonalRatings([]);
    }
  };

  const handleSearch = async (customFilters?: SearchFilters) => {
    const activeFilters = customFilters || filters;
    const searchParams: FoodSearchRequest = {
      query: searchTerm.trim(),
      limit: 20,
      offset: 0,
      // Map filters to the correct format
      compatibility_filter: activeFilters.compatibility,
      category_filter: activeFilters.category,
      trigger_filter: activeFilters.triggers
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
    // Always perform search when filters change, even without search term
    handleSearch(newFilters);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilters({});
  };

  const addToDiary = async (food: Food) => {
    try {
      await diaryApi.createEntry({
        type: 'meal',
        data: {
          foods: [{
            sighi_id: food.id,
            name: food.name_en || food.name_no,
            amount: '',
            unit: ''
          }]
        }
      });
      
      // Show success message (you could use a toast notification here)
      alert(`${food.name_en || food.name_no} added to diary!`);
    } catch (error) {
      console.error('Failed to add food to diary:', error);
      alert('Failed to add food to diary. Please try again.');
    }
  };

  const addToSafeList = async (food: Food, personalCompatibility: number = 0) => {
    try {
      await foodApi.addApproved({
        food_id: food.id!,
        personal_compatibility: personalCompatibility,
        notes: ''
      });
      
      // Reload approved foods to update UI
      await loadApprovedFoods();
      
      alert(`${food.name_en || food.name_no} added to your safe list!`);
    } catch (error) {
      console.error('Failed to add food to safe list:', error);
      alert('Failed to add food to safe list. Please try again.');
    }
  };

  const removeFromSafeList = async (food: Food) => {
    const approvedFood = approvedFoods.find(af => af.food_id === food.id);
    if (!approvedFood) return;

    try {
      await foodApi.deleteApproved(approvedFood.id);
      
      // Reload approved foods to update UI
      await loadApprovedFoods();
      
      alert(`${food.name_en || food.name_no} removed from your safe list!`);
    } catch (error) {
      console.error('Failed to remove food from safe list:', error);
      alert('Failed to remove food from safe list. Please try again.');
    }
  };

  const quickRate = async (food: Food, personalRating: number) => {
    try {
      console.log(`🔄 Rating food ${food.name_en || food.name_no} (ID: ${food.id}) with rating: ${personalRating}`);
      
      // Use personal rating API instead of approved foods
      const result = await personalRatingApi.setFoodRating(food.id!, personalRating);
      console.log('✅ Personal rating saved:', result);
      
      // Reload personal ratings to update UI
      await loadPersonalRatings();
      
    } catch (error) {
      console.error('❌ Failed to rate food:', error);
      alert('Failed to save rating. Please try again.');
    }
  };

  const FoodCard = ({ food }: { food: Food }) => {
    const compatibilityInfo = COMPATIBILITY_LABELS[food.compatibility as keyof typeof COMPATIBILITY_LABELS];
    const CompatIcon = compatibilityInfo.icon;
    const isApproved = approvedFoods.some(af => af.food_id === food.id);
    const personalRatingEntry = personalRatings.find(pr => pr.food_id === food.id);
    const personalRating = personalRatingEntry?.personal_rating;
    const hasPersonalRating = personalRating !== undefined;
    const ratingDiffers = hasPersonalRating && personalRating !== food.compatibility;

    return (
      <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
        isApproved ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">
                {food.name_en || food.name_no}
              </h3>
              {ratingDiffers && (
                <div className="flex items-center space-x-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Avvikende vurdering</span>
                </div>
              )}
            </div>
            {food.name_en && food.name_no && food.name_en !== food.name_no && (
              <p className="text-sm text-gray-600">{food.name_no}</p>
            )}
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            {/* SIGHI Rating */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600 font-medium">SIGHI:</span>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${compatibilityInfo.bgColor} ${compatibilityInfo.color}`}>
                <CompatIcon className="w-3 h-3" />
                <span>{compatibilityInfo.label}</span>
              </div>
            </div>
            
            {/* Personal Rating */}
            {hasPersonalRating && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 font-medium">Mine:</span>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${COMPATIBILITY_LABELS[personalRating].bgColor} ${COMPATIBILITY_LABELS[personalRating].color}`}>
                  {React.createElement(COMPATIBILITY_LABELS[personalRating].icon, { className: "w-3 h-3" })}
                  <span>{COMPATIBILITY_LABELS[personalRating].label}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {food.category && (
          <p className="text-sm text-gray-500 mb-2">{food.category}</p>
        )}

        {food.triggers && food.triggers.length > 0 && (
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-700 mr-2">Triggere:</span>
            <div className="inline-flex flex-wrap gap-1">
              {food.triggers.map((trigger, idx) => {
                const triggerInfo = TRIGGER_INFO[trigger as SighiTrigger];
                
                if (!triggerInfo) {
                  // Fallback for unknown triggers
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      title={`Unknown trigger: ${trigger}`}
                    >
                      {trigger}
                    </span>
                  );
                }
                
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${triggerInfo.bgColor} ${triggerInfo.color}`}
                    title={triggerInfo.description}
                  >
                    {triggerInfo.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Rating Interface */}
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Min vurdering:</span>
            <div className="flex space-x-1">
              {[0, 1, 2, 3].map((rating) => {
                const ratingInfo = COMPATIBILITY_LABELS[rating as keyof typeof COMPATIBILITY_LABELS];
                const RatingIcon = ratingInfo.icon;
                const isSelected = personalRating === rating;
                
                return (
                  <button
                    key={rating}
                    onClick={() => quickRate(food, rating)}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-all text-xs font-medium ${
                      isSelected 
                        ? `${ratingInfo.bgColor} ${ratingInfo.color} ring-2 ring-offset-1 ring-current`
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                    title={`Rate som: ${ratingInfo.label}`}
                  >
                    <RatingIcon className="w-3 h-3" />
                    <span>{rating}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {hasPersonalRating && (
            <p className="text-xs text-gray-600 mt-1">
              Du har vurdert denne som: {COMPATIBILITY_LABELS[personalRating].label}
              {ratingDiffers && (
                <span className="text-blue-600 font-medium ml-1">
                  (avviker fra SIGHI: {compatibilityInfo.label})
                </span>
              )}
            </p>
          )}
        </div>

        {(food.remarks_en || food.remarks_no) && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
            {food.remarks_en || food.remarks_no}
          </div>
        )}

        <div className="mt-3 flex justify-between items-center">
          <div className="flex space-x-2">
            <button 
              onClick={() => addToDiary(food)}
              className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium hover:bg-primary-50 px-2 py-1 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add to Diary</span>
            </button>
            
            {isApproved ? (
              <button 
                onClick={() => removeFromSafeList(food)}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-2 py-1 rounded transition-colors"
                title="Remove from safe list"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Remove</span>
              </button>
            ) : (
              <button 
                onClick={() => addToSafeList(food, food.compatibility)}
                className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm font-medium hover:bg-green-50 px-2 py-1 rounded transition-colors"
                title="Add to safe list"
              >
                <Shield className="w-3 h-3" />
                <span>Add to Safe</span>
              </button>
            )}
          </div>
          
          <button className="text-gray-500 hover:text-gray-700">
            <Heart className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const FilterPanel = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <h3 className="font-medium text-gray-900 mb-4">Filtrer matvarer</h3>
      
      {/* Compatibility Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kompatibilitetsnivå
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(COMPATIBILITY_LABELS).map(([level, info]) => (
            <button
              key={level}
              onClick={() => {
                const numLevel = parseInt(level);
                const newCompatibility = filters.compatibility === numLevel ? undefined : numLevel;
                
                handleFilterChange({ ...filters, compatibility: newCompatibility });
              }}
              className={`px-3 py-2 rounded-full text-sm font-medium border transition-colors ${
                filters.compatibility === parseInt(level)
                  ? `${info.bgColor} ${info.color} border-current`
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {info.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trigger Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Trigger-type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(TRIGGER_INFO).map(([triggerCode, info]) => (
            <button
              key={triggerCode}
              onClick={() => {
                const newTrigger = filters.triggers === triggerCode ? undefined : triggerCode as SighiTrigger;
                handleFilterChange({ ...filters, triggers: newTrigger });
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                filters.triggers === triggerCode
                  ? `${info.bgColor} ${info.color} border-current`
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
              title={info.description}
            >
              <div className="font-medium">{info.name}</div>
              <div className="text-gray-500 text-xs">({triggerCode})</div>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Matvare-kategori
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {FOOD_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => {
                const newCategory = filters.category === category ? undefined : category;
                handleFilterChange({ ...filters, category: newCategory });
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                filters.category === category
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
              title={`Filtrer på ${category}`}
            >
              <div className="font-medium">{category}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => handleFilterChange({})}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Nullstill filtre
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
            {Object.values(filters).some(v => v !== undefined) && (
              <span className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs">
                {Object.values(filters).filter(v => v !== undefined).length}
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

        {!searchTerm && !loading && !error && Object.values(filters).every(v => v === undefined) && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start searching
            </h3>
            <p className="text-gray-600">
              Enter a food name or use filters to search the SIGHI database
            </p>
          </div>
        )}
      </div>
    </div>
  );
}