import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Clock, Scale, FileText, Check, Loader2 } from 'lucide-react';
import { FormStep, ProgressiveFormContainer } from '../../components/Forms/ProgressiveForm';
import { medicationsApi, type MedicationCatalogItem } from '../../lib/api';

interface MedicationData {
  catalogMedicationId?: number;
  name: string;
  type: 'mcas' | 'prescription' | 'over_counter' | 'supplement';
  dosage?: string;
  dosageUnit?: string;
  timeTaken: Date;
  notes?: string;
}

const DOSAGE_UNITS = ['mg', 'ml', 'tabletter', 'kapsler', 'dråper', 'puff'];

const MEDICATION_TYPES = [
  { value: 'mcas', label: 'MCAS-medisin', color: '#8b5cf6' },
  { value: 'prescription', label: 'Reseptbelagt', color: '#3b82f6' },
  { value: 'over_counter', label: 'Reseptfri', color: '#10b981' },
  { value: 'supplement', label: 'Kosttilskudd', color: '#f59e0b' },
];

export function MedicationAddPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [medicationData, setMedicationData] = useState<Partial<MedicationData>>({
    timeTaken: new Date(),
  });

  // Step 1: Medication name
  const [searchQuery, setSearchQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [searchResults, setSearchResults] = useState<MedicationCatalogItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Step 2: Type (optional)
  const [selectedType, setSelectedType] = useState<MedicationData['type']>('mcas');

  // Step 3: Dosage (optional)
  const [dosage, setDosage] = useState('');
  const [dosageUnit, setDosageUnit] = useState('mg');

  // Step 4: Time
  const [timeOption, setTimeOption] = useState<'now' | 'custom'>('now');
  const [customTime, setCustomTime] = useState('');

  // Step 5: Notes (optional)
  const [notes, setNotes] = useState('');

  // Debounced search effect
  useEffect(() => {
    const searchMedications = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await medicationsApi.search(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Medication search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchMedications, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectMedication = (catalogItem: MedicationCatalogItem) => {
    setMedicationData({
      ...medicationData,
      catalogMedicationId: catalogItem.id,
      name: catalogItem.name,
      type: 'mcas'
    });
    setSelectedType('mcas');
    setCurrentStep(1);
  };

  const handleCustomMedication = () => {
    if (customName.trim()) {
      setMedicationData({ ...medicationData, name: customName.trim() });
      setCurrentStep(1);
    }
  };

  const handleTypeNext = () => {
    setMedicationData({ ...medicationData, type: selectedType });
    setCurrentStep(2);
  };

  const handleDosageNext = () => {
    if (dosage) {
      setMedicationData({
        ...medicationData,
        dosage,
        dosageUnit,
      });
    }
    setCurrentStep(3);
  };

  const handleTimeNext = () => {
    const time = timeOption === 'now' ? new Date() : new Date(customTime);
    setMedicationData({ ...medicationData, timeTaken: time });
    setCurrentStep(4);
  };

  const handleSubmit = async () => {
    try {
      await medicationsApi.logMedication({
        catalog_medication_id: medicationData.catalogMedicationId,
        custom_name: medicationData.catalogMedicationId ? undefined : medicationData.name,
        medication_type: medicationData.type,
        dosage: medicationData.dosage,
        dosage_unit: medicationData.dosageUnit,
        time_taken: medicationData.timeTaken!.toISOString(),
        notes: notes || undefined,
      });

      // Show success and navigate
      navigate('/log', { state: { message: 'Medisin lagret!' } });
    } catch (error) {
      console.error('Error saving medication:', error);
      alert('Kunne ikke lagre medisin. Prøv igjen.');
    }
  };

  const totalSteps = 5;

  return (
    <ProgressiveFormContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onClose={() => navigate('/log')}
      title="Registrer medisin"
    >
      {/* Step 0: Select medication */}
      {currentStep === 0 && (
        <FormStep
          title="Hvilken medisin?"
          subtitle="Søk etter medisin eller skriv inn navnet"
          showBack={false}
        >
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <input
              type="text"
              placeholder="Søk etter medisin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-soft)',
                border: '2px solid var(--color-sage-200)',
                fontSize: 'var(--text-body)',
                transition: 'border-color 0.2s ease',
              }}
              className="medication-search-input"
              autoFocus
            />
          </div>

          {/* Search results */}
          {searchQuery.trim().length >= 2 && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <h3
                style={{
                  fontSize: 'var(--text-small)',
                  fontWeight: 600,
                  color: 'var(--color-sage-600)',
                  marginBottom: 'var(--space-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {isSearching ? 'Søker...' : searchResults.length > 0 ? 'Forslag' : 'Ingen treff'}
              </h3>

              {isSearching && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5)' }}>
                  <Loader2 className="animate-spin" style={{ width: '24px', height: '24px', color: 'var(--color-medical-500)' }} />
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {searchResults.map((med) => (
                    <button
                      key={med.id}
                      onClick={() => handleSelectMedication(med)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-soft)',
                        border: '2px solid var(--color-sage-100)',
                        background: 'white',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      className="medication-option"
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          background: '#f3e8ff',
                          borderRadius: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Pill style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontSize: 'var(--text-body)',
                            fontWeight: 600,
                            color: 'var(--color-sage-900)',
                          }}
                        >
                          {med.name}
                        </p>
                        {(med.active_substance || med.strength || med.form) && (
                          <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)', marginTop: '2px' }}>
                            {[med.active_substance, med.strength, med.form].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                      {med.prescription_required && (
                        <div
                          style={{
                            padding: '4px 8px',
                            background: 'var(--color-sage-100)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-sage-700)',
                          }}
                        >
                          Rx
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom medication input */}
          <div>
            <h3
              style={{
                fontSize: 'var(--text-small)',
                fontWeight: 600,
                color: 'var(--color-sage-600)',
                marginBottom: 'var(--space-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Eller skriv inn
            </h3>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="text"
                placeholder="Medisinnavn..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && customName.trim()) {
                    handleCustomMedication();
                  }
                }}
                style={{
                  flex: 1,
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-soft)',
                  border: '2px solid var(--color-sage-200)',
                  fontSize: 'var(--text-body)',
                }}
              />
              <button
                onClick={handleCustomMedication}
                disabled={!customName.trim()}
                style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-soft)',
                  border: 'none',
                  background: customName.trim()
                    ? 'linear-gradient(135deg, var(--color-medical-500) 0%, var(--color-medical-600) 100%)'
                    : 'var(--color-sage-200)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: customName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                }}
              >
                OK
              </button>
            </div>
          </div>

          <style>{`
            .medication-search-input:focus {
              border-color: var(--color-medical-500);
              outline: none;
            }

            .medication-option:hover {
              border-color: var(--color-medical-300);
              background: var(--color-medical-50);
            }

            @keyframes spin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }

            .animate-spin {
              animation: spin 1s linear infinite;
            }
          `}</style>
        </FormStep>
      )}

      {/* Step 1: Type (optional) */}
      {currentStep === 1 && (
        <FormStep
          title="Type medisin"
          subtitle="Valgfritt - hjelper med kategorisering"
          onNext={handleTypeNext}
          onBack={() => setCurrentStep(0)}
          showSkip={true}
          onSkip={() => setCurrentStep(2)}
          skipLabel="Hopp over"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            {MEDICATION_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value as MedicationData['type'])}
                style={{
                  padding: 'var(--space-5)',
                  borderRadius: 'var(--radius-soft)',
                  border: `2px solid ${
                    selectedType === type.value ? type.color : 'var(--color-sage-200)'
                  }`,
                  background:
                    selectedType === type.value ? `${type.color}15` : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    background: `${type.color}20`,
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-3)',
                  }}
                >
                  <Pill style={{ width: '24px', height: '24px', color: type.color }} />
                </div>
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
        </FormStep>
      )}

      {/* Step 2: Dosage (optional) */}
      {currentStep === 2 && (
        <FormStep
          title="Dosering"
          subtitle="Valgfritt - hvor mye tok du?"
          onNext={handleDosageNext}
          onBack={() => setCurrentStep(1)}
          showSkip={true}
          onSkip={() => setCurrentStep(3)}
          skipLabel="Hopp over"
        >
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
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
                Mengde
              </label>
              <input
                type="number"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="10"
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
                Enhet
              </label>
              <select
                value={dosageUnit}
                onChange={(e) => setDosageUnit(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-soft)',
                  border: '2px solid var(--color-sage-200)',
                  fontSize: 'var(--text-body)',
                  background: 'white',
                }}
              >
                {DOSAGE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-4)',
              background: 'var(--color-sage-50)',
              borderRadius: 'var(--radius-soft)',
            }}
          >
            <Scale style={{ width: '20px', height: '20px', color: 'var(--color-sage-600)' }} />
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-700)' }}>
              Eksempel: 10 mg, 2 tabletter, 5 ml
            </p>
          </div>
        </FormStep>
      )}

      {/* Step 3: Time */}
      {currentStep === 3 && (
        <FormStep
          title="Når tok du medisinen?"
          onNext={handleTimeNext}
          onBack={() => setCurrentStep(2)}
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
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${
                    timeOption === 'now' ? 'var(--color-medical-500)' : 'var(--color-sage-300)'
                  }`,
                  background: timeOption === 'now' ? 'var(--color-medical-500)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {timeOption === 'now' && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'white',
                    }}
                  />
                )}
              </div>
              <Clock style={{ width: '20px', height: '20px', color: 'var(--color-sage-600)' }} />
              <div>
                <p style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>Nå</p>
                <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>
                  {new Date().toLocaleTimeString('nb-NO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
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
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${
                    timeOption === 'custom' ? 'var(--color-medical-500)' : 'var(--color-sage-300)'
                  }`,
                  background: timeOption === 'custom' ? 'var(--color-medical-500)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {timeOption === 'custom' && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'white',
                    }}
                  />
                )}
              </div>
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

      {/* Step 4: Summary with optional notes */}
      {currentStep === 4 && (
        <FormStep
          title="Oppsummering"
          subtitle="Sjekk at alt stemmer før du lagrer"
          onNext={handleSubmit}
          onBack={() => setCurrentStep(3)}
          nextLabel="Lagre medisin"
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: '#f3e8ff',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Pill style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 'var(--text-h3)',
                    fontWeight: 600,
                    color: 'var(--color-sage-900)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  {medicationData.name}
                </h3>
                {medicationData.type && (
                  <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>
                    {MEDICATION_TYPES.find((t) => t.value === medicationData.type)?.label}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {medicationData.dosage && (
                <div>
                  <p
                    style={{
                      fontSize: 'var(--text-small)',
                      color: 'var(--color-sage-600)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    Dosering
                  </p>
                  <p style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>
                    {medicationData.dosage} {medicationData.dosageUnit}
                  </p>
                </div>
              )}

              <div>
                <p
                  style={{
                    fontSize: 'var(--text-small)',
                    color: 'var(--color-sage-600)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  Tidspunkt
                </p>
                <p style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>
                  {medicationData.timeTaken?.toLocaleString('nb-NO', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Optional notes */}
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
              placeholder="F.eks. 'Tok pga hodepine' eller 'Før måltid'"
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
