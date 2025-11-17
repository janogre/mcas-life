import React from 'react';
import { Heart, Clock, Users, ChefHat, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import type { McasRecipe } from '../../types/shared';

interface RecipeCardProps {
  recipe: McasRecipe;
  onClick: (recipe: McasRecipe) => void;
}

const SAFETY_LEVEL_CONFIG = {
  safe: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    label: 'Trygg',
    icon: CheckCircle
  },
  caution: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    label: 'Forsiktig',
    icon: AlertTriangle
  },
  risky: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    label: 'Risikabel',
    icon: AlertTriangle
  },
  unsafe: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    label: 'Utrygg',
    icon: Shield
  }
};

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const safetyConfig = SAFETY_LEVEL_CONFIG[recipe.safetyLevel];
  const SafetyIcon = safetyConfig.icon;

  return (
    <div
      onClick={() => onClick(recipe)}
      className={`bg-white rounded-lg border-2 ${safetyConfig.borderColor} overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group`}
    >
      {/* Recipe Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* MCAS Score Badge */}
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full ${safetyConfig.bgColor} ${safetyConfig.color} font-bold shadow-lg flex items-center space-x-1`}>
          <SafetyIcon className="w-4 h-4" />
          <span>{recipe.mcasScore}/100</span>
        </div>

        {/* Safety Level Badge */}
        <div className={`absolute bottom-3 left-3 px-3 py-1 rounded-full ${safetyConfig.bgColor} ${safetyConfig.color} font-medium shadow-lg`}>
          {safetyConfig.label}
        </div>
      </div>

      {/* Recipe Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {recipe.title}
        </h3>

        {/* Ingredient Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>{recipe.usedIngredientCount} brukt</span>
          </div>
          <div className="flex items-center space-x-1">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span>{recipe.missedIngredientCount} mangler</span>
          </div>
        </div>

        {/* Safe/Risky Ingredients Summary */}
        <div className="space-y-1 mb-3">
          {recipe.safeIngredients.length > 0 && (
            <div className="text-xs">
              <span className="font-medium text-green-700">Trygge:</span>{' '}
              <span className="text-gray-600">{recipe.safeIngredients.slice(0, 3).join(', ')}</span>
              {recipe.safeIngredients.length > 3 && <span className="text-gray-500"> +{recipe.safeIngredients.length - 3} flere</span>}
            </div>
          )}
          {recipe.riskyIngredients.length > 0 && (
            <div className="text-xs">
              <span className="font-medium text-red-700">Risikable:</span>{' '}
              <span className="text-gray-600">{recipe.riskyIngredients.slice(0, 2).join(', ')}</span>
              {recipe.riskyIngredients.length > 2 && <span className="text-gray-500"> +{recipe.riskyIngredients.length - 2} flere</span>}
            </div>
          )}
        </div>

        {/* Trigger Warnings */}
        {recipe.triggerWarnings.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-3">
            <div className="flex items-start space-x-1">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <span className="font-medium">Advarsel:</span>{' '}
                {recipe.triggerWarnings[0]}
                {recipe.triggerWarnings.length > 1 && ` (+${recipe.triggerWarnings.length - 1} flere)`}
              </div>
            </div>
          </div>
        )}

        {/* Likes */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-1">
            <Heart className="w-4 h-4" />
            <span>{recipe.likes} liker</span>
          </div>
          <div className="text-primary-600 font-medium group-hover:underline">
            Se oppskrift →
          </div>
        </div>
      </div>
    </div>
  );
}
