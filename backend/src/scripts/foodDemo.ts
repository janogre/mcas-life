/**
 * Food Service Demo Script
 * 
 * Demonstrates the complete food management functionality
 */

import type { FoodCompatibility, SighiTrigger } from '@mcas-life/shared';

console.log('🍎 MCAS-Life Food Service Demo');
console.log('==============================\n');

// Demo data structures based on MCAS-search integration
const demoSighiFoods = [
  {
    name_no: "Eggehvite",
    name_en: "egg white", 
    category: "Proteiner",
    compatibility: 1 as FoodCompatibility, // Medium risk
    triggers: ["L"] as SighiTrigger[], // Lectins
    remarks_no: "Mastcelle-aktiverende spesielt rå, men også kokt",
    remarks_en: "Mast cell activating especially raw, but even cooked"
  },
  {
    name_no: "Eggeplomme",
    name_en: "egg yolk",
    category: "Proteiner", 
    compatibility: 0 as FoodCompatibility, // Safe
    triggers: [] as SighiTrigger[],
    remarks_no: "",
    remarks_en: ""
  },
  {
    name_no: "Blåmuggost",
    name_en: "blue cheese",
    category: "Meieriprodukter",
    compatibility: 2 as FoodCompatibility, // Avoid
    triggers: ["A", "H"] as SighiTrigger[], // Aromatic compounds + Histamine
    remarks_no: "Høyt histamininnhold",
    remarks_en: "High histamine content"
  },
  {
    name_no: "Ris, kokt",
    name_en: "rice, cooked",
    category: "Korn og kornprodukter",
    compatibility: 0 as FoodCompatibility, // Safe
    triggers: [] as SighiTrigger[],
    remarks_no: "",
    remarks_en: ""
  },
  {
    name_no: "Spinat, fersk",
    name_en: "spinach, fresh",
    category: "Grønnsaker",
    compatibility: 1 as FoodCompatibility, // Medium
    triggers: ["S", "H"] as SighiTrigger[], // Salicylates + Histamine
    remarks_no: "Høyt oksalatinnhold",
    remarks_en: "High oxalate content"
  },
  {
    name_no: "Vin, rød",
    name_en: "red wine",
    category: "Alkohol",
    compatibility: 3 as FoodCompatibility, // Severe
    triggers: ["H", "A", "T"] as SighiTrigger[], // Histamine + Aromatic + Tyramine
    remarks_no: "Meget høyt histamininnhold, DAO-blokkering",
    remarks_en: "Very high histamine content, DAO blocking"
  }
];

const demoUserApprovedFoods = [
  {
    id: 1,
    user_id: 1,
    food_name: 'Organic Jasmine Rice',
    personal_compatibility: 0 as FoodCompatibility, // Safe for this user
    notes: 'Perfect when cooked with extra water. No reactions after 15+ times.',
    last_consumed: new Date('2025-08-16'),
    times_consumed: 23,
    avg_reaction_score: 0.1, // Very low reaction
    tags: ['grain', 'safe', 'staple', 'organic'],
    created_at: new Date('2025-07-01'),
    updated_at: new Date('2025-08-16')
  },
  {
    id: 2,
    user_id: 1,
    food_name: 'Homemade Bone Broth',
    personal_compatibility: 0 as FoodCompatibility,
    notes: 'Made with organic beef bones, simmered 24 hours. Very healing.',
    last_consumed: new Date('2025-08-17'),
    times_consumed: 8,
    avg_reaction_score: 0.3,
    tags: ['protein', 'healing', 'homemade', 'safe'],
    created_at: new Date('2025-08-01'),
    updated_at: new Date('2025-08-17')
  },
  {
    id: 3,
    user_id: 1,
    food_name: 'Fresh Cucumber',
    personal_compatibility: 1 as FoodCompatibility, // Caution needed
    notes: 'OK in small amounts, but skin causes mild itching.',
    last_consumed: new Date('2025-08-10'),
    times_consumed: 5,
    avg_reaction_score: 3.2,
    tags: ['vegetable', 'caution', 'skin-reaction'],
    created_at: new Date('2025-07-15'),
    updated_at: new Date('2025-08-10')
  }
];

const triggerNames: Record<SighiTrigger, string> = {
  H: 'Histamine',
  L: 'Lectins', 
  A: 'Aromatic compounds',
  B: 'Biogenic amines',
  S: 'Salicylates',
  T: 'Tyramine',
  P: 'Phenolic compounds',
  N: 'Natural compounds',
  D: 'Digestive irritants',
  C: 'Cross-reactive allergens'
};

function demonstrateSighiCompatibility() {
  console.log('1️⃣ SIGHI Compatibility System Demo');
  console.log('----------------------------------');
  
  console.log('SIGHI compatibility levels (official 0-3 scale):');
  console.log('  0 = 🟢 Safe (Well tolerated, no symptoms expected at usual intake)');
  console.log('  1 = 🟡 Medium (Moderately compatible, minor symptoms, occasional consumption of small quantities often tolerated)'); 
  console.log('  2 = 🟠 Incompatible (Incompatible, significant symptoms at usual intake)');
  console.log('  3 = 🔴 Severe (Very poorly tolerated, severe symptoms)');
  console.log('');
  
  const compatibilityStats = { 0: 0, 1: 0, 2: 0, 3: 0 };
  demoSighiFoods.forEach(food => {
    compatibilityStats[food.compatibility]++;
  });
  
  console.log('📊 Demo foods distribution:');
  console.log(`   🟢 Safe: ${compatibilityStats[0]} foods`);
  console.log(`   🟡 Medium: ${compatibilityStats[1]} foods`);
  console.log(`   🟠 Incompatible: ${compatibilityStats[2]} foods`);
  console.log(`   🔴 Severe: ${compatibilityStats[3]} foods`);
  console.log('');
}

function demonstrateSighiTriggers() {
  console.log('2️⃣ SIGHI Trigger System Demo');
  console.log('-----------------------------');
  
  console.log('SIGHI trigger categories:');
  Object.entries(triggerNames).forEach(([code, name]) => {
    console.log(`   ${code} = ${name}`);
  });
  console.log('');
  
  const triggerCounts: Record<string, number> = {};
  demoSighiFoods.forEach(food => {
    food.triggers.forEach(trigger => {
      triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
    });
  });
  
  console.log('📊 Trigger distribution in demo foods:');
  Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([trigger, count]) => {
      const name = triggerNames[trigger as SighiTrigger];
      console.log(`   ${trigger} (${name}): ${count} foods`);
    });
  console.log('');
}

function demonstrateFoodDatabase() {
  console.log('3️⃣ Food Database Demo');
  console.log('---------------------');
  
  console.log('Sample SIGHI foods from database:');
  
  demoSighiFoods.forEach(food => {
    const compatibilityIcon = food.compatibility === 0 ? '🟢' : 
                            food.compatibility === 1 ? '🟡' : 
                            food.compatibility === 2 ? '🟠' : '🔴';
    const triggerList = food.triggers.length > 0 ? 
      food.triggers.map(t => `${t}(${triggerNames[t]})`).join(', ') : 
      'None';
    
    console.log(`\n${compatibilityIcon} ${food.name_no} (${food.name_en})`);
    console.log(`   Category: ${food.category}`);
    console.log(`   Compatibility: ${food.compatibility}`);
    console.log(`   Triggers: ${triggerList}`);
    if (food.remarks_no) {
      console.log(`   Note: ${food.remarks_no}`);
    }
  });
  console.log('');
}

function demonstrateFoodSearch() {
  console.log('4️⃣ Food Search Demo');
  console.log('-------------------');
  
  // Simulate search requests
  const searchExamples = [
    {
      query: 'egg',
      description: 'Search for egg-related foods',
      expectedMatches: demoSighiFoods.filter(f => 
        f.name_no.toLowerCase().includes('egg') || 
        f.name_en.toLowerCase().includes('egg')
      )
    },
    {
      compatibility_filter: 0,
      description: 'Find only safe foods (compatibility = 0)',
      expectedMatches: demoSighiFoods.filter(f => f.compatibility === 0)
    },
    {
      trigger_filter: 'H' as SighiTrigger,
      description: 'Find foods containing Histamine triggers',
      expectedMatches: demoSighiFoods.filter(f => f.triggers.includes('H'))
    },
    {
      category_filter: 'Meieriprodukter',
      description: 'Find dairy products',
      expectedMatches: demoSighiFoods.filter(f => f.category === 'Meieriprodukter')
    }
  ];
  
  searchExamples.forEach((example, index) => {
    console.log(`Search ${index + 1}: ${example.description}`);
    console.log(`   Request: ${JSON.stringify(example, ['query', 'compatibility_filter', 'trigger_filter', 'category_filter'])}`);
    console.log(`   Results: ${example.expectedMatches.length} foods found`);
    
    example.expectedMatches.forEach(food => {
      const icon = food.compatibility === 0 ? '🟢' : 
                   food.compatibility === 1 ? '🟡' : 
                   food.compatibility === 2 ? '🟠' : '🔴';
      console.log(`     ${icon} ${food.name_no}`);
    });
    console.log('');
  });
}

function demonstrateUserApprovedFoods() {
  console.log('5️⃣ User Approved Foods Demo');
  console.log('---------------------------');
  
  console.log('Personal food approval system allows users to:');
  console.log('• Track foods that work specifically for them');
  console.log('• Override SIGHI compatibility based on personal experience');
  console.log('• Track reaction scores and consumption patterns');
  console.log('• Add personal notes and tags');
  console.log('');
  
  console.log('Sample user approved foods:');
  
  demoUserApprovedFoods.forEach(food => {
    const compatibilityIcon = food.personal_compatibility === 0 ? '🟢' : 
                            food.personal_compatibility === 1 ? '🟡' : 
                            food.personal_compatibility === 2 ? '🟠' : '🔴';
    const reactionLevel = food.avg_reaction_score <= 1 ? '😊 Excellent' :
                         food.avg_reaction_score <= 3 ? '😐 Mild reactions' :
                         food.avg_reaction_score <= 6 ? '😟 Moderate reactions' :
                         '😰 Strong reactions';
    
    console.log(`\n${compatibilityIcon} ${food.food_name}`);
    console.log(`   Personal compatibility: ${food.personal_compatibility}`);
    console.log(`   Times consumed: ${food.times_consumed}`);
    console.log(`   Avg reaction score: ${food.avg_reaction_score}/10 (${reactionLevel})`);
    console.log(`   Last consumed: ${food.last_consumed.toDateString()}`);
    console.log(`   Tags: ${food.tags.join(', ')}`);
    console.log(`   Notes: "${food.notes}"`);
  });
  console.log('');
}

function demonstrateBiogenicAmines() {
  console.log('6️⃣ Biogenic Amines Tracking Demo');
  console.log('---------------------------------');
  
  console.log('MCAS-Life tracks 10 key biogenic amines:');
  
  const biogenicAmineExamples = {
    'Aged Cheese (Cheddar, 12 months)': {
      histamine: 890.5,     // mg/kg - Very high
      tyramine: 1205.2,     // mg/kg - Extremely high
      phenylethylamine: 12.8, // mg/kg
      putrescine: 89.3,     // mg/kg
      cadaverine: 45.7,     // mg/kg
      serotonin: null,      // Not measured
      dopamine: null,       // Not measured
      norepinephrine: null, // Not measured
      tryptamine: null,     // Not measured
      spermidine: 23.1      // mg/kg
    },
    'Fresh Salmon Fillet': {
      histamine: 2.1,       // mg/kg - Low
      tyramine: 1.8,        // mg/kg - Low
      phenylethylamine: null,
      putrescine: 5.4,      // mg/kg
      cadaverine: 3.2,      // mg/kg
      serotonin: 8.7,       // mg/kg
      dopamine: null,
      norepinephrine: null,
      tryptamine: null,
      spermidine: 12.3      // mg/kg
    },
    'Fermented Sauerkraut': {
      histamine: 89.4,      // mg/kg - High
      tyramine: 34.2,       // mg/kg - Moderate
      phenylethylamine: 5.6,
      putrescine: 156.8,    // mg/kg - Very high
      cadaverine: 78.9,     // mg/kg - High
      serotonin: null,
      dopamine: null,
      norepinephrine: null,
      tryptamine: null,
      spermidine: 45.2      // mg/kg
    }
  };
  
  Object.entries(biogenicAmineExamples).forEach(([foodName, amines]) => {
    console.log(`\n🧪 ${foodName}:`);
    
    const significantAmines = Object.entries(amines)
      .filter(([, value]) => value !== null && value > 1)
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    
    if (significantAmines.length > 0) {
      significantAmines.forEach(([amine, value]) => {
        const level = (value as number) > 100 ? '🔴 High' :
                     (value as number) > 50 ? '🟡 Moderate' : '🟢 Low';
        console.log(`   ${amine}: ${value} mg/kg (${level})`);
      });
    } else {
      console.log('   ✅ Low in biogenic amines');
    }
  });
  console.log('');
}

function demonstrateFoodApiEndpoints() {
  console.log('7️⃣ Food API Endpoints Demo');
  console.log('---------------------------');
  
  const apiEndpoints = [
    {
      method: 'GET',
      path: '/api/foods/search',
      description: 'Search foods with advanced filtering',
      public: true,
      example: '/api/foods/search?query=rice&compatibility_filter=0&page=1&limit=10'
    },
    {
      method: 'GET', 
      path: '/api/foods/:id',
      description: 'Get detailed food information',
      public: true,
      example: '/api/foods/123'
    },
    {
      method: 'GET',
      path: '/api/foods/compatibility/:level',
      description: 'Get foods by compatibility level',
      public: true,
      example: '/api/foods/compatibility/0'
    },
    {
      method: 'GET',
      path: '/api/foods/trigger/:trigger',
      description: 'Get foods containing specific trigger',
      public: true,
      example: '/api/foods/trigger/H'
    },
    {
      method: 'GET',
      path: '/api/foods/statistics',
      description: 'Get food database statistics',
      public: true,
      example: '/api/foods/statistics'
    },
    {
      method: 'GET',
      path: '/api/foods/approved',
      description: 'Get user approved foods',
      public: false,
      auth: 'Bearer token required'
    },
    {
      method: 'POST',
      path: '/api/foods/approved',
      description: 'Add new user approved food',
      public: false,
      auth: 'Bearer token required'
    },
    {
      method: 'PUT',
      path: '/api/foods/approved/:id',
      description: 'Update user approved food',
      public: false,
      auth: 'Bearer token required'
    },
    {
      method: 'POST',
      path: '/api/foods/import',
      description: 'Bulk import SIGHI foods (admin only)',
      public: false,
      auth: 'Admin role required'
    }
  ];
  
  console.log('Available Food API endpoints:');
  
  apiEndpoints.forEach(endpoint => {
    const authIcon = endpoint.public ? '🌐' : '🔒';
    console.log(`\n${authIcon} ${endpoint.method} ${endpoint.path}`);
    console.log(`   ${endpoint.description}`);
    if (endpoint.example) {
      console.log(`   Example: ${endpoint.example}`);
    }
    if (endpoint.auth) {
      console.log(`   Auth: ${endpoint.auth}`);
    }
  });
  console.log('');
}

function demonstrateDataImportProcess() {
  console.log('8️⃣ SIGHI Data Import Demo');
  console.log('-------------------------');
  
  console.log('Data import process from MCAS-search server.js (corrected source):');
  console.log('1. 📂 Read server.js and extract foods array (line 67-9059)');
  console.log('2. 🧹 Clean and validate food data');
  console.log('3. 🔄 Map compatibility levels (3→2 for avoid foods)');
  console.log('4. 🧼 Clean triggers (remove exclamation marks etc.)');
  console.log('5. 📊 Analyze data structure and quality');
  console.log('6. 📥 Bulk import into PostgreSQL database');
  console.log('7. ✅ Verify import results');
  console.log('');
  
  // Simulate import statistics from server.js
  const importStats = {
    total_processed: 906,
    imported: 904,
    skipped: 2,
    errors: 0,
    source: 'server.js (authoritative)',
    categories_found: 15,
    triggers_found: ['H', 'L', 'A', 'B', 'S', 'T', 'P', 'N', 'D', 'C'],
    compatibility_distribution: {
      safe: 542,      // 60.0%
      medium: 203,    // 22.4%  
      avoid: 159      // 17.6% (includes mapped 3→2)
    }
  };
  
  console.log('📊 Sample import results:');
  console.log(`   Source: ${importStats.source}`);
  console.log(`   Total processed: ${importStats.total_processed}`);
  console.log(`   Successfully imported: ${importStats.imported}`);
  console.log(`   Skipped (duplicates): ${importStats.skipped}`);
  console.log(`   Errors: ${importStats.errors}`);
  console.log(`   Categories found: ${importStats.categories_found}`);
  console.log(`   Triggers found: ${importStats.triggers_found.join(', ')}`);
  console.log('');
  console.log('🎯 Compatibility distribution:');
  console.log(`   🟢 Safe (0): ${importStats.compatibility_distribution.safe} foods`);
  console.log(`   🟡 Medium (1): ${importStats.compatibility_distribution.medium} foods`);
  console.log(`   🔴 Avoid (2): ${importStats.compatibility_distribution.avoid} foods`);
  console.log('');
  console.log('✅ Using server.js ensures data quality and consistency:');
  console.log('   - Eliminates errors from problematic JS documentation files');
  console.log('   - Uses the authoritative source that powers MCAS-search app');
  console.log('   - Automatic compatibility level mapping (3→2)');
  console.log('   - Clean trigger data processing');
  console.log('');
}

async function runDemo() {
  try {
    console.log('Starting MCAS-Life Food Service demonstration...\n');
    
    // Run all demos
    demonstrateSighiCompatibility();
    demonstrateSighiTriggers();
    demonstrateFoodDatabase();
    demonstrateFoodSearch();
    demonstrateUserApprovedFoods();
    demonstrateBiogenicAmines();
    demonstrateFoodApiEndpoints();
    demonstrateDataImportProcess();
    
    console.log('🎉 Food Service Demo Complete!');
    console.log('===============================');
    console.log('');
    console.log('Key Features Demonstrated:');
    console.log('• ✅ SIGHI compatibility system (0=Safe, 1=Medium, 2=Incompatible, 3=Severe)');
    console.log('• ✅ Advanced trigger tracking (10 SIGHI categories)');
    console.log('• ✅ Comprehensive food search and filtering');
    console.log('• ✅ Personal food approval system');
    console.log('• ✅ Biogenic amines tracking (10 compounds)');
    console.log('• ✅ RESTful API with authentication');
    console.log('• ✅ MCAS-search data integration');
    console.log('• ✅ Bulk import from external sources');
    console.log('');
    console.log('Database Features:');
    console.log('• 🗄️ PostgreSQL with JSONB for complex data');
    console.log('• 🔍 Full-text search in Norwegian and English');
    console.log('• 📊 Real-time statistics and analytics');
    console.log('• 🔒 User-specific data isolation');
    console.log('• 📈 Consumption tracking and reaction scoring');
    console.log('• 🏷️ Flexible tagging system');
    console.log('');
    console.log('Ready for integration with MCAS symptom tracking! 🚀');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo();
}

export { runDemo };