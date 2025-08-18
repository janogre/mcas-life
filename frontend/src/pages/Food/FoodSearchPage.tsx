import React, { useState } from 'react';
import { Search, Filter, Heart, AlertTriangle, X } from 'lucide-react';
import { getSighiCompatibility } from '../../lib/utils';

export function FoodSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompatibility, setSelectedCompatibility] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Mock food data - in real app this would come from API
  const mockFoods = [
    {
      id: 1,
      name_no: 'Spinat, fersk',
      name_en: 'Spinach, fresh',
      category: 'Vegetables',
      compatibility: 1,
      triggers: ['H'],
      remarks_no: 'Inneholder moderat histamin',
      remarks_en: 'Contains moderate histamine'
    },
    {
      id: 2,
      name_no: 'Blåmuggost',
      name_en: 'Blue cheese',
      category: 'Dairy',
      compatibility: 2,
      triggers: ['H', 'T'],
      remarks_no: 'Høyt histamin og tyramin innhold',
      remarks_en: 'High histamine and tyramine content'
    },
    {
      id: 3,
      name_no: 'Risdrikk',
      name_en: 'Rice milk',
      category: 'Plant-based milk',
      compatibility: 0,
      triggers: [],
      remarks_no: 'Generelt godt tolerert',
      remarks_en: 'Generally well tolerated'
    },
    {
      id: 4,
      name_no: 'Rødvin',
      name_en: 'Red wine',
      category: 'Alcoholic beverages',
      compatibility: 3,
      triggers: ['H', 'T', 'A'],
      remarks_no: 'Svært høyt histamin, tyramin og alkohol',
      remarks_en: 'Very high histamine, tyramine and alcohol'
    },
  ];

  const filteredFoods = mockFoods.filter(food => {
    const matchesSearch = searchQuery === '' || 
      food.name_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      food.name_en.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompatibility = selectedCompatibility === null || 
      food.compatibility === selectedCompatibility;
    
    const matchesCategory = selectedCategory === null || 
      food.category === selectedCategory;

    return matchesSearch && matchesCompatibility && matchesCategory;
  });

  const categories = [...new Set(mockFoods.map(food => food.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SIGHI Food Database</h1>
        <p className="text-gray-600 mt-1">Search 1370+ foods with MCAS compatibility ratings</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search foods (Norwegian or English)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {/* Compatibility Filter */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 py-2">Compatibility:</span>
            {[0, 1, 2, 3].map((level) => {
              const compat = getSighiCompatibility(level as 0 | 1 | 2 | 3);
              return (
                <button
                  key={level}
                  onClick={() => setSelectedCompatibility(selectedCompatibility === level ? null : level)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    selectedCompatibility === level
                      ? `${compat.bgColor} ${compat.textColor} border-current`
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {compat.label} ({level})
                </button>
              );
            })}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 py-2">Category:</span>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-100 text-primary-700 border-primary-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters */}
        {(selectedCompatibility !== null || selectedCategory !== null) && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {selectedCompatibility !== null && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-700">
                Compatibility: {getSighiCompatibility(selectedCompatibility as 0 | 1 | 2 | 3).label}
                <button
                  onClick={() => setSelectedCompatibility(null)}
                  className="ml-1 text-primary-600 hover:text-primary-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-700">
                Category: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="ml-1 text-primary-600 hover:text-primary-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Search Results ({filteredFoods.length} foods)
          </h2>
        </div>

        <div className="grid gap-4">
          {filteredFoods.map((food) => {
            const compat = getSighiCompatibility(food.compatibility as 0 | 1 | 2 | 3);
            return (
              <div
                key={food.id}
                className={`food-card ${compat.label.toLowerCase()}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {food.name_no}
                      </h3>
                      <span className={`badge-${compat.label.toLowerCase()}`}>
                        {compat.label} ({food.compatibility})
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">{food.name_en}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span>Category: {food.category}</span>
                      {food.triggers.length > 0 && (
                        <span>Triggers: {food.triggers.join(', ')}</span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      {food.remarks_en || food.remarks_no}
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <button className="btn-secondary text-sm">
                      <Heart className="w-4 h-4 mr-1" />
                      Add to Safe
                    </button>
                    <button className="btn-secondary text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredFoods.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No foods found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or filters to find more foods.
            </p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">SIGHI Compatibility Scale</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          {[0, 1, 2, 3].map((level) => {
            const compat = getSighiCompatibility(level as 0 | 1 | 2 | 3);
            return (
              <div key={level} className="flex items-center space-x-3">
                <span className={`w-3 h-3 rounded-full bg-${compat.color}`}></span>
                <span className="font-medium">{level} - {compat.label}:</span>
                <span className="text-blue-700">{compat.description}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}