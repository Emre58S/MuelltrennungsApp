# Backlog – automatisches Verbessern

Oben = als Nächstes. Jede Aufgabe in kleine, fertige Abschnitte zerlegen.
Erledigtes mit `[x]` und Commit-Kürzel abhaken. Du kannst hier jederzeit
ergänzen oder umsortieren – ich lese die Datei zu Beginn jedes Zyklus neu.

Leitlinie: Das Spielgefühl soll sehr gut sein – ohne grundlegende Mechaniken
zu ändern.

## Letzter Lauf (Sparlauf 29.10. nachmittags, Modell Sonnet, nichts gepusht)

**Umgesetzt (lokal auf auto-improve, nicht gepusht/ausgeliefert):**
- cd5b7ed Modelle schlichter: Smartphone, Laptop, Zeitung, Prospekt, Rasierer
  (vorher vom Tester mit 8/10 freigegeben).
- a6c541b Begründungen korrigiert (Teebeutel „Plastikfrei = Biomüll“,
  Druckerpatronen „Rückgabe, Wiederverwertung“).
- 25b38ba CLAUDE.md: Sparlauf-Regeln.
- Bereits vorher gepusht: 42dbf5e (Apfel rund, Alufolie Knäuel, Eierschale),
  8ae6f83 (Kleinteile weg).

**Verworfen (je Haiku-Tester 2× „nein“, dann zurückgenommen; Arbeit liegt auf
lokalen Zweigen, kein Push):**
1. Zweig `verworfen-sparlauf` – Zyklus 1: Hinweis bei Fehlwurf in allen Modi
   (richtige Tonne hüpft auch in Zeit/Zielwurf, Lernkarte auch bei „Ohne
   Fehler“). Bewertung 6/10 und 6/10. Offener Fund: In der Tagesaufgabe
   überdeckt der Endbildschirm (nach 900 ms) im letzten Wurf die Lernkarte.
2. Zweig `verworfen-sparlauf` – Zyklus 2: Begriffe „Serie“ statt „Combo“,
   „Heiß!“ statt englischem „On Fire!“, Tutorial-Text zu „Perfekt“ korrigiert.
   Bewertung 6/10 und 6/10 (Tester fand immer neue ältere Fehler im selben
   Textbereich).
3. Zweig `verworfen-sparlauf-z3` – Zyklus 3: Multiplikator mit Dezimalkomma
   („×1,5“) in Chip und Meldungen, „Serie weg“ mit Fieber-Faktor. Bewertung 6/10
   und 5/10; Rest: Faktor bei bereits laufendem Fieber fehlt in der Meldung.

**Was die Tester gefunden haben (für die nächste Runde, nach Nutzen):**
- Meldung „Serie ×m!“ muss den Fieber-Faktor auch bei LAUFENDEM Fieber
  einrechnen: `feverRef.current || streakNow % FEVER_EVERY === 0`.
- Chip zeigt „×1.5“ statt „×1,5“ (hud.tsx, formatNumber fehlt) – Lösung liegt im Zweig.
- „On Fire!“ ist unerreichbar (bei Serie 3 greift die Multiplikator-Meldung
  zuerst) und im deutschen Text englisch → Text erst ab Serie 4, „Heiß!“.
- Tutorial „Perfekt“ nennt „ohne Berührung“ nicht; EN sagt „Swipe right“.
- Lob-Text „Klasse! ×15“ benutzt ×, obwohl × nur den Multiplikator meint.
- Tutorial: Stufen (3 → ×1,5, 5 → ×2, 10 → ×3) und Fieber erklären.
- Tagesaufgabe: Lernkarte im letzten Wurf nicht lesbar (Endbildschirm nach 900 ms).
- „Ohne Fehler“: nach dem Verlust X-Taste zeigt noch die Beenden-Rückfrage.
- „Knapp!“ liest sich nach einem Fehlwurf wie ein Erfolg → „Knapp daneben!“.
- Score-Zeile (hud.tsx) ohne flexShrink bei großer Punktzahl + Serie + Chip.
- Abzeichen-accessibilityLabel nennt nur die Punkte.

**Nächste empfohlene Aufgaben:** (1) Multiplikator-/Serien-Anzeige komplett
und klein halten (alle obigen Punkte außer Tagesaufgabe in EINEM Zyklus,
Tester bekommt nur diesen Bereich); (2) Lernkarte/Endbildschirm-Timing;
(3) M5/Szenen/Trick-Level aus der Roadmap.

## Nächste Aufgaben (von oben nach unten; Erledigtes steht in IMPROVEMENTS-ARCHIV.md)

Leitsatz Modelle: Erkennbarkeit vor Details – eine klare Form statt vieler Kleinteile.
Leitsatz Texte/UI: für Menschen mit wenig Deutsch verständlich, nie strafend.

1. **Serien-/Multiplikator-Anzeige (EIN Zyklus, Tester nur dafür).** Fertige Teile
   liegen auf den lokalen Zweigen verworfen-sparlauf und verworfen-sparlauf-z3
   (git diff auto-improve..verworfen-sparlauf-z3 -- components i18n ansehen).
   Fehlt noch: Fieber-Faktor in „Serie ×m!“ auch bei LAUFENDEM Fieber
   (feverRef.current ODER Serie % FEVER_EVERY === 0), Lob-Text ohne „×“ für die
   Serienzahl, Tutorial-Stufen (3 → ×1,5 · 5 → ×2 · 10 → ×3), Chip-Label für
   VoiceOver, „Knapp daneben!“.
2. **Lernkarte-Timing:** Tagesaufgabe – Endbildschirm nach 900 ms überdeckt die
   Lernkarte im letzten Wurf; „Ohne Fehler“ – X-Taste nach Verlust fragt noch
   „Runde verlassen?“; Hinweis (richtige Tonne hüpft) in allen Modi (Zweig
   verworfen-sparlauf).
3. **M5 Modelle Grundform:** Walnuss ganz + oval (≠ Eierschale), Obstnetz als
   Netzbeutel, Maiskolben durchgehend gelb mit Lieschblättern, Katzenstreu 3–4
   Klumpen, Spülmittel schlanker, Küchentuch-Prägemuster (optional).
4. **Phase 2 Szenen** (haus/ziegel/garten; Spielszene = stage.tsx):
   S1 Audit (leer/unruhig/unstimmig) → S2 aufwerten (je ein Blickfang, ruhiger
   Hintergrund) → S3 neue Szene „Park“ → S4 „Wertstoffhof“ → S5 Wechsel, Leistung, Menü.
5. **Phase 3 Trick-Level** (jedes nur mit grünem Fairness-Test
   npx jest game/__tests__/tricks.test.ts, ~8 min): T1 Basketballkorb mit
   Brett (Bank-Shot) · T2 Reifenschaukel (gleitender Ring) · T3 Laubbläser
   statt Ventilator · T4 Wäscheleine mit Tüchern · T5 Rosenbogen (großer Ring)
   · T6 Kombi-Level. Bestehend: Level 1–23.
6. **Niedrige Priorität:** Kräuselband am Geschenkpapier als durchgehende
   Spirale (G.tube) statt Ringen; weichere Tonnen-Schatten; Trick-Runde
   einheitlich beim Beenden; eigenes App-Symbol/Startbild (erst mit eigenem Build).
