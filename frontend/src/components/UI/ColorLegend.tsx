import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface ColorLegendProps {
  type?: 'compatibility' | 'severity';
  compact?: boolean;
  showTitle?: boolean;
}

/**
 * Color Legend Component
 * Explains the color coding used throughout the app
 */
export function ColorLegend({ type = 'compatibility', compact = false, showTitle = true }: ColorLegendProps) {
  if (type === 'compatibility') {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        {showTitle && (
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">SIGHI Kompatibilitetsskala</h3>
          </div>
        )}
        <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-3'}`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <div className={compact ? 'text-xs' : 'text-sm'}>
              <span className="font-medium text-green-900">0 - Trygg:</span>
              <span className="text-green-700 ml-1">Godt tolerert, lav histamin</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className={compact ? 'text-xs' : 'text-sm'}>
              <span className="font-medium text-yellow-900">1 - Medium:</span>
              <span className="text-yellow-700 ml-1">Moderat histamin, forsiktighet</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <div className={compact ? 'text-xs' : 'text-sm'}>
              <span className="font-medium text-orange-900">2 - Inkompatibel:</span>
              <span className="text-orange-700 ml-1">Høy histamin, unngå</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className={compact ? 'text-xs' : 'text-sm'}>
              <span className="font-medium text-red-900">3 - Alvorlig:</span>
              <span className="text-red-700 ml-1">Svært høy histamin, strengt unngå</span>
            </div>
          </div>
        </div>
        {!compact && (
          <p className="text-xs text-blue-700 mt-3 italic">
            SIGHI-skalaen er basert på det sveitsiske interesse- og kompetansesenteret for histaminintoleranse (SIGHI).
            Dette er offisielle retningslinjer for MCAS-pasienter.
          </p>
        )}
      </div>
    );
  }

  // Severity legend
  return (
    <div className={`bg-purple-50 border border-purple-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-purple-900">Alvorlighetsgrad</h3>
        </div>
      )}
      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 gap-3'}`}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <div className={compact ? 'text-xs' : 'text-sm'}>
            <span className="font-medium text-green-900">1-4 - Mild:</span>
            <span className="text-green-700 ml-1">Lett ubehag, kan fortsette daglige aktiviteter</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className={compact ? 'text-xs' : 'text-sm'}>
            <span className="font-medium text-yellow-900">5-7 - Moderat:</span>
            <span className="text-yellow-700 ml-1">Merkbart ubehag, påvirker funksjon</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className={compact ? 'text-xs' : 'text-sm'}>
            <span className="font-medium text-red-900">8-10 - Alvorlig:</span>
            <span className="text-red-700 ml-1">Kraftig ubehag, krever behandling</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline color indicator with tooltip
 * Useful for showing color meaning in tight spaces
 */
interface ColorIndicatorProps {
  level: 0 | 1 | 2 | 3;
  type?: 'compatibility' | 'severity';
}

export function ColorIndicator({ level, type = 'compatibility' }: ColorIndicatorProps) {
  const compatibilityConfig = {
    0: { color: 'bg-green-500', label: 'Trygg (0)', description: 'Godt tolerert, lav histamin' },
    1: { color: 'bg-yellow-500', label: 'Medium (1)', description: 'Moderat histamin, vær forsiktig' },
    2: { color: 'bg-orange-500', label: 'Inkompatibel (2)', description: 'Høy histamin, bør unngås' },
    3: { color: 'bg-red-500', label: 'Alvorlig (3)', description: 'Svært høy histamin, strengt unngå' },
  };

  const config = compatibilityConfig[level];

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white border"
      title={`${config.label}: ${config.description}`}
    >
      <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
      <span>{config.label}</span>
    </div>
  );
}
