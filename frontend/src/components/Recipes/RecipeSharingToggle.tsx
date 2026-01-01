/**
 * RecipeSharingToggle - Toggle recipe public/private status
 *
 * Features:
 * - Visual toggle switch (ON = public, OFF = private)
 * - Globe icon for public, Lock icon for private
 * - Label: "Del med fellesskapet"
 * - Loading state during toggle
 */

import React, { useState } from 'react';
import { Globe, Lock } from 'lucide-react';
import { userRecipesApi } from '../../lib/api';

interface RecipeSharingToggleProps {
  recipeId: number;
  isPublic: boolean;
  onChange?: (isPublic: boolean) => void;
}

export function RecipeSharingToggle({ recipeId, isPublic, onChange }: RecipeSharingToggleProps) {
  const [localIsPublic, setLocalIsPublic] = useState(isPublic);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (isToggling) return;

    const newValue = !localIsPublic;

    // Optimistic update
    setLocalIsPublic(newValue);
    setIsToggling(true);

    try {
      await userRecipesApi.toggleSharing(recipeId, newValue);

      if (onChange) {
        onChange(newValue);
      }
    } catch (error) {
      console.error('Failed to toggle recipe sharing:', error);
      // Revert on error
      setLocalIsPublic(!newValue);
      alert('Kunne ikke endre delingsinnstilling. Prøv igjen.');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        {localIsPublic ? (
          <Globe className="w-5 h-5 text-primary-600" />
        ) : (
          <Lock className="w-5 h-5 text-gray-500" />
        )}

        <div>
          <p className="text-sm font-medium text-gray-900">
            Del med fellesskapet
          </p>
          <p className="text-xs text-gray-600">
            {localIsPublic
              ? 'Oppskriften er offentlig og kan sees av andre'
              : 'Oppskriften er privat og kun synlig for deg'}
          </p>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={handleToggle}
        disabled={isToggling}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          localIsPublic ? 'bg-primary-600' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={localIsPublic}
        aria-label="Del med fellesskapet"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            localIsPublic ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
