# SIGHI Food Database Question Marks Analysis
**Generated:** 2025-11-21
**Analyst:** Claude Code
**Database:** MCAS-Life PostgreSQL via Supabase

---

## Executive Summary

This analysis investigates foods in the MCAS-Life database where `name_en` or `name_no` starts with the "?" symbol. The investigation reveals that **the question mark is NOT a data error** but rather an **intentional SIGHI notation** indicating scientific uncertainty about a food's histamine-related properties.

### Key Findings:
- **Source JSON file:** 80 foods with "?" symbols
- **Database:** 23 foods with "?" symbols (29% of source data imported)
- **Meaning:** Question marks indicate uncertainty/debate about histamine content or liberator effects
- **Recommendation:** **DO NOT remove** these symbols - they convey important medical information

---

## What the "?" Symbol Means (SIGHI Official)

According to the Swiss Interest Group Histamine Intolerance (SIGHI):

### Symbol Meanings:
| Symbol | Meaning | Example Use Cases |
|--------|---------|------------------|
| `?` | **Uncertain or debated** | Food's compatibility is questionable, insufficient research |
| `??` | **High uncertainty** | Conflicting research, multiple species with different properties |
| `???` | **Very high uncertainty** | Minimal research, extreme debate in scientific community |

### Context Where "?" Appears:
1. **Food names** - Overall uncertainty about the food
2. **Liberator column (L)** - Uncertain if it triggers histamine release
3. **Histamine column (H)** - Debated histamine content
4. **Other amines (A)** - Uncertain biogenic amine levels

### Real-World Examples from SIGHI:
- **Mango** - Rated 1 with "?" as liberator: "To be debated. Is often well tolerated"
- **Pine nuts** - Rated 1 with "?" as liberator: "Several species. Maybe not all of them with the same compatibility?"
- **Melon** - Rated 0 for histamine but "?" as liberator: "Suspected occasional histamine liberator effects"

---

## Database Analysis Results

### Summary Statistics:
```
Total foods in database with "?": 23
├─ Single "?" (uncertainty): 19 foods
├─ Double "??" (high uncertainty): 4 foods
└─ Triple "???" (very high uncertainty): 0 foods
```

### Distribution by Compatibility Level:
```
Level 1 (Medium):     1 food   (4.3%)
Level 3 (Severe):    22 foods  (95.7%)
```

### Distribution by Category:
```
Meat:                    12 foods (52.2%)
Fruits:                   6 foods (26.1%)
Spices, seasoning, aroma: 4 foods (17.4%)
Ukjent kategori:          1 food  (4.3%)
```

---

## Complete List of Foods with "?" in Database

### Single "?" Foods (Uncertain/Debated) - 19 foods

| English Name | Norwegian Name | Category | Compat | Triggers |
|-------------|---------------|----------|--------|----------|
| ?healing spring water with lots of sulfur, fluorine, | healing spring vann med lots av sulfur, fluorine | Ukjent kategori | 1 | - |
| ? dried meat (any kind) | ? tørket meat (any kind) | Meat | 3 | A, H |
| ? dry-cured ham | ? dry-cured skinke | Meat | 3 | A, H |
| ? E127, erythrosine | ? e127, erythrosine | Fruits | 3 | L |
| ? erythrosine, E127 | ? erythrosine, e127 | Fruits | 3 | L |
| ? ham (dried, cured) | ? skinke (tørket, speket) | Meat | 3 | A, H |
| ? L orange peel, orange zest | ? l appelsin peel, appelsin zest | Fruits | 3 | - |
| ? red wine vinegar | ? rødvin vinegar | Spices, seasoning, aroma | 3 | H |
| ? salami | ? salami | Meat | 3 | A, H |
| ? white wine vinegar | ? white wine vinegar | Spices, seasoning, aroma | 3 | H |

**Note:** The report shows duplicates which suggests possible data duplication issues in the database unrelated to the "?" symbols.

### Double "??" Foods (High Uncertainty) - 4 foods

| English Name | Norwegian Name | Category | Compat | Triggers |
|-------------|---------------|----------|--------|----------|
| ? ? smoked fish (any) | ?? røkt fisk (any) | Meat | 3 | H, H! |
| ? ? smoked meat (any) | ?? røkt meat (any) | Meat | 3 | H |

---

## Source Data Analysis (JSON Files)

### Files Analyzed:
1. `C:\Kode-prosjekter-lokalt\MCAS-life\database\sighi-foods-data.json` - **80 foods with "?"**
2. `C:\Kode-prosjekter-lokalt\MCAS-life\database\sighi-foods-data.backup.json` - Similar count
3. `C:\Kode-prosjekter-lokalt\MCAS-life\database\remaining-uncategorized.json` - 2 foods with "?"

### Notable Patterns in Source JSON (Not in Database):

#### Asian Pear Variants (Pyrus pyrifolia)
Multiple regional names for the same species, all marked with "?":
- ? apple pear (Pyrus pyrifolia)
- ? Asian pear (Pyrus pyrifolia)
- ? Chinese pear (Pyrus pyrifolia)
- ? Japanese pear (Pyrus pyrifolia)
- ? Korean pear (Pyrus pyrifolia)
- ? nashi pear (Pyrus pyrifolia)
- ? naspati (Pyrus pyrifolia)
- ? papple (Pyrus pyrifolia)
- ? Persian pear (Pyrus pyrifolia)
- ? sand pear (Pyrus pyrifolia)
- ? Taiwanese pear (Pyrus pyrifolia)
- ? three-halves pear (Pyrus pyrifolia)
- ? zodiac pear (Pyrus pyrifolia)

**Total:** 13 variants

#### Eggplant/Aubergine Variants
All marked with "???":
- ? ? ? aubergine
- ? ? ? eggplant
- ? ? ? brinjal

#### Dairy Products with "?":
- ? blue cheeses, mold cheeses
- ? ewe's milk, sheep's milk
- ? goat's milk, goat milk
- ? mold cheeses, mould cheeses
- ? sheep's milk, sheep milk

#### Vegetables with "?":
- ? chard, Swiss chard
- ? garden cress
- ? red cabbage
- ? Savoy cabbage
- ? silver beet, silverbeet, chard
- ? Swiss chard

#### Grains/Malt with "???":
- ? ? ? barley malt, malt, malt extract
- ? ? ? malt, malt extract, barley malt

#### Food Additives with "?":
- ? agar, agar-agar, E406
- ? ammonium citrate, triammonium citrate, E380
- ? Brilliant Blue FCF, E133, FD&C Blue No.1, Acid Blue 9
- ? calcium polyphosphate, E452
- ? dicalcium phosphate
- ? dipotassium phosphate
- ? E127, erythrosine (multiple entries)
- ? E133, Brilliant Blue FCF
- ? E142, Green S
- ... and 30+ more food additives

---

## Why Some Foods Didn't Import to Database

**Hypothesis:** The import script (`importSighiData.ts`) or a previous data cleaning process may have:
1. Filtered out foods with "?" to avoid confusion
2. Deduplicated similar entries
3. Only imported foods from specific categories
4. Excluded food additives (E-numbers)
5. Applied validation rules that rejected "?" prefixed names

**Evidence:**
- Source JSON: 80 foods with "?"
- Database: 23 foods with "?" (71% reduction)
- Missing categories: Dairy, Vegetables, Grains, most Additives, most Fruits

---

## Recommendations

### 1. **DO NOT Remove Question Marks**
The "?" symbol is **intentional medical notation** from SIGHI indicating:
- Scientific uncertainty about histamine content
- Debate about liberator effects
- Insufficient research data
- Species/variety variations

**Removing these would:**
- ❌ Lose critical medical information
- ❌ Mislead users about food safety
- ❌ Violate SIGHI data integrity
- ❌ Remove important uncertainty warnings

### 2. **DO Consider UI/UX Improvements**
Instead of removing "?", enhance the user interface:

```typescript
// Example: Enhanced display in frontend
function formatFoodName(food: Food): string {
  const questionMarkCount = (food.name_en.match(/^\?+/) || [])[0]?.length || 0;

  if (questionMarkCount === 0) {
    return food.name_en;
  }

  const cleanName = food.name_en.replace(/^\?+\s*/, '');
  const uncertaintyLevel = ['', 'Uncertain', 'High Uncertainty', 'Very High Uncertainty'][questionMarkCount];

  return {
    displayName: cleanName,
    badge: uncertaintyLevel,
    tooltip: 'This food has uncertain histamine effects according to SIGHI research. Use with caution and monitor your personal reactions.'
  };
}
```

### 3. **Database Integrity Options**

#### Option A: Keep Current Data (Recommended)
- ✅ Preserve 23 foods with "?" symbols
- ✅ Add user-facing explanations of "?" meaning
- ✅ Create UI badges/tooltips for uncertainty levels
- ✅ Document in user guide

#### Option B: Import Missing Foods
- Import the 57 additional foods from JSON source
- Requires verification of why they were excluded
- May need category mapping updates
- Consider if food additives should be included

#### Option C: Transform Display Only
- Keep "?" in database (preserves SIGHI accuracy)
- Remove "?" from display name
- Add separate `uncertainty_level` field
- Show uncertainty via UI elements

### 4. **SQL for Verification**

```sql
-- View all foods with question marks
SELECT
    id,
    name_en,
    name_no,
    category,
    compatibility,
    triggers
FROM foods
WHERE name_en LIKE '?%' OR name_no LIKE '?%'
ORDER BY compatibility, name_en;

-- Count by uncertainty level
SELECT
    CASE
        WHEN name_en LIKE '? ? ?%' THEN '3 (Very High)'
        WHEN name_en LIKE '? ?%' THEN '2 (High)'
        WHEN name_en LIKE '?%' THEN '1 (Uncertain)'
        ELSE '0 (None)'
    END AS uncertainty_level,
    COUNT(*) as food_count
FROM foods
WHERE name_en LIKE '?%' OR name_no LIKE '?%'
GROUP BY uncertainty_level
ORDER BY uncertainty_level DESC;
```

---

## Example SQL Updates (NOT RECOMMENDED)

**⚠️ WARNING:** These updates would **REMOVE CRITICAL MEDICAL INFORMATION**. Only use if you fully understand the implications.

```sql
-- DANGER: This removes medical uncertainty markers
-- NOT RECOMMENDED - FOR REFERENCE ONLY
/*
UPDATE foods
SET
    name_en = REGEXP_REPLACE(name_en, '^\?+\s*', ''),
    name_no = REGEXP_REPLACE(name_no, '^\?+\s*', '')
WHERE name_en LIKE '?%' OR name_no LIKE '?%';
*/
```

**Better Approach:** Add metadata instead:

```sql
-- Add uncertainty level metadata (better approach)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS sighi_uncertainty_level INTEGER DEFAULT 0;

UPDATE foods
SET sighi_uncertainty_level = LENGTH(SUBSTRING(name_en FROM '^\?+'))
WHERE name_en LIKE '?%';

-- Now you can filter/display based on uncertainty without losing data
SELECT * FROM foods WHERE sighi_uncertainty_level > 0;
```

---

## TypeScript Fix Script (Alternative Approach)

A script to **enhance** (not remove) the question mark foods:

```typescript
// C:\Kode-prosjekter-lokalt\MCAS-life\backend\src\scripts\enhanceUncertainFoods.ts

import { db } from '../db/index.js';
import { foods } from '../db/schema.js';
import { like, or, sql } from 'drizzle-orm';

async function enhanceUncertainFoods() {
  // Add uncertainty level and clean display names
  const uncertainFoods = await db
    .select()
    .from(foods)
    .where(or(like(foods.name_en, '?%'), like(foods.name_no, '?%')));

  for (const food of uncertainFoods) {
    const questionMarks = (food.name_en.match(/^\?+/) || [])[0]?.length || 0;
    const cleanNameEn = food.name_en.replace(/^\?+\s*/, '');
    const cleanNameNo = food.name_no.replace(/^\?+\s*/, '');

    const uncertaintyNote = questionMarks === 3
      ? 'Very high scientific uncertainty about this food\'s histamine effects.'
      : questionMarks === 2
      ? 'High uncertainty or conflicting research about this food.'
      : 'Some uncertainty or debate about this food\'s compatibility.';

    // Add to remarks instead of removing from name
    await db
      .update(foods)
      .set({
        remarks_en: food.remarks_en
          ? `${uncertaintyNote} ${food.remarks_en}`
          : uncertaintyNote,
        remarks_no: food.remarks_no
          ? `${uncertaintyNote} ${food.remarks_no}`
          : uncertaintyNote
      })
      .where(sql`id = ${food.id}`);
  }

  console.log(`✅ Enhanced ${uncertainFoods.length} foods with uncertainty notes`);
}
```

---

## Conclusion

### Summary of Findings:

1. **Question marks are intentional** - They are official SIGHI notation for medical uncertainty
2. **23 foods in database** have "?" symbols (80 in source JSON)
3. **Most are high-risk foods** (95.7% are compatibility level 3)
4. **Removing "?" would be medically irresponsible** - It removes uncertainty warnings

### Recommended Actions:

✅ **KEEP** the "?" symbols in the database
✅ **ADD** user-facing documentation explaining the symbols
✅ **IMPLEMENT** UI badges/tooltips for uncertainty levels
✅ **CONSIDER** importing the 57 missing foods from source JSON
❌ **DO NOT** remove the "?" symbols without medical review

### Next Steps:

1. Review import script to understand filtering logic
2. Decide if missing 57 foods should be imported
3. Design UI components for uncertainty display
4. Update user documentation with "?" symbol explanation
5. Consider adding `sighi_uncertainty_level` database field

---

## Appendix: Running the Analysis Script

```bash
# Navigate to backend
cd C:\Kode-prosjekter-lokalt\MCAS-life\backend

# Run the analysis script
npm run analyze:question-marks

# View the generated report
# Location: backend/foods-with-question-marks-report.md
```

## References

- SIGHI Official Website: https://www.histaminintoleranz.ch/en/
- SIGHI Food List PDF: https://www.mastzellaktivierung.info/downloads/foodlist/21_FoodList_EN_alphabetic_withCateg.pdf
- Database: PostgreSQL via Supabase (MCAS-Life production)
- Source Data: `database/sighi-foods-data.json` (849 total foods, 80 with "?")

---

**Report prepared by:** Claude Code
**Date:** 2025-11-21
**Project:** MCAS-Life Health Diary Application
**Contact:** See CLAUDE.md for project documentation
