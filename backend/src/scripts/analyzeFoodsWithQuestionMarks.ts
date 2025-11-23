/**
 * Analyze Foods with Question Marks Script
 *
 * This script identifies all foods in the database where name_en or name_no starts with "?"
 * and provides a comprehensive analysis and correction recommendations.
 *
 * SIGHI "?" Symbol Meaning:
 * The question mark (?) in the SIGHI food list indicates UNCERTAINTY or DEBATE about:
 * - The food's histamine content
 * - Whether it acts as a histamine liberator
 * - Its compatibility rating
 * - Other properties like biogenic amine content
 *
 * The "?" does NOT mean the data is corrupted - it's an intentional marker from SIGHI
 * indicating incomplete scientific consensus about that food's effects on histamine intolerance.
 */

import { db } from '../db/index.js';
import { foods } from '../db/schema.js';
import { like, or, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 Analyzing Foods with Question Marks');
console.log('=====================================\n');

interface QuestionMarkFood {
  id: number;
  name_en: string;
  name_no: string;
  category: string;
  compatibility: number;
  triggers: string[] | null;
  remarks_en: string;
  remarks_no: string;
  questionMarkCount: number;
}

async function analyzeFoodsWithQuestionMarks() {
  try {
    console.log('📊 Querying database for foods with "?" in names...\n');

    // Query all foods where name_en or name_no starts with "?"
    const questionMarkFoods = await db
      .select()
      .from(foods)
      .where(
        or(
          like(foods.name_en, '?%'),
          like(foods.name_no, '?%')
        )
      )
      .orderBy(foods.compatibility, foods.name_en);

    console.log(`Found ${questionMarkFoods.length} foods with question marks\n`);

    // Categorize by question mark count
    const categorized = {
      single: [] as typeof questionMarkFoods,
      double: [] as typeof questionMarkFoods,
      triple: [] as typeof questionMarkFoods,
      other: [] as typeof questionMarkFoods,
    };

    questionMarkFoods.forEach(food => {
      const enMatch = food.name_en.match(/^\?+/);
      const noMatch = food.name_no.match(/^\?+/);
      const questionMarks = Math.max(
        enMatch ? enMatch[0].length : 0,
        noMatch ? noMatch[0].length : 0
      );

      if (questionMarks === 1) categorized.single.push(food);
      else if (questionMarks === 2) categorized.double.push(food);
      else if (questionMarks === 3) categorized.triple.push(food);
      else categorized.other.push(food);
    });

    // Generate report
    const report: string[] = [];
    report.push('# SIGHI Foods with Question Marks - Analysis Report');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    report.push('## Summary\n');
    report.push(`Total foods with "?": ${questionMarkFoods.length}`);
    report.push(`- Single "?" (uncertainty): ${categorized.single.length}`);
    report.push(`- Double "??" (high uncertainty): ${categorized.double.length}`);
    report.push(`- Triple "???" (very high uncertainty): ${categorized.triple.length}`);
    report.push(`- Other patterns: ${categorized.other.length}\n`);

    report.push('## IMPORTANT: Understanding the "?" Symbol\n');
    report.push('The question mark (?) is NOT an error or data corruption. According to SIGHI:');
    report.push('- "?" = Uncertain/debated compatibility or properties');
    report.push('- "??" = Higher uncertainty or conflicting research');
    report.push('- "???" = Very high uncertainty or insufficient data\n');
    report.push('**Recommendation:** DO NOT remove these question marks without consulting');
    report.push('the official SIGHI documentation, as they convey important information');
    report.push('about scientific uncertainty to users.\n');

    report.push('## Distribution by Compatibility Level\n');
    const byCompatibility: Record<number, number> = {};
    questionMarkFoods.forEach(food => {
      byCompatibility[food.compatibility] = (byCompatibility[food.compatibility] || 0) + 1;
    });

    Object.entries(byCompatibility).forEach(([level, count]) => {
      const label = ['Safe', 'Medium', 'Incompatible', 'Severe'][parseInt(level)];
      report.push(`- Level ${level} (${label}): ${count} foods`);
    });
    report.push('');

    report.push('## Distribution by Category\n');
    const byCategory: Record<string, number> = {};
    questionMarkFoods.forEach(food => {
      byCategory[food.category] = (byCategory[food.category] || 0) + 1;
    });

    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        report.push(`- ${category}: ${count} foods`);
      });
    report.push('');

    // Detailed listings by question mark count
    report.push('## Single "?" Foods (Uncertain/Debated)\n');
    report.push('| English Name | Norwegian Name | Category | Compat | Triggers |');
    report.push('|-------------|---------------|----------|--------|----------|');
    categorized.single.slice(0, 50).forEach(food => {
      const triggers = Array.isArray(food.triggers) ? food.triggers.join(', ') : 'None';
      report.push(`| ${food.name_en} | ${food.name_no} | ${food.category} | ${food.compatibility} | ${triggers} |`);
    });
    if (categorized.single.length > 50) {
      report.push(`\n... and ${categorized.single.length - 50} more\n`);
    }
    report.push('');

    report.push('## Double "??" Foods (High Uncertainty)\n');
    report.push('| English Name | Norwegian Name | Category | Compat | Triggers |');
    report.push('|-------------|---------------|----------|--------|----------|');
    categorized.double.forEach(food => {
      const triggers = Array.isArray(food.triggers) ? food.triggers.join(', ') : 'None';
      report.push(`| ${food.name_en} | ${food.name_no} | ${food.category} | ${food.compatibility} | ${triggers} |`);
    });
    report.push('');

    report.push('## Triple "???" Foods (Very High Uncertainty)\n');
    report.push('| English Name | Norwegian Name | Category | Compat | Triggers |');
    report.push('|-------------|---------------|----------|--------|----------|');
    categorized.triple.forEach(food => {
      const triggers = Array.isArray(food.triggers) ? food.triggers.join(', ') : 'None';
      report.push(`| ${food.name_en} | ${food.name_no} | ${food.category} | ${food.compatibility} | ${triggers} |`);
    });
    report.push('');

    // Analysis of patterns
    report.push('## Pattern Analysis\n');

    // Foods that might be duplicates or alternatives
    const pears = questionMarkFoods.filter(f =>
      f.name_en.toLowerCase().includes('pear') ||
      f.name_en.toLowerCase().includes('pyrus pyrifolia')
    );
    report.push(`### Asian Pear Variants (Pyrus pyrifolia)`);
    report.push(`Found ${pears.length} different names for Asian pear variants:`);
    pears.forEach(p => {
      report.push(`- ${p.name_en} (compat: ${p.compatibility})`);
    });
    report.push('**Note:** These are regional names for the same species marked uncertain.\n');

    const eggplants = questionMarkFoods.filter(f =>
      f.name_en.toLowerCase().includes('aubergine') ||
      f.name_en.toLowerCase().includes('eggplant') ||
      f.name_en.toLowerCase().includes('brinjal')
    );
    report.push(`### Eggplant/Aubergine Variants`);
    report.push(`Found ${eggplants.length} names for eggplant (all marked with ???):`);
    eggplants.forEach(p => {
      report.push(`- ${p.name_en} (compat: ${p.compatibility})`);
    });
    report.push('**Note:** Triple "???" indicates very high uncertainty about nightshade effects.\n');

    // Write report to file
    const reportPath = path.join(process.cwd(), 'foods-with-question-marks-report.md');
    fs.writeFileSync(reportPath, report.join('\n'), 'utf-8');

    console.log('✅ Report generated successfully!');
    console.log(`📄 Report saved to: ${reportPath}\n`);

    // Console summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total foods with "?": ${questionMarkFoods.length}`);
    console.log(`Single "?": ${categorized.single.length}`);
    console.log(`Double "??": ${categorized.double.length}`);
    console.log(`Triple "???": ${categorized.triple.length}\n`);

    console.log('⚠️  IMPORTANT: The "?" symbol is INTENTIONAL from SIGHI');
    console.log('   It indicates scientific uncertainty about the food\'s effects.');
    console.log('   DO NOT automatically remove these markers.\n');

    // SQL to view all question mark foods
    console.log('📋 SQL Query to view all foods with question marks:');
    console.log('');
    console.log("SELECT id, name_en, name_no, category, compatibility, triggers");
    console.log("FROM foods");
    console.log("WHERE name_en LIKE '?%' OR name_no LIKE '?%'");
    console.log("ORDER BY compatibility, name_en;");
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error analyzing foods:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeFoodsWithQuestionMarks();
