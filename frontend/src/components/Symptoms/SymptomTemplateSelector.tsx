import React, { useState, useEffect } from 'react';
import { symptomTemplateApi } from '../../lib/api';

interface SymptomTemplate {
  id: number;
  category: string;
  name_no: string;
  name_en: string;
  icon?: string;
  display_order: number;
}

interface SymptomTemplateSelectorProps {
  onSelect: (template: SymptomTemplate) => void;
  selectedCategory?: string;
}

const categoryLabels: { [key: string]: { label: string; emoji: string } } = {
  skin: { label: 'Hud', emoji: '🔴' },
  digestive: { label: 'Fordøyelse', emoji: '🟡' },
  respiratory: { label: 'Luftveier', emoji: '🔵' },
  cardiovascular: { label: 'Hjerte/kar', emoji: '❤️' },
  neurological: { label: 'Nevrologiske', emoji: '🧠' },
  musculoskeletal: { label: 'Muskel/skjelett', emoji: '🟢' },
  genitourinary: { label: 'Urin/kjønn', emoji: '🟣' },
  systemic: { label: 'Systemiske', emoji: '⚡' },
};

export const SymptomTemplateSelector: React.FC<SymptomTemplateSelectorProps> = ({
  onSelect,
  selectedCategory,
}) => {
  const [templates, setTemplates] = useState<{ [category: string]: SymptomTemplate[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(selectedCategory || null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const grouped = await symptomTemplateApi.getGrouped();
      setTemplates(grouped);
      setError(null);
    } catch (err) {
      console.error('Error loading symptom templates:', err);
      setError('Kunne ikke laste symptommaler');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadTemplates}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Velg symptom</h3>

      {Object.entries(templates).map(([category, categoryTemplates]) => {
        const categoryInfo = categoryLabels[category] || { label: category, emoji: '📋' };
        const isExpanded = expandedCategory === category;

        return (
          <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => handleCategoryClick(category)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoryInfo.emoji}</span>
                <div className="text-left">
                  <div className="font-medium text-gray-900">{categoryInfo.label}</div>
                  <div className="text-sm text-gray-500">
                    {categoryTemplates.length} {categoryTemplates.length === 1 ? 'symptom' : 'symptomer'}
                  </div>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Symptom Templates */}
            {isExpanded && (
              <div className="divide-y divide-gray-100">
                {categoryTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template)}
                    className="w-full px-4 py-3 hover:bg-blue-50 flex items-center gap-3 transition-colors text-left"
                  >
                    {template.icon && <span className="text-xl">{template.icon}</span>}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{template.name_no}</div>
                      {template.name_en !== template.name_no && (
                        <div className="text-sm text-gray-500">{template.name_en}</div>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
