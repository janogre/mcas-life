/**
 * MultiTimePicker - Select multiple times during the day
 */

import React, { useState } from 'react';

interface MultiTimePickerProps {
  times: string[]; // ["08:00", "12:00", "18:00"]
  onChange: (times: string[]) => void;
}

const MultiTimePicker: React.FC<MultiTimePickerProps> = ({ times, onChange }) => {
  const [showAddTime, setShowAddTime] = useState(false);
  const [newTime, setNewTime] = useState('08:00');

  const handleAddTime = () => {
    if (!times.includes(newTime)) {
      const updatedTimes = [...times, newTime].sort();
      onChange(updatedTimes);
      setNewTime('08:00');
      setShowAddTime(false);
    }
  };

  const handleRemoveTime = (timeToRemove: string) => {
    onChange(times.filter(t => t !== timeToRemove));
  };

  const commonTimes = [
    { label: 'Morgen (08:00)', value: '08:00' },
    { label: 'Formiddag (10:00)', value: '10:00' },
    { label: 'Lunsj (12:00)', value: '12:00' },
    { label: 'Ettermiddag (15:00)', value: '15:00' },
    { label: 'Kveld (18:00)', value: '18:00' },
    { label: 'Natt (20:00)', value: '20:00' },
    { label: 'Sengetid (22:00)', value: '22:00' }
  ];

  return (
    <div className="space-y-4">
      {/* Selected Times */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tidspunkter ({times.length})
        </label>

        {times.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">Legg til minst ett tidspunkt</p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {times.map((time) => (
            <div
              key={time}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-blue-900">{time}</span>
              <button
                type="button"
                onClick={() => handleRemoveTime(time)}
                className="ml-1 text-blue-600 hover:text-blue-800"
                aria-label={`Fjern ${time}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Time Section */}
      {!showAddTime ? (
        <button
          type="button"
          onClick={() => setShowAddTime(true)}
          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Legg til tid
        </button>
      ) : (
        <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Legg til nytt tidspunkt
          </label>

          {/* Quick Time Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {commonTimes
              .filter(ct => !times.includes(ct.value))
              .slice(0, 6)
              .map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => {
                    onChange([...times, ct.value].sort());
                    setShowAddTime(false);
                  }}
                  className="px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                >
                  {ct.label}
                </button>
              ))}
          </div>

          {/* Custom Time Input */}
          <div className="flex gap-2">
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleAddTime}
              disabled={times.includes(newTime)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Legg til
            </button>
            <button
              type="button"
              onClick={() => setShowAddTime(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Avbryt
            </button>
          </div>

          {times.includes(newTime) && (
            <p className="mt-2 text-sm text-red-600">Dette tidspunktet er allerede lagt til</p>
          )}
        </div>
      )}

      {/* Timeline Visualization */}
      {times.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-700 mb-2">Tidslinje:</p>
          <div className="relative h-8 bg-white rounded-full border border-gray-200">
            {times.map((time) => {
              const [hours, minutes] = time.split(':').map(Number);
              const totalMinutes = hours * 60 + minutes;
              const percentage = (totalMinutes / (24 * 60)) * 100;

              return (
                <div
                  key={time}
                  className="absolute top-0 bottom-0 w-1 bg-blue-500 rounded-full"
                  style={{ left: `${percentage}%` }}
                  title={time}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 whitespace-nowrap">
                    {time}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>00:00</span>
            <span>12:00</span>
            <span>24:00</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiTimePicker;
