-- ============================================================================
-- SIGHI Foods with Question Marks - SQL Analysis & Options
-- ============================================================================
-- Database: MCAS-Life PostgreSQL (Supabase)
-- Purpose: Analyze and optionally enhance foods with "?" symbols
-- Date: 2025-11-21
--
-- IMPORTANT: The "?" symbol is intentional SIGHI notation for uncertainty.
--            DO NOT remove without understanding medical implications.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: ANALYSIS QUERIES
-- ----------------------------------------------------------------------------

-- View all foods with question marks
SELECT
    id,
    name_en,
    name_no,
    category,
    compatibility,
    triggers,
    remarks_en
FROM foods
WHERE name_en LIKE '?%' OR name_no LIKE '?%'
ORDER BY compatibility, name_en;

-- Count foods by uncertainty level
SELECT
    CASE
        WHEN name_en LIKE '? ? ?%' THEN '3 (Very High Uncertainty)'
        WHEN name_en LIKE '? ?%' THEN '2 (High Uncertainty)'
        WHEN name_en LIKE '?%' THEN '1 (Uncertain/Debated)'
        ELSE '0 (None)'
    END AS uncertainty_level,
    COUNT(*) as food_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM foods WHERE name_en LIKE '?%'), 2) as percentage
FROM foods
WHERE name_en LIKE '?%' OR name_no LIKE '?%'
GROUP BY uncertainty_level
ORDER BY uncertainty_level DESC;

-- Distribution by category
SELECT
    category,
    COUNT(*) as count_with_question_marks,
    AVG(compatibility) as avg_compatibility
FROM foods
WHERE name_en LIKE '?%' OR name_no LIKE '?%'
GROUP BY category
ORDER BY count_with_question_marks DESC;

-- Distribution by compatibility level
SELECT
    compatibility,
    CASE compatibility
        WHEN 0 THEN 'Safe'
        WHEN 1 THEN 'Medium'
        WHEN 2 THEN 'Incompatible'
        WHEN 3 THEN 'Severe'
    END as level_name,
    COUNT(*) as food_count
FROM foods
WHERE name_en LIKE '?%' OR name_no LIKE '?%'
GROUP BY compatibility
ORDER BY compatibility;

-- Foods with double question marks (highest uncertainty in DB)
SELECT
    name_en,
    name_no,
    category,
    compatibility,
    triggers,
    remarks_en
FROM foods
WHERE name_en LIKE '? ?%'
ORDER BY name_en;

-- ----------------------------------------------------------------------------
-- SECTION 2: OPTION A - ADD METADATA COLUMN (RECOMMENDED)
-- ----------------------------------------------------------------------------
-- This approach preserves the original data while adding searchable metadata

-- Add uncertainty level column (if not exists)
ALTER TABLE foods
ADD COLUMN IF NOT EXISTS sighi_uncertainty_level INTEGER DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN foods.sighi_uncertainty_level IS
'SIGHI uncertainty level: 0=none, 1=uncertain, 2=high uncertainty, 3=very high uncertainty. Extracted from question marks in food names.';

-- Calculate and populate uncertainty levels
UPDATE foods
SET sighi_uncertainty_level = (
    SELECT LENGTH(SUBSTRING(name_en FROM '^\?+ '))
    WHERE name_en LIKE '?%'
)
WHERE name_en LIKE '?%';

-- Verify the update
SELECT
    sighi_uncertainty_level,
    COUNT(*) as food_count,
    STRING_AGG(name_en, ', ' ORDER BY name_en LIMIT 5) as example_foods
FROM foods
WHERE sighi_uncertainty_level > 0
GROUP BY sighi_uncertainty_level
ORDER BY sighi_uncertainty_level DESC;

-- ----------------------------------------------------------------------------
-- SECTION 3: OPTION B - ADD CLEAN DISPLAY NAMES (RECOMMENDED)
-- ----------------------------------------------------------------------------
-- Keeps original names intact, adds cleaned versions for display

-- Add display name columns (if not exists)
ALTER TABLE foods
ADD COLUMN IF NOT EXISTS display_name_en TEXT,
ADD COLUMN IF NOT EXISTS display_name_no TEXT;

-- Populate display names (remove leading question marks)
UPDATE foods
SET
    display_name_en = REGEXP_REPLACE(name_en, '^\?+\s*', ''),
    display_name_no = REGEXP_REPLACE(name_no, '^\?+\s*', '')
WHERE name_en LIKE '?%' OR name_no LIKE '?%';

-- Set display names same as regular names for foods without question marks
UPDATE foods
SET
    display_name_en = name_en,
    display_name_no = name_no
WHERE display_name_en IS NULL;

-- Verify display names
SELECT
    name_en as original_name,
    display_name_en as clean_display_name,
    sighi_uncertainty_level as uncertainty,
    category,
    compatibility
FROM foods
WHERE name_en LIKE '?%'
ORDER BY sighi_uncertainty_level DESC, name_en
LIMIT 20;

-- ----------------------------------------------------------------------------
-- SECTION 4: OPTION C - ENHANCE REMARKS WITH UNCERTAINTY NOTES (RECOMMENDED)
-- ----------------------------------------------------------------------------
-- Adds explanatory text to remarks field

-- Add uncertainty explanations to remarks
UPDATE foods
SET remarks_en = CASE
    WHEN sighi_uncertainty_level = 3 THEN
        '⚠️ Very High Uncertainty: SIGHI indicates minimal scientific data about this food''s histamine effects. ' || COALESCE(remarks_en, '')
    WHEN sighi_uncertainty_level = 2 THEN
        '⚠️ High Uncertainty: Conflicting research or species variations affect this food''s compatibility. ' || COALESCE(remarks_en, '')
    WHEN sighi_uncertainty_level = 1 THEN
        '⚠️ Uncertain: Some debate or insufficient research about this food''s histamine effects. ' || COALESCE(remarks_en, '')
    ELSE remarks_en
END,
remarks_no = CASE
    WHEN sighi_uncertainty_level = 3 THEN
        '⚠️ Svært høy usikkerhet: SIGHI indikerer minimale vitenskapelige data om denne matens histamineffekter. ' || COALESCE(remarks_no, '')
    WHEN sighi_uncertainty_level = 2 THEN
        '⚠️ Høy usikkerhet: Motstridende forskning eller artsvariasjoner påvirker denne matens kompatibilitet. ' || COALESCE(remarks_no, '')
    WHEN sighi_uncertainty_level = 1 THEN
        '⚠️ Usikker: Noe debatt eller utilstrekkelig forskning om denne matens histamineffekter. ' || COALESCE(remarks_no, '')
    ELSE remarks_no
END
WHERE sighi_uncertainty_level > 0;

-- Verify enhanced remarks
SELECT
    name_en,
    sighi_uncertainty_level,
    remarks_en
FROM foods
WHERE sighi_uncertainty_level > 0
ORDER BY sighi_uncertainty_level DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- SECTION 5: OPTION D - DIRECT NAME UPDATE (NOT RECOMMENDED)
-- ----------------------------------------------------------------------------
-- ⚠️ WARNING: This permanently removes medical uncertainty markers
-- Only use if you have explicit medical approval to do so

/*
-- DANGER: Removes question marks from names
-- This loses critical SIGHI medical information
-- Uncomment only if you understand the implications

UPDATE foods
SET
    name_en = REGEXP_REPLACE(name_en, '^\?+\s*', ''),
    name_no = REGEXP_REPLACE(name_no, '^\?+\s*', '')
WHERE name_en LIKE '?%' OR name_no LIKE '?%';

-- Verify the changes
SELECT id, name_en, name_no, category, compatibility
FROM foods
WHERE id IN (
    SELECT id FROM foods
    WHERE name_en NOT LIKE '?%' AND name_no NOT LIKE '?%'
    ORDER BY updated_at DESC
    LIMIT 30
);
*/

-- ----------------------------------------------------------------------------
-- SECTION 6: ROLLBACK SCRIPTS (if needed)
-- ----------------------------------------------------------------------------

-- Remove added columns (rollback Option A & B)
/*
ALTER TABLE foods DROP COLUMN IF EXISTS sighi_uncertainty_level;
ALTER TABLE foods DROP COLUMN IF EXISTS display_name_en;
ALTER TABLE foods DROP COLUMN IF EXISTS display_name_no;
*/

-- Remove uncertainty notes from remarks (rollback Option C)
/*
UPDATE foods
SET
    remarks_en = REGEXP_REPLACE(remarks_en, '⚠️ (Very High Uncertainty|High Uncertainty|Uncertain):.*?(?=\s{2,}|$)', ''),
    remarks_no = REGEXP_REPLACE(remarks_no, '⚠️ (Svært høy usikkerhet|Høy usikkerhet|Usikker):.*?(?=\s{2,}|$)', '')
WHERE remarks_en LIKE '%⚠️%' OR remarks_no LIKE '%⚠️%';
*/

-- ----------------------------------------------------------------------------
-- SECTION 7: USEFUL QUERIES FOR APPLICATION
-- ----------------------------------------------------------------------------

-- Get all foods with uncertainty for API response
SELECT
    id,
    name_en,
    name_no,
    display_name_en,
    display_name_no,
    category,
    compatibility,
    sighi_uncertainty_level,
    CASE sighi_uncertainty_level
        WHEN 0 THEN NULL
        WHEN 1 THEN 'uncertain'
        WHEN 2 THEN 'high_uncertainty'
        WHEN 3 THEN 'very_high_uncertainty'
    END as uncertainty_badge,
    triggers,
    remarks_en,
    remarks_no
FROM foods
WHERE sighi_uncertainty_level > 0
ORDER BY compatibility DESC, sighi_uncertainty_level DESC;

-- Search foods including display names
CREATE INDEX IF NOT EXISTS idx_foods_display_names ON foods (display_name_en, display_name_no);

-- Full-text search including both original and display names
SELECT
    id,
    COALESCE(display_name_en, name_en) as name,
    category,
    compatibility,
    sighi_uncertainty_level
FROM foods
WHERE
    display_name_en ILIKE '%pear%'
    OR name_en ILIKE '%pear%'
ORDER BY sighi_uncertainty_level, compatibility;

-- ----------------------------------------------------------------------------
-- SECTION 8: VALIDATION QUERIES
-- ----------------------------------------------------------------------------

-- Check for duplicate foods (with and without question marks)
SELECT
    REGEXP_REPLACE(name_en, '^\?+\s*', '') as clean_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(name_en, ' | ') as all_variants
FROM foods
GROUP BY clean_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Find foods that might need the same uncertainty level
SELECT
    f1.name_en as name_with_question,
    f2.name_en as name_without_question,
    f1.compatibility as compat_with_q,
    f2.compatibility as compat_without_q,
    f1.triggers as triggers_with_q,
    f2.triggers as triggers_without_q
FROM foods f1
JOIN foods f2 ON
    REGEXP_REPLACE(f1.name_en, '^\?+\s*', '') = f2.name_en
    AND f1.name_en LIKE '?%'
    AND f2.name_en NOT LIKE '?%'
ORDER BY f1.name_en;

-- ----------------------------------------------------------------------------
-- END OF SQL SCRIPT
-- ============================================================================
-- RECOMMENDATION: Use Options A + B + C together for best results
--
-- This provides:
--   1. Metadata for filtering/searching (uncertainty_level)
--   2. Clean names for display (display_name_*)
--   3. User-facing explanations (enhanced remarks)
--   4. Preserved original SIGHI data (name_en/name_no unchanged)
-- ============================================================================
