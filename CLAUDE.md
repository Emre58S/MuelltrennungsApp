@AGENTS.md

# Mülltrennung – Regeln für das automatische Verbessern

## Was die App ist
Ein Lernspiel zur Mülltrennung (Expo SDK 58, React Native, 3D mit R3F/expo-gl):
Gegenstände in die richtige Tonne werfen. Modi: Üben, Gegen die Zeit, Ohne
Fehler, Zielwurf, Trickwürfe, Tagesaufgabe. Zielgruppe: alle, auch ohne gute
Deutschkenntnisse – klar, freundlich, nie strafend. Gespielt auf iPhone in
Expo Go.

## Ablauf eines Zyklus (höchstens 3 pro Lauf)
1. `ROADMAP.md` (Backlog R1…) lesen, die oberste offene Aufgabe nehmen. Ist sie zu groß,
   in einen kleinen, in sich fertigen Abschnitt zerlegen (der Rest bleibt offen).
2. Umsetzen – klein und abgeschlossen, keine halben Sachen.
3. Prüfen: `npx tsc --noEmit -p .`, `npx eslint .` (0 Fehler),
   `npx jest --testPathIgnorePatterns tricks` (bei Änderungen an Physik/Leveln
   auch `npx jest game/__tests__/tricks.test.ts`, dauert ~4 min).
4. Tester-Agent `gameplay-tester` mit dem Commit-Bereich aufrufen (nicht mit
   meiner Begründung). Freigabe nur bei „FREIGABE: ja“ und Bewertung ≥ 7.
   Sonst nachbessern (einmal) oder die Änderung verwerfen (`git checkout -- .`).
5. (Nur Normalmodus, siehe „Modi“ – im Sparlauf entfällt Push/EAS.) Commit auf
   `auto-improve` und pushen, dann `sdk-58` per Fast-Forward
   nachziehen (`git fetch . auto-improve:sdk-58`) und ebenfalls pushen. Danach
   EAS-Update auf **beide** Kanäle, `auto` und `preview`:
   `npx --yes eas-cli@latest update --channel … --environment preview --message "…" --non-interactive`.
6. Aufgabe in `ROADMAP.md` abhaken (mit Commit-Kürzel), Gelerntes unten
   unter „Gelernt“ notieren.
7. Kurze Meldung „✅ Zyklus N fertig: …“ – dann Pause (Eingreifen möglich).

## Modi (welcher gilt, sagt der Nutzer)
**Aktuell (Nutzer, 29.10. abends): Normalmodus** – „alles immer so, dass Emre es
bei sich spielen kann“: jede freigegebene Änderung pushen (auto-improve +
sdk-58) und per EAS auf auto UND preview. Reihenfolge (Nutzer, 30.10. abends):
ROADMAP.md – Release Fr 6.11.; Umbau zu Startschirm mit 3 Tonnen, Kampagne als
Lernpfad, Online-Bereich (Zeit/Survival/Tricks, max. 30 s) ist ausdrücklich
erlaubt. Lange Sitzungen trotzdem vermeiden (frisch starten).

**Sparlauf (nur auf Ansage; zuletzt 29.10. nachmittags)** – Wochenlimit knapp:
- Höchstens 3 Zyklen pro Lauf. Nur lokal auf `auto-improve` committen –
  **nichts pushen, nichts per EAS ausliefern**. Keine neuen Abhängigkeiten.
- Struktur nur einmal erkunden, sonst gezielt greppen; nichts erneut lesen;
  Ausgaben kürzen. Eine lange Sitzung ist teuer → lieber frische Sitzung
  starten: Regeln und Backlog stehen in dieser Datei und ROADMAP.md.
- Pro Zyklus ein unabhängiger Tester (Modell haiku; bekommt nur Startweg +
  ENG gefassten Bereich, nicht die Änderung; ≤ 15 Zeilen, Bewertung 1–10,
  FREIGABE ja/nein). Bei „nein“: einmal nachbessern, einmal neu testen, sonst
  zurücknehmen (auf Nebenzweig `verworfen-…` sichern) und in ROADMAP.md
  notieren. Am Ende „Letzter Lauf“ in ROADMAP.md, dann stoppen.
- Bevorzugt: Bugs, fachliche Richtigkeit, Verständlichkeit, Lernen, Spielspaß –
  keine reine Kosmetik. Start der App: `npx expo start` + Expo Go (Gerät nötig).

**Normalmodus / ohne Aufsicht (nur wenn der Nutzer es ausdrücklich erlaubt)** –
Zyklus wie oben inkl. Push, `sdk-58`, EAS auf `auto` UND `preview`;
Takt und Zeitraum nennt der Nutzer (z. B. 12 min); nicht vorzeitig aufhören;
lieber verwerfen als Zweifelhaftes durchwinken; bei Fehlern zurücknehmen,
im Backlog notieren, weitermachen.

Leitsätze: Modelle – Erkennbarkeit vor Details. Texte – verständlich auch mit
wenig Deutsch, nie strafend.

## Grenzen
- Arbeiten auf `auto-improve`; `sdk-58` nur per Fast-Forward nachziehen (nur
  Normalmodus). `main` nie anfassen.
- EAS-Updates (nur Normalmodus) auf `auto` UND `preview` (Nutzer, 2026-10-28:
  „alle Änderungen immer auch in preview“). `preview` ist die Spielversion – nur Freigegebenes.
- Expo-Projekt gehört der Organisation `philippemremullsortieren` (app.json owner).
- Keine grundlegenden Mechaniken ändern (Werfen, Physik, Regeln, Wertung).
  Ausnahme (Nutzer, 2026-10-28): neue Ziele (Sondermüll-Box) und neue
  Trick-Hindernisse (Schild, Laterne, Markise, Zaun) sind erlaubt.
  Ausnahme (Nutzer, 2026-10-30): Modus Ghost-Duell (nacheinander gegen den
  aufgezeichneten Lauf, Herausforderung per Code, später Live-Raum).
  Ausnahme (Nutzer, 2026-10-30 abends): alles aus ROADMAP.md – Menü-Umbau,
  Kampagne/Lernpfad mit Boss (Tonnen tauschen Plätze), Online-Modi mit
  Rangliste und Freunden, gleiche Ringe über allen Tonnen, Material-Effekte.
  Ausnahme (Nutzer, 2026-10-29): Trickwürfe ohne Köder/Auswahl (direkt werfen),
  Prall-Level zwischen den Tonnen, Modus Duell (1 gegen 1 an einem
  Handy), Tages-Flamme + Tagesmissionen; Zielwurf ausgeblendet.
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
- React-Compiler: useCallback, dessen Abhängigkeit auch an eine Funktion
  übergeben wird, meldet „preserve-manual-memoization“ – useCallback weglassen.
- EAS-Update gab einmal gar nichts aus (Exit 0): Ausgabe in Datei umleiten
  und Dashboard-Zeile prüfen, sonst ist unklar, ob es ankam.
- Teile an runden Körpern (Rolle, Dose): Abstand zur Achse > Radius rechnen –
  Geschenkband-Enden steckten unsichtbar in der Rolle. Gestapelte Ringe lesen
  sich nicht als Kräuselband (verworfen).
- Schutz-Hook blockiert auch die EAS-Update-Liste (Befehlstext passt aufs Muster)
  – ein &&-verketteter Update-Befehl mit Exit 0 gilt als veröffentlicht.
- Test sichert: jedes Emoji nur einmal, jede Begründung ≤ 4 Wörter DE/EN.
- Tester-Bereich ENG fassen („Anzeige des Multiplikators“ statt „Texte rund um
  Serien“): breite Bereiche liefern jedes Mal neue ältere Fehler → „nein“ ohne
  Bezug zur Änderung. Ältere Funde lieber in ROADMAP.md (R10) sammeln und als
  eigenen Zyklus bündeln.
- Shell: In `node -e "…"` führt die Shell Backticks aus (es lief versehentlich
  `npx expo start`). Skripte mit Backticks per Write-Datei, nicht inline.
- Verworfene Zyklen lokal auf Nebenzweige sichern (`verworfen-…`), nicht löschen.
- Shell: Edits per Node-Skript (CRLF beachten), mehrere Heredocs in einem
  Bash-Aufruf schlagen fehl.
- EAS-Update: beide Kanäle in getrennten Aufrufen (verkettet kam Exit 4, unklar
  welcher Kanal ankam). Teilen-Texte enthalten Wegbeschreibungen – beim
  Verlegen von Knöpfen mit anpassen.
