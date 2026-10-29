# Backlog – automatisches Verbessern

Oben = als Nächstes. Jede Aufgabe in kleine, fertige Abschnitte zerlegen.
Erledigtes mit `[x]` und Commit-Kürzel abhaken. Du kannst hier jederzeit
ergänzen oder umsortieren – ich lese die Datei zu Beginn jedes Zyklus neu.

Leitlinie: Das Spielgefühl soll sehr gut sein – ohne grundlegende Mechaniken
zu ändern.

## Letzter Lauf (Sparlauf 29.10., Modell Sonnet, nichts gepusht)

**Umgesetzt (lokal auf auto-improve, nicht gepusht/ausgeliefert):**
- 5796c58 Serien-Anzeige: Fieber-Faktor in der Meldung, Dezimalkomma, „Serie“
  statt „Combo“, „Heiß!“ ab Serie 4, Lob „n in Folge“, Tutorial mit Stufen,
  VoiceOver-Label (Tester 8/10).
- 2102019 Fehlwurf: Hinweis in allen Modi, Lernkarte auch bei „Ohne Fehler“,
  X-Taste nach Verlust ohne Rückfrage (Tester 7/10).
- Walnuss als ganze ovale Nuss (Tester 6/10, nach Nachbessern 7/10).

**Offen aus diesem Lauf:**
- Tutorial-Stufen (3/5/10, ×1,5/×2/×3) aus STREAK_TIERS einsetzen statt fest im Text.
- Meldung beim 10. Treffer zeigt ×6, gezählt wird ×2 (Fieber startet danach) – prüfen.
- Tagesaufgabe: Endbildschirm nach 900 ms überdeckt im letzten Wurf die Fehlerrückmeldung.
- „Ohne Fehler“: Lernkarte nur ~1,8 s (2,3 s mit Begründung) sichtbar.
- Walnuss-Runzeln noch etwas groß (Länge scale x ~1,0 wäre feiner).
- M5 Rest: Obstnetz, Spülmittel, Küchentuch.

## Nächste Aufgaben (von oben nach unten; Erledigtes steht in IMPROVEMENTS-ARCHIV.md)

Leitsatz Modelle: Erkennbarkeit vor Details – eine klare Form statt vieler Kleinteile.
Leitsatz Texte/UI: für Menschen mit wenig Deutsch verständlich, nie strafend.

1. [x] **Serien-/Multiplikator-Anzeige – erledigt (lokal, nicht gepusht; Tester 8/10).** Offen: Tutorial-Schwellen aus STREAK_TIERS einsetzen. Ursprünglich: Fertige Teile
   liegen auf den lokalen Zweigen verworfen-sparlauf und verworfen-sparlauf-z3
   (git diff auto-improve..verworfen-sparlauf-z3 -- components i18n ansehen).
   Fehlt noch: Fieber-Faktor in „Serie ×m!“ auch bei LAUFENDEM Fieber
   (feverRef.current ODER Serie % FEVER_EVERY === 0), Lob-Text ohne „×“ für die
   Serienzahl, Tutorial-Stufen (3 → ×1,5 · 5 → ×2 · 10 → ×3), Chip-Label für
   VoiceOver, „Knapp daneben!“.
2. [x] **Lernkarte-Timing – erledigt (lokal, Tester 7/10); offen bleibt nur: Tagesaufgabe-Endbildschirm im letzten Wurf.** Ursprünglich: Tagesaufgabe – Endbildschirm nach 900 ms überdeckt die
   Lernkarte im letzten Wurf; „Ohne Fehler“ – X-Taste nach Verlust fragt noch
   „Runde verlassen?“; Hinweis (richtige Tonne hüpft) in allen Modi (Zweig
   verworfen-sparlauf).
3. **M5 Modelle Grundform:** (Walnuss erledigt) Obstnetz als
   Netzbeutel, Maiskolben (erledigt, Tester 8/10), Katzenstreu 3–4
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
