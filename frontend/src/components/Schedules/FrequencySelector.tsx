/**
 * FrequencySelector - Select schedule frequency pattern
 */

import React from 'react';
import { FREQUENCY_TYPE_NAMES_NO, WEEKDAY_NAMES_NO } from '../../types/shared';
import type { FrequencyType, IntervalUnit } from '../../types/shared';

export interface FrequencyConfig {
  type: FrequencyType;
  weeklyDays?: number[];
  intervalCount?: number;
  intervalUnit?: IntervalUnit;
}

interface FrequencySelectorProps {
  value: FrequencyConfig;
  onChange: (config: FrequencyConfig) => void;
}

const FrequencySelector: React.FC<FrequencySelectorProps> = ({ value, onChange }) => {
  const handleTypeChange = (type: FrequencyType) => {
    onChange({
      type,
      weeklyDays: type === 'weekly' ? [1] : undefined,
      intervalCount: type === 'interval' ? 1 : undefined,
      intervalUnit: type === 'interval' ? 'days' : undefined
    });
  };

  const handleWeekdayToggle = (day: number) => {
    const current = value.weeklyDays || [];
    const newDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => a - b);

    onChange({ ...value, weeklyDays: newDays });
  };

  const handleIntervalCountChange = (count: number) => {
    onChange({ ...value, intervalCount: Math.max(1, count) });
  };

  const handleIntervalUnitChange = (unit: IntervalUnit) => {
    onChange({ ...value, intervalUnit: unit });
  };

  return (
    <div className="space-y-4">
      {/* Frequency Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Frekvens
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['daily', 'weekly', 'interval'] as FrequencyType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                value.type === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {FREQUENCY_TYPE_NAMES_NO[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Days Selection */}
      {value.type === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Velg ukedager
          </label>
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAY_NAMES_NO.map((day, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleWeekdayToggle(index)}
                className={`px-2 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  value.weeklyDays?.includes(index)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
          {value.weeklyDays && value.weeklyDays.length === 0 && (
            <p className="mt-2 text-sm text-red-600">Velg minst én ukedag</p>
          )}
        </div>
      )}

      {/* Interval Configuration */}
      {value.type === 'interval' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Intervall
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Hver</span>
            <input
              type="number"
              min="1"
              max="365"
              value={value.intervalCount || 1}
              onChange={(e) => handleIntervalCountChange(parseInt(e.target.value))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={value.intervalUnit || 'days'}
              onChange={(e) => handleIntervalUnitChange(e.target.value as IntervalUnit)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="days">dag(er)</option>
              <option value="weeks">uke(r)</option>
            </select>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-700 mb-1">Forhåndsvisning:</p>
        <p className="text-sm text-gray-600">
          {value.type === 'daily' && 'Gjentar hver dag'}
          {value.type === 'weekly' && value.weeklyDays && value.weeklyDays.length > 0 && (
            <>
              Gjentar hver {value.weeklyDays.map(d => WEEKDAY_NAMES_NO[d]).join(', ')}
            </>
          )}
          {value.type === 'weekly' && (!value.weeklyDays || value.weeklyDays.length === 0) && (
            'Velg ukedager'
          )}
          {value.type === 'interval' && value.intervalCount && value.intervalUnit && (
            <>
              Gjentar hver {value.intervalCount}{' '}
              {value.intervalCount === 1
                ? value.intervalUnit === 'days' ? 'dag' : 'uke'
                : value.intervalUnit === 'days' ? 'dager' : 'uker'
              }
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default FrequencySelector;
