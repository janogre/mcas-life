import React, { useState, useEffect } from 'react';
import { Search, ChefHat, Sparkles, Filter } from 'lucide-react';
import { foodApi, recipeApi } from '../../lib/api';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { ErrorDisplay } from '../../components/UI/ErrorDisplay';
import { RecipeCard } from '../../components/Recipes/RecipeCard';
import type { ApprovedFood, Food, McasRecipe, RecipeSearchResponse } from '../../types/shared';

export function RecipeSearchPage() {
  const [safeFoods, setSafeFoods] = useState<ApprovedFood[]>([]);
  const [foodDetails, setFoodDetails] = useState<Map<number, Food>>(new Map());
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<McasRecipe[]>([]);
  const [searchResults, setSearchResults] = useState<RecipeSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<McasRecipe | null>(null);
  const [maxRecipes, setMaxRecipes] = useState(10);

  // Load user's Safe Foods on mount
  useEffect(() => {
    loadSafeFoods();
  }, []);

  const loadSafeFoods = async () => {
    try {
      setLoading(true);
      setError(null);
      const approved = await foodApi.getApproved();
      setSafeFoods(approved);

      // Load food details for each approved food
      const foodDetailsMap = new Map<number, Food>();
      await Promise.all(
        approved.slice(0, 50).map(async (af) => { // Limit to 50 for performance
          try {
            const food = await foodApi.getById(af.food_id);
            if (food) {
              foodDetailsMap.set(af.food_id, food);
            }
          } catch (err) {
            console.error(`Failed to load food ${af.food_id}:`, err);
          }
        })
      );
      setFoodDetails(foodDetailsMap);
    } catch (err) {
      setError('Kunne ikke laste Safe Foods');
      console.error('Load safe foods error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetSuggestions = async () => {
    try {
      setSearching(true);
      setError(null);
      const suggestions = await recipeApi.getSuggestions(maxRecipes);
      setRecipes(suggestions.recipes);
      setSearchResults(suggestions);
    } catch (err) {
      setError('Kunne ikke hente oppskriftsforslag');
      console.error('Get suggestions error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    if (selectedIngredients.length === 0) {
      setError('Velg minst én ingrediens');
      return;
    }

    try {
      setSearching(true);
      setError(null);
      const results = await recipeApi.searchByIngredients({
        ingredients: selectedIngredients,
        number: maxRecipes,
        ranking: 1,
        ignorePantry: true
      });
      setRecipes(results.recipes);
      setSearchResults(results);
    } catch (err) {
      setError('Oppskriftss\u00f8k feilet');
      console.error('Recipe search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const toggleIngredient = (ingredientName: string) => {
    if (selectedIngredients.includes(ingredientName)) {
      setSelectedIngredients(selectedIngredients.filter(i => i !== ingredientName));
    } else {
      setSelectedIngredients([...selectedIngredients, ingredientName]);
    }
  };

  const handleRecipeClick = (recipe: McasRecipe) => {
    setSelectedRecipe(recipe);
    // TODO: Open RecipeDetailModal
    alert(`Recipe modal for: ${recipe.title}\n\nDette vil vise full oppskrift med MCAS-analyse.\n\nImplementeres i neste steg.`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
            <ChefHat className="w-7 h-7 text-primary-600" />
            <span>Oppskrifter</span>
          </h1>
          <p className="text-gray-600">
            Finn MCAS-vennlige oppskrifter basert på dine Safe Foods
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleGetSuggestions}
          disabled={safeFoods.length === 0 || searching}
          className="flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">
            {searching ? 'Henter forslag...' : 'Få AI-forslag basert på dine Safe Foods'}
          </span>
        </button>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700 font-medium whitespace-nowrap">
            Antall oppskrifter:
          </label>
          <select
            value={maxRecipes}
            onChange={(e) => setMaxRecipes(parseInt(e.target.value))}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value={5}>5 oppskrifter</option>
            <option value={10}>10 oppskrifter</option>
            <option value={15}>15 oppskrifter</option>
            <option value={20}>20 oppskrifter</option>
          </select>
        </div>
      </div>

      {/* Ingredient Selector */}
      {safeFoods.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Filter className="w-5 h-5 text-primary-600" />
            <span>Velg ingredienser fra dine Safe Foods</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            {safeFoods.slice(0, 20).map((af) => {
              const food = foodDetails.get(af.food_id);
              const ingredientName = food?.name_en || food?.name_no || `Food ${af.food_id}`;
              const isSelected = selectedIngredients.includes(ingredientName);

              return (
                <button
                  key={af.id}
                  onClick={() => toggleIngredient(ingredientName)}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    isSelected
                      ? 'bg-primary-100 border-primary-500 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'
                  }`}
                >
                  {ingredientName}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedIngredients.length} ingrediens{selectedIngredients.length !== 1 ? 'er' : ''} valgt
            </div>
            <div className="flex space-x-2">
              {selectedIngredients.length > 0 && (
                <button
                  onClick={() => setSelectedIngredients([])}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Nullstill
                </button>
              )}
              <button
                onClick={handleSearch}
                disabled={selectedIngredients.length === 0 || searching}
                className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Search className="w-4 h-4" />
                <span>{searching ? 'Søker...' : 'Søk oppskrifter'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">
            Du har ingen Safe Foods ennå. Gå til <a href="/foods/approved" className="underline font-medium">Safe Foods</a> for å legge til matvarer først.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={selectedIngredients.length > 0 ? handleSearch : handleGetSuggestions}
          showRetry={true}
        />
      )}

      {/* Search Results */}
      {searchResults && recipes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Funnet {recipes.length} oppskrifter
            </h2>
            <div className="text-sm text-gray-600">
              Brukte ingredienser: {searchResults.searchParams.ingredientsUsed.join(', ')}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={handleRecipeClick}
              />
            ))}
          </div>
        </div>
      )}

      {searchResults && recipes.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ingen oppskrifter funnet
          </h3>
          <p className="text-gray-600">
            Prøv å velge flere ingredienser eller få AI-forslag
          </p>
        </div>
      )}
    </div>
  );
}
