#!/usr/bin/env node

/**
 * Script to extract SIGHI foods data from MCAS-search server.js
 * and convert to clean JSON format for MCAS-life database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_JS_PATH = 'C:\\Users\\jang\\OneDrive\\Kode-prosjekter\\MCAS-search\\server.js';
const OUTPUT_PATH = path.join(__dirname, 'database', 'sighi-foods-data.json');

function extractFoodsData() {
  try {
    console.log('Reading server.js file...');
    const serverContent = fs.readFileSync(SERVER_JS_PATH, 'utf8');
    
    // Find the foods array start
    const foodsStartMatch = serverContent.match(/const foods = \[/);
    if (!foodsStartMatch) {
      throw new Error('Could not find foods array start');
    }
    
    const startIndex = foodsStartMatch.index + foodsStartMatch[0].length;
    
    // Find the end of the foods array (looking for ]; followed by foods.forEach or similar)
    let endIndex = -1;
    let bracketCount = 1;
    let inString = false;
    let stringChar = '';
    let i = startIndex;
    
    while (i < serverContent.length && bracketCount > 0) {
      const char = serverContent[i];
      
      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '[') {
          bracketCount++;
        } else if (char === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            endIndex = i;
            break;
          }
        }
      } else {
        if (char === stringChar && serverContent[i-1] !== '\\') {
          inString = false;
        }
      }
      i++;
    }
    
    if (endIndex === -1) {
      throw new Error('Could not find foods array end');
    }
    
    // Extract the foods array content
    const foodsArrayContent = serverContent.substring(startIndex, endIndex);
    console.log('Extracted foods array content, length:', foodsArrayContent.length);
    
    // Create a safe evaluation context
    const foodsString = '[' + foodsArrayContent + ']';
    
    // Parse the foods array safely
    let foods;
    try {
      // Replace JSON.stringify with a temporary marker to parse correctly
      const safeFoodsString = foodsString.replace(/JSON\.stringify\((\[.*?\])\)/g, '$1');
      foods = eval(safeFoodsString);
    } catch (evalError) {
      console.error('Error evaluating foods array:', evalError);
      // Try alternative parsing method
      foods = parseFoodsManually(foodsArrayContent);
    }
    
    console.log(`Successfully extracted ${foods.length} food items`);
    
    // Clean and process the data
    const processedFoods = foods.map((food, index) => {
      try {
        let triggers = food.triggers;
        
        // Handle triggers parsing
        if (typeof triggers === 'string') {
          if (triggers.startsWith('["') || triggers.startsWith("['")) {
            triggers = JSON.parse(triggers);
          } else {
            triggers = [];
          }
        }
        
        return {
          id: index + 1,
          name_no: food.name_no || '',
          name_en: food.name_en || '',
          category: food.category || 'Ukjent kategori',
          compatibility: food.compatibility || 0,
          triggers: Array.isArray(triggers) ? triggers : [],
          remarks_no: (food.remarks_no === 'nan' || !food.remarks_no) ? '' : food.remarks_no,
          remarks_en: (food.remarks_en === 'nan' || !food.remarks_en) ? '' : food.remarks_en
        };
      } catch (itemError) {
        console.warn(`Error processing food item ${index}:`, itemError);
        return null;
      }
    }).filter(Boolean);
    
    // Create metadata
    const categories = [...new Set(processedFoods.map(f => f.category))].sort();
    const allTriggers = [...new Set(processedFoods.flatMap(f => f.triggers))].sort();
    
    const compatibilityCounts = {
      0: processedFoods.filter(f => f.compatibility === 0).length,
      1: processedFoods.filter(f => f.compatibility === 1).length,
      2: processedFoods.filter(f => f.compatibility === 2).length,
      3: processedFoods.filter(f => f.compatibility === 3).length
    };
    
    const outputData = {
      foods: processedFoods,
      metadata: {
        source: "SIGHI (Swiss Interest Group Histamine Intolerance)",
        source_url: "mcas-search.greger.cc",
        total_foods: processedFoods.length,
        categories: categories,
        triggers_found: allTriggers,
        compatibility_distribution: compatibilityCounts,
        compatibility_levels: {
          "0": "Kompatibel - ingen symptomer forventet ved vanlig inntak",
          "1": "Moderat kompatibel - mindre symptomer, små mengder ofte tolerert",
          "2": "Ukompatibel - betydelige symptomer ved vanlig inntak",
          "3": "Svært dårlig tolerert - alvorlige symptomer"
        },
        triggers: {
          "H": "Høyt histamininnhold",
          "H!": "Lett bedervelig - rask histamindannelse",
          "A": "Andre biogene aminer",
          "L": "Liberatorer av mastcellemediatorer",
          "B": "Blokkere av histaminnedbrytende enzymer"
        },
        extracted_at: new Date().toISOString()
      }
    };
    
    // Write to output file
    console.log('Writing to output file...');
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2), 'utf8');
    
    console.log('✅ Successfully extracted SIGHI data!');
    console.log(`📊 Total foods: ${processedFoods.length}`);
    console.log(`📂 Categories: ${categories.length}`);
    console.log(`🏷️  Triggers found: ${allTriggers.join(', ')}`);
    console.log(`💾 Output saved to: ${OUTPUT_PATH}`);
    
    return outputData;
    
  } catch (error) {
    console.error('❌ Error extracting SIGHI data:', error);
    process.exit(1);
  }
}

function parseFoodsManually(content) {
  // Fallback manual parsing if eval fails
  console.log('Attempting manual parsing...');
  const foods = [];
  
  // Split by objects (looking for { ... }, pattern)
  const objectMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
  
  if (objectMatches) {
    objectMatches.forEach((objStr, index) => {
      try {
        // Clean up the object string and parse manually
        const cleanObj = objStr
          .replace(/JSON\.stringify\((\[.*?\])\)/g, '$1')
          .replace(/name_no:\s*"([^"]*)"/, '"name_no": "$1"')
          .replace(/name_en:\s*"([^"]*)"/, '"name_en": "$1"')
          .replace(/category:\s*"([^"]*)"/, '"category": "$1"')
          .replace(/compatibility:\s*(\d+)/, '"compatibility": $1')
          .replace(/triggers:\s*(\[.*?\])/, '"triggers": $1')
          .replace(/remarks_no:\s*"([^"]*)"/, '"remarks_no": "$1"')
          .replace(/remarks_en:\s*"([^"]*)"/, '"remarks_en": "$1"');
        
        const food = JSON.parse(cleanObj);
        foods.push(food);
      } catch (e) {
        console.warn(`Could not parse food object ${index}`);
      }
    });
  }
  
  return foods;
}

// Run the extraction
if (import.meta.url === `file://${process.argv[1]}`) {
  extractFoodsData();
}

export { extractFoodsData };