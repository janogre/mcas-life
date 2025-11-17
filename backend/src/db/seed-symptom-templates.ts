/**
 * Seed Symptom Templates
 *
 * Comprehensive library of MCAS symptom types with follow-up questions
 */

import { db } from './connection.js';
import { symptomTemplates } from './schema.js';

export const symptomTemplateData = [
  // SKIN SYMPTOMS
  {
    category: 'skin' as const,
    name_no: 'Hudreaksjon',
    name_en: 'Skin Reaction',
    icon: '🔴',
    severity_label_low_no: 'Svak',
    severity_label_mid_no: 'Merkbar',
    severity_label_high_no: 'Intens',
    display_order: 1,
    common_body_regions: ['ansikt', 'armer', 'bein', 'mage', 'rygg'],
    follow_up_questions: [
      {
        id: 'skin_type',
        question_no: 'Hva slags hudreaksjon?',
        question_en: 'What type of skin reaction?',
        type: 'multiple_choice' as const,
        options: ['Utslett', 'Rødhet', 'Hevelse', 'Kløe', 'Elveblest', 'Brennende følelse'],
        required: true
      },
      {
        id: 'skin_location',
        question_no: 'Hvor på kroppen?',
        question_en: 'Where on body?',
        type: 'body_map' as const,
        required: true
      },
      {
        id: 'skin_spread',
        question_no: 'Sprer reaksjonen seg?',
        question_en: 'Is it spreading?',
        type: 'single_choice' as const,
        options: ['Blir bedre', 'Stabil', 'Sprer seg'],
        required: false
      }
    ]
  },

  {
    category: 'skin' as const,
    name_no: 'Kløe',
    name_en: 'Itching',
    icon: '🔴',
    severity_label_low_no: 'Lett kløe',
    severity_label_mid_no: 'Merkbar kløe',
    severity_label_high_no: 'Uutholdelig kløe',
    display_order: 2,
    common_body_regions: ['ansikt', 'armer', 'bein', 'mage', 'rygg', 'hodebund'],
    follow_up_questions: [
      {
        id: 'itch_location',
        question_no: 'Hvor klør det?',
        question_en: 'Where does it itch?',
        type: 'body_map' as const,
        required: true
      },
      {
        id: 'itch_visible',
        question_no: 'Er det synlig utslett?',
        question_en: 'Is there visible rash?',
        type: 'single_choice' as const,
        options: ['Ja', 'Nei'],
        required: false
      }
    ]
  },

  // DIGESTIVE SYMPTOMS
  {
    category: 'digestive' as const,
    name_no: 'Magesmerter',
    name_en: 'Stomach Pain',
    icon: '🟠',
    severity_label_low_no: 'Lett ubehag',
    severity_label_mid_no: 'Merkbare smerter',
    severity_label_high_no: 'Sterke smerter',
    display_order: 3,
    common_body_regions: ['mage'],
    follow_up_questions: [
      {
        id: 'pain_type',
        question_no: 'Type magesmerter:',
        question_en: 'Type of stomach pain:',
        type: 'multiple_choice' as const,
        options: ['Kramper', 'Oppblåsthet', 'Kvalme', 'Sure opstøt', 'Diaré', 'Forstoppelse'],
        required: true
      },
      {
        id: 'time_since_meal',
        question_no: 'Når spiste du sist?',
        question_en: 'When did you last eat?',
        type: 'time_since' as const,
        required: false
      }
    ]
  },

  {
    category: 'digestive' as const,
    name_no: 'Kvalme',
    name_en: 'Nausea',
    icon: '🟠',
    severity_label_low_no: 'Lett kvalm',
    severity_label_mid_no: 'Merkbar kvalme',
    severity_label_high_no: 'Sterk kvalme',
    display_order: 4,
    common_body_regions: ['mage'],
    follow_up_questions: [
      {
        id: 'nausea_vomiting',
        question_no: 'Har du kastet opp?',
        question_en: 'Have you vomited?',
        type: 'single_choice' as const,
        options: ['Ja', 'Nei, men føler behov', 'Nei'],
        required: false
      },
      {
        id: 'time_since_meal',
        question_no: 'Når spiste du sist?',
        question_en: 'When did you last eat?',
        type: 'time_since' as const,
        required: false
      }
    ]
  },

  // NEUROLOGICAL SYMPTOMS
  {
    category: 'neurological' as const,
    name_no: 'Hodepine',
    name_en: 'Headache',
    icon: '🟡',
    severity_label_low_no: 'Lett hodepine',
    severity_label_mid_no: 'Merkbar hodepine',
    severity_label_high_no: 'Kraftig hodepine',
    display_order: 5,
    common_body_regions: ['hode'],
    follow_up_questions: [
      {
        id: 'headache_type',
        question_no: 'Type hodepine:',
        question_en: 'Type of headache:',
        type: 'single_choice' as const,
        options: ['Pulserende', 'Trykkende', 'Stikkende', 'Hele hodet', 'Migrene'],
        required: true
      },
      {
        id: 'headache_location',
        question_no: 'Hvor i hodet?',
        question_en: 'Where in head?',
        type: 'multiple_choice' as const,
        options: ['Panne', 'Tinninger', 'Nakke', 'Bak øynene', 'Hele hodet'],
        required: true
      },
      {
        id: 'light_sensitivity',
        question_no: 'Lysfølsom?',
        question_en: 'Light sensitive?',
        type: 'single_choice' as const,
        options: ['Ja', 'Nei'],
        required: false
      },
      {
        id: 'sound_sensitivity',
        question_no: 'Lydfølsom?',
        question_en: 'Sound sensitive?',
        type: 'single_choice' as const,
        options: ['Ja', 'Nei'],
        required: false
      }
    ]
  },

  {
    category: 'neurological' as const,
    name_no: 'Tretthet',
    name_en: 'Fatigue',
    icon: '🟣',
    severity_label_low_no: 'Lett trett',
    severity_label_mid_no: 'Moderat trett',
    severity_label_high_no: 'Utmattet',
    display_order: 6,
    common_body_regions: ['hele kroppen'],
    follow_up_questions: [
      {
        id: 'fatigue_type',
        question_no: 'Type tretthet:',
        question_en: 'Type of fatigue:',
        type: 'single_choice' as const,
        options: ['Fysisk', 'Mental', 'Begge'],
        required: true
      },
      {
        id: 'daily_tasks',
        question_no: 'Kan du gjøre daglige gjøremål?',
        question_en: 'Can you do daily tasks?',
        type: 'single_choice' as const,
        options: ['Ja, normalt', 'Delvis', 'Nei, må hvile'],
        required: true
      },
      {
        id: 'sleep_quality_last_night',
        question_no: 'Søvnkvalitet i natt (1-10):',
        question_en: 'Sleep quality last night (1-10):',
        type: 'slider' as const,
        min: 1,
        max: 10,
        required: false
      }
    ]
  },

  {
    category: 'neurological' as const,
    name_no: 'Konsentrasjonsvansker',
    name_en: 'Concentration Difficulties',
    icon: '🟡',
    severity_label_low_no: 'Lett tåkete',
    severity_label_mid_no: 'Merkbare vansker',
    severity_label_high_no: 'Kan ikke fokusere',
    display_order: 7,
    common_body_regions: ['hode'],
    follow_up_questions: [
      {
        id: 'brain_fog_activities',
        question_no: 'Påvirker det daglige aktiviteter?',
        question_en: 'Does it affect daily activities?',
        type: 'single_choice' as const,
        options: ['Ja, betydelig', 'Litt', 'Nei'],
        required: false
      }
    ]
  },

  // RESPIRATORY SYMPTOMS
  {
    category: 'respiratory' as const,
    name_no: 'Pustevansker',
    name_en: 'Breathing Difficulties',
    icon: '🔵',
    severity_label_low_no: 'Lett tetthet',
    severity_label_mid_no: 'Merkbare vansker',
    severity_label_high_no: 'Alvorlige vansker',
    display_order: 8,
    common_body_regions: ['bryst', 'hals'],
    follow_up_questions: [
      {
        id: 'breathing_type',
        question_no: 'Type pustevansker:',
        question_en: 'Type of breathing difficulty:',
        type: 'multiple_choice' as const,
        options: ['Tetthet i brystet', 'Tung pust', 'Hvesing', 'Hoste', 'Kortpustethet'],
        required: true
      },
      {
        id: 'breathing_severity',
        question_no: 'Alvorlighet:',
        question_en: 'Severity:',
        type: 'single_choice' as const,
        options: ['Kan snakke normalt', 'Kan gå', 'Må sitte/hvile', '⚠️ Nødfall - ring 113'],
        required: true
      },
      {
        id: 'asthma_history',
        question_no: 'Kjent astma/allergi?',
        question_en: 'Known asthma/allergy?',
        type: 'single_choice' as const,
        options: ['Ja', 'Nei'],
        required: false
      }
    ]
  },

  {
    category: 'respiratory' as const,
    name_no: 'Hoste',
    name_en: 'Cough',
    icon: '🔵',
    severity_label_low_no: 'Lett hoste',
    severity_label_mid_no: 'Moderat hoste',
    severity_label_high_no: 'Kraftig hoste',
    display_order: 9,
    common_body_regions: ['bryst', 'hals'],
    follow_up_questions: [
      {
        id: 'cough_type',
        question_no: 'Type hoste:',
        question_en: 'Type of cough:',
        type: 'single_choice' as const,
        options: ['Tørr', 'Med slim', 'Krampaktig'],
        required: true
      }
    ]
  },

  // MUSCULOSKELETAL SYMPTOMS
  {
    category: 'musculoskeletal' as const,
    name_no: 'Leddsmerter',
    name_en: 'Joint Pain',
    icon: '🟢',
    severity_label_low_no: 'Lett ømhet',
    severity_label_mid_no: 'Merkbare smerter',
    severity_label_high_no: 'Sterke smerter',
    display_order: 10,
    common_body_regions: ['knær', 'ankler', 'håndledd', 'hofter', 'skuldre', 'albuer'],
    follow_up_questions: [
      {
        id: 'joint_location',
        question_no: 'Hvilke ledd?',
        question_en: 'Which joints?',
        type: 'multiple_choice' as const,
        options: ['Knær', 'Ankler', 'Håndledd', 'Hofter', 'Skuldre', 'Albuer', 'Fingre', 'Ryggen'],
        required: true
      },
      {
        id: 'pain_type',
        question_no: 'Type smerte:',
        question_en: 'Type of pain:',
        type: 'single_choice' as const,
        options: ['Dump', 'Skarp', 'Brennende', 'Stikkende'],
        required: true
      },
      {
        id: 'movement_impact',
        question_no: 'Bevegelse gjør det:',
        question_en: 'Movement makes it:',
        type: 'single_choice' as const,
        options: ['Bedre', 'Verre', 'Ingen forskjell'],
        required: false
      }
    ]
  },

  {
    category: 'musculoskeletal' as const,
    name_no: 'Muskelsmerter',
    name_en: 'Muscle Pain',
    icon: '🟢',
    severity_label_low_no: 'Lett ømhet',
    severity_label_mid_no: 'Merkbare smerter',
    severity_label_high_no: 'Sterke smerter',
    display_order: 11,
    common_body_regions: ['nakke', 'skuldre', 'rygg', 'armer', 'bein'],
    follow_up_questions: [
      {
        id: 'muscle_location',
        question_no: 'Hvor er smertene?',
        question_en: 'Where is the pain?',
        type: 'multiple_choice' as const,
        options: ['Nakke', 'Skuldre', 'Rygg', 'Armer', 'Bein', 'Mage'],
        required: true
      },
      {
        id: 'muscle_pain_type',
        question_no: 'Type smerte:',
        question_en: 'Type of pain:',
        type: 'single_choice' as const,
        options: ['Stiv', 'Krampe', 'Øm', 'Brennende'],
        required: false
      }
    ]
  },

  // CARDIOVASCULAR SYMPTOMS
  {
    category: 'cardiovascular' as const,
    name_no: 'Hjertebank',
    name_en: 'Palpitations',
    icon: '🩷',
    severity_label_low_no: 'Lett merkbar',
    severity_label_mid_no: 'Tydelig hjertebank',
    severity_label_high_no: 'Intens hjertebank',
    display_order: 12,
    common_body_regions: ['bryst'],
    follow_up_questions: [
      {
        id: 'heart_rate',
        question_no: 'Hvilepuls hvis målt (BPM):',
        question_en: 'Resting heart rate if measured (BPM):',
        type: 'slider' as const,
        min: 40,
        max: 200,
        unit: 'BPM',
        required: false
      },
      {
        id: 'activity_level',
        question_no: 'Aktivitet da det startet:',
        question_en: 'Activity when it started:',
        type: 'single_choice' as const,
        options: ['Hvile', 'Lett aktivitet', 'Moderat aktivitet', 'Hard aktivitet'],
        required: true
      },
      {
        id: 'dizziness',
        question_no: 'Svimmelhet samtidig?',
        question_en: 'Dizziness at the same time?',
        type: 'single_choice' as const,
        options: ['Ja', 'Nei'],
        required: false
      }
    ]
  },

  {
    category: 'cardiovascular' as const,
    name_no: 'Svimmelhet',
    name_en: 'Dizziness',
    icon: '🩷',
    severity_label_low_no: 'Lett svimmel',
    severity_label_mid_no: 'Merkbar svimmelhet',
    severity_label_high_no: 'Må sitte/ligge',
    display_order: 13,
    common_body_regions: ['hode'],
    follow_up_questions: [
      {
        id: 'dizziness_type',
        question_no: 'Type svimmelhet:',
        question_en: 'Type of dizziness:',
        type: 'single_choice' as const,
        options: ['Letthodet', 'Rom snurrer', 'Ustø på bena', 'Nesten besvimelse'],
        required: true
      },
      {
        id: 'position_change',
        question_no: 'Kom det ved å reise deg?',
        question_en: 'Did it come when standing up?',
        type: 'single_choice' as const,
        options: ['Ja', 'Nei'],
        required: false
      }
    ]
  },

  // SYSTEMIC SYMPTOMS
  {
    category: 'systemic' as const,
    name_no: 'Generell utilpass',
    name_en: 'General Malaise',
    icon: '⚪',
    severity_label_low_no: 'Lett ubehag',
    severity_label_mid_no: 'Merkbar utilpass',
    severity_label_high_no: 'Føler meg syk',
    display_order: 14,
    common_body_regions: ['hele kroppen'],
    follow_up_questions: [
      {
        id: 'malaise_symptoms',
        question_no: 'Hvilke symptomer:',
        question_en: 'Which symptoms:',
        type: 'multiple_choice' as const,
        options: ['Frysninger', 'Varm', 'Svak', 'Trett', 'Uvel', 'Influensafølelse'],
        required: false
      }
    ]
  },

  {
    category: 'systemic' as const,
    name_no: 'Feber/Frysninger',
    name_en: 'Fever/Chills',
    icon: '⚪',
    severity_label_low_no: 'Lett frossen',
    severity_label_mid_no: 'Merkbare frysninger',
    severity_label_high_no: 'Kraftige frysninger',
    display_order: 15,
    common_body_regions: ['hele kroppen'],
    follow_up_questions: [
      {
        id: 'temperature',
        question_no: 'Temperatur hvis målt (°C):',
        question_en: 'Temperature if measured (°C):',
        type: 'slider' as const,
        min: 35,
        max: 42,
        unit: '°C',
        required: false
      }
    ]
  }
];

export async function seedSymptomTemplates() {
  console.log('🌱 Seeding symptom templates...');

  try {
    // Clear existing templates (optional - remove in production)
    // await db.delete(symptomTemplates);

    // Insert all templates
    const inserted = await db.insert(symptomTemplates).values(symptomTemplateData).returning();

    console.log(`✅ Seeded ${inserted.length} symptom templates`);
    return inserted;
  } catch (error) {
    console.error('❌ Error seeding symptom templates:', error);
    throw error;
  }
}

// Run if called directly
seedSymptomTemplates()
  .then(() => {
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
