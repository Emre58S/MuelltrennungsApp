@AGENTS.md

# Mülltrennung – Regeln für das automatische Verbessern

## Was die App ist
Ein Lernspiel zur Mülltrennung (Expo SDK 58, React Native, 3D mit R3F/expo-gl):
Gegenstände in die richtige Tonne werfen. Modi: Üben, Gegen die Zeit, Ohne
Fehler, Zielwurf, Trickwürfe, Tagesaufgabe. Zielgruppe: alle, auch ohne gute
Deutschkenntnisse – klar, freundlich, nie strafend. Gespielt auf iPhone in
Expo Go.

## Ablauf eines Zyklus (höchstens 3 pro Lauf)
1. `IMPROVEMENTS.md` lesen, die oberste offene Aufgabe nehmen. Ist sie zu groß,
   in einen kleinen, in sich fertigen Abschnitt zerlegen (der Rest bleibt offen).
2. Umsetzen – klein und abgeschlossen, keine halben Sachen.
3. Prüfen: `npx tsc --noEmit -p .`, `npx eslint .` (0 Fehler),
   `npx jest --testPathIgnorePatterns tricks` (bei Änderungen an Physik/Leveln
   auch `npx jest game/__tests__/tricks.test.ts`, dauert ~4 min).
4. Tester-Agent `gameplay-tester` mit dem Commit-Bereich aufrufen (nicht mit
   meiner Begründung). Freigabe nur bei „FREIGABE: ja“ und Bewertung ≥ 7.
   Sonst nachbessern (einmal) oder die Änderung verwerfen (`git checkout -- .`).
5. Commit auf `auto-improve`, `git push origin auto-improve`, dann
   `npx --yes eas-cli@latest update --channel auto --environment preview --message "…" --non-interactive`.
6. Aufgabe in `IMPROVEMENTS.md` abhaken (mit Commit-Kürzel), Gelerntes unten
   unter „Gelernt“ notieren.
7. Kurze Meldung „✅ Zyklus N fertig: …“ – dann Pause (Eingreifen möglich).

## Nachtbetrieb (ohne Aufsicht)
- Reihenfolge: Backlog abarbeiten → ist er leer, einmal ein Audit mit dem
  Tester → dessen Punkte abarbeiten → dann neue Trick-Level (siehe Backlog).
- Wenn danach nichts Sinnvolles mehr bleibt: Loop beenden statt basteln und
  eine Zusammenfassung aller Änderungen der Nacht schreiben.
- Lieber eine Änderung verwerfen als eine zweifelhafte durchwinken.

## Grenzen
- Nur Branch `auto-improve`. Nie auf `main` oder `sdk-58` committen oder pushen.
- EAS-Updates nur auf Kanal `auto` (nie `preview` – das ist die Spielversion).
- Keine grundlegenden Mechaniken ändern (Werfen, Physik, Regeln, Wertung).
  Ausnahme (Nutzer, 2026-10-28): neue Ziele (Sondermüll-Box) und neue
  Trick-Hindernisse (Schild, Laterne, Markise, Zaun) sind erlaubt.
- Keine neuen Abhängigkeiten ohne klaren Grund; nichts löschen, was genutzt wird.
- Texte immer Deutsch UND Englisch (i18n/de.ts, i18n/en.ts).
- Töne: nur minimal verfeinern. Die Material-Klänge (Glas klirrt, Dose
  scheppert …) müssen erhalten bleiben – eine frühere „Verbesserung“ ließ alles
  gleich klingen und wurde zurückgenommen.
- Effizient arbeiten: nur lesen, was gebraucht wird; kleine, gezielte Änderungen.

## Gelernt
- Hot-Path in der 3D-Szene: keine neuen Objekte/Closures pro Frame (Ruckler).
- React-Compiler-Lint: kein setState direkt im Effekt, keine Objekt-Felder in
  useState-Objekten ändern (Listen mit push sind ok).
- expo-router 58: versteckte Tabs (href: null) lassen sich nicht öffnen;
  Tab-Ansicht nutzte RNSScreenNavigationContainer (fehlt in Expo Go via EAS).
- Menü-Kopf: Tonnen-Tippflächen liegen darüber und reichen auf kleinen Handys
  bis y≈84 – im Kopf nichts unterhalb des Level-Chips platzieren.
- Stack-Optionen einer Seite im Layout setzen (<Stack.Screen name=…>), nicht
  in der Seite – sonst gilt die Animation erst ab dem zweiten Öffnen.
- Neue Agenten in .claude/agents/ sind erst in einer neuen Sitzung nutzbar;
  bis dahin general-purpose mit Verweis auf die Datei.
- Menü-Modusfarben färben auch 3D-Tonnen und Flugbahn – dunkle Töne wirken
  dort wie echte Glas-/Papiertonnen. Für Text eigene `sign`-Farbe nutzen.
- Verlassen einer Runde speichert alles (useCommitRound beim Unmount) –
  Texte dürfen nie „geht verloren“ behaupten.
- Trick-Level: einzeln testen mit `npx jest game/__tests__/tricks.test.ts -t "Level N"`
  (~20 s). Windstärke wirkt nicht gleichmäßig – nach 3–4 Versuchen verwerfen.
- Spielszene ist components/game/stage.tsx (Szenen haus/ziegel/garten);
  components/game/environment.tsx ist ungenutzt – dort nichts ändern.
- Shell: Edits per Node-Skript (CRLF beachten), mehrere Heredocs in einem
  Bash-Aufruf schlagen fehl.
