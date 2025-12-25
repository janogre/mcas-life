import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mealsApi, MealFood, foodsApi, Food } from '../../lib/api';

interface MealData {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: MealFood[];
  meal_time: Date;
  dao_taken_before: boolean;
  dao_minutes_before?: number;
  immediate_reaction: boolean;
  delayed_reaction: boolean;
  reaction_severity?: number;
  reaction_notes?: string;
  location?: string;
  notes?: string;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Frokost', emoji: '🌅', color: '#f59e0b' },
  { value: 'lunch', label: 'Lunsj', emoji: '☀️', color: '#10b981' },
  { value: 'dinner', label: 'Middag', emoji: '🌙', color: '#6366f1' },
  { value: 'snack', label: 'Snacks', emoji: '🍎', color: '#ec4899' },
];

const UNITS = [
  { value: 'g', label: 'gram (g)' },
  { value: 'ml', label: 'milliliter (ml)' },
  { value: 'stk', label: 'stykk' },
  { value: 'kopp', label: 'kopp' },
  { value: 'ss', label: 'spiseskje' },
  { value: 'ts', label: 'teskje' },
  { value: 'dl', label: 'desiliter' },
];

export function MealAddPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Meal data
  const [mealData, setMealData] = useState<Partial<MealData>>({
    meal_time: new Date(),
    foods: [],
    dao_taken_before: false,
    immediate_reaction: false,
    delayed_reaction: false,
  });

  // Food search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFoods, setSelectedFoods] = useState<Array<{ food: Food; amount: string; unit: string }>>([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await foodsApi.search({ query, limit: 10 });
      setSearchResults(response.foods);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFood = (food: Food) => {
    setSelectedFoods([...selectedFoods, { food, amount: '', unit: 'g' }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveFood = (index: number) => {
    setSelectedFoods(selectedFoods.filter((_, i) => i !== index));
  };

  const handleUpdateFoodAmount = (index: number, amount: string) => {
    const updated = [...selectedFoods];
    updated[index].amount = amount;
    setSelectedFoods(updated);
  };

  const handleUpdateFoodUnit = (index: number, unit: string) => {
    const updated = [...selectedFoods];
    updated[index].unit = unit;
    setSelectedFoods(updated);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Convert selected foods to MealFood format
      const mealFoods: MealFood[] = selectedFoods
        .filter(sf => sf.amount && parseFloat(sf.amount) > 0)
        .map(sf => ({
          food_id: sf.food.id,
          amount: parseFloat(sf.amount),
          unit: sf.unit,
        }));

      setMealData({ ...mealData, foods: mealFoods });
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!mealData.meal_type || !mealData.foods || mealData.foods.length === 0) {
      alert('Vennligst velg måltidstype og legg til minst én matvare');
      return;
    }

    setIsSubmitting(true);
    try {
      await mealsApi.logMeal({
        meal_type: mealData.meal_type,
        foods: mealData.foods,
        meal_time: mealData.meal_time!.toISOString(),
        dao_taken_before: mealData.dao_taken_before,
        dao_minutes_before: mealData.dao_minutes_before,
        immediate_reaction: mealData.immediate_reaction,
        delayed_reaction: mealData.delayed_reaction,
        reaction_severity: mealData.reaction_severity,
        reaction_notes: mealData.reaction_notes,
        location: mealData.location,
        notes: mealData.notes,
      });

      navigate('/log');
    } catch (error) {
      console.error('Failed to log meal:', error);
      alert('Kunne ikke registrere måltid. Vennligst prøv igjen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!mealData.meal_type;
      case 1:
        return selectedFoods.length > 0 && selectedFoods.every(sf => sf.amount && parseFloat(sf.amount) > 0);
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getCompatibilityColor = (level?: number) => {
    if (level === undefined) return '#94a3b8';
    if (level === 0) return '#10b981';
    if (level === 1) return '#f59e0b';
    if (level === 2) return '#f97316';
    return '#ef4444';
  };

  const getCompatibilityLabel = (level?: number) => {
    if (level === undefined) return 'Ukjent';
    if (level === 0) return 'Trygg';
    if (level === 1) return 'Middels';
    if (level === 2) return 'Uforenlig';
    return 'Alvorlig';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => currentStep === 0 ? navigate(-1) : handleBack()}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold">Registrer måltid</h1>
            <div className="w-6" />
          </div>

          {/* Progress bar */}
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex-1 h-1 rounded-full ${
                  step <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Step 0: Select meal type */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Velg måltidstype</h2>
            <div className="grid grid-cols-2 gap-3">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setMealData({ ...mealData, meal_type: type.value as any })}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    mealData.meal_type === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">{type.emoji}</div>
                  <div className="font-semibold" style={{ color: type.color }}>
                    {type.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Add foods */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Legg til matvarer</h2>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Søk etter matvare..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
                {searchResults.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => handleAddFood(food)}
                    className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{food.name}</div>
                      <div className="text-sm text-gray-500">{food.category}</div>
                    </div>
                    <div
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: getCompatibilityColor(food.compatibility) }}
                    >
                      {getCompatibilityLabel(food.compatibility)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected foods */}
            {selectedFoods.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-700">Valgte matvarer</h3>
                {selectedFoods.map((item, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-medium">{item.food.name}</div>
                        <div className="text-sm text-gray-500">{item.food.category}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveFood(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleUpdateFoodAmount(index, e.target.value)}
                        placeholder="Mengde"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleUpdateFoodUnit(index, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Time and DAO */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Tidspunkt og DAO</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Når spiste du?
              </label>
              <input
                type="datetime-local"
                value={mealData.meal_time?.toISOString().slice(0, 16) || ''}
                onChange={(e) => setMealData({ ...mealData, meal_time: new Date(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={mealData.dao_taken_before || false}
                  onChange={(e) => setMealData({ ...mealData, dao_taken_before: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-medium">Tok DAO før måltidet</span>
              </label>

              {mealData.dao_taken_before && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minutter før måltid
                  </label>
                  <input
                    type="number"
                    value={mealData.dao_minutes_before || ''}
                    onChange={(e) => setMealData({ ...mealData, dao_minutes_before: parseInt(e.target.value) })}
                    placeholder="f.eks. 15"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Reactions and notes */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Reaksjoner og notater</h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={mealData.immediate_reaction || false}
                  onChange={(e) => setMealData({ ...mealData, immediate_reaction: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span>Umiddelbar reaksjon (0-2 timer)</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={mealData.delayed_reaction || false}
                  onChange={(e) => setMealData({ ...mealData, delayed_reaction: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span>Forsinket reaksjon (2-72 timer)</span>
              </label>
            </div>

            {(mealData.immediate_reaction || mealData.delayed_reaction) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alvorlighetsgrad (1-10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={mealData.reaction_severity || 5}
                    onChange={(e) => setMealData({ ...mealData, reaction_severity: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-center text-2xl font-bold text-blue-600">
                    {mealData.reaction_severity || 5}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reaksjonsnotater
                  </label>
                  <textarea
                    value={mealData.reaction_notes || ''}
                    onChange={(e) => setMealData({ ...mealData, reaction_notes: e.target.value })}
                    placeholder="Beskriv symptomer, tidspunkt, varighet..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lokasjon (valgfritt)
              </label>
              <input
                type="text"
                value={mealData.location || ''}
                onChange={(e) => setMealData({ ...mealData, location: e.target.value })}
                placeholder="f.eks. Hjemme, Restaurant, Jobb"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ekstra notater (valgfritt)
              </label>
              <textarea
                value={mealData.notes || ''}
                onChange={(e) => setMealData({ ...mealData, notes: e.target.value })}
                placeholder="Andre observasjoner..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex gap-3">
          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Neste
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Lagrer...' : 'Fullfør registrering'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
