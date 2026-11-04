# Roadmap „Fertigstellung“ (neu, Stand 4.11.2026)

Die alte Roadmap (R1–R10, mit allen Commit-Kürzeln) liegt unverändert in
[ROADMAP-alt.md](ROADMAP-alt.md). Diese hier beschreibt, **wie das fertige Produkt aussieht**
und in welcher Reihenfolge wir dahin kommen. Aufgaben heißen jetzt **F1…**; übernommene
alte Punkte stehen mit ihrer alten Nummer (z. B. „← R6b“).

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
- [ ] **F3 Pfad als Startbereich** (← #5, #10, #11): Startschirm mit 3D-Tonnen wird durch den
  Pfad ersetzt; Kopf-Chips (Level, Flamme, ⚙️ ❓); Direktstart nach dem Wurf (`go()` in
  `index.tsx`) entfällt. Die 3D-Menü-Szene (`menu-scene.tsx`) wird nicht mehr geladen (Code
  bleibt, bis alles verifiziert ist). *1–2 Sitzungen*
- [ ] **F4 Pfad: nächste Station hervorgehoben, Stempelleiste** (← #6): Puls/Pfeil an der
  nächsten Station, Tagesmission als 3 Stempel oben, Tagesaufgabe/Flamme im Kopf. *1 Sitzung*

### Phase B – Online aus einem Guss
- [ ] **F5 Online-Hub mit Reitern** (Duell · Freunde · Rangliste) auf den F1-Bausteinen;
  `freunde.tsx` und `rangliste.tsx` werden Reiter-Inhalt statt eigener Seiten. *2 Sitzungen*
- [ ] **F6 Duell-Karten + Gegner-Blatt**: 3 Modi, „Zufallsgegner/Freund“ im Blatt; „An einem
  Handy“, doppelte Code-Karte und `ghost.code.enter`-Karte entfernen, „Code eingeben“ in
  Freunde. Tests für Duell-Reste anpassen, nichts löschen, was Ghost/Code braucht. *1–2 Sitzungen*
- [ ] **F7 Offene Online-Reste** (← R4d–f): Seed der Woche für mehr Gegner (neues SQL, **Nutzer
  führt SQL aus**), „Platz X von N“, Sortierung nach Abstand, eigener Bestwert serverseitig,
  Sprint-Gleichstand nach Zeit, Puls beim ersten Überholen, Gleichstand „knapp“. *2 Sitzungen*

### Phase C – „Dein Regal“ (Sammlung)
- [ ] **F8 Regal** (← #4): Kopf (Level/Flamme/Sterne), Reiter Buch · Belohnungen · Heute,
  `sammlung.tsx` + `sammelbuch.tsx` + `belohnungen.tsx` zusammenführen (Altrouten leiten um).
  Silhouetten für noch nicht gefundene Gegenstände. Tagesmissionen als Stempelzettel hierher
  (← #6, mit F11). Neu gefundener Gegenstand kommt aus einer animierten Tonne. *2–3 Sitzungen*

### Phase D – Trick-Küche (Workshop zuerst!)
- [ ] **F9 Workshop „Trick-Küche“** (mit dir, ohne Code): Hindernisliste, Regeln, wie die
  Tonnen unterscheidbar bleiben (siehe Fragen), wie viele Level, Punkte. Ergebnis: eine Seite
  Design hier in der Roadmap. *½ Sitzung, aber zuerst deine Antworten*
- [ ] **F10 Küchen-Szene + Hindernisse**: neue Szene (`stage.tsx`), 6–8 Küchen-Hindernisse als
  Modelle (Erkennbarkeit vor Details), Physik nutzt die vorhandenen Bausteine
  (`trick-props.tsx`, `trick-solver.ts` prüft Lösbarkeit je Level). Alte Level werden
  übernommen/umgebaut, nicht blind gelöscht. *3–4 Sitzungen, jeder Level einzeln getestet*
- [ ] **F11 Trick-Einstieg einbinden**: Küche als Welt in der Kampagne **und** als Online-Duell-Modus
  (Parcours des Tages ← R4c/R5d), gleicher Endscreen wie überall. *1 Sitzung*

### Phase E – Leben & Politur
- [ ] **F12 Tagesmission im Regal**: Reiter „Heute“ mit denselben Stempeln wie die Pfad-Leiste
  (Bausteine aus F4), Tagesaufgabe darunter. *½ Sitzung*
- [ ] **F13 Lebendige Tonnen im Spiel** (← #7): Deckel-/Wackel-Animation, Partikel „kommt etwas
  heraus“ je Tonne in der Runde und im Endscreen, neu gefundener Gegenstand aus animierter
  Tonne (Hot-Path-Regel beachten: keine Objekte pro Frame). *2 Sitzungen*
- [ ] **F14 Material-Effekte fertig** (← R6b): Dose knautscht beim Einwurf, Effekte auch in
  Trick-/Sprint-Runden, Gold-Spur bei Perfekt-Treffern, Boss-Sieg/-Tausch wackelt. *1–2 Sitzungen*
- [ ] **F15 Kampagne-Reste** (← R2/R3, „Offen (klein)“): übersprungene Stationen markieren,
  Zeit-Ziel 16 prüfen, Mitternacht/Truhen-Texte, „nochmal spielen“ bei erledigter Karte. *1–2 Sitzungen*

### Phase F – Release (ganz am Ende, großenteils Nutzer-Aufgaben)
- [ ] **F16 Ergebnis als Bild teilen** (← R8a, braucht Abhängigkeit view-shot o. ä. – **du entscheidest**).
- [ ] **F17 App-Symbol + Startbild** (← R7a, Entwurf von mir, Auswahl von dir).
- [ ] **F18 Leistung älteres iPhone** (← R7f, du testest, ich optimiere).
- [ ] **F19 Datenschutz + Impressum** (← R7d, **deine Angaben**), Link in Einstellungen.
- [ ] **F20 `eas build` + TestFlight** (← R7b), **Store-Eintrag** DE/EN + 5 Bildschirmfotos (← R7c).

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
