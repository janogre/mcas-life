import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting SIGHI data extraction...');
console.log('Current directory:', __dirname);

const SERVER_JS_PATH = 'C:\\Users\\jang\\OneDrive\\Kode-prosjekter\\MCAS-search\\server.js';
const OUTPUT_PATH = path.join(__dirname, 'database', 'sighi-foods-data.json');

console.log('Server.js path:', SERVER_JS_PATH);
console.log('Output path:', OUTPUT_PATH);

try {
  // Check if source file exists
  if (!fs.existsSync(SERVER_JS_PATH)) {
    console.error('❌ Source file not found:', SERVER_JS_PATH);
    process.exit(1);
  }
  
  console.log('✅ Source file found');
  
  // Read the file
  console.log('📖 Reading server.js...');
  const content = fs.readFileSync(SERVER_JS_PATH, 'utf8');
  console.log('File size:', content.length, 'characters');
  
  // Find foods array
  const foodsMatch = content.match(/const foods = \[([\s\S]*?)\];/);
  if (!foodsMatch) {
    console.error('❌ Could not find foods array in server.js');
    process.exit(1);
  }
  
  console.log('✅ Found foods array');
  const foodsArrayString = foodsMatch[1];
  console.log('Foods array length:', foodsArrayString.length);
  
  // Create output directory
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('📁 Created output directory:', outputDir);
  }
  
  // For now, just save the raw extracted data
  const rawData = {
    raw_foods_array: foodsArrayString.substring(0, 1000) + '...', // First 1000 chars for preview
    length: foodsArrayString.length,
    extracted_at: new Date().toISOString()
  };
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rawData, null, 2));
  console.log('✅ Raw data saved to:', OUTPUT_PATH);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}