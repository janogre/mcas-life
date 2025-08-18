/**
 * Food Service Demo Tests
 * 
 * Testing core food management functionality
 */

import { describe, test, expect } from 'vitest';

describe('Food Service Demo', () => {
  test('should demonstrate SIGHI compatibility levels', () => {
    const compatibilityLevels = {
      SAFE: 0,           // Well tolerated, no symptoms expected at usual intake
      MEDIUM: 1,         // Moderately compatible, minor symptoms, occasional consumption of small quantities often tolerated
      INCOMPATIBLE: 2,   // Incompatible, significant symptoms at usual intake
      SEVERE: 3          // Very poorly tolerated, severe symptoms
    };

    expect(compatibilityLevels.SAFE).toBe(0);
    expect(compatibilityLevels.MEDIUM).toBe(1);
    expect(compatibilityLevels.INCOMPATIBLE).toBe(2);
    expect(compatibilityLevels.SEVERE).toBe(3);
  });

  test('should demonstrate SIGHI trigger validation', () => {
    const validTriggers = ['H', 'L', 'A', 'B', 'S', 'T', 'P', 'N', 'D', 'C'];
    
    const triggerNames = {
      'H': 'Histamine',
      'L': 'Lectins',
      'A': 'Aromatic compounds',
      'B': 'Biogenic amines',
      'S': 'Salicylates',
      'T': 'Tyramine',
      'P': 'Phenolic compounds',
      'N': 'Natural compounds',
      'D': 'Digestive irritants',
      'C': 'Cross-reactive allergens'
    };

    validTriggers.forEach(trigger => {
      expect(triggerNames).toHaveProperty(trigger);
      expect(triggerNames[trigger as keyof typeof triggerNames]).toBeTypeOf('string');
    });

    // Test invalid trigger
    expect(validTriggers).not.toContain('X');
  });

  test('should demonstrate food data structure from MCAS-search', () => {
    const sampleMcasSearchFood = {
      name_no: "Eggehvite",
      name_en: "egg white",
      category: "Ukjent kategori",
      compatibility: 1,
      triggers: JSON.stringify(["L"]),
      remarks_no: "Mastcelle-aktiverende spesielt rå, men også kokt",
      remarks_en: "Mast cell activating especially raw, but even cooked"
    };

    expect(sampleMcasSearchFood.name_no).toBe("Eggehvite");
    expect(sampleMcasSearchFood.name_en).toBe("egg white");
    expect(sampleMcasSearchFood.compatibility).toBe(1); // Medium risk
    expect(() => JSON.parse(sampleMcasSearchFood.triggers)).not.toThrow();
    
    const triggers = JSON.parse(sampleMcasSearchFood.triggers);
    expect(triggers).toContain("L"); // Lectins
  });

  test('should demonstrate biogenic amines structure', () => {
    const biogenicAmines = {
      histamine: 5.2,        // mg/kg
      tyramine: 1.8,         // mg/kg
      phenylethylamine: null, // Not measured
      serotonin: 0.3,        // mg/kg
      dopamine: null,        // Not measured
      norepinephrine: null,  // Not measured
      tryptamine: null,      // Not measured
      putrescine: 2.1,       // mg/kg
      cadaverine: 0.8,       // mg/kg
      spermidine: null       // Not measured
    };

    // Check structure
    expect(biogenicAmines).toHaveProperty('histamine');
    expect(biogenicAmines).toHaveProperty('tyramine');
    expect(biogenicAmines).toHaveProperty('phenylethylamine');
    expect(biogenicAmines).toHaveProperty('serotonin');
    expect(biogenicAmines).toHaveProperty('dopamine');
    expect(biogenicAmines).toHaveProperty('norepinephrine');
    expect(biogenicAmines).toHaveProperty('tryptamine');
    expect(biogenicAmines).toHaveProperty('putrescine');
    expect(biogenicAmines).toHaveProperty('cadaverine');
    expect(biogenicAmines).toHaveProperty('spermidine');

    // Check data types
    expect(typeof biogenicAmines.histamine).toBe('number');
    expect(biogenicAmines.phenylethylamine).toBeNull();
  });

  test('should demonstrate food search request structure', () => {
    const searchRequest = {
      query: 'egg',
      compatibility_filter: 1,
      category_filter: 'Ukjent kategori',
      trigger_filter: 'L',
      user_id: 1,
      include_approved: true,
      page: 1,
      limit: 20
    };

    expect(searchRequest.query).toBe('egg');
    expect([0, 1, 2, 3]).toContain(searchRequest.compatibility_filter);
    expect(['H', 'L', 'A', 'B', 'S', 'T', 'P', 'N', 'D', 'C']).toContain(searchRequest.trigger_filter);
    expect(searchRequest.page).toBeGreaterThan(0);
    expect(searchRequest.limit).toBeGreaterThan(0);
    expect(searchRequest.limit).toBeLessThanOrEqual(100);
  });

  test('should demonstrate approved food structure', () => {
    const approvedFood = {
      id: 1,
      user_id: 1,
      food_name: 'Organic Rice',
      personal_compatibility: 0, // Safe for this user
      notes: 'Works well when cooked thoroughly',
      last_consumed: new Date('2025-08-17'),
      times_consumed: 15,
      avg_reaction_score: 1.2, // Low reaction score (good)
      tags: ['grain', 'gluten-free', 'safe'],
      created_at: new Date('2025-07-01'),
      updated_at: new Date('2025-08-17')
    };

    expect(approvedFood.personal_compatibility).toBe(0); // Safe
    expect(approvedFood.times_consumed).toBeGreaterThan(0);
    expect(approvedFood.avg_reaction_score).toBeLessThanOrEqual(10);
    expect(Array.isArray(approvedFood.tags)).toBe(true);
    expect(approvedFood.last_consumed).toBeInstanceOf(Date);
  });

  test('should demonstrate bulk import request structure', () => {
    const bulkImportRequest = {
      foods: [
        {
          name_no: "Test Mat",
          name_en: "Test Food",
          category: "Test Kategori",
          compatibility: 0,
          triggers: ["H", "T"],
          remarks_no: "Test merknad",
          remarks_en: "Test remark"
        }
      ],
      overwrite_existing: true
    };

    expect(Array.isArray(bulkImportRequest.foods)).toBe(true);
    expect(bulkImportRequest.foods.length).toBeGreaterThan(0);
    expect(typeof bulkImportRequest.overwrite_existing).toBe('boolean');
    
    const food = bulkImportRequest.foods[0];
    expect(food.name_no).toBeTruthy();
    expect(food.name_en).toBeTruthy();
    expect([0, 1, 2, 3]).toContain(food.compatibility);
    expect(Array.isArray(food.triggers)).toBe(true);
  });

  test('should demonstrate food statistics structure', () => {
    const foodStats = {
      total_foods: 1370,
      by_compatibility: {
        'Safe': 856,
        'Medium': 324,
        'Avoid': 190
      },
      by_category: {
        'Kjøtt og fisk': 125,
        'Meieriprodukter': 98,
        'Grønnsaker': 245,
        'Frukt og bær': 156,
        'Korn og bakevarer': 89
      },
      top_triggers: [
        { trigger: 'H', count: 190, name: 'Histamine' },
        { trigger: 'L', count: 156, name: 'Lectins' },
        { trigger: 'A', count: 134, name: 'Aromatic compounds' },
        { trigger: 'B', count: 98, name: 'Biogenic amines' },
        { trigger: 'S', count: 87, name: 'Salicylates' }
      ]
    };

    expect(foodStats.total_foods).toBeGreaterThan(0);
    expect(typeof foodStats.by_compatibility).toBe('object');
    expect(typeof foodStats.by_category).toBe('object');
    expect(Array.isArray(foodStats.top_triggers)).toBe(true);

    // Validate trigger structure
    foodStats.top_triggers.forEach(trigger => {
      expect(trigger).toHaveProperty('trigger');
      expect(trigger).toHaveProperty('count');
      expect(trigger).toHaveProperty('name');
      expect(trigger.count).toBeGreaterThan(0);
    });

    // Validate compatibility totals
    const totalByCompatibility = Object.values(foodStats.by_compatibility).reduce((a, b) => a + b, 0);
    expect(totalByCompatibility).toBe(foodStats.total_foods);
  });

  test('should demonstrate food search response structure', () => {
    const searchResponse = {
      foods: [
        {
          id: 1,
          name_no: "Ris, kokt",
          name_en: "rice, cooked",
          category: "Korn og kornprodukter",
          compatibility: 0,
          triggers: [],
          biogenic_amines: null,
          remarks_no: null,
          remarks_en: null,
          image_url: null,
          nutrition_data: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      approved_foods: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 156,
        total_pages: 8
      },
      filters_applied: {
        query: 'ris',
        compatibility: null,
        category: null,
        trigger: null
      }
    };

    expect(Array.isArray(searchResponse.foods)).toBe(true);
    expect(Array.isArray(searchResponse.approved_foods)).toBe(true);
    expect(searchResponse.pagination).toHaveProperty('page');
    expect(searchResponse.pagination).toHaveProperty('limit');
    expect(searchResponse.pagination).toHaveProperty('total');
    expect(searchResponse.pagination).toHaveProperty('total_pages');
    
    expect(searchResponse.pagination.page).toBeGreaterThan(0);
    expect(searchResponse.pagination.total_pages).toBe(Math.ceil(searchResponse.pagination.total / searchResponse.pagination.limit));

    if (searchResponse.foods.length > 0) {
      const food = searchResponse.foods[0];
      expect(food).toHaveProperty('id');
      expect(food).toHaveProperty('name_no');
      expect(food).toHaveProperty('name_en');
      expect(food).toHaveProperty('compatibility');
      expect([0, 1, 2, 3]).toContain(food.compatibility);
    }
  });
});