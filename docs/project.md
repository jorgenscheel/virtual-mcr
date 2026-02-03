# IP Video Matrix for Journalists

**Status:** 💡 Idé → 🔍 Research
**Opprettet:** 2026-02-02
**Selskap:** Remote Production AS
**Kontekst:** Forenkle IP-video for ikke-tekniske brukere i live-produksjon

---

## Problemet

Journalister og ikke-tekniske produksjonsfolk møter en høy terskel når de skal bruke IP-videostrømmer i live-produksjon:

- De får en **URL, RTMP-adresse, SRT-detaljer** osv. — og aner ikke hva de skal gjøre med det
- Å sette opp en ny kilde i **vMix** krever teknisk forståelse av protokoller, porter, og konfigurering
- Selv å bytte mellom **kjente signaler** (som finnes som presets) er tungvint
- Resultatet: teknisk person må alltid være tilgjengelig, eller ting stopper opp

**Kjernefrustrasjon:** "Jeg vil bare se bildet og velge det — ikke konfigurere IP-transport."

---

## Løsningskonsept: Virtuell Videomatrise

### Brukeropplevelse (journalistens perspektiv)

- En **"videomatrise"** med mange innganger og **2 utganger**
- Utgangene ligger **alltid synlige** på skjermer og i vMix som NDI-kilder
- **StreamDeck** (nettverksbasert) brukes til å velge hvilken inngang som skal til hvilken utgang
- Brukeren trykker én knapp → bildet bytter. Ferdig.
- **Automatisk opptak** av begge utganger via Intinor

### Hva brukeren IKKE trenger å vite

- Hvilken protokoll kilden bruker (SRT, RTMP, Bifrost, NDI, HLS...)
- IP-adresser, porter, eller konfigurasjonsdetaljer
- Hvordan Intinor, vMix eller NDI fungerer teknisk

---

## Teknisk arkitektur

### Overordnet signalflyt

```
INNGANGER (mange)                    MATRISE                     UTGANGER (2)
─────────────────                    ──────                      ────────────

┌─────────────────┐                                           ┌──────────────┐
│ SRT-strøm #1    │──┐                                        │ UTGANG A     │
├─────────────────┤  │                                        │  → NDI       │
│ SRT-strøm #2    │──┤                                        │  → Monitor   │
├─────────────────┤  │    ┌────────────────────┐              │  → vMix      │
│ RTMP-strøm      │──┤    │                    │              │  → Opptak    │
├─────────────────┤  ├───▶│  Intinor Router    ├─────────────▶│              │
│ Bifrost-kilde   │──┤    │  (2 output-kjeder) │              └──────────────┘
├─────────────────┤  │    │                    │
│ NDI-kilde       │──┤    │  Styrt via API     │              ┌──────────────┐
├─────────────────┤  │    └────────────────────┘              │ UTGANG B     │
│ HLS/URL         │──┤              ▲                          │  → NDI       │
├─────────────────┤  │              │                          │  → Monitor   │
│ Presets...       │──┘              │                          │  → vMix      │
└─────────────────┘          ┌──────┴───────┐                 │  → Opptak    │
                             │  StreamDeck   │                 │              │
                             │  Controller   │                 └──────────────┘
                             └──────────────┘
```

### Komponenter

#### 1. Intinor Direkt Router — Kjernen
- **2 dedikerte output-kjeder** (A og B) som alltid kjører
- Støtter alle protokoller som input: SRT, Bifrost, RTMP, NDI, RTP
- **API-styrt** — skriver IP-input parametre programmatisk
- Automatisk opptak av begge kjeder

> **⚠️ Viktig arkitekturbeslutning (2026-02-02):**
> Vi bruker IKKE Intinors innebygde routing for å bytte mellom forhåndskonfigurerte inputs.
> I stedet **omprogrammerer vi selve IP-input variablene** (protokoll, IP, port, stream-key etc.)
> direkte via API. Routerens input-slot er bare et "vindu" vi peker mot forskjellige kilder.
>
> **Hvorfor:** Intinors innebygde router er begrenset til å velge mellom de 6 pre-konfigurerte
> IP stream inputs. Ved å skrive input-parametrene dynamisk kan vi ha **ubegrenset antall
> presets** i vårt eget kontrollag — bare 1-2 input-slotter brukes aktivt om gangen.

#### 2. NDI Output
- Intinor Router outputter til NDI (direkte eller via encoder/decoder)
- NDI-strømmene er synlige i vMix og på dedikerte monitorer
- Alltid tilgjengelige — journalisten trenger aldri å "sette opp" en kilde i vMix
- Bruker VLAN 4010 (video backbone) per standard arkitektur

#### 3. StreamDeck Controller
- ⏳ *Research pågår separat — StreamDeck 7.1 API + vertsmaskinkrav*

#### 4. Preset Management / Kilde-database
- **Ekstern database** (ikke Intinors profiler) — holder alle kjente kilder med:
  - Visuelt navn: "Studio Aker Brygge", "Mobilreporter Jørgen"
  - Tekniske detaljer: protokoll, IP, port, stream-key, passphrase etc.
  - Thumbnail/ikon for StreamDeck-knapp
- Administrert av teknisk personell — journalist ser bare navn + bilde
- Kan legge til nye presets uten å forstyrre pågående produksjon
- Når journalist velger kilde → kontroll-laget skriver parametrene til Intinor input-slot via API

---

## 🔬 Research: Intinor Direkt API (2026-02-02)

### Hovedfunn: Intinor har FULL REST API ✅

Intinor uttaler selv: **"Our entire web interface is built on our API"** — all funksjonalitet i webgrensesnittet er tilgjengelig via API. API-et er **gratis** å bruke.

### API-detaljer

| Egenskap | Verdi |
|----------|-------|
| **Type** | REST API over HTTPS |
| **Base URL** | `https://<host>/api/v1/units/<DIREKT_ID>/` |
| **Autentisering** | HTTP Basic Auth |
| **Respons** | JSON |
| **Tilgang** | Direkte til enhet ELLER via ISS (cloud proxy) |
| **Kildekode** | github.com/intinor/direkt_api_tutorial (Python, MIT) |
| **Protokoller** | REST, Ember+ (VSM-integrasjon) |
| **IDM** | Intinor Direkt Management — ny web-UI fra firmware 4.23.0 |

### API-endepunkter bekreftet

Fra offisielle eksempler og Skaarhoj tally-koden:

| Endepunkt | Metode | Beskrivelse | Relevans |
|-----------|--------|-------------|----------|
| `/api/v1/units/<id>/` | GET | API root, enhetsinformasjon | Setup |
| `?include=network_inputs,video_inputs` | GET | Liste alle nettverks- og videoinnganger | ⭐ **Kjernen** — viser alle tilgjengelige kilder |
| `/video_mixers/0/settings` | GET | Hent gjeldende program/preview-kilder | ⭐ **Kjernen** — les aktiv tilstand |
| `/video_mixers/0/settings` | PUT/PATCH | Bytt program/preview-kilde | ⭐ **Kjernen** — input-switching! |
| Thumbnail endpoint | GET | Last ned preview-bilde fra videoinput | ⭐ Preview-bilder for StreamDeck |
| Recording endpoints | PUT | Start/stopp opptak | ⭐ Automatisk opptak |
| Status endpoints | GET | Bitrate, statistikk, sanntid | Overvåkning |
| Reboot/shutdown | POST | Restart/steng enheten | Admin |

### Video Mixer — Nøkkelfunn

Intinor Direkt Router har en **innebygd videomikser** med **Program** og **Preview** busser:

```python
# Fra Skaarhoj tally-eksempelet — reell API-respons:
resp = session.get(rootURL + "video_mixers/0/settings")
program = resp.json()["program"]["layers"][0]["input"]["source"]  # href til aktiv kilde
preview = resp.json()["preview"]["layers"][0]["input"]["source"]  # href til preview-kilde
```

**Hver input har en unik `href`** som brukes som referanse ved switching. Alle nettverks- og videoinnganger listes via:

```python
resp = session.get(rootURL + "?include=network_inputs,video_inputs")
network_inputs = resp.json()["network_inputs"]["network_inputs"]  # liste med {href, name}
video_inputs = resp.json()["video_inputs"]["video_inputs"]        # liste med {href, name}
```

### Eksisterende Stream Deck-integrasjon ✅

Intinor har allerede en **offisiell Elgato Stream Deck plugin**:
- PDF-guide: intinor.com/wp-content/uploads/2020/06/Intinor-Direkt-plugin-for-Elgato-Stream-Deck-1-col.pdf
- Plugin bundle: intinor.com/wp-content/uploads/2020/06/com.intinor.direkt.streamDeckPlugin

### Referansecase: Telebasel

Telebasel (Sveitsisk TV) bruker Intinor API til nøyaktig vårt brukstilfelle:
> *"The Intinor API allows us to create an application-targeted browser user interface for our live streaming team. The target was to start & stop live streams through a web interface without the need for a technician."*
> — Roman Wälti, CTO, Telebasel

### Firmware-krav

Siste stabile: **4.23.0** (desember 2025) inkluderer:
- IDM som standard lokal UI
- SRT-strømstatistikk
- Multiple SRT listeners per kilde
- RTP-over-SRT med SMPTE 2022-7

---

## Vurdering: Hva Intinor API dekker vs. hva som må verifiseres

### ✅ Bekreftet dekket

| Krav | API-dekning |
|------|-------------|
| Programmatisk input-switching | ✅ `video_mixers/0/settings` — program/preview |
| Støtte for alle protokoller | ✅ SRT, RTMP, Bifrost, NDI, RTP, UDP, TCP |
| Preview-thumbnails | ✅ Dedikert thumbnail-endepunkt |
| Opptak start/stopp | ✅ Recording API |
| Navngi/beskriv innganger | ✅ Set video input description (eksempel 3) |
| Sanntidsstatus | ✅ Bitrate og status feed (eksempel 6) |
| Profiler/presets | ✅ Save/load profiler via web og API |
| Stream Deck-integrasjon | ✅ Offisiell plugin finnes allerede |
| Ember+ (VSM) | ✅ For profesjonell broadcast-kontroll |
| Cloud-tilgang via ISS | ✅ API tilgjengelig gjennom ISS proxy |

### ⚠️ Må verifiseres med faktisk enhet

| Spørsmål | Hvorfor viktig | Forslag til test |
|----------|---------------|-----------------|
| **Kan vi skrive IP-input parametre via API?** | ⭐ KJERNEKRAV — vi omprogrammerer input-slotten, ikke bare velger mellom dem | Test PUT/PATCH på `network_inputs` med nye SRT/RTMP-detaljer |
| **Latens ved input-omskriving** | Hvor lang tid tar det fra API-kall til nytt bilde? | PoC-test: skriv ny SRT-URL, mål tid til lock |
| **2 uavhengige output-kjeder?** | Vi trenger A og B separat | Test om Router har 2+ uavhengige output-kjeder, eller om vi trenger 2 Routere |
| **Glitch/svartbilde ved bytte?** | Brukeropplevelse | Test om det er clean switch eller om bildet dropper |
| **NDI output via API** | Kan NDI-output konfigureres programmatisk? | Sjekk om NDI-relaterte endepunkter finnes |
| **2 Routere nødvendig?** | Alternativ: 1 Router per output-kjede | Kan være enklere arkitektur |

### 💡 Arkitekturalternativ: 2x Intinor Router

Hvis én Router kun har 1 videomikser-bus, kan vi bruke **2 Routere**:

```
                    ┌─────────────────┐
Alle kilder ───────▶│ Router A (PGM)  ├──▶ NDI Utgang A → vMix, Monitor, Opptak
                    └─────────────────┘
                    ┌─────────────────┐
Alle kilder ───────▶│ Router B (PGM)  ├──▶ NDI Utgang B → vMix, Monitor, Opptak
                    └─────────────────┘
                              ▲
                    ┌─────────┴─────────┐
                    │  Kontroll-lag      │
                    │  (StreamDeck API)  │
                    └───────────────────┘
```

Fordeler med 2 Routere:
- Enklere — hver Router har én jobb
- Uavhengige opptakskjeder
- Redundans — om én dør, fungerer den andre
- Skalerbar — legg til flere utganger etter behov

---

## Signalflyt — detaljert

```
Kilde (f.eks. SRT) 
    → Intinor Router (input-velger via API)
        → Intinor output (alltid aktiv)
            → NDI (via Direkt Receiver eller direkte)
                → vMix (NDI-kilde, alltid tilkoblet)
                → Fysisk monitor (via NDI monitor/decoder)
                → Intinor opptak (automatisk)
```

**Nøkkelprinsipp:** Output-kjeden er **statisk** — den endrer seg aldri. Det eneste som endrer seg er **IP-input parametrene** (protokoll, IP, port etc.) som skrives til input-slotten via API.

---

## Åpne spørsmål

### Teknisk — Intinor
- [x] ~~Har Intinor Router API for programmatisk bytte av input?~~ ✅ JA — full REST API
- [x] ~~Preview-thumbnails — kan vi hente dem fra Intinor?~~ ✅ JA — thumbnail API
- [x] ~~Opptak start/stopp via API?~~ ✅ JA
- [ ] Latens ved input-bytte — er det glatt nok for live? (glitch/svartbilde?)
- [ ] NDI output fra Router: direkte, eller via Direkt Receiver?
- [ ] Trenger vi en mellomliggende encoder/transcoder for noen protokoller?
- [ ] Kan Intinor Router håndtere mange samtidige inputs (10+)? (manual sier 6)
- [ ] Støtter Router 2 uavhengige output-mikser-busser, eller trenger vi 2 enheter?
- [ ] Firmware-versjon på våre enheter — er vi på 4.23.0+?

### StreamDeck / Kontroll — NESTE RESEARCH-OPPGAVE
- [ ] StreamDeck 7.1 nytt API — hva kan det?
- [ ] Trenger vi en "vertsmaskin"? Windows VM?
- [ ] Intinor har allerede offisiell Stream Deck plugin — er den brukbar som utgangspunkt?
- [ ] Nettverks-StreamDeck vs. lokal USB?

### Bruk / UX
- [ ] Skal journalist kunne legge til nye kilder selv, eller kun velge fra presets?
- [ ] Trenger vi mer enn 2 utganger? (start med 2, skaler senere)
- [ ] Navngivning og organisering av presets — kategorier?
- [ ] Alarmering: hva skjer om en kilde faller ut?

### Forretning
- [ ] Hvem er målgruppe? (interne brukere, kunder, begge?)
- [ ] Prismodell for kunder? (månedlig, per produksjon?)
- [ ] Kan dette bli et produkt/tjeneste vi tilbyr?

---

## 🚀 Prosjektoppstart

**Repo:** [github.com/jorgenscheel/virtual-mcr](https://github.com/jorgenscheel/virtual-mcr)
**Status:** 🔍 Research → 🛠️ Utvikling
**Oppstart:** 2026-02-03
**Tilnærming:** Inkrementell — en bit om gangen gjennom kjeden

---

### Fase 1: Stream Deck Discovery & Backend Requirements

**Mål:** Utforske Stream Deck SDK 7.1 og definere hva som trengs som backend for en mest mulig standalone Stream Deck.

**Forutsetninger:**
- Stream Deck med PoE (nettverksbasert)
- Fast IP via UniFi på dedikert VLAN for kontrollere
- Tilgjengelig via VLAN 1513 (management/kontroll)

**Oppgaver:**
- [ ] Research Stream Deck SDK 7.1 — plugin-arkitektur, kommunikasjonsmodell, WebSocket API
- [ ] Kartlegg hva en Stream Deck plugin kan gjøre standalone vs. hva som krever en backend/host
- [ ] Prototype: Minimal plugin som kommuniserer med en ekstern backend over nettverket
- [ ] Definer backend-krav: Hva må backkenden tilby? (kildeliste, preview-bilder, Intinor API-proxy)
- [ ] UniFi nettverksoppsett: VLAN-profil for kontrollere, fast IP-tildeling, brannmurregler mot VLAN 1513
- [ ] Evaluer om Intinors eksisterende Stream Deck plugin kan gjenbrukes eller forkes

**Leveranse:** Teknisk vurdering av Stream Deck som kontrollenhet + definert backend-kontrakt

---

### Fase 2: Source Management Application

**Mål:** Utvikle applikasjonen som håndterer alle kilder — definisjon, preview, og lagring som Intinor-kompatible parametre.

**Oppgaver:**
- [ ] Definer kildeskjema: navn, protokoll (RTMP/HLS/SRT/Bifrost/NDI), URL, port, stream-key, passphrase, thumbnail
- [ ] Bygge REST API for CRUD på kilder (opprett, les, oppdater, slett)
- [ ] Preview-funksjon: hent live thumbnail fra kilde (ffmpeg snapshot eller Intinor thumbnail API)
- [ ] Mapping-lag: konverter kildedefinisjon → Intinor IP Input / Video Input parametre
- [ ] Persistent lagring av kildebibliotek (database/JSON)
- [ ] Admin-UI for å administrere kildebiblioteket (teknisk personell)
- [ ] Stream Deck-integrasjon: kildeliste + thumbnails tilgjengelig for plugin fra Fase 1

**Leveranse:** Fungerende kildebibliotek med API, preview, og Intinor-parameter-mapping

---

### Fase 3: Intinor Control Component

**Mål:** Utvikle komponenten som faktisk utfører endringen på Intinor-ressursen (IP Input eller Video Input) via API.

**Oppgaver:**
- [ ] Intinor API-klient: autentisering, feilhåndtering, retry-logikk
- [ ] Skriv IP Input-parametre (protokoll, IP, port, stream-key) via REST API
- [ ] Skriv Video Input-parametre der relevant
- [ ] Verifiser reconnect-tid: mål latens fra API-kall til nytt bilde er låst
- [ ] Håndter switching-logikk: output A og B uavhengig
- [ ] Statusovervåkning: bekreft at kilde er aktiv etter switching (bitrate, lock-status)
- [ ] Feilhåndtering: hva skjer hvis kilden ikke svarer? Fallback? Varsling?
- [ ] End-to-end test: Stream Deck → Backend → Intinor API → verifiser NDI-output

**Leveranse:** Fungerende kontrollkomponent som omprogrammerer Intinor inputs on-the-fly

---

### Fremtidige faser (etter PoC)
- Brukertest med journalist
- Automatisk opptak ved kilde-switch
- Alarmering og overvåkning
- Multi-site / cloud-styring via ISS
- Skalering til flere utganger

---

## Neste steg

1. ~~**Verifisere Intinor Router API-kapabilitet**~~ ✅ BEKREFTET
2. **→ Fase 1: Stream Deck SDK 7.1** — starte med discovery og backend-krav
3. **Sjekk firmware på våre enheter** — trenger vi oppgradering?
4. **Kontakte Intinor support** — spør om 2 uavhengige output-busser, maks inputs
5. **PoC med 2 kilder og 1 utgang** — minimal fungerende demo
6. **Brukertest med journalist** — er det intuitivt nok?

---

## Ressurser og referanser

### Intinor API
- **GitHub Tutorial:** https://github.com/intinor/direkt_api_tutorial (Python, MIT)
- **Skaarhoj Tally Python:** https://intinor.com/guides/Skaarhoj_Direkt_tally.py
- **Tally Guide PDF:** https://intinor.com/wp-content/uploads/2020/01/Skaarhoj_tally_Intinor_videomixer.pdf
- **Stream Deck Plugin:** https://intinor.com/wp-content/uploads/2020/06/com.intinor.direkt.streamDeckPlugin
- **Stream Deck Guide:** https://intinor.com/wp-content/uploads/2020/06/Intinor-Direkt-plugin-for-Elgato-Stream-Deck-1-col.pdf
- **API Solutions Page:** https://intinor.com/solutions-for-scheduling-and-automation/

### Intinor Produkter
- **IDM (Direkt Management):** https://intinor.com/products/idm-intinor-direkt-management/
- **Direkt Router:** https://intinor.com/products/direkt-router/
- **Firmware 4.23.0:** https://intinor.com/new-stable-4-23-0/
- **Manualer:** https://intinor.com/user-guides/

### Arkitektur-skills
- [[ea-network-intinor]] — Intinor-konfigurasjon og deployment
- [[ea-network-ndi]] — NDI-nettverksarkitektur (VLAN 4010)

### Case Studies
- **Telebasel** — API-basert journalist-UI uten tekniker
- **Digital Azul / GCTV** — Remote production med Intinor Router

---

*Idé av Jørgen Scheel, 2. februar 2026. Dokumentert i samarbeid med Jorbot.*
*API-research gjennomført 2. februar 2026 av Jorbot.*
