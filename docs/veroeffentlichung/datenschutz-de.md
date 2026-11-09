<!--
ENTWURF – Datenschutzerklärung „Müll Sortieren“ (Deutsch)
Stand des Entwurfs: 9.11.2026. Geschrieben anhand des tatsächlichen Codes (utils/leaderboard.ts,
utils/storage.ts, supabase/*.sql, app.json, package.json). Ich bin kein Anwalt – bitte vor der
Veröffentlichung prüfen (z. B. mit einem Generator wie eRecht24 abgleichen oder kurz juristisch prüfen lassen).

SO BENUTZT DU DIESE DATEI
1. Alles in [[doppelten eckigen Klammern]] durch deine Angaben ersetzen.
2. Diesen Kommentarblock oben löschen.
3. Auf einer öffentlichen Web-Adresse veröffentlichen (z. B. GitHub Pages, eigene Domain). Diese Adresse
   trägst du in App Store Connect und in der Google Play Console als „Datenschutzerklärung“ ein und
   verlinkst sie in der App (Einstellungen).
4. Wenn sich in der App etwas ändert, was Daten betrifft (neue Online-Funktion, Werbung, Analyse, …):
   diese Erklärung SOFORT anpassen und das Datum unten aktualisieren.
-->

# Datenschutzerklärung für die App „Müll Sortieren“

Stand: [[TT.MM.JJJJ]]

## 1. Wer ist verantwortlich?

Verantwortlich für die Verarbeitung deiner Daten in dieser App ist:

[[Vor- und Nachname bzw. Firma]]
[[Straße und Hausnummer]]
[[PLZ Ort]]
[[Land]]

E-Mail: [[E-Mail-Adresse für Datenschutzanfragen]]

Einen Datenschutzbeauftragten haben wir nicht benannt, weil wir dazu gesetzlich nicht verpflichtet sind.

## 2. Das Wichtigste in Kürze

- „Müll Sortieren“ ist ein Lernspiel zur Mülltrennung. Du kannst es **ohne Anmeldung** und **ohne Konto** spielen.
- Die App enthält **keine Werbung**, **kein Tracking** und **keine Analyse- oder Absturz-Dienste von Drittanbietern**.
- Die App fragt **keine Berechtigungen** ab: kein Zugriff auf Kamera, Mikrofon, Standort, Kontakte, Fotos oder Nachrichten.
- Dein Spielstand (Fortschritt, Punkte, Einstellungen) bleibt **auf deinem Gerät**.
- Nur für die **Online-Funktionen** (Ranglisten, Freunde, Herausforderungen, Tages-Rennen) werden ein zufällig erzeugter Spielercode, dein Spitzname und deine Spielergebnisse an unseren Server geschickt.
- Dein Spitzname und deine Punktzahlen können dort **andere Spielerinnen und Spieler sehen**. Nimm deshalb **keinen echten Namen**.
- Du kannst die Löschung deiner Online-Daten jederzeit verlangen (siehe Abschnitt 12).

## 3. Welche Daten bleiben nur auf deinem Gerät?

Diese Daten speichert die App ausschließlich lokal auf deinem Gerät. Wir bekommen sie nicht und können sie nicht einsehen:

| Daten | Wofür |
|---|---|
| Spielfortschritt: Sterne, Level, Erfahrungspunkte (XP), freigeschaltete Welten und Tonnen, Bestwerte | Damit du dort weiterspielst, wo du aufgehört hast |
| Statistik je Gegenstand (wie oft richtig/falsch einsortiert, zuletzt falsch) | Damit die App Gegenstände üben lässt, die dir schwerfallen |
| Tagesaufgaben, Tagesmissionen, Truhen, „Flamme“ (Tage in Folge) | Tägliche Ziele und Belohnungen |
| Belohnungen und Auswahl (Wurfspur, Tonnen-Aufkleber) | Anpassung des Spiels |
| Einstellungen: Sprache, Hell/Dunkel, Ton, Musik, „Weniger Bewegung“ | Darstellung nach deinen Wünschen |
| Zufälliger Spielercode, Spitzname, eigener Freundes-Code, ggf. noch nicht gesendete Ergebnisse | Online-Funktionen (siehe Abschnitt 4) |
| Welche Tipps und Hinweise du schon gesehen hast | Damit Hinweise nicht ständig wiederkehren |

Diese Daten löschst du, indem du die App **deinstallierst** oder in den Einstellungen **„Alles zurücksetzen“** wählst. Beachte: „Alles zurücksetzen“ löscht nur die Daten auf deinem Gerät, nicht die Online-Daten auf dem Server (siehe Abschnitt 12).

Die App wird auch **ohne Internetverbindung** gespielt. Online-Ergebnisse werden dann auf dem Gerät gemerkt und später gesendet.

## 4. Online-Funktionen: Welche Daten werden an den Server gesendet?

Wenn du Online-Funktionen nutzt, sendet die App Daten an unseren Server (Datenbank bei Supabase, siehe Abschnitt 6). Es gibt **kein Benutzerkonto**: Du wirst nur über einen **zufällig erzeugten Spielercode** (eine UUID, die beim ersten Start auf deinem Gerät erzeugt wird) erkannt. Wir wissen nicht, wer du bist, solange du nicht selbst Namen oder Kontaktdaten preisgibst.

### 4.1 Gespeicherte Daten

| Daten | Wann | Zweck |
|---|---|---|
| Spielercode (zufällige UUID) | bei jeder Online-Funktion | Zuordnung deiner Ergebnisse zu deinem Gerät, ohne Konto |
| Spitzname (2–16 Zeichen) | wenn du einen Namen wählst; sonst zeigt die App „Spieler“ und eine Zahl aus deinem Spielercode | Anzeige in Ranglisten und bei Freunden |
| Ergebnisse in Ranglisten: Bereich (z. B. Tagesaufgabe, Parcours, Zeit, Ohne Fehler), Punktzahl, Zeitpunkt | nach einer Runde in einem Online-Bereich | Ranglisten |
| Online-Läufe („Gegen die Zeit“, „Ohne Fehler“, Parcours, 10er-Rennen): Modus, Datum, Anzahl richtiger Würfe, benötigte Zeit, ein kurzes Kürzel der Wurfreihenfolge und -ergebnisse, Zeitpunkt | nach einem Online-Lauf | Ranglisten, Wettkampf gegen den „Ghost“ (aufgezeichneter Lauf) eines anderen Spielers, Plausibilitätsprüfung gegen erfundene Ergebnisse |
| Freundes-Code (6 Zeichen), Freundschaften (Verknüpfung zweier Spielercodes mit Zeitpunkt), Sperren (wer wen entfernt hat) | wenn du Freunde hinzufügst oder entfernst | Freundesfunktion und Herausforderungen |

### 4.2 Wer sieht was?

- **Alle Spielerinnen und Spieler** der App sehen in Ranglisten deinen **Spitznamen und deine Punktzahl**.
- **Beim Tages-Rennen / „Ghost“-Rennen** kann dein aufgezeichneter bester Lauf anderen Spielerinnen und Spielern als „Ghost“ angezeigt werden. Sie sehen dabei deinen Spitznamen, deine Trefferzahl und deine Zeit sowie den Ablauf der Würfe.
- **Dein Gegner „Online-Gegner“**: Die App wählt zufällig einen Lauf eines anderen Spielers von heute mit ähnlichem Ergebnis. Dafür wird dessen Lauf (Name, Ergebnis, Wurfablauf) an dein Gerät geladen. Umgekehrt kann dein Lauf einem anderen Spieler vorgeschlagen werden.
- **Deine Freunde** (Personen, die deinen Freundes-Code eingegeben haben oder deren Code du eingegeben hast) sehen deinen Spitznamen, deine Bestwerte von heute und deine Läufe, damit sie dich herausfordern können.
- Wir selbst nutzen die Daten **nur für den Betrieb des Spiels**. Wir geben sie nicht zu Werbezwecken weiter und verkaufen sie nicht.

### 4.3 Hinweise zum Spitznamen

- Wähle bitte **keinen echten Namen** und keine persönlichen Angaben (Adresse, Telefonnummer, Schule o. Ä.).
- Ein einfacher Filter lehnt beleidigende Namen ab. Er ist nicht perfekt. Wenn dir ein unpassender Name auffällt, schreib uns an [[E-Mail-Adresse]] – wir entfernen ihn.
- Wen du als Freund entfernst, kann sich nicht wieder mit deinem Code eintragen (nur du kannst ihn neu hinzufügen).

### 4.4 Rechtsgrundlage

- Bereitstellung der Online-Funktionen: Art. 6 Abs. 1 lit. b DSGVO (Vertrag/Nutzung der von dir gewünschten Funktion) bzw. bei Kindern unter 16 Jahren die Nutzung im Rahmen der gesetzlichen Vertretung durch die Eltern.
- Schutz der Ranglisten vor erfundenen Ergebnissen und Beleidigungen, Sicherheit des Servers: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem fairen, sicheren Spiel).

## 5. Zugriff auf dein Gerät, Berechtigungen, Tracking

- Die App benötigt **keine Berechtigungen** (kein Standort, keine Kamera, kein Mikrofon, keine Kontakte, keine Fotos).
- Die App verwendet **keine Werbe-ID**, kein Tracking über Apps oder Websites hinweg und keine Cookies.
- Die Geräte-Vibration (Haptik) und der Ton werden nur lokal zur Spielrückmeldung genutzt.
- Wenn du Ergebnisse oder deinen Freundes-Code **teilst**, öffnet die App das Teilen-Menü deines Geräts. Was du dort wählst (z. B. eine Nachricht an einen Kontakt), geht an die von dir gewählte App, nicht an uns.

## 6. Empfänger der Daten, Auftragsverarbeitung, Drittländer

### 6.1 Supabase (Datenbank für die Online-Funktionen)

Die Online-Daten aus Abschnitt 4 werden in einer Datenbank gespeichert, die von **Supabase** betrieben wird (Supabase, Inc., 970 Toa Payoh North #07-04, Singapur 318992, bzw. die jeweils im Auftragsverarbeitungsvertrag genannte Gesellschaft). Der Datenbankserver steht in der Region **[[Region eintragen, z. B. „Frankfurt (eu-central-1)“ – im Supabase-Dashboard unter Project Settings → General nachsehen]]**.

- Mit Supabase besteht ein **Auftragsverarbeitungsvertrag** (Art. 28 DSGVO) [[bitte im Supabase-Dashboard unter „Legal“/„DPA“ abschließen und hier bestätigen]].
- Soweit Daten in ein Land außerhalb der EU/des EWR übermittelt werden, geschieht dies auf Grundlage von Standardvertragsklauseln (Art. 46 DSGVO) bzw. eines Angemessenheitsbeschlusses [[Angabe prüfen]].
- Beim Aufruf des Servers verarbeitet Supabase technisch bedingt die **IP-Adresse** und Anfragedaten (Zeitpunkt, angefragte Funktion) in Server-Protokollen. Wir nutzen diese Protokolle nicht, um dich zu identifizieren.

### 6.2 Expo / EAS Update (App-Aktualisierungen)

Die App kann kleine Aktualisierungen (Texte, Grafiken, Programmcode) über den Dienst **EAS Update** von **Expo (650 Industries, Inc., USA)** laden. Beim Prüfen auf Updates werden technisch notwendige Daten an Expo übertragen: **IP-Adresse**, Betriebssystem, App-Version/Laufzeitversion, Update-Kanal und Zeitpunkt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Fehlerbehebung und Verbesserung der App ohne erneuten Store-Download). Für die Übermittlung in die USA stützt sich Expo auf Standardvertragsklauseln bzw. das EU-US Data Privacy Framework [[Angabe in der Expo-Datenschutzerklärung prüfen und mit Expo einen Auftragsverarbeitungsvertrag abschließen]].

### 6.3 Apple App Store und Google Play

Wenn du die App über den Apple App Store oder Google Play lädst, verarbeiten Apple bzw. Google Daten zu Kauf/Download, Konto und Gerät nach eigenen Datenschutzbestimmungen. Darauf haben wir keinen Einfluss. Wenn du dort der Weitergabe von Nutzungs- und Absturzdaten an Entwickler zugestimmt hast, können wir **anonymisierte Absturzstatistiken** über App Store Connect bzw. die Google Play Console sehen.

### 6.4 Weitere Empfänger

Sonst geben wir deine Daten nicht an Dritte weiter, außer wir sind gesetzlich dazu verpflichtet.

## 7. Speicherdauer

- **Lokale Daten:** bis du die App deinstallierst oder „Alles zurücksetzen“ wählst.
- **Online-Daten (Spielercode, Spitzname, Ergebnisse, Läufe, Freundschaften):** wir speichern sie, solange du die Online-Funktionen nutzt, und löschen sie **auf deine Anfrage unverzüglich**. [[Optional, wenn du eine automatische Löschung einrichtest: „Läufe und Ergebnisse, die älter als X Monate sind, werden automatisch gelöscht; Spieler ohne Aktivität seit X Monaten werden gelöscht.“ Wichtig: nur hineinschreiben, wenn es wirklich so eingerichtet ist.]]
- **Server-Protokolle** bei Supabase und Expo: nach deren jeweiligen Fristen.

## 8. Kinder und Jugendliche

Das Spiel richtet sich an alle Altersgruppen, ausdrücklich auch an Kinder, die Mülltrennung lernen möchten.

- Wir fragen **keinen echten Namen, keine E-Mail-Adresse, keine Telefonnummer, keinen Standort und kein Geburtsdatum** ab.
- Die einzige freie Eingabe ist ein **Spitzname**, der für andere sichtbar ist. Eltern sollten Kindern erklären, dass dort kein echter Name und keine persönlichen Angaben stehen sollen.
- Es gibt **keinen Chat** und keine Möglichkeit, freie Nachrichten an andere zu senden.
- Kinder unter [[16 – für Deutschland maßgeblich; in anderen Ländern gelten andere Altersgrenzen]] Jahren sollten die **Online-Funktionen** nur mit Zustimmung ihrer Eltern nutzen. Die Eltern können jederzeit die Löschung der Daten ihres Kindes verlangen (Abschnitt 12).
- Die App nutzt **keine Werbung** und keine verhaltensbasierte Auswertung.

## 9. Datensicherheit

- Die Verbindung zwischen App und Server ist **verschlüsselt** (HTTPS/TLS).
- Die Datenbank erlaubt der App **keinen direkten Zugriff** auf Tabellen, sondern nur über festgelegte, geprüfte Funktionen (Row Level Security). Die App enthält nur einen öffentlichen Schlüssel, der keine weitergehenden Rechte gibt.
- Ergebnisse werden auf Plausibilität geprüft (z. B. nicht schneller als menschenmöglich), damit Ranglisten fair bleiben.
- Kein Dienst ist völlig sicher. Wir arbeiten laufend daran, die Sicherheit zu verbessern.

## 10. Keine automatisierten Einzelentscheidungen

Es findet keine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne von Art. 22 DSGVO statt. Die zufällige Auswahl eines Gegners (Abschnitt 4.2) hat keine rechtliche Wirkung für dich.

## 11. Deine Rechte

Du hast nach der DSGVO folgende Rechte:

- **Auskunft** (Art. 15): zu den über dich gespeicherten Daten,
- **Berichtigung** (Art. 16): falsche Daten korrigieren lassen,
- **Löschung** (Art. 17): „Recht auf Vergessenwerden“,
- **Einschränkung der Verarbeitung** (Art. 18),
- **Datenübertragbarkeit** (Art. 20): Daten in gängigem Format erhalten,
- **Widerspruch** (Art. 21) gegen Verarbeitungen auf Grundlage berechtigter Interessen,
- **Widerruf** einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3), soweit eine Verarbeitung auf Einwilligung beruht,
- **Beschwerde bei einer Aufsichtsbehörde** (Art. 77): z. B. bei der Datenschutzaufsichtsbehörde deines Bundeslandes oder deines Aufenthaltsortes. [[Zuständige Behörde für deinen Wohnort eintragen, z. B. „Der Landesbeauftragte für den Datenschutz … “]]

## 12. So übst du deine Rechte aus – Löschung der Online-Daten

Da es kein Konto gibt, können wir dich nur über den **Spielercode** erkennen. Schreib uns eine E-Mail an **[[E-Mail-Adresse]]** und nenne uns **deinen Freundes-Code** (in der App unter *Online → Freunde*, 6 Zeichen) und deinen Spitznamen. Mit dem Freundes-Code können wir die zu dir gehörenden Online-Daten eindeutig finden, auskunftsweise zusammenstellen, berichtigen oder löschen. Wir antworten **innerhalb eines Monats**.

[[WICHTIG – NUR EINTRAGEN, WENN ES STIMMT: „Alternativ kannst du deine Online-Daten direkt in der App löschen: Einstellungen → Online-Daten löschen.“ Diese Funktion ist im Moment NICHT eingebaut; wenn sie gebaut ist, hier eintragen.]]

Wenn du die App deinstallierst, bleiben deine Online-Daten auf dem Server bestehen, bis du ihre Löschung verlangst. Ein neuer Start der App erzeugt einen neuen, unabhängigen Spielercode.

## 13. Änderungen dieser Erklärung

Wenn sich die App oder die Rechtslage ändert, passen wir diese Erklärung an. Es gilt jeweils die Fassung, die zum Zeitpunkt deiner Nutzung unter dieser Adresse abrufbar ist.

[[Web-Adresse dieser Erklärung]]

Stand: [[TT.MM.JJJJ]]
