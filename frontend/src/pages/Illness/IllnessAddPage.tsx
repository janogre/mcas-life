import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Thermometer,
  Activity,
  Clock,
  FileText,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { FormStep, ProgressiveFormContainer } from '../../components/Forms/ProgressiveForm';
import { illnessApi } from '../../lib/api';

type IllnessType = 'cold' | 'flu' | 'infection' | 'stomach_bug' | 'fever' | 'other';
type IllnessStatus = 'incubating' | 'active' | 'recovering' | 'resolved';

interface IllnessData {
  illness_type: IllnessType;
  custom_illness_name?: string;
  status: IllnessStatus;
  symptoms: string[];
  severity: number;
  has_fever: boolean;
  temperature_celsius?: number;
  first_symptoms_at: Date;
  became_sick_at?: Date;
  mcas_flare_during_illness: boolean;
  mcas_severity_increase?: number;
  treatments_taken?: string[];
  suspected_source?: string;
  notes?: string;
}

const ILLNESS_TYPES = [
  { value: 'cold' as IllnessType, label: 'Forkjølelse', emoji: '🤧', color: '#3b82f6' },
  { value: 'flu' as IllnessType, label: 'Influensa', emoji: '🤒', color: '#8b5cf6' },
  { value: 'infection' as IllnessType, label: 'Infeksjon', emoji: '🦠', color: '#ef4444' },
  { value: 'stomach_bug' as IllnessType, label: 'Mage-tarm', emoji: '🤢', color: '#f59e0b' },
  { value: 'fever' as IllnessType, label: 'Feber', emoji: '🌡️', color: '#dc2626' },
  { value: 'other' as IllnessType, label: 'Annet', emoji: '❓', color: '#6b7280' },
];

const COMMON_SYMPTOMS = [
  'Hodepine',
  'Feber',
  'Hoste',
  'Sår hals',
  'Tett nese',
  'Rennende nese',
  'Kvalme',
  'Magesmerter',
  'Diaré',
  'Oppkast',
  'Muskelsmerter',
  'Tretthet',
  'Frysninger',
];

export function IllnessAddPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [illnessData, setIllnessData] = useState<Partial<IllnessData>>({
    first_symptoms_at: new Date(),
    status: 'incubating',
    has_fever: false,
    mcas_flare_during_illness: false,
    symptoms: [],
  });

  // Step 0: Illness type
  const [selectedType, setSelectedType] = useState<IllnessType | null>(null);
  const [customName, setCustomName] = useState('');

  // Step 1: Symptoms & severity
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState(5);

  // Step 2: Fever tracking
  const [hasFever, setHasFever] = useState(false);
  const [temperature, setTemperature] = useState('');

  // Step 3: Timeline & MCAS impact
  const [status, setStatus] = useState<IllnessStatus>('incubating');
  const [timeOption, setTimeOption] = useState<'now' | 'custom'>('now');
  const [customTime, setCustomTime] = useState('');
  const [mcasFlare, setMcasFlare] = useState(false);
  const [mcasSeverity, setMcasSeverity] = useState(0);

  // Step 4: Notes
  const [suspectedSource, setSuspectedSource] = useState('');
  const [notes, setNotes] = useState('');

  const handleTypeSelect = (type: IllnessType) => {
    setSelectedType(type);
    setIllnessData({ ...illnessData, illness_type: type });
    setCurrentStep(1);
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSymptomsNext = () => {
    setIllnessData({
      ...illnessData,
      symptoms: selectedSymptoms,
      severity,
      custom_illness_name: selectedType === 'other' ? customName : undefined,
    });
    setCurrentStep(2);
  };

  const handleFeverNext = () => {
    setIllnessData({
      ...illnessData,
      has_fever: hasFever,
      temperature_celsius: hasFever && temperature ? parseFloat(temperature) : undefined,
    });
    setCurrentStep(3);
  };

  const handleTimelineNext = () => {
    const time = timeOption === 'now' ? new Date() : new Date(customTime);
    setIllnessData({
      ...illnessData,
      status,
      first_symptoms_at: time,
      mcas_flare_during_illness: mcasFlare,
      mcas_severity_increase: mcasFlare ? mcasSeverity : undefined,
    });
    setCurrentStep(4);
  };

  const handleSubmit = async () => {
    try {
      await illnessApi.logIllness({
        illness_type: illnessData.illness_type!,
        custom_illness_name: illnessData.custom_illness_name,
        status: illnessData.status!,
        symptoms: illnessData.symptoms,
        severity: illnessData.severity!,
        has_fever: illnessData.has_fever!,
        temperature_celsius: illnessData.temperature_celsius,
        first_symptoms_at: illnessData.first_symptoms_at!.toISOString(),
        mcas_flare_during_illness: illnessData.mcas_flare_during_illness!,
        mcas_severity_increase: illnessData.mcas_severity_increase,
        suspected_source: suspectedSource || undefined,
        notes: notes || undefined,
      });

      navigate('/log', { state: { message: 'Sykdom registrert!' } });
    } catch (error) {
      console.error('Error saving illness:', error);
      alert('Kunne ikke lagre sykdom. Prøv igjen.');
    }
  };

  const totalSteps = 5;

  const getTypeInfo = () => ILLNESS_TYPES.find(t => t.value === selectedType);

  return (
    <ProgressiveFormContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onClose={() => navigate('/log')}
      title="Registrer sykdom"
    >
      {/* Step 0: Select illness type */}
      {currentStep === 0 && (
        <FormStep title="Hva slags sykdom?" showBack={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            {ILLNESS_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleTypeSelect(type.value)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-5)',
                  borderRadius: 'var(--radius-soft)',
                  border: `2px solid ${type.color}20`,
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                className="illness-type-option"
              >
                <div style={{ fontSize: '48px' }}>{type.emoji}</div>
                <p
                  style={{
                    fontSize: 'var(--text-body)',
                    fontWeight: 600,
                    color: 'var(--color-sage-900)',
                  }}
                >
                  {type.label}
                </p>
              </button>
            ))}
          </div>

          {selectedType === 'other' && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Skriv inn type sykdom..."
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

          <style>{`
            .illness-type-option:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            }
          `}</style>
        </FormStep>
      )}

      {/* Step 1: Symptoms & severity */}
      {currentStep === 1 && (
        <FormStep
          title="Symptomer"
          subtitle="Velg symptomer og alvorlighetsgrad"
          onNext={handleSymptomsNext}
          onBack={() => setCurrentStep(0)}
          isValid={selectedSymptoms.length > 0}
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
              Velg symptomer
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
              {COMMON_SYMPTOMS.map((symptom) => (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-soft)',
                    border: `2px solid ${
                      selectedSymptoms.includes(symptom) ? '#ef4444' : 'var(--color-sage-200)'
                    }`,
                    background: selectedSymptoms.includes(symptom) ? '#fee2e2' : 'white',
                    cursor: 'pointer',
                    fontSize: 'var(--text-small)',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {symptom}
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
              Alvorlighetsgrad (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={severity}
              onChange={(e) => setSeverity(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>Lett</p>
              <p style={{ fontSize: 'var(--text-h2)', fontWeight: 600, color: '#ef4444' }}>{severity}</p>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>Alvorlig</p>
            </div>
          </div>
        </FormStep>
      )}

      {/* Step 2: Fever tracking */}
      {currentStep === 2 && (
        <FormStep
          title="Feber?"
          subtitle="Registrer temperatur hvis du har feber"
          onNext={handleFeverNext}
          onBack={() => setCurrentStep(1)}
        >
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasFever}
                onChange={(e) => setHasFever(e.target.checked)}
                style={{ width: '24px', height: '24px' }}
              />
              <span style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>
                Ja, jeg har feber
              </span>
            </label>
          </div>

          {hasFever && (
            <div>
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
                <Thermometer style={{ width: '16px', height: '16px' }} />
                Temperatur (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="38.5"
                style={{
                  width: '100%',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-soft)',
                  border: '2px solid var(--color-sage-200)',
                  fontSize: 'var(--text-h2)',
                  textAlign: 'center',
                }}
                autoFocus
              />
            </div>
          )}
        </FormStep>
      )}

      {/* Step 3: Timeline & MCAS impact */}
      {currentStep === 3 && (
        <FormStep
          title="Status og påvirkning"
          subtitle="Når startet det? Hvordan går det?"
          onNext={handleTimelineNext}
          onBack={() => setCurrentStep(2)}
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
              Status
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[
                { value: 'incubating' as IllnessStatus, label: 'Inkuberer (føler det komme)' },
                { value: 'active' as IllnessStatus, label: 'Aktiv sykdom' },
                { value: 'recovering' as IllnessStatus, label: 'På bedringens vei' },
              ].map((statusOption) => (
                <button
                  key={statusOption.value}
                  onClick={() => setStatus(statusOption.value)}
                  style={{
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-soft)',
                    border: `2px solid ${
                      status === statusOption.value ? '#8b5cf6' : 'var(--color-sage-200)'
                    }`,
                    background: status === statusOption.value ? '#f3e8ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 'var(--text-body)',
                    fontWeight: 600,
                  }}
                >
                  {statusOption.label}
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
                marginBottom: 'var(--space-3)',
              }}
            >
              Når startet symptomene?
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => setTimeOption('now')}
                style={{
                  flex: 1,
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-soft)',
                  border: `2px solid ${
                    timeOption === 'now' ? 'var(--color-medical-500)' : 'var(--color-sage-200)'
                  }`,
                  background: timeOption === 'now' ? 'var(--color-medical-50)' : 'white',
                  cursor: 'pointer',
                }}
              >
                Nå
              </button>
              <button
                onClick={() => setTimeOption('custom')}
                style={{
                  flex: 1,
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-soft)',
                  border: `2px solid ${
                    timeOption === 'custom' ? 'var(--color-medical-500)' : 'var(--color-sage-200)'
                  }`,
                  background: timeOption === 'custom' ? 'var(--color-medical-50)' : 'white',
                  cursor: 'pointer',
                }}
              >
                Annet
              </button>
            </div>
            {timeOption === 'custom' && (
              <input
                type="datetime-local"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                max={new Date().toISOString().slice(0, 16)}
                style={{
                  width: '100%',
                  marginTop: 'var(--space-2)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-soft)',
                  border: '2px solid var(--color-sage-200)',
                  fontSize: 'var(--text-body)',
                }}
              />
            )}
          </div>

          <div
            style={{
              background: 'var(--color-medical-50)',
              borderRadius: 'var(--radius-soft)',
              padding: 'var(--space-4)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mcasFlare}
                onChange={(e) => setMcasFlare(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              <span style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>
                MCAS-forverring under sykdom
              </span>
            </label>

            {mcasFlare && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-small)',
                    color: 'var(--color-sage-700)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Hvor mye verre? (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={mcasSeverity}
                  onChange={(e) => setMcasSeverity(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <p style={{ textAlign: 'center', fontSize: 'var(--text-h3)', fontWeight: 600, marginTop: 'var(--space-2)' }}>
                  {mcasSeverity}/10
                </p>
              </div>
            )}
          </div>
        </FormStep>
      )}

      {/* Step 4: Notes & summary */}
      {currentStep === 4 && (
        <FormStep
          title="Oppsummering"
          subtitle="Ekstra detaljer (valgfritt)"
          onNext={handleSubmit}
          onBack={() => setCurrentStep(3)}
          nextLabel="Lagre sykdom"
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
              <div style={{ fontSize: '48px' }}>{getTypeInfo()?.emoji}</div>
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
                  Alvorlighet: {severity}/10
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>
                Symptomer: {selectedSymptoms.join(', ')}
              </p>
              {hasFever && temperature && (
                <p style={{ fontSize: 'var(--text-small)', color: '#ef4444', fontWeight: 600 }}>
                  🌡️ Feber: {temperature}°C
                </p>
              )}
              {mcasFlare && (
                <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-medical-600)', fontWeight: 600 }}>
                  ⚠️ MCAS-forverring: {mcasSeverity}/10
                </p>
              )}
            </div>
          </div>

          {/* Optional fields */}
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
              <AlertTriangle style={{ width: '16px', height: '16px' }} />
              Mulig smittekilde (valgfritt)
            </label>
            <input
              type="text"
              value={suspectedSource}
              onChange={(e) => setSuspectedSource(e.target.value)}
              placeholder="F.eks. 'Fra barna', 'Etter handling'"
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
        </FormStep>
      )}
    </ProgressiveFormContainer>
  );
}
