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

## 2. Zielbild (mein Vorschlag – bitte gegenlesen)

### 2.1 Das Prinzip „Tonnen-Welt“
Der Startschirm bleibt die 3D-Straße mit **3 Tonnen**. Aber:
- Die **Beschriftung sitzt auf der Tonne** (Schild/Etikett als Teil des 3D-Körpers bzw. exakt
  an die Tonne gepinnt, bewegt sich mit, wackelt mit) statt als Karte darüber (← deine #11).
- Szene/Kamera **näher** an die Tonnen, Modi-Schilder dicht an ihrer Tonne (← #10).
- **Ein Wurf oder Tippen führt auf den Zielbildschirm der Tonne** (bei der Kampagne: der Pfad,
  bei Online: der Online-Hub). Es wird nichts gestartet, bevor du gewählt hast (← #5).
- Jede Tonne hat **ein kleines Zweitziel** als Chip daneben („Pfad“, „Freunde“, „Buch“) –
  der Hauptweg ist groß, der Nebenweg klein.

### 2.2 Die drei Tonnen
**🟢 Kampagne (Lernpfad)**
- Tippen/Wurf → **öffnet den Pfad**, dort wählst du die Station selbst. Die nächste Station ist
  hervorgehoben (Pfeil/Puls), ein Tipp darauf startet sie. Der automatische Direktstart nach dem Wurf entfällt.
- Pfad-Seite bleibt (gefällt dir), aber die **Tagesmission** wird neu gestaltet (← #6):
  statt KI-typischer Karten im Pfad ein **Stempelzettel** (3 Stempel, hängt wie ein Zettel an
  der Tonne bzw. oben im Pfad als schmale Leiste). Tagesaufgabe/Flamme wandern in den
  Startschirm-Kopf als ein einziger Chip „🔥 4 · 2/3“.
- Nach einer Station: Endscreen im Tonnen-Stil, „Weiter“ = nächste Station, „Pfad“ = zurück zur Auswahl.

**🔵 Online (ein Bildschirm, 3 Reiter statt 8 Karten)**
- Reiter **Duell · Freunde · Rangliste** (Segmented-Leiste im Tonnen-Stil).
- **Duell:** 3 große Modus-Karten (Sprint · Survival · Trick-Küche/Parcours). Antippen →
  kleines Blatt unten: „Zufallsgegner“ · „Freund herausfordern“. Kein extra Bildschirm.
- **Freunde:** eigener Code groß oben, Freundesliste, **„Code eingeben“ hier drin** (← #2),
  „Heute offen“ (Herausforderungen) darunter.
- **Rangliste:** pro Modus, Woche/Allzeit, eigener Platz fix unten.
- **Entfällt:** „An einem Handy“ (Duell lokal) komplett, doppelte Code-Karte, `modi.tsx`-Reste.
  Der Ghost-Code-Wettkampf bleibt – als „Freund herausfordern“.

**🟡 Sammlung → „Dein Regal“ (gefüllt, nicht leer)**
Eine Seite statt Weiche + 2 Unterseiten (← #4):
- **Kopf:** Level + XP-Balken, Flamme, Sterne gesamt, Medaillen-Zähler.
- **Reiter Buch** (Standard, sofort sichtbar): Raster aller Gegenstände – gefunden = Modell
  + Medaille, noch nicht = Silhouette „?“. Tippen → Detail (Tonne, Begründung, Fakt).
- **Reiter Belohnungen:** Wurfspuren, Sticker, Truhen.
- **Reiter Heute:** Tagesmissionen (der Stempelzettel) + Tagesaufgabe.
- Die gelbe Tonne zeigt oben **das zuletzt gefundene Gegenstandsmodell** herausschauen
  (lebendig statt leer, ← #7).

### 2.3 Trickwürfe neu (← #8) – eigener Workshop
Nicht mehr „Hindernisse auf dem Hausplatz“, sondern **eine Szene mit Sinn: die Küche**
(Arbeitsplatte, Spüle, Hängeregal, Herd/Pfanne, Kühlschranktür …). Hindernisse sind
alltäglich und glaubwürdig, **die 3 Tonnen stehen trotzdem davor/daneben und müssen
unterschieden werden** (Hindernis lenkt, aber entscheidet nicht die Tonne).
Das planen wir **gemeinsam** (siehe F9, Fragen unten), bevor ich Code anfasse.

### 2.4 Lebendige Tonnen (← #7)
Tonnen bekommen Leben: Deckel klappt beim Antippen, sie wackeln beim Treffer, und es kommt
etwas **heraus** – Papierschnipsel, Dosenklang-Blitz, Blätter, ein Gegenstand lugt aus der
Sammlung-Tonne. Erst nach dem Gerüst (Phase E), weil es Politur ist.

---

## 3. Phasen (Reihenfolge, Aufwand in „Sitzungen“ ≈ ein Arbeitslauf mit Test)

Regel wie bisher: je Aufgabe klein, getestet (tsc, eslint, jest, `gameplay-tester`),
Normalmodus = Push + EAS `auto` und `preview`. Größere Umbauten laufen hinter einem
Schalter und werden erst freigegeben, wenn der ganze Phasenteil steht (kein halber Umbau auf `preview`).

### Phase A – Fundament: ein Design, eine Navigation (zuerst, alles baut darauf auf)
- [ ] **F1 Bausteine „Tonnen-Stil“** – gemeinsame Komponenten in `components/ui/`:
  Seitenkopf mit Tonnenfarbe + Zurück, Karte, Chip, Segmented-Reiter, Bottom-Sheet,
  Fortschrittsbalken. `hub.tsx`/`page-header.tsx`/`card.tsx` zusammenführen, alle
  bestehenden Seiten darauf umstellen (nur Optik, kein Verhalten). *1–2 Sitzungen*
- [ ] **F2 Navigationsregeln**: ein Zurück-Weg, Endscreens kehren dorthin zurück, wo man
  gestartet hat (Online-Duell → Online-Reiter Duell; Station → Pfad; Buch → Regal).
  Deep-Links (`/runde?mode=…`) bleiben abwärtskompatibel. *1 Sitzung*
- [ ] **F3 Startschirm näher & Schilder an die Tonne** (← #10, #11): Kamera/Szene weiter nach
  vorn, Modus-Schilder und Chips an die Tonne gepinnt (Position aus der 3D-Projektion der
  Tonne, bewegen sich mit). Kopf-Chip „🔥 Flamme · Missionen“. Beachten: Tipp-Flächen der Tonnen
  und Kopf-Regel aus CLAUDE.md („nichts unterhalb des Level-Chips“). *2 Sitzungen*
- [ ] **F4 Kampagne: erst Pfad, dann Station wählen** (← #5): Direktstart in `go()` (`index.tsx`)
  entfernen, Wurf und Tippen öffnen nur `/kampagne`; nächste Station im Pfad klar hervorheben.
  „Nächste Station“ im Endscreen bleibt. *½ Sitzung*

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
- [ ] **F8 Regal-Seite** (← #4): Kopf (Level/Flamme/Sterne), Reiter Buch · Belohnungen · Heute,
  `sammlung.tsx` + `sammelbuch.tsx` + `belohnungen.tsx` zusammenführen (Altrouten leiten um).
  Silhouetten für noch nicht gefundene Gegenstände. Tagesmissionen als Stempelzettel hierher
  (← #6, mit F11). Gelbe Tonne zeigt zuletzt gefundenes Modell. *2–3 Sitzungen*

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
- [ ] **F12 Tagesmission neu gestalten** (← #6): Stempelzettel-Komponente, Startschirm-Chip,
  im Pfad nur eine schmale Leiste. *1 Sitzung* (ggf. vor F8, weil beide es brauchen)
- [ ] **F13 Lebendige Tonnen** (← #7): Deckel-/Wackel-Animation, Partikel „kommt etwas heraus“
  je Tonne (Hot-Path-Regel beachten: keine Objekte pro Frame), Sammlung-Tonne mit Gegenstand. *2 Sitzungen*
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
3. **Erstes Mal geführt:** Beim ersten Start zeigt eine kleine Figur nur die **grüne** Tonne
   (Kampagne); die anderen beiden sind „zugedeckelt“, bis man 3 Stationen hat – weniger Auswahl
   am Anfang, mehr Entdeckung später. Hilft besonders Spielern mit wenig Deutsch.
4. **Küche als Kampagnen-Welt „Zuhause“:** Sortier-Stationen (Küchenabfälle) und Trick-Stationen
   in derselben Szene – dann ist Trick kein Fremdkörper.
5. **Tonnen sprechen:** Mini-Reaktionen (Emoji-Blase, kein Text) statt Meldungstexten – gut für
   Sprachbarriere.
6. **Fortschritts-Anker:** Regal zeigt „12 von 60 Gegenständen“ – wiederkehrender Sammelreiz.
7. **Alles hinter Schalter:** Neue Menüs zuerst per Feature-Flag, damit `preview` (Emres Version)
   nie halb umgebaut ist.

---

## 5. Offene Fragen an dich (bitte kurz antworten, dann arbeite ich weiter)
1. **Release-Termin:** Gilt noch „Ende der Woche“? Der Umbau (A–E) sind realistisch **8–12 Sitzungen**
   plus Trick-Küche 4–6. Ich würde den Termin um ca. 1–2 Wochen schieben und Phase F zuletzt machen.
   Oder Trick-Küche erst in 1.1?
2. **Trick-Workshop – dein Gefühl:**
   - Soll Trick-Küche ein **eigener Modus** sein oder eine **Kampagnen-Welt**? (Ich: beides, s. Idee 4.)
   - Wie bleiben die Tonnen **unterscheidbar**? (a) Hindernis steht *vor* nur einer Tonne und
     lenkt zur falschen, (b) Hindernis lenkt den Wurf, aber die Tonne muss man weiter selbst
     wählen, (c) Pflicht-Prellfläche *und* danach Zieltonne wählen. Ich würde (b)+(c) mischen.
   - Welche Küchen-Hindernisse sollen rein? (Vorschlag: Hängeregal, Bratpfanne, Topfdeckel
     als Trampolin, Kühlschranktür offen, Spülbecken-Bogen, Gewürzregal, fahrender Brotkorb.)
3. **Online-Modi:** Reichen Sprint · Survival · Trick-Küche als drei Duelle?
4. **Tonnen-Schilder:** lieber **echte 3D-Etiketten** (sehr „aus einem Guss“, aber Text auf Textur,
   Schrift schwerer lesbar/übersetzbar) oder **gepinnte UI-Schilder** (scharf, einfach, leicht
   anders)? Ich schlage gepinnte UI-Schilder im Tonnen-Look vor.
5. **Tagesmission:** Stempelzettel (Idee) oder lieber ganz weglassen und nur Flamme + Tagesaufgabe?
6. **Reihenfolge-Wunsch:** Ich würde mit **Phase A (F1–F4)** starten (löst #1, #3, #5, #10, #11
   auf einen Schlag und ist Basis für alles). Okay?

---

## 6. Regeln für die Umsetzung (gelten weiter)
Aus CLAUDE.md: Texte DE + EN, Töne nicht verwässern, Hot-Path ohne neue Objekte pro Frame,
Tester vor Push, EAS auf `auto` **und** `preview`, nichts löschen, was genutzt wird. Zusätzlich:
- Jeder Umbau wird erst **auf `preview`** gelegt, wenn die Phase in sich stimmig ist.
- Pro Seite ein Screenshot-Vorher/Nachher in der Roadmap-Notiz (vom Gerät, wenn du magst).
- Wenn eine Aufgabe >1 Sitzung braucht, zerlegen wir sie in abgeschlossene Teile (a, b, c).

**Letzter Stand:** alte Roadmap bis R7e/R10 abgearbeitet (`ROADMAP-alt.md`); `sdk-58` hängt auf
GitHub wegen Serverfehler beim Push noch bei `e630f1e` (`auto-improve` aktuell).
