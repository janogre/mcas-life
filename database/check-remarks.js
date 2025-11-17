/**
 * SIGHI Food Database - Check remarks statistics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkRemarks() {
  const jsonPath = path.join(__dirname, 'sighi-foods-data.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  let emptyRemarksNo = 0;
  let emptyRemarksEn = 0;
  let totalFoods = data.foods.length;
  const samplesWithRemarks = [];
  const samplesWithoutRemarks = [];

  data.foods.forEach(food => {
    if (!food.remarks_no || food.remarks_no === '') emptyRemarksNo++;
    if (!food.remarks_en || food.remarks_en === '') emptyRemarksEn++;
    
    if (food.remarks_no && food.remarks_en && samplesWithRemarks.length < 5) {
      samplesWithRemarks.push({
        name: food.name_no + ' (' + food.name_en + ')',
        remarks_no: food.remarks_no.substring(0, 60) + '...',
        remarks_en: food.remarks_en.substring(0, 60) + '...'
      });
    }
    
    if ((!food.remarks_no || food.remarks_no === '') && samplesWithoutRemarks.length < 5) {
      samplesWithoutRemarks.push(food.name_no + ' (' + food.name_en + ')');
    }
  });

  console.log('📊 Remarks-statistikk:');
  console.log('  Totalt matvarer:', totalFoods);
  console.log('  Manglende norske remarks:', emptyRemarksNo, '(' + Math.round(emptyRemarksNo/totalFoods*100) + '%)');
  console.log('  Manglende engelske remarks:', emptyRemarksEn, '(' + Math.round(emptyRemarksEn/totalFoods*100) + '%)');
  console.log('  Matvarer med begge remarks:', totalFoods - Math.max(emptyRemarksNo, emptyRemarksEn));

  console.log('\n🔍 Eksempler på matvarer med remarks:');
  samplesWithRemarks.forEach(sample => {
    console.log('  -', sample.name);
    console.log('    NO:', sample.remarks_no);
    console.log('    EN:', sample.remarks_en);
  });

  console.log('\n⚠️ Eksempler på matvarer uten remarks:');
  samplesWithoutRemarks.forEach(sample => {
    console.log('  -', sample);
  });
}

checkRemarks();