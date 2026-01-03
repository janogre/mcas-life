/**
 * ScheduleCreatePage - Progressive form for creating new schedules
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
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

type FormStep = 'type' | 'details' | 'frequency' | 'times' | 'dates' | 'notes' | 'review';

const ScheduleCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const initialType = (location.state as any)?.initialType as ScheduleType | undefined;

  const [currentStep, setCurrentStep] = useState<FormStep>('type');
  const [scheduleType, setScheduleType] = useState<ScheduleType | null>(initialType || null);

  // Form data
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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateScheduleInput) => schedulesApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-instances'] });
      navigate('/schedules');
    }
  });

  const steps: FormStep[] = ['type', 'details', 'frequency', 'times', 'dates', 'notes', 'review'];

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'type':
        return scheduleType !== null;
      case 'details':
        if (scheduleType === 'medication') {
          return medicationName.trim().length > 0;
        }
        return true; // Meal and activity have defaults
      case 'frequency':
        if (frequency.type === 'weekly') {
          return (frequency.weeklyDays?.length || 0) > 0;
        }
        if (frequency.type === 'interval') {
          return (frequency.intervalCount || 0) > 0 && !!frequency.intervalUnit;
        }
        return true;
      case 'times':
        return times.length > 0;
      case 'dates':
        if (hasEndDate) {
          return !!endDate && endDate > startDate;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!scheduleType) return;

    const data: CreateScheduleInput = {
      schedule_type: scheduleType,
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
    if (scheduleType === 'medication') {
      data.medication_custom_name = medicationName;
      data.medication_type = medicationType;
      data.dosage = dosage || undefined;
      data.dosage_unit = dosageUnit || undefined;
    } else if (scheduleType === 'meal') {
      data.meal_type = mealType;
    } else if (scheduleType === 'activity') {
      data.activity_type = activityType;
      data.activity_duration_minutes = activityDuration;
    }

    await createMutation.mutateAsync(data);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-2">Hva vil du opprette en fast registrering for?</h2>
            <p className="text-gray-600 mb-6">Velg type aktivitet som skal gjentas</p>

            <div className="grid grid-cols-1 gap-4">
              {(['medication', 'meal', 'activity'] as ScheduleType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setScheduleType(type)}
                  className={`p-6 rounded-lg border-2 text-left transition-all ${
                    scheduleType === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">
                      {type === 'medication' && '💊'}
                      {type === 'meal' && '🍽️'}
                      {type === 'activity' && '🏃'}
                    </span>
                    <div>
                      <h3 className="font-semibold text-lg">{SCHEDULE_TYPE_NAMES_NO[type]}</h3>
                      <p className="text-sm text-gray-600">
                        {type === 'medication' && 'Medisininntak, kosttilskudd eller behandling'}
                        {type === 'meal' && 'Faste måltider eller snacks'}
                        {type === 'activity' && 'Trening, temperaturendringer eller triggere'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'details':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Detaljer</h2>

            {scheduleType === 'medication' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medisinnavn *
                  </label>
                  <input
                    type="text"
                    value={medicationName}
                    onChange={(e) => setMedicationName(e.target.value)}
                    placeholder="F.eks. Ketotifen, Vitamin C, DAO"
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
                      placeholder="F.eks. 2, 500"
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

            {scheduleType === 'meal' && (
              <div className="space-y-4">
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
              </div>
            )}

            {scheduleType === 'activity' && (
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
        );

      case 'frequency':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Hvor ofte?</h2>
            <FrequencySelector value={frequency} onChange={setFrequency} />
          </div>
        );

      case 'times':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-2">Hvilke tidspunkter?</h2>
            <p className="text-gray-600 mb-6">Legg til ett eller flere tidspunkter på dagen</p>
            <MultiTimePicker times={times} onChange={setTimes} />
          </div>
        );

      case 'dates':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Når skal dette gjelde?</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Startdato
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
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

                {!hasEndDate && (
                  <p className="text-sm text-gray-500 italic">
                    Uten sluttdato vil dette gjenta seg på ubestemt tid
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'notes':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-2">Notater (valgfritt)</h2>
            <p className="text-gray-600 mb-6">Legg til ekstra informasjon hvis nødvendig</p>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="F.eks. ta med mat, ikke blande med andre medisiner, etc."
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        );

      case 'review':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Oppsummering</h2>

            <div className="space-y-4">
              {/* Type */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Type</p>
                <p className="font-semibold">
                  {scheduleType && SCHEDULE_TYPE_NAMES_NO[scheduleType]}
                </p>
              </div>

              {/* Details */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Detaljer</p>
                <p className="font-semibold">
                  {scheduleType === 'medication' && medicationName}
                  {scheduleType === 'meal' && MEAL_TYPE_NAMES_NO[mealType]}
                  {scheduleType === 'activity' && ACTIVITY_TYPE_NAMES_NO[activityType]}
                </p>
                {scheduleType === 'medication' && dosage && (
                  <p className="text-sm text-gray-600 mt-1">
                    {dosage} {dosageUnit}
                  </p>
                )}
                {scheduleType === 'activity' && (
                  <p className="text-sm text-gray-600 mt-1">
                    {activityDuration} minutter
                  </p>
                )}
              </div>

              {/* Frequency */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Frekvens</p>
                <p className="font-semibold">
                  {frequency.type === 'daily' && 'Daglig'}
                  {frequency.type === 'weekly' && frequency.weeklyDays && (
                    `Hver uke: ${frequency.weeklyDays.map(d => ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'][d]).join(', ')}`
                  )}
                  {frequency.type === 'interval' && frequency.intervalCount && frequency.intervalUnit && (
                    `Hver ${frequency.intervalCount} ${frequency.intervalUnit === 'days' ? 'dag' : 'uke'}${frequency.intervalCount > 1 ? 'er' : ''}`
                  )}
                </p>
              </div>

              {/* Times */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Tidspunkter</p>
                <p className="font-semibold">{times.join(', ')}</p>
              </div>

              {/* Dates */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Periode</p>
                <p className="font-semibold">
                  Fra {new Date(startDate).toLocaleDateString('nb-NO')}
                  {hasEndDate && endDate && ` til ${new Date(endDate).toLocaleDateString('nb-NO')}`}
                  {!hasEndDate && ' (ingen sluttdato)'}
                </p>
              </div>

              {/* Notes */}
              {notes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Notater</p>
                  <p className="text-sm">{notes}</p>
                </div>
              )}
            </div>

            {createMutation.isError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Det oppsto en feil ved opprettelse av schedule. Vennligst prøv igjen.
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const progressPercentage = ((steps.indexOf(currentStep) + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">Ny fast registrering</h1>
            </div>
            <span className="text-sm text-gray-600">
              {steps.indexOf(currentStep) + 1} av {steps.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {currentStep !== 'type' && (
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              ← Tilbake
            </button>
          )}

          {currentStep !== 'review' ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Neste →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {createMutation.isPending ? 'Oppretter...' : '✓ Opprett fast registrering'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleCreatePage;
