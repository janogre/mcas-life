/**
 * ScheduleEditPage - Edit existing schedule
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { schedulesApi } from '../../lib/api';
import FrequencySelector, { type FrequencyConfig } from '../../components/Schedules/FrequencySelector';
import MultiTimePicker from '../../components/Schedules/MultiTimePicker';
import type { CreateScheduleInput, ScheduleType, MedicationType, MealType, ActivityType } from '../../types/shared';
import {
  SCHEDULE_TYPE_NAMES_NO,
  MEAL_TYPE_NAMES_NO,
  MEDICATION_TYPE_NAMES_NO,
  ACTIVITY_TYPE_NAMES_NO
} from '../../types/shared';

const ScheduleEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Fetch existing schedule
  const { data: schedule, isLoading } = useQuery(
    ['schedule', id],
    () => schedulesApi.getSchedule(parseInt(id!)),
    { enabled: !!id }
  );

  // Form state
  const [medicationName, setMedicationName] = useState('');
  const [medicationType, setMedicationType] = useState<MedicationType>('mcas');
  const [dosage, setDosage] = useState('');
  const [dosageUnit, setDosageUnit] = useState('mg');

  const [mealType, setMealType] = useState<MealType>('breakfast');

  const [activityType, setActivityType] = useState<ActivityType>('physical_activity');
  const [activityDuration, setActivityDuration] = useState(30);

  const [frequency, setFrequency] = useState<FrequencyConfig>({
    type: 'daily'
  });

  const [times, setTimes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // Populate form when schedule loads
  useEffect(() => {
    if (schedule) {
      // Medication fields
      if (schedule.medication_custom_name) setMedicationName(schedule.medication_custom_name);
      if (schedule.medication_type) setMedicationType(schedule.medication_type);
      if (schedule.dosage) setDosage(schedule.dosage);
      if (schedule.dosage_unit) setDosageUnit(schedule.dosage_unit);

      // Meal fields
      if (schedule.meal_type) setMealType(schedule.meal_type);

      // Activity fields
      if (schedule.activity_type) setActivityType(schedule.activity_type);
      if (schedule.activity_duration_minutes) setActivityDuration(schedule.activity_duration_minutes);

      // Frequency
      const freqConfig: FrequencyConfig = {
        type: schedule.frequency_type,
        weeklyDays: schedule.weekly_days || undefined,
        intervalCount: schedule.interval_count || undefined,
        intervalUnit: schedule.interval_unit || undefined
      };
      setFrequency(freqConfig);

      // Times and dates
      setTimes(schedule.scheduled_times || []);
      setStartDate(schedule.start_date);
      if (schedule.end_date) {
        setHasEndDate(true);
        setEndDate(schedule.end_date);
      }

      // Notes
      if (schedule.notes) setNotes(schedule.notes);
    }
  }, [schedule]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateScheduleInput>) =>
      schedulesApi.updateSchedule(parseInt(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-instances'] });
      navigate('/schedules');
    }
  });

  const handleSubmit = async () => {
    if (!schedule) return;

    const data: Partial<CreateScheduleInput> = {
      frequency_type: frequency.type,
      weekly_days: frequency.weeklyDays,
      interval_count: frequency.intervalCount,
      interval_unit: frequency.intervalUnit,
      scheduled_times: times,
      start_date: startDate,
      end_date: hasEndDate ? endDate : undefined,
      notes: notes.trim() || undefined
    };

    // Add type-specific fields
    if (schedule.schedule_type === 'medication') {
      data.medication_custom_name = medicationName;
      data.medication_type = medicationType;
      data.dosage = dosage || undefined;
      data.dosage_unit = dosageUnit || undefined;
    } else if (schedule.schedule_type === 'meal') {
      data.meal_type = mealType;
    } else if (schedule.schedule_type === 'activity') {
      data.activity_type = activityType;
      data.activity_duration_minutes = activityDuration;
    }

    await updateMutation.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laster inn...</p>
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
            <h1 className="text-xl font-bold text-gray-900">
              Rediger {SCHEDULE_TYPE_NAMES_NO[schedule.schedule_type].toLowerCase()}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Detaljer</h2>

          {schedule.schedule_type === 'medication' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medisinnavn
                </label>
                <input
                  type="text"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type medisin
                </label>
                <select
                  value={medicationType}
                  onChange={(e) => setMedicationType(e.target.value as MedicationType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {(Object.keys(MEDICATION_TYPE_NAMES_NO) as MedicationType[]).map((type) => (
                    <option key={type} value={type}>
                      {MEDICATION_TYPE_NAMES_NO[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosering
                  </label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enhet
                  </label>
                  <select
                    value={dosageUnit}
                    onChange={(e) => setDosageUnit(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="mg">mg</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="stk">stk</option>
                    <option value="tabletter">tabletter</option>
                    <option value="kapsler">kapsler</option>
                    <option value="dråper">dråper</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {schedule.schedule_type === 'meal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Måltidstype
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {(Object.keys(MEAL_TYPE_NAMES_NO) as MealType[]).map((type) => (
                  <option key={type} value={type}>
                    {MEAL_TYPE_NAMES_NO[type]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {schedule.schedule_type === 'activity' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aktivitetstype
                </label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as ActivityType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {(Object.keys(ACTIVITY_TYPE_NAMES_NO) as ActivityType[]).map((type) => (
                    <option key={type} value={type}>
                      {ACTIVITY_TYPE_NAMES_NO[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Varighet (minutter)
                </label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={activityDuration}
                  onChange={(e) => setActivityDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Frequency */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Frekvens</h2>
          <FrequencySelector value={frequency} onChange={setFrequency} />
        </div>

        {/* Times */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Tidspunkter</h2>
          <MultiTimePicker times={times} onChange={setTimes} />
        </div>

        {/* Dates */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Datoer</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Startdato
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={hasEndDate}
                  onChange={(e) => setHasEndDate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Sett sluttdato</span>
              </label>

              {hasEndDate && (
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Notater</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Legg til notater..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/schedules')}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Avbryt
          </button>
          <button
            onClick={handleSubmit}
            disabled={updateMutation.isLoading || times.length === 0}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {updateMutation.isLoading ? 'Lagrer...' : '✓ Lagre endringer'}
          </button>
        </div>

        {updateMutation.isError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Det oppsto en feil ved lagring. Vennligst prøv igjen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleEditPage;
