import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Thermometer,
  Users,
  Clock,
  MapPin,
  FileText,
  TrendingUp,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { FormStep, ProgressiveFormContainer } from '../../components/Forms/ProgressiveForm';
import { activitiesApi } from '../../lib/api';

type ActivityType = 'temperature_change' | 'social_trigger' | 'physical_activity';
type TemperatureChangeType = 'hot_to_cold' | 'cold_to_hot';
type IntensityType = 'light' | 'moderate' | 'intense';

interface ActivityData {
  activity_type: ActivityType;
  // Temperature change
  temperature_change_type?: TemperatureChangeType;
  temperature_from?: number;
  temperature_to?: number;
  // Social trigger
  social_trigger_type?: string;
  estimated_people_count?: number;
  noise_level?: number;
  // Physical activity
  physical_activity_type?: string;
  intensity?: IntensityType;
  duration_minutes?: number;
  // Common
  time_started: Date;
  time_ended?: Date;
  location_description?: string;
  notes?: string;
  immediate_symptoms?: boolean;
  symptom_description?: string;
}

const ACTIVITY_TYPES = [
  {
    value: 'temperature_change' as ActivityType,
    label: 'Temperaturendring',
    icon: <Thermometer style={{ width: '24px', height: '24px' }} />,
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: 'Varmt til kaldt eller kaldt til varmt',
  },
  {
    value: 'social_trigger' as ActivityType,
    label: 'Sosial trigger',
    icon: <Users style={{ width: '24px', height: '24px' }} />,
    color: '#8b5cf6',
    bgColor: '#f3e8ff',
    description: 'Mange mennesker, støy, stress',
  },
  {
    value: 'physical_activity' as ActivityType,
    label: 'Fysisk aktivitet',
    icon: <Activity style={{ width: '24px', height: '24px' }} />,
    color: '#f59e0b',
    bgColor: '#fef3c7',
    description: 'Trening, gåtur, husarbeid',
  },
];

const SOCIAL_TRIGGERS = [
  { value: 'crowds', label: 'Folkemengder' },
  { value: 'noise', label: 'Støy' },
  { value: 'social_stress', label: 'Sosialt stress' },
  { value: 'sensory_overload', label: 'Sensorisk overbelastning' },
];

const PHYSICAL_ACTIVITIES = [
  { value: 'walking', label: 'Gåtur' },
  { value: 'running', label: 'Løping' },
  { value: 'cycling', label: 'Sykling' },
  { value: 'strength_training', label: 'Styrketrening' },
  { value: 'household', label: 'Husarbeid' },
  { value: 'gardening', label: 'Hagearbeid' },
  { value: 'yoga', label: 'Yoga/strekk' },
  { value: 'other', label: 'Annet' },
];

export function ActivityAddPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [activityData, setActivityData] = useState<Partial<ActivityData>>({
    time_started: new Date(),
    immediate_symptoms: false,
  });

  // Step 0: Activity type
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);

  // Step 1: Type-specific details
  // Temperature
  const [tempChangeType, setTempChangeType] = useState<TemperatureChangeType>('hot_to_cold');
  const [tempFrom, setTempFrom] = useState('');
  const [tempTo, setTempTo] = useState('');
  // Social
  const [socialType, setSocialType] = useState('crowds');
  const [peopleCount, setPeopleCount] = useState('');
  const [noiseLevel, setNoiseLevel] = useState(5);
  // Physical
  const [physicalType, setPhysicalType] = useState('walking');
  const [intensity, setIntensity] = useState<IntensityType>('moderate');
  const [duration, setDuration] = useState('');

  // Step 2: Time
  const [timeOption, setTimeOption] = useState<'now' | 'custom'>('now');
  const [customTime, setCustomTime] = useState('');

  // Step 3: Location & notes
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [hasSymptoms, setHasSymptoms] = useState(false);
  const [symptomDesc, setSymptomDesc] = useState('');

  const handleTypeSelect = (type: ActivityType) => {
    setSelectedType(type);
    setActivityData({ ...activityData, activity_type: type });
    setCurrentStep(1);
  };

  const handleDetailsNext = () => {
    const updates: Partial<ActivityData> = {};

    if (selectedType === 'temperature_change') {
      updates.temperature_change_type = tempChangeType;
      if (tempFrom) updates.temperature_from = parseFloat(tempFrom);
      if (tempTo) updates.temperature_to = parseFloat(tempTo);
    } else if (selectedType === 'social_trigger') {
      updates.social_trigger_type = socialType;
      if (peopleCount) updates.estimated_people_count = parseInt(peopleCount);
      updates.noise_level = noiseLevel;
    } else if (selectedType === 'physical_activity') {
      updates.physical_activity_type = physicalType;
      updates.intensity = intensity;
      if (duration) updates.duration_minutes = parseInt(duration);
    }

    setActivityData({ ...activityData, ...updates });
    setCurrentStep(2);
  };

  const handleTimeNext = () => {
    const time = timeOption === 'now' ? new Date() : new Date(customTime);
    setActivityData({ ...activityData, time_started: time });
    setCurrentStep(3);
  };

  const handleSubmit = async () => {
    try {
      await activitiesApi.logActivity({
        activity_type: activityData.activity_type!,
        temperature_change_type: activityData.temperature_change_type,
        temperature_from: activityData.temperature_from,
        temperature_to: activityData.temperature_to,
        social_trigger_type: activityData.social_trigger_type,
        estimated_people_count: activityData.estimated_people_count,
        noise_level: activityData.noise_level,
        physical_activity_type: activityData.physical_activity_type,
        intensity: activityData.intensity,
        duration_minutes: activityData.duration_minutes,
        time_started: activityData.time_started!.toISOString(),
        location_description: location || undefined,
        notes: notes || undefined,
        immediate_symptoms: hasSymptoms,
        symptom_description: hasSymptoms ? symptomDesc : undefined,
      });

      navigate('/log', { state: { message: 'Aktivitet lagret!' } });
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Kunne ikke lagre aktivitet. Prøv igjen.');
    }
  };

  const totalSteps = 4;

  const getTypeInfo = () => ACTIVITY_TYPES.find((t) => t.value === selectedType);

  return (
    <ProgressiveFormContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onClose={() => navigate('/diary')}
      title="Registrer aktivitet"
    >
      {/* Step 0: Select activity type */}
      {currentStep === 0 && (
        <FormStep title="Hva slags aktivitet?" showBack={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {ACTIVITY_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleTypeSelect(type.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-5)',
                  borderRadius: 'var(--radius-soft)',
                  border: `2px solid ${type.bgColor}`,
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
                className="activity-type-option"
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    background: type.bgColor,
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ color: type.color }}>{type.icon}</div>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 'var(--text-h3)',
                      fontWeight: 600,
                      color: 'var(--color-sage-900)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    {type.label}
                  </p>
                  <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>
                    {type.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <style>{`
            .activity-type-option:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            }
          `}</style>
        </FormStep>
      )}

      {/* Step 1: Type-specific details */}
      {currentStep === 1 && selectedType === 'temperature_change' && (
        <FormStep
          title="Temperaturendring"
          subtitle="Detaljer om temperaturskiftet"
          onNext={handleDetailsNext}
          onBack={() => setCurrentStep(0)}
        >
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-small)',
                fontWeight: 600,
                color: 'var(--color-sage-700)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Type endring
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                onClick={() => setTempChangeType('hot_to_cold')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-soft)',
                  border: `2px solid ${
                    tempChangeType === 'hot_to_cold' ? '#3b82f6' : 'var(--color-sage-200)'
                  }`,
                  background: tempChangeType === 'hot_to_cold' ? '#dbeafe' : 'white',
                  cursor: 'pointer',
                }}
              >
                <TrendingDown style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                <span style={{ fontSize: 'var(--text-small)', fontWeight: 600 }}>Varmt → Kaldt</span>
              </button>
              <button
                onClick={() => setTempChangeType('cold_to_hot')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-soft)',
                  border: `2px solid ${
                    tempChangeType === 'cold_to_hot' ? '#ef4444' : 'var(--color-sage-200)'
                  }`,
                  background: tempChangeType === 'cold_to_hot' ? '#fee2e2' : 'white',
                  cursor: 'pointer',
                }}
              >
                <TrendingUp style={{ width: '24px', height: '24px', color: '#ef4444' }} />
                <span style={{ fontSize: 'var(--text-small)', fontWeight: 600 }}>Kaldt → Varmt</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-small)',
                  fontWeight: 600,
                  color: 'var(--color-sage-700)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Fra (°C)
              </label>
              <input
                type="number"
                value={tempFrom}
                onChange={(e) => setTempFrom(e.target.value)}
                placeholder="25"
                style={{
                  width: '100%',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-soft)',
                  border: '2px solid var(--color-sage-200)',
                  fontSize: 'var(--text-body)',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-small)',
                  fontWeight: 600,
                  color: 'var(--color-sage-700)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Til (°C)
              </label>
              <input
                type="number"
                value={tempTo}
                onChange={(e) => setTempTo(e.target.value)}
                placeholder="5"
                style={{
                  width: '100%',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-soft)',
                  border: '2px solid var(--color-sage-200)',
                  fontSize: 'var(--text-body)',
                }}
              />
            </div>
          </div>
        </FormStep>
      )}

      {currentStep === 1 && selectedType === 'social_trigger' && (
        <FormStep
          title="Sosial trigger"
          subtitle="Detaljer om situasjonen"
          onNext={handleDetailsNext}
          onBack={() => setCurrentStep(0)}
        >
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-small)',
                fontWeight: 600,
                color: 'var(--color-sage-700)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Type trigger
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
              {SOCIAL_TRIGGERS.map((trigger) => (
                <button
                  key={trigger.value}
                  onClick={() => setSocialType(trigger.value)}
                  style={{
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-soft)',
                    border: `2px solid ${
                      socialType === trigger.value ? '#8b5cf6' : 'var(--color-sage-200)'
                    }`,
                    background: socialType === trigger.value ? '#f3e8ff' : 'white',
                    cursor: 'pointer',
                    fontSize: 'var(--text-small)',
                    fontWeight: 600,
                  }}
                >
                  {trigger.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-small)',
                fontWeight: 600,
                color: 'var(--color-sage-700)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Antall personer (ca.)
            </label>
            <input
              type="number"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
              placeholder="50"
              style={{
                width: '100%',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-soft)',
                border: '2px solid var(--color-sage-200)',
                fontSize: 'var(--text-body)',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-small)',
                fontWeight: 600,
                color: 'var(--color-sage-700)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Støynivå (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={noiseLevel}
              onChange={(e) => setNoiseLevel(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <p style={{ textAlign: 'center', fontSize: 'var(--text-h2)', fontWeight: 600, marginTop: 'var(--space-2)' }}>
              {noiseLevel}
            </p>
          </div>
        </FormStep>
      )}

      {currentStep === 1 && selectedType === 'physical_activity' && (
        <FormStep
          title="Fysisk aktivitet"
          subtitle="Detaljer om aktiviteten"
          onNext={handleDetailsNext}
          onBack={() => setCurrentStep(0)}
        >
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-small)',
                fontWeight: 600,
                color: 'var(--color-sage-700)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Type aktivitet
            </label>
            <select
              value={physicalType}
              onChange={(e) => setPhysicalType(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-soft)',
                border: '2px solid var(--color-sage-200)',
                fontSize: 'var(--text-body)',
                background: 'white',
              }}
            >
              {PHYSICAL_ACTIVITIES.map((activity) => (
                <option key={activity.value} value={activity.value}>
                  {activity.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-small)',
                fontWeight: 600,
                color: 'var(--color-sage-700)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Intensitet
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {['light', 'moderate', 'intense'].map((level) => (
                <button
                  key={level}
                  onClick={() => setIntensity(level as IntensityType)}
                  style={{
                    flex: 1,
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-soft)',
                    border: `2px solid ${
                      intensity === level ? '#f59e0b' : 'var(--color-sage-200)'
                    }`,
                    background: intensity === level ? '#fef3c7' : 'white',
                    cursor: 'pointer',
                    fontSize: 'var(--text-small)',
                    fontWeight: 600,
                  }}
                >
                  {level === 'light' ? 'Lett' : level === 'moderate' ? 'Moderat' : 'Intens'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-small)',
                fontWeight: 600,
                color: 'var(--color-sage-700)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Varighet (minutter)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              style={{
                width: '100%',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-soft)',
                border: '2px solid var(--color-sage-200)',
                fontSize: 'var(--text-body)',
              }}
            />
          </div>
        </FormStep>
      )}

      {/* Step 2: Time */}
      {currentStep === 2 && (
        <FormStep
          title="Når skjedde dette?"
          onNext={handleTimeNext}
          onBack={() => setCurrentStep(1)}
          isValid={timeOption === 'now' || (timeOption === 'custom' && customTime !== '')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button
              onClick={() => setTimeOption('now')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-soft)',
                border: `2px solid ${
                  timeOption === 'now' ? 'var(--color-medical-500)' : 'var(--color-sage-200)'
                }`,
                background: timeOption === 'now' ? 'var(--color-medical-50)' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
              }}
            >
              <Clock style={{ width: '20px', height: '20px', color: 'var(--color-sage-600)' }} />
              <div>
                <p style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>Nå</p>
                <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>
                  {new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </button>

            <button
              onClick={() => setTimeOption('custom')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-soft)',
                border: `2px solid ${
                  timeOption === 'custom' ? 'var(--color-medical-500)' : 'var(--color-sage-200)'
                }`,
                background: timeOption === 'custom' ? 'var(--color-medical-50)' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
              }}
            >
              <p style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>Annet tidspunkt</p>
            </button>

            {timeOption === 'custom' && (
              <div style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-8)' }}>
                <input
                  type="datetime-local"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-soft)',
                    border: '2px solid var(--color-sage-200)',
                    fontSize: 'var(--text-body)',
                  }}
                  autoFocus
                />
              </div>
            )}
          </div>
        </FormStep>
      )}

      {/* Step 3: Location, notes & symptoms */}
      {currentStep === 3 && (
        <FormStep
          title="Oppsummering"
          subtitle="Legg til ekstra detaljer (valgfritt)"
          onNext={handleSubmit}
          onBack={() => setCurrentStep(2)}
          nextLabel="Lagre aktivitet"
          isLastStep={true}
        >
          {/* Summary card */}
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-soft)',
              border: '2px solid var(--color-sage-200)',
              padding: 'var(--space-5)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: getTypeInfo()?.bgColor,
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getTypeInfo()?.icon}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 'var(--text-h3)',
                    fontWeight: 600,
                    color: 'var(--color-sage-900)',
                  }}
                >
                  {getTypeInfo()?.label}
                </h3>
                <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>
                  {activityData.time_started?.toLocaleString('nb-NO', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: 'var(--text-small)',
                fontWeight: 600,
                color: 'var(--color-sage-700)',
                marginBottom: 'var(--space-2)',
              }}
            >
              <MapPin style={{ width: '16px', height: '16px' }} />
              Sted (valgfritt)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="F.eks. 'Kjøpesenter', 'Ute på tur'"
              style={{
                width: '100%',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-soft)',
                border: '2px solid var(--color-sage-200)',
                fontSize: 'var(--text-body)',
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: 'var(--text-small)',
                fontWeight: 600,
                color: 'var(--color-sage-700)',
                marginBottom: 'var(--space-2)',
              }}
            >
              <FileText style={{ width: '16px', height: '16px' }} />
              Notat (valgfritt)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Andre detaljer..."
              rows={3}
              style={{
                width: '100%',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-soft)',
                border: '2px solid var(--color-sage-200)',
                fontSize: 'var(--text-body)',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Immediate symptoms */}
          <div
            style={{
              background: 'var(--color-sage-50)',
              borderRadius: 'var(--radius-soft)',
              padding: 'var(--space-4)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasSymptoms}
                onChange={(e) => setHasSymptoms(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              <span style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>
                Fikk symptomer umiddelbart
              </span>
            </label>

            {hasSymptoms && (
              <textarea
                value={symptomDesc}
                onChange={(e) => setSymptomDesc(e.target.value)}
                placeholder="Beskriv symptomene..."
                rows={2}
                style={{
                  width: '100%',
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-soft)',
                  border: '2px solid var(--color-sage-200)',
                  fontSize: 'var(--text-small)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            )}
          </div>
        </FormStep>
      )}
    </ProgressiveFormContainer>
  );
}
