# 🩺 MCAS-Life Symptom Tracking Features - Fase 5

## Oversikt

Komplett symptomregistrering med medisinsk-grade body mapping og one-tap shortcuts for akutte symptomer. Implementert 25. desember 2024.

## ✨ Nye Funksjoner

### 1. **Interaktiv SVG Body Map**
[`BodyMap.tsx`](frontend/src/components/Symptoms/BodyMap.tsx)

**Funksjoner:**
- ✅ Interaktiv anatomisk body map (front/back view)
- ✅ Multi-select support - velg flere kroppsområder samtidig
- ✅ 24 kroppsregioner inkludert:
  - Hode/nakke (head, face, neck)
  - Torso (chest_left, chest_right, upper_abdomen, lower_abdomen)
  - Armer (shoulders, upper_arms, forearms, hands)
  - Ben (thighs, knees, lower_legs, feet)
  - Rygg (upper_back, lower_back)
- ✅ Visuell feedback med hover-states
- ✅ Real-time oppdatering av valgte områder
- ✅ Responsive design for mobile og desktop

**Bruk:**
```tsx
import { BodyMap } from '../../components/Symptoms/BodyMap';

<BodyMap
  selectedRegions={bodyRegions}
  onChange={(regions) => setBodyRegions(regions)}
  multiSelect={true}
  showLabels={true}
/>
```

### 2. **Critical Symptom Shortcuts**
[`CriticalSymptomShortcuts.tsx`](frontend/src/components/Symptoms/CriticalSymptomShortcuts.tsx)

**Anafylaktiske symptomer** (Akutt - 5 sekunders registrering):
- 🚨 Tunge i halsen (severity 9)
- 🫁 Pustevansker (severity 8)
- ❤️ Hjertebank (severity 8)
- 📉 Blodtrykksfall (severity 9)

**Vanlige MCAS-symptomer:**
- 🧠 Hodepine (severity 6)
- ⚡ Kløe (severity 5)
- 💧 Urtikaria (severity 6)
- 🤢 Kvalme (severity 5)
- 🌫️ Hjerneteåke (severity 5)
- 🌡️ Rødming (severity 4)

**Funksjoner:**
- One-tap registrering for akutte symptomer
- Pre-definert severity basert på symptomtype
- Visual feedback (loading, success)
- Emergency badge for kritiske symptomer
- Automatisk lagring med minimal data

### 3. **Forbedret Symptom Registration Flow**
[`SymptomAddPage.tsx`](frontend/src/pages/Symptoms/SymptomAddPage.tsx)

**To registreringsmetoder:**

#### **Rask registrering (5 sekunder)**
- Perfekt for akutte situasjoner
- One-tap på vanlige symptomer
- Minimal data - kun essensielt
- Ideelt ved anafylakse

#### **Detaljert logging (2-3 minutter)**
1. Velg symptomkategori (8 kategorier)
2. Marker kroppsområder på body map
3. Velg symptomtype eller skriv inn custom
4. Sett alvorlighet (1-10 slider)
5. Legg til notater (valgfritt)

**8 symptomkategorier:**
- 🔴 **Hud**: Kløe, urtikaria, rødming
- 🥄 **Fordøyelse**: Kvalme, magesmerter, diaré
- 🫁 **Luftveier**: Pustevansker, hoste
- ❤️ **Hjerte/kar**: Hjertebank, blodtrykk
- 🧠 **Nervesystem**: Hodepine, hjerneteåke
- 💪 **Muskel/skjelett**: Leddsmerter, svakhet
- 🔵 **Urinveier**: Blærebetennelse
- ⚡ **Systemisk**: Tretthet, feber

## 📊 Database-integrasjon

### Nye felter i `symptom_entries`-tabellen:
```sql
body_regions: JSONB       -- Array av body region IDs
intensity_change: VARCHAR -- 'improving' | 'worsening' | 'stable'
capture_method: ENUM      -- 'quick' | 'detailed' | 'retrospective'
enrichment_status: ENUM   -- 'minimal' | 'partial' | 'complete'
```

### API Endpoints:
- `POST /api/symptoms` - Opprett nytt symptom
- `GET /api/symptoms?limit=10` - Hent symptomer
- `GET /api/symptoms/risk-factors` - Risikoanalyse

## 🎨 UI/UX Forbedringer

### Visuell Design:
- HIPAA-grade medical UI
- Fargekodet severity (grønn → gul → rød)
- Smooth animations og transitions
- Loading states og success feedback
- Error handling med brukervennlige meldinger

### Accessibility:
- Keyboard navigation support
- ARIA labels for screen readers
- Touch-friendly targets (min 44x44px)
- Clear visual focus indicators

## 🔗 Navigasjon

**Nye routes:**
- `/symptoms` - Symptomlogg oversikt
- `/symptoms/add` - Ny forbedret symptomregistrering (anbefalt)
- `/symptoms/register` - Legacy registration flow

## 🚀 Implementasjonsdetaljer

### Teknologier:
- **React 18** med TypeScript
- **Lucide React** for ikoner
- **Tailwind CSS** for styling
- **SVG** for body map
- **React Router** for navigasjon

### Komponent-struktur:
```
frontend/src/
├── components/Symptoms/
│   ├── BodyMap.tsx                    ✨ NY
│   ├── CriticalSymptomShortcuts.tsx   ✨ NY
│   ├── SymptomRegistrationFlow.tsx    (Eksisterende)
│   └── index.ts                        (Oppdatert)
├── pages/Symptoms/
│   ├── SymptomAddPage.tsx             ✨ NY
│   ├── SymptomLogPage.tsx             (Oppdatert)
│   └── SymptomRegistrationPage.tsx    (Legacy)
└── types/
    └── shared.ts                       (Oppdatert)
```

## 📈 Neste steg

### Prioritet 1 - AI Correlation:
- [ ] Koble symptomer til 72-timers AI-analyse
- [ ] Vise trigger-korrelasjoner i symptomlogg
- [ ] Personaliserte anbefalinger basert på mønstre

### Prioritet 2 - Advanced Features:
- [ ] Photo documentation for hudreaksjoner
- [ ] Voice input ("Jeg har hodepine, alvorlighet 7")
- [ ] Timeline view av symptomer
- [ ] Export til medisinsk rapport (PDF/Excel)

### Prioritet 3 - Optimalisering:
- [ ] Offline sync for symptomer
- [ ] Push notifications for oppfølging
- [ ] Gamification av daglig logging

## 🧪 Testing

### Manuell testing checklist:
- [ ] Rask registrering - klikk på anafylaktisk symptom
- [ ] Detaljert registrering - fullfør hele flyten
- [ ] Body map - velg flere kroppsområder
- [ ] Velg custom symptomtype
- [ ] Test både front og back body view
- [ ] Verifiser lagring i database
- [ ] Test på mobile enheter

### Automatisert testing:
```bash
cd frontend
npm run test -- BodyMap
npm run test -- CriticalSymptomShortcuts
npm run test -- SymptomAddPage
```

## 📚 Dokumentasjon

**For utviklere:**
- Se [`CLAUDE.md`](CLAUDE.md) for full prosjektoversikt
- Backend API: [`backend/src/services/symptoms/`](backend/src/services/symptoms/)
- Database schema: [`backend/src/db/schema.ts`](backend/src/db/schema.ts)

**For brukere:**
- In-app onboarding (kommer)
- Tooltips og hjelpetekster
- Demo-video (kommer)

## 🎯 Suksessmålinger

**Funksjonelle mål:**
- ✅ 5-sekunders registrering for akutte symptomer
- ✅ Komplett anatomisk body mapping
- ✅ 10 kritiske symptomer med one-tap
- ✅ Mobile-first responsive design

**Tekniske mål:**
- ✅ TypeScript type safety
- ✅ Component reusability
- ✅ API integration komplett
- ⏳ <100ms response time (må verifiseres)
- ⏳ Offline-støtte (neste fase)

## 💡 Design-beslutninger

**Hvorfor SVG body map?**
- Skalerbar til alle skjermstørrelser
- Lavt dataforbruk
- Medisinsk-grade presisjon
- Enkel å vedlikeholde og oppdatere

**Hvorfor one-tap shortcuts?**
- Kritisk ved anafylakse - ingen tid til detaljert logging
- Reduserer cognitive load ved akutte symptomer
- Følger best practices fra medisinsk-apps

**Hvorfor to registreringsmetoder?**
- Flexibility - brukere har ulike behov
- Quick for emergencies, detailed for analysis
- Gradvis onboarding - start enkelt, gå dypere senere

---

**Status**: ✅ Fullført Fase 5 - Symptomregistrering
**Neste**: Fase 6 - AI Correlation og Trigger Analysis
**Utviklet av**: Claude Sonnet 4.5 (25. desember 2024)
