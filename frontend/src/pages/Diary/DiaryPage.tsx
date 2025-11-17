import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Utensils, Activity, Pill, Heart, Edit, Trash2, Clock, Shield, X, Search } from 'lucide-react';
import { diaryApi, foodApi } from '../../lib/api';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { ErrorDisplay } from '../../components/UI/ErrorDisplay';
import type { ApprovedFood, Food } from '../../types/shared';

interface DiaryEntry {
  id: string;
  userId: string;
  type: 'meal' | 'symptom' | 'supplement' | 'health_metric';
  timestamp: string;
  data: any;
  createdAt: string;
  updatedAt: string;
}

interface ApprovedFoodWithFood extends ApprovedFood {
  food?: Food;
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
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [approvedFoods, setApprovedFoods] = useState<ApprovedFoodWithFood[]>([]);
  
  // New meal creation state
  const [showMealCreation, setShowMealCreation] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [selectedFoodsForMeal, setSelectedFoodsForMeal] = useState<ApprovedFoodWithFood[]>([]);
  const [mealTime, setMealTime] = useState('');
  const [foodSearchQuery, setFoodSearchQuery] = useState('');

  useEffect(() => {
    fetchEntries();
    loadApprovedFoods();
  }, [selectedDate]);

  const loadApprovedFoods = async () => {
    try {
      const approved = await foodApi.getApproved();
      
      // Load food details for each approved food
      const approvedWithFood = await Promise.all(
        approved.map(async (af) => {
          try {
            const food = await foodApi.getById(af.food_id);
            return { ...af, food };
          } catch (err) {
            console.error(`Failed to load food ${af.food_id}:`, err);
            return af;
          }
        })
      );
      
      setApprovedFoods(approvedWithFood);
    } catch (error) {
      console.error('Failed to load approved foods:', error);
    }
  };

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

  const addSafeFoodToDiary = async (approvedFood: ApprovedFoodWithFood) => {
    try {
      await diaryApi.createEntry({
        type: 'meal',
        data: {
          foods: [{
            sighi_id: approvedFood.food_id,
            name: approvedFood.food?.name_en || approvedFood.food?.name_no || 'Unknown',
            amount: '',
            unit: ''
          }]
        }
      });
      
      // Refresh entries to show the new one
      await fetchEntries();
      setShowQuickAdd(false);
      
      alert(`${approvedFood.food?.name_en || approvedFood.food?.name_no} added to diary!`);
    } catch (error) {
      console.error('Failed to add to diary:', error);
      alert('Failed to add to diary. Please try again.');
    }
  };

  // New meal creation functions
  const startMealCreation = (mealType: string) => {
    const mealInfo = MEAL_TYPES[mealType as keyof typeof MEAL_TYPES];
    setSelectedMealType(mealType);
    setMealTime(mealInfo.defaultTime);
    setSelectedFoodsForMeal([]);
    setShowMealCreation(true);
  };

  const addFoodToMeal = (approvedFood: ApprovedFoodWithFood) => {
    if (!selectedFoodsForMeal.find(f => f.id === approvedFood.id)) {
      setSelectedFoodsForMeal([...selectedFoodsForMeal, approvedFood]);
    }
  };

  const removeFoodFromMeal = (approvedFood: ApprovedFoodWithFood) => {
    setSelectedFoodsForMeal(selectedFoodsForMeal.filter(f => f.id !== approvedFood.id));
  };

  const saveMeal = async () => {
    if (selectedFoodsForMeal.length === 0) {
      alert('Legg til minst en matvare til måltidet');
      return;
    }

    try {
      const mealInfo = MEAL_TYPES[selectedMealType as keyof typeof MEAL_TYPES];

      // Combine selectedDate with mealTime to create a proper ISO timestamp
      const timestamp = `${selectedDate}T${mealTime}:00.000Z`;

      await diaryApi.createEntry({
        type: 'meal',
        timestamp,
        data: {
          meal_type: selectedMealType,
          meal_name: mealInfo.name,
          meal_time: mealTime,
          foods: selectedFoodsForMeal.map(af => ({
            sighi_id: af.food_id,
            name: af.food?.name_en || af.food?.name_no || 'Unknown',
            amount: '',
            unit: ''
          }))
        }
      });

      // Refresh entries to show the new meal
      await fetchEntries();
      
      // Reset meal creation state
      setShowMealCreation(false);
      setSelectedMealType('');
      setSelectedFoodsForMeal([]);
      
      alert(`${mealInfo.name} lagt til i dagboken!`);
    } catch (error) {
      console.error('Failed to save meal:', error);
      alert('Kunne ikke lagre måltidet. Prøv igjen.');
    }
  };

  const cancelMealCreation = () => {
    setShowMealCreation(false);
    setSelectedMealType('');
    setSelectedFoodsForMeal([]);
  };

  const formatLastConsumed = (date: Date | string) => {
    const now = new Date();
    const consumed = new Date(date);
    const diffDays = Math.floor((now.getTime() - consumed.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
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
          const mealType = entry.data.meal_type;
          const mealInfo = mealType ? MEAL_TYPES[mealType as keyof typeof MEAL_TYPES] : null;
          
          return (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                {mealInfo ? (
                  <>
                    <span className="text-lg">{mealInfo.icon}</span>
                    <h4 className="font-medium text-gray-900">{mealInfo.name}</h4>
                    {entry.data.meal_time && (
                      <span className="text-sm text-gray-500 ml-auto">
                        {entry.data.meal_time}
                      </span>
                    )}
                  </>
                ) : (
                  <h4 className="font-medium text-gray-900">Måltid</h4>
                )}
              </div>
              
              {entry.data.foods && entry.data.foods.length > 0 ? (
                <div className="space-y-1">
                  {entry.data.foods.map((food: any, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2 text-sm">
                      <Shield className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">{food.name}</span>
                      {food.amount && food.unit && (
                        <span className="text-gray-500 ml-auto">
                          {food.amount} {food.unit}
                        </span>
                      )}
                    </div>
                  ))}
                  {entry.data.foods.length > 1 && (
                    <div className="text-xs text-gray-500 mt-2">
                      {entry.data.foods.length} matvarer
                    </div>
                  )}
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
        
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>Quick Add</span>
          </button>
          <button className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Annet</span>
          </button>
        </div>
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

      {/* Meal Type Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Legg til måltid</h3>
          <p className="text-sm text-gray-600">Velg måltidstype og legg til matvarer fra din Safe Foods liste</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(MEAL_TYPES).map(([key, mealType]) => (
            <button
              key={key}
              onClick={() => startMealCreation(key)}
              className={`flex flex-col items-center space-y-2 p-4 rounded-lg border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors ${mealType.color}`}
            >
              <span className="text-2xl">{mealType.icon}</span>
              <span className="text-sm font-medium">{mealType.name}</span>
              <span className="text-xs text-gray-500">{mealType.defaultTime}</span>
            </button>
          ))}
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

      {/* Quick Add Safe Food Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add Safe Food to Diary</h3>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-96">
              {approvedFoods.length > 0 ? (
                <div className="space-y-3">
                  {approvedFoods.map((approvedFood) => (
                    <div
                      key={approvedFood.id}
                      className="flex items-center justify-between p-3 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {approvedFood.food?.name_en || approvedFood.food?.name_no || 'Unknown'}
                          </span>
                          <div className="flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <Shield className="w-3 h-3" />
                            <span>Safe</span>
                          </div>
                        </div>
                        {approvedFood.food?.category && (
                          <p className="text-sm text-gray-500">{approvedFood.food.category}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          Last consumed: {formatLastConsumed(approvedFood.last_consumed)}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => addSafeFoodToDiary(approvedFood)}
                        className="flex items-center space-x-1 bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Safe Foods Yet</h4>
                  <p className="text-gray-600">
                    Add foods to your safe list from the Food Search page first.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meal Creation Modal */}
      {showMealCreation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">
                  {MEAL_TYPES[selectedMealType as keyof typeof MEAL_TYPES]?.icon}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {MEAL_TYPES[selectedMealType as keyof typeof MEAL_TYPES]?.name}
                  </h3>
                  <p className="text-sm text-gray-600">Legg til matvarer til måltidet</p>
                </div>
              </div>
              <button
                onClick={cancelMealCreation}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Meal Time Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tidspunkt
                </label>
                <input
                  type="time"
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Selected Foods */}
              {selectedFoodsForMeal.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Valgte matvarer ({selectedFoodsForMeal.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedFoodsForMeal.map((food) => (
                      <div
                        key={food.id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-900">
                            {food.food?.name_en || food.food?.name_no || 'Unknown'}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFoodFromMeal(food)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Safe Foods */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Tilgjengelige Safe Foods
                  </h4>
                </div>

                {/* Search Field */}
                <div className="mb-3 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Søk etter matvare..."
                    value={foodSearchQuery}
                    onChange={(e) => setFoodSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {approvedFoods.length > 0 ? (
                  <div className="space-y-2">
                    {approvedFoods
                      .filter(af => !selectedFoodsForMeal.find(sf => sf.id === af.id))
                      .filter(af => {
                        if (!foodSearchQuery.trim()) return true;
                        const query = foodSearchQuery.toLowerCase();
                        const nameNo = (af.food?.name_no || '').toLowerCase();
                        const nameEn = (af.food?.name_en || '').toLowerCase();
                        const category = (af.food?.category || '').toLowerCase();
                        return nameNo.includes(query) || nameEn.includes(query) || category.includes(query);
                      })
                      .sort((a, b) => {
                        const nameA = (a.food?.name_no || a.food?.name_en || '').toLowerCase();
                        const nameB = (b.food?.name_no || b.food?.name_en || '').toLowerCase();
                        return nameA.localeCompare(nameB, 'no');
                      })
                      .map((approvedFood) => (
                      <div
                        key={approvedFood.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-gray-900">
                              {approvedFood.food?.name_en || approvedFood.food?.name_no || 'Unknown'}
                            </span>
                          </div>
                          {approvedFood.food?.category && (
                            <p className="text-sm text-gray-500 ml-6">{approvedFood.food.category}</p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => addFoodToMeal(approvedFood)}
                          className="flex items-center space-x-1 bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Legg til</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Ingen Safe Foods tilgjengelig.</p>
                    <p className="text-sm">Legg til matvarer i Safe Foods først.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <button
                onClick={cancelMealCreation}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={saveMeal}
                disabled={selectedFoodsForMeal.length === 0}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  selectedFoodsForMeal.length > 0
                    ? 'bg-primary-600 hover:bg-primary-700'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Lagre måltid ({selectedFoodsForMeal.length} matvarer)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}