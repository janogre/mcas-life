/**
 * ScheduleCalendarPage - Calendar view for managing schedule instances
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { schedulesApi } from '../../lib/api';
import { SCHEDULE_TYPE_NAMES_NO, WEEKDAY_NAMES_NO } from '../../types/shared';

const ScheduleCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Fetch schedule details
  const { data: schedule } = useQuery(
    ['schedule', id],
    () => schedulesApi.getSchedule(parseInt(id!)),
    { enabled: !!id }
  );

  // Fetch calendar data for current month
  const { data: calendarData, isLoading } = useQuery(
    ['calendar', id, year, month],
    () => schedulesApi.getCalendarMonth(parseInt(id!), year, month),
    { enabled: !!id }
  );

  // Skip instance mutation
  const skipMutation = useMutation({
    mutationFn: ({ date, time, reason }: { date: string; time: string; reason?: string }) =>
      schedulesApi.skipInstance(parseInt(id!), date, time, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['calendar', id, year, month]);
      await queryClient.refetchQueries(['calendar', id, year, month]);
      await queryClient.invalidateQueries(['upcoming-instances']);
      setShowSkipModal(false);
      setSkipReason('');
      setSelectedTime(null);
    }
  });

  // Unskip instance mutation
  const unskipMutation = useMutation({
    mutationFn: ({ date, time }: { date: string; time: string }) =>
      schedulesApi.unskipInstance(parseInt(id!), date, time),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['calendar', id, year, month]);
      await queryClient.refetchQueries(['calendar', id, year, month]);
      await queryClient.invalidateQueries(['upcoming-instances']);
    }
  });

  // Calendar navigation
  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Generate calendar days
  const calendarDays: Array<{ day: number | null; date: string | null }> = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push({ day: null, date: null });
  }

  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({ day, date });
  }

  // Get instance data for a specific date
  const getDateData = (date: string | null) => {
    if (!date || !calendarData) return null;
    return calendarData.instances.find(inst => inst.date === date);
  };

  // Check if date is in pause period
  const isDatePaused = (date: string | null) => {
    if (!date || !calendarData) return false;
    return calendarData.pauses.some(
      pause => date >= pause.start_date && date <= pause.end_date
    );
  };

  // Get selected date details
  const selectedDateData = selectedDate ? getDateData(selectedDate) : null;
  const isSelectedDatePaused = selectedDate ? isDatePaused(selectedDate) : false;

  const handleSkip = (time: string) => {
    if (!selectedDate) return;
    setSelectedTime(time);
    setShowSkipModal(true);
  };

  const confirmSkip = () => {
    if (!selectedDate || !selectedTime) return;
    skipMutation.mutate({
      date: selectedDate,
      time: selectedTime,
      reason: skipReason.trim() || undefined
    });
  };

  const handleUnskip = (time: string) => {
    if (!selectedDate) return;
    unskipMutation.mutate({ date: selectedDate, time });
  };

  if (!schedule) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laster...</p>
        </div>
      </div>
    );
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
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
                <h1 className="text-xl font-bold text-gray-900">Kalender</h1>
                <p className="text-sm text-gray-600">
                  {SCHEDULE_TYPE_NAMES_NO[schedule.schedule_type]}
                  {schedule.medication_custom_name && ` - ${schedule.medication_custom_name}`}
                </p>
              </div>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={previousMonth}
              className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              ← Forrige
            </button>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold capitalize">{monthName}</h2>
              <button
                onClick={goToToday}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
              >
                I dag
              </button>
            </div>
            <button
              onClick={nextMonth}
              className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Neste →
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {WEEKDAY_NAMES_NO.map((day, i) => (
                  <div key={i} className="py-2 text-center text-sm font-medium text-gray-600">
                    {day.substring(0, 3)}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((cell, index) => {
                  if (!cell.day || !cell.date) {
                    return <div key={index} className="aspect-square border-b border-r border-gray-100" />;
                  }

                  const dateData = getDateData(cell.date);
                  const isPaused = isDatePaused(cell.date);
                  const isSelected = selectedDate === cell.date;
                  const isToday = cell.date === new Date().toISOString().split('T')[0];
                  const hasInstances = dateData && dateData.times.length > 0;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(cell.date)}
                      className={`aspect-square border-b border-r border-gray-100 p-2 transition-colors ${
                        isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'
                      } ${isPaused ? 'bg-orange-50' : ''}`}
                    >
                      <div className="h-full flex flex-col">
                        <span className={`text-sm ${isToday ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                          {cell.day}
                        </span>
                        {hasInstances && (
                          <div className="mt-1 flex flex-wrap gap-0.5">
                            {dateData.statuses.map((status, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  status === 'skipped' ? 'bg-red-400' : 'bg-green-400'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        {isPaused && !hasInstances && (
                          <div className="mt-1 text-xs text-orange-600">⏸️</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <h3 className="font-semibold mb-2">Forklaring:</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span>Planlagt</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <span>Hoppet over</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-orange-600">⏸️</div>
                  <span>Pause-periode</span>
                </div>
              </div>
            </div>

            {/* Selected date details */}
            {selectedDate && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('nb-NO', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </h3>

                {isSelectedDatePaused ? (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-orange-800">
                      ⏸️ Schedule er pauset denne dagen
                    </p>
                  </div>
                ) : selectedDateData ? (
                  <div className="space-y-3">
                    {selectedDateData.times.map((time, index) => {
                      const status = selectedDateData.statuses[index];
                      const isSkipped = status === 'skipped';

                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isSkipped ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">{time}</span>
                            {isSkipped && (
                              <span className="text-sm text-red-600">(Hoppet over)</span>
                            )}
                          </div>

                          {isSkipped ? (
                            <button
                              onClick={() => handleUnskip(time)}
                              disabled={unskipMutation.isLoading}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300"
                            >
                              Angre
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSkip(time)}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                              Hopp over
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-600">Ingen planlagte tidspunkter denne dagen</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Skip modal */}
      {showSkipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Hopp over tidspunkt</h3>
            <p className="text-gray-600 mb-4">
              Hopper over {selectedTime} den {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('nb-NO')}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grunn (valgfritt)
              </label>
              <textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="F.eks. glemt, syk, på reise..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSkipModal(false);
                  setSkipReason('');
                  setSelectedTime(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={confirmSkip}
                disabled={skipMutation.isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300"
              >
                {skipMutation.isLoading ? 'Hopper over...' : 'Bekreft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendarPage;
