/**
 * UserRecipeProfilePage - Display all public recipes from a specific user
 *
 * Features:
 * - User info header (name)
 * - Grid of their shared recipes
 * - Pagination support
 * - Like and save functionality
 * - Back navigation
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { ArrowLeft, User } from 'lucide-react';
import { userRecipesApi } from '../../lib/api';
import { SharedRecipeCard } from '../../components/Recipes/SharedRecipeCard';

export function UserRecipeProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const limit = 20;

  // Fetch user's public recipes
  const { data, isLoading, error, refetch } = useQuery(
    ['user-public-recipes', userId, page],
    () => userRecipesApi.getUserPublicRecipes(Number(userId), page, limit),
    {
      enabled: !!userId,
      staleTime: 30000,
    }
  );

  // Handle recipe interactions
  const handleLike = (recipeId: number, isLiked: boolean) => {
    refetch();
  };

  const handleSave = (recipeId: number) => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Laster oppskrifter...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/mine-oppskrifter')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake til oppskrifter</span>
        </button>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Kunne ikke laste brukerens oppskrifter.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Prøv igjen
          </button>
        </div>
      </div>
    );
  }

  const { recipes, user, total } = data;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/mine-oppskrifter')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Tilbake til oppskrifter</span>
      </button>

      {/* User header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.first_name}s oppskrifter
            </h1>
            <p className="text-gray-600 mt-1">
              {total} {total === 1 ? 'oppskrift' : 'oppskrifter'} delt med fellesskapet
            </p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {recipes.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ingen delte oppskrifter
          </h3>
          <p className="text-gray-600">
            Denne brukeren har ikke delt noen oppskrifter ennå.
          </p>
        </div>
      )}

      {/* Recipes grid */}
      {recipes.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {recipes.map((recipe) => (
              <SharedRecipeCard
                key={recipe.id}
                recipe={{
                  ...recipe,
                  author: user,
                  likes_count: 0, // Will be populated by backend if needed
                  is_liked: false, // Will be populated by backend if needed
                }}
                onLike={handleLike}
                onSave={handleSave}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Forrige
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-2 rounded-lg ${
                        page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Neste
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
