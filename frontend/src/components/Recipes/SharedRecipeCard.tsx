/**
 * SharedRecipeCard - Display shared community recipe with social features
 *
 * Features:
 * - Recipe title, description, MCAS score
 * - Author attribution with link to profile
 * - Like button with count
 * - Save button to copy to collection
 * - Safety level indicator
 * - Trigger warnings
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Save, User, Clock, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import type { UserRecipeWithAuthor } from '../../types/shared';
import { userRecipesApi } from '../../lib/api';

interface SharedRecipeCardProps {
  recipe: UserRecipeWithAuthor;
  onLike?: (recipeId: number, isLiked: boolean) => void;
  onSave?: (recipeId: number) => void;
}

export function SharedRecipeCard({ recipe, onLike, onSave }: SharedRecipeCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localIsLiked, setLocalIsLiked] = useState(recipe.is_liked || false);
  const [localLikesCount, setLocalLikesCount] = useState(recipe.likes_count);

  // MCAS score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  // Safety level display
  const getSafetyBadge = (level: string) => {
    const badges = {
      safe: { text: 'Trygg', color: 'bg-green-100 text-green-800' },
      caution: { text: 'Forsiktig', color: 'bg-yellow-100 text-yellow-800' },
      risky: { text: 'Risikabel', color: 'bg-orange-100 text-orange-800' },
      unsafe: { text: 'Utrygg', color: 'bg-red-100 text-red-800' }
    };
    return badges[level as keyof typeof badges] || badges.caution;
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation

    if (isLiking) return;
    setIsLiking(true);

    try {
      let result;
      if (localIsLiked) {
        result = await userRecipesApi.unlikeRecipe(recipe.id);
      } else {
        result = await userRecipesApi.likeRecipe(recipe.id);
      }

      setLocalIsLiked(result.liked);
      setLocalLikesCount(result.likes_count);

      if (onLike) {
        onLike(recipe.id, result.liked);
      }
    } catch (error) {
      console.error('Failed to like recipe:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation

    if (isSaving) return;
    setIsSaving(true);

    try {
      await userRecipesApi.saveCopy(recipe.id);

      if (onSave) {
        onSave(recipe.id);
      }

      alert('Oppskrift lagret til dine oppskrifter!');
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Kunne ikke lagre oppskrift. Prøv igjen.');
    } finally {
      setIsSaving(false);
    }
  };

  const safetyBadge = getSafetyBadge(recipe.safety_level);

  return (
    <Link
      to={`/mine-oppskrifter/${recipe.id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
    >
      {/* Header with MCAS Score */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {recipe.title}
            </h3>

            {/* Author */}
            <Link
              to={`/users/${recipe.author.id}/recipes`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 mt-1"
            >
              <User className="w-3 h-3" />
              <span>Laget av {recipe.author.first_name}</span>
            </Link>
          </div>

          {/* MCAS Score Badge */}
          <div className={`px-3 py-1 rounded-full border ${getScoreColor(recipe.calculated_mcas_score)} flex-shrink-0`}>
            <span className="text-sm font-semibold">{Math.round(recipe.calculated_mcas_score)}</span>
            <span className="text-xs ml-1">MCAS</span>
          </div>
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {recipe.description}
          </p>
        )}
      </div>

      {/* Meta Information */}
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          {/* Servings */}
          <div className="flex items-center gap-1">
            <UtensilsCrossed className="w-3 h-3" />
            <span>{recipe.servings} porsjoner</span>
          </div>

          {/* Prep Time */}
          {recipe.prep_time_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{recipe.prep_time_minutes} min</span>
            </div>
          )}

          {/* Safety Level */}
          <span className={`px-2 py-0.5 rounded ${safetyBadge.color} font-medium`}>
            {safetyBadge.text}
          </span>
        </div>

        {/* Times Made */}
        {recipe.times_made > 0 && (
          <span className="text-gray-500">
            Laget {recipe.times_made} {recipe.times_made === 1 ? 'gang' : 'ganger'}
          </span>
        )}
      </div>

      {/* Trigger Warnings */}
      {recipe.trigger_warnings && recipe.trigger_warnings.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 mb-1">Advarsler:</p>
              <div className="flex flex-wrap gap-1">
                {recipe.trigger_warnings.slice(0, 3).map((warning, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs"
                  >
                    {warning}
                  </span>
                ))}
                {recipe.trigger_warnings.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{recipe.trigger_warnings.length - 3} mer
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        {/* Like Button */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            localIsLiked
              ? 'text-red-600 bg-red-50 hover:bg-red-100'
              : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Heart
            className={`w-4 h-4 ${localIsLiked ? 'fill-current' : ''}`}
          />
          <span className="text-sm font-medium">
            {localLikesCount} {localLikesCount === 1 ? 'like' : 'likes'}
          </span>
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isSaving ? 'Lagrer...' : 'Lagre'}
          </span>
        </button>
      </div>
    </Link>
  );
}
