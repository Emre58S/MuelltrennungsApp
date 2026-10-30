# Roadmap bis zum Release (Stand 30.10.2026)

**Ziel:** Veröffentlichung im App Store (und Google Play) **Fr 6.11.2026**.
**Leitbild:** kompakt, gut fürs Auge, „noch eine Runde“-Gefühl, leicht zu teilen.
Für alle verständlich (auch mit wenig Deutsch), nie strafend.

Arbeitsweise: Die Zyklen (CLAUDE.md) nehmen ab jetzt die **oberste offene Aufgabe
in diesem Dokument** (Abschnitt „Backlog“). Erledigtes mit `[x]` + Commit-Kürzel.
Alte Punkte aus IMPROVEMENTS.md sind hier eingeordnet (Kennung in Klammern).

---

## 1. Das Zielbild in einem Satz je Bereich

| Bereich | Heute | Zum Release |
|---|---|---|
| **Startschirm** | 4 Tonnen + Felder darunter, „Weiter“, Kachel-Reihe, viele Hinweise | **3 große Tonnen mit Namen direkt auf der Tonne**: 🟢 Kampagne · 🔵 Online · 🟡 Sammlung. Keine Felder unter den Tonnen, kein „Weiter“-Knopf, oben nur Level-Chip + Flamme |
| **Einzelspieler** | Üben, Gegen die Zeit, Ohne Fehler, Tagesaufgabe – nebeneinander | **Kampagne als Lernpfad** (wie eine Karte mit Stationen): erst wenige Tonnen, dann neue freischalten. Üben geht im Pfad auf, Tagesaufgabe + Missionen sind Stationen am Pfad |
| **Mehrspieler** | Ghost-Duell (Code), Schnell-Duell (1 Handy), Tagesbester | **Online-Bereich mit 3 Modi**: Zeit-Sprint · Survival · Trick-Battle – je gegen Zufallsgegner, Freunde oder Tagesbesten, mit Rangliste. Runden **max. 25–30 s**. Sofa-Duell (1 Handy) bleibt als Extra |
| **Fortschritt** | XP, Medaillen, Flamme | Sterne je Station, Boss-Stationen, Flamme + 3 Tagesmissionen, Belohnungen im Pfad |
| **Gefühl („Crunch“)** | Partikel, Töne, Serien | Bananen platschen, Glas splittert, Dose knautscht, Aufprall-Partikel in Spurfarbe, kurzer Treffer-Stopp |
| **Teilen** | Code per Teilen-Menü | Ergebnis-Bild zum Teilen, Herausforderungs-Link, später WhatsApp-Sticker |

## 2. Entscheidungen, die noch offen sind (Nutzer)

1. **Dritte Tonne:** Vorschlag **„Sammlung“** (Sammelbuch, Medaillen, Wurfspuren,
   Belohnungen, später Sticker) – das ist der Ort, an dem man sieht, was man
   sich erspielt hat (Motivation). Alternative: „Spielplatz“ (Trick-Level solo +
   Sofa-Duell).
2. **Konten:** Für Freundesliste reicht **Name + Freundes-Code pro Gerät**
   (kein Passwort). Die heutigen Seiten Login/Register sind nur lokal – zum
   Release ausblenden oder durch „Name wählen“ ersetzen?
3. **Store:** Apple-Developer-Konto (99 €/Jahr) vorhanden? Google Play (25 €
   einmalig) auch zum Start? App-Name im Store?
4. **Rechtliches:** Datenschutzerklärung + Impressum (Pflicht in DE, da Namen
   und Läufe an Supabase gehen) – wer stellt sie online?

## 3. Zeitplan (realistisch)

Wichtig: Für den Store braucht es einen **eigenen Build** (nicht Expo Go) und
Apples Prüfung dauert meist **1–2 Tage**. Danach kommen reine JS-Änderungen
weiter per **EAS-Update** aufs Handy – Szenen, Effekte und Feinschliff können
also auch **nach dem Einreichen** folgen.

| Tag | Schwerpunkt |
|---|---|
| **Fr 30.10.** | Roadmap, Entscheidungen; R1 Menü-Umbau beginnen |
| **Sa 31.10.** | R1 Menü fertig · R2 Kampagne Grundgerüst (Pfad, Stationen, Freischalten) |
| **So 1.11.** | R2 Boss-Stationen, Sterne · R3 Flamme + Missionen im Pfad |
| **Mo 2.11.** | R4 Online-Bereich: Zeit-Sprint 30 s + Survival gegen Zufallsgegner (Ghost) + Rangliste |
| **Di 3.11.** | R4 Trick-Battle, Freunde per Code · R5 Trick-Ringe gleich · R6 Crunch (erste Effekte) |
| **Mi 4.11.** | **Feature-Freeze.** R7 Release: App-Symbol, Startbild, EAS-Build, TestFlight, Store-Texte, Datenschutz → **einreichen** |
| **Do 5.11.** | Fehler aus TestFlight beheben (per EAS-Update) · R6/R8 Feinschliff |
| **Fr 6.11.** | **Veröffentlichen** · Teilen-Bild, Tages-Herausforderung bewerben |
| **ab 7.11.** | Version 1.1: Live-Duell gleichzeitig, Passanten/Autos, neue Szenen, Sticker |

Faustregel: Was bis Mi 4.11. nicht freigegeben ist, kommt per Update nach dem Start.
Lieber weniger, dafür rund.

---

## 4. Backlog (oben = als Nächstes)

### R1 – Startschirm aufräumen (Muss)
- [ ] **R1a** 3 Tonnen statt 4: Kampagne / Online / Sammlung. **Name groß auf
  der Tonne** (Schild/Aufkleber am Tonnenkörper), Felder unter den Tonnen
  entfernen (Rekord/„zuletzt“ wandern in die jeweilige Seite).
- [ ] **R1b** „Weiter“-Knopf und Kachel-Reihe weg; Ghost/Duell/Tagesaufgabe
  ziehen in Online bzw. Kampagne um. Oben nur Level-Chip + Flamme (⏳ antippbar
  erklären – F1-Idee).
- [ ] **R1c** Ein einziger Hinweis-Platz (Flamme-Rettung, Tagesbester,
  Herausforderung) mit Vorrang-Regel statt mehrerer Zeilen.
- [ ] **R1d** Code-Eingabe für Herausforderungen in den Online-Bereich verlegen.

### R2 – Kampagne als Lernpfad (Muss)
Ein senkrechter Pfad mit Stationen (Kreise), der beim Spielen wächst.
- [ ] **R2a** Datenmodell `game/campaign.ts` (+Tests): Welten → Stationen;
  Station = Tonnen-Auswahl + Gegenstands-Pool + Ziel (z. B. 8 von 10 richtig);
  1–3 Sterne; Fortschritt in storage. Freischalten: nächste Station ab 1 Stern.
- [ ] **R2b** Welten (Vorschlag): 1 Papier vs. Rest · 2 + Gelber Sack ·
  3 + Glas · 4 + Bio · 5 + Sondermüll · 6 „Knifflige Fälle“ (Kassenbon,
  Pizzakarton, Spiegel …). Je Welt 4–6 Stationen. Neue Tonne = kurze Einführung
  (was gehört rein, 3 Beispiele) – Lernkarte.
- [ ] **R2c** Pfad-Bildschirm: Stationen, Sterne, aktuelle Station hüpft, Tonnen-
  Symbol an Weltgrenzen. Start = 1 Tipp („Weiter“ ist damit der Pfad selbst).
- [ ] **R2d** Stations-Arten: normal · **Zeit** (Gegen die Zeit) · **Ohne Fehler**
  · **Trick** (Trick-Level 1–24 als Seitenstationen) · **Boss**. Damit leben die
  bisherigen Modi im Pfad weiter.
- [ ] **R2e** **Boss** am Ende jeder Welt: 10 Treffer in Folge; zwischendurch
  **tauschen Tonnen die Plätze/Farben** (z. B. Rest ↔ Gelb) – mit klarer
  Ankündigung („Achtung, Tonnen tauschen!“) und Animation. Sieg = Truhe.
- [ ] **R2f** Freies Üben (bisher „Üben“) bleibt erreichbar: Knopf im Pfad
  „Freies Spiel“ mit allen freigeschalteten Tonnen.
- [ ] **R2g** Bestandsspieler: Stationen anhand von Medaillen/XP vorab
  freischalten, damit niemand bei null anfängt.

### R3 – Täglich wiederkommen (Muss)
- [ ] **R3a** (F2) 3 Tagesmissionen (z. B. „5× Glas richtig“, „Serie 8“,
  „1 Online-Runde“) – sichtbar oben im Pfad, Belohnung XP/Truhe.
- [ ] **R3b** Tagesaufgabe = besondere Station im Pfad (goldener Kreis), Flamme
  zählt bei Tagesaufgabe ODER einer Mission.
- [ ] **R3c** Tagesbelohnung (Truhe): Spur-Farben, Tonnen-Aufkleber,
  später Sticker. Rettungstext der Flamme nur kurz zeigen (F1-Idee).

### R4 – Online-Bereich (Muss: asynchron · später: live)
Ein Bildschirm „Online“ mit 3 Karten: **Zeit-Sprint**, **Survival**,
**Trick-Battle**. Jede Karte: „Zufallsgegner“, „Freund herausfordern“,
„Rangliste“. Gegner sind zum Start **Ghosts** (aufgezeichnete Läufe echter
Spieler über Supabase) – das funktioniert sofort, auch wenn wenige online sind,
und fühlt sich gleichzeitig an (Gegner fliegt mit). Technik aus G1–G3 wiederverwenden.
- [ ] **R4a** Zeit-Sprint: 30 s, gleiche Gegenstände in gleichem Takt für beide,
  Tauziehen-Balken. Wer mehr richtig hat, gewinnt.
- [ ] **R4b** Survival: Ohne Fehler, aber Tempo steigt – nach max. ~30 s
  Höchsttempo; wer länger durchhält, gewinnt.
- [ ] **R4c** Trick-Battle: 3 zufällige Trick-Level, je **eigene Zeit**
  (z. B. 8 / 10 / 12 s), Punkte nach Trick-Güte.
- [ ] **R4d** Zufallsgegner: Server liefert einen Lauf ähnlicher Stärke
  (gleicher Modus, Seed der Woche). Neues SQL → Nutzer muss es ausführen.
  Dabei G3-Rest lösen: Server prüft Treffer/Zeit gegen den Code.
- [ ] **R4e** Freunde: eigener **Freundes-Code** (z. B. EMRE-4821), Freund
  hinzufügen per Code/Link, Liste mit „Herausfordern“ + offenen Herausforderungen.
- [ ] **R4f** Ranglisten je Modus (Woche + Allzeit), eigener Platz immer sichtbar.
  Zeit/Survival/Tricks gibt es danach **nur noch online mit Rangliste**
  (solo nur als Kampagnen-Station ohne Rangliste).
- [ ] **R4g** (1.1) **Live-Duell parallel** auf zwei Handys (G4, Supabase
  Realtime): beide werfen gleichzeitig denselben Gegenstand, wer zuerst richtig
  trifft, holt den Punkt; Variante: gleiche Gegenstände, unterschiedliche
  Geschwindigkeit. Mit Freunden zuerst, Zufalls-Warteschlange danach.
- [ ] **R4h** Sofa-Duell (Emres Schnell-Duell, 1 Handy) als 4. Karte „Zu zweit
  an einem Handy“ behalten.

### R5 – Trickwürfe fairer und realistischer (Soll)
- [ ] **R5a** **Gleiche Ringe/Hindernisse über allen Tonnen**, damit das
  Hindernis nicht verrät, welche Tonne gemeint ist – man muss weiterhin
  zuordnen UND tricksen. Fairness-Test für alle Tonnen.
- [ ] **R5b** Unterschiedliche Zeitlimits je Trick-Level (leicht kurz, schwer länger).
- [ ] **R5c** Realistischere Trick-Kulisse: Trampolin federt sichtbar nach,
  Deckel klappert, Ring schwingt aus. (Neue Level T1–T6 aus IMPROVEMENTS.md
  erst nach dem Release.)

### R6 – Crunch & Belohnungsgefühl (Soll, viel per EAS-Update nachlieferbar)
- [ ] **R6a** Aufprall-Partikel in der **Farbe der Wurfspur** beim Treffer.
- [ ] **R6b** Material-Effekte: Banane/Bio **platscht** (Spritzer), Glas
  **splittert** (Scherben-Funken), Dose **knautscht**, Papier flattert.
  Töne der Materialien bleiben erhalten (CLAUDE.md).
- [ ] **R6c** Kurzer Treffer-Stopp (Hit-Stop ~60 ms) + leichtes Wackeln bei
  Serie 10/Boss; Haptik-Stufen.
- [ ] **R6d** Belohnungs-Momente: Truhe öffnen, Stern-Animation im Pfad,
  „Neue Tonne freigeschaltet!“. Hot-Path-Regel beachten (keine Objekte pro Frame).

### R7 – Release-Vorbereitung (Muss, Mi 4.11.)
- [ ] **R7a** App-Symbol + Startbild (eigene Tonne mit Gesicht o. ä.).
- [ ] **R7b** `eas build` iOS (+ Android), TestFlight an Emre & Freunde.
- [ ] **R7c** Store-Eintrag: Name, Untertitel, Beschreibung DE/EN, 5 Bildschirmfotos,
  Altersfreigabe 4+, Datenschutz-Angaben (Name, Spielstände).
- [ ] **R7d** Datenschutzerklärung + Impressum online, Link in Einstellungen.
- [ ] **R7e** Aufräumen: Login/Register ausblenden oder ersetzen, Zielwurf-Reste,
  Entwickler-Fehlerberichte (dev-error-reporter) nur im Dev-Build.
- [ ] **R7f** Leistung auf älterem iPhone (Ruckeln aus 29.10. prüfen).

### R8 – Teilen & Viralität (Soll)
- [ ] **R8a** Ergebnis-Bild teilen („Ich habe Emre im Zeit-Sprint geschlagen –
  schaffst du 23?“) mit Herausforderungs-Link (öffnet App/Store).
- [ ] **R8b** Tägliche Herausforderung „Tagesbester“ teilbar.
- [ ] **R8c** (1.1) WhatsApp-Sticker der Tonnen-Figuren (eigenes Sticker-Paket;
  iOS braucht dafür ein Zusatzmodul bzw. Sticker-App → nach dem Start).

### R9 – Szenen & Modelle (Kann / 1.1)
- [ ] **R9a** Kleine Details je Szene (Blumentopf, Fahrrad, Vogel, Pfützen) –
  ruhig hinter den Tonnen (S2).
- [ ] **R9b** Bewegte Welt im Poly-Look: Passanten mit Laufbewegung, vorbeifahrende
  Autos, Vögel – müssen sich echt bewegen (Arme/Beine, Federn), nicht wie Attrappen.
  Nur im Hintergrund, Leistung prüfen.
- [ ] **R9c** Neue Szenen Park + Wertstoffhof (S3/S4), als Welt-Kulisse in der Kampagne.
- [ ] **R9d** Modelle nachschärfen: Küchentuch, Walnuss-Runzeln feiner, Kräuselband.

### R10 – Kleine offene Fehler aus IMPROVEMENTS.md (bündeln, 1 Zyklus)
- [ ] Tutorial-Stufen aus STREAK_TIERS statt fest im Text.
- [ ] Meldung beim 10. Treffer zeigt ×6, gezählt ×2 – prüfen.
- [ ] Tagesaufgabe: Endbildschirm überdeckt im letzten Wurf die Fehlerrückmeldung.
- [ ] „Ohne Fehler“: Lernkarte länger sichtbar.
- [ ] Ghost-Ideen: Gleichstand „gleich schnell (0,1 s)“, `\b` in isOtherVersionCode.

---

## 5. Danach (Version 1.1+, nach dem Start)
Live-Duell (R4g) · Zufalls-Warteschlange live · Sticker (R8c) · Passanten/Autos
(R9b) · neue Szenen (R9c) · Trick-Level T1–T6 · Wochen-Liga · Schutzschild bei
„Ohne Fehler“ · eigene Tonnen-Skins.
