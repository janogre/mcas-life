import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { SighiTrigger } from '../../types/shared';
import { TRIGGER_DISPLAY } from '../../types/shared';

const COMPATIBILITY_LABELS = {
  0: { label: 'Safe', color: 'text-green-600', bgColor: 'bg-green-50' },
  1: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  2: { label: 'Incompatible', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  3: { label: 'Severe', color: 'text-red-600', bgColor: 'bg-red-50' },
};

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

interface AddCustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customFood: {
    name_no: string;
    name_en: string;
    category: string;
    compatibility: number;
    triggers: string[];
    remarks_no?: string;
    remarks_en?: string;
  }) => Promise<void>;
}

export function AddCustomFoodModal({ isOpen, onClose, onSubmit }: AddCustomFoodModalProps) {
  const [formData, setFormData] = useState({
    name_no: '',
    name_en: '',
    category: '',
    compatibility: 0,
    triggers: [] as string[],
    remarks_no: '',
    remarks_en: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name_no.trim() || !formData.name_en.trim()) {
      setError('Both Norwegian and English names are required');
      return;
    }

    if (!formData.category) {
      setError('Category is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        name_no: '',
        name_en: '',
        category: '',
        compatibility: 0,
        triggers: [],
        remarks_no: '',
        remarks_en: ''
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create custom food');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTrigger = (trigger: string) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.includes(trigger)
        ? prev.triggers.filter(t => t !== trigger)
        : [...prev.triggers, trigger]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Legg til egendefinert matvare</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Navn (norsk) *
              </label>
              <input
                type="text"
                value={formData.name_no}
                onChange={(e) => setFormData({ ...formData, name_no: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="F.eks. Eple"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name (English) *
              </label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="E.g. Apple"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Velg kategori...</option>
              {FOOD_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Compatibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kompatibilitetsnivå
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(COMPATIBILITY_LABELS).map(([level, info]) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, compatibility: parseInt(level) })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    formData.compatibility === parseInt(level)
                      ? `${info.bgColor} ${info.color} border-current ring-2 ring-offset-1 ring-current`
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          {/* Triggers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Triggere (valgfritt)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(TRIGGER_DISPLAY).map(([triggerCode, info]) => (
                <button
                  key={triggerCode}
                  type="button"
                  onClick={() => toggleTrigger(triggerCode)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                    formData.triggers.includes(triggerCode)
                      ? `${info.bgColor} ${info.color} border-current`
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                  title={info.description}
                >
                  <div className="font-medium">{info.name}</div>
                  <div className="text-gray-500 text-xs">({triggerCode})</div>
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Merknad (norsk)
              </label>
              <textarea
                value={formData.remarks_no}
                onChange={(e) => setFormData({ ...formData, remarks_no: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Valgfrie notater..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remark (English)
              </label>
              <textarea
                value={formData.remarks_en}
                onChange={(e) => setFormData({ ...formData, remarks_en: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Oppretter...' : 'Legg til matvare'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
