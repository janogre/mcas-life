import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🍎 Parsing SIGHI foods data...');

const SERVER_JS_PATH = 'C:\\Users\\jang\\OneDrive\\Kode-prosjekter\\MCAS-search\\server.js';
const OUTPUT_PATH = path.join(__dirname, 'database', 'sighi-foods-data.json');

function parseFoodsData() {
  try {
    const content = fs.readFileSync(SERVER_JS_PATH, 'utf8');
    
    // Extract foods array more carefully
    const startMarker = 'const foods = [';
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) {
      throw new Error('Could not find foods array start marker');
    }
    
    // Find the matching closing bracket
    let bracketCount = 0;
    let currentIndex = startIndex + startMarker.length - 1; // -1 to include the opening bracket
    let inString = false;
    let stringChar = '';
    let endIndex = -1;
    
    while (currentIndex < content.length) {
      const char = content[currentIndex];
      
      if (!inString) {
        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
        } else if (char === '[') {
          bracketCount++;
        } else if (char === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            endIndex = currentIndex;
            break;
          }
        }
      } else {
        if (char === stringChar && content[currentIndex - 1] !== '\\') {
          inString = false;
        }
      }
      currentIndex++;
    }
    
    if (endIndex === -1) {
      throw new Error('Could not find foods array end');
    }
    
    const foodsArrayContent = content.substring(startIndex + startMarker.length, endIndex);
    console.log('Extracted foods array content, length:', foodsArrayContent.length);
    
    // Parse individual food objects
    const foods = [];
    let currentPos = 0;
    let objectCount = 0;
    
    while (currentPos < foodsArrayContent.length) {
      // Find next object start
      const objectStart = foodsArrayContent.indexOf('{', currentPos);
      if (objectStart === -1) break;
      
      // Find matching closing brace
      let braceCount = 0;
      let objIndex = objectStart;
      let inObjString = false;
      let objStringChar = '';
      let objectEnd = -1;
      
      while (objIndex < foodsArrayContent.length) {
        const char = foodsArrayContent[objIndex];
        
        if (!inObjString) {
          if (char === '"' || char === "'" || char === '`') {
            inObjString = true;
            objStringChar = char;
          } else if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              objectEnd = objIndex;
              break;
            }
          }
        } else {
          if (char === objStringChar && foodsArrayContent[objIndex - 1] !== '\\') {
            inObjString = false;
          }
        }
        objIndex++;
      }
      
      if (objectEnd === -1) break;
      
      // Extract and parse individual object
      const objectString = foodsArrayContent.substring(objectStart, objectEnd + 1);
      try {
        const foodObj = parseIndividualFood(objectString);
        if (foodObj) {
          foods.push({
            id: foods.length + 1,
            ...foodObj
          });
          objectCount++;
        }
      } catch (parseError) {
        console.warn(`Warning: Could not parse food object ${objectCount + 1}:`, parseError.message);
      }
      
      currentPos = objectEnd + 1;
    }
    
    console.log(`✅ Successfully parsed ${foods.length} food items`);
    
    // Generate metadata
    const categories = [...new Set(foods.map(f => f.category))].sort();
    const allTriggers = [...new Set(foods.flatMap(f => f.triggers))].sort();
    
    const compatibilityCounts = {
      0: foods.filter(f => f.compatibility === 0).length,
      1: foods.filter(f => f.compatibility === 1).length,
      2: foods.filter(f => f.compatibility === 2).length,
      3: foods.filter(f => f.compatibility === 3).length
    };
    
    const outputData = {
      foods: foods,
      metadata: {
        source: "SIGHI (Swiss Interest Group Histamine Intolerance)",
        source_url: "mcas-search.greger.cc",
        total_foods: foods.length,
        categories: categories,
        categories_count: categories.length,
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
    
    // Save to file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2));
    
    console.log('📊 SIGHI Data Summary:');
    console.log(`   Total foods: ${foods.length}`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Triggers found: ${allTriggers.join(', ')}`);
    console.log(`   Compatibility distribution:`, compatibilityCounts);
    console.log(`💾 Data saved to: ${OUTPUT_PATH}`);
    
    return outputData;
    
  } catch (error) {
    console.error('❌ Error parsing SIGHI data:', error);
    throw error;
  }
}

function parseIndividualFood(objectString) {
  try {
    // Convert JavaScript object notation to JSON
    let jsonString = objectString
      // Handle name_no
      .replace(/name_no:\s*"([^"]*(?:\\.[^"]*)*)"/g, '"name_no": "$1"')
      .replace(/name_no:\s*'([^']*(?:\\.[^']*)*)'/g, '"name_no": "$1"')
      // Handle name_en
      .replace(/name_en:\s*"([^"]*(?:\\.[^"]*)*)"/g, '"name_en": "$1"')
      .replace(/name_en:\s*'([^']*(?:\\.[^']*)*)'/g, '"name_en": "$1"')
      // Handle category
      .replace(/category:\s*"([^"]*(?:\\.[^"]*)*)"/g, '"category": "$1"')
      .replace(/category:\s*'([^']*(?:\\.[^']*)*)'/g, '"category": "$1"')
      // Handle compatibility
      .replace(/compatibility:\s*(\d+)/g, '"compatibility": $1')
      // Handle triggers - this is the tricky one
      .replace(/triggers:\s*JSON\.stringify\((\[.*?\])\)/g, '"triggers": $1')
      .replace(/triggers:\s*(\[.*?\])/g, '"triggers": $1')
      // Handle remarks
      .replace(/remarks_no:\s*"([^"]*(?:\\.[^"]*)*)"/g, '"remarks_no": "$1"')
      .replace(/remarks_no:\s*'([^']*(?:\\.[^']*)*)'/g, '"remarks_no": "$1"')
      .replace(/remarks_en:\s*"([^"]*(?:\\.[^"]*)*)"/g, '"remarks_en": "$1"')
      .replace(/remarks_en:\s*'([^']*(?:\\.[^']*)*)'/g, '"remarks_en": "$1"');
    
    // Parse the JSON
    const foodData = JSON.parse(jsonString);
    
    // Clean up the data
    return {
      name_no: foodData.name_no || '',
      name_en: foodData.name_en || '',
      category: foodData.category || 'Ukjent kategori',
      compatibility: typeof foodData.compatibility === 'number' ? foodData.compatibility : 0,
      triggers: Array.isArray(foodData.triggers) ? foodData.triggers : [],
      remarks_no: (foodData.remarks_no === 'nan' || !foodData.remarks_no) ? '' : foodData.remarks_no,
      remarks_en: (foodData.remarks_en === 'nan' || !foodData.remarks_en) ? '' : foodData.remarks_en
    };
    
  } catch (error) {
    // Try a different approach for difficult cases
    return parseObjectManually(objectString);
  }
}

function parseObjectManually(objectString) {
  const result = {};
  
  // Extract fields using regex
  const nameNoMatch = objectString.match(/name_no:\s*["']([^"']*)["']/);
  if (nameNoMatch) result.name_no = nameNoMatch[1];
  
  const nameEnMatch = objectString.match(/name_en:\s*["']([^"']*)["']/);
  if (nameEnMatch) result.name_en = nameEnMatch[1];
  
  const categoryMatch = objectString.match(/category:\s*["']([^"']*)["']/);
  if (categoryMatch) result.category = categoryMatch[1];
  
  const compatibilityMatch = objectString.match(/compatibility:\s*(\d+)/);
  if (compatibilityMatch) result.compatibility = parseInt(compatibilityMatch[1]);
  
  const triggersMatch = objectString.match(/triggers:\s*(?:JSON\.stringify\()?\[([^\]]*)\]\)?/);
  if (triggersMatch) {
    const triggersStr = triggersMatch[1];
    result.triggers = triggersStr.split(',').map(t => t.trim().replace(/["']/g, '')).filter(t => t);
  } else {
    result.triggers = [];
  }
  
  const remarksNoMatch = objectString.match(/remarks_no:\s*["']([^"']*)["']/);
  if (remarksNoMatch) result.remarks_no = remarksNoMatch[1];
  
  const remarksEnMatch = objectString.match(/remarks_en:\s*["']([^"']*)["']/);
  if (remarksEnMatch) result.remarks_en = remarksEnMatch[1];
  
  return result;
}

// Run the parser
parseFoodsData();