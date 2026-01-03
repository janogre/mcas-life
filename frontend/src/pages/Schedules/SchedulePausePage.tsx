/**
 * SchedulePausePage - Set temporary pause period for a schedule
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { schedulesApi } from '../../lib/api';
import { SCHEDULE_TYPE_NAMES_NO } from '../../types/shared';

const SchedulePausePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Fetch schedule details
  const { data: schedule, isLoading } = useQuery(
    ['schedule', id],
    () => schedulesApi.getSchedule(parseInt(id!)),
    { enabled: !!id }
  );

  // Fetch existing pauses
  const { data: pauses } = useQuery(
    ['pauses', id],
    () => schedulesApi.getPauses(parseInt(id!)),
    { enabled: !!id }
  );

  // Pause mutation
  const pauseMutation = useMutation({
    mutationFn: (data: { start_date: string; end_date: string; reason?: string }) =>
      schedulesApi.pauseSchedule(parseInt(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
      queryClient.invalidateQueries({ queryKey: ['pauses', id] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-instances'] });
      navigate('/schedules');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Det oppsto en feil ved pausingen.');
    }
  });

  // Resume mutation
  const resumeMutation = useMutation({
    mutationFn: (pauseId: number) =>
      schedulesApi.resumeSchedule(parseInt(id!), pauseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
      queryClient.invalidateQueries({ queryKey: ['pauses', id] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-instances'] });
    }
  });

  const handleSubmit = () => {
    setError('');

    // Validation
    if (!startDate || !endDate) {
      setError('Både startdato og sluttdato må fylles ut.');
      return;
    }

    if (endDate <= startDate) {
      setError('Sluttdato må være etter startdato.');
      return;
    }

    // Check for overlapping pauses
    if (pauses && pauses.length > 0) {
      const hasOverlap = pauses.some(pause => {
        return (
          (startDate >= pause.pause_start_date && startDate <= pause.pause_end_date) ||
          (endDate >= pause.pause_start_date && endDate <= pause.pause_end_date) ||
          (startDate <= pause.pause_start_date && endDate >= pause.pause_end_date)
        );
      });

      if (hasOverlap) {
        setError('Den valgte perioden overlapper med en eksisterende pause.');
        return;
      }
    }

    pauseMutation.mutate({
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || undefined
    });
  };

  const handleResume = async (pauseId: number) => {
    if (window.confirm('Er du sikker på at du vil gjenoppta denne perioden?')) {
      await resumeMutation.mutateAsync(pauseId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laster...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Schedule ikke funnet</p>
          <button
            onClick={() => navigate('/schedules')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Tilbake
          </button>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/schedules')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pause schedule</h1>
              <p className="text-sm text-gray-600">
                {SCHEDULE_TYPE_NAMES_NO[schedule.schedule_type]}
                {schedule.medication_custom_name && ` - ${schedule.medication_custom_name}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Existing Pauses */}
        {pauses && pauses.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Eksisterende pauser</h2>
            <div className="space-y-3">
              {pauses.map((pause) => (
                <div
                  key={pause.id}
                  className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-orange-900">
                      {new Date(pause.pause_start_date + 'T12:00:00').toLocaleDateString('nb-NO')} - {' '}
                      {new Date(pause.pause_end_date + 'T12:00:00').toLocaleDateString('nb-NO')}
                    </p>
                    {pause.reason && (
                      <p className="text-sm text-orange-700 mt-1">{pause.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleResume(pause.id)}
                    disabled={resumeMutation.isLoading}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300"
                  >
                    Gjenoppta
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Pause Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Ny pause-periode</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Startdato
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sluttdato
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || today}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grunn (valgfritt)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="F.eks. ferie, sykdom, reise..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ℹ️ Når en schedule er pauset vil ingen forekomster genereres i den valgte perioden.
              Påminnelser vil heller ikke sendes. Schedules gjenopptas automatisk etter sluttdato.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate('/schedules')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Avbryt
            </button>
            <button
              onClick={handleSubmit}
              disabled={pauseMutation.isLoading || !startDate || !endDate}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {pauseMutation.isLoading ? 'Pauser...' : '⏸️ Pause schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulePausePage;
