# Backlog – automatisches Verbessern

Oben = als Nächstes. Jede Aufgabe in kleine, fertige Abschnitte zerlegen.
Erledigtes mit `[x]` und Commit-Kürzel abhaken. Du kannst hier jederzeit
ergänzen oder umsortieren – ich lese die Datei zu Beginn jedes Zyklus neu.

Leitlinie: Das Spielgefühl soll sehr gut sein – ohne grundlegende Mechaniken
zu ändern.

## Offen

NACHT 2026-10-29, 00:10–08:15 (vom Nutzer gewünscht, ohne Aufsicht, NICHT
vorzeitig aufhören). Reihenfolge von oben nach unten. Ziel bleibt: jeder
Gegenstand allein am 3D-Modell erkennbar. Pro Zyklus 2–4 Modelle bzw. eine
kleine Aufgabe; Tester-Freigabe ≥ 7, sonst einmal nachbessern oder verwerfen.

**A – Modelle aus dem Audit (Rest)**
- [x] A8 Rest der „3er“ (Zeitungen 6773e72, Kabel/Kerze 42b5268, Kippe/Rasierer eb0188f, Plastiktüte 36d7306)
- [x] A9 Aus Audit 2 (Geschenkfolie+Thermometer 5031ae2, Nagellack+Senf a396b53,
  Schuhkarton+Kaffeesatz 6bc9564, Backpapier 03b40d8). Küchentuch-Prägemuster
  weggelassen: auf der Knüllform nicht sauber platzierbar, Unterschied reicht.
- [x] (d256aa5) A10 Fakt Druckerpatronen DE/EN: „Zurück in den Handel oder zum Hersteller
  – sie werden wieder befüllt.“ (Namen nicht ändern: Name = ID für Statistik.)

**B – Hinweise und Emojis**
- [x] (d256aa5, keine Doppelten über Tonnen mehr) B1 Emojis (Audit 2): Alufolie 🫙→✨/🍫, Senfglas 🥃→🌭, Trinkglas 🍷→🥃,
  Prospekt 🧾→📑, Nagellackentferner 🧴→💅, Parfüm 🧴→✨-Alternative,
  Energiesparlampe 💡→🔆, Eierkarton 🥚→🐣, Aluschale 🧽, Wattestäbchen 🧷,
  Chipstüte 🍬, Toilettenpapier 📜→🧻 (Küchenrolle dann anders). Jedes Emoji
  höchstens in einer Tonne; 🎁 (Geschenkpapier) bleibt.

**C – Inhalt (wenn A/B durch sind)**
- [x] C1 6 neue Alltags-Gegenstände (Kaugummi, Kaffeekapsel, Spraydose f8b3eb0;
  Teelicht-Hülle, Brötchentüte, Tablettenblister ba842b3)
- [x] (Level 23 Reifen+Laterne 955a28c) C2 1–2 neue Trick-Level als Kombination (z. B. Laterne + Reifen, Schild
  + fahrende Tonne) – nur mit grünem Fairness-Test.
- [x] (b2b0dde; fand Tages-Vorlage 5 → Bonus 1. Versuch) C3 Swish-Test strenger (mehrere Zellen, kleines iPhone).

**D – Kleinkram**
- [x] (c9ad16e) D1 Rückfrage beim Beenden: Fever-Zeit anhalten.

**E – Lernen und Feinschliff (vom Nutzer bestätigt)**
- [x] (schon vorhanden: Wiegen ±0,35 rad, bei „Weniger Bewegung“ still; volle Drehung
  verworfen – Rückseiten der Modelle sind schlicht) E1 Gegenstand dreht sich vor dem Wurf langsam (besser erkennbar); bei
  „Weniger Bewegung“ still.
- [x] (365a010) E4 Lernkarte (nur „Üben“, nach Fehlwurf) bekommt eine kurze Begründung
  (≤ 4 Wörter, alle Gegenstände DE+EN), Karte ~0,5 s länger, blockiert nichts.
  **Schalter in den Einstellungen** („Begründung nach Fehlern“, an/aus, Standard an).
- [x] E2 Leistungs-Check nach den Modell-Umbauten (Zeichenaufrufe, Ruckler).
  Ergebnis (statisch, 05:45): Modelle werden je Name einmal gebacken (bake: alle
  Lambert-Teile → 1 Mesh, Sonder-Teile je Material zusammengefasst → meist 2–4
  Zeichenaufrufe), Vorlagen werden per ModelWarmup (2/Frame) vorab gebaut, alle
  Formen low-poly (Icosaeder detail ≤1, Wellen 10×8, Zylinder ≤24 Segmente),
  Geometrien per memoGeo geteilt. Neue Effekte der Nacht (Fever-Pause) laufen
  nicht pro Frame. Kein Handlungsbedarf; echte Messung nur am iPhone möglich.
- [x] (9ebe8f5) E3 Sammelbuch: 3D-Vorschau des Gegenstands beim Antippen (nur wenn Zeit).
- [x] (209ca3b, behutsam: Sonne 1,5, Himmelslicht 1,3, Himmel ruhiger) E5 Szene: weicheres Licht, ruhigerer Hintergrund (ganz zum Schluss).

**F – Audit 3 (06:05)**
- [x] F1 Blister-Fakt widerspricht Medikamente=Sondermüll → „zurück in die Apotheke oder zur Sammelstelle“ (DE/EN).
- [ ] F2 Ergebnis-Liste + Sammelbuch: ohne Fakt die Begründung (ITEM_REASONS) zeigen.
- [x] F3 Emojis überall eindeutig: Kaffeefilter 🔻, Zeitschrift 📖, Senfglas 🟨 (+ Test).
- [ ] F4 Tutorial: Sondermüll im Tonnen-Hinweis, Tagesaufgabe + Trickwürfe in der Modus-Liste.
- [x] F5 Tages-Vorlage 1 (fahrende Tonne) Aufgabentext trick.task.ringMovingBin.
- [ ] F6 Trickwürfe-Beschreibung: nicht nur Reifen (DE/EN).
- [ ] F7 „Alles zurücksetzen“-Text ehrlich; learnReason.desc auch Tagesaufgabe.
- [ ] F8 VoiceOver: Sterne als „n von 3 Sternen“, Level-Aufgabe im Label.
- [ ] F9 Blister-Modell kontrastreicher (deckende Näpfe, Ränder, Aufdruck).
- [ ] F10 (klein) Teelicht-Begründung „Alu, wird recycelt“; noTrick bei zwei Reifen.

**Wenn alles erledigt ist, bevor 08:15 erreicht ist:** neues Audit (Modelle oder
ganze App) → Punkte eintragen → weiter. Nie leer laufen lassen.

Ältere Reste (niedrige Priorität). Neue Ziele/Hindernisse sind weiter erlaubt;
Werfen, Physik-Grundlagen und Wertung bleiben gleich.
- [ ] **Tonnen-Design, Rest** (optional): weichere Schatten/Kanten.
- [ ] **Gegenstände-Design**: einheitlichere Farben, weichere Formen, Material
  erkennbar (Glas glänzt, Papier matt). Je Zyklus eine Material-Gruppe.
  (Glas, Dose, PET erledigt; weiter optional: Papier, Bio, Rest.)
- [ ] **Szene aufwerten, nicht überladen**: (Pflasterfugen + Gully erledigt)
  dezenter Hintergrund, weiches Licht. Nichts lenkt vom Wurf ab.
- [ ] **Trickwürfe: echte Hindernisse**: (Straßenschild 19/20, Laterne 21 erledigt;
  Laterne an Außentonnen zu eng → verworfen; Idee: Laterne + Reifen; Markise
  verworfen: von vorn nicht fair bespielbar, Deckel schwingt durch; Bauzaun 22 erledigt).
  Später: Swish-Test strenger (mehrere Zellen, Wind-Gewichte, kleines iPhone). Je Hindernis
  1–2 Level, sanft steigend. Pflicht: Fairness-Test grün; sonst verwerfen.
- [ ] **Rückfrage beim Beenden, Rest**: Fever-Zeit anhalten; Trick-Runde
  einheitlich; Android-Zurück-Taste. (Geringer Nutzen auf dem iPhone.)
- [ ] **Eigenes App-Symbol und Startbildschirm** (erst mit eigenem Build sichtbar).

## Erledigt

- [x] Nacht 36: Walnuss-Runzeln, Saftflasche mit Metalldeckel, Kassenzettel eingerollt, Katzenstreu mit Schaufel
- [x] Nacht 35: Eisbox (eckig, Eiskugel-Bild), Aluschale (Glanz, Rippen), Metalldeckel (Riffelrand)
- [x] Nacht 34: Obstnetz (leeres Netz mit Clip), Druckerpatrone (Kontakte, C/M/Y), Energiesparlampe (Wendel)
- [x] Nacht 33: Windel (Sanduhr), Tapete (Altbau-Fetzen mit Putz), Staubsaugerbeutel (prall, Platte mit Loch)
- [x] Nacht 32: Kartoffelschale (Knolle, Augen), Zwiebelschale (Kupfer-Blättchen), Eierschale (braun, Bruchrand)
- [x] Nacht 31: CD, Geschirr, Pizzakarton zur Kamera gekippt, Pizzarest im Karton
- [x] Nacht 30: Briefumschlag, Visitenkarten, Notizblock eigene Formen; Altes Buch mit sichtbaren Seiten
- [x] Gläser: Gurke, Honig, Senf, Marmelade mit eigenem Inhalt/Deckel
- [x] Flaschen: Wein, Bier, Olivenöl eigene Formen (Modelle bekommen den Namen)
- [x] Neu: Backpapier (gebacken, Fettflecken), Eierkarton (Mulden, Ei)
- [x] Neu: Farbeimer, Walnuss-Hälften, Spiegel mit Rahmen
- [x] Neu gebaut: Alufolie, Styropor-Box, Slip, Butterpapier
- [x] Sachfehler Modelle: Geschenkpapier mit/ohne Folie, Papprolle vs. Küchentuch, Quecksilber silbern
- [x] Keine Hinweise unter dem Gegenstand (Material-Zeile weg, Blase neutral)
- [x] PET-Flasche: Glanzstreifen
- [x] Trinkglas oben offen (man sieht hinein)
- [x] Tipp wartet hinter der Lernkarte (Zeit läuft nicht weiter)
- [x] Fairness-Test: Swish-Bonus muss erreichbar sein (13 Level geprüft)
- [x] Trick-Hindernis Bauzaun, Level 22 (weit genug vor den Tonnen, keine Rückwand-Treffer)
- [x] Trick-Hindernis Laternenmast, Level 21 (Level 22 als bloße Kopie verworfen)
- [x] Trick-Hindernis Straßenschild als Bande, Level 19/20, Tipp und Hinweis
- [x] Sticker: eigene Freischalt-Meldung, Sticker auf Menü-Tonnen, Tests
- [x] Tonnen-Sticker als Belohnung (Stern, Herz, Punkte)
- [x] 4 neue Wurfspuren: Herbstlaub, Seifenblasen, Funken, Sternenstaub (ruhig bei „Weniger Bewegung“)
- [x] 4 weitere Gegenstände (Kaffeefilter, Zeitschrift, Obstnetz, Kerzenreste), Kronkorken-Modell
- [x] 6 neue Gegenstände: Kartoffelschalen, Kronkorken, Schuhkarton, Saftflasche, Backpapier, Trinkglas
- [x] Sondermüll: Einmal-Tipp zur roten Tonne, Modell Nagellackentferner
- [x] Sondermüll-Tonne ab Level 7 (Haus-Szene), Aufkleber, Modelle Laptop/Patrone/Energiesparlampe, Medikamenten-Text
- [x] Szene: versetzte Pflasterfugen + Gully (Wand-Szenen)
- [x] Getränkedose: Metall-Glanzstreifen
- [x] Glas-Gegenstände: Glanzstreifen
- [x] Tonnen-Aufkleber: Bild-Symbol statt Farbpunkt (Blatt, Flasche, Papier, ♻, Tonne)
- [x] Tonnen: Verstärkungsband + Deckel-Vorderkante (s. Commit „Tonnen: Band“)
- [x] Menü: kleinere Modus-Schilder, unteres Menü tiefer (329b48c)
- [x] Menü: Gegenstand über dem unteren Menü, nicht hinter „Weiter“ (1444aa6)
- [x] Trick-Level 17/18 (gespiegelt, Bonus getauscht) (c3f97cb)
- [x] Neues Trick-Level 16, ↕️-Symbol (d0d6c74)
- [x] Neues Trick-Level 15: zwei Reifen, unten drehend (323ff56)
- [x] Neues Trick-Level 14 (a15caca); Windrad+Gegenwind verworfen (nicht fair genug)
- [x] Kleinigkeiten Einstellungen/Belohnungen (f250002)
- [x] Material-Blase im Dunkelmodus (763a3a2)
- [x] Rangliste: Namenseingabe verbessert (2df7f91)
- [x] Trick-Runde: Rückmeldungen für VoiceOver (3a3d576)
- [x] Trick-Ergebnis scrollt, Knöpfe fest, Sterne-Label (a7b26b5); 2. Audit → Backlog
- [x] Sammelbuch: VoiceOver mit Lernstand/Tonne (0ddd4a2)
- [x] Ladeanzeige beim Rundenstart (e3dfa1c)
- [x] Tipp-Karte mit ✕ und Hinweis (46dc42f)
- [x] Rundenende: alle Fehler zeigbar, Lernzeilen, Ranglisten-Pille (9e6db7b)
- [x] Gesperrte Trick-Level erklären sich (b8edb5e)
- [x] Runde: Rückfrage vor dem Beenden, Uhr hält an (3a9324d); Audit → Backlog
- [x] Einstellungen: „Tipps wieder zeigen“ (1566886); Texte geprüft: alles DE+EN
- [x] Rangliste: „Nochmal versuchen“, Tab-Wettlauf behoben (4f4b029)
- [x] Rundenende: „Gut gemacht!“ bei einem Stern (ed0e4aa)
- [x] Rundenende: Emoji/Überschrift passend zu den Sternen (312f12f)
- [x] Töne: Lautstärke-Ausgleich nach Messung, Material unverändert (3198d61)
- [x] Kleinigkeiten Menü: Punkt am „?“, kurze Punktanzeige (83a9415)
- [x] Design: Kontrast der Menü-Schilder ≥ 4,5:1, Theme geprüft (alles ok) (980ad9e)
- [x] Druck-Effekt Teil 2: alle Seiten einheitlich (6e06cba)
- [x] Logo-Schriftzug animiert, Streifen in Tonnenfarben (1777d28)
- [x] Einheitlicher Druck-Effekt für Basis-Knöpfe (ba4a12b)
- [x] Sanfte Übergänge: Runde blendet ein, „Weniger Bewegung“ blendet (aa0dc2f)
- [x] Hauptmenü Teil 2: Fußzeile gruppiert, Punkte der Tagesaufgabe (26b2489)
- [x] Hauptmenü Teil 1: Weiter zuerst, Tagesaufgabe/Trickwürfe/Zielwurf als
  Kachelreihe (ba07a0a)
