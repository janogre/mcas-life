/**
 * SIGHI Food Database Category Fixer
 * 
 * Retter kategoriene i sighi-foods-data.json basert på den offisielle SIGHI PDF-listen.
 * Erstatter "Ukjent kategori" med riktige kategorier basert på matvarenavnet.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kategori-mapping basert på SIGHI PDF struktur
const CATEGORY_MAPPINGS = {
  // Animal Foods
  'Eggs': [
    'egg white', 'egg yolk', 'eggs', 'chicken egg', 'whole egg', 'quail eggs', 'quail\'s egg',
    'eggehvite', 'eggeplomme', 'hønseegg', 'vaktelegg', 'vaktel\'s egg'
  ],
  
  'Dairy products': [
    'blue cheese', 'mold cheese', 'butter', 'smør', 'butterkaese', 'buttermilk', 'kulturmelk',
    'cheddar', 'cheese', 'ost', 'cream', 'fløte', 'curd cheese', 'kvark', 'cottage cheese',
    'ewe\'s milk', 'sheep', 'farmer\'s cheese', 'feta', 'fontina', 'geheimratskaese',
    'goat\'s milk', 'gouda', 'kefir', 'mascarpone', 'milk', 'melk', 'milkpowder', 'melkepulver',
    'mozzarella', 'processed cheese', 'quark', 'raclette', 'raw milk', 'rå melk', 'ricotta',
    'rochefort', 'roquefort', 'sourcream', 'rømme', 'whey', 'valle', 'yoghurt', 'yogurt'
  ],
  
  'Meat': [
    'beef', 'chicken', 'dried meat', 'tørket kjøtt', 'dry-cured ham', 'spekeskinke',
    'duck', 'and', 'entrails', 'innmat', 'game', 'vilt', 'ham', 'skinke', 'innards',
    'minced meat', 'kjøttdeig', 'ostrich', 'struts', 'pork', 'svinekjøtt', 'poultry',
    'fjærfe', 'quail', 'vaktel', 'salami', 'sausage', 'pølse', 'smoked fish', 'røkt fisk',
    'smoked meat', 'røkt kjøtt', 'tongue', 'tunge', 'turkey', 'kalkun', 'veal', 'kalv',
    'venison', 'hjort', 'wild meat', 'villkjøtt'
  ],
  
  'Fish': [
    'anchovies', 'ansjos', 'fish', 'fisk', 'trout', 'ørret', 'tuna', 'tunfisk'
  ],
  
  'Sea food': [
    'bivalves', 'mussel', 'oyster', 'østers', 'crab', 'krabbe', 'crawfish', 'kreps',
    'crayfish', 'ferskvannskreps', 'langouste', 'lobster', 'hummer', 'prawn', 'reke',
    'rock lobster', 'seafood', 'sjømat', 'shellfish', 'skalldyr', 'shrimp', 'reker',
    'spiny lobster'
  ],

  // Vegetable Foods - Starch suppliers
  'Starch suppliers': [
    'amaranth', 'baked goods', 'bakevarer', 'barley', 'bygg', 'malt', 'bread', 'brød',
    'buckwheat', 'bokhvete', 'chestnut', 'kastanje', 'cornflakes', 'hemp seeds', 'hampfrø',
    'kamut', 'khorasan wheat', 'maltodextrin', 'millet', 'hirse', 'oats', 'havre',
    'pearl sago', 'potato', 'potet', 'quinoa', 'rice', 'ris', 'rye', 'rug', 'sago',
    'spelt', 'dinkel', 'sunflower seed', 'solsikkefrø', 'sweet corn', 'mais', 'sweet potato',
    'søtpotet', 'wheat', 'hvete', 'wild rice', 'villris', 'yam'
  ],
  
  'Nuts': [
    'almond', 'mandel', 'brazil nut', 'paranøtt', 'cashew', 'cashewnøtt', 'chufa sedge',
    'earth almond', 'hazelnut', 'hasselnøtt', 'macadamia', 'nut grass', 'nuts', 'nøtter',
    'peanut', 'peanøtt', 'pine nut', 'pinjenøtt', 'pistachio', 'pistasj', 'tiger nut',
    'walnut', 'valnøtt', 'yellow nutsedge'
  ],
  
  'Fats and oils': [
    'black caraway oil', 'canola oil', 'rapsolje', 'coconut oil', 'kokosolje', 'coconut fat',
    'fennel flower oil', 'margarine', 'nigella sativa oil', 'nutmeg flower oil',
    'olive oil', 'olivenolje', 'palm oil', 'palmeolje', 'pumpkin seed oil', 'gresskarolje',
    'rape seed oil', 'roman coriander oil', 'safflower oil', 'sunflower oil', 'solsikkeolje',
    'walnut oil', 'valnøttolje'
  ],
  
  'Vegetables': [
    'artichoke', 'artisjokk', 'asparagus', 'asparges', 'aubergine', 'aubergine', 'avocado',
    'bamboo shoot', 'bambusskudd', 'bean', 'bønner', 'beetroot', 'rødbete', 'bell pepper',
    'paprika', 'bok choi', 'borlotti bean', 'brinjal', 'broccoli', 'brokkoli', 'brussels sprout',
    'rosenkål', 'cabbage', 'kål', 'carrot', 'gulrot', 'cauliflower', 'blomkål', 'celery',
    'selleri', 'chard', 'mangold', 'chayote', 'chickpea', 'kikerter', 'chicory', 'sikori',
    'chili', 'chili', 'choko', 'corn salad', 'courgette', 'squash', 'cress', 'karse',
    'cucumber', 'agurk', 'eggplant', 'aubergine', 'endive', 'endiv', 'fennel', 'fennikel',
    'garden cress', 'garlic', 'hvitløk', 'german turnip', 'gourd', 'green bean', 'grønne bønner',
    'green pea', 'grønne erter', 'green split pea', 'horseradish', 'pepperrot', 'kelp', 'tare',
    'kohlrabi', 'kålrabi', 'lamb\'s lettuce', 'leek', 'purre', 'lentil', 'linser', 'lettuce',
    'salat', 'marrow', 'merg', 'mungbean', 'napa cabbage', 'olive', 'oliven', 'onion', 'løk',
    'pak choi', 'parsnip', 'pastinakk', 'perennial wall-rocket', 'pickled cabbage', 'surkål',
    'pickled cucumber', 'syltet agurk', 'pickled gherkin', 'pickled vegetable', 'pulse',
    'belgjfrukter', 'pumpkin', 'gresskar', 'radish', 'reddik', 'red cabbage', 'rødkål',
    'sauerkraut', 'savoy cabbage', 'savoykål', 'snow pea', 'sukkerert', 'soy', 'soya',
    'spinach', 'spinat', 'squash', 'gresskar', 'stinging nettle', 'brennesle', 'tomato',
    'tomat', 'turnip', 'nepe', 'turnip cabbage', 'vicia faba', 'white onion', 'hvitløk',
    'yellow split pea', 'gule erter', 'zucchini', 'squash'
  ],
  
  'Herbs': [
    'basil', 'basilikum', 'bear leek', 'bjørneløk', 'bear\'s garlic', 'blue fenugreek',
    'broad-leaved garlic', 'buckram', 'chive', 'gressløk', 'clover', 'kløver', 'dill',
    'dill', 'fenugreek', 'bukkehorn', 'mint', 'mynte', 'oregano', 'oregano', 'parsley',
    'persille', 'ramson', 'rosemary', 'rosmarin', 'sage', 'salvie', 'savory', 'sar',
    'trifolium', 'trigonella', 'wild garlic', 'villløk', 'wood garlic'
  ],
  
  'Fruits': [
    'acerola', 'apple', 'eple', 'apricot', 'aprikos', 'aronia', 'chokeberry', 'asimina',
    'banana', 'banan', 'barbary fig', 'blackberry', 'bjørnebær', 'blackcurrant',
    'solbær', 'blueberry', 'blåbær', 'boysenberry', 'cactus pear', 'carambola',
    'stjernefrukt', 'cherry', 'kirsebær', 'citrus', 'sitrus', 'cocoa', 'kakao', 'coconut',
    'kokosnøtt', 'common pawpaw', 'sea-buckthorn', 'tindved', 'cowberry', 'tyttebær',
    'cranberry', 'tranebær', 'date', 'dadler', 'dog rose', 'nype', 'dragon fruit',
    'fig', 'fiken', 'goji berry', 'gooseberry', 'stikkelsbær', 'grape', 'druer',
    'grapefruit', 'guava', 'indian fig', 'jostaberry', 'kaki', 'kiwi', 'ladyfinger banana',
    'lemon', 'sitron', 'lime', 'lingonberry', 'tyttebær', 'loganberry', 'lychee',
    'mandarin', 'mango', 'melon', 'morello cherry', 'mulberry', 'nashi pear', 'nectarine',
    'orange', 'appelsin', 'papaya', 'passion fruit', 'pasjonsfrukt', 'paw paw', 'peach',
    'fersken', 'pear', 'pære', 'persimmon', 'pineapple', 'ananas', 'pitaya', 'plum',
    'plomme', 'pomegranate', 'granateple', 'prickly pear', 'prune', 'sviske', 'quince',
    'kvede', 'raisin', 'rosin', 'raspberry', 'bringebær', 'redcurrant', 'rips', 'rhubarb',
    'rabarbra', 'rose hip', 'nype', 'sallow thorn', 'sharon fruit', 'sour cherry',
    'spineless cactus', 'strawberry', 'jordbær', 'sugar banana', 'tamarillo', 'tuna',
    'watermelon', 'vannmelon', 'zwetschge'
  ],

  // Seeds
  'Seeds': [
    'chia', 'isabgol', 'psyllium', 'ispaghula', 'pumpkin seed', 'gresskarfrø', 'sesame',
    'sesam'
  ],

  // Mushrooms, fungi and algae
  'Mushrooms, fungi and algae': [
    'algae', 'alger', 'brown algae', 'cep', 'green algae', 'kelp', 'kombu', 'morel',
    'mushroom', 'sopp', 'nori', 'porcino', 'red algae', 'seaweed', 'tang', 'wakame',
    'white button mushroom', 'yeast', 'gjær'
  ],

  // Sweeteners
  'Sweeteners': [
    'agave', 'artificial sweetener', 'birch sugar', 'caramel', 'dextrose', 'sorbitol',
    'xylitol', 'extract of malt', 'fructose', 'fruktose', 'glucose', 'honey', 'honning',
    'inverted sugar', 'lactose', 'laktose', 'liquorice root', 'malt extract', 'maltose',
    'maple syrup', 'lønnesirup', 'palm sugar', 'stevia', 'sucrose', 'sugar', 'sukker'
  ],

  // Spices, seasoning, aroma  
  'Spices, seasoning, aroma': [
    'anise', 'anis', 'bay laurel', 'laurbær', 'black caraway', 'bouillon', 'kraftbuljong',
    'caraway', 'karve', 'cardamom', 'kardemomme', 'cilantro', 'koriander', 'cinnamon',
    'kanel', 'clove', 'nellik', 'coriander', 'cumin', 'karve', 'cummin', 'curry',
    'distilled white vinegar', 'hvit eddik', 'fennel flower', 'ginger', 'ingefær',
    'jeera', 'juniper berries', 'einerbær', 'laurel', 'meat extract', 'kjøttekstrakt',
    'meridian fennel', 'mustard', 'sennep', 'nigella sativa', 'nutmeg', 'muskatnøtt',
    'paprika', 'pepper', 'pepper', 'persian cumin', 'poppy seed', 'vallmofrø',
    'red wine vinegar', 'rødvinseddik', 'roman coriander', 'seasoning', 'krydder',
    'soy sauce', 'soyasaus', 'spirit vinegar', 'spriteddik', 'star anise', 'stjerneanis',
    'thyme', 'timian', 'turmeric', 'gurkemeie', 'vanilla', 'vanilje', 'vinegar', 'eddik',
    'white wine vinegar', 'hvitvinseddik', 'yeast extract', 'gjærekstrakt'
  ],

  // Beverages
  'Beverages': [
    // Water
    'healing spring water', 'mineral water', 'mineralvann', 'tap water', 'kranvann',
    
    // Alcoholic
    'alcohol', 'alkohol', 'alcoholic beverage', 'alkoholholdig drikke', 'beer', 'øl',
    'brandy', 'konjakk', 'champagne', 'ethanol', 'etanol', 'liquor', 'likør', 'rum',
    'schnapps', 'snaps', 'sparkling wine', 'musserende vin', 'spirit', 'sprit', 'wine', 'vin',
    
    // Tea, herbal infusions
    'chamomile tea', 'kamillette', 'green tea', 'grønn te', 'herbal tea', 'urtete',
    'lime blossom tea', 'mate tea', 'peppermint tea', 'peppermynte te', 'rooibos tea',
    'sage tea', 'salvie te', 'stinging nettle tea', 'brennesle te', 'tea', 'te',
    'verbena tea',
    
    // Juices
    'cranberry nectar', 'tranebærnektar', 'orange juice', 'appelsinjuice', 'tomato juice',
    'tomatjuice',
    
    // Coffee drinks
    'coca-cola', 'coffee', 'kaffe', 'coke', 'cola', 'energy drink', 'energidrikk',
    'espresso',
    
    // Milk surrogates
    'oat drink', 'havre drikk', 'oat milk', 'havremelk', 'rice milk', 'rismelk',
    'soy milk', 'soyamelk',
    
    // Soft drinks
    'chocolate drink', 'sjokoladedrikk', 'cocoa drink', 'kakaodrikk', 'elderflower cordial',
    'hot chocolate', 'varm sjokolade', 'lemonade', 'limonade', 'ovaltine', 'soda',
    'soft drink', 'brus'
  ],

  // Food additives - omfattende liste med E-numre
  'Food additives': [
    // Alle E-numre og kjemiske navn fra PDF
    'E100', 'E101', 'E102', 'E104', 'E110', 'E120', 'E122', 'E123', 'E124', 'E127',
    'E129', 'E131', 'E132', 'E133', 'E140', 'E141', 'E142', 'E150', 'E151', 'E153',
    'E154', 'E155', 'E160', 'E161', 'E162', 'E163', 'E170', 'E171', 'E172', 'E173',
    'E174', 'E175', 'E180', 'E200', 'E202', 'E203', 'E210', 'E211', 'E212', 'E213',
    'E214', 'E215', 'E218', 'E219', 'E220', 'E221', 'E222', 'E223', 'E224', 'E225',
    'E226', 'E227', 'E228', 'E231', 'E232', 'E234', 'E235', 'E239', 'E242', 'E249',
    'E250', 'E251', 'E252', 'E260', 'E261', 'E262', 'E263', 'E270', 'E280', 'E281',
    'E282', 'E283', 'E284', 'E285', 'E290', 'E296', 'E297', 'E300', 'E301', 'E302',
    'E304', 'E306', 'E307', 'E308', 'E309', 'E310', 'E311', 'E312', 'E315', 'E316',
    'E319', 'E320', 'E321', 'E322', 'E325', 'E326', 'E327', 'E330', 'E331', 'E332',
    'E333', 'E334', 'E335', 'E336', 'E340', 'E380', 'E400', 'E401', 'E402', 'E403',
    'E404', 'E405', 'E406', 'E407', 'E410', 'E412', 'E413', 'E414', 'E415', 'E416',
    'E420', 'E421', 'E422', 'E440', 'E441', 'E452', 'E460', 'E461', 'E462', 'E463',
    'E464', 'E465', 'E466', 'E500', 'E501', 'E503', 'E504', 'E507', 'E579', 'E620',
    'E621', 'E622', 'E623', 'E624', 'E625', 'E626', 'E650', 'E900', 'E901', 'E955',
    'E960', 'E967',
    
    // Kjemiske navn
    'acetic acid', 'eddiksyre', 'ascorbic acid', 'askorbinsyre', 'benzoic acid',
    'benzoesyre', 'citric acid', 'sitronsyre', 'sorbic acid', 'sorbinsyre',
    'tartrazine', 'carmine', 'cochineal', 'annatto', 'carotin', 'chlorophyll',
    'titanium dioxide', 'iron oxide', 'aluminium', 'silver', 'gold', 'calcium carbonate',
    'sodium benzoate', 'potassium sorbate', 'sulfur dioxide', 'nitrite', 'nitrate',
    'acetate', 'lactate', 'glutamate', 'phosphate', 'alginate', 'carrageenan',
    'guar gum', 'xanthan gum', 'lecithin', 'tocopherol', 'antioxidant', 'preservative',
    'stabilizer', 'emulsifier', 'thickener', 'colorant'
  ],

  // Vitamins, dietary minerals, trace elements, stimulants
  'Vitamins, dietary minerals, trace elements, stimulants': [
    'folic acid', 'folsyre', 'vitamin B9', 'iodine', 'jod', 'iodized salt', 'jodsalt',
    'potassium iodate', 'potassium iodide', 'theobromine', 'xantheose'
  ],

  // Preparations, mixtures  
  'Preparations, mixtures': [
    'liquorice', 'lakrits', 'marzipan', 'marsipan', 'marchpane', 'chocolate', 'sjokolade',
    'mustard', 'sennep', 'tofu'
  ]
};

/**
 * Finner riktig kategori for en matvare basert på navn
 */
function findCorrectCategory(foodNameEn, foodNameNo) {
  const searchText = (foodNameEn + ' ' + foodNameNo).toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_MAPPINGS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  // Fallback: Hvis ingen match, beholde "Ukjent kategori" for manuell gjennomgang
  return 'Ukjent kategori';
}

/**
 * Hovedfunksjon som oppdaterer kategoriene
 */
function fixCategories() {
  console.log('🔧 Starter retting av SIGHI matvarekategorier...');
  
  const jsonPath = path.join(__dirname, 'sighi-foods-data.json');
  const backupPath = path.join(__dirname, 'sighi-foods-data.backup.json');
  
  // Les eksisterende data
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Lag backup
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`💾 Backup laget: ${backupPath}`);
  
  let fixedCount = 0;
  const categoryStats = {};
  
  // Gå gjennom alle matvarer
  data.foods.forEach(food => {
    if (food.category === 'Ukjent kategori') {
      const correctCategory = findCorrectCategory(food.name_en, food.name_no);
      
      if (correctCategory !== 'Ukjent kategori') {
        food.category = correctCategory;
        fixedCount++;
      }
    }
    
    // Tell kategorier for statistikk
    categoryStats[food.category] = (categoryStats[food.category] || 0) + 1;
  });
  
  // Lagre oppdaterte data
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  
  console.log(`✅ Ferdig! ${fixedCount} matvarer fikk korrigerte kategorier.`);
  console.log('\n📊 Kategori-statistikk:');
  
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count} matvarer`);
    });
  
  const remaining = categoryStats['Ukjent kategori'] || 0;
  console.log(`\n⚠️  ${remaining} matvarer har fortsatt "Ukjent kategori" og trenger manuell gjennomgang.`);
}

// Kjør scriptet
fixCategories();

export { fixCategories };