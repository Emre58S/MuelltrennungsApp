# Roadmap bis zum Release (Stand 30.10.2026)

**Ziel:** Veröffentlichung, sobald die Inhalte fertig sind (angepeilt Ende der Woche ab 2.11.; Release-Arbeit R7 ganz am Ende).
**Leitbild:** kompakt, gut fürs Auge, „noch eine Runde“-Gefühl, leicht zu teilen.
Für alle verständlich (auch mit wenig Deutsch), nie strafend.

Arbeitsweise: Die Zyklen (CLAUDE.md) nehmen ab jetzt die **oberste offene Aufgabe
in diesem Dokument** (Abschnitt „Backlog“). Erledigtes mit `[x]` + Commit-Kürzel.
Dies ist die **einzige** Roadmap + Backlog. Alte Punkte aus IMPROVEMENTS.md
sind hier eingeordnet (Kennung in Klammern); deren Verlauf steht in
IMPROVEMENTS-ARCHIV.md.

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

### Mehrspieler-Modi im Überblick
| Modus | Ablauf | Länge | Sieg |
|---|---|---|---|
| **Zeit-Sprint** (R4a) | gleiche Gegenstände im gleichen Takt, Tauziehen-Balken | 30 s | mehr richtig |
| **Survival** (R4b) | ohne Fehler, Tempo steigt bis Höchsttempo | max. ~30 s | länger fehlerfrei |
| **Trick-Battle** (R4c) | gleicher Parcours, wechselnde Gegenstände – sortieren + tricksen | 20–30 s | Punkte: falsch 0 · richtig 1 · Trick 3 · Swish +1 |
| **Zu zweit an einem Handy** (R4h) | Emres Schnell-Duell, gleichzeitig wischen | kurz | erster richtiger Wurf |
| **Live-Duell** (R4g, 1.1) | zwei Handys gleichzeitig, wer zuerst richtig trifft | 25–30 s | mehr Punkte |

Die ersten drei jeweils gegen **Zufallsgegner**, **Freund** (Freundes-Code)
oder um die **Rangliste** (Woche/Allzeit). Gegner zum Start = **Ghost**
(aufgezeichneter Lauf eines echten Spielers, fliegt zur selben Sekunde mit).
Aus dem heutigen Ghost-Duell wird „Freund herausfordern“, aus „Bester Lauf
heute“ der Tagesgegner.

## 2. Entscheidungen (Nutzer, 30.10. abends)

1. **Dritte Tonne = „Sammlung“** (Sammelbuch, Medaillen, Wurfspuren,
   Belohnungen, später Sticker). ✅
2. **Konten:** Name + Freundes-Code pro Gerät reicht erst mal; richtige Konten
   am Ende. ✅
3. **Erst Inhalte, dann Release:** Store, App-Name und Rechtliches
   (Datenschutz/Impressum) erst, wenn die App so gut wie fertig ist (R7 ans Ende). ✅
4. **Trickwürfe neu als Parcours** (R5): echte Dinge statt Ringe, Hindernis
   verrät die Tonne nicht, Gegenstände wechseln → Sortieren bleibt drin. ✅

## 3. Zeitplan (realistisch)

Wichtig: Für den Store braucht es einen **eigenen Build** (nicht Expo Go) und
Apples Prüfung dauert meist **1–2 Tage**. Danach kommen reine JS-Änderungen
weiter per **EAS-Update** aufs Handy – Szenen, Effekte und Feinschliff können
also auch **nach dem Einreichen** folgen.

**Geändert (Nutzer, 30.10. abends): erst alle Inhalte, Release-Arbeit (R7)
ganz am Ende.** Reihenfolge der Inhalte:

| Etappe | Schwerpunkt |
|---|---|
| **1** | R1 Startschirm mit 3 Tonnen |
| **2** | R2 Kampagne/Lernpfad inkl. Boss · R3 Missionen + Tagesbelohnung |
| **3** | R4a/b Online: Zeit-Sprint + Survival gegen Zufallsgegner, Freunde, Rangliste |
| **4** | R5 Trick-Parcours (Reifenschaukel, Torwand) → R4c Trick-Battle |
| **5** | R6 Crunch · R8 Teilen · R9 Szenen/Passanten · R10 Restfehler |
| **6** | R7 Release (App-Symbol, Build, TestFlight, Store, Rechtliches, Konten) |

Merke für Etappe 6: Apple prüft meist 1–2 Tage; nach dem Start können reine
JS-Änderungen per EAS-Update nachkommen.

---

## 4. Backlog (oben = als Nächstes)

### R1 – Startschirm aufräumen (Muss)
- [x] **R1a** 3 Tonnen Kampagne / Online / Sammlung, Name als Aufkleber auf der
  Tonne, Felder darunter weg; Bereichsseiten app/kampagne|online|sammlung.tsx
  (d71099b + b044b60, Tester 7/10 → 8/10, EAS auto + preview).
- [x] **R1b** „Weiter“, Kachel-Reihe und Fußzeile weg (in den Bereichen).
  Offen daraus: ⏳ antippbar erklären; Stack.Screen-Einträge für die 3 Seiten
  in app/_layout.tsx (Animation erst ab 2. Öffnen); Tagesaufgabe erledigt →
  Text „Morgen gibt's eine neue“ statt Einladung; Trick-Text „Durch Reifen“
  nach R5 anpassen; „Zuletzt“ schneller erreichbar (bis R2 den Pfad bringt).
- [x] **R1c** Ein Hinweis-Platz mit Vorrang-Regel (game/home-hint.ts): neu → Start-Hinweis,
  Flamme, Tagesaufgabe, Tagesbester (Ghost). (fef2152, Tester 8/10.) Offen: eingehende
  Herausforderungen gibt es erst mit Freunden (R4e) – dann als Stufe einreihen;
  Text springt bei langsamem Netz kurz um.
- [x] **R1d** Code-Eingabe für Herausforderungen in den Online-Bereich verlegen
  (a06f16c + a5494c2, Tester 5/10 → 8/10): Karte 🔑 in Online, Code geprüft →
  direkt ins Ghost-Rennen; Teilen-Text nennt Online. Offen: zweites Tippen auf 🔑
  bei offener Eingabe fokussiert nicht; Verweis auf der Ghost-Karte auch aus Online.

### R2 – Kampagne als Lernpfad (Muss)
Ein senkrechter Pfad mit Stationen (Kreise), der beim Spielen wächst.
- [x] **R2a** Datenmodell `game/campaign.ts` (+Tests): Welten 1–5 (Papier/Rest → +Gelb
  → +Glas → +Bio → +Sonder) mit je 4 Stationen (leicht 6/10 … alle 8/10); Sterne
  Ziel/mehr/alles; frei ab 1 Stern; Speicher getCampaignStars/saveCampaignStars
  (8ee8d09 + Nachbesserung, Tester 7/10). Offen für die UI (R2c): bei 0 Sternen
  freundlicher Hinweis statt Sackgasse.
- [x] **R2b** Welten 1–5 (je 1 neue Tonne) + Welt 6 „Knifflige Fälle“ mit festen
  Fallen-Listen (Papier/Glas-Doppelgänger · Verpackung vs. Sondermüll · Küche/Bad ·
  alles); Test: keine Tonne allein reicht fürs Ziel. Lernkarte = introExamples
  (3 Beispiele) + bin.<key>.examples (90b64e7 + Nachbesserung, Tester 7/10).
  Für R2c: Runde mit fester Liste ohne Zurücklegen ziehen.
- [x] **R2c** Pfad-Bildschirm: Stationen, Sterne, aktuelle Station hüpft, Tonnen-
  Symbol an Weltgrenzen. Start = 1 Tipp („Weiter“ ist damit der Pfad selbst).
  (d76abbe, Tester 8/10, EAS auto + preview): Welt-Köpfe mit Tonnen + „Neu: …“,
  Stations-Runde (`/runde?station=…`, Liste ohne Zurücklegen, 10 Würfe, HUD
  „3/10 · Ziel 7“, Sterne gespeichert, „Nächste Station“); alte Spielarten als
  Chips oben. Offen (R2c-Rest): in Stationen kein „🎁 Neue Tonne“-Hinweis beim
  Level-Aufstieg; Überschrift bei wenig richtig nicht „Fast geschafft!“ (erst ab
  Ziel−2); Tagesaufgaben-Chip mit Punkt/„erledigt“; Scrollen zur Station nach
  „Zum Pfad“ auf dem Gerät prüfen; 2-Tonnen-Welt auf dem Gerät prüfen.
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
- [ ] **R4c** Trick-Battle (braucht R5): beide spielen denselben Parcours mit
  denselben Gegenständen (Seed), Zeit je Parcours 20–30 s, Punkte wie in R5
  (falsch 0 · richtig 1 · Trick 3 · Swish +1) – Sortieren entscheidet mit.
  Gegner fliegt als Ghost mit; da die Hindernisse nur an der Rundenzeit hängen,
  schwingt die Reifenschaukel bei beiden gleich.
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

### R5 – Trick-Parcours: sortieren UND tricksen (Muss, Grundlage für R4c)
**Problem heute:** Jedes Level hat eine feste Zieltonne (`target` in
game/trick-levels.ts), das Hindernis steht genau davor → es verrät die Tonne,
Sortieren spielt keine Rolle. Ringe machen Spaß, wirken aber unecht.

**Neues Prinzip „Parcours“:** Gegenstände wechseln (mal Gelb, mal Rest, mal
Bio …), die Zieltonne ergibt sich **aus dem Gegenstand**. Der Parcours ist für
alle 3 Tonnen gleich schwer – entweder **symmetrisch** (gleiches Hindernis vor
jeder Tonne) oder **ein bewegtes Hindernis, das über alle Tonnen wandert**
(Timing: werfen, wenn es vor DEINER Tonne ist). Wertung: falsche Tonne = 0 +
Lernkarte · richtige Tonne = 1 · richtig mit Trick = 3 · Swish +1.

**Echte Dinge statt Ringe** (Poly-Look, bewegen sich wirklich):
| Element | Was man macht | Art |
|---|---|---|
| **Reifenschaukel** (Autoreifen am Seil an einem Ast) | schwingt links ↔ rechts – durchwerfen, wenn er vor der richtigen Tonne ist | wandernd (ersetzt den gleitenden Ring) |
| **Torwand** (wie beim Fußball, 3 Löcher) | steht vor den Tonnen, je Tonne ein Loch | symmetrisch (ersetzt feste Ringe) |
| **Basketballkorb an der Hauswand** | Bandenwurf übers Brett, Korb mündet in Rutsche zur Tonne | wandernd (Brett fährt) oder 3 Körbe |
| **Wäscheleine mit Tüchern** | Tücher wehen, zwischen ihnen durch | symmetrisch, bewegt |
| **Laubbläser / Rasensprenger** | schiebt den Wurf seitlich (wie Ventilator) | wirkt auf alle Spuren |
| **Lieferwagen / Radfahrer** fährt quer durchs Bild | Lücke abpassen (passt zu R9b Passanten) | wandernd |
| **Trampolin, Klappdeckel** (gibt es) | bleiben – auf alle Tonnen ausweiten | symmetrisch |

- [ ] **R5a** Datenmodell: Level ohne feste Zieltonne (`lanes: "all"`),
  Pflicht-Element je Spur bzw. „durch das wandernde Element“. Fairness-Test
  prüft jede der 3 Tonnen (Test dauert ~3× so lang → Level einzeln testen).
- [ ] **R5b** Reifenschaukel (Modell + Pendel-Bewegung + Kollision) als erstes
  Parcours-Element; gleitender Ring wird dadurch ersetzt.
- [ ] **R5c** Torwand mit 3 Löchern; Trampolin + Klappdeckel auf alle Spuren.
- [ ] **R5d** Parcours-Runde: Gegenstände aus dem Tages-Seed, eigene Zeit je
  Parcours (20 / 25 / 30 s), Punkte wie oben. Bewegung hängt nur an der
  Rundenzeit → Ghost des Gegners sieht exakt denselben Parcours.
- [ ] **R5e** Bisherige Level 1–24 werden „Trick-Schule“ (Seitenpfad der
  Kampagne, je ein Element erklären, feste Tonne ok). Wäscheleine, Basketball,
  Laubbläser, Lieferwagen nach und nach (Kann).

### R6 – Crunch & Belohnungsgefühl (Soll, viel per EAS-Update nachlieferbar)
- [ ] **R6a** Aufprall-Partikel in der **Farbe der Wurfspur** beim Treffer.
- [ ] **R6b** Material-Effekte: Banane/Bio **platscht** (Spritzer), Glas
  **splittert** (Scherben-Funken), Dose **knautscht**, Papier flattert.
  Töne der Materialien bleiben erhalten (CLAUDE.md).
- [ ] **R6c** Kurzer Treffer-Stopp (Hit-Stop ~60 ms) + leichtes Wackeln bei
  Serie 10/Boss; Haptik-Stufen.
- [ ] **R6d** Belohnungs-Momente: Truhe öffnen, Stern-Animation im Pfad,
  „Neue Tonne freigeschaltet!“. Hot-Path-Regel beachten (keine Objekte pro Frame).

### R7 – Release-Vorbereitung (ganz am Ende, wenn die Inhalte stehen)
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
- [ ] „Abgelaufene Medikamente“ steht als Sondermüll – meist Restmüll (UBA), Apotheke
  freiwillig. Kategorie/Fakt prüfen (in Kampagne vorerst ausgelassen).
- [ ] Ghost-Ideen: Gleichstand „gleich schnell (0,1 s)“, `\b` in isOtherVersionCode.

---

## 5. Danach (Version 1.1+, nach dem Start)
Live-Duell (R4g) · Zufalls-Warteschlange live · Sticker (R8c) · Passanten/Autos
(R9b) · neue Szenen (R9c) · Trick-Level T1–T6 · Wochen-Liga · Schutzschild bei
„Ohne Fehler“ · eigene Tonnen-Skins.
