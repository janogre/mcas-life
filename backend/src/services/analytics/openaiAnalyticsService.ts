/**
 * OpenAI Analytics Service - AI-Powered Symptom Correlation
 *
 * Uses OpenAI GPT-4 API for advanced pattern recognition and trigger analysis.
 * Provides more nuanced, context-aware analysis than rule-based algorithms.
 */

import type { TriggerAnalysisResult, FoodTrigger, TriggerCorrelationRequest } from './analyticsService.js';
import { db } from '../../db/index.js';
import { symptomEntries, mealEntries, mealFoods, foods, supplementEntries, activityEntries, healthMetrics, userMedications, medicationsCatalog, illnessEntries } from '../../db/schema.js';
import { eq, gte, lte, and } from 'drizzle-orm';
import { airthingsIntegrationService } from '../symptoms/airthingsIntegrationService.js';

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
          gte(mealEntries.meal_time, windowStart),
          lte(mealEntries.meal_time, windowEnd)
        )
      )
      .orderBy(mealEntries.meal_time);

    console.log(`🍽️ Found ${mealsInWindow.length} meals in analysis window`);

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

    // Fetch supplements/medications within analysis window
    const supplements = await db
      .select()
      .from(supplementEntries)
      .where(
        and(
          eq(supplementEntries.user_id, user_id),
          gte(supplementEntries.taken_at, windowStart),
          lte(supplementEntries.taken_at, windowEnd)
        )
      )
      .orderBy(supplementEntries.taken_at);

    console.log(`💊 Found ${supplements.length} supplement/medication entries in analysis window`);

    // Fetch user medications within analysis window
    const medications = await db
      .select({
        medication: userMedications,
        catalog: medicationsCatalog
      })
      .from(userMedications)
      .leftJoin(medicationsCatalog, eq(userMedications.catalog_medication_id, medicationsCatalog.id))
      .where(
        and(
          eq(userMedications.user_id, user_id),
          gte(userMedications.time_taken, windowStart),
          lte(userMedications.time_taken, windowEnd)
        )
      )
      .orderBy(userMedications.time_taken);

    console.log(`💊 Found ${medications.length} user medication entries in analysis window`);

    // Fetch illness entries within analysis window
    const illnesses = await db
      .select()
      .from(illnessEntries)
      .where(
        and(
          eq(illnessEntries.user_id, user_id),
          gte(illnessEntries.first_symptoms_at, windowStart),
          lte(illnessEntries.first_symptoms_at, windowEnd)
        )
      )
      .orderBy(illnessEntries.first_symptoms_at);

    console.log(`🤒 Found ${illnesses.length} illness entries in analysis window`);

    // Fetch activities within analysis window
    const activities = await db
      .select()
      .from(activityEntries)
      .where(
        and(
          eq(activityEntries.user_id, user_id),
          gte(activityEntries.time_started, windowStart),
          lte(activityEntries.time_started, windowEnd)
        )
      )
      .orderBy(activityEntries.time_started);

    console.log(`🏃 Found ${activities.length} activity entries in analysis window`);

    // Fetch health metrics (sleep, stress) within analysis window
    const healthMetricsData = await db
      .select()
      .from(healthMetrics)
      .where(
        and(
          eq(healthMetrics.user_id, user_id),
          gte(healthMetrics.created_at, windowStart),
          lte(healthMetrics.created_at, windowEnd)
        )
      )
      .orderBy(healthMetrics.created_at);

    console.log(`📊 Found ${healthMetricsData.length} health metric entries in analysis window`);

    // Extract air quality data from symptom entry
    let airQualityData: any[] = [];
    if (symptomEntry.indoor_air_quality?.rooms) {
      console.log('🏠 Extracting air quality data from room exposures...');
      const roomExposures = symptomEntry.indoor_air_quality.rooms.map((room: any) => ({
        room_id: room.roomId || room.room_id,
        room_name: room.roomName || room.room_name,
        time_spent_minutes: room.timeSpentMinutes || room.time_spent_minutes,
        air_quality_snapshot: room.airQualitySnapshot || room.air_quality_snapshot
      }));

      for (const exposure of roomExposures) {
        if (exposure.air_quality_snapshot) {
          airQualityData.push({
            room_name: exposure.room_name,
            time_spent_minutes: exposure.time_spent_minutes,
            metrics: exposure.air_quality_snapshot
          });
        }
      }
    }

    console.log(`🌡️ Found ${airQualityData.length} room air quality snapshots`);

    // Extract weather data if available
    const weatherData = symptomEntry.weather_conditions || null;

    // Prepare comprehensive data for OpenAI
    const analysisContext = this.prepareAnalysisContext(
      symptomEntry,
      mealFoodDetails,
      supplements,
      medications,
      illnesses,
      activities,
      healthMetricsData,
      airQualityData,
      weatherData,
      windowStart,
      windowEnd
    );

    // Log the full prompt being sent to OpenAI
    console.log('📝 ===== OPENAI PROMPT START =====');
    console.log(analysisContext);
    console.log('📝 ===== OPENAI PROMPT END =====');

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
    supplements: any[],
    medications: any[],
    illnesses: any[],
    activities: any[],
    healthMetricsData: any[],
    airQualityData: any[],
    weatherData: any,
    windowStart: Date,
    windowEnd: Date
  ): string {
    const symptomDescription = `
Symptom Information:
- Category: ${symptom.category || 'Not specified'} (${symptom.category === 'skin' ? 'Hud' : symptom.category === 'digestive' ? 'Fordøyelse' : symptom.category === 'respiratory' ? 'Luftveier' : symptom.category === 'cardiovascular' ? 'Hjerte/kar' : symptom.category === 'neurological' ? 'Nevrologisk' : symptom.category === 'musculoskeletal' ? 'Muskel/skjelett' : symptom.category === 'genitourinary' ? 'Urin/kjønn' : symptom.category === 'systemic' ? 'Systemisk' : symptom.category})
- Type: ${symptom.type || 'Not specified'}
- Severity: ${symptom.severity}/10
- Started: ${new Date(symptom.started_at).toLocaleString('no-NO')}
- Body regions: ${symptom.body_regions ? symptom.body_regions.join(', ') : 'Not specified'}
- Description: ${symptom.custom_description || 'None provided'}
- DAO taken before meal: ${symptom.dao_taken_before_meal ? 'Yes' : 'No'}
- Physical fatigue: ${symptom.physical_fatigue_level || 'Not recorded'}/10
- Psychological fatigue: ${symptom.psychological_fatigue_level || 'Not recorded'}/10
- Stress factors: ${symptom.current_stress_factors ? symptom.current_stress_factors.join(', ') : 'None'}
- Duration: ${symptom.duration_minutes || 'Not recorded'} minutes
- Intensity change: ${symptom.intensity_change || 'Not recorded'}
`;

    const mealsDescription = mealFoodDetails.length > 0 ? mealFoodDetails.map((mealDetail, index) => {
      const mealTime = new Date(mealDetail.meal.meal_time);
      const hoursBeforeSymptom = ((new Date(symptom.started_at).getTime() - mealTime.getTime()) / (1000 * 60 * 60)).toFixed(1);

      const foodList = mealDetail.foods
        .map((f: any) => `  - ${f.food.name_no} (SIGHI level: ${f.food.compatibility}, Triggers: ${f.food.triggers.join(', ')})`)
        .join('\n');

      return `
Meal ${index + 1}:
- Time: ${mealTime.toLocaleString('no-NO')} (${hoursBeforeSymptom} hours before symptom)
- Type: ${mealDetail.meal.meal_type}
- DAO taken before: ${mealDetail.meal.dao_taken_before ? 'Yes' : 'No'}
- Foods consumed:
${foodList}
`;
    }).join('\n') : 'No meals recorded in analysis window.';

    const supplementsDescription = supplements.length > 0 ? supplements.map((supp, index) => {
      const takenTime = new Date(supp.taken_at);
      const hoursBeforeSymptom = ((new Date(symptom.started_at).getTime() - takenTime.getTime()) / (1000 * 60 * 60)).toFixed(1);
      return `
Supplement/Medication ${index + 1}:
- Time: ${takenTime.toLocaleString('no-NO')} (${hoursBeforeSymptom} hours before symptom)
- Name: ${supp.supplement_name}
- Type: ${supp.supplement_type}
- Dosage: ${supp.dosage || 'Not specified'}
- Purpose: ${supp.purpose || 'Not specified'}
`;
    }).join('\n') : 'No supplements/medications recorded in analysis window.';

    const medicationsDescription = medications.length > 0 ? medications.map((med, index) => {
      const takenTime = new Date(med.medication.time_taken);
      const hoursBeforeSymptom = ((new Date(symptom.started_at).getTime() - takenTime.getTime()) / (1000 * 60 * 60)).toFixed(1);
      const medicationName = med.medication.custom_name || med.catalog?.name || 'Ukjent medisin';
      const medicationType = med.medication.medication_type === 'mcas' ? 'MCAS-medisin' :
                            med.medication.medication_type === 'prescription' ? 'Reseptbelagt' :
                            med.medication.medication_type === 'over_counter' ? 'Reseptfri' :
                            med.medication.medication_type === 'supplement' ? 'Kosttilskudd' : med.medication.medication_type;
      return `
User Medication ${index + 1}:
- Time: ${takenTime.toLocaleString('no-NO')} (${hoursBeforeSymptom} hours before symptom)
- Name: ${medicationName}
- Type: ${medicationType}
- Dosage: ${med.medication.dosage || 'Not specified'} ${med.medication.dosage_unit || ''}
- Notes: ${med.medication.notes || 'None'}
`;
    }).join('\n') : '';

    const illnessesDescription = illnesses.length > 0 ? illnesses.map((illness, index) => {
      const symptomStartTime = new Date(illness.first_symptoms_at);
      const hoursBeforeSymptom = ((new Date(symptom.started_at).getTime() - symptomStartTime.getTime()) / (1000 * 60 * 60)).toFixed(1);
      const illnessType = illness.illness_type === 'flu' ? 'Influensa' :
                         illness.illness_type === 'cold' ? 'Forkjølelse' :
                         illness.illness_type === 'covid' ? 'COVID-19' :
                         illness.illness_type === 'stomach_bug' ? 'Mageinfeksjon' :
                         illness.illness_type === 'other' ? illness.custom_illness_name || 'Annen sykdom' : illness.illness_type;
      return `
Illness ${index + 1}:
- First symptoms: ${symptomStartTime.toLocaleString('no-NO')} (${hoursBeforeSymptom} hours before symptom)
- Type: ${illnessType}
- Status: ${illness.status || 'Unknown'}
- Severity: ${illness.severity}/10
- Has fever: ${illness.has_fever ? 'Yes' : 'No'}${illness.temperature_celsius ? ` (${illness.temperature_celsius}°C)` : ''}
- MCAS flare during illness: ${illness.mcas_flare_during_illness ? 'Yes' : 'No'}
- MCAS severity increase: ${illness.mcas_severity_increase || 'Not specified'}/10
- Suspected source: ${illness.suspected_source || 'Unknown'}
- Symptoms: ${illness.symptoms?.join(', ') || 'Not specified'}
- Notes: ${illness.notes || 'None'}
`;
    }).join('\n') : '';

    const activitiesDescription = activities.length > 0 ? activities.map((act, index) => {
      const actTime = new Date(act.time_started);
      const hoursBeforeSymptom = ((new Date(symptom.started_at).getTime() - actTime.getTime()) / (1000 * 60 * 60)).toFixed(1);
      return `
Activity ${index + 1}:
- Time: ${actTime.toLocaleString('no-NO')} (${hoursBeforeSymptom} hours before symptom)
- Type: ${act.activity_type}
- Duration: ${act.duration_minutes || 'Unknown'} minutes
- Intensity: ${act.intensity || 'Not specified'}
- Notes: ${act.notes || 'None'}
`;
    }).join('\n') : 'No activities recorded in analysis window.';

    const healthMetricsDescription = healthMetricsData.length > 0 ? healthMetricsData.map((metric, index) => {
      const recordedTime = new Date(metric.created_at);
      const hoursBeforeSymptom = ((new Date(symptom.started_at).getTime() - recordedTime.getTime()) / (1000 * 60 * 60)).toFixed(1);
      return `
Health Metric ${index + 1}:
- Time: ${recordedTime.toLocaleString('no-NO')} (${hoursBeforeSymptom} hours before symptom)
- Sleep quality: ${metric.sleep_quality || 'Not recorded'}/10
- Energy level: ${metric.energy_level || 'Not recorded'}/10
- Stress level: ${metric.stress_level || 'Not recorded'}/10
- Mood: ${metric.mood_rating || 'Not recorded'}/10
`;
    }).join('\n') : 'No health metrics recorded in analysis window.';

    const airQualityDescription = airQualityData.length > 0 ? airQualityData.map((aq, index) => {
      return `
Indoor Air Quality (Room ${index + 1}):
- Room: ${aq.room_name}
- Time spent: ${aq.time_spent_minutes} minutes
- CO₂: ${aq.metrics.co2 || 'N/A'} ppm
- VOC: ${aq.metrics.voc || 'N/A'} ppb
- Humidity: ${aq.metrics.humidity || 'N/A'}%
- Temperature: ${aq.metrics.temperature || 'N/A'}°C
- Radon: ${aq.metrics.radon || 'N/A'} Bq/m³
- PM2.5: ${aq.metrics.pm25 || 'N/A'} μg/m³
`;
    }).join('\n') : 'No indoor air quality data recorded.';

    const weatherDescription = weatherData ? `
Weather Conditions:
- Temperature: ${weatherData.temperature || 'N/A'}°C
- Humidity: ${weatherData.humidity || 'N/A'}%
- Pressure: ${weatherData.pressure || 'N/A'} hPa
- Conditions: ${weatherData.description || 'N/A'}
` : 'No weather data recorded.';

    return `
You are a board-certified allergist/immunologist specializing in Mast Cell Activation Syndrome (MCAS) with 15+ years of clinical experience. Your expertise includes:
- MCAS pathophysiology (mast cell degranulation, mediator release pathways)
- Trigger timing patterns (immediate vs delayed reactions, latency windows)
- Multi-factorial trigger analysis and synergistic interactions
- Differential diagnosis between primary triggers and amplifying factors
- Clinical correlation of symptoms with biological mechanisms

Analyze this case using evidence-based MCAS medicine and clinical reasoning.

${symptomDescription}

=== MEALS & FOOD ===
${mealsDescription}

=== SUPPLEMENTS & MEDICATIONS (Legacy) ===
${supplementsDescription}

=== USER MEDICATIONS ===
${medicationsDescription || 'No user medications recorded in analysis window.'}

=== ILLNESS EPISODES ===
${illnessesDescription || 'No illnesses recorded in analysis window.'}

=== PHYSICAL ACTIVITIES ===
${activitiesDescription}

=== HEALTH METRICS ===
${healthMetricsDescription}

=== INDOOR AIR QUALITY (Airthings) ===
${airQualityDescription}

=== WEATHER CONDITIONS ===
${weatherDescription}

Analysis Window: ${windowStart.toLocaleString('no-NO')} to ${windowEnd.toLocaleString('no-NO')}

CRITICAL INSTRUCTIONS FOR ANALYSIS:

1. TIMING-BASED CAUSALITY: For EACH potential trigger (food, medication, activity, illness, environment), you MUST:
   - Calculate precise time-to-symptom latency in hours
   - Assess biological plausibility given MCAS reaction timing:
     * Food: typically 0-24 hours (histamine reactions), rarely >36 hours
     * Medications: 15 minutes - 4 hours for direct effects
     * Activities: during activity or within 2 hours post-exertion
     * Infections/Illness: during active infectious phase (systemic inflammation)
     * Environmental: exposure-dependent, typically immediate to 4 hours
   - Rate timing compatibility using ⭐ (1-5 stars, 5 = perfect timing match)

2. MECHANISTIC REASONING: For the PRIMARY trigger, explain:
   - Which mast cell mediators are involved (histamine, tryptase, IL-6, TNF-α, prostaglandins, leukotrienes)
   - Why this specific mechanism causes THIS symptom category/type (e.g., why IL-6 elevation causes musculoskeletal pain)
   - Why the timing window matches this mechanism
   - Supporting evidence from SIGHI levels, biogenic amines, or known MCAS pathways

3. MULTI-FACTOR SYNERGY: Identify if multiple factors amplify each other:
   - Infection + food histamine load (cytokines lower mast cell threshold)
   - Activity + environmental stress (physical exertion + triggers)
   - Illness + medication timing (infection-induced inflammation + drug effects)
   - Sleep deprivation + triggers (stress hormone impact on mast cells)
   - Explain HOW they interact at the cellular/mediator level

4. CONFIDENCE RANKING: Rate each factor by:
   - Timing compatibility (⭐⭐⭐⭐⭐)
   - MCAS mechanism strength (⭐⭐⭐⭐⭐)
   - Symptom pattern match (⭐⭐⭐⭐⭐)
   - Overall evidence strength (average of above)

5. DIFFERENTIAL DIAGNOSIS: Explicitly rule out unlikely factors and explain why:
   - Too distant timing (>48h for food, >24h for environment)
   - Mechanism mismatch (e.g., DAO taken, so histamine less likely)
   - Insufficient dose/exposure
   - Contradictory evidence (e.g., same food tolerated 24h earlier)

Respond in JSON format with this EXACT structure:
{
  "executive_summary": {
    "primary_trigger": {
      "name": "string - specific trigger name",
      "category": "food|medication|illness|activity|environment|weather",
      "confidence": 0.0-1.0,
      "mechanism": "string - detailed mast cell pathway explanation",
      "timing_compatibility": "string - why timing makes biological sense",
      "evidence_strength": "⭐⭐⭐⭐⭐ (1-5 stars)"
    },
    "secondary_amplifiers": [
      {
        "name": "string",
        "category": "food|medication|illness|activity|environment|weather",
        "contribution": "string - how it amplifies primary trigger at cellular level",
        "evidence_strength": "⭐⭐⭐⭐⭐"
      }
    ],
    "unlikely_factors": [
      {
        "name": "string",
        "category": "food|medication|illness|activity|environment|weather",
        "reason_excluded": "string - specific reason why timing/mechanism doesn't fit"
      }
    ]
  },
  "detailed_factor_analysis": {
    "foods": {
      "timing_assessment": "string - overall food timing analysis",
      "individual_foods": [
        {
          "food_name_no": "string",
          "sighi_level": "0|1|2|3",
          "time_before_symptom_hours": number,
          "mcas_relevance": "string - histamine/trigger analysis",
          "likelihood_rating": "⭐⭐⭐⭐⭐",
          "clinical_notes": "string"
        }
      ],
      "overall_food_conclusion": "string"
    },
    "illness": {
      "illness_name": "string",
      "severity_rating": "mild|moderate|severe",
      "timing_analysis": "string - hours before symptom, infectious phase",
      "mcas_mechanisms": ["IL-6 elevation", "TNF-α release", "fever-induced mast cell destabilization"],
      "likelihood_rating": "⭐⭐⭐⭐⭐",
      "clinical_reasoning": "string - detailed pathophysiology"
    },
    "medications": {
      "timing_assessment": "string",
      "individual_medications": [
        {
          "medication_name": "string",
          "medication_type": "string",
          "time_before_symptom_hours": number,
          "effect_analysis": "protective|neutral|triggering",
          "likelihood_rating": "⭐⭐⭐⭐⭐",
          "notes": "string"
        }
      ],
      "overall_medication_conclusion": "string"
    },
    "activities": {
      "timing_assessment": "string",
      "individual_activities": [
        {
          "activity_type": "string",
          "intensity": "string",
          "time_before_symptom_hours": number,
          "exertion_analysis": "string",
          "likelihood_rating": "⭐⭐⭐⭐⭐",
          "notes": "string"
        }
      ],
      "overall_activity_conclusion": "string"
    },
    "environment": {
      "air_quality_assessment": "string",
      "specific_concerns": ["VOC elevation", "CO2 levels", "humidity", "radon"],
      "likelihood_rating": "⭐⭐⭐⭐⭐",
      "clinical_notes": "string"
    },
    "weather": {
      "barometric_pressure_analysis": "string",
      "temperature_humidity_impact": "string",
      "likelihood_rating": "⭐⭐⭐⭐⭐",
      "clinical_notes": "string"
    }
  },
  "multi_factor_interactions": {
    "synergistic_patterns": [
      {
        "factors": ["illness", "food", "activity"],
        "interaction_mechanism": "string - how they combine at cellular/mediator level",
        "amplification_estimate": "2x|5x|10x",
        "clinical_significance": "string"
      }
    ]
  },
  "confidence_assessment": {
    "overall_confidence": 0.0-1.0,
    "data_quality": "excellent|good|limited|poor",
    "key_uncertainties": ["string"],
    "additional_data_needed": ["string"]
  },
  "recommendations": {
    "immediate_actions": ["string - what to do RIGHT NOW"],
    "foods_to_avoid": ["string"],
    "foods_to_retry": ["string - safe foods to test"],
    "lifestyle_modifications": ["string"],
    "monitoring_suggestions": ["string"],
    "medical_consultation_needed": true|false,
    "follow_up_testing": ["string - labs, imaging, etc."]
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

    // Extract executive summary
    const executiveSummary = parsed.executive_summary || {};
    const primaryTrigger = executiveSummary.primary_trigger || {};
    const secondaryAmplifiers = executiveSummary.secondary_amplifiers || [];
    const unlikelyFactors = executiveSummary.unlikely_factors || [];

    // Extract detailed analysis
    const detailedAnalysis = parsed.detailed_factor_analysis || {};
    const foodsAnalysis = detailedAnalysis.foods || {};
    const illnessAnalysis = detailedAnalysis.illness || {};
    const medicationsAnalysis = detailedAnalysis.medications || {};
    const activitiesAnalysis = detailedAnalysis.activities || {};
    const environmentAnalysis = detailedAnalysis.environment || {};
    const weatherAnalysis = detailedAnalysis.weather || {};

    // Extract multi-factor interactions
    const multiFactorInteractions = parsed.multi_factor_interactions || {};
    const synergisticPatterns = multiFactorInteractions.synergistic_patterns || [];

    // Extract confidence assessment
    const confidenceAssessment = parsed.confidence_assessment || {};

    // Extract recommendations
    const recommendations = parsed.recommendations || {};

    // Convert food triggers to FoodTrigger format (for backward compatibility)
    const foodTriggers: FoodTrigger[] = (foodsAnalysis.individual_foods || []).map((food: any) => {
      // Find the actual food ID from our data
      const matchingFood = mealFoodDetails
        .flatMap(m => m.foods)
        .find((f: any) => f.food.name_no === food.food_name_no);

      return {
        food_id: matchingFood?.food.id || 0,
        food_name_no: food.food_name_no || '',
        food_name_en: matchingFood?.food.name_en || '',
        compatibility: food.sighi_level || '0',
        correlation_score: this.starRatingToScore(food.likelihood_rating),
        time_consumed: new Date(),
        time_to_symptom_hours: food.time_before_symptom_hours || 0,
        confidence_level: this.starRatingToConfidence(food.likelihood_rating),
      };
    });

    // Build comprehensive improvement suggestions with structured formatting
    const allSuggestions: string[] = [];

    // Add executive summary at top
    if (primaryTrigger.name) {
      allSuggestions.push(
        `🎯 MEST SANNSYNLIG TRIGGER: ${primaryTrigger.name} ${primaryTrigger.evidence_strength || ''}`,
        `   Kategori: ${this.translateCategory(primaryTrigger.category)}`,
        `   Tillitsnivå: ${Math.round((primaryTrigger.confidence || 0) * 100)}%`,
        `   Mekanisme: ${primaryTrigger.mechanism || 'Ikke spesifisert'}`,
        `   Timing: ${primaryTrigger.timing_compatibility || 'Ikke spesifisert'}`,
        ''
      );
    }

    // Add secondary amplifiers
    if (secondaryAmplifiers.length > 0) {
      allSuggestions.push('⚡ FORSTERKENDE FAKTORER:');
      secondaryAmplifiers.forEach((amp: any) => {
        allSuggestions.push(
          `   • ${amp.name} ${amp.evidence_strength || ''}`,
          `     ${amp.contribution || ''}`
        );
      });
      allSuggestions.push('');
    }

    // Add synergistic interactions
    if (synergisticPatterns.length > 0) {
      allSuggestions.push('🔗 SAMSPILLSEFFEKTER:');
      synergisticPatterns.forEach((pattern: any) => {
        allSuggestions.push(
          `   • ${pattern.factors.join(' + ')} (forsterkning: ${pattern.amplification_estimate})`,
          `     ${pattern.interaction_mechanism}`,
          `     Klinisk betydning: ${pattern.clinical_significance || 'Ikke spesifisert'}`
        );
      });
      allSuggestions.push('');
    }

    // Add illness analysis if present
    if (illnessAnalysis.illness_name) {
      allSuggestions.push(
        `🤒 SYKDOMSANALYSE: ${illnessAnalysis.illness_name} ${illnessAnalysis.likelihood_rating || ''}`,
        `   Alvorlighetsgrad: ${illnessAnalysis.severity_rating || 'Ikke spesifisert'}`,
        `   Timing: ${illnessAnalysis.timing_analysis || 'Ikke spesifisert'}`,
        `   MCAS-mekanismer: ${(illnessAnalysis.mcas_mechanisms || []).join(', ')}`,
        `   Klinisk vurdering: ${illnessAnalysis.clinical_reasoning || 'Ikke spesifisert'}`,
        ''
      );
    }

    // Add food analysis summary
    if (foodsAnalysis.overall_food_conclusion) {
      allSuggestions.push(
        `🍽️ MATANALYSE:`,
        `   ${foodsAnalysis.timing_assessment || ''}`,
        `   Konklusjon: ${foodsAnalysis.overall_food_conclusion}`,
        ''
      );
    }

    // Add medication analysis
    if (medicationsAnalysis.overall_medication_conclusion) {
      allSuggestions.push(
        `💊 MEDISINANALYSE:`,
        `   ${medicationsAnalysis.timing_assessment || ''}`,
        `   Konklusjon: ${medicationsAnalysis.overall_medication_conclusion}`,
        ''
      );
    }

    // Add activity analysis
    if (activitiesAnalysis.overall_activity_conclusion) {
      allSuggestions.push(
        `🏃 AKTIVITETSANALYSE:`,
        `   ${activitiesAnalysis.timing_assessment || ''}`,
        `   Konklusjon: ${activitiesAnalysis.overall_activity_conclusion}`,
        ''
      );
    }

    // Add environment analysis
    if (environmentAnalysis.air_quality_assessment) {
      allSuggestions.push(
        `🏠 INNEMILJØANALYSE: ${environmentAnalysis.likelihood_rating || ''}`,
        `   ${environmentAnalysis.air_quality_assessment}`,
        `   Bekymringer: ${(environmentAnalysis.specific_concerns || []).join(', ')}`,
        `   ${environmentAnalysis.clinical_notes || ''}`,
        ''
      );
    }

    // Add weather analysis
    if (weatherAnalysis.barometric_pressure_analysis) {
      allSuggestions.push(
        `🌤️ VÆRANALYSE: ${weatherAnalysis.likelihood_rating || ''}`,
        `   Lufttrykk: ${weatherAnalysis.barometric_pressure_analysis}`,
        `   Temperatur/fuktighet: ${weatherAnalysis.temperature_humidity_impact || ''}`,
        `   ${weatherAnalysis.clinical_notes || ''}`,
        ''
      );
    }

    // Add unlikely factors (builds trust)
    if (unlikelyFactors.length > 0) {
      allSuggestions.push('❌ LITE SANNSYNLIGE ÅRSAKER:');
      unlikelyFactors.forEach((factor: any) => {
        allSuggestions.push(
          `   • ${factor.name} (${this.translateCategory(factor.category)})`,
          `     Grunn: ${factor.reason_excluded}`
        );
      });
      allSuggestions.push('');
    }

    // Add confidence assessment
    if (confidenceAssessment.overall_confidence !== undefined) {
      allSuggestions.push(
        `📊 TILLITSVURDERING:`,
        `   Samlet tillit: ${Math.round(confidenceAssessment.overall_confidence * 100)}%`,
        `   Datakvalitet: ${this.translateDataQuality(confidenceAssessment.data_quality)}`,
        `   Usikkerhetsmomenter: ${(confidenceAssessment.key_uncertainties || []).join(', ') || 'Ingen'}`,
        `   Anbefalt tilleggsdata: ${(confidenceAssessment.additional_data_needed || []).join(', ') || 'Ingen'}`,
        ''
      );
    }

    // Add immediate actions
    if (recommendations.immediate_actions && recommendations.immediate_actions.length > 0) {
      allSuggestions.push('⚡ UMIDDELBARE TILTAK:');
      recommendations.immediate_actions.forEach((action: string) => {
        allSuggestions.push(`   • ${action}`);
      });
      allSuggestions.push('');
    }

    // Add lifestyle modifications
    if (recommendations.lifestyle_modifications && recommendations.lifestyle_modifications.length > 0) {
      allSuggestions.push('🔄 LIVSSTILSENDRINGER:');
      recommendations.lifestyle_modifications.forEach((mod: string) => {
        allSuggestions.push(`   • ${mod}`);
      });
      allSuggestions.push('');
    }

    // Add monitoring suggestions
    if (recommendations.monitoring_suggestions && recommendations.monitoring_suggestions.length > 0) {
      allSuggestions.push('📝 OVERVÅKINGSANBEFALINGER:');
      recommendations.monitoring_suggestions.forEach((suggestion: string) => {
        allSuggestions.push(`   • ${suggestion}`);
      });
      allSuggestions.push('');
    }

    // Add medical consultation warning if needed
    if (recommendations.medical_consultation_needed) {
      allSuggestions.push(
        '⚠️ ANBEFALT MEDISINSK KONSULTASJON',
        '   Dette symptomet bør diskuteres med lege.',
        ''
      );
    }

    // Add follow-up testing if recommended
    if (recommendations.follow_up_testing && recommendations.follow_up_testing.length > 0) {
      allSuggestions.push('🔬 OPPFØLGENDE TESTER:');
      recommendations.follow_up_testing.forEach((test: string) => {
        allSuggestions.push(`   • ${test}`);
      });
      allSuggestions.push('');
    }

    return {
      analysis_id: 0, // Will be set when saved to database
      user_id: userId,
      symptom_entry_id: symptomEntryId,
      analysis_confidence: confidenceAssessment.overall_confidence || 0.5,
      data_quality_score: this.dataQualityToScore(confidenceAssessment.data_quality),
      likely_food_triggers: foodTriggers,
      trigger_timeline: [], // Could be enhanced with timing data
      similar_past_episodes: [],
      symptom_pattern: {
        symptom_type: '',
        frequency_last_30_days: 0,
        avg_severity: 0,
        common_triggers: [],
        time_of_day_pattern: {},
      },
      improvement_suggestions: allSuggestions,
      foods_to_avoid: recommendations.foods_to_avoid || [],
      foods_to_retry: recommendations.foods_to_retry || [],
      analysis_window_start: windowStart,
      analysis_window_end: windowEnd,
      total_meals_analyzed: mealFoodDetails.length,
      created_at: new Date(),
    };
  }

  /**
   * Convert star rating to correlation score (0.0-1.0)
   */
  private starRatingToScore(rating: string): number {
    if (!rating) return 0.5;
    const stars = (rating.match(/⭐/g) || []).length;
    return stars / 5.0;
  }

  /**
   * Convert star rating to confidence level
   */
  private starRatingToConfidence(rating: string): 'low' | 'medium' | 'high' {
    const score = this.starRatingToScore(rating);
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Translate category to Norwegian
   */
  private translateCategory(category: string): string {
    const translations: Record<string, string> = {
      'food': 'Mat',
      'medication': 'Medisin',
      'illness': 'Sykdom',
      'activity': 'Aktivitet',
      'environment': 'Miljø',
      'weather': 'Vær'
    };
    return translations[category] || category;
  }

  /**
   * Translate data quality to Norwegian
   */
  private translateDataQuality(quality: string): string {
    const translations: Record<string, string> = {
      'excellent': 'Utmerket',
      'good': 'God',
      'limited': 'Begrenset',
      'poor': 'Dårlig'
    };
    return translations[quality] || quality || 'God';
  }

  /**
   * Convert data quality to numeric score
   */
  private dataQualityToScore(quality: string): number {
    const scores: Record<string, number> = {
      'excellent': 1.0,
      'good': 0.8,
      'limited': 0.5,
      'poor': 0.3
    };
    return scores[quality] || 0.8;
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
