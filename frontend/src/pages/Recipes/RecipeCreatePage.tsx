import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Search, Plus, X, Clock, Users, AlertTriangle } from 'lucide-react';
import { foodApi, userRecipesApi } from '../../lib/api';
import { useToast } from '../../components/UI/Toast';
import type { Food, CreateRecipeInput, RecipeIngredient } from '../../types/shared';

// SIGHI food categories for filtering
const FOOD_CATEGORIES = [
  'Eggs',
  'Dairy products',
  'Meat',
  'Fish',
  'Sea food',
  'Starch suppliers',
  'Nuts',
  'Fats and oils',
  'Vegetables',
  'Herbs',
  'Fruits',
  'Seeds',
  'Mushrooms, fungi and algae',
  'Sweeteners',
  'Spices, seasoning, aroma',
  'Beverages',
  'Food additives',
  'Vitamins, dietary minerals, trace elements, stimulants',
  'Preparations, mixtures'
];

const UNITS = ['g', 'kg', 'ml', 'dl', 'l', 'stk', 'ss', 'ts', 'kopp'] as const;

interface SelectedIngredient extends RecipeIngredient {
  food?: Food;
}

export function RecipeCreatePage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState<number | ''>('');
  const [servings, setServings] = useState<number | ''>(4);

  // Step 2: Ingredients
  const [useSafeFoods, setUseSafeFoods] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [ingredients, setIngredients] = useState<SelectedIngredient[]>([]);
  const [searching, setSearching] = useState(false);

  // Step 3: Instructions
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Search for foods when search term or category changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      // Only search if there's a search term (for both safe foods and all foods)
      if (searchTerm.trim()) {
        handleFoodSearch();
      } else if (selectedCategory && !useSafeFoods) {
        // For "All SIGHI foods", allow category-only search
        handleFoodSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedCategory, useSafeFoods]);

  const handleFoodSearch = async () => {
    try {
      setSearching(true);

      if (useSafeFoods) {
        // Search only approved foods
        // getApproved returns an array of ApprovedFood objects with { food: Food, ... }
        const approvedFoods = await foodApi.getApproved(true); // include_details=true
        let filtered = approvedFoods;

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          filtered = approvedFoods.filter(item => {
            const food = item.food;
            return food.name_no?.toLowerCase().includes(term) ||
                   food.name_en?.toLowerCase().includes(term);
          });
        }

        if (selectedCategory) {
          filtered = filtered.filter(item => {
            return item.food.category === selectedCategory;
          });
        }

        // Extract the food object from each ApprovedFood
        setSearchResults(filtered.map(item => item.food));
      } else {
        // Search full SIGHI database
        const results = await foodApi.search({
          query: searchTerm.trim(),
          category_filter: selectedCategory || undefined,
          limit: 20
        });
        setSearchResults(results.foods || []);
      }
    } catch (error) {
      console.error('Food search failed:', error);
      showError('Kunne ikke søke etter matvarer');
    } finally {
      setSearching(false);
    }
  };

  const addIngredient = (food: Food) => {
    // Don't add duplicates
    if (ingredients.some(ing => ing.food_id === food.id)) {
      showError('Ingrediens er allerede lagt til');
      return;
    }

    setIngredients([
      ...ingredients,
      {
        food_id: food.id,
        amount: 100,
        unit: 'g',
        custom_name: food.name_no || food.name_en || 'Ukjent matvare',
        food
      }
    ]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeIngredient = (foodId: number) => {
    setIngredients(ingredients.filter(ing => ing.food_id !== foodId));
  };

  const updateIngredient = (foodId: number, field: 'amount' | 'unit' | 'custom_name', value: any) => {
    setIngredients(ingredients.map(ing => {
      if (ing.food_id === foodId) {
        // For amount field, store as number (can be 0 while typing)
        if (field === 'amount') {
          const numValue = value === '' ? 0 : (typeof value === 'string' ? parseFloat(value) || 0 : value);
          return { ...ing, [field]: numValue };
        }
        return { ...ing, [field]: value };
      }
      return ing;
    }));
  };

  const canProceedStep1 = () => {
    return title.trim().length > 0 && servings && servings > 0;
  };

  const canProceedStep2 = () => {
    return ingredients.length > 0;
  };

  const handleSubmit = async () => {
    if (!canProceedStep1() || !canProceedStep2()) {
      showError('Vennligst fyll ut alle påkrevde felt');
      return;
    }

    try {
      setSubmitting(true);

      const recipeData: CreateRecipeInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        prep_time_minutes: prepTime || undefined,
        servings: Number(servings),
        ingredients: ingredients.map(ing => ({
          food_id: ing.food_id,
          amount: ing.amount,
          unit: ing.unit,
          custom_name: ing.custom_name
        })),
        instructions: instructions.trim() || undefined,
        notes: notes.trim() || undefined
      };

      const response = await userRecipesApi.create(recipeData);
      success(`Oppskrift "${title}" opprettet med MCAS-score ${response.recipe.calculated_mcas_score}`);
      navigate('/mine-oppskrifter');
    } catch (error: any) {
      console.error('Recipe creation failed:', error);
      showError(error.response?.data?.error || 'Kunne ikke opprette oppskrift');
    } finally {
      setSubmitting(false);
    }
  };

  const getCompatibilityColor = (compatibility: number) => {
    switch (compatibility) {
      case 0: return 'text-green-600 bg-green-50';
      case 1: return 'text-yellow-600 bg-yellow-50';
      case 2: return 'text-orange-600 bg-orange-50';
      case 3: return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/mine-oppskrifter')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Tilbake til oppskrifter</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Opprett ny oppskrift</h1>
        <p className="text-gray-600 mt-2">
          Lag din egen oppskrift med automatisk MCAS-analyse
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
              currentStep >= step
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > step ? <Check className="w-5 h-5" /> : step}
            </div>
            {step < 3 && (
              <div className={`h-1 w-16 mx-2 ${
                currentStep > step ? 'bg-primary-600' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Grunnleggende informasjon</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Oppskriftsnavn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="F.eks. Spaghetti med kjøttsaus"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                maxLength={255}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beskrivelse (valgfri)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kort beskrivelse av oppskriften..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tilberedningstid (minutter)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value ? Number(e.target.value) : '')}
                    placeholder="45"
                    min={0}
                    max={1440}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Antall porsjoner <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value ? Number(e.target.value) : '')}
                    placeholder="4"
                    min={1}
                    max={100}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Ingredients */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Ingredienser</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setUseSafeFoods(true)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    useSafeFoods
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Trygge matvarer
                </button>
                <button
                  onClick={() => setUseSafeFoods(false)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    !useSafeFoods
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Alle SIGHI-matvarer
                </button>
              </div>
            </div>

            {/* Category filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori (valgfri)
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Alle kategorier</option>
                {FOOD_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Søk etter ingredienser..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {searchResults.map(food => (
                  <button
                    key={food.id}
                    onClick={() => addIngredient(food)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{food.name_no}</div>
                      <div className="text-sm text-gray-500">{food.category}</div>
                    </div>
                    <div className={`px-2 py-1 text-xs font-medium rounded ${getCompatibilityColor(food.compatibility)}`}>
                      {food.compatibility === 0 ? 'Trygg' : food.compatibility === 1 ? 'Medium' : food.compatibility === 2 ? 'Inkompatibel' : 'Alvorlig'}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected ingredients */}
            {ingredients.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Valgte ingredienser ({ingredients.length})
                </h3>
                {ingredients.map(ing => (
                  <div key={ing.food_id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{ing.food?.name_no}</div>
                      <div className="text-sm text-gray-500">{ing.food?.category}</div>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ing.amount || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string, numbers, and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          updateIngredient(ing.food_id, 'amount', value);
                        }
                      }}
                      onBlur={(e) => {
                        // Ensure valid number on blur
                        const num = parseFloat(e.target.value);
                        if (isNaN(num) || num <= 0) {
                          updateIngredient(ing.food_id, 'amount', '100');
                        }
                      }}
                      placeholder="100"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                    />
                    <select
                      value={ing.unit}
                      onChange={(e) => updateIngredient(ing.food_id, 'unit', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeIngredient(ing.food_id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {ingredients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Ingen ingredienser lagt til ennå</p>
                <p className="text-sm">Søk og velg ingredienser over</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Instructions */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Instruksjoner og forhåndsvisning</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instruksjoner (valgfri)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Beskriv fremgangsmåte steg for steg..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={8}
                maxLength={5000}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notater (valgfri)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tips, variasjoner, etc..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                maxLength={1000}
              />
            </div>

            {/* Recipe summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Oppsummering</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>Tittel:</strong> {title}</p>
                {description && <p><strong>Beskrivelse:</strong> {description}</p>}
                <p><strong>Porsjoner:</strong> {servings}</p>
                {prepTime && <p><strong>Tilberedningstid:</strong> {prepTime} minutter</p>}
                <p><strong>Ingredienser:</strong> {ingredients.length} stk</p>
              </div>
              <p className="text-xs text-blue-600 mt-3">
                MCAS-score vil bli beregnet automatisk når oppskriften lagres
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/mine-oppskrifter')}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{currentStep === 1 ? 'Avbryt' : 'Forrige'}</span>
          </button>

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 ? !canProceedStep1() : !canProceedStep2()}
              className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <span>Neste</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canProceedStep1() || !canProceedStep2()}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Check className="w-5 h-5" />
              <span>{submitting ? 'Lagrer...' : 'Lagre oppskrift'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
