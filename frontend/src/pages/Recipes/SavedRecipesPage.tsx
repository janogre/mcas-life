import React, { useState, useEffect } from 'react';
import { BookmarkCheck, Trash2, Edit, ChefHat } from 'lucide-react';
import { recipeApi } from '../../lib/api';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { ErrorDisplay } from '../../components/UI/ErrorDisplay';
import type { SavedRecipe } from '../../types/shared';

export function SavedRecipesPage() {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<SavedRecipe | null>(null);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadSavedRecipes();
  }, []);

  const loadSavedRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const recipes = await recipeApi.getSavedRecipes();
      setSavedRecipes(recipes);
    } catch (err) {
      setError('Kunne ikke laste lagrede oppskrifter');
      console.error('Load saved recipes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recipeId: number) => {
    if (!confirm('Er du sikker på at du vil slette denne oppskriften?')) return;

    try {
      await recipeApi.deleteSavedRecipe(recipeId);
      await loadSavedRecipes();
    } catch (err) {
      alert('Kunne ikke slette oppskriften');
      console.error('Delete recipe error:', err);
    }
  };

  const handleSaveNotes = async (recipeId: number) => {
    try {
      await recipeApi.updateSavedRecipe(recipeId, { notes: editNotes });
      await loadSavedRecipes();
      setEditingRecipe(null);
    } catch (err) {
      alert('Kunne ikke lagre notater');
      console.error('Save notes error:', err);
    }
  };

  const handleIncrementTimesMade = async (recipeId: number) => {
    try {
      await recipeApi.incrementTimesMade(recipeId);
      await loadSavedRecipes();
    } catch (err) {
      alert('Kunne ikke oppdatere');
      console.error('Increment error:', err);
    }
  };

  const getSafetyLevelColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (score >= 40) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-red-100 text-red-700 border-red-300';
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
            <BookmarkCheck className="w-7 h-7 text-primary-600" />
            <span>Lagrede Oppskrifter</span>
          </h1>
          <p className="text-gray-600">
            Dine favorittoppskrifter med MCAS-analyse
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-primary-600">{savedRecipes.length}</div>
          <div className="text-sm text-gray-600">Lagrede Oppskrifter</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {savedRecipes.filter(r => r.mcas_score >= 80).length}
          </div>
          <div className="text-sm text-gray-600">Trygge Oppskrifter</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {savedRecipes.reduce((sum, r) => sum + r.times_made, 0)}
          </div>
          <div className="text-sm text-gray-600">Totalt Laget</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={loadSavedRecipes}
          showRetry={true}
        />
      )}

      {/* Recipe List */}
      {savedRecipes.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {savedRecipes.map((saved) => {
            const recipe = saved.recipe_data;
            const isEditing = editingRecipe?.id === saved.id;

            return (
              <div
                key={saved.id}
                className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Image */}
                {recipe.image && (
                  <div className="relative h-40">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute top-2 right-2 px-3 py-1 rounded-full border-2 font-bold ${getSafetyLevelColor(saved.mcas_score)}`}>
                      {saved.mcas_score}/100
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
                    {recipe.title}
                  </h3>

                  {/* Recipe Info */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    {recipe.readyInMinutes && (
                      <span>{recipe.readyInMinutes} min</span>
                    )}
                    {recipe.servings && (
                      <span>{recipe.servings} porsjoner</span>
                    )}
                  </div>

                  {/* Times Made */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-gray-600">
                      Laget: <span className="font-medium">{saved.times_made} ganger</span>
                    </div>
                    <button
                      onClick={() => handleIncrementTimesMade(saved.id)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + Jeg lagde denne
                    </button>
                  </div>

                  {/* Notes */}
                  {isEditing ? (
                    <div className="mb-3">
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        rows={2}
                        placeholder="Legg til notater..."
                      />
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={() => handleSaveNotes(saved.id)}
                          className="px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
                        >
                          Lagre
                        </button>
                        <button
                          onClick={() => setEditingRecipe(null)}
                          className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  ) : saved.notes ? (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
                      {saved.notes}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setEditingRecipe(saved);
                        setEditNotes(saved.notes);
                      }}
                      className="flex items-center space-x-1 text-sm text-gray-600 hover:text-primary-600"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Rediger</span>
                    </button>
                    <button
                      onClick={() => handleDelete(saved.id)}
                      className="flex items-center space-x-1 text-sm text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Slett</span>
                    </button>
                    {recipe.sourceUrl && (
                      <a
                        href={recipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline font-medium"
                      >
                        Se oppskrift →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ingen lagrede oppskrifter
          </h3>
          <p className="text-gray-600 mb-4">
            Søk etter oppskrifter og lagre favorittene dine
          </p>
          <a
            href="/recipes/search"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <ChefHat className="w-5 h-5" />
            <span>Søk Oppskrifter</span>
          </a>
        </div>
      )}
    </div>
  );
}
