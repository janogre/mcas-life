import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  ChevronLeft,
  Search,
  X,
  Check,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { userRecipesApi, foodApi } from '../../lib/api';
import type { Food, RecipeIngredient } from '../../types/shared';

const FOOD_CATEGORIES = [
  'Grønnsaker', 'Frukt', 'Kjøtt', 'Fisk', 'Meieriprodukter',
  'Korn', 'Belgfrukter', 'Nøtter', 'Krydder', 'Drikke', 'Annet'
];

const UNITS = ['g', 'kg', 'ml', 'dl', 'l', 'stk', 'ss', 'ts', 'kopp'];

interface IngredientWithFood extends RecipeIngredient {
  food?: Food;
}

export function RecipeEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Fetch existing recipe
  const { data: recipe, isLoading } = useQuery(
    ['user-recipe', id],
    () => userRecipesApi.getById(Number(id)),
    {
      enabled: !!id,
      staleTime: 30000,
    }
  );

  // Populate form when recipe data loads
  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title);
      setDescription(recipe.description || '');
      setServings(recipe.servings);
      setPrepTime(recipe.prep_time_minutes || undefined);
      setInstructions(recipe.instructions || '');
      setNotes(recipe.notes || '');
      loadIngredientsWithFoodData(recipe.ingredients);
    }
  }, [recipe]);

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState<number>(4);
  const [prepTime, setPrepTime] = useState<number | undefined>();
  const [ingredients, setIngredients] = useState<IngredientWithFood[]>([]);
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');

  // Ingredient search state
  const [useSafeFoods, setUseSafeFoods] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Load ingredients with full food data
  const loadIngredientsWithFoodData = async (recipeIngredients: RecipeIngredient[]) => {
    const ingredientsWithFood = await Promise.all(
      recipeIngredients.map(async (ing) => {
        try {
          const food = await foodApi.getById(ing.food_id);
          return { ...ing, food };
        } catch (error) {
          console.error(`Failed to load food ${ing.food_id}:`, error);
          return ing;
        }
      })
    );
    setIngredients(ingredientsWithFood);
  };

  // Search for foods when search term or category changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim()) {
        handleFoodSearch();
      } else if (selectedCategory && !useSafeFoods) {
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
        const approvedFoods = await foodApi.getApproved(true);
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

        setSearchResults(filtered.map(item => item.food));
      } else {
        const results = await foodApi.search({
          query: searchTerm.trim(),
          category_filter: selectedCategory || undefined,
          limit: 20
        });
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Food search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const addIngredient = (food: Food) => {
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

  // Update mutation
  const updateMutation = useMutation(
    (data: any) => userRecipesApi.update(Number(id), data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user-recipes']);
        queryClient.invalidateQueries(['user-recipe', id]);
        navigate(`/mine-oppskrifter/${id}`);
      },
      onError: (error: any) => {
        alert(`Feil ved oppdatering: ${error.message || 'Ukjent feil'}`);
        setSubmitting(false);
      }
    }
  );

  const handleSubmit = async () => {
    if (!canProceedStep1() || !canProceedStep2()) {
      alert('Vennligst fyll ut alle påkrevde felt');
      return;
    }

    setSubmitting(true);

    const recipeData = {
      title,
      description: description || undefined,
      servings,
      prep_time_minutes: prepTime || undefined,
      ingredients: ingredients.map(ing => ({
        food_id: ing.food_id,
        amount: ing.amount,
        unit: ing.unit,
        custom_name: ing.custom_name
      })),
      instructions: instructions || undefined,
      notes: notes || undefined
    };

    updateMutation.mutate(recipeData);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">Oppskrift ikke funnet</p>
          <button
            onClick={() => navigate('/mine-oppskrifter')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tilbake til oppskrifter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/mine-oppskrifter/${id}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Tilbake til oppskrift</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Rediger oppskrift</h1>
        <p className="text-gray-600 mt-2">
          Oppdater oppskriften - MCAS-score blir automatisk re-beregnet
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
                  Antall porsjoner <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tilberedningstid (minutter)
                </label>
                <input
                  type="number"
                  value={prepTime || ''}
                  onChange={(e) => setPrepTime(e.target.value ? Number(e.target.value) : undefined)}
                  min={0}
                  max={1440}
                  placeholder="60"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Ingredients (samme som RecipeCreatePage) */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingredienser</h2>

            {/* Food source toggle */}
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => setUseSafeFoods(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  useSafeFoods
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Trygge matvarer
              </button>
              <button
                onClick={() => setUseSafeFoods(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !useSafeFoods
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alle SIGHI-matvarer
              </button>
            </div>

            {/* Category filter */}
            {!useSafeFoods && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
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
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Søk etter matvare..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
              )}
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {searchResults.map(food => (
                  <button
                    key={food.id}
                    onClick={() => addIngredient(food)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    disabled={ingredients.some(ing => ing.food_id === food.id)}
                  >
                    <div className="font-medium text-gray-900">{food.name_no}</div>
                    <div className="text-sm text-gray-500">{food.category}</div>
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
                      <div className="font-medium text-gray-900">{ing.food?.name_no || ing.custom_name}</div>
                      <div className="text-sm text-gray-500">{ing.food?.category}</div>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ing.amount || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          updateIngredient(ing.food_id, 'amount', value);
                        }
                      }}
                      onBlur={(e) => {
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
                MCAS-score vil bli re-beregnet automatisk når oppskriften oppdateres
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Forrige
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 ? !canProceedStep1() : !canProceedStep2()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Neste
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canProceedStep1() || !canProceedStep2()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitting ? 'Lagrer...' : 'Lagre endringer'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
