# Backlog – automatisches Verbessern

Oben = als Nächstes. Jede Aufgabe in kleine, fertige Abschnitte zerlegen.
Erledigtes mit `[x]` und Commit-Kürzel abhaken. Du kannst hier jederzeit
ergänzen oder umsortieren – ich lese die Datei zu Beginn jedes Zyklus neu.

Leitlinie: Das Spielgefühl soll sehr gut sein – ohne grundlegende Mechaniken
zu ändern.

## Offen

- [ ] **Kleinigkeiten Einstellungen/Belohnungen**: „Tippen zum Auswählen“ bei
  freien Spuren, Vibration bei Sprachwahl, Schalter lesen Untertitel vor.
- [ ] **Design verfeinern**: Abstände, Typografie, Farben und Karten
  vereinheitlichen; kleine Unsauberkeiten beheben. (Kontraste, Rundenende:
  erledigt)
- [ ] **Rückfrage beim Beenden, Rest**: Fever-Zeit während der Rückfrage
  anhalten; Trick-Runde einheitlich; Android-Zurück-Taste. (Geringer Nutzen auf dem iPhone.)
- [ ] **Neue Trick-Level (Inhalt, vom Nutzer gewünscht)**: erst wenn sonst
  nichts Sinnvolles mehr offen ist. Je Zyklus 1–2 neue Level aus den
  vorhandenen Hindernissen (Reifen, Windrad, Wind, gleitende Tonne) –
  keine neue Mechanik. Pflicht: Fairness-Test
  `npx jest game/__tests__/tricks.test.ts` (~4 min) grün, Texte DE+EN,
  Schwierigkeit steigt sanft an.
- [ ] **Eigenes App-Symbol und Startbildschirm**: Tonne mit Gegenstand im
  Wurfbogen, in den Spielfarben (statt Expo-Platzhalter).
  Hinweis: In Expo Go nicht sichtbar (Symbol gehört zur installierten App) –
  erst mit eigenem Build. Daher zuletzt.

## Erledigt

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
