import React, { useState, useEffect } from 'react';
import { Calendar, Utensils, Activity, Pill, Heart, Edit, Trash2, Clock, X, ChevronRight, ChevronLeft, AlertCircle, Thermometer } from 'lucide-react';
import { diaryApi } from '../../lib/api';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { ErrorDisplay } from '../../components/UI/ErrorDisplay';

interface DiaryEntry {
  id: string;
  userId: string;
  type: 'meal' | 'symptom' | 'supplement' | 'health_metric' | 'activity' | 'medication' | 'illness';
  timestamp: string;
  data: any;
  createdAt: string;
  updatedAt: string;
}

const ENTRY_TYPE_ICONS = {
  meal: Utensils,
  symptom: Activity,
  supplement: Pill,
  medication: Pill,
  illness: Thermometer,
  health_metric: Heart,
  activity: AlertCircle,
};

const ENTRY_TYPE_LABELS = {
  meal: 'Måltid',
  symptom: 'Symptom',
  supplement: 'Kosttilskudd',
  medication: 'Medisin',
  illness: 'Sykdom',
  health_metric: 'Helsemåling',
  activity: 'Aktivitet',
};

const ENTRY_TYPE_COLORS = {
  meal: 'bg-green-50 text-green-700 border-green-200',
  symptom: 'bg-red-50 text-red-700 border-red-200',
  supplement: 'bg-blue-50 text-blue-700 border-blue-200',
  medication: 'bg-purple-50 text-purple-700 border-purple-200',
  illness: 'bg-red-50 text-red-700 border-red-200',
  health_metric: 'bg-pink-50 text-pink-700 border-pink-200',
  activity: 'bg-orange-50 text-orange-700 border-orange-200',
};

const MEAL_TYPES = {
  breakfast: {
    name: 'Frokost',
    icon: '🌅',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    defaultTime: '08:00'
  },
  lunch: {
    name: 'Lunsj',
    icon: '☀️',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    defaultTime: '12:00'
  },
  dinner: {
    name: 'Middag',
    icon: '🌆',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    defaultTime: '18:00'
  },
  evening: {
    name: 'Kvelds',
    icon: '🌙',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    defaultTime: '21:00'
  },
  snack: {
    name: 'Mellommåltid',
    icon: '🍎',
    color: 'bg-green-50 text-green-700 border-green-200',
    defaultTime: '15:00'
  }
};

export function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('day');

  // View filter state
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);

  // Edit state
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Date navigation functions
  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const isFutureDate = new Date(selectedDate) > new Date();

  const getDateRangeLabel = () => {
    const date = new Date(selectedDate);

    if (dateRange === 'day') {
      return formatDate(selectedDate + 'T00:00:00');
    } else if (dateRange === 'week') {
      const dayOfWeek = date.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(date);
      monday.setDate(date.getDate() + diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const weekNum = getWeekNumber(date);
      return `Uke ${weekNum} (${monday.getDate()}.${monday.getMonth() + 1} - ${sunday.getDate()}.${sunday.getMonth() + 1})`;
    } else if (dateRange === 'month') {
      const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }

    return formatDate(selectedDate + 'T00:00:00');
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedDate, dateRange]);

  const getDateRangeParams = () => {
    const date = new Date(selectedDate);

    if (dateRange === 'day') {
      return { date: selectedDate, limit: 100 };
    } else if (dateRange === 'week') {
      // Get start of week (Monday)
      const dayOfWeek = date.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust when day is Sunday
      const monday = new Date(date);
      monday.setDate(date.getDate() + diff);

      // Get end of week (Sunday)
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        startDate: monday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0],
        limit: 500
      };
    } else if (dateRange === 'month') {
      // Get first day of month
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);

      // Get last day of month
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      return {
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0],
        limit: 1000
      };
    }

    return { date: selectedDate, limit: 100 };
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = getDateRangeParams();
      const result = await diaryApi.getEntries(params);
      setEntries(result.entries || []);
    } catch (err) {
      setError('Failed to load diary entries');
      console.error('Failed to fetch diary entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditEntry = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  const updateEntry = async (entryId: string, updatedData: any) => {
    try {
      await diaryApi.updateEntry(entryId, updatedData);
      await fetchEntries();
      setShowEditModal(false);
      setEditingEntry(null);
      alert('Oppføringen ble oppdatert!');
    } catch (err) {
      console.error('Failed to update entry:', err);
      alert('Kunne ikke oppdatere oppføringen. Vennligst prøv igjen.');
    }
  };

  const deleteEntry = async (entryId: string, entryType: string) => {
    if (!confirm('Er du sikker på at du vil slette denne oppføringen?')) return;

    try {
      await diaryApi.deleteEntry(entryId, entryType);
      setEntries(entries.filter(entry => entry.id !== entryId));
    } catch (err) {
      console.error('Failed to delete entry:', err);
      alert('Kunne ikke slette oppføringen. Vennligst prøv igjen.');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('no-NO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('no-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Group entries by type
  const groupEntriesByType = (entries: DiaryEntry[]) => {
    const grouped: Record<string, DiaryEntry[]> = {
      meal: [],
      symptom: [],
      supplement: [],
      medication: [],
      illness: [],
      activity: [],
      health_metric: []
    };

    entries.forEach(entry => {
      if (grouped[entry.type]) {
        grouped[entry.type].push(entry);
      }
    });

    return grouped;
  };

  const groupEntriesByDate = (entries: DiaryEntry[]) => {
    const grouped: Record<string, DiaryEntry[]> = {};

    entries.forEach(entry => {
      const date = entry.timestamp.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const sortedGrouped: Record<string, DiaryEntry[]> = {};
    sortedDates.forEach(date => {
      sortedGrouped[date] = grouped[date];
    });

    return sortedGrouped;
  };

  // Get filtered entries
  const getFilteredEntries = () => {
    if (!activeTypeFilter) return entries;
    return entries.filter(entry => entry.type === activeTypeFilter);
  };

  const groupedEntries = groupEntriesByType(getFilteredEntries());
  const entryCounts = groupEntriesByType(entries);
  const entriesByDate = groupEntriesByDate(entries);

  const TypeFilterButton = ({ type, count }: { type: string; count: number }) => {
    const Icon = ENTRY_TYPE_ICONS[type as keyof typeof ENTRY_TYPE_ICONS];
    const isActive = activeTypeFilter === type;
    const colorClass = ENTRY_TYPE_COLORS[type as keyof typeof ENTRY_TYPE_COLORS];

    return (
      <button
        onClick={() => setActiveTypeFilter(isActive ? null : type)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
          isActive
            ? colorClass
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">
          {ENTRY_TYPE_LABELS[type as keyof typeof ENTRY_TYPE_LABELS]}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          isActive ? 'bg-white/50' : 'bg-gray-100'
        }`}>
          {count}
        </span>
      </button>
    );
  };

  const CompactEntryCard = ({ entry }: { entry: DiaryEntry }) => {
    const renderCompactContent = () => {
      switch (entry.type) {
        case 'meal':
          const mealType = entry.data.meal_type;
          const mealInfo = mealType ? MEAL_TYPES[mealType as keyof typeof MEAL_TYPES] : null;
          const foodCount = entry.data.foods?.length || 0;
          const foodNames = entry.data.foods?.slice(0, 3).map((f: any) => f.name).join(', ') || '';

          return (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl flex-shrink-0">{mealInfo?.icon || '🍽️'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{mealInfo?.name || 'Måltid'}</div>
                <div className="text-sm text-gray-600 truncate">
                  {foodNames}{foodCount > 3 ? ` +${foodCount - 3}` : ''}
                </div>
              </div>
            </div>
          );

        case 'symptom':
          return (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                entry.data.severity >= 7 ? 'bg-red-100 text-red-700' :
                entry.data.severity >= 4 ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {entry.data.severity}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{entry.data.symptom_type}</div>
                {entry.data.duration_minutes && (
                  <div className="text-sm text-gray-600">{entry.data.duration_minutes} min</div>
                )}
              </div>
            </div>
          );

        case 'supplement':
          return (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Pill className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{entry.data.supplement_name}</div>
                <div className="text-sm text-gray-600">{entry.data.dosage}</div>
              </div>
            </div>
          );

        case 'medication':
          return (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Pill className="w-8 h-8 text-purple-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{entry.data.medication_name}</div>
                <div className="text-sm text-gray-600">
                  {entry.data.dosage} {entry.data.dosage_unit}
                  {entry.data.medication_type && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({entry.data.medication_type === 'mcas' ? 'MCAS' :
                        entry.data.medication_type === 'prescription' ? 'Reseptbelagt' :
                        entry.data.medication_type === 'over_counter' ? 'Reseptfri' :
                        entry.data.medication_type === 'supplement' ? 'Kosttilskudd' :
                        entry.data.medication_type})
                    </span>
                  )}
                </div>
              </div>
            </div>
          );

        case 'illness':
          return (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Thermometer className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {entry.data.illness_type === 'flu' ? 'Influensa' :
                   entry.data.illness_type === 'cold' ? 'Forkjølelse' :
                   entry.data.illness_type === 'covid' ? 'COVID-19' :
                   entry.data.illness_type === 'stomach_bug' ? 'Mageinfeksjon' :
                   entry.data.illness_type === 'other' ? entry.data.custom_illness_name || 'Annen sykdom' :
                   'Sykdom'}
                </div>
                <div className="text-sm text-gray-600">
                  Alvorlighet: {entry.data.severity}/10
                  {entry.data.has_fever && entry.data.temperature_celsius && (
                    <span className="ml-2">• {entry.data.temperature_celsius}°C</span>
                  )}
                </div>
              </div>
            </div>
          );

        case 'activity':
          return (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {entry.data.activity_type === 'social_trigger' ? 'Sosial trigger' :
                   entry.data.activity_type === 'temperature_change' ? 'Temperaturendring' :
                   entry.data.activity_type === 'physical_activity' ? 'Fysisk aktivitet' :
                   'Aktivitet'}
                </div>
                {entry.data.location_description && (
                  <div className="text-sm text-gray-600 truncate">{entry.data.location_description}</div>
                )}
              </div>
            </div>
          );

        case 'health_metric':
          return (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Heart className="w-8 h-8 text-purple-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">Helsemåling</div>
                <div className="text-sm text-gray-600 flex gap-3">
                  {entry.data.sleep_quality && <span>Søvn: {entry.data.sleep_quality}/10</span>}
                  {entry.data.energy_level && <span>Energi: {entry.data.energy_level}/10</span>}
                  {entry.data.stress_level && <span>Stress: {entry.data.stress_level}/10</span>}
                </div>
              </div>
            </div>
          );

        default:
          return <div className="text-sm text-gray-500">Ukjent type</div>;
      }
    };

    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-2 text-xs text-gray-500 w-16 flex-shrink-0">
          <Clock className="w-3 h-3" />
          <span>{formatTime(entry.timestamp)}</span>
        </div>
        {renderCompactContent()}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => startEditEntry(entry)}
            className="text-gray-400 hover:text-blue-600 p-1"
            title="Rediger"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => deleteEntry(entry.id, entry.type)}
            className="text-gray-400 hover:text-red-600 p-1"
            title="Slett"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const TypeSection = ({ type, entries: typeEntries }: { type: string; entries: DiaryEntry[] }) => {
    if (typeEntries.length === 0) return null;

    const Icon = ENTRY_TYPE_ICONS[type as keyof typeof ENTRY_TYPE_ICONS];
    const colorClass = ENTRY_TYPE_COLORS[type as keyof typeof ENTRY_TYPE_COLORS];

    return (
      <div className="mb-6">
        <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${colorClass.replace('border', 'border-l-4')}`}>
          <Icon className="w-5 h-5" />
          <h3 className="font-semibold text-lg">
            {ENTRY_TYPE_LABELS[type as keyof typeof ENTRY_TYPE_LABELS]}
          </h3>
          <span className="text-sm opacity-75">({typeEntries.length})</span>
        </div>
        <div className="space-y-2">
          {typeEntries.map(entry => (
            <CompactEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Min Dagbok</h1>
            <p className="text-indigo-100">
              {getDateRangeLabel()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{entries.length}</div>
            <div className="text-sm text-indigo-100">oppføringer</div>
          </div>
        </div>
      </div>

      {/* Date Navigation & Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        {/* Navigation Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Previous Day Button */}
          <button
            onClick={goToPreviousDay}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Forrige</span>
          </button>

          {/* Date Display & Picker */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
              />
            </div>
            {!isToday && (
              <button
                onClick={goToToday}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Gå til i dag
              </button>
            )}
          </div>

          {/* Next Day Button */}
          <button
            onClick={goToNextDay}
            disabled={isFutureDate}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-sm font-medium hidden sm:inline">Neste</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Vis:</span>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setDateRange('day')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                dateRange === 'day'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dag
            </button>
            <button
              onClick={() => setDateRange('week')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                dateRange === 'week'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Uke
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                dateRange === 'month'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Måned
            </button>
          </div>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        <TypeFilterButton type="meal" count={entryCounts.meal.length} />
        <TypeFilterButton type="symptom" count={entryCounts.symptom.length} />
        <TypeFilterButton type="medication" count={entryCounts.medication?.length || 0} />
        <TypeFilterButton type="supplement" count={entryCounts.supplement.length} />
        <TypeFilterButton type="activity" count={entryCounts.activity.length} />
        <TypeFilterButton type="health_metric" count={entryCounts.health_metric.length} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorDisplay
          error={error}
          onRetry={fetchEntries}
          showRetry={true}
        />
      ) : entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ingen oppføringer for denne datoen
          </h3>
          <p className="text-gray-600 mb-4">
            Legg til mat, symptomer eller andre oppføringer for å spore din helse
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {dateRange !== 'day' ? (
            // Show entries grouped by date for week/month view
            Object.entries(entriesByDate).map(([date, dateEntries]) => {
              const groupedByType = groupEntriesByType(dateEntries);
              return (
                <div key={date} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                    {formatDate(date + 'T00:00:00')}
                    <span className="text-sm font-normal text-gray-500 ml-2">({dateEntries.length} oppføringer)</span>
                  </h3>
                  {!activeTypeFilter ? (
                    <>
                      <TypeSection type="meal" entries={groupedByType.meal} />
                      <TypeSection type="symptom" entries={groupedByType.symptom} />
                      <TypeSection type="medication" entries={groupedByType.medication || []} />
                      <TypeSection type="illness" entries={groupedByType.illness || []} />
                      <TypeSection type="supplement" entries={groupedByType.supplement} />
                      <TypeSection type="activity" entries={groupedByType.activity} />
                      <TypeSection type="health_metric" entries={groupedByType.health_metric} />
                    </>
                  ) : (
                    <div className="space-y-2">
                      {dateEntries.filter(e => e.type === activeTypeFilter).map(entry => (
                        <CompactEntryCard key={entry.id} entry={entry} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Show single day view
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              {!activeTypeFilter ? (
                <>
                  <TypeSection type="meal" entries={groupedEntries.meal} />
                  <TypeSection type="symptom" entries={groupedEntries.symptom} />
                  <TypeSection type="medication" entries={groupedEntries.medication || []} />
                  <TypeSection type="illness" entries={groupedEntries.illness || []} />
                  <TypeSection type="supplement" entries={groupedEntries.supplement} />
                  <TypeSection type="activity" entries={groupedEntries.activity} />
                  <TypeSection type="health_metric" entries={groupedEntries.health_metric} />
                </>
              ) : (
                <div className="space-y-2">
                  {getFilteredEntries().map(entry => (
                    <CompactEntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Rediger {ENTRY_TYPE_LABELS[editingEntry.type as keyof typeof ENTRY_TYPE_LABELS]}
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEntry(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {editingEntry.type === 'activity' && (
                <ActivityEditForm
                  entry={editingEntry}
                  onSave={(data) => updateEntry(editingEntry.id, data)}
                  onCancel={() => {
                    setShowEditModal(false);
                    setEditingEntry(null);
                  }}
                />
              )}

              {editingEntry.type === 'health_metric' && (
                <HealthMetricEditForm
                  entry={editingEntry}
                  onSave={(data) => updateEntry(editingEntry.id, data)}
                  onCancel={() => {
                    setShowEditModal(false);
                    setEditingEntry(null);
                  }}
                />
              )}

              {editingEntry.type === 'supplement' && (
                <SupplementEditForm
                  entry={editingEntry}
                  onSave={(data) => updateEntry(editingEntry.id, data)}
                  onCancel={() => {
                    setShowEditModal(false);
                    setEditingEntry(null);
                  }}
                />
              )}

              {(editingEntry.type === 'meal' || editingEntry.type === 'symptom' || editingEntry.type === 'medication' || editingEntry.type === 'illness') && (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    Redigering av {ENTRY_TYPE_LABELS[editingEntry.type as keyof typeof ENTRY_TYPE_LABELS].toLowerCase()}
                    {' '}er ikke tilgjengelig ennå.
                  </p>
                  <p className="text-sm text-gray-500">
                    Du kan slette og legge til på nytt i mellomtiden.
                  </p>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingEntry(null);
                    }}
                    className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Lukk
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Activity Edit Form Component
function ActivityEditForm({ entry, onSave, onCancel }: {
  entry: DiaryEntry;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [activityType, setActivityType] = useState(entry.data.activity_type || 'physical_activity');
  const [duration, setDuration] = useState(entry.data.duration_minutes || '');
  const [intensity, setIntensity] = useState(entry.data.intensity || 'moderate');
  const [location, setLocation] = useState(entry.data.location_description || '');
  const [notes, setNotes] = useState(entry.data.notes || '');
  const [timestamp, setTimestamp] = useState(
    new Date(entry.timestamp).toISOString().slice(0, 16)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type: 'activity',
      timestamp: new Date(timestamp).toISOString(),
      data: {
        activity_type: activityType,
        duration_minutes: duration ? parseInt(duration) : undefined,
        intensity,
        location_description: location,
        notes
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tidspunkt
        </label>
        <input
          type="datetime-local"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type aktivitet
        </label>
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="physical_activity">Fysisk aktivitet</option>
          <option value="social_trigger">Sosial trigger</option>
          <option value="temperature_change">Temperaturendring</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Varighet (minutter)
        </label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          min="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Intensitet
        </label>
        <select
          value={intensity}
          onChange={(e) => setIntensity(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="light">Lett</option>
          <option value="moderate">Moderat</option>
          <option value="intense">Intens</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sted/Beskrivelse
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="F.eks. 'Treningssenter', 'Utendørs'"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notater
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          rows={3}
          placeholder="Eventuelle notater..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Avbryt
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Lagre endringer
        </button>
      </div>
    </form>
  );
}

// Health Metric Edit Form Component
function HealthMetricEditForm({ entry, onSave, onCancel }: {
  entry: DiaryEntry;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [sleepQuality, setSleepQuality] = useState(entry.data.sleep_quality || '');
  const [energyLevel, setEnergyLevel] = useState(entry.data.energy_level || '');
  const [stressLevel, setStressLevel] = useState(entry.data.stress_level || '');
  const [moodRating, setMoodRating] = useState(entry.data.mood_rating || '');
  const [notes, setNotes] = useState(entry.data.notes || '');
  const [timestamp, setTimestamp] = useState(
    new Date(entry.timestamp).toISOString().slice(0, 16)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type: 'health_metric',
      timestamp: new Date(timestamp).toISOString(),
      data: {
        sleep_quality: sleepQuality ? parseInt(sleepQuality) : undefined,
        energy_level: energyLevel ? parseInt(energyLevel) : undefined,
        stress_level: stressLevel ? parseInt(stressLevel) : undefined,
        mood_rating: moodRating ? parseInt(moodRating) : undefined,
        notes
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tidspunkt
        </label>
        <input
          type="datetime-local"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Søvnkvalitet (1-10)
        </label>
        <input
          type="number"
          value={sleepQuality}
          onChange={(e) => setSleepQuality(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          min="1"
          max="10"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Energinivå (1-10)
        </label>
        <input
          type="number"
          value={energyLevel}
          onChange={(e) => setEnergyLevel(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          min="1"
          max="10"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Stressnivå (1-10)
        </label>
        <input
          type="number"
          value={stressLevel}
          onChange={(e) => setStressLevel(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          min="1"
          max="10"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Humør (1-10)
        </label>
        <input
          type="number"
          value={moodRating}
          onChange={(e) => setMoodRating(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          min="1"
          max="10"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notater
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          rows={3}
          placeholder="Eventuelle notater..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Avbryt
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Lagre endringer
        </button>
      </div>
    </form>
  );
}

// Supplement Edit Form Component
function SupplementEditForm({ entry, onSave, onCancel }: {
  entry: DiaryEntry;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(entry.data.supplement_name || '');
  const [type, setType] = useState(entry.data.supplement_type || 'other');
  const [dosage, setDosage] = useState(entry.data.dosage || '');
  const [notes, setNotes] = useState(entry.data.notes || '');
  const [timestamp, setTimestamp] = useState(
    new Date(entry.timestamp).toISOString().slice(0, 16)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse dosage into amount and unit
    const dosageParts = dosage.trim().split(' ');
    const dosageAmount = parseFloat(dosageParts[0]) || 0;
    const dosageUnit = dosageParts.slice(1).join(' ') || 'stk';

    onSave({
      type: 'supplement',
      timestamp: new Date(timestamp).toISOString(),
      data: {
        name,
        type,
        dosage_amount: dosageAmount,
        dosage_unit: dosageUnit,
        frequency: 'once',
        notes
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tidspunkt
        </label>
        <input
          type="datetime-local"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Navn
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="F.eks. 'DAO', 'Antihistamin'"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="antihistamine">Antihistamin</option>
          <option value="mast_cell_stabilizer">Mastcellestabilisator</option>
          <option value="dao_supplement">DAO tilskudd</option>
          <option value="probiotic">Probiotika</option>
          <option value="vitamin">Vitamin</option>
          <option value="mineral">Mineral</option>
          <option value="herbal">Urtete</option>
          <option value="prescription">Reseptbelagt</option>
          <option value="other">Annet</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dosering
        </label>
        <input
          type="text"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="F.eks. '1 tablett', '500 mg'"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notater
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          rows={3}
          placeholder="Eventuelle notater..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Avbryt
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Lagre endringer
        </button>
      </div>
    </form>
  );
}
