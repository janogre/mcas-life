import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  ArrowLeft,
  Clock,
  Users,
  TrendingUp,
  Edit,
  Trash2,
  ChefHat,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
} from 'lucide-react';
import { userRecipesApi } from '../../lib/api';
import type { UserRecipe, RecipeIngredient } from '../../types/shared';
import { RecipeSharingToggle } from '../../components/Recipes/RecipeSharingToggle';

export function RecipeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showScoreInfo, setShowScoreInfo] = React.useState(false);

  // Fetch recipe details
  const { data: recipe, isLoading, error } = useQuery(
    ['user-recipe', id],
    () => userRecipesApi.getById(Number(id)),
    {
      enabled: !!id,
      staleTime: 30000,
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    () => userRecipesApi.delete(Number(id)),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user-recipes']);
        navigate('/mine-oppskrifter');
      },
      onError: (error: any) => {
        alert(`Feil ved sletting: ${error.message || 'Ukjent feil'}`);
      },
    }
  );

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    deleteMutation.mutate();
  };

  // Handle sharing toggle
  const handleSharingChange = (isPublic: boolean) => {
    // Refetch recipe to update the sharing status
    queryClient.invalidateQueries(['user-recipe', id]);
    queryClient.invalidateQueries(['user-recipes']);
  };

  // Get safety level styling
  const getSafetyColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-green-100 text-green-800 border-green-200';
      case 'caution': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'risky': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'unsafe': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSafetyText = (level: string) => {
    switch (level) {
      case 'safe': return 'Trygg';
      case 'caution': return 'Forsiktig';
      case 'risky': return 'Risikabel';
      case 'unsafe': return 'Utrygg';
      default: return level;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">
            Kunne ikke laste oppskrift. {(error as any)?.message || 'Ukjent feil'}
          </p>
          <button
            onClick={() => navigate('/mine-oppskrifter')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tilbake til oppskrifter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header with back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/mine-oppskrifter')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake til oppskrifter</span>
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
            {recipe.description && (
              <p className="text-gray-600 text-lg">{recipe.description}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => navigate(`/mine-oppskrifter/${id}/rediger`)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="Rediger oppskrift"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Rediger</span>
            </button>
            <button
              onClick={handleDelete}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showDeleteConfirm
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={showDeleteConfirm ? 'Klikk igjen for å bekrefte' : 'Slett oppskrift'}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">
                {showDeleteConfirm ? 'Bekreft sletting' : 'Slett'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MCAS Score Info Modal */}
      {showScoreInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Om MCAS Score</h2>
                <button
                  onClick={() => setShowScoreInfo(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Hva er MCAS Score?</h3>
                  <p className="text-gray-700">
                    MCAS Score er en beregnet verdi mellom 0-100 som indikerer hvor trygg en oppskrift er for MCAS-pasienter.
                    Høyere score betyr tryggere oppskrift.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Sikkerhetsnivåer</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                        Trygg
                      </div>
                      <span className="text-sm text-gray-700">80-100 poeng - Generelt godt tolerert</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="px-3 py-1 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
                        Forsiktig
                      </div>
                      <span className="text-sm text-gray-700">60-79 poeng - Moderat histamin/triggere</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="px-3 py-1 rounded-full text-xs font-medium border bg-orange-100 text-orange-800 border-orange-200">
                        Risikabel
                      </div>
                      <span className="text-sm text-gray-700">40-59 poeng - Høyt histamin, vær forsiktig</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="px-3 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                        Utrygg
                      </div>
                      <span className="text-sm text-gray-700">0-39 poeng - Veldig høyt histamin, unngå</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Hvordan beregnes scoren?</h3>
                  <p className="text-gray-700 mb-3">
                    MCAS Score starter på 100 poeng og trekker fra basert på ingrediensenes egenskaper:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-primary-600 mr-2">•</span>
                      <span><strong>-20 poeng</strong> per risikabel ingrediens (SIGHI-kompatibilitet 2-3)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-600 mr-2">•</span>
                      <span><strong>-15 poeng</strong> per trigger (histamin, histaminliberator, biogene aminer, etc.)</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Viktig å vite:</p>
                      <p>
                        MCAS Score er en veiledning basert på SIGHI-databasen. Individuell toleranse kan variere.
                        Bruk alltid egen erfaring og symptomlogg for å finne hva som fungerer best for deg.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowScoreInfo(false)}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Lukk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metadata cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* MCAS Score */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">MCAS Score</span>
            </div>
            <button
              onClick={() => setShowScoreInfo(true)}
              className="text-gray-400 hover:text-primary-600 transition-colors"
              title="Hva betyr MCAS Score?"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(recipe.calculated_mcas_score || 0)}`}>
            {(recipe.calculated_mcas_score || 0).toFixed(0)}
          </div>
          <div className={`mt-2 px-2 py-1 rounded-full text-xs font-medium border inline-block ${getSafetyColor(recipe.safety_level || 'safe')}`}>
            {getSafetyText(recipe.safety_level || 'safe')}
          </div>
        </div>

        {/* Servings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Porsjoner</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{recipe.servings}</div>
        </div>

        {/* Prep Time */}
        {recipe.prep_time_minutes && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Tilberedning</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{recipe.prep_time_minutes}</div>
            <div className="text-sm text-gray-500">minutter</div>
          </div>
        )}

        {/* Times Made */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <ChefHat className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Laget</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{recipe.times_made}</div>
          <div className="text-sm text-gray-500">ganger</div>
          {recipe.last_made_at && (
            <div className="text-xs text-gray-400 mt-1">
              Sist: {new Date(recipe.last_made_at).toLocaleDateString('nb-NO')}
            </div>
          )}
        </div>
      </div>

      {/* Sharing Toggle */}
      <div className="mb-6">
        <RecipeSharingToggle
          recipeId={recipe.id}
          isPublic={recipe.is_public}
          onChange={handleSharingChange}
        />
      </div>

      {/* Trigger Warnings */}
      {recipe.trigger_warnings && recipe.trigger_warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">Trigger-advarsler</h3>
              <div className="space-y-1">
                {recipe.trigger_warnings.map((warning, idx) => (
                  <div key={idx} className="text-sm text-amber-800">
                    • {warning}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Histamine Load */}
      {recipe.calculated_histamine_load !== undefined && recipe.calculated_histamine_load > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Histaminbelastning</h3>
              <p className="text-sm text-blue-800">
                Estimert total histamin: <strong>{recipe.calculated_histamine_load.toFixed(2)} mg</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Basert på biogene aminer i ingrediensene
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ingredients Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <CheckCircle className="w-6 h-6 text-primary-600" />
          <span>Ingredienser</span>
        </h2>
        <div className="space-y-2">
          {recipe.ingredients.map((ingredient: RecipeIngredient, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex-1">
                <span className="font-medium text-gray-900">
                  {ingredient.custom_name || `Matvare #${ingredient.food_id || (ingredient as any).foodId || 'ukjent'}`}
                </span>
              </div>
              <div className="text-gray-600">
                {ingredient.amount} {ingredient.unit}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
          Totalt {recipe.ingredients.length} ingrediens{recipe.ingredients.length !== 1 ? 'er' : ''}
        </div>
      </div>

      {/* Instructions Section */}
      {recipe.instructions && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Instruksjoner</h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {recipe.instructions}
          </div>
        </div>
      )}

      {/* Notes Section */}
      {recipe.notes && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Notater</h2>
          <div className="text-gray-700 whitespace-pre-wrap">
            {recipe.notes}
          </div>
        </div>
      )}

      {/* Action: Log Meal from Recipe */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200 p-6">
        <h3 className="text-lg font-semibold text-primary-900 mb-2">
          Logg måltid fra denne oppskriften
        </h3>
        <p className="text-sm text-primary-700 mb-4">
          Når du logger et måltid basert på denne oppskriften, blir alle ingredienser automatisk
          beregnet basert på hvor mange porsjoner du spiste.
        </p>
        <button
          onClick={() => navigate(`/dagbok?recipe=${id}`)}
          className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-medium"
        >
          Logg måltid fra oppskrift
        </button>
      </div>

      {/* Metadata footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            Opprettet: {new Date(recipe.created_at).toLocaleDateString('nb-NO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          {recipe.updated_at !== recipe.created_at && (
            <div>
              Oppdatert: {new Date(recipe.updated_at).toLocaleDateString('nb-NO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
