# Backlog – automatisches Verbessern

Oben = als Nächstes. Jede Aufgabe in kleine, fertige Abschnitte zerlegen.
Erledigtes mit `[x]` und Commit-Kürzel abhaken. Du kannst hier jederzeit
ergänzen oder umsortieren – ich lese die Datei zu Beginn jedes Zyklus neu.

Leitlinie: Das Spielgefühl soll sehr gut sein – ohne grundlegende Mechaniken
zu ändern.

## Offen

- [ ] **Gesperrte Trick-Level**: Tipp gibt Rückmeldung (kurz rütteln +
  „Schaffe zuerst Level N–1“) statt gar nichts (app/tricks.tsx:147).
- [ ] **Rundenende: mehr als 4 Fehler**: „+N weitere“ anzeigen
  (end-screen.tsx:285).
- [ ] **Rundenende: Lernzeilen** mit Druck-Effekt + Vibration; Ranglisten-Pille
  ≥ 44 pt hoch und mit klarem Bedienungshilfe-Text (end-screen.tsx).
- [ ] **Tipp-Karte im Spiel**: zeigen, dass man sie antippen kann
  („Tippen zum Schließen“ oder ✕) (hud.tsx TipCard).
- [ ] **Leerer Bildschirm beim Rundenstart**: Ladeanzeige, solange Level/XP
  noch laden (app/runde.tsx).
- [ ] **Rückfrage beim Beenden, Rest**: Fever-Zeit während der Rückfrage
  anhalten; Trick-Runde einheitlich; Android-Zurück-Taste.
- [ ] **Sammelbuch VoiceOver**: unbekannte Gegenstände mit Tonne vorlesen
  (sammelbuch.tsx:126).
- [ ] **Design verfeinern**: Abstände, Typografie, Farben und Karten
  vereinheitlichen; kleine Unsauberkeiten beheben. (Kontraste, Rundenende:
  erledigt)
- [ ] **Eigenes App-Symbol und Startbildschirm**: Tonne mit Gegenstand im
  Wurfbogen, in den Spielfarben (statt Expo-Platzhalter).
  Hinweis: In Expo Go nicht sichtbar (Symbol gehört zur installierten App) –
  erst mit eigenem Build. Daher zuletzt.

## Erledigt

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
