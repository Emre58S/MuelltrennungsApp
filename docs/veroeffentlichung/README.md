# „Müll Sortieren“ veröffentlichen – Gesamtplan und Checkliste

Stand: 9.11.2026. In diesem Ordner liegt alles für den Start in den Stores:

| Datei | Inhalt |
|---|---|
| [datenschutz-de.md](datenschutz-de.md) | Datenschutzerklärung (Deutsch), aus dem tatsächlichen Code geschrieben |
| [privacy-en.md](privacy-en.md) | Datenschutzerklärung (Englisch) |
| [impressum-de.md](impressum-de.md) | Impressum |
| [store-texte.md](store-texte.md) | Alle Texte, Stichwörter, Grafiken, Alters- und Datenschutz-Angaben für App Store und Google Play |
| diese Datei | Reihenfolge, offene Punkte, Befehle |

**Rechtlicher Hinweis:** Ich bin kein Anwalt. Die Entwürfe sind nach bestem Wissen und dem echten Verhalten der App geschrieben, ersetzen aber keine Rechtsberatung. Lass die Datenschutzerklärung und das Impressum vor der Veröffentlichung einmal prüfen (z. B. Abgleich mit einem Generator wie eRecht24 oder kurze juristische Prüfung). Du bist als Anbieter verantwortlich.

---

## A. Was die App wirklich mit Daten macht (Grundlage der Texte)

Damit nichts vergessen wird, hier die Faktenlage aus dem Code:

- **Kein Konto, keine Anmeldung.** Beim ersten Online-Zugriff erzeugt die App eine zufällige Spieler-UUID und speichert sie lokal (`StorageKeys.PLAYER_ID`).
- **Lokal gespeichert (AsyncStorage):** Fortschritt, XP/Level, Bestwerte, Statistik je Gegenstand (`ITEM_STATS`), Missionen/Truhen/Flamme, Einstellungen, Belohnungen, gesehene Tipps, Spielercode, Spitzname, Freundes-Code, nicht gesendete Ergebnisse.
- **Online (Supabase, Tabellen):** `players` (UUID, Spitzname), `scores` (Rangliste), `online_runs`, `ghost_runs`, `parcours_runs` (Läufe mit Kürzel der Würfe, Treffer, Zeit), `friend_codes`, `friends`, `friend_blocks`. Der Zugriff läuft **nur über SQL-Funktionen** (Row Level Security, direkter Tabellenzugriff gesperrt), mit dem öffentlichen Schlüssel `sb_publishable_…`.
- **Sichtbar für andere:** Spitzname + Punktzahl in Ranglisten; Läufe als „Ghost“/„Online-Gegner“; Freunde sehen Bestwerte und Läufe.
- **Dienste von Dritten:** nur **Supabase** (Datenbank) und **Expo/EAS Update** (App-Aktualisierungen: IP-Adresse, OS, Laufzeitversion). Keine Werbung, kein Analyse- oder Absturz-SDK, keine Berechtigungen. (`package.json` geprüft: `expo-audio`, `expo-haptics`, `expo-localization`, `expo-updates`, `expo-web-browser` … – keiner davon sendet Daten an Dritte außer `expo-updates` an Expo. `expo-web-browser` wird im Code für nichts Externes geöffnet.)
- **Entwickler-Fehler-Reporter** (`utils/dev-error-reporter.ts`): **nur im Entwicklungsmodus** aktiv, in Produktion komplett inaktiv.
- **Töne/Musik:** selbst per Skript erzeugt (kein Lizenzproblem). **Modelle/Bilder:** selbst. **Schrift:** Atkinson Hyperlegible Next (SIL OFL). **Emoji:** vom Betriebssystem.

---

## B. Offene Punkte – das ist noch zu tun (nach Wichtigkeit)

### B1. MUSS vor dem Einreichen

1. **Produktions-Umgebung in EAS hat keine Variablen!** `eas env:list production` zeigt „No variables found“. Die Supabase-Zugangsdaten stehen nur in der Umgebung `preview`. Ein Produktions-Build hätte deshalb **keine Online-Funktionen** (Ranglisten, Freunde, Rennen würden still nicht funktionieren). Nötig: `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` (der öffentliche „publishable“-Schlüssel, der in der App eingebettet sein darf) auch in der Umgebung `production` anlegen (siehe Abschnitt D, Schritt 3). Das tue ich nur auf dein Zeichen.
2. **Konten:** Apple Developer Program (99 €/Jahr, Privatperson oder Organisation) und Google Play Console (einmalig 25 $). Identität wird geprüft, das dauert einige Tage. Für Organisationen verlangt Apple eine D-U-N-S-Nummer.
3. **Datenschutzerklärung und Impressum veröffentlichen** (öffentliche Web-Adresse). Platzhalter in den Dateien ausfüllen. Einfachste kostenlose Lösung: eine Seite auf **GitHub Pages** (Repository-Einstellung → Pages) oder eine eigene Domain. Die URL kommt in beide Stores (Pflichtfeld) und **in die App** (Einstellungen). Apple verlangt zusätzlich eine **Support-URL**.
4. **Datenschutz- und Impressum-Link in der App** (Einstellungen). Aktuell nicht vorhanden. Google verlangt den Link in der App und im Store, bei Apple muss er im Store stehen und sollte in der App sein. Das baue ich, sobald die Web-Adressen feststehen (kleine Änderung: zwei Zeilen in `app/einstellung.tsx` + Texte DE/EN).
5. **Supabase: `supabase/pruefung.sql` ausführen** (Plausibilitätsprüfung der Läufe und Namens-Wortfilter). Anleitung: Supabase-Dashboard → *SQL Editor* → *New query* → Dateiinhalt einfügen → *Run*. Mehrfaches Ausführen ist unschädlich. Ohne diese Datei akzeptiert der Server auch unmögliche Läufe und lässt jeden Namen zu.
6. **Auftragsverarbeitungsverträge (AVV/DPA)** abschließen und in den Erklärungen bestätigen: **Supabase** (Dashboard → Organization → Legal/DPA) und **Expo** (Konto-Einstellungen → Legal). Außerdem im Supabase-Dashboard die **Region** des Projekts nachsehen und in die Datenschutzerklärung (Abschnitt 6.1) eintragen.
7. **App-Icon:** `assets/images/icon.png` und die Android-Icons prüfen. Wenn es noch das Standard-Icon ist, ein endgültiges anfertigen (1024 × 1024 px PNG ohne Transparenz für Apple; Android adaptive Icon: Vorder- und Hintergrund getrennt, `assets/images/android-icon-*.png`). Auch Splash-Screen (`splash-icon.png`) prüfen.
8. **Store-Einträge ausfüllen** (siehe [store-texte.md](store-texte.md)): Texte DE/EN, Bildschirmfotos, Feature-Grafik, Alters-Fragebogen, Datenschutz-Angaben, Support- und Datenschutz-URL.

### B2. Sollte vor dem Einreichen (Store-Regeln, Ablehnungsgrund möglich)

9. **Löschfunktion für Online-Daten.** Es gibt **keine** Funktion, mit der Spieler ihre Daten auf dem Server selbst löschen. „Alles zurücksetzen“ löscht nur lokal. Google verlangt bei der Datensicherheit eine Löschmöglichkeit (Web-Adresse oder Weg angeben). Apple verlangt In-App-Löschung nur bei Konten; da es hier technisch ein anonymes Profil mit Namen ist, würde ich sie trotzdem einbauen. Vorschlag: neue SQL-Funktion `delete_player(p_player)` (löscht `players` – alle anderen Tabellen hängen per `on delete cascade` daran) + Knopf „Online-Daten löschen“ in den Einstellungen. **Bis dahin** steht in der Datenschutzerklärung das Verfahren per E-Mail (Abschnitt 12) – das muss dann auch wirklich funktionieren: du musst anhand des Freundes-Codes den Spieler in der Tabelle `friend_codes` finden und löschen können.
10. **Melden-Funktion für Spitznamen** (Apple-Regel 1.2 „Nutzergenerierte Inhalte“, Google-Richtlinie dazu). Vorhanden: Wortfilter (nach `pruefung.sql`), Sperren/Entfernen von Freunden, Kontakt-E-Mail. **Fehlt:** eine Möglichkeit in der App, einen Namen zu melden. Kleinste Lösung: bei Rangliste/Freunden ein Knopf „Name melden“, der eine E-Mail an dich öffnet (`mailto:`) – oder eine Tabelle `reports` in Supabase. Außerdem brauchst du einen Weg, Namen zu entfernen (siehe Befehle in `pruefung.sql`: `update players set name = …`).
11. **Aufbewahrungsdauer festlegen.** Es gibt aktuell keine automatische Löschung alter Läufe oder inaktiver Spieler. Die Datenschutzerklärung sagt deshalb „bis zur Löschung auf Anfrage“. Besser: ein regelmäßiger Supabase-Job (pg_cron), der z. B. Läufe älter als 90 Tage und Spieler ohne Aktivität seit 24 Monaten löscht – dann den Text in Abschnitt 7 anpassen.
12. **Supabase-Tarif prüfen.** Kostenlose Projekte werden bei einer Woche Inaktivität **pausiert**, und es gibt Grenzen bei Datenmenge und Datenverkehr. Für den Echtbetrieb ist der bezahlte Tarif (ca. 25 $/Monat) sinnvoll (keine Pausierung, tägliche Sicherungen). Wird das Projekt pausiert, antworten die Online-Funktionen nicht mehr (die App läuft aber offline weiter). Außerdem Limits/Missbrauchsschutz (Rate Limiting) im Dashboard ansehen.

### B3. Wichtig für den Betrieb nach dem Start

13. **E-Mail-Postfach** für Datenschutz-Anfragen, Meldungen und Store-Support einrichten und täglich ansehen (Antwortfrist DSGVO: ein Monat).
14. **Zwei Kanäle für Updates:** `preview` (für Tester, wie bisher) und `production` (für die veröffentlichte App). Bevor die Store-App erscheint, einen Test-Build mit Kanal `production` bauen und prüfen, dass **`eas update --channel production`** funktioniert. Regel für dich: Nur freigegebene, getestete Änderungen auf `production`. Der Laufzeit-Stand (`runtimeVersion` Policy `sdkVersion`) bedeutet: Updates per EAS Update gelten nur für Builds mit gleichem Expo-SDK. Ändert sich eine native Abhängigkeit, braucht es einen neuen Store-Build.
15. **Versionsnummern:** `version` in `app.json` (jetzt 1.0.0) für sichtbare Releases hochzählen; die Build-Nummer zählt EAS automatisch (`autoIncrement`).
16. **Sicherung:** Das Git-Repository (Branch `auto-improve`/`sdk-58`) und die Datenbank sichern; Zugangsdaten (Apple-, Google-, Expo-, Supabase-Konto) mit Zwei-Faktor-Anmeldung schützen und sicher aufbewahren (Passwortmanager).

---

## C. Lizenzen und Quellen

- **Töne und Musik:** per Skript selbst erzeugt (`scripts/synth.mjs`, `generate-sfx.mjs`, `generate-music.mjs`). Kein Drittanbieter.
- **3D-Modelle, Vorschaubilder, Aufkleber:** selbst erstellt (Code + Rendern mit `tools/item-shots.mjs`).
- **Schrift:** Atkinson Hyperlegible Next, Braille Institute, SIL Open Font License 1.1 (über `@expo-google-fonts/atkinson-hyperlegible-next`). Erlaubt kommerzielle Nutzung und Einbettung; eine Nennung in der App ist freundlich, aber nicht zwingend.
- **Bibliotheken:** React, React Native, Expo, three.js, react-three-fiber u. a. stehen unter MIT-/Apache-Lizenzen. Diese verlangen, dass der Lizenztext mitgeliefert wird. Üblich und ausreichend: eine Seite „Open-Source-Lizenzen“ in der App (z. B. aus `license-checker` erzeugt) oder ein Hinweis auf eine Web-Seite. Empfehlung: bei Gelegenheit ergänzen (nicht blockierend für den Start).
- **Emoji:** werden vom Betriebssystem des Geräts dargestellt (Apple Color Emoji / Noto) – nichts mitzuliefern.

---

## D. Ablauf Schritt für Schritt (iPhone und Android)

### 1. Vorbereitung
1. Konten anlegen (B1 Nr. 2), Zwei-Faktor aktivieren.
2. Web-Seite mit Datenschutzerklärung und Impressum (B1 Nr. 3) – Platzhalter ausgefüllt.
3. In EAS die Variablen für `production` anlegen (ich kann das für dich tun):
   ```
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value <URL> --visibility plaintext
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <Schlüssel> --visibility plaintext
   ```
   (URL und Schlüssel stehen in `.env.local` und in der Umgebung `preview`. Der Schlüssel ist ein „publishable“, also für die App bestimmt.)
4. Letzte Tests laufen lassen: `npx tsc --noEmit -p .`, `npx eslint .`, `npx jest` (inkl. `game/__tests__/tricks.test.ts`, dauert ~4 Minuten).
5. Auf mindestens einem iPhone und einem Android-Gerät die **ganze App** durchspielen (Pfad, alle Modi, Online mit zwei Geräten: Freunde-Code tauschen, Herausforderung, 10er-Rennen, Offline-Betrieb: Flugmodus an, Spielen, danach online gehen).

### 2. iPhone (App Store)
1. In App Store Connect die App anlegen: Name, Bundle-ID `de.phildevs.muellsortieren`, Sprache Deutsch, SKU frei wählbar.
2. Build erzeugen und hochladen: `npx eas-cli build --profile production --platform ios` (EAS fragt nach dem Apple-Login und legt Zertifikate und die Bundle-ID selbst an). Danach `npx eas-cli submit --profile production --platform ios` (lädt in App Store Connect hoch, erscheint nach Verarbeitung in **TestFlight**).
3. **TestFlight:** erst selbst und mit einigen Testern ausprobieren (interne Tester sofort, externe nach kurzer Prüfung).
4. Store-Seite komplett ausfüllen (siehe [store-texte.md](store-texte.md)), Build auswählen, **Zur Prüfung einreichen**. Prüfung dauert meist 1–2 Tage; bei Ablehnung steht der Grund im Resolution Center (häufige Gründe: fehlende Datenschutz-URL, fehlende Melden-Funktion bei Nutzerinhalten, Absturz, falsche Altersangabe).

### 3. Android (Google Play)
1. In der Play Console die App anlegen (Name, Sprache, App/Spiel, kostenlos), Paketname `de.phildevs.muellsortieren`.
2. Build: `npx eas-cli build --profile production --platform android` (liefert ein Android-App-Bundle `.aab`; EAS verwaltet den Upload-Schlüssel – **Keystore von EAS herunterladen und sicher aufbewahren**: `eas credentials`).
3. **Erster Upload:** Meines Wissens muss die erste Version manuell in der Play Console hochgeladen werden; danach geht `eas submit --platform android` (braucht einen Google-Dienstkonto-Schlüssel). Prüfen, ob das noch so ist.
4. **Neue persönliche Entwicklerkonten** müssen nach den aktuellen Google-Regeln erst einen **geschlossenen Test** mit einer Mindestzahl Testern über einen Mindestzeitraum durchführen, bevor sie in die Produktion dürfen (Stand meines Wissens: 12 Tester, 14 Tage – **bitte aktuell nachlesen**, die Zahl hat sich schon geändert). Plane dafür **zwei Wochen** ein und suche früh Tester (Familie, Freunde). Organisations-Konten sind davon meist ausgenommen.
5. Alle Formulare ausfüllen: *App-Inhalt* (Datenschutzerklärung, Anzeigen: keine, Zielgruppe, Datensicherheit, Nachrichten-App?, Gesundheits-Angaben?, Finanzfunktionen?), *Store-Eintrag* (Texte, Grafiken), *Preise & Verteilung* (Länder). Siehe [store-texte.md](store-texte.md).
6. Produktion freigeben. Die erste Prüfung dauert oft einige Tage.

### 4. Nach dem Start
- Bewertungen und Absturzberichte in App Store Connect / Play Console ansehen.
- Kleine Korrekturen per `eas update --channel production` ausliefern, größere per neuem Build/Release.
- Meldungen und Datenschutz-Anfragen beantworten.

---

## E. Kurz-Checkliste zum Abhaken

- [ ] Apple-Developer-Konto bezahlt und freigeschaltet
- [ ] Google-Play-Konto bezahlt und verifiziert
- [ ] Datenschutzerklärung (DE+EN) und Impressum ausgefüllt und **online**
- [ ] Support-URL / Kontakt-E-Mail eingerichtet
- [ ] Datenschutz- und Impressum-Link in der App (Einstellungen)
- [ ] `supabase/pruefung.sql` ausgeführt
- [ ] AVV mit Supabase und Expo abgeschlossen, Region eingetragen
- [ ] EAS-Variablen für `production` gesetzt (**sonst keine Online-Funktionen in der Store-App!**)
- [ ] Löschfunktion für Online-Daten (App und/oder Verfahren per E-Mail geprüft)
- [ ] Melden-Funktion für Spitznamen
- [ ] Automatische Löschung/Aufbewahrungsdauer entschieden und im Text korrekt
- [ ] Supabase-Tarif geprüft (Pausierung!)
- [ ] App-Icon und Splash endgültig
- [ ] Bildschirmfotos (iPhone 6,9"/6,5", Android 2–8, Feature-Grafik 1024×500)
- [ ] Store-Texte DE/EN eingetragen, Stichwörter, Kategorien
- [ ] Altersfragebögen und Datenschutz-Angaben (Apple + Google) ausgefüllt
- [ ] Produktions-Build iOS + Android getestet (TestFlight / interner Test)
- [ ] Google: geschlossener Test (Dauer prüfen) abgeschlossen
- [ ] Zur Prüfung eingereicht
