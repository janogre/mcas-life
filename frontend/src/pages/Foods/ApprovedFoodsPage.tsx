import React, { useState, useEffect } from 'react';
import { Shield, Search, Filter, Plus, Edit, Trash2, Calendar, BarChart3, CheckCircle, AlertTriangle, XCircle, Clock, ChevronDown, ChevronRight, Sparkles, Leaf } from 'lucide-react';
import { foodApi, diaryApi } from '../../lib/api';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { ErrorDisplay } from '../../components/UI/ErrorDisplay';
import { AddCustomFoodModal } from '../../components/Foods/AddCustomFoodModal';
import type { ApprovedFood, Food, SighiTrigger } from '../../types/shared';
import { TRIGGER_DISPLAY as TRIGGER_INFO } from '../../types/shared';
import './safe-foods-animations.css';

const TOLERANCE_LABELS = {
  0: { label: 'Safe', color: 'var(--color-medical-700)', bgColor: 'var(--color-medical-50)', borderColor: 'var(--color-medical-200)', icon: CheckCircle },
  1: { label: 'Medium', color: '#92400e', bgColor: '#fef3c7', borderColor: '#fde68a', icon: AlertTriangle },
  2: { label: 'Incompatible', color: '#9a3412', bgColor: '#fed7aa', borderColor: '#fdba74', icon: AlertTriangle },
  3: { label: 'Severe', color: '#991b1b', bgColor: '#fee2e2', borderColor: '#fecaca', icon: XCircle },
};

const COMPATIBILITY_LABELS = {
  0: { label: 'Safe', color: 'var(--color-medical-700)', bgColor: 'var(--color-medical-50)', borderColor: 'var(--color-medical-200)', icon: CheckCircle },
  1: { label: 'Medium', color: '#92400e', bgColor: '#fef3c7', borderColor: '#fde68a', icon: AlertTriangle },
  2: { label: 'Incompatible', color: '#9a3412', bgColor: '#fed7aa', borderColor: '#fdba74', icon: AlertTriangle },
  3: { label: 'Severe', color: '#991b1b', bgColor: '#fee2e2', borderColor: '#fecaca', icon: XCircle },
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
        af.food?.display_name_en?.toLowerCase().includes(search) ||
        af.food?.name_en?.toLowerCase().includes(search) ||
        af.food?.display_name_no?.toLowerCase().includes(search) ||
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
            name: approvedFood.food?.display_name_en || approvedFood.food?.name_en || approvedFood.food?.name_no || 'Unknown',
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

    if (diffDays === 0) return 'I dag';
    if (diffDays === 1) return 'I går';
    if (diffDays < 7) return `${diffDays} dager siden`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} uker siden`;
    return `${Math.floor(diffDays / 30)} måneder siden`;
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
      <div
        className="food-card"
        style={{
          background: 'white',
          borderRadius: 'var(--radius-soft)',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-whisper)',
          border: `2px solid ${toleranceInfo.borderColor}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: 'var(--color-sage-900)',
                letterSpacing: '-0.01em',
              }}>
                {approvedFood.food?.display_name_en || approvedFood.food?.name_en || approvedFood.food?.name_no || 'Unknown Food'}
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.75rem',
                background: 'var(--color-medical-50)',
                color: 'var(--color-medical-700)',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}>
                <Shield style={{ width: '12px', height: '12px' }} />
                <span>Trygg</span>
              </div>
              {ratingsDiffer && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.75rem',
                  background: '#eff6ff',
                  color: '#1e40af',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  <AlertTriangle style={{ width: '12px', height: '12px' }} />
                  <span>Avvikende</span>
                </div>
              )}
            </div>
            {approvedFood.food?.name_en && approvedFood.food?.name_no &&
             approvedFood.food.name_en !== approvedFood.food.name_no && (
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--color-sage-600)',
                fontWeight: 500
              }}>
                {approvedFood.food.display_name_no || approvedFood.food.name_no}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            {/* SIGHI Rating */}
            {sighiCompatibilityInfo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-sage-600)',
                  fontWeight: 600
                }}>SIGHI:</span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: sighiCompatibilityInfo.bgColor,
                  color: sighiCompatibilityInfo.color,
                  border: `1.5px solid ${sighiCompatibilityInfo.borderColor}`,
                }}>
                  {SighiIcon && <SighiIcon style={{ width: '12px', height: '12px' }} />}
                  <span>{sighiCompatibilityInfo.label}</span>
                </div>
              </div>
            )}

            {/* Personal Tolerance */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--color-sage-600)',
                fontWeight: 600
              }}>Mine:</span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: toleranceInfo.bgColor,
                color: toleranceInfo.color,
                border: `1.5px solid ${toleranceInfo.borderColor}`,
              }}>
                <ToleranceIcon style={{ width: '12px', height: '12px' }} />
                <span>{toleranceInfo.label}</span>
              </div>
            </div>
          </div>
        </div>

        {approvedFood.food?.category && (
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--color-sage-500)',
            marginBottom: '0.75rem',
            fontWeight: 500
          }}>
            {approvedFood.food.category}
          </p>
        )}

        {/* Trigger display */}
        {approvedFood.food?.triggers && approvedFood.food.triggers.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-sage-700)',
              marginRight: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Triggere:
            </span>
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
              {approvedFood.food.triggers.map((trigger, idx) => {
                const triggerInfo = TRIGGER_INFO[trigger as SighiTrigger];

                if (!triggerInfo) {
                  return (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'var(--color-sage-100)',
                        color: 'var(--color-sage-700)',
                      }}
                      title={`Unknown trigger: ${trigger}`}
                    >
                      {trigger}
                    </span>
                  );
                }

                return (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: triggerInfo.bgColor,
                      color: triggerInfo.color,
                    }}
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.8rem',
          color: 'var(--color-sage-500)',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <BarChart3 style={{ width: '14px', height: '14px' }} />
            <span>{approvedFood.times_consumed} ganger</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock style={{ width: '14px', height: '14px' }} />
            <span>Sist: {formatLastConsumed(approvedFood.last_consumed)}</span>
          </div>
          {approvedFood.avg_reaction_score > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Gjennomsnitt: {approvedFood.avg_reaction_score}/10</span>
            </div>
          )}
        </div>

        {/* Notes section */}
        {isEditing ? (
          <div style={{ marginBottom: '1rem' }}>
            <textarea
              value={editingFood.notes}
              onChange={(e) => setEditingFood({ ...editingFood, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid var(--color-sage-200)',
                borderRadius: 'var(--radius-soft)',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-body)',
                resize: 'vertical',
              }}
              rows={2}
              placeholder="Legg til personlige notater..."
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => updateNotes(approvedFood, editingFood.notes)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--color-medical-600)',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Lagre
              </button>
              <button
                onClick={() => setEditingFood(null)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--color-sage-100)',
                  color: 'var(--color-sage-700)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : approvedFood.notes ? (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            background: 'var(--color-sage-50)',
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            color: 'var(--color-sage-800)',
            lineHeight: 1.5,
          }}>
            {approvedFood.notes}
          </div>
        ) : null}

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => addToDiary(approvedFood)}
            className="add-to-diary-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--color-medical-600)',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            <span>Legg til dagbok</span>
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setEditingFood(approvedFood)}
              className="icon-btn"
              style={{
                color: 'var(--color-sage-500)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              title="Rediger notater"
            >
              <Edit style={{ width: '16px', height: '16px' }} />
            </button>
            <button
              onClick={() => removeFromSafeList(approvedFood)}
              className="icon-btn"
              style={{
                color: 'var(--color-sage-500)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              title="Fjern fra trygg liste"
            >
              <Trash2 style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FilterPanel = () => (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-gentle)',
      border: '1px solid var(--color-sage-200)',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      boxShadow: 'var(--shadow-whisper)',
    }}>
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
        fontWeight: 600,
        color: 'var(--color-sage-900)',
        marginBottom: '1.25rem',
      }}>
        Filtrer trygge matvarer
      </h3>

      {/* Personal tolerance filter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--color-sage-700)',
          marginBottom: '0.75rem',
        }}>
          Personlig toleransenivå
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {Object.entries(TOLERANCE_LABELS).map(([level, info]) => (
            <button
              key={level}
              onClick={() => {
                const numLevel = parseInt(level);
                const newTolerance = filters.tolerance === numLevel ? undefined : numLevel;
                setFilters({ ...filters, tolerance: newTolerance });
              }}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '999px',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: `2px solid ${filters.tolerance === parseInt(level) ? info.borderColor : 'var(--color-sage-200)'}`,
                background: filters.tolerance === parseInt(level) ? info.bgColor : 'white',
                color: filters.tolerance === parseInt(level) ? info.color : 'var(--color-sage-700)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {info.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--color-sage-700)',
          marginBottom: '0.75rem',
        }}>
          Matkategori
        </label>
        <select
          value={filters.category || ''}
          onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
          style={{
            border: '2px solid var(--color-sage-200)',
            borderRadius: 'var(--radius-soft)',
            padding: '0.75rem 1rem',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-body)',
            width: '100%',
            maxWidth: '300px',
          }}
        >
          <option value="">Alle kategorier</option>
          {getUniqueCategories().map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Recently consumed filter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filters.recentlyConsumed || false}
            onChange={(e) => setFilters({ ...filters, recentlyConsumed: e.target.checked })}
            style={{
              width: '18px',
              height: '18px',
              accentColor: 'var(--color-medical-600)',
            }}
          />
          <span style={{
            fontSize: '0.9rem',
            color: 'var(--color-sage-700)',
            fontWeight: 500,
          }}>
            Spist de siste 2 ukene
          </span>
        </label>
      </div>

      <button
        onClick={() => setFilters({})}
        style={{
          fontSize: '0.9rem',
          color: 'var(--color-sage-600)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
          padding: '0.5rem 0',
          transition: 'color 0.2s ease',
        }}
      >
        Nullstill filtre
      </button>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem 0',
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
      {/* Header */}
      <div
        className="page-header"
        style={{
          background: 'linear-gradient(135deg, var(--color-medical-500) 0%, var(--color-sage-600) 100%)',
          borderRadius: 'var(--radius-gentle)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-elevated)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative shapes */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem',
            }}>
              <Leaf style={{ width: '32px', height: '32px', color: 'white' }} />
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.25rem',
                fontWeight: 600,
                color: 'white',
                letterSpacing: '-0.02em',
              }}>
                Mine trygge matvarer
              </h1>
            </div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1.05rem',
              fontWeight: 400,
            }}>
              Din personlige samling av testede og godkjente matvarer
            </p>
          </div>
          <button
            onClick={() => setShowCustomFoodModal(true)}
            className="add-custom-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1.5rem',
              background: 'white',
              color: 'var(--color-medical-600)',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-soft)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
            }}
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            <span>Legg til egendefinert</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        {[
          { label: 'Totalt trygge', value: approvedFoods.length, color: 'var(--color-medical-600)', bg: 'var(--color-medical-50)' },
          { label: 'Helt trygge', value: approvedFoods.filter(af => af.personal_tolerance === 0).length, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Kategorier', value: getUniqueCategories().length, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Ganger spist', value: approvedFoods.reduce((sum, af) => sum + af.times_consumed, 0), color: '#ea580c', bg: '#ffedd5' },
        ].map((stat, index) => (
          <div
            key={index}
            className="stat-card-mini animate-fade-in-up"
            style={{
              background: 'white',
              borderRadius: 'var(--radius-soft)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-whisper)',
              border: '1px solid var(--color-sage-100)',
              animationDelay: `${index * 80}ms`,
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: stat.color,
              marginBottom: '0.5rem',
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--color-sage-600)',
              fontWeight: 500,
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Search and filters */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-gentle)',
        boxShadow: 'var(--shadow-gentle)',
        border: '1px solid var(--color-sage-100)',
        padding: '1.5rem',
      }}>
        <div style={{ position: 'relative' }}>
          <Search style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-sage-400)',
            width: '20px',
            height: '20px',
          }} />
          <input
            type="text"
            placeholder="Søk i dine trygge matvarer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '3rem',
              paddingRight: '1rem',
              paddingTop: '0.875rem',
              paddingBottom: '0.875rem',
              border: '2px solid var(--color-sage-200)',
              borderRadius: 'var(--radius-soft)',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-body)',
              transition: 'border-color 0.2s ease',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--color-sage-700)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Filter style={{ width: '16px', height: '16px' }} />
            <span>Filtre</span>
            {Object.values(filters).some(v => v !== undefined && v !== false) && (
              <span style={{
                background: 'var(--color-medical-100)',
                color: 'var(--color-medical-700)',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}>
                {Object.values(filters).filter(v => v !== undefined && v !== false).length}
              </span>
            )}
          </button>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                fontSize: '0.85rem',
                color: 'var(--color-sage-600)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'color 0.2s ease',
              }}
            >
              Tøm søk
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem',
                fontWeight: 600,
                color: 'var(--color-sage-900)',
              }}>
                {searchTerm ? `Resultat for "${searchTerm}"` : 'Alle trygge matvarer'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  onClick={toggleAllCategories}
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-medical-600)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'color 0.2s ease',
                  }}
                >
                  {expandedCategories.size === 0 ? 'Utvid alle' : 'Lukk alle'}
                </button>
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-sage-600)',
                  fontWeight: 500,
                }}>
                  {filteredFoods.length} av {approvedFoods.length} matvarer
                </p>
              </div>
            </div>

            {/* Category grouped list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {getFoodsByCategory().map(([category, foods]) => {
                const isExpanded = expandedCategories.has(category);

                return (
                  <div
                    key={category}
                    className="category-section"
                    style={{
                      background: 'white',
                      borderRadius: 'var(--radius-gentle)',
                      border: '1px solid var(--color-sage-200)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-whisper)',
                    }}
                  >
                    {/* Category header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      style={{
                        width: '100%',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {isExpanded ? (
                          <ChevronDown style={{ width: '20px', height: '20px', color: 'var(--color-sage-500)' }} />
                        ) : (
                          <ChevronRight style={{ width: '20px', height: '20px', color: 'var(--color-sage-500)' }} />
                        )}
                        <h3 style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.15rem',
                          fontWeight: 600,
                          color: 'var(--color-sage-900)',
                          textAlign: 'left',
                        }}>
                          {category}
                        </h3>
                        <span style={{
                          background: 'var(--color-medical-100)',
                          color: 'var(--color-medical-700)',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                        }}>
                          {foods.length}
                        </span>
                      </div>

                      {/* Category stats */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-sage-500)',
                        fontWeight: 500,
                      }}>
                        <span>{foods.filter(f => f.personal_tolerance === 0).length} trygge</span>
                        <span>{foods.reduce((sum, f) => sum + f.times_consumed, 0)} ganger spist</span>
                      </div>
                    </button>

                    {/* Category foods - collapsible */}
                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid var(--color-sage-200)',
                        padding: '1.5rem',
                        background: 'var(--color-sage-50)',
                      }}>
                        <div style={{
                          display: 'grid',
                          gap: '1rem',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        }}>
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
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'white',
            borderRadius: 'var(--radius-gentle)',
            border: '1px solid var(--color-sage-200)',
            boxShadow: 'var(--shadow-whisper)',
          }}>
            <Shield style={{
              width: '64px',
              height: '64px',
              color: 'var(--color-sage-300)',
              margin: '0 auto 1.5rem',
            }} />
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.3rem',
              fontWeight: 600,
              color: 'var(--color-sage-900)',
              marginBottom: '0.75rem',
            }}>
              {approvedFoods.length === 0 ? 'Ingen trygge matvarer ennå' : 'Ingen matvarer passer filtrene'}
            </h3>
            <p style={{
              color: 'var(--color-sage-600)',
              fontSize: '0.95rem',
              marginBottom: '1.5rem',
              lineHeight: 1.6,
            }}>
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
