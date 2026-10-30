# Backlog – automatisches Verbessern

Oben = als Nächstes. Jede Aufgabe in kleine, fertige Abschnitte zerlegen.
Erledigtes mit `[x]` und Commit-Kürzel abhaken. Du kannst hier jederzeit
ergänzen oder umsortieren – ich lese die Datei zu Beginn jedes Zyklus neu.

Leitlinie: Das Spielgefühl soll sehr gut sein – ohne grundlegende Mechaniken
zu ändern.

## Zweig `spielspass` (Emre, 29.10. abends) – gepusht (8ac6355, auch auto-improve/sdk-58)

**Trickwürfe – Spielplatz statt Hindernisse:** Level 19–24 (Schild, Laterne,
Bauzaun, Bandenwurf) ersetzt – sie standen nur im Weg. Neu: Trampolin
(kurz werfen → „Boing“ → in die Tonne dahinter; Rand des Tuchs = Rand der
Öffnung, mittig = Swish), fahrendes Trampolin (schleudert zur Tonne, vor der
es gerade steht), Trampolin + Reifen, klappender Deckel (binFlap, Timing).
Alle Level mit grünem Fairness-Test; Trampolin-Level prüfen Kraft ab 0,24
(kurzer Wurf ist gewollt). Schild/Laterne/Zaun bleiben im Code (Physik/Modelle).
**Duell (Schnell-Duell):** 1 gegen 1 gleichzeitig an einem Handy (links/rechts
wischen), gleicher Gegenstand, erster richtiger Wurf gewinnt, falsch = raus,
Finale ×2, Tauziehen, Ergebnis-Tabelle, schnellster Wurf, Lernliste, Revanche.
Logik game/duel.ts (+Tests), Bildschirm components/game/duel-round.tsx,
Route /runde?mode=duel, Kachel im Menü. Damit ist Backlog „Duell“ (abwechselnd)
vorerst ersetzt – erst Spieler-Rückmeldung abwarten.
**Medaillen je Gegenstand:** Bronze 3 / Silber 8 / Gold 15 richtige Würfe
(game/mastery.ts), nie verlierbar; Banner beim Aufstieg, Medaille an der
Item-Karte, Gold fliegt golden, Sammelbuch zeigt Medaille + Weg zur nächsten;
neue Wurfspuren Smaragd/Lava/Diamant ab 3/10/25 Gold.

## Letzter Lauf (29.10., Sonnet/Opus) – alles bis 561d760 gepusht, EAS auto + preview

**Umgesetzt und ausgeliefert (auch Modelle Mais, Katzenstreu, Obstnetz, Spülmittel, Garten-Hecke):**
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
- Ruckeln (Nutzer 29.10., Preview, dauernd im Spiel): im ausgelieferten Code keine Ursache gefunden (Modelle gecacht, nichts pro Frame neu). Erst Gerät prüfen (Expo Go neu, Stromsparmodus); ggf. lokale Commits ausliefern (Normalmodus nötig).
- M5 Rest: Küchentuch (optional).

## Als Nächstes (Nutzer, 30.10.) – jede Freigabe sofort auf preview
1. **Ghost-Duell (1. Priorität)** – 1 gegen 1 nacheinander wie bei Trials:
   gleiche 10 Gegenstände (fester Seed), der Lauf des Gegners fliegt als halb
   durchsichtiger Geist zur selben Sekunde mit, Tauziehen-Balken mit Live-Stand,
   Ergebnis + Lernliste („Beide falsch: …“) + Revanche (eigener Lauf wird Ghost).
   Lauf = Ereignisliste (Zeit, Gegenstand, Winkel/Kraft, Tonne, richtig);
   Flugbahn nachrechnen, Landung aus dem gespeicherten Ergebnis.
   Schritte: [x] **G1** Ghost des eigenen Bestwerts (lokal, ohne Server; 94a1977+, Tester 7/10 – Tages-Strecke, Übungs-Ghost beim 1. Lauf, Kachel „Ghost“; Ideen: Ghost-Würfe nach eigenem Ende noch fliegen lassen) ·
   [x] **G2a** Herausforderung per Code OHNE Server (df41f48, Tester 8/10): ganzer Lauf im Code
   (gh1…+Prüfzeichen+„.Name“), Teilen-Menü, Code-Eingabe auf dem Startschirm, Strecke vom Tag des Laufs,
   Revanche behält die Herausforderung.
   [x] **G2b** (86d3b4b + d861fd3, Tester 7/10 + 8/10): gegen Freunde auf 0,1 s gewertet (roundRun,
   gleicher Sieger auf beiden Handys), Strecken-Kennung im Code (v2) → Hinweis „andere App-Version“
   (auch für alte gh1-Codes), Startkarte scrollbar, Kachel „Rekord & Freunde“. Bewusst weggelassen:
   Knopf „Einfügen“ (bräuchte expo-clipboard); Namen sind durch cleanName ohnehin ohne Apostroph/Emoji.
   Ideen: `\b` vor „gh“ in isOtherVersionCode; „neu teilen“ klarer („Code nochmal schicken lassen“);
   bei Gleichstand nach Rundung „gleich schnell (0,1 s)“; im Eingabemodus scrollToEnd.
   [x] **G3** Ghost des Tagesbesten (8358f5f + 48ce65d, Tester 8/10 + 7/10): eigener Bestlauf als Code an
   Supabase (supabase/ghost.sql – vom Nutzer am 30.10. ausgeführt, läuft), Startschirm
   „👑 Bester Lauf heute“ + Knopf „Gegen {Name} (Bester heute)“; ohne Tabelle/offline unsichtbar.
   [x] Bestlauf nur einmal je App-Start senden (4c96716, Tester 8/10; Idee: Name in den Merker, damit
   Umbenennen sofort ankommt). Offen: Server gleicht Treffer/Zeit nicht mit dem Code ab (Sortierung nach Server-Zahlen; nur mit
   manipuliertem Client ausnutzbar) → Platz nach Code-Werten oder nächstbesten laden, wenn Code unlesbar;
   ungültiges Datum (2026-13-45) gibt allgemeinen Fehler (beides braucht neues SQL → Nutzer muss es erneut ausführen). ·
   **G4** (optional) Live-Raum über Supabase Realtime mit demselben Ereignisformat.
   Emres Schnell-Duell (ein Handy, gleichzeitig) bleibt für „zusammen auf dem Sofa“.
2. Tages-Flamme (mit Rettung 1×/Woche) + 3 Tagesmissionen.
3. Prall-Level: von Emre durch Trampolin-/Deckel-Level ersetzt (Level 19–24) –
   nur auf Ansage wieder aufnehmen.

## Ideen des Nutzers (29.10.)
- Zielwurf ausgeblendet (Menü, Modi, Rangliste); Code bleibt.
- [x] Trickwürfe: „Erst wählen“ war kurz drin (e1e9acb), auf Wunsch des Nutzers wieder raus. JETZT: direkt werfen, keine Köder; falsche Tonne → „Gehört in: {Zieltonne}“ + Zieltonne hüpft. NÄCHSTES: Prall-Level (Hindernisse zwischen den Tonnen, je nach Treffpunkt richtige/Nachbartonne) + Bonus „Bandenwurf“. Ursprünglich: Köder (DECOY ab Level 5, 30 %) stören. Vorschlag
  „Erst wählen, dann tricksen“: 2–3 Gegenstände zeigen, den für die Zieltonne
  antippen, dann mit Trick werfen (Zieltonne fest → Fairness-Tests bleiben gültig).
- 1 gegen 1: A) Duell an einem Handy (abwechselnd, gleiche Gegenstände, 10 Würfe,
  Revanche); B) Herausforderung per Code (gleicher Seed wie Tagesaufgabe).
- Spannender: Tages-Flamme, 3 Tagesmissionen, Gegenstand meistern (Sterne im
  Sammelbuch), knifflige Fälle (doppelte Punkte), Zeit-Rhythmus (+2 s/−3 s),
  Schutzschild bei „Ohne Fehler“, Wochen-Liga.

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
   Klumpen, Spülmittel (erledigt, schlank, Tester 8/10), Küchentuch-Prägemuster (optional).
4. **Phase 2 Szenen** (haus/ziegel/garten; Spielszene = stage.tsx):
   S1 Audit erledigt (29.10.): Haus/Ziegel ruhig hinter den Tonnen; Garten hatte Latten hinter den Tonnen → Hecke in der Mitte (Tester 7/10). Weitere S2-Ideen: Haus ohne Tür (Platz nur seitlich, Sichtbreite knapp), Hecke/Baumkronen-Grün abstimmen.
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
