import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Utensils, Activity, Pill, Heart, Edit, Trash2, Clock, Shield, X, Search, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { diaryApi, foodApi } from '../../lib/api';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { ErrorDisplay } from '../../components/UI/ErrorDisplay';
import type { ApprovedFood, Food } from '../../types/shared';
import {
  FOOD_CATEGORIES,
  getUniqueCategoriesFromFoods,
  sortCategoriesByRelevance,
  foodMatchesCategory
} from '../../utils/categoryHelpers';

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

  // Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); // 1=Time, 2=Category, 3=Quantity
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [foodQuantities, setFoodQuantities] = useState<Record<number, { amount: number; unit: string }>>({});

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
    if (!confirm('Er du sikker på at du vil slette denne oppføringen?')) return;

    try {
      await diaryApi.deleteEntry(entryId);
      setEntries(entries.filter(entry => entry.id !== entryId));
    } catch (err) {
      console.error('Failed to delete entry:', err);
      alert('Kunne ikke slette oppføringen. Vennligst prøv igjen.');
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
    setCurrentCategory(null);
    setCompletedCategories([]);
    setFoodQuantities({});
    setFoodSearchQuery('');
    setWizardStep(1);
    setShowMealCreation(true);
  };

  const selectCategory = (categoryKey: string) => {
    setCurrentCategory(categoryKey);
    setFoodSearchQuery('');
  };

  const finishCategorySelection = () => {
    if (currentCategory && !completedCategories.includes(currentCategory)) {
      setCompletedCategories(prev => [...prev, currentCategory]);
    }
    setCurrentCategory(null);
    setFoodSearchQuery('');
  };

  const proceedToQuantityInput = () => {
    if (selectedFoodsForMeal.length === 0) {
      alert('Legg til minst en matvare');
      return;
    }
    // Initialize quantities with default values
    const initialQuantities: Record<number, { amount: number; unit: string }> = {};
    selectedFoodsForMeal.forEach(food => {
      initialQuantities[food.id] = foodQuantities[food.id] || { amount: 100, unit: 'g' };
    });
    setFoodQuantities(initialQuantities);
    setWizardStep(3);
  };

  const addFoodToMeal = (approvedFood: ApprovedFoodWithFood) => {
    if (!selectedFoodsForMeal.find(f => f.id === approvedFood.id)) {
      setSelectedFoodsForMeal([...selectedFoodsForMeal, approvedFood]);
    }
  };

  const removeFoodFromMeal = (approvedFood: ApprovedFoodWithFood) => {
    setSelectedFoodsForMeal(selectedFoodsForMeal.filter(f => f.id !== approvedFood.id));
    // Remove quantity data for this food
    const newQuantities = { ...foodQuantities };
    delete newQuantities[approvedFood.id];
    setFoodQuantities(newQuantities);
  };

  const updateFoodQuantity = (foodId: number, amount: number, unit: string) => {
    setFoodQuantities(prev => ({
      ...prev,
      [foodId]: { amount, unit }
    }));
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
          foods: selectedFoodsForMeal.map(af => {
            const quantity = foodQuantities[af.id] || { amount: 0, unit: 'g' };
            return {
              sighi_id: af.food_id,
              name: af.food?.name_en || af.food?.name_no || 'Unknown',
              amount: quantity.amount.toString(),
              unit: quantity.unit
            };
          })
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

  // Group meal entries by meal_type and approximate time (within 30 minutes)
  const groupMealEntries = (entries: DiaryEntry[]): DiaryEntry[] => {
    const grouped: DiaryEntry[] = [];
    const mealGroups = new Map<string, DiaryEntry[]>();

    entries.forEach(entry => {
      if (entry.type === 'meal') {
        const mealType = entry.data.meal_type;
        const timestamp = new Date(entry.timestamp).getTime();

        // Create a key based on meal_type and rounded time (30-minute windows)
        const timeWindow = Math.floor(timestamp / (30 * 60 * 1000)); // 30-minute windows
        const groupKey = `${mealType}-${timeWindow}`;

        if (!mealGroups.has(groupKey)) {
          mealGroups.set(groupKey, []);
        }
        mealGroups.get(groupKey)!.push(entry);
      } else {
        // Non-meal entries are added as-is
        grouped.push(entry);
      }
    });

    // Convert grouped meals into combined entries
    mealGroups.forEach(group => {
      if (group.length > 1) {
        // Combine multiple meal entries into one
        const firstEntry = group[0];
        const allFoods = group.flatMap(e => e.data.foods || []);

        grouped.push({
          ...firstEntry,
          data: {
            ...firstEntry.data,
            foods: allFoods
          }
        });
      } else {
        // Single entry, add as-is
        grouped.push(group[0]);
      }
    });

    // Sort by timestamp again after grouping
    return grouped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const EntryCard = ({ entry }: { entry: DiaryEntry }) => {
    const Icon = ENTRY_TYPE_ICONS[entry.type];
    const colorClass = ENTRY_TYPE_COLORS[entry.type];
    const [expanded, setExpanded] = useState(false);

    const renderEntryContent = () => {
      switch (entry.type) {
        case 'meal':
          const mealType = entry.data.meal_type;
          const mealInfo = mealType ? MEAL_TYPES[mealType as keyof typeof MEAL_TYPES] : null;
          const foodCount = entry.data.foods?.length || 0;

          return (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {mealInfo ? (
                    <>
                      <span className="text-xl">{mealInfo.icon}</span>
                      <h4 className="font-semibold text-gray-900">{mealInfo.name}</h4>
                    </>
                  ) : (
                    <h4 className="font-semibold text-gray-900">Måltid</h4>
                  )}
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {foodCount} {foodCount === 1 ? 'matvare' : 'matvarer'}
                  </span>
                </div>
              </div>

              {entry.data.foods && entry.data.foods.length > 0 ? (
                <div className="space-y-1">
                  {/* Always show first 3 foods */}
                  {entry.data.foods.slice(0, expanded ? undefined : 3).map((food: any, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2 text-sm">
                      <Shield className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">{food.name}</span>
                      {expanded && food.amount && food.unit && (
                        <span className="text-gray-500 ml-auto text-xs">
                          {food.amount} {food.unit}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Show expand/collapse button if more than 3 foods */}
                  {foodCount > 3 && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-1"
                    >
                      {expanded ? '− Vis mindre' : `+ Vis ${foodCount - 3} til`}
                    </button>
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
              {formatDate(selectedDate + 'T00:00:00')}
            </h2>
            <span className="text-sm text-gray-500">
              {groupMealEntries(entries).length} oppføringer
            </span>
          </div>

          {entries.length > 0 ? (
            <div className="space-y-3">
              {groupMealEntries(entries).map((entry, idx) => (
                <EntryCard key={`${entry.id}-${idx}`} entry={entry} />
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
            
            {/* Breadcrumb / Progress */}
            <div className="px-4 py-3 bg-gray-50 border-b">
              <div className="flex items-center justify-center space-x-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${wizardStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {wizardStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${wizardStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {wizardStep > 2 ? <Check className="w-4 h-4" /> : '2'}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${wizardStep >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  3
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <span className="text-xs text-gray-600">Tidspunkt</span>
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-600">Kategorier & Mat</span>
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-600">Mengder</span>
              </div>
              {completedCategories.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  {completedCategories.map(cat => (
                    <span key={cat} className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      {FOOD_CATEGORIES[cat].emoji} {FOOD_CATEGORIES[cat].name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Step 1: Meal Time Input */}
              {wizardStep === 1 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Når spiste du?</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tidspunkt
                    </label>
                    <input
                      type="time"
                      value={mealTime}
                      onChange={(e) => setMealTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Category Selection OR Food Selection within Category */}
              {wizardStep === 2 && (
                <div>
                  {!currentCategory ? (
                    /* Show category selection */
                    <>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Velg kategori</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        {completedCategories.length > 0
                          ? 'Velg neste kategori eller gå videre til mengder'
                          : 'Hvilken type mat vil du legge til?'}
                      </p>

                      {(() => {
                        const uniqueCategories = getUniqueCategoriesFromFoods(approvedFoods);
                        const sortedCategories = sortCategoriesByRelevance(uniqueCategories, selectedMealType);
                        const availableCategories = sortedCategories.filter(cat => !completedCategories.includes(cat));

                        return (
                          <>
                            <div className="grid grid-cols-3 gap-3">
                              {availableCategories.map(categoryKey => {
                                const categoryInfo = FOOD_CATEGORIES[categoryKey];

                                return (
                                  <button
                                    key={categoryKey}
                                    onClick={() => selectCategory(categoryKey)}
                                    className="relative flex flex-col items-center space-y-2 p-4 rounded-lg border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 bg-white transition-all"
                                  >
                                    <span className="text-3xl">{categoryInfo.emoji}</span>
                                    <span className="text-sm font-medium text-gray-900">{categoryInfo.name}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {availableCategories.length === 0 && completedCategories.length > 0 && (
                              <div className="text-center py-8 text-gray-500">
                                <p>Alle kategorier er fullført!</p>
                                <p className="text-sm">Klikk "Fortsett" for å gå til mengder.</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    /* Show food selection for current category */
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{FOOD_CATEGORIES[currentCategory].emoji}</span>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {FOOD_CATEGORIES[currentCategory].name}
                          </h4>
                        </div>
                        <button
                          onClick={finishCategorySelection}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Ferdig med kategori
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Velg matvarer fra {FOOD_CATEGORIES[currentCategory].name.toLowerCase()}
                      </p>

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

                      {/* Available Foods (filtered by current category only) */}
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {approvedFoods
                          .filter(af => !selectedFoodsForMeal.find(sf => sf.id === af.id))
                          .filter(af => af.food && foodMatchesCategory(af.food, currentCategory))
                          .filter(af => {
                            if (!foodSearchQuery.trim()) return true;
                            const query = foodSearchQuery.toLowerCase();
                            const nameNo = (af.food?.name_no || '').toLowerCase();
                            const nameEn = (af.food?.name_en || '').toLowerCase();
                            return nameNo.includes(query) || nameEn.includes(query);
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

                      {/* Selected Foods from current category */}
                      {selectedFoodsForMeal.filter(f => f.food && foodMatchesCategory(f.food, currentCategory)).length > 0 && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-2">
                            Valgt fra {FOOD_CATEGORIES[currentCategory].name.toLowerCase()}:
                          </p>
                          <div className="space-y-1">
                            {selectedFoodsForMeal
                              .filter(f => f.food && foodMatchesCategory(f.food, currentCategory))
                              .map(food => (
                                <div key={food.id} className="flex items-center justify-between">
                                  <span className="text-sm text-green-900">
                                    {food.food?.name_en || food.food?.name_no}
                                  </span>
                                  <button
                                    onClick={() => removeFoodFromMeal(food)}
                                    className="text-red-600 hover:text-red-700 p-1"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Quantity Input */}
              {wizardStep === 3 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Hvor mye?</h4>
                  <p className="text-sm text-gray-600 mb-4">Angi mengde for hver matvare</p>

                  <div className="space-y-4">
                    {selectedFoodsForMeal.map((food) => {
                      const quantity = foodQuantities[food.id] || { amount: 100, unit: 'g' };

                      return (
                        <div key={food.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-3">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-gray-900">
                              {food.food?.name_en || food.food?.name_no || 'Unknown'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Mengde
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={quantity.amount}
                                onChange={(e) => updateFoodQuantity(food.id, parseInt(e.target.value) || 0, quantity.unit)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Enhet
                              </label>
                              <select
                                value={quantity.unit}
                                onChange={(e) => updateFoodQuantity(food.id, quantity.amount, e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              >
                                <option value="g">gram (g)</option>
                                <option value="ml">milliliter (ml)</option>
                                <option value="stk">stykker (stk)</option>
                                <option value="ss">spiseskje (ss)</option>
                                <option value="ts">teskje (ts)</option>
                                <option value="dl">desiliter (dl)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  if (wizardStep === 1) {
                    cancelMealCreation();
                  } else if (wizardStep === 2 && currentCategory) {
                    // Go back to category selection
                    finishCategorySelection();
                  } else {
                    setWizardStep((wizardStep - 1) as 1 | 2 | 3);
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {wizardStep === 1 ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Avbryt</span>
                  </>
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4" />
                    <span>Tilbake</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (wizardStep === 1) {
                    setWizardStep(2);
                  } else if (wizardStep === 2 && !currentCategory) {
                    // On category overview, proceed to quantities
                    proceedToQuantityInput();
                  } else if (wizardStep === 3) {
                    saveMeal();
                  }
                }}
                disabled={wizardStep === 2 && currentCategory} // Disable "Fortsett" when in category food selection
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white transition-colors ${
                  wizardStep === 2 && currentCategory
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {wizardStep === 3 ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Lagre måltid</span>
                  </>
                ) : (
                  <>
                    <span>Fortsett</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}