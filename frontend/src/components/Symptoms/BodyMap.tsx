import React, { useState } from 'react';

export interface BodyRegion {
  id: string;
  name: string;
  path: string; // SVG path data
}

// Comprehensive body regions for MCAS symptom mapping
export const BODY_REGIONS: BodyRegion[] = [
  // Head and neck
  { id: 'head', name: 'Hode', path: 'M50,10 L60,10 L62,20 L58,25 L52,25 L48,20 Z' },
  { id: 'face', name: 'Ansikt', path: 'M48,20 L52,20 L52,25 L48,25 Z' },
  { id: 'neck', name: 'Nakke/Hals', path: 'M48,25 L52,25 L52,30 L48,30 Z' },

  // Upper body - front
  { id: 'chest_left', name: 'Bryst venstre', path: 'M30,35 L45,35 L45,55 L30,55 Z' },
  { id: 'chest_right', name: 'Bryst høyre', path: 'M55,35 L70,35 L70,55 L55,55 Z' },
  { id: 'upper_abdomen', name: 'Øvre mage', path: 'M35,55 L65,55 L65,65 L35,65 Z' },
  { id: 'lower_abdomen', name: 'Nedre mage', path: 'M35,65 L65,65 L65,78 L35,78 Z' },

  // Arms
  { id: 'left_shoulder', name: 'Venstre skulder', path: 'M20,35 L30,35 L30,45 L20,45 Z' },
  { id: 'right_shoulder', name: 'Høyre skulder', path: 'M70,35 L80,35 L80,45 L70,45 Z' },
  { id: 'left_upper_arm', name: 'Venstre overarm', path: 'M18,45 L28,45 L28,60 L18,60 Z' },
  { id: 'right_upper_arm', name: 'Høyre overarm', path: 'M72,45 L82,45 L82,60 L72,60 Z' },
  { id: 'left_forearm', name: 'Venstre underarm', path: 'M16,60 L26,60 L26,78 L16,78 Z' },
  { id: 'right_forearm', name: 'Høyre underarm', path: 'M74,60 L84,60 L84,78 L74,78 Z' },
  { id: 'left_hand', name: 'Venstre hånd', path: 'M14,78 L24,78 L24,85 L14,85 Z' },
  { id: 'right_hand', name: 'Høyre hånd', path: 'M76,78 L86,78 L86,85 L76,85 Z' },

  // Legs
  { id: 'left_thigh', name: 'Venstre lår', path: 'M35,78 L45,78 L45,105 L35,105 Z' },
  { id: 'right_thigh', name: 'Høyre lår', path: 'M55,78 L65,78 L65,105 L55,105 Z' },
  { id: 'left_knee', name: 'Venstre kne', path: 'M35,105 L45,105 L45,112 L35,112 Z' },
  { id: 'right_knee', name: 'Høyre kne', path: 'M55,105 L65,105 L65,112 L55,112 Z' },
  { id: 'left_lower_leg', name: 'Venstre legg', path: 'M36,112 L44,112 L44,135 L36,135 Z' },
  { id: 'right_lower_leg', name: 'Høyre legg', path: 'M56,112 L64,112 L64,135 L56,135 Z' },
  { id: 'left_foot', name: 'Venstre fot', path: 'M34,135 L44,135 L44,142 L34,142 Z' },
  { id: 'right_foot', name: 'Høyre fot', path: 'M56,135 L64,135 L64,142 L56,142 Z' },

  // Back (shown on separate view)
  { id: 'upper_back', name: 'Øvre rygg', path: 'M135,35 L165,35 L165,55 L135,55 Z' },
  { id: 'lower_back', name: 'Nedre rygg', path: 'M135,55 L165,55 L165,75 L135,75 Z' },
];

interface BodyMapProps {
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
  multiSelect?: boolean;
  showLabels?: boolean;
}

export const BodyMap: React.FC<BodyMapProps> = ({
  selectedRegions,
  onChange,
  multiSelect = true,
  showLabels = true,
}) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [view, setView] = useState<'front' | 'back'>('front');

  const handleRegionClick = (regionId: string) => {
    if (multiSelect) {
      if (selectedRegions.includes(regionId)) {
        onChange(selectedRegions.filter((r) => r !== regionId));
      } else {
        onChange([...selectedRegions, regionId]);
      }
    } else {
      onChange([regionId]);
    }
  };

  const isRegionSelected = (regionId: string) => selectedRegions.includes(regionId);
  const isRegionHovered = (regionId: string) => hoveredRegion === regionId;

  const frontRegions = BODY_REGIONS.filter((r) => !r.id.includes('back'));
  const backRegions = BODY_REGIONS.filter((r) => r.id.includes('back'));
  const currentRegions = view === 'front' ? frontRegions : backRegions;

  return (
    <div className="flex flex-col items-center">
      {/* View Toggle */}
      <div className="mb-4 flex gap-2 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setView('front')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === 'front'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Foran
        </button>
        <button
          onClick={() => setView('back')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === 'back'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Bak
        </button>
      </div>

      {/* SVG Body Map */}
      <div className="relative bg-white rounded-lg shadow-lg p-6">
        <svg
          viewBox={view === 'front' ? '0 0 100 150' : '120 0 100 150'}
          className="w-80 h-auto"
          style={{ maxWidth: '320px' }}
        >
          {/* Body outline (simplified humanoid figure) */}
          <g className="body-outline" stroke="#e5e7eb" strokeWidth="1" fill="none">
            {view === 'front' ? (
              <>
                {/* Head */}
                <circle cx="50" cy="15" r="8" />
                {/* Neck */}
                <line x1="50" y1="23" x2="50" y2="30" />
                {/* Torso */}
                <rect x="35" y="30" width="30" height="48" rx="3" />
                {/* Arms */}
                <line x1="35" y1="35" x2="20" y2="45" strokeWidth="4" strokeLinecap="round" />
                <line x1="20" y1="45" x2="16" y2="78" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="65" y1="35" x2="80" y2="45" strokeWidth="4" strokeLinecap="round" />
                <line x1="80" y1="45" x2="84" y2="78" strokeWidth="3.5" strokeLinecap="round" />
                {/* Legs */}
                <line x1="40" y1="78" x2="40" y2="135" strokeWidth="5" strokeLinecap="round" />
                <line x1="60" y1="78" x2="60" y2="135" strokeWidth="5" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* Back view - similar structure */}
                <circle cx="150" cy="15" r="8" />
                <line x1="150" y1="23" x2="150" y2="30" />
                <rect x="135" y="30" width="30" height="48" rx="3" />
                <line x1="135" y1="35" x2="120" y2="45" strokeWidth="4" strokeLinecap="round" />
                <line x1="120" y1="45" x2="116" y2="78" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="165" y1="35" x2="180" y2="45" strokeWidth="4" strokeLinecap="round" />
                <line x1="180" y1="45" x2="184" y2="78" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="140" y1="78" x2="140" y2="135" strokeWidth="5" strokeLinecap="round" />
                <line x1="160" y1="78" x2="160" y2="135" strokeWidth="5" strokeLinecap="round" />
              </>
            )}
          </g>

          {/* Interactive Regions */}
          {currentRegions.map((region) => {
            const selected = isRegionSelected(region.id);
            const hovered = isRegionHovered(region.id);

            return (
              <g key={region.id}>
                <path
                  d={region.path}
                  fill={selected ? '#3b82f6' : hovered ? '#93c5fd' : 'rgba(59, 130, 246, 0.1)'}
                  stroke={selected ? '#2563eb' : hovered ? '#60a5fa' : '#bfdbfe'}
                  strokeWidth={selected ? '2' : '1'}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredRegion(region.id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() => handleRegionClick(region.id)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Label */}
        {hoveredRegion && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-1 rounded-md text-sm font-medium shadow-lg">
            {BODY_REGIONS.find((r) => r.id === hoveredRegion)?.name}
          </div>
        )}
      </div>

      {/* Selected Regions Pills */}
      {showLabels && selectedRegions.length > 0 && (
        <div className="mt-4 w-full max-w-md">
          <p className="text-sm font-medium text-gray-700 mb-2">Valgte områder:</p>
          <div className="flex flex-wrap gap-2">
            {selectedRegions.map((regionId) => {
              const region = BODY_REGIONS.find((r) => r.id === regionId);
              if (!region) return null;

              return (
                <span
                  key={regionId}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {region.name}
                  <button
                    onClick={() => handleRegionClick(regionId)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <p className="mt-3 text-xs text-gray-500 text-center max-w-sm">
        {multiSelect
          ? 'Klikk på kroppsområder for å velge hvor symptomene oppstår. Du kan velge flere.'
          : 'Klikk på et kroppsområde hvor symptomet oppstår.'}
      </p>
    </div>
  );
};
