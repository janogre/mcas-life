import React, { useState, useEffect } from 'react';
import { airthingsApi } from '../../lib/api';

interface Room {
  id: string;
  name: string;
  deviceType?: string;
}

interface RoomExposure {
  room_id: string;
  room_name: string;
  time_spent_minutes?: number;
}

interface RoomExposureSelectorProps {
  onComplete: (rooms: RoomExposure[]) => void;
  onSkip: () => void;
}

export const RoomExposureSelector: React.FC<RoomExposureSelectorProps> = ({ onComplete, onSkip }) => {
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [timeEstimates, setTimeEstimates] = useState<{ [roomId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await airthingsApi.getStatus();

      // Check if Airthings is configured
      if (!response.success || !response.data?.configured) {
        setAvailableRooms([]);
        setError(null); // Not an error, just not configured
        setLoading(false);
        return;
      }

      const devices = response.data.devices || [];

      const rooms: Room[] = devices.map((device: any) => ({
        id: device.id,
        name: device.segment?.name || device.deviceType || 'Unknown Room',
        deviceType: device.deviceType,
      }));

      setAvailableRooms(rooms);
      setError(null);
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Kunne ikke laste rom fra Airthings');
    } finally {
      setLoading(false);
    }
  };

  const toggleRoom = (roomId: string) => {
    const newSelected = new Set(selectedRooms);
    if (newSelected.has(roomId)) {
      newSelected.delete(roomId);
      const newEstimates = { ...timeEstimates };
      delete newEstimates[roomId];
      setTimeEstimates(newEstimates);
    } else {
      newSelected.add(roomId);
    }
    setSelectedRooms(newSelected);
  };

  const updateTimeEstimate = (roomId: string, minutes: number) => {
    setTimeEstimates((prev) => ({
      ...prev,
      [roomId]: minutes,
    }));
  };

  const handleComplete = () => {
    const roomExposures: RoomExposure[] = Array.from(selectedRooms).map((roomId) => {
      const room = availableRooms.find((r) => r.id === roomId);
      return {
        room_id: roomId,
        room_name: room?.name || 'Unknown',
        time_spent_minutes: timeEstimates[roomId],
      };
    });

    onComplete(roomExposures);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 mb-3">{error}</p>
          <button
            onClick={loadRooms}
            className="text-sm text-yellow-600 hover:text-yellow-800 underline"
          >
            Prøv igjen
          </button>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Hopp over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Hvilke rom har du vært i?</h3>
        <p className="text-sm text-gray-600">
          Velg rom du har oppholdt deg i de siste 2 timene. Dette hjelper oss koble symptomer med
          inneklima.
        </p>
      </div>

      {/* Room List */}
      {availableRooms.length > 0 ? (
        <div className="space-y-3 mb-6">
          {availableRooms.map((room) => {
            const isSelected = selectedRooms.has(room.id);
            const timeSpent = timeEstimates[room.id] || 30;

            return (
              <div
                key={room.id}
                className={`border-2 rounded-lg transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Room Selection Button */}
                <button
                  onClick={() => toggleRoom(room.id)}
                  className="w-full px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{room.name}</div>
                      {room.deviceType && (
                        <div className="text-xs text-gray-500">{room.deviceType}</div>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="text-sm font-medium text-blue-600">
                      ~{timeSpent} min
                    </div>
                  )}
                </button>

                {/* Time Estimate Slider (shown when selected) */}
                {isSelected && (
                  <div className="px-4 pb-3 pt-1">
                    <label className="text-xs text-gray-600 mb-2 block">
                      Hvor lenge var du i rommet?
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">5 min</span>
                      <input
                        type="range"
                        min="5"
                        max="120"
                        step="5"
                        value={timeSpent}
                        onChange={(e) => updateTimeEstimate(room.id, parseInt(e.target.value))}
                        className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-gray-500">2 timer</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">Ingen Airthings-rom tilgjengelig</p>
          <p className="text-sm">Koble til Airthings i innstillinger for å spore inneklima</p>
        </div>
      )}

      {/* Summary */}
      {selectedRooms.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-900">
            <strong>{selectedRooms.size}</strong> rom valgt
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Hopp over
        </button>
        <button
          onClick={handleComplete}
          disabled={selectedRooms.size === 0}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Fortsett</span>
        </button>
      </div>

      {/* Helper Text */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        Tidene er estimater og brukes til å vekte luftkvalitetsdata
      </p>
    </div>
  );
};
