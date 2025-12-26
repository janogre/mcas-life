/**
 * OpenAI Analytics Service - AI-Powered Symptom Correlation
 *
 * Uses OpenAI GPT-4 API for advanced pattern recognition and trigger analysis.
 * Provides more nuanced, context-aware analysis than rule-based algorithms.
 */

import type { TriggerAnalysisResult, FoodTrigger, TriggerCorrelationRequest } from './analyticsService.js';
import { db } from '../../db/index.js';
import { symptomEntries, mealEntries, mealFoods, foods } from '../../db/schema.js';
import { eq, gte, lte, and } from 'drizzle-orm';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

class OpenAIAnalyticsService {

  /**
   * AI-powered trigger correlation analysis using OpenAI GPT-4
   */
  async analyzeTriggerCorrelation(request: TriggerCorrelationRequest): Promise<TriggerAnalysisResult> {
    const { user_id, symptom_entry_id, analysis_window_hours = 72 } = request;

    console.log(`🤖 Starting OpenAI trigger correlation analysis for user ${user_id}, symptom ${symptom_entry_id}`);

    // Get the symptom entry details
    const [symptomEntry] = await db
      .select()
      .from(symptomEntries)
      .where(eq(symptomEntries.id, symptom_entry_id))
      .limit(1);

    if (!symptomEntry) {
      throw new Error(`Symptom entry ${symptom_entry_id} not found`);
    }

    // Define analysis window (72 hours before symptom onset)
    const symptomTime = new Date(symptomEntry.started_at);
    const windowStart = new Date(symptomTime.getTime() - (analysis_window_hours * 60 * 60 * 1000));
    const windowEnd = symptomTime;

    console.log(`📊 Analysis window: ${windowStart.toISOString()} to ${windowEnd.toISOString()}`);

    // Fetch all meals within the analysis window
    const mealsInWindow = await db
      .select()
      .from(mealEntries)
      .where(
        and(
          eq(mealEntries.user_id, user_id),
          gte(mealEntries.consumed_at, windowStart),
          lte(mealEntries.consumed_at, windowEnd)
        )
      )
      .orderBy(mealEntries.consumed_at);

    console.log(`🍽️ Found ${mealsInWindow.length} meals in analysis window`);

    if (mealsInWindow.length === 0) {
      // Return empty analysis if no meals found
      return this.createEmptyAnalysis(user_id, symptom_entry_id, windowStart, windowEnd);
    }

    // Fetch food details for all meals
    const mealFoodDetails = await Promise.all(
      mealsInWindow.map(async (meal) => {
        const foodItems = await db
          .select({
            food: foods,
            mealFood: mealFoods,
          })
          .from(mealFoods)
          .innerJoin(foods, eq(mealFoods.food_id, foods.id))
          .where(eq(mealFoods.meal_id, meal.id));

        return {
          meal,
          foods: foodItems,
        };
      })
    );

    // Prepare data for OpenAI
    const analysisContext = this.prepareAnalysisContext(
      symptomEntry,
      mealFoodDetails,
      windowStart,
      windowEnd
    );

    // Call OpenAI for analysis
    const aiAnalysis = await this.requestOpenAIAnalysis(analysisContext);

    // Parse and structure the AI response
    const structuredResult = this.parseAIResponse(
      aiAnalysis,
      user_id,
      symptom_entry_id,
      mealFoodDetails,
      windowStart,
      windowEnd
    );

    console.log(`✅ OpenAI analysis complete with ${structuredResult.likely_food_triggers.length} potential triggers identified`);

    return structuredResult;
  }

  /**
   * Prepare context for OpenAI analysis
   */
  private prepareAnalysisContext(
    symptom: any,
    mealFoodDetails: any[],
    windowStart: Date,
    windowEnd: Date
  ): string {
    const symptomDescription = `
Symptom Information:
- Type: ${symptom.symptom_type}
- Severity: ${symptom.severity}/10
- Started: ${new Date(symptom.started_at).toLocaleString('no-NO')}
- Location: ${symptom.body_location || 'Not specified'}
- Description: ${symptom.notes || 'None provided'}
`;

    const mealsDescription = mealFoodDetails.map((mealDetail, index) => {
      const mealTime = new Date(mealDetail.meal.consumed_at);
      const hoursBeforeSymptom = ((new Date(symptom.started_at).getTime() - mealTime.getTime()) / (1000 * 60 * 60)).toFixed(1);

      const foodList = mealDetail.foods
        .map((f: any) => `  - ${f.food.name_no} (SIGHI level: ${f.food.compatibility}, Triggers: ${f.food.triggers.join(', ')})`)
        .join('\n');

      return `
Meal ${index + 1}:
- Time: ${mealTime.toLocaleString('no-NO')} (${hoursBeforeSymptom} hours before symptom)
- Type: ${mealDetail.meal.meal_type}
- Foods consumed:
${foodList}
`;
    }).join('\n');

    return `
You are an expert MCAS (Mast Cell Activation Syndrome) analyst. Analyze the following patient data to identify potential food triggers for their symptom.

${symptomDescription}

${mealsDescription}

Analysis Window: ${windowStart.toLocaleString('no-NO')} to ${windowEnd.toLocaleString('no-NO')}

Please provide:
1. A list of the most likely food triggers (with correlation scores 0-1)
2. Explanation of why each food might be a trigger
3. Time correlation analysis (how long after eating the symptom appeared)
4. Confidence level in your analysis (low/medium/high)
5. Recommendations for foods to avoid or retry

Use MCAS-specific knowledge including:
- Histamine levels in foods
- Histamine liberators
- SIGHI compatibility scale (0=safe, 1=medium, 2=incompatible, 3=severe)
- Typical trigger patterns for MCAS patients
- Individual sensitivity variations

Respond in JSON format with the following structure:
{
  "likely_triggers": [
    {
      "food_name_no": "string",
      "food_name_en": "string",
      "correlation_score": 0.0-1.0,
      "explanation": "string",
      "time_to_symptom_hours": number,
      "confidence": "low" | "medium" | "high"
    }
  ],
  "analysis_confidence": 0.0-1.0,
  "recommendations": {
    "foods_to_avoid": ["string"],
    "foods_to_retry": ["string"],
    "suggestions": ["string"]
  }
}
`;
  }

  /**
   * Request analysis from OpenAI using direct API call
   */
  private async requestOpenAIAnalysis(context: string): Promise<string> {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured. Please add it to .env file.');
    }

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert medical AI specializing in MCAS (Mast Cell Activation Syndrome) and food trigger analysis. Provide detailed, evidence-based analysis.',
            },
            {
              role: 'user',
              content: context,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3, // Lower temperature for more consistent, factual responses
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ OpenAI API error:', response.status, errorData);
        throw new Error(`OpenAI API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '{}';
    } catch (error) {
      console.error('❌ OpenAI API error:', error);
      throw new Error('Failed to get AI analysis from OpenAI');
    }
  }

  /**
   * Parse AI response and convert to TriggerAnalysisResult
   */
  private parseAIResponse(
    aiResponse: string,
    userId: number,
    symptomEntryId: number,
    mealFoodDetails: any[],
    windowStart: Date,
    windowEnd: Date
  ): TriggerAnalysisResult {
    const parsed = JSON.parse(aiResponse);

    // Convert AI triggers to FoodTrigger format
    const foodTriggers: FoodTrigger[] = (parsed.likely_triggers || []).map((trigger: any) => {
      // Find the actual food ID from our data
      const matchingFood = mealFoodDetails
        .flatMap(m => m.foods)
        .find((f: any) => f.food.name_no === trigger.food_name_no || f.food.name_en === trigger.food_name_en);

      return {
        food_id: matchingFood?.food.id || 0,
        food_name_no: trigger.food_name_no,
        food_name_en: trigger.food_name_en,
        compatibility: matchingFood?.food.compatibility || '0',
        correlation_score: trigger.correlation_score,
        time_consumed: new Date(),
        time_to_symptom_hours: trigger.time_to_symptom_hours,
        confidence_level: trigger.confidence,
      };
    });

    return {
      analysis_id: 0, // Will be set when saved to database
      user_id: userId,
      symptom_entry_id: symptomEntryId,
      analysis_confidence: parsed.analysis_confidence || 0.5,
      data_quality_score: 0.8, // AI analysis generally has good data quality
      likely_food_triggers: foodTriggers,
      trigger_timeline: [], // Could be enhanced
      similar_past_episodes: [],
      symptom_pattern: {
        symptom_type: '',
        frequency_last_30_days: 0,
        avg_severity: 0,
        common_triggers: [],
        time_of_day_pattern: {},
      },
      improvement_suggestions: parsed.recommendations?.suggestions || [],
      foods_to_avoid: parsed.recommendations?.foods_to_avoid || [],
      foods_to_retry: parsed.recommendations?.foods_to_retry || [],
      analysis_window_start: windowStart,
      analysis_window_end: windowEnd,
      total_meals_analyzed: mealFoodDetails.length,
      created_at: new Date(),
    };
  }

  /**
   * Create empty analysis when no data available
   */
  private createEmptyAnalysis(
    userId: number,
    symptomEntryId: number,
    windowStart: Date,
    windowEnd: Date
  ): TriggerAnalysisResult {
    return {
      analysis_id: 0,
      user_id: userId,
      symptom_entry_id: symptomEntryId,
      analysis_confidence: 0,
      data_quality_score: 0,
      likely_food_triggers: [],
      trigger_timeline: [],
      similar_past_episodes: [],
      symptom_pattern: {
        symptom_type: '',
        frequency_last_30_days: 0,
        avg_severity: 0,
        common_triggers: [],
        time_of_day_pattern: {},
      },
      improvement_suggestions: ['Registrer flere måltider for å få bedre analyse'],
      foods_to_avoid: [],
      foods_to_retry: [],
      analysis_window_start: windowStart,
      analysis_window_end: windowEnd,
      total_meals_analyzed: 0,
      created_at: new Date(),
    };
  }
}

export const openaiAnalyticsService = new OpenAIAnalyticsService();
