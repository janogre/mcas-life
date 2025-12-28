import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BodyMap } from '../../components/Symptoms/BodyMap';
import { CriticalSymptomShortcuts } from '../../components/Symptoms/CriticalSymptomShortcuts';
import { RoomExposureSelector } from '../../components/Symptoms/RoomExposureSelector';
import { symptomsApi } from '../../lib/api';
import { getWeatherAutomatically, type WeatherData } from '../../lib/weatherApi';
import { ArrowLeft, Clock, AlertCircle, CheckCircle2, Cloud } from 'lucide-react';

type CaptureMode = 'quick' | 'detailed';
type Step = 'mode' | 'quick-shortcuts' | 'detailed-form' | 'body-map' | 'room-exposure' | 'complete';

interface RoomExposure {
  room_id: string;
  room_name: string;
  time_spent_minutes?: number;
}

interface SymptomFormData {
  category: 'skin' | 'digestive' | 'respiratory' | 'cardiovascular' | 'neurological' | 'musculoskeletal' | 'genitourinary' | 'systemic';
  type: string;
  severity: number;
  body_regions: string[];
  duration_minutes: number;
  intensity_change: 'improving' | 'worsening' | 'stable';
  started_at: Date;
  notes?: string;
  suspected_triggers?: string[];
  treatment_taken?: string;
  treatment_effective?: boolean;
  room_exposures?: RoomExposure[];
}

const SYMPTOM_CATEGORIES = [
  {
    value: 'skin',
    label: 'Hud',
    icon: '🔴',
    examples: 'Kløe, urtikaria, rødming',
    tooltip: 'Hudsymptomer er vanlige ved MCAS og skyldes histaminfrigjøring. Inkluderer kløe, utslett, urtikaria (elveblest), rødming og hovning. Disse symptomene hjelper AI med å identifisere histaminutløsende matvarer.'
  },
  {
    value: 'digestive',
    label: 'Fordøyelse',
    icon: '🥄',
    examples: 'Kvalme, magesmerter, diaré',
    tooltip: 'Fordøyelsessymptomer oppstår når mastceller i tarmen aktiveres. Inkluderer kvalme, magesmerter, diaré, oppblåsthet og sure oppstøt. Viktig for å koble symptomer til nylig inntatt mat (0-4 timer).'
  },
  {
    value: 'respiratory',
    label: 'Luftveier',
    icon: '🫁',
    examples: 'Pustevansker, hoste',
    tooltip: 'Luftveissymptomer kan være alvorlige ved MCAS og krever oppmerksomhet. Inkluderer pustevansker, trange luftveier, hoste, rennende nese. Hjelper med å oppdage allergiske reaksjoner og trigger-mønstre.'
  },
  {
    value: 'cardiovascular',
    label: 'Hjerte/kar',
    icon: '❤️',
    examples: 'Hjertebank, blodtrykk',
    tooltip: 'Hjerte- og karsymptomer oppstår ved systemisk mastcelleaktivering. Inkluderer hjertebank, svimmelhet, blodtrykksfall, brystsmerter. Viktig å dokumentere for å oppdage alvorlige triggere.'
  },
  {
    value: 'neurological',
    label: 'Nervesystem',
    icon: '🧠',
    examples: 'Hodepine, hjerneteåke',
    tooltip: 'Nevrologiske symptomer er ofte undervurdert ved MCAS. Inkluderer hodepine, hjerneteåke, konsentrasjonsproblemer, nummenhet. Histamin påvirker blod-hjerne-barrieren og kan gi disse symptomene.'
  },
  {
    value: 'musculoskeletal',
    label: 'Muskel/skjelett',
    icon: '💪',
    examples: 'Leddsmerter, svakhet',
    tooltip: 'Muskel- og skjelettsymptomer ved MCAS skyldes betennelse fra mastceller. Inkluderer leddsmerter, muskelsmerter, svakhet, stivhet. Hjelper å identifisere inflammatoriske triggere.'
  },
  {
    value: 'genitourinary',
    label: 'Urinveier',
    icon: '🔵',
    examples: 'Blærebetennelse',
    tooltip: 'Urinveissymptomer kan forekomme ved MCAS selv uten bakteriell infeksjon. Inkluderer blærebetennelse, hyppig vannlating, ubehag. Skyldes mastcelleaktivering i urinblæren.'
  },
  {
    value: 'systemic',
    label: 'Systemisk',
    icon: '⚡',
    examples: 'Tretthet, feber',
    tooltip: 'Systemiske symptomer påvirker hele kroppen ved omfattende mastcelleaktivering. Inkluderer tretthet, feber, frysninger, svette. Indikerer sterk reaksjon og hjelper å identifisere kraftige triggere.'
  },
];

const COMMON_SYMPTOM_TYPES: Record<string, string[]> = {
  skin: ['Kløe', 'Urtikaria', 'Rødming', 'Utslett', 'Hovning'],
  digestive: ['Kvalme', 'Magesmerter', 'Diaré', 'Oppblåsthet', 'Forstoppelse'],
  respiratory: ['Pustevansker', 'Hoste', 'Trange luftveier', 'Rennende nese'],
  cardiovascular: ['Hjertebank', 'Svimmelhet', 'Blodtrykksfall', 'Brystsmerter'],
  neurological: ['Hodepine', 'Hjerneteåke', 'Konsentrasjonsproblemer', 'Nummenhet'],
  musculoskeletal: ['Leddsmerter', 'Muskelsmerter', 'Svakhet', 'Stivhet'],
  genitourinary: ['Blærebetennelse', 'Hyppig vannlating'],
  systemic: ['Tretthet', 'Feber', 'Frysninger', 'Svette'],
};

export function SymptomAddPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CaptureMode | null>(null);
  const [step, setStep] = useState<Step>('mode');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [formData, setFormData] = useState<Partial<SymptomFormData>>({
    severity: 5,
    body_regions: [],
    duration_minutes: 0,
    intensity_change: 'stable',
    started_at: new Date(),
  });

  // Fetch weather data automatically when component mounts
  useEffect(() => {
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const weather = await getWeatherAutomatically('Oslo'); // Fallback to Oslo if geolocation fails
        setWeatherData(weather?.weather || null);
      } catch (error) {
        console.error('Failed to fetch weather:', error);
        setWeatherData(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const handleModeSelect = (selectedMode: CaptureMode) => {
    setMode(selectedMode);
    if (selectedMode === 'quick') {
      setStep('quick-shortcuts');
    } else {
      setStep('detailed-form');
    }
  };

  const handleQuickSymptomLogged = () => {
    setStep('complete');
    setTimeout(() => {
      navigate('/symptoms');
    }, 2000);
  };

  const handleCategorySelect = (category: typeof SYMPTOM_CATEGORIES[0]['value']) => {
    setFormData({ ...formData, category: category as any });
    setStep('body-map');
  };

  const handleBodyMapChange = (regions: string[]) => {
    setFormData({ ...formData, body_regions: regions });
  };

  const handleBodyMapNext = () => {
    if (!formData.type) {
      alert('Vennligst velg type symptom');
      return;
    }
    setStep('room-exposure');
  };

  const handleRoomExposureComplete = (rooms: RoomExposure[]) => {
    handleSubmit(rooms);
  };

  const handleRoomExposureSkip = () => {
    handleSubmit([]);
  };

  const handleSubmit = async (roomExposures?: RoomExposure[]) => {
    if (!formData.category || !formData.type) {
      alert('Vennligst fyll ut alle påkrevde felter');
      return;
    }

    // Ensure body_regions has at least one element (backend requirement)
    const bodyRegions = formData.body_regions && formData.body_regions.length > 0
      ? formData.body_regions
      : ['general']; // Default to 'general' if no specific regions selected

    setIsSubmitting(true);
    try {
      await symptomsApi.create({
        user_id: 0, // Will be set by backend from auth token
        category: formData.category,
        type: formData.type,
        severity: formData.severity || 5,
        duration_minutes: formData.duration_minutes || 1, // Backend validation requires min 1
        intensity_change: formData.intensity_change || 'stable',
        body_regions: bodyRegions,
        started_at: formData.started_at || new Date(),
        notes: formData.notes,
        suspected_triggers: formData.suspected_triggers,
        treatment_taken: formData.treatment_taken,
        treatment_effective: formData.treatment_effective,
        capture_method: 'detailed',
        enrichment_status: 'partial',
        // Automatically include weather data if available
        weather_data: weatherData ? {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          pressure: weatherData.pressure,
          weather_code: weatherData.weather_code,
        } : undefined,
        // Include room exposures if available (from parameter, not formData)
        room_exposures: roomExposures,
      });

      setStep('complete');
      setTimeout(() => {
        navigate('/symptoms');
      }, 2000);
    } catch (error: any) {
      console.error('Failed to create symptom:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error
        ? JSON.stringify(error.response.data.error, null, 2)
        : 'Kunne ikke lagre symptom. Prøv igjen.';
      alert('Feil ved lagring:\n' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step === 'mode' ? navigate(-1) : setStep('mode')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Registrer symptom</h1>
            <p className="text-sm text-gray-600">
              {mode === 'quick' ? 'Rask registrering' : mode === 'detailed' ? 'Detaljert logging' : 'Velg metode'}
            </p>
          </div>

          {/* Weather indicator */}
          {weatherData && !weatherLoading && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <Cloud className="w-4 h-4 text-blue-600" />
              <div className="text-xs text-blue-900">
                <div className="font-medium">{weatherData.temperature.toFixed(1)}°C</div>
                <div className="text-blue-700">{weatherData.humidity}% fukt</div>
              </div>
            </div>
          )}
        </div>

        {/* Step: Mode Selection */}
        {step === 'mode' && (
          <div className="space-y-4">
            <button
              onClick={() => handleModeSelect('quick')}
              className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Rask registrering (5 sekunder)
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Perfekt for akutte symptomer. Klikk på vanlige MCAS-symptomer for øyeblikkelig logging.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Ideelt ved anafylakse eller alvorlige symptomer</span>
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleModeSelect('detailed')}
              className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Detaljert logging (2-3 minutter)
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Full symptom-detaljer med body map, alvorlighet, triggers og notater for bedre AI-analyse.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Anbefalt for best trigger-deteksjon</span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Step: Quick Shortcuts */}
        {step === 'quick-shortcuts' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <CriticalSymptomShortcuts
              onSymptomLogged={handleQuickSymptomLogged}
              weatherData={weatherData}
            />
          </div>
        )}

        {/* Step: Detailed Form - Category Selection */}
        {step === 'detailed-form' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Velg symptomkategori</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SYMPTOM_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategorySelect(cat.value as any)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                  title={cat.tooltip}
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                  <span className="text-xs text-gray-500 text-center">{cat.examples}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Body Map */}
        {step === 'body-map' && formData.category && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Hvor har du symptomer?</h2>
            <BodyMap
              selectedRegions={formData.body_regions || []}
              onChange={handleBodyMapChange}
              multiSelect={true}
              showLabels={true}
            />

            {/* Symptom Type Selection */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type symptom
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {COMMON_SYMPTOM_TYPES[formData.category]?.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, type })}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.type === type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Custom type input */}
              <input
                type="text"
                placeholder="Eller skriv inn annet symptom..."
                value={formData.type && !COMMON_SYMPTOM_TYPES[formData.category]?.includes(formData.type) ? formData.type : ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Severity Slider */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alvorlighet: <span className="text-xl font-bold text-blue-600">{formData.severity}</span>/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: parseInt(e.target.value) })}
                className="w-full h-3 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Time and Duration */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tidspunkt symptomet startet
                </label>
                <input
                  type="datetime-local"
                  value={formData.started_at ? new Date(formData.started_at.getTime() - formData.started_at.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, started_at: new Date(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Varighet (minutter)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.duration_minutes || 0}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0 = pågående"
                />
                <p className="text-xs text-gray-500 mt-1">
                  La stå på 0 hvis symptomet pågår
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notater (valgfritt)
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Legg til detaljer om symptomet..."
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep('detailed-form')}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Tilbake
              </button>
              <button
                onClick={handleBodyMapNext}
                disabled={!formData.type}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Neste: Oppholdsrom</span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Room Exposure */}
        {step === 'room-exposure' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Hvilke rom har du oppholdt deg i?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Velg rom for å hente luftkvalitetsdata fra Airthings. Dette hjelper med å koble symptomer til inneklima.
            </p>
            <RoomExposureSelector
              onComplete={handleRoomExposureComplete}
              onSkip={handleRoomExposureSkip}
            />
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Symptom registrert!</h3>
              <p className="text-gray-600">
                Symptomet er lagret og vil bli analysert for trigger-korrelasjoner.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                AI-analysemotor vil nå analysere de siste 72 timene med data for å identifisere mulige triggers.
              </p>
            </div>

            <p className="text-xs text-gray-500">
              Sender deg tilbake til symptomloggen...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
