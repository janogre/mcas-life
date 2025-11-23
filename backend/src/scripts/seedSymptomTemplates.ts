/**
 * Seed Symptom Templates
 * Populates the database with common MCAS symptom templates
 */

import { db } from '../db/connection.js';
import { symptomTemplates } from '../db/schema.js';

const mcasSymptomTemplates = [
  // SKIN (Hud)
  {
    category: 'skin',
    name_no: 'Utslett',
    name_en: 'Rash',
    icon: '🔴',
    severity_label_low_no: 'Litt rødhet',
    severity_label_mid_no: 'Tydelig utslett',
    severity_label_high_no: 'Omfattende utslett',
    display_order: 1,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor på kroppen har du utslett?',
        question_en: 'Where on your body is the rash?',
        type: 'multiple_choice',
        options: ['Ansikt', 'Nakke', 'Bryst', 'Armer', 'Bein', 'Rygg', 'Mage'],
        required: true
      },
      {
        id: 'appearance',
        question_no: 'Hvordan ser utslettet ut?',
        question_en: 'What does the rash look like?',
        type: 'single_choice',
        options: ['Røde flekker', 'Elveblest', 'Små prikker', 'Store områder', 'Blemmer'],
        required: false
      },
      {
        id: 'itching',
        question_no: 'Klør det?',
        question_en: 'Is it itchy?',
        type: 'slider',
        min: 0,
        max: 10,
        unit: 'kløe',
        required: false
      }
    ],
    common_body_regions: ['Ansikt', 'Nakke', 'Bryst', 'Armer', 'Bein']
  },
  {
    category: 'skin',
    name_no: 'Kløe',
    name_en: 'Itching',
    icon: '🔴',
    severity_label_low_no: 'Lett kløe',
    severity_label_mid_no: 'Moderat kløe',
    severity_label_high_no: 'Intens kløe',
    display_order: 2,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor klør det?',
        question_en: 'Where does it itch?',
        type: 'multiple_choice',
        options: ['Ansikt', 'Armer', 'Bein', 'Rygg', 'Mage', 'Hele kroppen'],
        required: true
      },
      {
        id: 'onset',
        question_no: 'Når startet kløen?',
        question_en: 'When did the itching start?',
        type: 'time_since',
        required: true
      }
    ],
    common_body_regions: ['Ansikt', 'Armer', 'Bein', 'Rygg']
  },
  {
    category: 'skin',
    name_no: 'Hevelse',
    name_en: 'Swelling',
    icon: '🔴',
    severity_label_low_no: 'Lett hevelse',
    severity_label_mid_no: 'Tydelig hevelse',
    severity_label_high_no: 'Sterk hevelse',
    display_order: 3,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor er hevelsen?',
        question_en: 'Where is the swelling?',
        type: 'multiple_choice',
        options: ['Ansikt', 'Lepper', 'Tunge', 'Hender', 'Føtter', 'Ledd', 'Annet'],
        required: true
      },
      {
        id: 'onset',
        question_no: 'Når startet hevelsen?',
        question_en: 'When did the swelling start?',
        type: 'time_since',
        required: true
      }
    ],
    common_body_regions: ['Ansikt', 'Hender', 'Føtter']
  },
  {
    category: 'skin',
    name_no: 'Elveblest (urticaria)',
    name_en: 'Hives (urticaria)',
    icon: '🔴',
    severity_label_low_no: 'Noen få elveblest',
    severity_label_mid_no: 'Flere elveblest',
    severity_label_high_no: 'Utbredte elveblest',
    display_order: 4,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor er elveblestene?',
        question_en: 'Where are the hives?',
        type: 'multiple_choice',
        options: ['Ansikt', 'Nakke', 'Armer', 'Bein', 'Mage', 'Rygg', 'Flere steder'],
        required: true
      },
      {
        id: 'size',
        question_no: 'Hvor store er de?',
        question_en: 'How big are they?',
        type: 'single_choice',
        options: ['Små (< 1cm)', 'Medium (1-5cm)', 'Store (> 5cm)', 'Varierende størrelse'],
        required: false
      },
      {
        id: 'onset',
        question_no: 'Når oppsto de?',
        question_en: 'When did they appear?',
        type: 'time_since',
        required: true
      }
    ],
    common_body_regions: ['Ansikt', 'Armer', 'Bein', 'Torso']
  },

  // DIGESTIVE (Fordøyelse)
  {
    category: 'digestive',
    name_no: 'Magesmerter',
    name_en: 'Abdominal pain',
    icon: '🟡',
    severity_label_low_no: 'Lett ubehag',
    severity_label_mid_no: 'Moderate smerter',
    severity_label_high_no: 'Sterke smerter',
    display_order: 1,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor i magen har du vondt?',
        question_en: 'Where in your abdomen does it hurt?',
        type: 'single_choice',
        options: ['Øvre del', 'Midten', 'Nedre del', 'Hele magen', 'Venstre side', 'Høyre side'],
        required: true
      },
      {
        id: 'type',
        question_no: 'Hvordan føles smertene?',
        question_en: 'How does the pain feel?',
        type: 'single_choice',
        options: ['Kramper', 'Stikkende', 'Dunkende', 'Brennende', 'Trykkende'],
        required: false
      },
      {
        id: 'timing',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      }
    ],
    common_body_regions: ['Abdomen']
  },
  {
    category: 'digestive',
    name_no: 'Kvalme',
    name_en: 'Nausea',
    icon: '🟡',
    severity_label_low_no: 'Lett kvalme',
    severity_label_mid_no: 'Moderat kvalme',
    severity_label_high_no: 'Sterk kvalme',
    display_order: 2,
    is_active: true,
    follow_up_questions: [
      {
        id: 'onset',
        question_no: 'Når startet kvalmen?',
        question_en: 'When did the nausea start?',
        type: 'time_since',
        required: true
      },
      {
        id: 'trigger',
        question_no: 'Hva tror du utløste det?',
        question_en: 'What do you think triggered it?',
        type: 'single_choice',
        options: ['Mat', 'Lukt', 'Stress', 'Bevegelse', 'Vet ikke'],
        required: false
      }
    ]
  },
  {
    category: 'digestive',
    name_no: 'Diaré',
    name_en: 'Diarrhea',
    icon: '🟡',
    severity_label_low_no: 'Løs avføring',
    severity_label_mid_no: 'Tydelig diaré',
    severity_label_high_no: 'Vandig diaré',
    display_order: 3,
    is_active: true,
    follow_up_questions: [
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      },
      {
        id: 'frequency',
        question_no: 'Hvor ofte?',
        question_en: 'How often?',
        type: 'single_choice',
        options: ['1-2 ganger', '3-5 ganger', '6-10 ganger', 'Mer enn 10 ganger'],
        required: false
      }
    ]
  },
  {
    category: 'digestive',
    name_no: 'Oppblåsthet',
    name_en: 'Bloating',
    icon: '🟡',
    severity_label_low_no: 'Lett oppblåst',
    severity_label_mid_no: 'Tydelig oppblåst',
    severity_label_high_no: 'Veldig oppblåst',
    display_order: 4,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor føler du oppblåsthet?',
        question_en: 'Where do you feel bloating?',
        type: 'single_choice',
        options: ['Øvre mage', 'Midten', 'Nedre mage', 'Hele magen'],
        required: true
      },
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      }
    ]
  },
  {
    category: 'digestive',
    name_no: 'Oppkast',
    name_en: 'Vomiting',
    icon: '🟡',
    severity_label_low_no: 'Følelse av å måtte kaste opp',
    severity_label_mid_no: 'Kastet opp én gang',
    severity_label_high_no: 'Kastet opp flere ganger',
    display_order: 5,
    is_active: true,
    follow_up_questions: [
      {
        id: 'timing',
        question_no: 'Når kastet du opp?',
        question_en: 'When did you vomit?',
        type: 'time_since',
        required: true
      },
      {
        id: 'frequency',
        question_no: 'Hvor mange ganger?',
        question_en: 'How many times?',
        type: 'single_choice',
        options: ['Følelse, men ikke kastet opp', '1 gang', '2-3 ganger', '4+ ganger'],
        required: true
      }
    ]
  },

  // RESPIRATORY (Luftveier)
  {
    category: 'respiratory',
    name_no: 'Kortpustethet',
    name_en: 'Shortness of breath',
    icon: '🔵',
    severity_label_low_no: 'Lett andpustenhet',
    severity_label_mid_no: 'Tydelig kortpustet',
    severity_label_high_no: 'Vanskelig å puste',
    display_order: 1,
    is_active: true,
    follow_up_questions: [
      {
        id: 'onset',
        question_no: 'Når startet kortpustetheten?',
        question_en: 'When did the shortness of breath start?',
        type: 'time_since',
        required: true
      },
      {
        id: 'trigger',
        question_no: 'Når merker du det mest?',
        question_en: 'When do you notice it most?',
        type: 'single_choice',
        options: ['Hvile', 'Ved aktivitet', 'Når jeg ligger ned', 'Hele tiden'],
        required: false
      }
    ]
  },
  {
    category: 'respiratory',
    name_no: 'Tett nese',
    name_en: 'Nasal congestion',
    icon: '🔵',
    severity_label_low_no: 'Lett tett',
    severity_label_mid_no: 'Tydelig tett',
    severity_label_high_no: 'Helt tett',
    display_order: 2,
    is_active: true,
    follow_up_questions: [
      {
        id: 'sides',
        question_no: 'Hvilken side?',
        question_en: 'Which side?',
        type: 'single_choice',
        options: ['Begge', 'Venstre', 'Høyre', 'Veksler'],
        required: false
      },
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      }
    ]
  },
  {
    category: 'respiratory',
    name_no: 'Rennende nese',
    name_en: 'Runny nose',
    icon: '🔵',
    severity_label_low_no: 'Lett rennende',
    severity_label_mid_no: 'Moderat rennende',
    severity_label_high_no: 'Sterkt rennende',
    display_order: 3,
    is_active: true,
    follow_up_questions: [
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      }
    ]
  },
  {
    category: 'respiratory',
    name_no: 'Hosting',
    name_en: 'Coughing',
    icon: '🔵',
    severity_label_low_no: 'Sporadisk hoste',
    severity_label_mid_no: 'Hyppig hoste',
    severity_label_high_no: 'Kontinuerlig hoste',
    display_order: 4,
    is_active: true,
    follow_up_questions: [
      {
        id: 'type',
        question_no: 'Type hoste?',
        question_en: 'Type of cough?',
        type: 'single_choice',
        options: ['Tørr', 'Produktiv (med slim)', 'Pipende'],
        required: false
      },
      {
        id: 'onset',
        question_no: 'Når startet hosten?',
        question_en: 'When did the cough start?',
        type: 'time_since',
        required: true
      }
    ]
  },
  {
    category: 'respiratory',
    name_no: 'Hvesing',
    name_en: 'Wheezing',
    icon: '🔵',
    severity_label_low_no: 'Lett hvesing',
    severity_label_mid_no: 'Tydelig hvesing',
    severity_label_high_no: 'Sterk hvesing',
    display_order: 5,
    is_active: true,
    follow_up_questions: [
      {
        id: 'onset',
        question_no: 'Når startet hvesingen?',
        question_en: 'When did the wheezing start?',
        type: 'time_since',
        required: true
      }
    ]
  },

  // CARDIOVASCULAR (Hjerte/kar)
  {
    category: 'cardiovascular',
    name_no: 'Hjertebank',
    name_en: 'Palpitations',
    icon: '❤️',
    severity_label_low_no: 'Litt uregelmessig puls',
    severity_label_mid_no: 'Tydelig hjertebank',
    severity_label_high_no: 'Intens hjertebank',
    display_order: 1,
    is_active: true,
    follow_up_questions: [
      {
        id: 'onset',
        question_no: 'Når startet hjertebankingen?',
        question_en: 'When did the palpitations start?',
        type: 'time_since',
        required: true
      },
      {
        id: 'pattern',
        question_no: 'Hvordan føles det?',
        question_en: 'How does it feel?',
        type: 'single_choice',
        options: ['Rask puls', 'Uregelmessig', 'Hoppende', 'Bankende'],
        required: false
      }
    ]
  },
  {
    category: 'cardiovascular',
    name_no: 'Svimmelhet',
    name_en: 'Dizziness',
    icon: '❤️',
    severity_label_low_no: 'Lett svimmel',
    severity_label_mid_no: 'Moderat svimmel',
    severity_label_high_no: 'Veldig svimmel',
    display_order: 2,
    is_active: true,
    follow_up_questions: [
      {
        id: 'onset',
        question_no: 'Når ble du svimmel?',
        question_en: 'When did you get dizzy?',
        type: 'time_since',
        required: true
      },
      {
        id: 'trigger',
        question_no: 'Når merker du det mest?',
        question_en: 'When do you notice it most?',
        type: 'single_choice',
        options: ['Når jeg reiser meg', 'Når jeg står', 'Hele tiden', 'Ved hodebevegelser'],
        required: false
      }
    ]
  },
  {
    category: 'cardiovascular',
    name_no: 'Lavt blodtrykk',
    name_en: 'Low blood pressure',
    icon: '❤️',
    severity_label_low_no: 'Litt lavt',
    severity_label_mid_no: 'Moderat lavt',
    severity_label_high_no: 'Veldig lavt',
    display_order: 3,
    is_active: true,
    follow_up_questions: [
      {
        id: 'measured',
        question_no: 'Har du målt blodtrykket?',
        question_en: 'Have you measured your blood pressure?',
        type: 'single_choice',
        options: ['Ja', 'Nei'],
        required: false
      },
      {
        id: 'symptoms',
        question_no: 'Hva merker du?',
        question_en: 'What do you notice?',
        type: 'multiple_choice',
        options: ['Svimmelhet', 'Tretthet', 'Uklarhet', 'Kvalme'],
        required: false
      }
    ]
  },
  {
    category: 'cardiovascular',
    name_no: 'Rødming (flushing)',
    name_en: 'Flushing',
    icon: '❤️',
    severity_label_low_no: 'Lett rødhet',
    severity_label_mid_no: 'Tydelig rødhet',
    severity_label_high_no: 'Intens rødhet',
    display_order: 4,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor er rødmingen?',
        question_en: 'Where is the flushing?',
        type: 'multiple_choice',
        options: ['Ansikt', 'Nakke', 'Bryst', 'Armer', 'Hele overkroppen'],
        required: true
      },
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      }
    ]
  },

  // NEUROLOGICAL (Nevrologiske)
  {
    category: 'neurological',
    name_no: 'Hodepine',
    name_en: 'Headache',
    icon: '🧠',
    severity_label_low_no: 'Lett hodepine',
    severity_label_mid_no: 'Moderat hodepine',
    severity_label_high_no: 'Intens hodepine',
    display_order: 1,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor i hodet har du vondt?',
        question_en: 'Where in your head does it hurt?',
        type: 'multiple_choice',
        options: ['Pannen', 'Tinningene', 'Bakhodet', 'Hele hodet', 'Bak øynene'],
        required: true
      },
      {
        id: 'type',
        question_no: 'Hvordan føles hodepinen?',
        question_en: 'How does the headache feel?',
        type: 'single_choice',
        options: ['Dunkende', 'Stikkende', 'Trykkende', 'Brennende', 'Bankende'],
        required: false
      },
      {
        id: 'onset',
        question_no: 'Når startet hodepinen?',
        question_en: 'When did the headache start?',
        type: 'time_since',
        required: true
      }
    ],
    common_body_regions: ['Hode']
  },
  {
    category: 'neurological',
    name_no: 'Tåkete hode (brain fog)',
    name_en: 'Brain fog',
    icon: '🧠',
    severity_label_low_no: 'Litt tåkete',
    severity_label_mid_no: 'Moderat tåkete',
    severity_label_high_no: 'Veldig tåkete',
    display_order: 2,
    is_active: true,
    follow_up_questions: [
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      },
      {
        id: 'impact',
        question_no: 'Hvordan påvirker det deg?',
        question_en: 'How does it affect you?',
        type: 'multiple_choice',
        options: ['Vanskelig å tenke klart', 'Glemsomhet', 'Trøtthet', 'Forvirring'],
        required: false
      }
    ]
  },
  {
    category: 'neurological',
    name_no: 'Konsentrasjonsproblemer',
    name_en: 'Concentration problems',
    icon: '🧠',
    severity_label_low_no: 'Litt vanskelig',
    severity_label_mid_no: 'Moderat vanskelig',
    severity_label_high_no: 'Veldig vanskelig',
    display_order: 3,
    is_active: true,
    follow_up_questions: [
      {
        id: 'onset',
        question_no: 'Når merket du det?',
        question_en: 'When did you notice it?',
        type: 'time_since',
        required: true
      }
    ]
  },
  {
    category: 'neurological',
    name_no: 'Prikking/nummenhet',
    name_en: 'Tingling/numbness',
    icon: '🧠',
    severity_label_low_no: 'Lett prikking',
    severity_label_mid_no: 'Tydelig prikking',
    severity_label_high_no: 'Sterk prikking/nummenhet',
    display_order: 4,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor føler du prikking/nummenhet?',
        question_en: 'Where do you feel tingling/numbness?',
        type: 'multiple_choice',
        options: ['Hender', 'Føtter', 'Armer', 'Bein', 'Ansikt', 'Lepper'],
        required: true
      },
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      }
    ]
  },

  // MUSCULOSKELETAL (Muskel/skjelett)
  {
    category: 'musculoskeletal',
    name_no: 'Leddsmerter',
    name_en: 'Joint pain',
    icon: '🟢',
    severity_label_low_no: 'Lette smerter',
    severity_label_mid_no: 'Moderate smerter',
    severity_label_high_no: 'Sterke smerter',
    display_order: 1,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvilke ledd har vondt?',
        question_en: 'Which joints hurt?',
        type: 'multiple_choice',
        options: ['Fingre', 'Håndledd', 'Albuer', 'Skuldre', 'Knær', 'Ankel', 'Flere ledd'],
        required: true
      },
      {
        id: 'type',
        question_no: 'Hvordan føles smertene?',
        question_en: 'How does the pain feel?',
        type: 'single_choice',
        options: ['Stikkende', 'Dunkende', 'Stiv', 'Verk'],
        required: false
      },
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      }
    ],
    common_body_regions: ['Hender', 'Knær', 'Skuldre']
  },
  {
    category: 'musculoskeletal',
    name_no: 'Muskelsmerter',
    name_en: 'Muscle pain',
    icon: '🟢',
    severity_label_low_no: 'Lette smerter',
    severity_label_mid_no: 'Moderate smerter',
    severity_label_high_no: 'Sterke smerter',
    display_order: 2,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor i kroppen har du muskelsmerter?',
        question_en: 'Where in your body do you have muscle pain?',
        type: 'multiple_choice',
        options: ['Nakke', 'Skuldre', 'Rygg', 'Armer', 'Bein', 'Hele kroppen'],
        required: true
      },
      {
        id: 'type',
        question_no: 'Hvordan føles smertene?',
        question_en: 'How does the pain feel?',
        type: 'single_choice',
        options: ['Stikkende', 'Dunkende', 'Brennende', 'Stiv', 'Krampe'],
        required: false
      },
      {
        id: 'duration',
        question_no: 'Hvor lenge har du hatt smertene?',
        question_en: 'How long have you had the pain?',
        type: 'time_since',
        required: true
      },
      {
        id: 'notes',
        question_no: 'Andre detaljer? (valgfritt)',
        question_en: 'Any other details? (optional)',
        type: 'text',
        required: false
      }
    ],
    common_body_regions: ['Nakke', 'Skuldre', 'Rygg', 'Armer', 'Bein']
  },
  {
    category: 'musculoskeletal',
    name_no: 'Stivhet',
    name_en: 'Stiffness',
    icon: '🟢',
    severity_label_low_no: 'Lett stiv',
    severity_label_mid_no: 'Moderat stiv',
    severity_label_high_no: 'Veldig stiv',
    display_order: 3,
    is_active: true,
    follow_up_questions: [
      {
        id: 'location',
        question_no: 'Hvor føler du stivhet?',
        question_en: 'Where do you feel stiffness?',
        type: 'multiple_choice',
        options: ['Nakke', 'Rygg', 'Ledd', 'Hele kroppen'],
        required: true
      },
      {
        id: 'timing',
        question_no: 'Når er det verst?',
        question_en: 'When is it worst?',
        type: 'single_choice',
        options: ['På morgenen', 'Om kvelden', 'Etter aktivitet', 'Hele dagen'],
        required: false
      },
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      }
    ]
  },

  // SYSTEMIC (Systemiske)
  {
    category: 'systemic',
    name_no: 'Fatigue (utmattelse)',
    name_en: 'Fatigue',
    icon: '⚡',
    severity_label_low_no: 'Litt sliten',
    severity_label_mid_no: 'Moderat utmattet',
    severity_label_high_no: 'Fullstendig utmattet',
    display_order: 1,
    is_active: true,
    follow_up_questions: [
      {
        id: 'onset',
        question_no: 'Når startet utmattelsen?',
        question_en: 'When did the fatigue start?',
        type: 'time_since',
        required: true
      },
      {
        id: 'impact',
        question_no: 'Hvordan påvirker det deg?',
        question_en: 'How does it affect you?',
        type: 'multiple_choice',
        options: ['Vanskelig å komme i gang', 'Trenger hvile', 'Kan ikke gjøre vanlige ting', 'Må ligge'],
        required: false
      }
    ]
  },
  {
    category: 'systemic',
    name_no: 'Feber/frysninger',
    name_en: 'Fever/chills',
    icon: '⚡',
    severity_label_low_no: 'Lett forhøyet temperatur',
    severity_label_mid_no: 'Moderat feber',
    severity_label_high_no: 'Høy feber',
    display_order: 2,
    is_active: true,
    follow_up_questions: [
      {
        id: 'measured',
        question_no: 'Har du målt temperaturen?',
        question_en: 'Have you measured your temperature?',
        type: 'single_choice',
        options: ['Ja', 'Nei'],
        required: false
      },
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      }
    ]
  },
  {
    category: 'systemic',
    name_no: 'Angst',
    name_en: 'Anxiety',
    icon: '⚡',
    severity_label_low_no: 'Litt nervøs',
    severity_label_mid_no: 'Moderat angst',
    severity_label_high_no: 'Intens angst',
    display_order: 3,
    is_active: true,
    follow_up_questions: [
      {
        id: 'symptoms',
        question_no: 'Hva merker du?',
        question_en: 'What do you notice?',
        type: 'multiple_choice',
        options: ['Hjertebank', 'Uro', 'Bekymringer', 'Svetting', 'Kortpustethet'],
        required: false
      },
      {
        id: 'onset',
        question_no: 'Når startet det?',
        question_en: 'When did it start?',
        type: 'time_since',
        required: true
      }
    ]
  },
  {
    category: 'systemic',
    name_no: 'Søvnproblemer',
    name_en: 'Sleep problems',
    icon: '⚡',
    severity_label_low_no: 'Litt dårlig søvn',
    severity_label_mid_no: 'Moderat søvnproblemer',
    severity_label_high_no: 'Alvorlige søvnproblemer',
    display_order: 4,
    is_active: true,
    follow_up_questions: [
      {
        id: 'type',
        question_no: 'Hva slags søvnproblemer?',
        question_en: 'What kind of sleep problems?',
        type: 'multiple_choice',
        options: ['Vanskelig å sovne', 'Våkner om natten', 'Våkner tidlig', 'Urolig søvn'],
        required: true
      },
      {
        id: 'duration',
        question_no: 'Hvor lenge har du hatt dette?',
        question_en: 'How long have you had this?',
        type: 'single_choice',
        options: ['I natt', 'Noen dager', 'Denne uken', 'Lenger'],
        required: false
      }
    ]
  },
];

async function seedSymptomTemplates(force: boolean = false) {
  try {
    console.log('🌱 Seeding symptom templates...');

    // Check if templates already exist
    const existing = await db.select().from(symptomTemplates).limit(1);

    if (existing.length > 0) {
      if (!force) {
        console.log('⚠️  Symptom templates already exist. Skipping seed.');
        console.log('   Run with --force to delete and re-seed.');
        return;
      }

      console.log('🗑️  Deleting existing symptom templates...');
      await db.delete(symptomTemplates);
      console.log('✅ Existing templates deleted');
    }

    // Insert all templates
    const result = await db.insert(symptomTemplates).values(mcasSymptomTemplates).returning();

    console.log(`✅ Successfully seeded ${result.length} symptom templates`);
    console.log('\nTemplates by category:');

    const byCategory: Record<string, number> = {};
    result.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    });

    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} templates`);
    });

  } catch (error) {
    console.error('❌ Error seeding symptom templates:', error);
    throw error;
  }
}

// Run the seed
const forceFlag = process.argv.includes('--force');
seedSymptomTemplates(forceFlag)
  .then(() => {
    console.log('\n✨ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  });

export { seedSymptomTemplates };
