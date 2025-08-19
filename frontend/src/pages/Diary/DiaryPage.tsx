import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Utensils, Activity, Pill, Heart, Edit, Trash2, Clock } from 'lucide-react';
import { diaryApi } from '../../lib/api';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { ErrorDisplay } from '../../components/UI/ErrorDisplay';

interface DiaryEntry {
  id: string;
  userId: string;
  type: 'meal' | 'symptom' | 'supplement' | 'health_metric';
  timestamp: string;
  data: any;
  createdAt: string;
  updatedAt: string;
}

const ENTRY_TYPE_ICONS = {
  meal: Utensils,
  symptom: Activity,
  supplement: Pill,
  health_metric: Heart,
};

const ENTRY_TYPE_COLORS = {
  meal: 'bg-green-50 text-green-700 border-green-200',
  symptom: 'bg-red-50 text-red-700 border-red-200',
  supplement: 'bg-blue-50 text-blue-700 border-blue-200',
  health_metric: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchEntries();
  }, [selectedDate]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await diaryApi.getEntries({ 
        date: selectedDate,
        limit: 100 
      });
      setEntries(result.entries || []);
    } catch (err) {
      setError('Failed to load diary entries');
      console.error('Failed to fetch diary entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await diaryApi.deleteEntry(entryId);
      setEntries(entries.filter(entry => entry.id !== entryId));
    } catch (err) {
      console.error('Failed to delete entry:', err);
      alert('Failed to delete entry. Please try again.');
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
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const EntryCard = ({ entry }: { entry: DiaryEntry }) => {
    const Icon = ENTRY_TYPE_ICONS[entry.type];
    const colorClass = ENTRY_TYPE_COLORS[entry.type];

    const renderEntryContent = () => {
      switch (entry.type) {
        case 'meal':
          return (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Måltid</h4>
              {entry.data.foods && entry.data.foods.length > 0 ? (
                <div className="space-y-1">
                  {entry.data.foods.map((food: any, idx: number) => (
                    <div key={idx} className="text-sm text-gray-700">
                      • {food.name}
                      {food.amount && food.unit && (
                        <span className="text-gray-500 ml-1">
                          ({food.amount} {food.unit})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Ingen mat registrert</p>
              )}
            </div>
          );

        case 'symptom':
          return (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Symptom</h4>
              {entry.data.symptom_type && (
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Type:</span> {entry.data.symptom_type}
                </p>
              )}
              {entry.data.severity && (
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Alvorlighet:</span> {entry.data.severity}/10
                </p>
              )}
              {entry.data.duration_minutes && (
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Varighet:</span> {entry.data.duration_minutes} min
                </p>
              )}
              {entry.data.description && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Beskrivelse:</span> {entry.data.description}
                </p>
              )}
            </div>
          );

        case 'supplement':
          return (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Kosttilskudd</h4>
              {entry.data.supplement_name && (
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Navn:</span> {entry.data.supplement_name}
                </p>
              )}
              {entry.data.dosage && (
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Dose:</span> {entry.data.dosage}
                </p>
              )}
              {entry.data.supplement_type && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Type:</span> {entry.data.supplement_type}
                </p>
              )}
            </div>
          );

        case 'health_metric':
          return (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Helse-måling</h4>
              {entry.data.metric_type && (
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Type:</span> {entry.data.metric_type}
                </p>
              )}
              {entry.data.value && (
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Verdi:</span> {entry.data.value}/10
                </p>
              )}
              {entry.data.notes && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Notater:</span> {entry.data.notes}
                </p>
              )}
            </div>
          );

        default:
          return <p className="text-sm text-gray-500">Ukjent entry type</p>;
      }
    };

    return (
      <div className={`bg-white rounded-lg border p-4 ${colorClass.split(' ')[2]}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-full ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatTime(entry.timestamp)}</span>
            </div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => deleteEntry(entry.id)}
              className="text-gray-400 hover:text-red-600 p-1"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {renderEntryContent()}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Min Dagbok
          </h1>
          <p className="text-gray-600">
            Spor mat, symptomer, kosttilskudd og helse-målinger
          </p>
        </div>
        
        <button className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span>Legg til entry</span>
        </button>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">Velg dato:</label>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
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
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Entries for {formatDate(selectedDate + 'T00:00:00')}
            </h2>
            <span className="text-sm text-gray-500">
              {entries.length} entries
            </span>
          </div>

          {entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Ingen entries for denne datoen
              </h3>
              <p className="text-gray-600 mb-4">
                Legg til mat, symptomer eller andre entries for å spore din helse
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}