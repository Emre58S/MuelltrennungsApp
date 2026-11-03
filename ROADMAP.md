# Roadmap bis zum Release (Stand 30.10.2026)

**Ziel:** Veröffentlichung, sobald die Inhalte fertig sind (angepeilt Ende der Woche ab 2.11.; Release-Arbeit R7 ganz am Ende).
**Leitbild:** kompakt, gut fürs Auge, „noch eine Runde“-Gefühl, leicht zu teilen.

**Letzter Lauf (3.11., 20:16–21:15, Normalmodus):** Zyklen 41–46, alle freigegeben, auf
auto + preview: Solo-Ende „Online: Zeit-Sprint/Survival“ (R4f), Karte „Ghost-Rennen“ statt
„Rekord & Freunde“, 🔑 fokussiert erneut (R1d), Sprint-Startkarte ohne Springen (fester
Platz für Suche/Gegner/Freundes-Hinweise, R4d), „… – spiel zuerst!“. Nächstes: R5e, R4d
„Seed der Woche“, R7 zuletzt.

**Lauf davor (3.11., 19:03–20:06, Normalmodus, Takt 3 Zyklen + 10 min Pause):**
parcours.sql vom Nutzer ausgeführt (Server antwortet). Zyklen 34–40: Kampagne-Station
„Parcours des Tages“ (Ende letzte Welt), Material-Effekte im Parcours + Sprint/Survival
(R6b Teil 3/4), gesperrte Trick-Schule antwortet, Trick-Schule-Sterne lesbar + EN-Text,
Startschirm-Hinweis „⚔️ Name fordert dich heraus“ (R1c) – je 7–8/10, auf auto + preview.
**Verworfen:** gesperrte Stationspunkte mit Hinweis (2× 6/10, Zweig
`verworfen-gesperrte-station`). Nächstes: R5e, R4d-Rest (Seed der Woche), R7 zuletzt.

**Lauf davor (3.11., 15:42–18:50, Normalmodus, Takt 3 Zyklen + 10 min Pause):**
18 Zyklen (16–33), alle freigegeben (8/10), auf auto + preview (2 nur SQL/Test → ohne EAS):
Trick-Battle online – **supabase/parcours.sql (Nutzer muss es ausführen, nach
rangliste.sql + freunde.sql)**: Läufe an den Server, Gegner von heute als Ghost,
„Gegner wird gesucht …“/„kein Gegner da“, Rangliste-Reiter „Parcours des Tages“ + eigener
Platz + Knopf auf der Endkarte, Freund im Parcours herausfordern, „Heute offen“ mit Parcours,
Zeitprüfung gegen Fälschungen; Teilen (Parcours, Tagesbester R8b, „Gleichauf“); Vorsprung in
Gold; Karten scrollbar; Lernkarte blendet weich aus, Tipp ploppt danach; Online-Karte nach
Mitternacht neu. Nächstes: R5e Trick-Schule oder Parcours in die Kampagne; R7 zuletzt.

**Lauf davor (3.11., 13:45–15:40, Normalmodus, Takt 3 Zyklen + 7 min Pause):**
15 Zyklen, alle freigegeben (7–8/10, einer nach Nachbesserung 6 → 8), auf auto + preview:
R4c Teil 1–6 (Online-Karte „Parcours des Tages“ mit Aufgabe/Bestwert, eigener Ghost im
Parcours mit Kopfleiste/Vorsprung/Endkarte, Einzahl, Screenreader), Sprint/Survival-Beenden-
Dialog („Zeit läuft weiter“, Lauf zählt bei Zeitablauf), Survival-Balken dicker, Regelzeilen
linksbündig (RuleLines), Freunde-Gleichstand + 0-Läufe, Parcours-Stoß nach Ablauf, Texte
„Trickwurf“. Nächstes: Ghost eines Freundes/Gegners im Parcours (Server, R4c) oder R5e.

**Lauf davor (3.11. abends, Normalmodus):** 3 Zyklen R5d Teil 4–6 (Regel Lernpause, Abstand zum Bestwert; Lernkarte weg beim nächsten Wurf, Satz bei 0 Punkten; Sicherheitsnetz Landung), je 8/10, auf auto + preview. Nächstes: Parcours in Kampagne/Online einbinden oder R4c Trick-Battle.

**Lauf davor (3.11., Normalmodus):** 3 Zyklen R5d (Teil 1–3: Parcours-Runde spielbar, Zeitablauf nach Hintergrund, Lernkarte), alle freigegeben (7–8/10), auf auto + preview. Nächstes: R5d-Rest (Abstand zum Bestwert, Regeln: Lernpause) oder R4c Trick-Battle.

**Lauf davor (2.11. spät, Normalmodus):** 5 Zyklen R5 (bis 3.11.), alle freigegeben (8/10),
auf auto + preview: R5a Parcours-Datenmodell, R5b Reifenschaukel, R5c Teil 1
(3 Trampoline), R5c Teil 2 (Torwand), R5c Teil 3 (alle Deckel klappen). Nächstes: R5d Parcours-Runde
(erst damit im Spiel sichtbar).

**Lauf davor (2.11., 19:17–22:50, Normalmodus):** 20 Zyklen, alle freigegeben, auf
auto + preview: R3a Mission „1 Online-Runde“, R4a/R4b Rest, R4e Teil 2a/2b (Freund
herausfordern, „Heute offen“ – freunde.sql ausgeführt), R4f Teil 3/4, R6a–R6d (Funken in
Spurfarbe, Material-Effekte, Treffer-Stopp/Haptik, „Neue Tonne frei“, Stern-Animation),
R8a Teil 1 (Ergebnis teilen), R10 fast komplett. **R5 übersprungen** – Emre arbeitet an
den Trick-Dateien (vorher abstimmen). Nächstes: R5 (mit Emre) oder R8b, R7 zuletzt.
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
  Text „Morgen gibt's eine neue“ statt Einladung (✓ mit R3b); Trick-Text „Durch Reifen“
  nach R5 anpassen; „Zuletzt“ schneller erreichbar (bis R2 den Pfad bringt).
- [x] **R1c** Ein Hinweis-Platz mit Vorrang-Regel (game/home-hint.ts): neu → Start-Hinweis,
  Flamme, Tagesaufgabe, Tagesbester (Ghost). (fef2152, Tester 8/10.) Offen: eingehende
  Herausforderungen ✓ als Stufe 5 „⚔️ {name} fordert dich heraus – Online → Freunde“
  (731dcb0, Tester 8/10, EAS auto + preview; Karte „Rekord & Freunde“ heißt jetzt
  „Ghost-Rennen“, Hinweis-Weg angepasst – 9a8c157 + cf453f7, Tester 8/10; Offen: Abfragen
  beim Fokus zwischenspeichern; Schlüssel `home.ghost` evtl. ungenutzt);
  Text springt bei langsamem Netz kurz um.
- [x] **R1d** Code-Eingabe für Herausforderungen in den Online-Bereich verlegen
  (a06f16c + a5494c2, Tester 5/10 → 8/10): Karte 🔑 in Online, Code geprüft →
  direkt ins Ghost-Rennen; Teilen-Text nennt Online. ✓ Zweites Tippen auf 🔑 fokussiert
  die Eingabe (ba38197 + 5305b71, Tester 8/10). Offen: Verweis auf der Ghost-Karte auch aus Online.

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
  Chips oben. Nachgezogen (29ecc97, Tester 8/10): kein „🎁 Neue Tonne“ in
  Stationen, „Gut geübt!“ weit unter dem Ziel, Tagesaufgaben-Chip mit Punkt/Ergebnis.
  Offen: auf dem Gerät prüfen – Scrollen nach „Zum Pfad“, 2-Tonnen-Welt, roter
  Chip-Punkt (✓ erledigt: Chips haben keinen Punkt mehr).
- [x] **R2d** Stations-Arten: normal · **Zeit** (Gegen die Zeit) · **Ohne Fehler**
  · **Trick** (Trick-Level 1–24 als Seitenstationen) · **Boss** (→ R2e). Damit leben die
  bisherigen Modi im Pfad weiter.
  - [x] Teil 1 (920bab2, Tester 7/10, EAS auto + preview): Lern-Welten haben 6
    Stationen – 3 = 🛡️ Ohne Fehler (4 in Folge), 5 = ⏱️ Zeit (60 s, 10/16 richtig).
  - [x] Teil 2 (1df3f67, Tester 8/10, EAS auto + preview): Seitenstation 🎯
    „Trick-Schule“ je Welt (Level 1–4 … 21–24), sperrt nichts.
  - Alte Stände (4 Stationen/Welt) werden **nicht** umgezogen (seit 2 Tagen neues
    Schema – Umzug würde neue Stände verfälschen).
  - ✓ „… in Folge“ (missingStreak, schon erledigt); ✓ gesperrte Trick-Schule-Karte
    antwortet (sanfte Vibration + Grund vorgelesen; 6b4345c + f278b89, Tester 8/10).
  - Offen (klein, bündeln): Zeit-Ziel 16 für 3 Sterne auf dem Gerät prüfen (ggf. 14);
    Stations-Runden zählen in Statistik von Ohne Fehler/Zeit; gesperrte Stationspunkte
    ebenso antworten lassen (**verworfen 3.11.**, Zweig `verworfen-gesperrte-station`,
    Tester 6/10 zweimal: Hinweis unter dem Punkt wird von den Wegpunkten der nächsten
    Station übermalt – Hinweis z. B. über dem Punkt oder als Banner oben zeigen);
    Trick-Schule Welt 1 erst nach 1-1? ✓ EN „Finish the previous trick school first“ +
    Sternzahl in Theme-Gold (abc8fcf, Tester 8/10, EAS auto + preview).
- [x] **R2e** **Boss** am Ende jeder Welt: 10 Treffer in Folge; zwischendurch
  **tauschen Tonnen die Plätze/Farben** (z. B. Rest ↔ Gelb) – mit klarer
  Ankündigung („Achtung, Tonnen tauschen!“) und Animation. Sieg = Truhe.
  - [x] Teil 1 (1e46bca, Tester 8/10, EAS auto + preview): 👑-Station am Ende jeder
    Welt (auch Welt 6), 10 in Folge, max. 20 Würfe, Sterne nach Fehlern (0/≤3/mehr),
    Boss schaltet nächste Welt frei; gespielte Stationen bleiben frei; „… in Folge“.
  - [x] Teil 2 (176b7c1 + f24e265, Tester 6/10 → 8/10, EAS auto + preview): Runde
    endet nach der Lernkarte, sobald 10 in Folge nicht mehr gehen; HUD „🔥 3/10“ +
    klein „noch N Würfe“/„noch 1 Wurf“; Zieltext „max. 20 Würfe“.
  - [x] Teil 3 (5b4bad0 + 5ac1e14, Tester 7/10, EAS auto + preview): alle 4 Würfe
    (nach Treffer, nichts in der Luft) tauschen 2 Nachbar-Tonnen; Hinweis „🔄 Achtung,
    Tonnen tauschen!“, Tonnen gleiten aneinander vorbei, Schilder solange aus, ~1,5 s
    Wurfsperre. Auf dem Gerät prüfen: Tempo/Ausweichen, Zieltext-Pille Boss (Station 7).
  - [x] Teil 4 (9d64d97 + e16765d, Tester 8/10, EAS auto + preview): Endbildschirm
    erklärt frühes Ende; Pille zeigt keine Restwürfe mehr, sobald 10 in Folge nicht
    mehr gehen.
  - Verschoben: Truhe als Boss-Sieg → R3c (eine Truhen-Mechanik für Tagesbelohnung
    und Boss). Offen (klein): zwei graue Zeilen beim frühen Ende evtl. zusammenfassen;
    numberOfLines=1 kürzt lange Stations-
    Pillen („10/16 · Ziel 10“) evtl. mit „…“ – auf dem Gerät prüfen.
- [x] **R2f** Freies Üben (bisher „Üben“) bleibt erreichbar: Knopf im Pfad
  „Freies Spiel“ mit allen freigeschalteten Tonnen. (e889c78 + 0e5816c, Tester 8/10,
  EAS auto + preview): Chip 🌱 statt „Üben“, Tonnen der aktuellen Welt.
  - Offen: zählt als „Üben“ (Bestwerte mit weniger Tonnen leichter); Welt/Tonnen am
    Chip zeigen; Bestandsspieler haben bis R2g nur die Tonnen von Welt 1.
- [x] **R2g** Bestandsspieler: Stationen anhand von Medaillen/XP vorab
  freischalten, damit niemand bei null anfängt. (4433eb7 + a9924de, Tester 7/10, EAS
  auto + preview): einmalig beim ersten Öffnen; Lern-Welten, deren Tonnen vor dem
  jetzigen Level frei wurden, je Station 1 Stern (Lv 4 → Welt 3, Lv 6 → Welt 5, ab 8 →
  Welt 6); einmaliger Hinweis im Pfad.
  - Offen: übersprungene Stationen eigen markieren statt 1 Stern; Boss-Tausch
    Bestandsspielern einmal zeigen.

### R3 – Täglich wiederkommen (Muss)
- [x] **R3a** (F2) 3 Tagesmissionen (z. B. „5× Glas richtig“, „Serie 8“,
  „1 Online-Runde“) – sichtbar oben im Pfad, Belohnung XP/Truhe.
  - [x] Teil 1 (764ab4e + 804580e, Tester 7/10, EAS auto + preview): game/missions.ts
    (+Tests) – je Tag fest: „{Tonne}: 5 richtig“ (nur Tonnen der aktuellen Welt),
    abwechselnd „6 in Folge“/„20 richtig“, „Eine Station schaffen“; zählt aus allen
    Runden (queueThrowRecord), je +30 XP genau einmal; Karte oben im Pfad.
  - [x] Teil 2 (1686932 + 09c32e1, Tester 7/10, EAS auto + preview): Hinweis
    „✓ Tagesmission geschafft! +30 XP“ in der Runde (nicht nach Rundenende, nicht über
    Level-Aufstieg), Mission-XP + Zeile im Endbildschirm (auch Station am Ende).
    Offen (klein): Würfe vor dem Laden der Missionen (sehr schneller 1. Wurf) zeigen
    keinen Hinweis; Banner allgemein nacheinander statt verdrängend (R10).
  - [x] Teil 3 (f70f353→9d80117 nach Rebase, Tester 8/10, EAS auto + preview): Mission
    „1 Online-Runde spielen“ reihum mit Serie/Menge (Tag-Seed % 3), zählt fertig gespielte
    Sprint-/Survival-Läufe (nicht abgebrochene, auch offline/Übungs-Ghost), Zeile 🌍 im Pfad
    öffnet den Online-Bereich, Endbildschirm „✓ Tagesmission geschafft“ (+ Truhe).
    Offen (klein): Mitternacht während der Runde → Anzeige bezieht sich auf alten Tag.
  - Danach (erledigt bzw. bei R3c): Belohnung Truhe mit R3c; Flamme zählt
    Mission mit R3b. Randfall: Würfe kurz vor Mitternacht zählen ggf. für den neuen Tag.
- [x] **R3b** Tagesaufgabe = besondere Station im Pfad (goldener Kreis), Flamme
  zählt bei Tagesaufgabe ODER einer Mission.
  - [x] Teil 1 (640eaec + a3ebc7a + e27b8cf, Tester 6/10 → 8/10, EAS auto + preview):
    goldene Karte direkt unter der aktuellen Station (offen: 📅 + roter Punkt,
    erledigt: ✓ + Ergebnis + „Morgen gibt es eine neue.“); 📅-Chip oben entfällt.
  - [x] Teil 2 (1e9a18a + 848d315, Tester 7/10, EAS auto + preview): Flamme zählt
    nur bei geschaffter Mission oder gespielter Tagesaufgabe (Prüfung im Flush,
    Rettung unverändert); Startschirm „Heute 1 Mission schaffen (in der Kampagne)“,
    Missionskarte „Nur 1 Mission (oder die Tagesaufgabe) hält deine Flamme.“
    Offen: Test für die Regel (Flush ohne/mit Mission/Tagesaufgabe – braucht
    AsyncStorage-Mock).
  - Offen (klein): erledigte Karte zurücknehmen bzw. „nochmal spielen“ zeigen;
    evtl. mittig als Kreis näher am Pfad.
- [x] **R3c** Tagesbelohnung (Truhe): Spur-Farben, Tonnen-Aufkleber,
  später Sticker. Dieselbe Truhe auch als Boss-Sieg (aus R2e).
  - [x] Teil 1 (d76b01f, Tester 8/10, EAS auto + preview): alle 3 Tagesmissionen →
    1 Truhe (CHESTS_EARNED/OPENED), Öffnen auf der Missionskarte; 1./3./6. Truhe =
    neue Wurfspur (Ozean, Kirschblüte, Neon, Progress.chests), sonst +50 XP; Hinweis
    „Noch N Truhen bis zur nächsten Wurfspur“; Banner „Alle Missionen geschafft! 🎁“.
  - [x] Teil 2 (0f3ffb1, Tester 8/10, EAS auto + preview): erster Sieg je Boss →
    Truhe (saveCampaignStars, nicht über Vorsprung); Endbildschirm „🎁 Truhe verdient –
    öffnen im Pfad!“. Offen (klein): 2 Truhen in einer Runde → „2 Truhen“; Grund
    nennen („Boss besiegt – 🎁“); Pfad-Hinweis am Boss, dass er eine Truhe bringt.
  - [x] Teil 3a (7288785 + Nachbesserung, Tester 7/10, EAS auto + preview): Truhe
    wackelt beim Öffnen, Ergebnis springt auf (Weniger Bewegung beachtet), Doppeltipp
    gesperrt, Knopf „Jetzt auswählen ›“ → Belohnungen.
  - [x] Teil 3b (1992a92 + 3c1708b, Tester 8/10, EAS auto + preview): „⬆ Level N!“
    + Level-up-Ton, wenn Truhen-XP einen Aufstieg bringen; „Flamme gerettet“ nur beim
    ersten Startschirm-Besuch danach (takeRescueNotice).
  - Später (nach R4/R5, bei R6/R8): Truhen-Aufkleber für Tonnen, Sticker; „2 Truhen“
    in einer Runde; Rettungshinweis erst nach dem Anzeigen als gesehen merken. Rettungstext der Flamme nur kurz zeigen (F1-Idee).

### R4 – Online-Bereich (Muss: asynchron · später: live)
Ein Bildschirm „Online“ mit 3 Karten: **Zeit-Sprint**, **Survival**,
**Trick-Battle**. Jede Karte: „Zufallsgegner“, „Freund herausfordern“,
„Rangliste“. Gegner sind zum Start **Ghosts** (aufgezeichnete Läufe echter
Spieler über Supabase) – das funktioniert sofort, auch wenn wenige online sind,
und fühlt sich gleichzeitig an (Gegner fliegt mit). Technik aus G1–G3 wiederverwenden.
- [ ] **R4a** Zeit-Sprint: 30 s, gleiche Gegenstände in gleichem Takt für beide,
  Tauziehen-Balken. Wer mehr richtig hat, gewinnt.
  - [x] Teil 1 (fd73059 + d6500ee + 73849a1, Tester 5/10 → 8/10, EAS auto + preview):
    Karte ⏱️ oben im Online-Bereich, `/runde?mode=sprint` (components/game/sprint-round.tsx,
    game/sprint.ts +Tests): Tages-Strecke (60, ohne direkte Doppelte), Gegner = eigener
    bester Sprint von heute oder Übungs-Ghost (~9), Restzeit oben, letzte 3 s ticken;
    0,4 s Sperre nach jedem Wurf, 1,5 s Lernpause nach Fehlwurf (sonst gewinnt Dauerwischen).
  - [x] Teil 2 (9b7a947 + 8450257, Tester 7/10, EAS auto + preview): Startregel Sprint +
    Survival als 3 kurze Zeilen mit Symbolen; Survival „mehr richtig gewinnt“ (wie Wertung).
    Mission „1 Online-Runde“ siehe R3a.
  - [x] Regelzeilen linksbündig, Symbole untereinander (RuleLines in hud.tsx, auch Parcours;
    30035ae + a73188c, Tester 8/10, EAS auto + preview); je Zeile ein VoiceOver-Schritt.
  - Offen: Übungs-Ghost evtl. 11–12 oder angepasst; Symbolbreite 26 bei großer Systemschrift.
- [ ] **R4b** Survival: Ohne Fehler, aber Tempo steigt – nach max. ~30 s
  Höchsttempo; wer länger durchhält, gewinnt.
  - [x] Teil 1 (5d2b201 + 5d0469d, Tester 8/10, EAS auto + preview): Karte 🛡️ im
    Online-Bereich, `/runde?mode=survival` – gleiche Runde wie der Sprint
    (sprint-round.tsx, kind="survival"; game/survival.ts +Tests): je Gegenstand 3 s →
    1,1 s (Höchsttempo nach 30 s, Schluss nach 60 s), Balken unter dem Gegenstand,
    falsch/zu langsam = vorbei (mit Lern-Hinweis), Uhr läuft hoch, „Ghost ist raus“;
    Gegner = eigener Bestlauf von heute oder Übungs-Ghost (scheidet bei 10/11 aus).
  - [x] Teil 2 (c1d847e→9871e74, Tester 7/10, EAS auto + preview): Zeitbalken je
    Gegenstand blendet im letzten Drittel in festes Rot (#E53935) über (nativ animiert).
  - [x] Beenden-Dialog (a9c654a + bc075ce, Tester 7/10, EAS auto + preview): Uhr läuft
    bewusst weiter (sonst Bedenkzeit → unfair online), Text sagt „Die Zeit läuft weiter“;
    endet der Lauf bei offenem Dialog, zählt er, „Beenden“ zeigt dann das Ergebnis.
  - [x] Balken im letzten Drittel doppelt so dick (scaleY, nativ) – erkennbar ohne Rot
    (fa65517, Tester 8/10, EAS auto + preview). Offen: Ecken bei scaleY leicht oval.
  - Offen: Survival: Hinweis,
    dass man bei offenem Dialog „zu langsam“ ausscheiden kann.
- [ ] **R4c** Trick-Battle (braucht R5): beide spielen denselben Parcours mit
  denselben Gegenständen (Seed), Zeit je Parcours 20–30 s, Punkte wie in R5
  (falsch 0 · richtig 1 · Trick 3 · Swish +1) – Sortieren entscheidet mit.
  Gegner fliegt als Ghost mit; da die Hindernisse nur an der Rundenzeit hängen,
  schwingt die Reifenschaukel bei beiden gleich.
  - [x] Teil 1 (ed0c699, Tester 8/10, EAS auto + preview): Karte „🎯 Parcours des Tages“
    im Online-Bereich (Gruppe „Schnell spielen“), Parcours aus dem Datum (`dailyParcoursId`
    in game/parcours.ts +Test), startet `/runde?mode=parcours&level=N`, zurück in Online.
  - [x] Teil 2 (d77733e + 80a9135, Tester 7/10, EAS auto + preview): Karte zeigt Symbol
    des Parcours, „Heute: {Aufgabe} · N Sekunden“ und „Bestwert: N“ (statt „Parcours 2“).
  - [x] Kartentext „Sortieren mit Trickwurf, N Sekunden. / Heute: {Aufgabe}“ (e68a5a2 +
    04fdf57, Tester 7/10, EAS auto + preview). Trick-Seite ebenso: „Parcours: sortieren
    mit Trickwurf“ + Unterzeile (59d5172 + 41ef35e, Tester 8/10). Offen (R10): Wort
    „Parcours“ ist für Nicht-Muttersprachler schwer.
  - Offen: Vergleich
    mit Freunden/Rangliste für den Parcours des Tages; Karte über Mitternacht offen
    → zeigt gestrigen Parcours (✓ 75298c1, Tester 8/10: Tag bei jeder Rückkehr neu; Bestwert
    flackert kurz); Gegner-Ghost (Startzeit der Szenen-Uhr mitschreiben).
  - [x] Teil 3 (591987e + ebec2db, Tester 8/10, EAS auto + preview): eigener bester Lauf
    von heute je Parcours als Ghost (`ParcoursRun` = Punktestand je Treffer, StorageKeys.
    PARCOURS_TODAY); Kopfleiste „👻 Ghost: N“ zur selben Rundenzeit, Startkarte nennt ihn.
  - [x] Teil 4 (330e245 + 0fcdf2d, Tester 8/10, EAS auto + preview): Endkarte „👻 Ghost
    geschlagen!“ / „Gleich viel“ / „noch N Punkte“; doppelte Bestwert-Zeile entfällt;
    Kopfleiste liest „Ghost, Punkte: N“ (ohne Emoji).
  - [x] Teil 5 (a52868c, Tester 8/10, EAS auto + preview): „noch 1 Punkt“ (gapOne,
    ghostBehindOne), Ghost-Zeile der Endkarte ohne Emoji für Screenreader.
  - [x] Teil 6 (1187fa2 + 5c5048d, Tester 8/10, EAS auto + preview): Kopfleiste
    „👻 Ghost: N · du +D“ (nur Vorsprung, Rückstand nie), Ansage ohne Emoji mit Vorsprung;
    nach Ablauf zählt der ganze Ghost-Lauf.
    „du +D“ in Gold, lange Namen gekürzt (5dc3bfb + 58c7435, Tester 8/10). Ghost des
    Gegners/Freundes: ✓ Teil 8/13. Offen: kurzer Puls beim ersten Überholen.
  - [x] Teil 7 (ee33074, Tester 8/10, EAS auto + preview): jeder Parcours-Lauf mit Punkten
    geht als Code (encodeParcours: Punkte + Zeitabstand je Treffer) an
    **supabase/parcours.sql – Nutzer muss es ausführen** (Tabelle parcours_runs, prüft
    Punkte = Summe im Code; Funktionen random_parcours_run, parcours_top schon dabei).
    Zeiten prüft der Server seit Teil 15 (96e1d33, Tester 8/10: ≤ 31 s, ≤ 1 Treffer je
    0,5 s; TS-Spiegel parcoursCodePlausible – hängt an der 250-ms-Pause nach Treffern;
    **parcours.sql erneut ausführen**). Sende-Promise: ✓ Teil 10.
  - [x] Teil 8 (94e1420, Tester 8/10, EAS auto + preview): Gegner von heute (Server,
    random_parcours_run, ähnliche Punkte) ersetzt vor dem Start den eigenen Ghost; Name in
    Kopfleiste/Endkarte, Startkarte „🌍 Gegner von heute: Name (Punkte: N)“.
  - [x] Teil 9 (031ed62 + 98a23ec, Tester 8/10, EAS auto + preview): Startkarte „🌍 Gegner
    wird gesucht …“ (nur diese Zeile während der Suche), „Geschlagen: Name (N)“ /
    „Gleichstand mit Name“, Ghost-Zeile einzeilig. Offen: nach erfolgloser Suche kurzer
    Hinweis „heute noch kein Gegner“ (✓ 6495de2 + 3595ed2, Tester 8/10: „🌍 Gerade kein
    Gegner da – spiel vor …“, nur ohne eigenen Lauf); `searching` bei Ausnahme nicht
    zurückgesetzt.
  - [x] Teil 10 (755ad7b, Tester 8/10, EAS auto + preview): Rangliste-Reiter „Parcours
    des Tages“ (parcours_top, Punkte von heute, wartet ≤ 3 s auf den eigenen Lauf).
    Offen: über Mitternacht offen → gestrige Liste.
  - [x] Teil 11 (c3501e0, Tester 8/10, EAS auto + preview): Parcours-Endkarte hat Knopf
    „Rangliste“ (nur Parcours des Tages, Punkte > 0) → Reiter Parcours. Offen: Runde über
    Mitternacht öffnet die Liste des neuen Tages.
  - [x] Teil 12 (83a1fc9, Tester 8/10, EAS auto + preview): eigener Platz auch außerhalb der
    Top 50 (SQL parcours_my_rank – **parcours.sql erneut ausführen**; ohne: wie bisher).
    Offen: „Platz X von N“.
  - [x] Teil 13 (033e3be + 24eb413, Tester 8/10, EAS auto + preview): Freund im Parcours
    des Tages herausfordern (Dialog „🎯 Parcours des Tages“, SQL friend_parcours_run –
    **parcours.sql erneut ausführen**); Startkarte „👫 Name spielt mit“ / „hat heute noch
    nicht gespielt“ / „kam nicht an“. Offen: Dialog hat 4 Knöpfe (Android zeigt 3); Tag
    als Parameter statt neu berechnet.
  - [x] Teil 14 (dee8363, Tester 8/10, EAS auto + preview): „Heute offen“ zeigt auch den
    Parcours des Tages (🎯 „Name: N Punkte“, SQL friend_parcours_today – **parcours.sql
    erneut ausführen**). Offen: eigener Bestwert nur lokal; Zeilen nach Abstand sortieren.
- [ ] **R4d** Zufallsgegner: Server liefert einen Lauf ähnlicher Stärke
  (gleicher Modus, Seed der Woche). Neues SQL → Nutzer muss es ausführen.
  Dabei G3-Rest lösen: Server prüft Treffer/Zeit gegen den Code.
  - [x] Teil 1 (75ee285 + db69df8, Tester 6/10 → 8/10, EAS auto + preview): Sprint +
    Survival senden jeden fertigen Lauf als Code (encodeSprint: Tonne + Zeitabstand,
    3 Zeichen/Wurf) an supabase/online.sql (**Nutzer muss es ausführen**); Start holt
    einen Lauf eines anderen Spielers von heute mit ähnlich vielen Treffern (unter den
    5 nächsten zufällig), richtig/falsch rechnet die App nach; Startkarte „🌍 Gegner: …“,
    umschaltbar auf eigenen/Übungs-Ghost, „Suche Gegner …“; nur vor dem Start übernommen.
  - Offen: Seed der Woche statt Tag (mehr Gegner); Server rechnet `correct` nicht nach
    (nur Auswahl betroffen); Startkarte springt kurz nach der Suche (✓ 914b41c + 2a170e7–e55f779, Tester 8/10, 5/10 → 7/10: gemeinsamer Platz auch für Freundes-Hinweise, Gegner-Zeile bis 3 Zeilen; ✓ friends.noRun kurz „… – spiel zuerst!“ d5f0994 + 92caa33, Tester 7/10); Hinweis, wenn
    während der Suche gestartet wurde; Gegner auch für das Ghost-Rennen.
- [ ] **R4e** Freunde: eigener **Freundes-Code** (z. B. EMRE-4821), Freund
  hinzufügen per Code/Link, Liste mit „Herausfordern“ + offenen Herausforderungen.
  - [x] Teil 1 (3d05241 + 1a9988b + 351ddc8, Tester 7/10 → 7/10, EAS auto + preview):
    Karte 👫 Freunde im Online-Bereich (app/freunde.tsx): eigener Code (6 Zeichen,
    z. B. K7Q-X2M, teilen), Freund per Code hinzufügen (beide Richtungen), Liste mit
    ⏱️/🛡️-Wochenbestem, Entfernen sperrt (kein erneutes Eintragen), max. 50 je Seite;
    supabase/freunde.sql (**Nutzer muss es ausführen**, nach online.sql).
  - [x] Teil 2a (9a139ac + a75b75f, Tester 8/10, EAS auto + preview): ▶ in der
    Freundesliste → Sprint/Survival gegen den Lauf des Freundes von heute als Ghost
    (`/runde?mode=…&friend=CODE`, SQL friend_run – **Nutzer muss freunde.sql erneut
    ausführen**); Hinweise „hat heute noch nicht gespielt – spiel vor“ / „kam nicht an“.
  - [x] Teil 2b (a9e4a32, Tester 8/10, EAS auto + preview): Karte „⚔️ Heute offen – schlag
    deine Freunde“ oben in der Freundesliste: Freunde mit heutigem Lauf ≥ meinem Besten von
    heute (lokal), je Modus eine Zeile + „Antreten“; SQL friend_today (freunde.sql erneut
    ausführen); ohne SQL/Netz unsichtbar.
  - [x] Gleichstand in „Heute offen“: eigene kurze Zeile „Gleichstand – 1 mehr gewinnt!“
    (5ffc64e + 3cf03ba, Tester 6/10 → 8/10, EAS auto + preview; `tie` in openChallenges).
  - [x] Freund mit 0 richtig ist keine offene Herausforderung (+ Test; 727437e + 6fa9919,
    Tester 8/10, EAS auto + preview). Offen: Test „0 neben >0“.
  - Offen: eigener Bestwert nur lokal
    (anderes Gerät → 0); Unterschied (✓ „Noch N mehr als dein Bestes – dann gewinnst du!“, 253676c, Tester 7/10); Zeile ganz antippbar (✓ 5312813, Tester 8/10); Lauf kommt nach
    dem Start an → Hinweis; „nicht mehr befreundet“ eigener Text; nach der Runde
    zurückfordern/teilen; Link statt Code;
    „Code neu erzeugen“; Code mit einem Tipp kopieren; Knopf „Hinzufügen“ volle Breite (✓ 32fceca + 0f17c64, Tester 8/10);
    Grenze 50 nicht gegen gleichzeitige Aufrufe gesichert (Ausgabe gedeckelt).
- [ ] **R4f** Ranglisten je Modus (Woche + Allzeit), eigener Platz immer sichtbar.
  Zeit/Survival/Tricks gibt es danach **nur noch online mit Rangliste**
  (solo nur als Kampagnen-Station ohne Rangliste).
  - [x] Teil 1 (10d56aa, Tester 8/10, EAS auto + preview): Rangliste hat vorn die Reiter
    Zeit-Sprint + Survival mit „Diese Woche“ (ab Montag) / „Allzeit“, gewertet „N richtig“
    (bester Lauf je Spieler, aus online_runs); SQL online_top/online_my_rank in
    supabase/online.sql (**Nutzer muss die Datei erneut ausführen**).
  - [x] Teil 2 (9c90613 + 84a7a0c, Tester 7/10, EAS auto + preview): Knopf „Rangliste“
    im Sprint-/Survival-Endbildschirm öffnet den passenden Reiter (?tab=), wartet ≤ 3 s
    auf den eben gesendeten Lauf, Doppeltipp-Sperre; fehlt das SQL (404) → „Diese
    Rangliste wird gerade eingerichtet“ statt „Keine Verbindung“.
  - [x] Teil 3 (7a367cf, Tester 8/10, EAS auto + preview): alte Reiter „Gegen die Zeit“/
    „Ohne Fehler“ ausgeblendet; beide Modi (Chips im Pfad) solo ohne Rangliste (BOARD nur
    noch zielwurf), kein Platz-Hinweis mehr im Endbildschirm; lokaler Bestwert bleibt.
  - [x] Teil 4 (011246e + 141c478, Tester 8/10, EAS auto + preview): „Erneut versuchen“
    auch bei „wird eingerichtet“, Text „Versuch es später nochmal“.
  - [x] Solo-Endbildschirm „Gegen die Zeit“/„Ohne Fehler“: Knopf „Online: Zeit-Sprint“ bzw.
    „Online: Survival“ (be5c1d8, Tester 7/10, EAS auto + preview).
  - Offen: Sprint-Gleichstand nach Zeit?; Tricks ✓ (Parcours-Reiter, R4c Teil 10); (erledigt:) Hinweis „Für die Rangliste: Zeit-Sprint“ im
    Endbildschirm der Solo-Modi; FixedBoard zeit/runden nur noch Altdaten.
- [ ] **R4g** (1.1) **Live-Duell parallel** auf zwei Handys (G4, Supabase
  Realtime): beide werfen gleichzeitig denselben Gegenstand, wer zuerst richtig
  trifft, holt den Punkt; Variante: gleiche Gegenstände, unterschiedliche
  Geschwindigkeit. Mit Freunden zuerst, Zufalls-Warteschlange danach.
- [x] **R4h** Sofa-Duell (Emres Schnell-Duell, 1 Handy) als 4. Karte „Zu zweit
  an einem Handy“ behalten. (Karte „hub.duel“ in app/online.tsx – Emre, 02.11. geprüft.)

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

- [x] **R5a** Datenmodell: Level ohne feste Zieltonne (`lanes: "all"`),
  Pflicht-Element je Spur bzw. „durch das wandernde Element“. Fairness-Test
  prüft jede der 3 Tonnen (Test dauert ~3× so lang → Level einzeln testen).
  (13a80f4: `ParcoursLevel` mit `lanes[3]`, `parcoursLane()`, PARCOURS 1 =
  wandernder Reifen; `-t "Parcours"` ~50 s)
- [x] **R5b** Reifenschaukel (Modell + Pendel-Bewegung + Kollision) als erstes
  Parcours-Element; gleitender Ring wird dadurch ersetzt. (b337dfa, 863473a:
  Bewegung `swing` in physics.ts, Autoreifen r 0,62/Rohr 0,13 am 3,5-m-Seil,
  ±1 m; Zeitfenster Mitte 25 %, außen 38 %. Offen für R5d: Reifenoberkante
  auf kleinem iPhone nahe am oberen Rand – Kopfleiste darf ihn nicht
  verdecken; Seil hat keine Kollision.)
- [x] **R5c** Torwand mit 3 Löchern; Trampolin + Klappdeckel auf alle Spuren.
  - [x] Teil 1: PARCOURS 2 = Trampolin vor jeder Tonne (halfW 0,52, sonst
    überlappen die Rahmen), eigener Text (d956503, dc8fe73).
  - [x] Teil 2: Torwand = 3 Felder (`board`, je ein Loch r 0,42, z 1,5,
    y 2,15–3,35 → auf dem Bildschirm über den Tonnen), PARCOURS 3, Holz-Ton,
    Hinweise „Erst durchs Loch“ / „Nimm das Loch vor deiner Tonne“
    (8a4163c, f9fba10). Pfosten ohne Kollision (außerhalb der Wurfbahnen).
  - [x] Teil 3: `flapAll` – alle Deckel klappen im Takt, PARCOURS 4 (166d269,
    350cee0). Später: Tipp „tip.flap“ spricht von einem Deckel – für flapAll
    eigener Tipp, sobald die Runde erreichbar ist.
  - Ideen Tester: bei „noBoard“ das
    richtige Loch kurz aufleuchten lassen. Für R5d: trifft man das Nachbar-Trampolin, sagt die Runde
    heute „noTrampoline“ – besser „falsches Trampolin“.
- [ ] **R5d** Parcours-Runde: Gegenstände aus dem Tages-Seed, eigene Zeit je
  Parcours (20 / 25 / 30 s), Punkte wie oben. Bewegung hängt nur an der
  Rundenzeit → Ghost des Gegners sieht exakt denselben Parcours.
  Tester-Hinweise zu R5a: eigener Speicher-Schlüssel (`parcours-1`, sonst
  Kollision mit Trick-Level 1); eigener Aufgabentext „Wirf, wenn es vor
  deiner Tonne ist“ (DE/EN); `props` der Spuren teilen sich ein Array –
  in der Runde nicht verändern.
  - [x] Teil 1 (b27fbe3 + bed0063, Tester 7/10, EAS auto – preview vom Nutzer
    abgelehnt/übersprungen): `/runde?mode=parcours&level=N` (components/game/parcours-round.tsx,
    game/parcours.ts +Tests): Abschnitt „Parcours“ auf der Trick-Seite (4 Karten mit Zeit +
    Bestwert), Startkarte mit Regeln, Gegenstände aller Tonnen aus dem Tages-Seed
    (`parcours-N`), Zeit je Parcours (`seconds`: 30/20/25/25), Punkte falsch 0 · richtig 1 ·
    Trick 3 · Swish +1 (nur mit Trick), Hinweis „falsches Trampolin“/„anderes Loch“, Tipp
    `tip.flapAll`, Endkarte mit Bestwert (StorageKeys.PARCOURS_BEST).
  - [x] Teil 2 (3d1d100, Tester 8/10, EAS auto): Zeitablauf auch nach dem Hintergrund
    (AppState + Prüfung beim Wurf), „Zeit um“ nur einmal.
  - [x] Teil 3 (54c2b00, Tester 8/10, EAS auto + preview – Teil 1/2 auf preview nachgeliefert):
    Lernkarte bei falscher Tonne (Begründung je Einstellung), 1,2 s Lernpause danach.
  - [x] Teil 4 (cc54d06 + 746ff40, Tester 8/10, EAS auto + preview): Regelzeile
    „❌ Falsche Tonne: kurze Pause zum Lernen“; Endkarte „Dein Bestwert: N · noch X Punkte“
    bzw. „So gut wie dein Bestwert“.
  - [x] Teil 5 (0867945 + 66910e8, Tester 8/10, EAS auto + preview): Lernkarte verschwindet
    beim nächsten gültigen Wurf; 0 Punkte ohne Bestwert → „Du schaffst das!“.
  - [x] Teil 6 (07db4cb, Tester 8/10, EAS auto + preview): Sicherheitsnetz – meldet die Szene
    nach 8 s keine Landung, zählt der Wurf als daneben; späte/doppelte Landungen (Wurf-Id)
    zählen nicht. Rest: Netz an Szenen-Spielzeit koppeln (Hintergrund), alten Gegenstand
    dann aus der Szene nehmen, „daneben“ nicht in Bildmitte, Unit-Test.
  - [x] Start-/Endkarte scrollbar, wenn zu hoch; oben Platz für X (fba6aa5 + cab0431,
    Tester 8/10, EAS auto + preview).
  - [x] Lernkarte blendet beim Wurf weich aus (Reanimated FadeOut 160 ms, außer „Weniger
    Bewegung“; b623cec + b7f9f5a, Tester 8/10, EAS auto + preview). Tipp-Karte ploppt
    160 ms später (TipCard `delay`; 63fcfee + c750d62, Tester 8/10) – kein Überlappen.
  - Offen:
    Lernkarte statt nur „Gehört in“; Startzeit der Szenen-Uhr für den Ghost (R4c)
    mitschreiben. Parcours eingebunden: Online ✓ (R4c Teil 1), Kampagne ✓ (Station
    „Parcours des Tages“ am Ende der letzten Welt, 2a46fff + 976988f, Tester 7/10).
  - [x] Wisch nach Ablauf: kräftiger Stoß (nicht die Fehlwurf-Warnung); Bestwert-Zeile der
    Endkarte ohne 🏆 vorgelesen (16d1700 + 82712ea, Tester 8/10, EAS auto + preview).
- [x] **R5-Vorlauf (Emre, 02.11.)**: Zielen genauer – Vorschau zeigt beim Halten die
  ganze Bahn bis zur ersten Berührung + pulsierenden Aufprall-Ring; 🎲 Zufalls-Trick
  auf der Trick-Seite (nur geprüfte Level/Vorlagen, teils gespiegelt, ohne Sterne);
  Meister-Level 25–28 (Reifen/Windrad/Trampolin + klappender Deckel), Fairness grün;
  Trick-Schule der letzten Welt nimmt alle Level ab 21 (worldTricks).
- [ ] **R5e** Bisherige Level 1–24 werden „Trick-Schule“ (Seitenpfad der
  Kampagne, je ein Element erklären, feste Tonne ok). Wäscheleine, Basketball,
  Laubbläser, Lieferwagen nach und nach (Kann).

### R6 – Crunch & Belohnungsgefühl (Soll, viel per EAS-Update nachlieferbar)
- [x] **R6a** Aufprall-Partikel in der **Farbe der Wurfspur** beim Treffer.
  (a033f2c + 2164cc3, Tester 8/10, EAS auto + preview): TRAIL_SPARKS je Spur in
  game/rewards.ts (+Test), Treffer-Funken = Spur + Tonnenfarbe + Material; Standard
  unverändert. Offen: Gold-Spur – Perfekt-Treffer stärker weiß; auch Trick-/Sprint-Runden.
  Hinweis: R5 vorerst übersprungen – Emre arbeitet am 02.11. selbst an den Trick-Dateien.
- [ ] **R6b** Material-Effekte: Banane/Bio **platscht** (Spritzer), Glas
  **splittert** (Scherben-Funken), Dose **knautscht**, Papier flattert.
  Töne der Materialien bleiben erhalten (CLAUDE.md).
  - [x] Teil 1 (64979ce + 4599002, Tester 8/10, EAS auto + preview): Burst-Stil je
    Material (effects.tsx): Bio flache Spritzer, Glas schnelle breite Scherben, Papier
    flatternde Schnipsel (wenig Schwerkraft, viel Luftwiderstand, Pendeln); fester Pool.
  - [x] Teil 2 (4e55c7d + 14b3005, Tester 8/10, EAS auto + preview): Bio-Spritzer immer
    erdig (Tonnenfarbe + Grün/Braun), keine Spurfarbe.
  - [x] Teil 3 (51dae22, Tester 8/10, EAS auto + preview): auch im Parcours (Trick-Treffer
    mit Material-Stil, normaler Treffer kleiner Burst).
  - [x] Teil 4 (6f0f15e + ddf1b4e, Tester 8/10, EAS auto + preview): auch Sprint/Survival
    (Bio erdig, sonst Spielerfarbe + Material); Parcours-Höhe wie Hauptspiel.
  - Offen: Dose knautscht (Gegenstand beim Einwurf stauchen); Trick-Runden; Sprint-Ring
    bei schneller Folge evtl. kleiner;
    Spur bei Bio-Perfekt evtl. als eine Farbe dazu.
- [x] **R6c** Kurzer Treffer-Stopp (Hit-Stop ~60 ms) + leichtes Wackeln bei
  Serie 10/Boss; Haptik-Stufen. (e7bdfea + 988d002, Tester 8/10, EAS auto + preview):
  Serie 10/20 … → hitStop 60 ms (nicht doppelt mit Swish) + shake 0,03 beim Fieber-Start;
  Haptik mittel, kräftig bei jeder 5er-Serie. Offen: Boss-Sieg/-Tausch mit Wackeln.
- [ ] **R6d** Belohnungs-Momente: Truhe öffnen, Stern-Animation im Pfad,
  „Neue Tonne freigeschaltet!“. Hot-Path-Regel beachten (keine Objekte pro Frame).
  - [x] Teil 1 (589e924, Tester 8/10, EAS auto + preview): erster Boss-Sieg → Karte
    „🎉 Neue Tonne frei!“ mit Tonnen-Etikett(en) der nächsten Welt im Endbildschirm
    (federt auf, ruhig bei „Weniger Bewegung“); nicht nach der letzten Lern-Welt.
  - [x] Teil 2 (7eab8af + 0e5d958, Tester 8/10, EAS auto + preview): Sterne einer Station
    springen nach der Rückkehr aus der Runde auf, wenn es mehr geworden sind (StationDot,
    useLayoutEffect, ruhig bei „Weniger Bewegung“).
  - Offen: Karte „Neue Tonne“ antippbar (was gehört rein?); kurzer Erfolgston; Truhe
    öffnen ist schon da (R3c).

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
  - [x] Teil 1 (b49031f + 5bb9254, Tester 6/10 → 8/10, EAS auto + preview): Knopf
    „Ergebnis teilen“ im Sprint-/Survival-Endbildschirm – Text (geschlagen/Ergebnis) +
    „Online → Freunde → Freund hinzufügen → CODE“; Code vorab geladen (nie warten).
  - Offen: Bild statt Text (braucht view-shot o. ä.); App-Name/Store-Link im Text (R7).
    ✓ „Gleichauf mit {name}“ bei Gleichstand (4224f1a, Tester 8/10, EAS auto + preview).
  - [x] Teil 2 (a050505 + bb945d9, Tester 8/10, EAS auto + preview): „Ergebnis teilen“ auf
    der Parcours-Endkarte (nur Parcours des Tages, Punkte > 0; „geschlagen“ nur gegen echten
    Gegner/Freund; mit Freundes-Code).
- [x] **R8b** Tägliche Herausforderung „Tagesbester“ teilbar. (82d4ea1 + 6b51c12, Tester
  8/10, EAS auto + preview): Ghost-Rennen-Startkarte „👑 Teilen: Bester Lauf heute“, wenn
  man heute den besten Lauf aller hat – Text + Code zum Nachspielen. Offen: Startkarte auf
  375×667 ohne Scrollen prüfen.
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
- [x] Tutorial-Stufen aus STREAK_TIERS statt fest im Text. (faabbd3 + 14d45e0, Tester 8/10)
- [x] Meldung beim 10. Treffer zeigt ×6, gezählt ×2 – prüfen. (e30d461, Tester 8/10):
  Rechnung stimmt (×6 gilt ab dem nächsten Wurf), Text jetzt „Ab jetzt ×N!“.
- [x] Tagesaufgabe: Endbildschirm überdeckt im letzten Wurf die Fehlerrückmeldung.
  (ef4c485, Tester 8/10): falscher letzter Wurf → Ende nach 1,9/2,6 s wie „Ohne Fehler“.
  Offen: Zeiten 1800/2300 + 1900/2600 als gemeinsame Konstante.
- [x] „Ohne Fehler“: Lernkarte länger sichtbar. (schon so: 1,8/2,3 s, Ende 1,9/2,6 s)
- [x] „Abgelaufene Medikamente“ steht als Sondermüll – meist Restmüll (UBA), Apotheke
  freiwillig. Kategorie/Fakt prüfen (in Kampagne vorerst ausgelassen). (02ce44d, Tester
  8/10): jetzt Restmüll, Fakt „In den meisten Orten …“, Begründung „Wird sicher verbrannt“.
- [x] „Alles zurücksetzen“ (einstellung.tsx) löscht Kampagnen-Sterne nicht. (e30d461):
  so gewollt – Text sagt jetzt „Sterne (Pfad und Tricks) bleiben“.
- [x] Ghost-Ideen: Gleichstand „gleich schnell (0,1 s)“, `\b` in isOtherVersionCode.
  - [x] `\b` (f1ae3d7, Tester 8/10, EAS auto + preview) + Test.
  - [x] Gleichstand-Text (158e7a7 + 659d775 + 3efb96c, Tester 6/10 → 8/10): Erklärzeile
    nur, wenn die Tabelle sie zeigt. Offen: eigener Ghost, Unterschied nur in ms → „knapp“.

---

## 5. Danach (Version 1.1+, nach dem Start)
Live-Duell (R4g) · Zufalls-Warteschlange live · Sticker (R8c) · Passanten/Autos
(R9b) · neue Szenen (R9c) · Trick-Level T1–T6 · Wochen-Liga · Schutzschild bei
„Ohne Fehler“ · eigene Tonnen-Skins.
