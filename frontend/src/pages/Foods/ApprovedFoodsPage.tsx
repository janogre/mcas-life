import React, { useState, useEffect } from 'react';
import { Shield, Search, Filter, Plus, Edit, Trash2, Calendar, BarChart3, CheckCircle, AlertTriangle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { foodApi, diaryApi } from '../../lib/api';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { ErrorDisplay } from '../../components/UI/ErrorDisplay';
import { AddCustomFoodModal } from '../../components/Foods/AddCustomFoodModal';
import type { ApprovedFood, Food, SighiTrigger } from '../../types/shared';
import { TRIGGER_DISPLAY as TRIGGER_INFO } from '../../types/shared';

const TOLERANCE_LABELS = {
  0: { label: 'Safe', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
  1: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: AlertTriangle },
  2: { label: 'Incompatible', color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertTriangle },
  3: { label: 'Severe', color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle },
};

const COMPATIBILITY_LABELS = {
  0: { label: 'Safe', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
  1: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: AlertTriangle },
  2: { label: 'Incompatible', color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertTriangle },
  3: { label: 'Severe', color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle },
};

interface ApprovedFoodWithFood extends ApprovedFood {
  food?: Food;
}

interface FilterOptions {
  tolerance?: number;
  category?: string;
  recentlyConsumed?: boolean;
}

export function ApprovedFoodsPage() {
  const [approvedFoods, setApprovedFoods] = useState<ApprovedFoodWithFood[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<ApprovedFoodWithFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  const [editingFood, setEditingFood] = useState<ApprovedFoodWithFood | null>(null);
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadApprovedFoods();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [approvedFoods, searchTerm, filters]);

  const loadApprovedFoods = async () => {
    try {
      setLoading(true);
      setError(null);
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
    } catch (err) {
      setError('Failed to load approved foods');
      console.error('Load approved foods error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = approvedFoods;

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(af => 
        af.food?.name_en?.toLowerCase().includes(search) ||
        af.food?.name_no?.toLowerCase().includes(search) ||
        af.food?.category?.toLowerCase().includes(search) ||
        af.notes.toLowerCase().includes(search)
      );
    }

    // Tolerance filter
    if (filters.tolerance !== undefined) {
      filtered = filtered.filter(af => af.personal_tolerance === filters.tolerance);
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(af => af.food?.category === filters.category);
    }

    // Recently consumed filter
    if (filters.recentlyConsumed) {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      filtered = filtered.filter(af => new Date(af.last_consumed) >= twoWeeksAgo);
    }

    setFilteredFoods(filtered);
  };

  const addToDiary = async (approvedFood: ApprovedFoodWithFood) => {
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
      
      alert('Added to diary successfully!');
    } catch (error) {
      console.error('Failed to add to diary:', error);
      alert('Failed to add to diary. Please try again.');
    }
  };

  const removeFromSafeList = async (approvedFood: ApprovedFoodWithFood) => {
    if (!confirm('Are you sure you want to remove this food from your safe list?')) return;

    try {
      await foodApi.deleteApproved(approvedFood.id);
      // Reload the list to refresh UI regardless of response
      await loadApprovedFoods();
      alert('Food removed from safe list successfully!');
    } catch (error: any) {
      console.error('Failed to remove from safe list:', error);
      // Still refresh the list as the deletion might have succeeded
      await loadApprovedFoods();
      
      // Only show error if it's not a 404 (404 might mean already deleted)
      if (error.response?.status !== 404) {
        alert('Failed to remove from safe list. Please try again.');
      } else {
        // 404 usually means it was already deleted, so show success
        alert('Food removed from safe list successfully!');
      }
    }
  };

  const updateNotes = async (approvedFood: ApprovedFoodWithFood, newNotes: string) => {
    try {
      await foodApi.updateApproved(approvedFood.id, { notes: newNotes });
      await loadApprovedFoods();
      setEditingFood(null);
    } catch (error) {
      console.error('Failed to update notes:', error);
      alert('Failed to update notes. Please try again.');
    }
  };

  const handleCreateCustomFood = async (customFood: {
    name_no: string;
    name_en: string;
    category: string;
    compatibility: number;
    triggers: string[];
    remarks_no?: string;
    remarks_en?: string;
  }) => {
    try {
      // Create the custom food
      const newFood = await foodApi.createCustom(customFood);

      // Automatically add it to user's approved foods with same compatibility
      await foodApi.addApproved({
        food_id: newFood.id!,
        personal_compatibility: customFood.compatibility,
        notes: ''
      });

      // Reload approved foods to show the new food
      await loadApprovedFoods();

      alert(`${customFood.name_no} added successfully!`);
    } catch (error) {
      console.error('Failed to create custom food:', error);
      throw error;
    }
  };

  const formatLastConsumed = (date: Date) => {
    const now = new Date();
    const consumed = new Date(date);
    const diffDays = Math.floor((now.getTime() - consumed.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getUniqueCategories = () => {
    const categories = approvedFoods
      .map(af => af.food?.category)
      .filter(Boolean)
      .filter((category, index, arr) => arr.indexOf(category) === index)
      .sort();
    return categories as string[];
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleAllCategories = () => {
    if (expandedCategories.size === 0) {
      // Expand all
      setExpandedCategories(new Set(getUniqueCategories()));
    } else {
      // Collapse all
      setExpandedCategories(new Set());
    }
  };

  const getFoodsByCategory = () => {
    const grouped: Record<string, ApprovedFoodWithFood[]> = {};

    filteredFoods.forEach(food => {
      const category = food.food?.category || 'Ukategorisert';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(food);
    });

    // Sort categories alphabetically
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  };

  const ApprovedFoodCard = ({ approvedFood }: { approvedFood: ApprovedFoodWithFood }) => {
    const toleranceInfo = TOLERANCE_LABELS[approvedFood.personal_tolerance as keyof typeof TOLERANCE_LABELS];
    const ToleranceIcon = toleranceInfo.icon;
    const isEditing = editingFood?.id === approvedFood.id;

    // Get SIGHI compatibility info if food data is available
    const sighiCompatibilityInfo = approvedFood.food?.compatibility !== undefined 
      ? COMPATIBILITY_LABELS[approvedFood.food.compatibility as keyof typeof COMPATIBILITY_LABELS]
      : null;
    const SighiIcon = sighiCompatibilityInfo?.icon;
    
    // Check if ratings differ
    const ratingsDiffer = approvedFood.food?.compatibility !== undefined && 
                         approvedFood.personal_tolerance !== approvedFood.food.compatibility;

    return (
      <div className="bg-white rounded-lg border border-green-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">
                {approvedFood.food?.name_en || approvedFood.food?.name_no || 'Unknown Food'}
              </h3>
              <div className="flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <Shield className="w-3 h-3" />
                <span>I Safe List</span>
              </div>
              {ratingsDiffer && (
                <div className="flex items-center space-x-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Avvikende vurdering</span>
                </div>
              )}
            </div>
            {approvedFood.food?.name_en && approvedFood.food?.name_no && 
             approvedFood.food.name_en !== approvedFood.food.name_no && (
              <p className="text-sm text-gray-600">{approvedFood.food.name_no}</p>
            )}
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            {/* SIGHI Rating */}
            {sighiCompatibilityInfo && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 font-medium">SIGHI:</span>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${sighiCompatibilityInfo.bgColor} ${sighiCompatibilityInfo.color}`}>
                  <SighiIcon className="w-3 h-3" />
                  <span>{sighiCompatibilityInfo.label}</span>
                </div>
              </div>
            )}
            
            {/* Personal Tolerance */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600 font-medium">Mine:</span>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${toleranceInfo.bgColor} ${toleranceInfo.color}`}>
                <ToleranceIcon className="w-3 h-3" />
                <span>{toleranceInfo.label}</span>
              </div>
            </div>
          </div>
        </div>

        {approvedFood.food?.category && (
          <p className="text-sm text-gray-500 mb-2">{approvedFood.food.category}</p>
        )}

        {/* Trigger display */}
        {approvedFood.food?.triggers && approvedFood.food.triggers.length > 0 && (
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-700 mr-2">Triggere:</span>
            <div className="inline-flex flex-wrap gap-1">
              {approvedFood.food.triggers.map((trigger, idx) => {
                const triggerInfo = TRIGGER_INFO[trigger as SighiTrigger];
                
                if (!triggerInfo) {
                  // Fallback for unknown triggers
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      title={`Unknown trigger: ${trigger}`}
                    >
                      {trigger}
                    </span>
                  );
                }
                
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${triggerInfo.bgColor} ${triggerInfo.color}`}
                    title={triggerInfo.description}
                  >
                    {triggerInfo.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Consumption stats */}
        <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
          <div className="flex items-center space-x-1">
            <BarChart3 className="w-3 h-3" />
            <span>Consumed {approvedFood.times_consumed} times</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Last: {formatLastConsumed(approvedFood.last_consumed)}</span>
          </div>
          {approvedFood.avg_reaction_score > 0 && (
            <div className="flex items-center space-x-1">
              <span>Avg reaction: {approvedFood.avg_reaction_score}/10</span>
            </div>
          )}
        </div>

        {/* Notes section */}
        {isEditing ? (
          <div className="mb-3">
            <textarea
              value={editingFood.notes}
              onChange={(e) => setEditingFood({ ...editingFood, notes: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              rows={2}
              placeholder="Add your personal notes..."
            />
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => updateNotes(approvedFood, editingFood.notes)}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => setEditingFood(null)}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : approvedFood.notes ? (
          <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
            {approvedFood.notes}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => addToDiary(approvedFood)}
              className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium hover:bg-primary-50 px-2 py-1 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add to Diary</span>
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setEditingFood(approvedFood)}
              className="text-gray-500 hover:text-blue-600 p-1"
              title="Edit notes"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button
              onClick={() => removeFromSafeList(approvedFood)}
              className="text-gray-500 hover:text-red-600 p-1"
              title="Remove from safe list"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FilterPanel = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <h3 className="font-medium text-gray-900 mb-4">Filter Safe Foods</h3>
      
      {/* Personal tolerance filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Personal Tolerance Level
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TOLERANCE_LABELS).map(([level, info]) => (
            <button
              key={level}
              onClick={() => {
                const numLevel = parseInt(level);
                const newTolerance = filters.tolerance === numLevel ? undefined : numLevel;
                setFilters({ ...filters, tolerance: newTolerance });
              }}
              className={`px-3 py-2 rounded-full text-sm font-medium border transition-colors ${
                filters.tolerance === parseInt(level)
                  ? `${info.bgColor} ${info.color} border-current`
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {info.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Food Category
        </label>
        <select
          value={filters.category || ''}
          onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {getUniqueCategories().map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Recently consumed filter */}
      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={filters.recentlyConsumed || false}
            onChange={(e) => setFilters({ ...filters, recentlyConsumed: e.target.checked })}
            className="rounded text-primary-600"
          />
          <span className="text-sm text-gray-700">Consumed in last 2 weeks</span>
        </label>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setFilters({})}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            My Safe Foods
          </h1>
          <p className="text-gray-600">
            Your personal collection of tested and approved foods
          </p>
        </div>
        <button
          onClick={() => setShowCustomFoodModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Legg til egendefinert</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{approvedFoods.length}</div>
          <div className="text-sm text-gray-600">Total Safe Foods</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">
            {approvedFoods.filter(af => af.personal_tolerance === 0).length}
          </div>
          <div className="text-sm text-gray-600">Completely Safe</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {getUniqueCategories().length}
          </div>
          <div className="text-sm text-gray-600">Food Categories</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {approvedFoods.reduce((sum, af) => sum + af.times_consumed, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Consumed</div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your safe foods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {Object.values(filters).some(v => v !== undefined && v !== false) && (
              <span className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs">
                {Object.values(filters).filter(v => v !== undefined && v !== false).length}
              </span>
            )}
          </button>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && <FilterPanel />}

      {/* Results */}
      <div>
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={loadApprovedFoods}
            showRetry={true}
          />
        )}

        {filteredFoods.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Safe Foods {searchTerm && `matching "${searchTerm}"`}
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleAllCategories}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {expandedCategories.size === 0 ? 'Utvid alle' : 'Lukk alle'}
                </button>
                <p className="text-sm text-gray-600">
                  {filteredFoods.length} av {approvedFoods.length} matvarer
                </p>
              </div>
            </div>

            {/* Category grouped list */}
            <div className="space-y-3">
              {getFoodsByCategory().map(([category, foods]) => {
                const isExpanded = expandedCategories.has(category);

                return (
                  <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Category header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        <h3 className="font-semibold text-gray-900 text-left">
                          {category}
                        </h3>
                        <span className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          {foods.length}
                        </span>
                      </div>

                      {/* Category stats */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{foods.filter(f => f.personal_tolerance === 0).length} trygge</span>
                        <span>{foods.reduce((sum, f) => sum + f.times_consumed, 0)} ganger spist</span>
                      </div>
                    </button>

                    {/* Category foods - collapsible */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {foods.map((approvedFood) => (
                            <ApprovedFoodCard key={approvedFood.id} approvedFood={approvedFood} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {approvedFoods.length === 0 ? 'Ingen trygge matvarer ennå' : 'Ingen matvarer passer filtrene'}
            </h3>
            <p className="text-gray-600 mb-4">
              {approvedFoods.length === 0
                ? 'Bygg din liste med trygge matvarer ved å legge til fra Mat-søk siden'
                : 'Prøv å justere søkeord eller filtre'
              }
            </p>
          </div>
        )}
      </div>

      {/* Custom Food Modal */}
      <AddCustomFoodModal
        isOpen={showCustomFoodModal}
        onClose={() => setShowCustomFoodModal(false)}
        onSubmit={handleCreateCustomFood}
      />
    </div>
  );
}