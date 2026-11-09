# Roadmap „Fertigstellung“ (neu, Stand 4.11.2026)

Die alte Roadmap (R1–R10, mit allen Commit-Kürzeln) liegt unverändert in
[ROADMAP-alt.md](ROADMAP-alt.md). Diese hier beschreibt, **wie das fertige Produkt aussieht**
und in welcher Reihenfolge wir dahin kommen. Aufgaben heißen jetzt **F1…**; übernommene
alte Punkte stehen mit ihrer alten Nummer (z. B. „← R6b“).

## Letzter Lauf (7.11., bis 15 Uhr) – erledigt und noch offen

Erledigt (alle auf auto-improve, sdk-58, EAS auto + preview): Tagesmissionen mit Kacheln/XP/Truhe, Truhen-Fenster
(wackeln, Deckel, Funken, Karte), Freunde nur mit Play-Zeichen (X gleich hoch), „Online-Gegner“, Klangbild je Wurfspur
(game/trail-sound.ts), animierte Spur-Vorschau, untere Leiste nur Symbole (Karte/Globus/Buch), Ghost-Rennen → „10er-Rennen“
mit klarer Regel, Prospekt ohne Flackern, Pfad: vier Modi fest oben, Missionen aufklappbar, fünf Texte gekürzt, Gegenstände
neu gebaut (Eierschale, Alufolie, Prospekt, Zahnpastatube, Styropor …).

Noch offen:
- `supabase/pruefung.sql` im SQL-Editor ausführen (Plausibilitätsprüfung) – nur der Nutzer kann das.
- Vorschaubilder beider Prospekte neu aufnehmen (`node tools/item-shots.mjs 8095 N N`), sobald der Web-Server wieder rendert.
- Trail-Klänge: gleiche Töne kurz hintereinander schneiden sich ab (POOL_SIZE star2/star3/plop auf 2), ähnliche Spuren
  (smaragd, polarlicht, ozean, kirschbluete) stärker unterscheiden.
- Pfad mit Bild auf 375×667 prüfen (feste Modi-Kacheln + Band + Leiste: Platz?).
- „Ghost in allen Modi“ (Nutzer): Gegen den eigenen Bestlauf/einen Gegner in jedem Modus – noch nicht umgesetzt.
- Weitere Texte kürzen; Animationen (Gold-Spur bei Perfekt-Treffern, Boss-Sieg).
- **Veröffentlichung (9.11.):** Bundle-ID `de.phildevs.muellsortieren` ist eingetragen. Entwürfe für Datenschutz (DE/EN),
  Impressum, Store-Texte und die Gesamt-Checkliste liegen in `docs/veroeffentlichung/` (README.md dort lesen). Offene Code-Punkte:
  EAS-Variablen für `production` fehlen (sonst keine Online-Funktionen im Store-Build!), Datenschutz-/Impressum-Link in den
  Einstellungen, Online-Daten löschen (SQL `delete_player` + Knopf), Name melden (Apple 1.2), Aufbewahrung/automatische Löschung.
- Vom Nutzer nötig: Apple-/Google-Konto, Platzhalter in den Rechtstexten, Web-Adresse für die Texte, App-Icon, Supabase-Tarif/AVV.

## Prüfung 6.11. – was vor dem Release noch fehlt (Gesamtdurchgang: Code, Bilder, SQL, Texte)

**A. Release-Blocker**
1. **Datenschutz + Impressum + App-Privacy-Angaben** (Geräte-ID und Spitzname liegen auf dem Server) – F19, braucht Nutzer-Angaben.
2. **Spitznamen ohne Filter:** `set_name` prüft nur Länge/Zeichen (`rangliste.sql`), kein Wortfilter, kein Melden → Apple 1.2
   (nutzergenerierte Inhalte). Mindestens Wortfilter serverseitig + Kontaktadresse.
3. **Build-Konfiguration fehlt:** keine `eas.json`, kein `ios.bundleIdentifier`/`android.package`, Version 1.0.0 ohne Build-Nummern;
   Android-Berechtigungen `RECORD_AUDIO`/`FOREGROUND_SERVICE*` (doppelt eingetragen, für reines Abspielen nicht nötig) raus;
   `supportsTablet: true` ungetestet (iPad) → testen oder ausschalten.
4. **Kein Absturzschutz:** weder ErrorBoundary noch Crash-Meldung (Sentry o. Ä.). 10 Expo-Pakete haben Patch-Updates (`npx expo install --check`).
5. App-Symbol/Splash (F17), Leistung älteres iPhone (F18), TestFlight + Store-Eintrag (F20).

**B. Online / Rangliste**
- **100+ Spieler:** Top-Liste ist schnell (Server liefert ≤ 100, die App zeigt Top 10, „Dein Platz“ geht für jeden Rang, Gleichstände ok).
  Engpass später: „Allzeit“ rechnet bei jeder Anfrage über alle Läufe (`online_top`) → ab vielen Tausend Läufen eigene Bestwert-Tabelle.
- **Betrug möglich:** `submit_online_run` prüft nur Treffer ≤ Codelänge/3 und ms ≤ 70000 – „100 richtig in 1 ms“ geht durch
  (Zeit-Sprint schafft real ≈ 40). Fix: `p_correct <= p_ms / 400 + 1` und Obergrenze je Modus (SQL, **Nutzer führt aus**).
- **Modi unklar:** Karten sagen „30 Sekunden“/„Kein Fehler“, aber nicht **gegen wen**. Tatsächlich: Sprint/Survival = Ghost eines
  echten Spielers von heute mit ähnlich vielen Treffern (nicht live); Parcours = Tages-Punkte-Rangliste + Gegner-Ghost; Ghost = eigener
  bester Lauf. Regeltext in der Runde sagt nur „Der Gegner wirft mit“.
- Grafik Online ist jetzt ruhig und einheitlich (Dunkel/Hell geprüft); Podest/Liste passen für viele Spieler (nur Top 10 sichtbar).

**C. Belohnungen:** 15 Wurfspuren unterscheiden sich **nur durch den Farbverlauf** (`trailColor`, gleiche Punktform, Größe, kein Ton),
Vorschau = 3–5 Punkte; 3 Tonnen-Sticker. Ideen: eigene Formen (Sterne, Blätter, Blasen, Konfetti-Rechtecke), Bewegung (Funkeln, Wackeln),
kleiner Zusatzton beim Treffer je Spur (Material-Klänge bleiben!), animierte Vorschau, Fortschrittsbalken statt „Ab 12 ★“.

**D. Optik uneinheitlich:** Trickwürfe-Seite und Einstellungen haben noch den alten großen Himmel-Kopf mit Wolken; Einstellungen ohne
Version/Datenschutz/Kontakt, Flaggen als „DE/GB“-Text; Pfad-Kopf noch voll (Kacheln, Tagesaufgabe, Belohnung, Missionen); Tutorial und
Endscreens nicht im neuen Stil geprüft; Trick-Seite ist Phase G (zuletzt).

**E. Technik:** 921 Lint-Warnungen (R3F-Eigenschaften, harmlos – Regel abschalten), alte Menü-Texte und ungenutzte Dateien
(`chip.tsx`, `environment.tsx`), 186 Tests grün (Trick-Tests heute nicht gelaufen, Physik unverändert), DE/EN gleich (694 Schlüssel).
Offen klein: Hinweis „höchstens 3 Tonnen“ im freien Spiel, F13/F14/F15-Reste, Zeitmodus-Ziele (5/8) und Endspurt (10 s von 30 s) auf dem Handy prüfen.

**Selbstständiger Lauf 7.11., 00:15–01:00 (alles auf auto + preview, Tester 8/10 und 7/10):** „Wie Gerät“ aus den Einstellungen
(Sprache und Aussehen zeigen, was gerade gilt; Neulinge folgen dem Gerät bis zur ersten Wahl); Belohnungen mit richtigen Tonnen
(Sticker auf einer `BinIcon`-Tonne mit `glyph`, Wurfspur landet in einer Tonne); alle 93 Gegenstände in der Chrome-Ansicht durchgesehen
(Übersichtsseiten mit `.expo/contact-N.html`), drei verbessert: Staubsaugerbeutel (Papierbeutel statt Kugel), Kaputtes Geschirr
(größer, kräftigerer Rand), Teelicht-Hülle (größer); Vorschaubilder neu. Physik-Tests (`tricks.test.ts`) 199 grün, 1 übersprungen.
**Noch auffällig bei den Gegenständen:** Werbeprospekt/Prospekt gleiches Modell, Zahnpastatube wirkt wie eine Flasche, Styropor-Kiste
mit Noppen wirkt wie ein Gerät, Geschirr-Scherben nur mäßiger Kontrast auf Beige; nur im Sammlungsbild geprüft, nicht in der Spielszene.

**Selbstständiger Lauf 6.11., 22:53–24:00 (Nutzer: „arbeite automatisch bis 24 Uhr“), alles auf auto + preview:**
(1) Modi verständlich (597b23f/7f3a42e: „gegen wen“ auf Karten, im Duell-Blatt und im Regeltext, ehrlicher Fallback Übungs-Ghost);
(2) Absturzschutz + Build (ed43a8f/d62508f: ErrorBoundary mit Splash-Aus, `eas.json`, keine Mikrofon-/Hintergrund-Audio-Rechte, iPad aus,
ITSAppUsesNonExemptEncryption, ESLint 921 → 0 Meldungen); (3) schlichter Kopf für alle Unterseiten + Version in den Einstellungen (7df62a1).
**Neu für den Nutzer:** `supabase/pruefung.sql` – **bitte im Supabase SQL-Editor ausführen** (Plausibilitätsprüfung gegen erfundene Läufe:
Treffer ≤ ms/400 + 1, Sprint ≤ 31 s; Wortfilter für Spitznamen mit `blocked_words`; am Ende auskommentierte Aufräum-Abfragen).
**Weiter offen aus der Prüfung:** Datenschutz/Impressum (Nutzer), Bundle-ID + Package festlegen (Nutzer), Wurfspuren mit Formen/Bewegung,
Hinweis „höchstens 3 Tonnen“ im freien Spiel, alte Menü-Texte, F13–F15-Reste, Paket-Patch-Updates (`npx expo install --check`).

**Stand 5.11., spät (Menü im Spielstil, Vorlagen Duolingo + Clash Royale, Nutzerwunsch „perfekt abgestimmt, maximal
ansprechend“):** Teil 1 ausgeliefert (a74a009, Tester 8/10, EAS auto + preview): Baustein `components/ui/chunky.tsx`
(dicker Knopf mit Unterkante), Pfad mit Weltband (wechselt beim Scrollen, Buch = „Was gehört hinein?“), Schnellstart-
Kacheln, Mission-Plätze (`components/areas/mission-slots.tsx`), Stationen als dicke Knöpfe mit „LOS!“-Blase und
Begleiter-Tonne, neue untere Leiste (gewählte Tonne hebt sich heraus), Kopf mit Level-Abzeichen + Flamme/Sterne.
**Teil 2 ausgeliefert (610b2e5 + f275005, Tester 8/10, EAS auto + preview):** Online + Regal mit Farbband, `HubCard`
als dicke Karte, Reiter mit Unterkante, Tagesaufgabe als goldener Knopf oben im Pfad.
**Politur ausgeliefert (ab3e9d5, Tester 8/10, EAS auto + preview):** „Nächste Belohnung“ als Knopf, allgemeiner `Button`
mit Unterkante. Hellmodus und 375 pt per Bild geprüft (`SHOT_SCHEME=light node tools/shot.mjs …`), ohne Auffälligkeiten.
**Offen:** Panels innen (Freunde-Code-Karte, Rangliste-Zeilen, Heute) noch flache Karten,
altes Menü + Schalter „Neues Menü“ entfernen (Nutzer entscheidet), Kontrast der Kachelfarben nachrechnen.

**Stand 5.11., abends:** Trick-Szenen ausgeliefert (auto + preview): Küche 5–8, Büro 9–13, **Hof 14–16** (Wind mit
Wäscheleine, rollende Tonnen, klappende Deckel – mechanisch wie Küche/Büro, nur Kulisse), **Straße 17–18** (Ampel im
Deckel-Takt; Glasscheibe am Kran, zerspringt beim Durchwurf; Straße mit Häusern, Asphalt, Autos, Baustelle).
Nutzer-Wünsche dazu: Hindernisse lieber **in der Luft oder hinter den Tonnen** statt Boden-Trampoline (kurze Würfe
sind schwer), **durch/gegen Dinge werfen, die zerbrechen**; alles braucht einen **Bezug zur Szene** (Fahrrad,
Bollerwagen und „Reifen aus dem Nichts“ wurden verworfen). Reihenfolge nach Nutzer: **erst alles andere fertig,
Tricks komplett als Allerletztes.** F12 (Reiter „Heute“ im Regal) ist umgesetzt. **Offen ohne Tricks:** F13 lebendige
Tonnen, F14 Material-Effekte, F15 Kampagne-Reste (frische Sitzung!), F7 (braucht SQL), F16–F20 Release (brauchen den
Nutzer). **Offen bei Tricks (zuletzt):** Park (Drachen im Wind u. a.), fahrende Autos, zerbrechliche Ziele (Flaschen auf
Mauer), ausgeblendete Küchen-Parcours 20–23 neu denken oder streichen, 28 Klassik-Level auf natürliche Hindernisse.
Kleine Tester-Funde Straße: „Weniger Bewegung“ (`calm`) lässt die Scherben trotzdem fliegen (besser nur ausblenden);
Ampel passt nur bei `flapAll` (gleiche Phase für alle Deckel); Ampel hinten rechts auf kleinem Handy prüfen; Hof-Parcours
15/16 sind Kopien von Büro 11/12 (nur Kulisse) – ggf. eigener Trick (Wäsche als echtes Hindernis, Variante 2).

**Stand 5.11., 00:10:** Trick-Tour neu nach Nutzer-Kritik („unnatürlich, schwebt, verrät die Zieltonne“): Hindernisse
kommen jetzt aus der Szene. **Ausgeliefert (auto + preview): Küchen-Parcours 5 Saugroboter, 6 klappende Deckel,
7 Wind vom Fenster (Vorhang, Böen, Papierschnipsel), 8 rollende Tonnen (Welle, `slideAll`).** Küchenrolle/Töpfe/Regal
(9–12) ausgeblendet (`KITCHEN_PARCOURS_WIP`, nur per Link). Neues Werkzeug `tools/shot.mjs` (3D per Foto prüfen).
**Nächste Schritte:** weitere Szenen nach diesem Muster (Büro: Bürostuhl als fahrendes Trampolin, Büro-Tonnen auf
Rollen, Jalousie-Wind; Hof/Straße/Park), jeweils erst Bild an den Nutzer; die ausgeblendeten Küchen-Parcours
entweder neu denken oder streichen; Klassik-Level (28) auf natürliche Hindernisse prüfen.

**Stand 4.11., 18:30 (Normalmodus, selbstständiger Lauf):** Phasen A–C fertig und auf `auto` + `preview`
(F1–F6, F8: untere Leiste mit Wischen, Pfad, Online mit Reitern + Duell-Blatt, Regal mit Reitern, Tagesmissionen
im Regal, Truhen-Punkt). Trick-Tour: Küchen-Szene + **Küchen-Parcours 5–9** (Küchenrolle-Pendel, Töpfe+Deckel,
Standregal auf Beinen, Servierwagen, Töpfe+Deckel-Takt); R6b Dose knautscht. **Verworfen:** F11a-Kapitel (Zweig
`verworfen-f11a-kapitel`), Wasserhahn-Reifen, Standventilator-Parcours, Servierwagen+Deckel-Takt (nicht fair lösbar).
**Auf dem Handy ansehen (nur im Code geprüft):** Online-Reiter + Duell-Blatt + Code-Feld, Regal-Reiter/Heute/Punkt,
Küchen-Parcours (Optik, Lesbarkeit), Servierwagen. **Offen:** F7 (Online-Reste, meist SQL), F10d/F11d Bande-Hindernisse
(Kühlschranktür, Hängeregal – brauchen Sonden/Entscheidung), F11e weitere Szenen (Büro, Hof, Straße, Park),
F13 lebendige Tonnen, F15 Kampagne-Reste, F16–F20 Release (Symbol, Store, Datenschutz, TestFlight – brauchen den
Nutzer). Termin: Trick-Küche „im Release“ ⇒ Fr 6.11. nicht zu halten, Vorschlag ≈ 13.11. fertig.

**Leitbild:** Ein Spiel, kein Menü-Sammelsurium. Alles, was man antippt, fühlt sich an wie
„an der Tonne“: gleicher Stil, gleiche Bausteine, immer klar, wo man herkommt und wohin man geht.
Verständlich auch mit wenig Deutsch, nie strafend (wie bisher).

---

## 1. Die Probleme heute (aus deinen Anmerkungen + Blick in den Code)

| # | Beobachtung | Ursache im Code |
|---|---|---|
| 1 | Menüs hängen lose zusammen, Online wirkt wie eine andere App | Jede Seite (`online`, `sammlung`, `freunde`, `rangliste`, `modi`, `tricks`, `belohnungen`, `sammelbuch`) baut ihren Kopf/ihre Karten selbst; `online.tsx` hat 8 gleich große Karten untereinander |
| 2 | „An einem Handy“ (Duell) und „Code eingeben“ sind überflüssig/doppelt | Beides eigene Karten in `online.tsx`; Code-Eingabe gehört zu Freunden |
| 4 | Sammlung leer, Sammelbuch/Belohnung = Extra-Klick | `sammlung.tsx` ist nur eine Weiche mit 2 Karten |
| 5 | Aus dem Menü startet die Kampagne direkt eine Station, statt den Pfad zu zeigen (du willst: erst Pfad, dann selbst wählen) | Der Wurf auf die Tonne startet über `go()` in `index.tsx` gleich die nächste Station |
| 10/11 | Szene zu weit weg, UI-Flächen liegen „drüber“ | Schilder/Karten sind RN-Overlays, nicht Teil der 3D-Tonne |
| 8 | Trickwürfe: lose Hindernisse, kein Ort dazu | 10+ Level auf Hausszenen, Hindernisse nur „da“ |

---

## 2. Zielbild (entschieden 4.11.: untere Leiste + Wischen, Tonnen als Icons)

### 2.1 Navigation: eine feste untere Leiste
```
┌──────────────────────────────┐
│ Lv7 ▓▓▓░  🔥4          ⚙️ ❓ │  ← Kopf: Level, Flamme, Einstellungen, Hilfe
│  Heute ●●○                   │  ← Tagesleiste (Stempel), nur im Pfad
│  ── Lernpfad ──              │
│   ①──②──③                    │  ← Inhalt füllt den Platz
│        ④ ◄ nächste           │
├──────────────────────────────┤
│  🟢Pfad    🔵Online    🟡Regal │  ← feste Leiste mit 3 Tonnen-Icons
└──────────────────────────────┘
        ◄── Wischen ──►
```
- **3 Bereiche:** Pfad (Start beim Öffnen) · Online · Regal. Einstellungen/Hilfe oben rechts.
- **Wischen links/rechts** wechselt den Bereich; innerhalb von Online/Regal wechseln Reiter
  nur per Antippen (keine kollidierenden Gesten).
- **Tonnen als Icons** in der Leiste (grün/blau/gelb, wackeln kurz beim Antippen). Die
  3D-Menü-Szene entfällt: schneller, ruhiger, mehr Platz, weniger Leistungsrisiko.
- **Während einer Runde keine Leiste.** Endscreen und Zurück führen in den Bereich, aus dem
  man kam.
- Eigene Leiste mit dem vorhandenen gesture-handler (keine neue Abhängigkeit; die fertige
  expo-router-Tab-Ansicht lief in Expo Go nicht).
- Die Tonnen leben **im Spiel**: Deckel, Wackeln, Partikel in der Runde und im Endscreen;
  ein neu gefundener Gegenstand kommt aus einer animierten Tonne (Regal/Freischalt-Moment).

### 2.2 Die drei Bereiche
**🟢 Pfad (Kampagne)**
- Öffnet beim Start. Der Lernpfad wie jetzt; die **nächste Station ist hervorgehoben**, du
  wählst selbst und tippst zum Starten (kein Direktstart, ← #5).
- Tagesmission als **Stempelleiste (3 Stempel)** oben im Pfad statt der Karte (← #6).
- Nach einer Station: Endscreen mit „Nächste Station“ und „Pfad“ (zurück zur Auswahl).

**🔵 Online (ein Bildschirm, 3 Reiter statt 8 Karten)**
- Reiter **Duell · Freunde · Rangliste**.
- **Duell:** 3 große Modus-Karten (Sprint · Survival · Trick/Parcours; später Trick-Küche).
  Antippen → Blatt unten „Zufallsgegner“ · „Freund herausfordern“, dann geht es los.
- **Freunde:** eigener Code groß, **„Code eingeben“ hier drin**, Freundesliste, „Heute offen“.
- **Rangliste:** je Modus, Woche/Allzeit, eigener Platz fix unten.
- **Entfällt:** „An einem Handy“, doppelte Code-Karte, `modi.tsx`-Reste.

**🟡 Regal (statt leerer Sammlung)**
- Kopf: Level + XP-Balken, Flamme, Sterne gesamt, Medaillen.
- Reiter **Buch** (Standard: Raster, gefunden = Modell + Medaille, sonst Silhouette „?“) ·
  **Belohnungen** (Wurfspuren, Sticker, Truhen) · **Heute** (Missionen, Tagesaufgabe).
- „12 von 60 Gegenständen“ als Sammelreiz.

### 2.3 Trickwürfe neu (← #8) – eigener Workshop
**Küche** als Szene (Arbeitsplatte, Spüle, Hängeregal, Herd/Pfanne, Kühlschranktür …),
alltägliche, glaubwürdige Hindernisse; **die 3 Tonnen stehen trotzdem davor/daneben und müssen
unterschieden werden** (Hindernis lenkt, entscheidet aber nicht die Tonne). Wird gemeinsam
geplant (F9), bevor Code entsteht.

---

## 3. Phasen (Aufwand in „Sitzungen“ ≈ ein Arbeitslauf mit Test)

Regel wie bisher: klein, getestet (tsc, eslint, jest, `gameplay-tester`), Normalmodus = Push +
EAS `auto` und `preview`. Große Umbauten laufen hinter einem Schalter und gehen erst auf
`preview`, wenn der Phasenteil in sich steht (kein halber Umbau für Emre).

### Phase A – Fundament: eine Navigation, ein Design (zuerst)
- [x] **F1 Bausteine „Tonnen-Stil“** – gemeinsame Komponenten in `components/ui/`: Seitenkopf,
  Karte, Chip, Segmented-Reiter, Bottom-Sheet, Fortschrittsbalken, Stempelleiste.
  `hub.tsx`/`page-header.tsx`/`card.tsx` zusammenführen, bestehende Seiten umstellen
  (nur Optik, kein Verhalten). *1–2 Sitzungen*
  ✓ (2770159 + b4cbb2a, Tester 8/10, EAS auto + preview): `constants/areas.ts` (Bereichsfarben),
  Chip, ProgressBar, StampBar, Sheet; Segmented und PageHeader/HubScreen mit `area`. Alle
  Bereichsseiten tragen ihre Farbe. Seiten nicht einzeln umgebaut (werden in F5–F8 ohnehin
  zusammengeführt). Offen: Segmented leitet `onColor` nicht selbst ab.
- [x] **F2 Untere Leiste + Wischen** (← #1, #3): eigene Leiste mit 3 Tonnen-Icons, Bereichswechsel
  per Antippen und Wischen, Navigationsregeln (Endscreens und Zurück kehren in den
  Ursprungsbereich zurück; Deep-Links `/runde?mode=…` bleiben abwärtskompatibel). *2 Sitzungen*
  ✓ (5261335, Tester 8/10, EAS auto + preview): Hülle `app/bereiche.tsx` + `components/nav/`
  (AreaBar, AreaPager mit Fingerfolge, ShellContext), BinIcon. **Hinter Schalter** „Neues Menü (Test)“
  in den Einstellungen (NAV_V2, Standard aus) – F3 macht es zum Start. **Auf dem Gerät noch nicht
  geprüft** (Wisch-Gefühl, Übergang beim Schalter). Ideen: Haptik beim Wisch-Wechsel, leerer
  Frame in `app/index.tsx`, einmaliger Hinweis „wischen oder antippen“.
- [x] **F3 Pfad als Startbereich** (← #5, #10, #11): Startschirm mit 3D-Tonnen wird durch den
  Pfad ersetzt; Kopf-Chips (Level, Flamme, ⚙️ ❓); Direktstart nach dem Wurf (`go()` in
  `index.tsx`) entfällt. Die 3D-Menü-Szene (`menu-scene.tsx`) wird nicht mehr geladen (Code
  bleibt, bis alles verifiziert ist). *1–2 Sitzungen*
  ✓ (8e17426, Tester 8/10, EAS auto + preview): Hülle ist der Start (`NAV_V2_DEFAULT = true`, Schalter
  in den Einstellungen bleibt als Rückfall aufs alte Menü), Kopfzeile Level/Flamme/Hilfe/Einstellungen,
  rote Punkte an Pfad (Tagesaufgabe) und Online (Herausforderung), `utils/nav.ts` (`goHome`).
  Offen: Hinweis-Zeile (homeHint) im Pfad zurückholen; login/register auf `goHome`; Punktfarbe als
  Konstante; altes Menü + `menu-scene.tsx` löschen, sobald nichts mehr darauf zeigt.
- [x] **F4 Pfad: nächste Station hervorgehoben, Stempelleiste** (← #6): Puls/Pfeil an der
  nächsten Station, Tagesmission als 3 Stempel oben, Tagesaufgabe/Flamme im Kopf. *1 Sitzung*
  ✓ 4 Teile, alle Tester 8/10, EAS auto + preview: (1) schmaler Kopf je Bereich (2fd558a), (2) Tagesmissionen
  mit Stempeln (207768c), (3) Schild „Los!“ an der aktuellen Station + passender Kontrast je Weltfarbe
  (bb3fb6f), (4) Hinweis-Zeile im Kopf nach `homeHint`-Vorrang (77e5cd4). Offen: Stempelleiste mit
  „n/3“ als Sammelanzeige; Tagesaufgabe/Texte sagen noch „Kampagne“ (Leiste: „Pfad“) – bei F5/F8
  vereinheitlichen; Stern beim Erledigen einrasten lassen (Idee).

### Phase B – Online aus einem Guss
- [x] **F5 Online-Hub mit Reitern** (Duell · Freunde · Rangliste) auf den F1-Bausteinen;
  `freunde.tsx` und `rangliste.tsx` werden Reiter-Inhalt statt eigener Seiten. *2 Sitzungen*
  ✓ (871dd4e + 88bed13 Teil a, 32ddef8 Teil b; Tester 8/10, EAS auto + preview): `app/online.tsx` mit Reitern
  Duell · Freunde · Rangliste; `FriendsPanel` (freunde.tsx) und `RankingPanel` (rangliste.tsx) als Panels, die
  Seiten `/freunde` und `/rangliste?tab=…` bleiben (Endscreens). Ein Feld für Freundes- und Herausforderungs-Code.
  Rangliste-Chips umbrechen statt waagrecht zu scrollen. „An einem Handy“ entfernt. Offen: Ziehen zum
  Aktualisieren fehlt im Reiter.
- [x] **F6 Duell-Karten + Gegner-Blatt**: 3 Modi, „Zufallsgegner/Freund“ im Blatt; „An einem
  Handy“, doppelte Code-Karte und `ghost.code.enter`-Karte entfernen, „Code eingeben“ in
  Freunde. Tests für Duell-Reste anpassen, nichts löschen, was Ghost/Code braucht. *1–2 Sitzungen*
  ✓ (7ad8cfa + 60739bf, Tester 6/10 → 8/10, EAS auto + preview): Blatt `Sheet` mit „Zufallsgegner“ und
  „Freund herausfordern“ (Liste, lädt bei jedem Öffnen, Netzfehler mit Knopf, Doppeltipp-Sperre).
  Offen: Blatt-Titel springt beim Hinausgleiten kurz; Ghost-Rennen bleibt eigene 4. Karte.
- [ ] **F7 Offene Online-Reste (zurückgestellt hinter F8: brauchen meist SQL oder sind kaum sichtbar)** (← R4d–f): Seed der Woche für mehr Gegner (neues SQL, **Nutzer
  führt SQL aus**), „Platz X von N“, Sortierung nach Abstand, eigener Bestwert serverseitig,
  Sprint-Gleichstand nach Zeit, Puls beim ersten Überholen, Gleichstand „knapp“. *2 Sitzungen*

### Phase C – „Dein Regal“ (Sammlung)
- [x] **F8 Regal** (← #4): Kopf (Level/Flamme/Sterne), Reiter Buch · Belohnungen · Heute,
  `sammlung.tsx` + `sammelbuch.tsx` + `belohnungen.tsx` zusammenführen (Altrouten leiten um).
  Silhouetten für noch nicht gefundene Gegenstände. Tagesmissionen als Stempelzettel hierher
  (← #6, mit F11). Neu gefundener Gegenstand kommt aus einer animierten Tonne. *2–3 Sitzungen*
  ✓ (45e7d4d Buch + Belohnungen, 065663f Heute; Tester 8/10, EAS auto + preview): `app/sammlung.tsx` mit Reitern
  Buch · Belohnungen · Heute (BookPanel/RewardsPanel/TodayPanel), Missionskarte nach `components/areas/today-panel.tsx`,
  im Pfad schmale Stempelleiste (springt via `goArea("regal","today")`). Offen: neu gefundener Gegenstand aus
  animierter Tonne (F13); Fallback `/sammlung?tab=today`; Punkt am Reiter „Heute“ bei wartender Truhe; Reiter-Wunsch
  für Belohnungen (Pfad → „Nächste Belohnung“ öffnet noch /belohnungen).

### Phase D – Trick-Küche (Workshop zuerst!)
- [x] **F9 Workshop „Trick-Küche“** (4.11., Entscheidungen des Nutzers):
  - **Wo:** beides – Kampagnen-Welt „Zuhause/Küche“ im Pfad **und** Online-Duell-Modus „Trick“.
  - **Tonnen unterscheidbar:** Hindernisse **lenken** den Wurf, die richtige der drei Tonnen wählt man danach
    selbst (der Gegenstand entscheidet die Tonne; kein Hindernis sperrt eine Tonne).
  - **Hindernisse (alltäglich, glaubwürdig):** Hängeregal · Bratpfanne + Topfdeckel (Prallfläche/Trampolin) ·
    Kühlschranktür (offen, als Bande) · Spüle mit Wasserhahn (Bogen/Engstelle). Erkennbarkeit vor Details.
  - **Termin:** Trick-Küche **im Release** (nicht erst 1.1). ⇒ Der Termin „Fr 6.11.“ ist damit nicht zu halten;
    Vorschlag: Entwicklung fertig Ende nächster Woche (≈ 13.11.), danach TestFlight/Prüfung durch Apple.
- [~] **F10 Küchen-Szene + Hindernisse** (Rest → Phase G, ganz zuletzt) (zerlegt; Bausteine existieren: `TrickProp` mit ring/board/sign/trampoline/
  windmill/fence/lamp/fan, `levelColliders`, `trick-solver.ts`, Szenen in `stage.tsx`):
  - [x] **F10a** (d02eea4 + 830d74d, Tester 8/10, EAS auto + preview) Küchen-Szene in `stage.tsx` (Fliesenboden, Arbeitsplatte/Schränke, Fenster), vom Level gewählt (`scene: "kueche"`); Level 29 = Reifen.
  - [~] **F10b** (f445b70→4da67c6, Tester 6 → 4 → 8/10, EAS auto + preview; Teilumfang) Hindernis-Modelle als neue `look`s auf vorhandenen Kollidern: Hängeregal (board), Pfanne + Topfdeckel
    (trampoline/board), Kühlschranktür (sign), Wasserhahn-Bogen (ring). Kein neues Physik-Verhalten nötig.
    **Umgesetzt:** Wasserhahn-Bogen (Reifen, Hahn seitlich zur Bildmitte – oben/außen fehlt Platz auf 375 pt) und
    Topfdeckel (Trampolin) als Küchen-Optik (`kitchen`-Prop), Level 29 Reifen, 30 Wasserhahn, 31 Topfdeckel.
    **Offen:** Hängeregal, Bratpfanne, Kühlschranktür = Schild-/Bande-Mechanik, in keinem Level erprobt → F10d mit Sonden.
  - [~] **F10c/F10d** ersetzt durch F11 (Szenen-Parcours statt einzelne Küchen-Level).
- [~] **F11 Trick-Tour = Szenen-Parcours** (Küche, Büro, Hof, Straße ausgeliefert; Rest → Phase G, ganz zuletzt) (neu geplant 4.11. nach Nutzer-Kritik an Screenshots Level 1/29/Parcours:
  „Hindernisse schweben in der Luft, sind nicht erkennbar, und die Position verrät die Zieltonne“).
  **Entscheidungen:** (1) **Gegenstand bestimmt die Tonne** (wie beim Sortieren) – die Hindernisse spannen sich
  über/vor **alle drei** Tonnen, jede Tonne ist auf einem Weg erreichbar; der Trick ist der Weg (Tor, Bande,
  Bewegtes). Das ist das vorhandene Parcours-System (`PARCOURS`, `lanes`, `parcours-round.tsx`, Online „Parcours des
  Tages“) – hier in die Szene verankert. (2) **Echte Szenen-Objekte**, an Wand/Decke/Boden befestigt, erkennbar –
  kein freier Reifen, nichts schwebt (Tauhänger über den Bildrand sind ok). (3) Die bisherigen Level 1–31 bleiben
  vorerst als **„Klassik“**, werden ersetzt, was nicht in die neue Tour passt. (4) **Erst eine Szene komplett – die
  Küche** –, als Vorlage; weitere Szenen (Büro, Hof, Straße, Park) nach demselben Muster, ggf. nach dem Release.
  **Küchen-Objekte (Skin auf bewährten Kollidern, Physik gleich):**
  Pendel-Küchenrolle am Faden über allen Tonnen (= Reifenschaukel; Wurf durchs Papprohr) · Topf mit Deckel vor jeder
  Tonne (= 3 Trampoline) · Standregal mit drei Fächern (= Torwand) · alle Deckel klappen im Takt (= flapAll) ·
  Servierwagen mit Tablett rollt vorbei (= Trampolin, fährt) · Standventilator (= Windrad, am Boden verankert) ·
  später Kühlschranktür/Hängeregal als Bande (Sonden nötig).
  - [x] **F11a** (c236c92 + c5d5df9, Tester 6 → 8/10) Parcours-Runde nimmt die Szene aus dem Level (`scene`, bisher fest „haus“) + `kitchen`-Optik
    für Parcours; Küchen-Skins für die vier vorhandenen Parcours: Küchenrolle-Pendel, 3× Topf+Deckel, Standregal,
    Deckel-Takt. Der schwebende Wasserhahn-Reifen fliegt raus (Klassik 29–31 vorerst unverändert). *1–2 Sitzungen*
    ✓ Küchenrolle-Pendel (Parcours 5), 3× Topf+Deckel (6), Standregal auf Holzbeinen (7); Klassik-Küchenlevel 29–31
    und Wasserhahn entfernt (Sterne dafür verwaist, harmlos). Offen: Küchenrolle hängt am Faden über den Bildrand
    (keine sichtbare Aufhängung); Regal-Unterkante nur ≈ 9 px über der Tonnenöffnung (Maße der Torwand).
  - [~] **F11b** (55cc358 + 210df75, Tester 7/10) Neue Küchen-Parcours: Servierwagen (beweglich), Kombinationen (Regal + Pendel, Wagen + Deckel),
    Standventilator; je Parcours alle 3 Spuren mit Solver-Test (Fairness 0,6–0,86), Texte DE/EN. *2 Sitzungen*
    ✓ Parcours 8 Servierwagen (fahrendes Trampolin über alle Tonnen, Tablett/Rollen/Griff). Offen: Kombinationen
    (Regal + Pendel); Tablett wippt beim Treffer nicht. **Standventilator-Parcours verworfen** (4 Varianten: Mitte, y 2,8–3,4,
    Periode 4,5–6, x 0,5 – je mindestens eine Tonne nicht fair lösbar); Idee: Ventilator seitlich + Wind statt Blätter
    in der Bahn, oder nur als Dekoration.
  - [~] **F11c** (6087673, Tester 9/10) Tour in der App: Rubrik „Küche“ in der Trickwurf-Seite (Parcours) vor „Klassik“; Pfad-Trick-Schule und
    Online-Trick-Duell (Parcours des Tages) nutzen die Küchen-Parcours; Hinweis „Neue Welt“. *1 Sitzung*
    ✓ Küchen-Parcours mit Unterüberschrift „🍳 Küche“ in den Trickwürfen. Offen: Pfad-Trick-Schule/Online-Duell
    zeigen Parcours des Tages (jetzt 8 statt 4 → ändert sich für alle; alte App-Versionen kurz abweichend).
  - [ ] **F11d (→ G6)** Bande-Hindernisse (Kühlschranktür, Hängeregal) mit Sonden prüfen – ohne Fairness Ersatz vorschlagen.
  - [~] **F11e (Büro ✓, Hof ✓, Straße ✓; Park → G1)** weitere Szenen nach dem Küchen-Muster: Büro, Hof, Straße, Park.

### Phase E – Leben & Politur
- [x] **F12 Tagesmission im Regal**: Reiter „Heute“ mit denselben Stempeln wie die Pfad-Leiste
  (Bausteine aus F4), Tagesaufgabe darunter. *½ Sitzung*
- [~] **F13 Lebendige Tonnen im Spiel** (← #7): Deckel-/Wackel-Animation, Partikel „kommt etwas
  heraus“ je Tonne in der Runde und im Endscreen, neu gefundener Gegenstand aus animierter
  Tonne (Hot-Path-Regel beachten: keine Objekte pro Frame). *2 Sitzungen*
  ✓ Teil (fcf1b18, Tester 8/10, EAS auto + preview): Tonnen federn/Deckel/Partikel in der Runde gab es schon;
  neu: Banner „📖 Neu im Sammelbuch: …“ beim ersten richtigen Wurf je Gegenstand.
  Offen: Fund „aus animierter Tonne“ im Buch, Endscreen-Partikel; Tipp: Banner antippbar → Sammelbuch.
- [ ] **F14 Material-Effekte fertig** (← R6b): Dose knautscht beim Einwurf, Effekte auch in
  Trick-/Sprint-Runden, Gold-Spur bei Perfekt-Treffern, Boss-Sieg/-Tausch wackelt. *1–2 Sitzungen*
- [~] **F15 Kampagne-Reste** (← R2/R3, „Offen (klein)“): übersprungene Stationen markieren,
  Zeit-Ziel 16 prüfen, Mitternacht/Truhen-Texte, „nochmal spielen“ bei erledigter Karte. *1–2 Sitzungen*
  ✓ Teil (2ba2e0e, Tester 8/10, EAS auto + preview): Zeit-Station zeigt „3 ★: 16“ im Stationstext.
  ✓ Teil (d65a4d1, Tester 6 → 8/10, EAS auto + preview): Vorleser-Beschriftung der Stationen nennt das Ziel (eigene Texte
  `campaign.a11y.*` ohne Emojis). „Übersprungene Stationen markieren“ braucht neues Speichern (Bestandsspieler-Sterne
  sind von echten nicht unterscheidbar) – eigener Zyklus.
  Offen: **Nutzer** prüft auf dem Handy, ob 16 richtig in 60 s fair ist (sonst `total` in `STEPS` senken);
  Tester-Tipps: Text ggf. kürzer/`numberOfLines`, Ziel in die Screenreader-Beschriftung der Station;
  übersprungene Stationen, Mitternacht/Truhen-Texte, „nochmal spielen“.

### Phase F – Release (ganz am Ende, großenteils Nutzer-Aufgaben)
- [ ] **F16 Ergebnis als Bild teilen** (← R8a, braucht Abhängigkeit view-shot o. ä. – **du entscheidest**).
- [ ] **F17 App-Symbol + Startbild** (← R7a, Entwurf von mir, Auswahl von dir).
- [ ] **F18 Leistung älteres iPhone** (← R7f, du testest, ich optimiere).
- [ ] **F19 Datenschutz + Impressum** (← R7d, **deine Angaben**), Link in Einstellungen.
- [ ] **F20 `eas build` + TestFlight** (← R7b), **Store-Eintrag** DE/EN + 5 Bildschirmfotos (← R7c).

### Phase G – Tricks komplett (GANZ ZULETZT, Nutzer 5.11.: „erst alles andere fertig, Tricks als Allerletztes“)
Regeln: jedes neue Hindernis **erst als Bild an den Nutzer**; Bezug zur Szene; lieber **in der Luft oder hinter den Tonnen**
als Boden-Trampoline; **Durchwurf-/Zerbrech-Dinge** erwünscht; Gegenstand bestimmt die Tonne, Hindernis verrät sie nicht.
- [ ] **G1 Park** (Szene + Parcours): z. B. Drachen im Wind (Schwanz, wackelt), Blätter, Parkbank/Rasen als Kulisse.
- [ ] **G2 Straße ausbauen**: fahrende Autos (hinter den Tonnen), Ampel auch bei verschiedenen Phasen, `calm` für Scherben,
  Ampel auf kleinem Handy prüfen.
- [ ] **G3 Zerbrechliche Ziele**: gegen Dinge werfen, die zerbrechen (Flaschen auf einer Mauer, Dosenpyramide, Papierwand),
  dann Gegenstand in die Tonne; Sound/Scherben/Partikel (Material-Klänge erhalten!).
- [ ] **G4 Hof eigener Trick**: Wäsche als echtes Hindernis (Variante 2) oder Hof-Parcours 15/16 ersetzen (sind nur Kulisse).
- [ ] **G5 Klassik-Level (28) und ausgeblendete Küchen-Parcours 20–23**: auf natürliche Hindernisse prüfen, neu denken
  oder streichen.
- [ ] **G6 Bande-Hindernisse** (Kühlschranktür, Hängeregal) mit Sonden prüfen oder streichen (= F11d).

### Nach dem Start (1.1)
Live-Duell (R4g) · Sticker (R8c) · Passanten/Autos (R9b) · Szenen Park/Wertstoffhof (R9c) ·
Szenen-Details (R9a) · Modelle nachschärfen (R9d) · Wochen-Liga.

---

## 4. Meine Ideen on top (alle optional – du streichst, was nicht passt)
1. **Eine Daily-Schleife:** Flamme + Stempelzettel + Tagesaufgabe zeigen auf **ein** Ziel
   („Heute 2/3“) – ein Grund zum Wiederkommen statt drei Zähler.
2. **Weiterwerfen statt Menü (nur nach einer Runde, nicht aus dem Hauptmenü):** Nach jeder Runde ein großer „Noch eine!“-Knopf in der Tonnenfarbe;
   alle anderen Wege (Pfad, Regal, Online) sind kleine Chips.
3. **Erstes Mal geführt:** Beim ersten Start sind nur Pfad (und Hilfe) offen; Online und Regal
   erscheinen nach 3 Stationen – weniger Auswahl am Anfang, besonders gut bei wenig Deutsch.
4. **Küche als Kampagnen-Welt „Zuhause“:** Sortier-Stationen (Küchenabfälle) und Trick-Stationen
   in derselben Szene – dann ist Trick kein Fremdkörper.
5. **Tonnen sprechen:** Mini-Reaktionen (Emoji-Blase, kein Text) statt Meldungstexten – gut für
   Sprachbarriere.
6. **Fortschritts-Anker:** Regal zeigt „12 von 60 Gegenständen“ – wiederkehrender Sammelreiz.
7. **Alles hinter Schalter:** Neue Menüs zuerst per Feature-Flag, damit `preview` (Emres Version)
   nie halb umgebaut ist.

---

## 5. Entschieden / noch offen
**Entschieden (4.11.):** Navigation = untere Leiste mit 3 Bereichen + Wischen; Tonnen nur als
Icons in der Leiste und lebendig im Spiel (keine 3D-Menü-Szene); Pfad ist der Startbereich,
Station wird dort selbst gewählt; Tagesmission als 3 Stempel; „An einem Handy“ und doppelte
Code-Karte entfallen; Online mit Reitern Duell · Freunde · Rangliste.

**Noch offen:**
1. **Release-Termin:** A–E sind realistisch 8–12 Sitzungen, Trick-Küche 4–6. Vorschlag: Termin
   1–2 Wochen schieben, Phase F zuletzt – oder Trick-Küche erst in 1.1.
2. **Trick-Workshop (F9):** eigener Modus oder Kampagnen-Welt (Vorschlag: beides)? Tonnen
   unterscheidbar: (a) Hindernis vor nur einer Tonne, (b) Hindernis lenkt, Tonne wählt man
   selbst, (c) Pflicht-Prellfläche + Zieltonne (Vorschlag: b + c). Hindernisse (Vorschlag:
   Hängeregal, Bratpfanne, Topfdeckel als Trampolin, offene Kühlschranktür, Spülbecken-Bogen,
   Gewürzregal, fahrender Brotkorb).
3. **Online-Duelle:** Reichen Sprint · Survival · Trick als drei Modi?

---

## 6. Regeln für die Umsetzung (gelten weiter)
Aus CLAUDE.md: Texte DE + EN, Töne nicht verwässern, Hot-Path ohne neue Objekte pro Frame,
Tester vor Push, EAS auf `auto` **und** `preview`, nichts löschen, was genutzt wird. Zusätzlich:
- Jeder Umbau wird erst **auf `preview`** gelegt, wenn die Phase in sich stimmig ist.
- Pro Seite ein Screenshot-Vorher/Nachher in der Roadmap-Notiz (vom Gerät, wenn du magst).
- Wenn eine Aufgabe >1 Sitzung braucht, zerlegen wir sie in abgeschlossene Teile (a, b, c).

**Letzter Stand:** alte Roadmap bis R7e/R10 abgearbeitet (`ROADMAP-alt.md`); `sdk-58` hängt auf
GitHub wegen Serverfehler beim Push noch bei `e630f1e` (`auto-improve` aktuell).
