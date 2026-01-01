import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Plus, Clock, Users, TrendingUp, Search, Filter } from 'lucide-react';
import { userRecipesApi } from '../../lib/api';
import type { UserRecipe, UserRecipeWithAuthor } from '../../types/shared';
import { SharedRecipeCard } from '../../components/Recipes/SharedRecipeCard';
import { RecipeSharingToggle } from '../../components/Recipes/RecipeSharingToggle';

type TabType = 'my-recipes' | 'community';

export function UserRecipesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<TabType>('my-recipes');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'created_at' | 'times_made' | 'mcas_score'>('created_at');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');

  // Fetch user's own recipes
  const { data: myRecipesData, isLoading: myRecipesLoading, error: myRecipesError, refetch: refetchMyRecipes } = useQuery(
    ['user-recipes', sortBy, order],
    () => userRecipesApi.getAll({ sortBy, order }),
    {
      staleTime: 30000, // 30 seconds
      enabled: activeTab === 'my-recipes',
    }
  );

  // Fetch community recipes
  const { data: communityData, isLoading: communityLoading, error: communityError, refetch: refetchCommunity } = useQuery(
    ['community-recipes', sortBy, order, searchTerm],
    () => userRecipesApi.getCommunityRecipes({
      sortBy: sortBy === 'mcas_score' ? 'mcas_score' : sortBy === 'times_made' ? 'times_made' : 'created_at',
      order,
      search: searchTerm || undefined,
      page: 1,
      limit: 100,
    }),
    {
      staleTime: 30000,
      enabled: activeTab === 'community',
    }
  );

  // Reset search when switching tabs
  React.useEffect(() => {
    setSearchTerm('');
  }, [activeTab]);

  // Determine which data to use
  const isLoading = activeTab === 'my-recipes' ? myRecipesLoading : communityLoading;
  const error = activeTab === 'my-recipes' ? myRecipesError : communityError;
  const refetch = activeTab === 'my-recipes' ? refetchMyRecipes : refetchCommunity;

  // Filter my recipes by search term (community recipes filtered server-side)
  const filteredRecipes = React.useMemo(() => {
    if (activeTab === 'community') {
      return communityData?.recipes || [];
    }

    if (!myRecipesData?.recipes) return [];

    if (!searchTerm.trim()) return myRecipesData.recipes;

    const term = searchTerm.toLowerCase();
    return myRecipesData.recipes.filter(recipe =>
      recipe.title.toLowerCase().includes(term) ||
      recipe.description?.toLowerCase().includes(term)
    );
  }, [activeTab, myRecipesData?.recipes, communityData?.recipes, searchTerm]);

  // Handle recipe sharing toggle
  const handleSharingChange = (isPublic: boolean) => {
    // Refetch to update the list
    refetchMyRecipes();
  };

  // Handle community recipe interactions
  const handleLike = (recipeId: number, isLiked: boolean) => {
    // Optionally refetch to update like counts
    refetchCommunity();
  };

  const handleSave = (recipeId: number) => {
    // Show success message and refetch my recipes
    refetchMyRecipes();
  };

  // Get safety level color
  const getSafetyColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-green-100 text-green-800 border-green-200';
      case 'caution': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'risky': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'unsafe': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get safety level text
  const getSafetyText = (level: string) => {
    switch (level) {
      case 'safe': return 'Trygg';
      case 'caution': return 'Forsiktig';
      case 'risky': return 'Risikabel';
      case 'unsafe': return 'Utrygg';
      default: return level;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mine Oppskrifter</h1>
          <p className="text-gray-600 mt-2">
            Egendefinerte oppskrifter med automatisk MCAS-analyse
          </p>
        </div>
        <button
          onClick={() => navigate('/mine-oppskrifter/ny')}
          className="flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Ny oppskrift</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('my-recipes')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'my-recipes'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Mine oppskrifter
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'community'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Fellesskapets oppskrifter
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter oppskrifter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="created_at">Opprettet dato</option>
              <option value="times_made">Antall ganger laget</option>
              <option value="mcas_score">MCAS-score</option>
            </select>
            <button
              onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title={order === 'asc' ? 'Stigende' : 'Synkende'}
            >
              {order === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Laster oppskrifter...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Kunne ikke laste oppskrifter. Prøv igjen.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Prøv igjen
          </button>
        </div>
      )}

      {/* Empty State - My Recipes */}
      {!isLoading && !error && activeTab === 'my-recipes' && filteredRecipes.length === 0 && !searchTerm && (
        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ingen oppskrifter ennå
          </h3>
          <p className="text-gray-600 mb-6">
            Lag din første oppskrift med automatisk MCAS-analyse
          </p>
          <button
            onClick={() => navigate('/mine-oppskrifter/ny')}
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Opprett oppskrift</span>
          </button>
        </div>
      )}

      {/* Empty State - Community Recipes */}
      {!isLoading && !error && activeTab === 'community' && filteredRecipes.length === 0 && !searchTerm && (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ingen delte oppskrifter ennå
          </h3>
          <p className="text-gray-600">
            Bli den første til å dele en oppskrift med fellesskapet!
          </p>
        </div>
      )}

      {/* No search results */}
      {!isLoading && !error && filteredRecipes.length === 0 && searchTerm && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">Ingen oppskrifter matcher søket "{searchTerm}"</p>
        </div>
      )}

      {/* Recipes Grid - My Recipes */}
      {!isLoading && !error && activeTab === 'my-recipes' && filteredRecipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <div key={recipe.id} className="space-y-4">
              <RecipeCard
                recipe={recipe as UserRecipe}
                getSafetyColor={getSafetyColor}
                getSafetyText={getSafetyText}
              />
              {/* Sharing toggle for own recipes */}
              <RecipeSharingToggle
                recipeId={recipe.id}
                isPublic={(recipe as UserRecipe).is_public}
                onChange={handleSharingChange}
              />
            </div>
          ))}
        </div>
      )}

      {/* Recipes Grid - Community Recipes */}
      {!isLoading && !error && activeTab === 'community' && filteredRecipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <SharedRecipeCard
              key={recipe.id}
              recipe={recipe as UserRecipeWithAuthor}
              onLike={handleLike}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Recipe Card Component
interface RecipeCardProps {
  recipe: UserRecipe;
  getSafetyColor: (level: string) => string;
  getSafetyText: (level: string) => string;
}

function RecipeCard({ recipe, getSafetyColor, getSafetyText }: RecipeCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/mine-oppskrifter/${recipe.id}`)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header with title and score */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4">
          {recipe.title}
        </h3>
        <div className="flex flex-col items-end space-y-1">
          <div className="text-2xl font-bold text-primary-600">
            {recipe.calculated_mcas_score}
          </div>
          <div className="text-xs text-gray-500">MCAS</div>
        </div>
      </div>

      {/* Description */}
      {recipe.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {recipe.description}
        </p>
      )}

      {/* Safety level badge */}
      <div className="mb-4">
        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getSafetyColor(recipe.safety_level)}`}>
          {getSafetyText(recipe.safety_level)}
        </span>
      </div>

      {/* Trigger warnings */}
      {recipe.trigger_warnings && recipe.trigger_warnings.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {recipe.trigger_warnings.slice(0, 2).map((warning, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded border border-orange-200"
              >
                {warning}
              </span>
            ))}
            {recipe.trigger_warnings.length > 2 && (
              <span className="inline-block px-2 py-1 text-xs text-gray-600">
                +{recipe.trigger_warnings.length - 2} flere
              </span>
            )}
          </div>
        </div>
      )}

      {/* Meta information */}
      <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>{recipe.servings} porsjoner</span>
        </div>
        {recipe.prep_time_minutes && (
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{recipe.prep_time_minutes} min</span>
          </div>
        )}
        <div className="flex items-center space-x-1">
          <TrendingUp className="w-4 h-4" />
          <span>{recipe.times_made}x</span>
        </div>
      </div>
    </div>
  );
}
