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

1. ~~**Produktions-Umgebung in EAS hatte keine Variablen**~~ **ERLEDIGT (9.11.):** `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` stehen jetzt auch in der EAS-Umgebung `production` (`eas env:list production` zeigt sie). Ohne sie hätte ein Store-Build keine Online-Funktionen gehabt.
2. **Konten:** Apple Developer Program (99 €/Jahr, Privatperson oder Organisation) und Google Play Console (einmalig 25 $). Identität wird geprüft, das dauert einige Tage. Für Organisationen verlangt Apple eine D-U-N-S-Nummer.
3. **Datenschutzerklärung und Impressum veröffentlichen** (öffentliche Web-Adresse). Platzhalter in den Dateien ausfüllen. Einfachste kostenlose Lösung: eine Seite auf **GitHub Pages** (Repository-Einstellung → Pages) oder eine eigene Domain. Die URL kommt in beide Stores (Pflichtfeld) und **in die App** (Einstellungen). Apple verlangt zusätzlich eine **Support-URL**.
4. **Datenschutz- und Impressum-Link in der App:** **eingebaut** (Einstellungen → Datenschutz), aber unsichtbar, bis du die Web-Adressen in **`constants/legal.ts`** einträgst (`LEGAL_URLS.privacy` / `.imprint`, je Deutsch und Englisch). Dann erscheinen die Zeilen von allein. Google verlangt den Link in der App und im Store, Apple im Store.
5. **Supabase: zwei SQL-Dateien ausführen**, in dieser Reihenfolge: **`supabase/pruefung.sql`** (Plausibilitätsprüfung der Läufe und Namens-Wortfilter) und danach **`supabase/datenschutz.sql`** (Online-Daten löschen, Namen melden, Aufräum-Funktion). Anleitung: Supabase-Dashboard → *SQL Editor* → *New query* → Dateiinhalt einfügen → *Run*. Mehrfaches Ausführen ist unschädlich. Ohne `pruefung.sql` akzeptiert der Server unmögliche Läufe und jeden Namen; **ohne `datenschutz.sql` zeigen der Knopf „Online-Daten löschen“ und das Melden von Namen in der App eine Fehlermeldung**.
6. **Auftragsverarbeitungsverträge (AVV/DPA)** abschließen und in den Erklärungen bestätigen: **Supabase** (Dashboard → Organization → Legal/DPA) und **Expo** (Konto-Einstellungen → Legal). Außerdem im Supabase-Dashboard die **Region** des Projekts nachsehen und in die Datenschutzerklärung (Abschnitt 6.1) eintragen.
7. **App-Icon:** `assets/images/icon.png` und die Android-Icons prüfen. Wenn es noch das Standard-Icon ist, ein endgültiges anfertigen (1024 × 1024 px PNG ohne Transparenz für Apple; Android adaptive Icon: Vorder- und Hintergrund getrennt, `assets/images/android-icon-*.png`). Auch Splash-Screen (`splash-icon.png`) prüfen.
8. **Store-Einträge ausfüllen** (siehe [store-texte.md](store-texte.md)): Texte DE/EN, Bildschirmfotos, Feature-Grafik, Alters-Fragebogen, Datenschutz-Angaben, Support- und Datenschutz-URL.

### B2. Sollte vor dem Einreichen (Store-Regeln, Ablehnungsgrund möglich)

9. ~~Löschfunktion für Online-Daten~~ **ERLEDIGT (9.11., braucht `datenschutz.sql`):** Einstellungen → Datenschutz → „Online-Daten löschen“ ruft die SQL-Funktion `delete_player` auf (löscht den Spieler; alle Tabellen hängen per `on delete cascade` daran) und erzeugt beim nächsten Online-Zugriff einen neuen Spielercode. Für Anfragen per E-Mail (Datenschutzerklärung Abschnitt 12): Spieler über den Freundes-Code finden: `select player from friend_codes where code = 'ABC123';` und dann `select delete_player('<die UUID>');`.
10. ~~Melden-Funktion für Spitznamen~~ **ERLEDIGT (9.11., braucht `datenschutz.sql`):** In der Rangliste (Podium und Plätze 4–10) einen fremden Namen **gedrückt halten** → „Melden“. Die Meldung landet in der Tabelle `reports` (Supabase → Table Editor → `reports`, oder `select * from reports where not handled order by created_at desc;`). Namen entfernen/zurücksetzen: Befehle stehen in `supabase/datenschutz.sql` und `pruefung.sql`. **Du musst die Meldungen regelmäßig ansehen** (Apple verlangt zeitnahe Reaktion, üblich: innerhalb von 24 Stunden).
11. **Aufbewahrungsdauer:** Die Funktion `cleanup_old_data()` steht in `supabase/datenschutz.sql` (löscht Tages-Läufe und Tages-Ergebnisse nach 30 Tagen und Spieler ohne Aktivität seit 24 Monaten). **Einmal von Hand probieren** (`select * from cleanup_old_data();`) und dann täglich einplanen (`pg_cron` im Dashboard unter Database → Extensions einschalten, Befehl steht in der Datei). Erst **danach** den Satz in Abschnitt 7 der Datenschutzerklärung freischalten (steht in `[[…]]`).
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
- [ ] Web-Adressen in `constants/legal.ts` eingetragen (dann erscheinen die Links in der App)
- [ ] `supabase/pruefung.sql` **und** `supabase/datenschutz.sql` ausgeführt
- [ ] AVV mit Supabase und Expo abgeschlossen, Region eingetragen
- [x] EAS-Variablen für `production` gesetzt (erledigt am 9.11.)
- [ ] Löschfunktion in der App einmal selbst ausprobiert (nach `datenschutz.sql`) und Verfahren per E-Mail geübt
- [ ] Melden einmal selbst ausprobiert (zwei Geräte), Meldungen in `reports` regelmäßig ansehen
- [ ] Automatische Löschung/Aufbewahrungsdauer entschieden und im Text korrekt
- [ ] Supabase-Tarif geprüft (Pausierung!)
- [ ] App-Icon und Splash endgültig
- [ ] Bildschirmfotos (iPhone 6,9"/6,5", Android 2–8, Feature-Grafik 1024×500)
- [ ] Store-Texte DE/EN eingetragen, Stichwörter, Kategorien
- [ ] Altersfragebögen und Datenschutz-Angaben (Apple + Google) ausgefüllt
- [ ] Produktions-Build iOS + Android getestet (TestFlight / interner Test)
- [ ] Google: geschlossener Test (Dauer prüfen) abgeschlossen
- [ ] Zur Prüfung eingereicht
