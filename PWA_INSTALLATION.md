# PWA Installation Guide / Installasjonsguide

## 📱 iOS (iPhone/iPad) - Safari

**Viktig:** iOS viser IKKE automatisk en installasjonsprompt. Du må legge til appen manuelt.

### Steg-for-steg:

1. **Åpne nettstedet i Safari**
   - Gå til: `https://mcas-life.greger.cc`
   - **MÅ** bruke Safari (ikke Chrome eller annen nettleser)

2. **Trykk på Del-knappen** (Share)
   - Ikonet nederst i midten (firkant med pil oppover)

3. **Velg "Legg til på Hjem-skjerm"** (Add to Home Screen)
   - Scroll ned i delingsmenyen
   - Velg ikonet med pluss-tegn

4. **Bekreft**
   - Appen vil nå ligge på hjemskjermen din
   - Åpne den som en vanlig app!

### Sjekkliste for iOS:
- ✅ Bruker Safari (ikke Chrome)
- ✅ Besøkt https://mcas-life.greger.cc
- ✅ Fulgt "Del → Legg til på Hjem-skjerm"
- ✅ Appen ligger nå på hjemskjermen

---

## 🤖 Android - Chrome/Edge/Samsung Internet

Android viser automatisk en installasjonsprompt når du besøker nettstedet.

### Automatisk metode:

1. **Åpne nettstedet**
   - Gå til: `https://mcas-life.greger.cc`

2. **Se etter prompt**
   - En banner nederst på skjermen vises automatisk
   - "Installer MCAS-Life?"

3. **Trykk "Installer"**
   - Appen installeres automatisk

### Manuell metode (hvis ingen prompt):

1. **Åpne Chrome-menyen** (tre prikker øverst til høyre)
2. **Velg "Legg til på startskjermen"** eller "Installer app"
3. **Bekreft**

---

## 🖥️ Desktop (Windows/Mac/Linux)

### Chrome, Edge, Brave:

1. **Åpne nettstedet**
   - Gå til: `https://mcas-life.greger.cc`

2. **Se i adresselinjen**
   - Et installasjon-ikon (⊕) vises til høyre

3. **Klikk på ikonet**
   - Velg "Installer"

4. **Appen åpnes i eget vindu**

### Safari (Mac):

Følg samme prosedyre som for iOS ovenfor.

---

## ❓ Feilsøking

### "Jeg ser ingen installasjonsprompt på Android"

**Løsning:**
1. Sjekk at du bruker Chrome eller en Chromium-basert nettleser
2. Prøv manuell metode (Chrome-meny → Legg til på startskjermen)
3. Tøm nettleser-cache og prøv igjen
4. Sjekk at nettstedet er lastet over HTTPS

### "Jeg kan ikke finne 'Legg til på Hjem-skjerm' på iOS"

**Løsning:**
1. **Sjekk at du bruker Safari** (ikke Chrome eller annen nettleser!)
2. Trykk på Del-knappen (firkant med pil oppover) nederst i Safari
3. Scroll NED i delingsmenyen - "Legg til på Hjem-skjerm" er ofte lenger nede
4. Hvis du ikke ser den, scroll til "Rediger handlinger" og aktiver den

### "Appen fungerer ikke offline"

**Løsning:**
1. Åpne appen mens du har internett først gang
2. Service Worker må registreres (skjer automatisk første gang)
3. Besøk noen sider i appen (Dashboard, SIGHI-søk, etc.)
4. Data caches automatisk for offline-bruk

---

## 🎯 PWA-funksjoner

### Når appen er installert:

✅ **Fungerer offline** - SIGHI-database og tidligere data tilgjengelig uten nett
✅ **Eget app-ikon** - På hjemskjermen som en vanlig app
✅ **Ingen nettleser-UI** - Ingen adresselinje eller nettleser-knapper
✅ **Push-varsler** (kommer senere) - Får varsler for symptom-oppfølging
✅ **Rask lasting** - Data caches lokalt for raskere åpning
✅ **Automatiske oppdateringer** - Appen oppdateres automatisk når nye versjoner kommer

---

## 📋 Teknisk informasjon

### Krav:
- **iOS:** Safari 11.3+, iOS 11.3+
- **Android:** Chrome 76+, Android 5.0+
- **Desktop:** Chrome 76+, Edge 79+, Safari 14+

### PWA-standard:
- Web App Manifest (manifest.json)
- Service Worker for offline-støtte
- HTTPS (sikker tilkobling)
- Ikoner: 128x128, 192x192, 512x512

### Ikonproduksjon:
For iOS trenger du også å lage en 192x192 PNG-fil:
```bash
# Eksempel med ImageMagick
convert pwa-512x512.png -resize 192x192 pwa-192x192.png
```

---

## 💡 Tips

### For beste opplevelse:

1. **Installer appen** - Bruk som vanlig app fra hjemskjermen
2. **Logg inn** - Hold deg innlogget for raskere tilgang
3. **Aktiver lokasjon** - For automatisk værhenting ved symptomlogging
4. **Besøk offline først** - Åpne appen med internett først gang for å laste ned SIGHI-database

---

Trenger du hjelp? Kontakt support eller se dokumentasjon på GitHub.
