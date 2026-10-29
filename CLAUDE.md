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
5. Commit auf `auto-improve` und pushen, dann `sdk-58` per Fast-Forward
   nachziehen (`git fetch . auto-improve:sdk-58`) und ebenfalls pushen. Danach
   EAS-Update auf **beide** Kanäle, `auto` und `preview`:
   `npx --yes eas-cli@latest update --channel … --environment preview --message "…" --non-interactive`.
6. Aufgabe in `IMPROVEMENTS.md` abhaken (mit Commit-Kürzel), Gelerntes unten
   unter „Gelernt“ notieren.
7. Kurze Meldung „✅ Zyklus N fertig: …“ – dann Pause (Eingreifen möglich).

## Nachtbetrieb (ohne Aufsicht)
- Nacht 2026-10-29 (Nutzer): von 00:10 bis 08:15 durchgehend Zyklen, NICHT
  vorzeitig aufhören. Backlog oben nach unten; ist er leer, ein neues Audit
  machen und dessen Punkte abarbeiten. Ab 08:15 Loop beenden und eine
  Zusammenfassung der Nacht schreiben.
- Takt: nächster Zyklus kurz nach dem vorigen (Pause ~5 min).
- Lieber eine Änderung verwerfen als eine zweifelhafte durchwinken – ein
  verworfener Zyklus ist kein Grund aufzuhören, einfach den nächsten Punkt nehmen.
- Bei Fehlern (Tests rot, EAS-Update schlägt fehl): Änderung zurücknehmen,
  im Backlog notieren, weitermachen.

## Grenzen
- Arbeiten auf `auto-improve`; `sdk-58` nur per Fast-Forward nachziehen.
  `main` nie anfassen.
- EAS-Updates auf `auto` UND `preview` (Nutzer, 2026-10-28: „alle Änderungen
  immer auch in preview“). `preview` ist die Spielversion – nur Freigegebenes.
- Expo-Projekt gehört der Organisation `philippemremullsortieren` (app.json owner).
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
- Trick-Hindernisse hinter der Tonne sind unerreichbar (Wurf dort schon tief,
  offener Deckel steht als Brett) – seitlich/schräg zwischen den Tonnen geht.
  Neue Pflicht-Hindernisse brauchen eigenen „noTrick“-Text und Tipp.
- Trick-Level: Fairness-Test sucht nur Kraft 0,6–0,86 – Sonden genauso rechnen.
  Schrägdach (Markise) ging nicht: Oberseite zeigt von der Kamera weg,
  Erfolge nur über Deckel-Abpraller; offene Deckel schwingen bis z≈0,6.
- Hindernisse direkt vor den Tonnen wirken wie Rückwand (Abpraller fallen rein)
  – in Sonden zählen, ob Treffer auch ohne Hindernis treffen; Swish prüfen.
- Schutz-Hook prüft den ganzen Befehlstext: Kanal immer ausgeschrieben
  (`--channel auto` / `--channel preview`, keine Variable); Edits, deren Text
  „main“ und „git push“ enthält, mit dem Edit-Tool statt Shell machen.
- Modelle: nie durchsichtigen Inhalt in durchsichtigem Glas (Sortierung nach
  Mittelpunkt → Inhalt verschwindet beim Drehen); Inhalt deckend oder Glas
  tönen. Details (Glanz, Flecken, Etiketten) per Rechnung auf/vor die Fläche
  setzen – der Tester rechnet nach, schwebende oder versteckte Teile fallen auf.
- Lange Edit-Skripte mit Write in den Scratchpad schreiben (Heredoc bricht ab).
- Teile an runden Körpern (Rolle, Dose): Abstand zur Achse > Radius rechnen –
  Geschenkband-Enden steckten unsichtbar in der Rolle. Gestapelte Ringe lesen
  sich nicht als Kräuselband (verworfen).
- Schutz-Hook blockiert auch die EAS-Update-Liste (Befehlstext passt aufs Muster)
  – ein &&-verketteter Update-Befehl mit Exit 0 gilt als veröffentlicht.
- Test sichert: jedes Emoji nur einmal, jede Begründung ≤ 4 Wörter DE/EN.
- Shell: Edits per Node-Skript (CRLF beachten), mehrere Heredocs in einem
  Bash-Aufruf schlagen fehl.
