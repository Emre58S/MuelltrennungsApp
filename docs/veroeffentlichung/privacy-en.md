<!--
DRAFT – Privacy Policy "Müll Sortieren" (English). Draft dated 9 Nov 2026.
Written from the actual code (utils/leaderboard.ts, utils/storage.ts, supabase/*.sql, app.json, package.json).
I am not a lawyer – have it checked before publishing.

HOW TO USE
1. Replace everything in [[double square brackets]].
2. Delete this comment block.
3. Publish at a public URL (same site as the German version; e.g. /privacy-en). Use this URL as the
   "Privacy Policy URL" in App Store Connect and Google Play Console for the English listing.
4. Keep it in sync with datenschutz-de.md. If the app's data handling changes, update both.
-->

# Privacy Policy for the app "Müll Sortieren"

Last updated: [[DD Month YYYY]]

## 1. Who is responsible?

The controller for the processing of your data in this app is:

[[First and last name or company]]
[[Street and number]]
[[Postcode City]]
[[Country]]

Email: [[email address for privacy requests]]

We have not appointed a data protection officer because we are not legally required to.

## 2. In short

- "Müll Sortieren" is a learning game about waste sorting. You can play it **without signing up** and **without an account**.
- The app contains **no advertising**, **no tracking** and **no third-party analytics or crash-reporting services**.
- The app asks for **no permissions**: no access to camera, microphone, location, contacts, photos or messages.
- Your game progress (progress, points, settings) stays **on your device**.
- Only for the **online features** (leaderboards, friends, challenges, daily races) a randomly generated player code, your nickname and your game results are sent to our server.
- Your nickname and scores are **visible to other players** there. Please do **not use your real name**.
- You can ask us to delete your online data at any time (see section 12).

## 3. Data that stays on your device only

This data is stored only locally on your device. We do not receive it and cannot see it:

| Data | Purpose |
|---|---|
| Game progress: stars, level, experience points (XP), unlocked worlds and bins, best scores | So you can continue where you stopped |
| Statistics per item (how often sorted right/wrong, last wrong) | So the app can practise items you find difficult |
| Daily challenge, daily missions, chests, "flame" (days in a row) | Daily goals and rewards |
| Rewards and your choices (throw trail, bin stickers) | Customising the game |
| Settings: language, light/dark, sound, music, "Reduce motion" | Display as you like it |
| Random player code, nickname, your own friend code, results not yet sent | Online features (see section 4) |
| Which tips and hints you have already seen | So hints do not keep repeating |

You delete this data by **uninstalling** the app. "Reset everything" in the settings deletes only XP, level, days in a row and best scores; the collection book and stars stay. You delete the online data on the server in the settings under **Privacy → Delete online data** (see section 12).

The app also works **without an internet connection**. Online results are then kept on the device and sent later.

## 4. Online features: what data is sent to the server?

When you use online features, the app sends data to our server (a database hosted by Supabase, see section 6). There is **no user account**: you are recognised only by a **randomly generated player code** (a UUID created on your device at first start). We do not know who you are unless you reveal your name or contact details yourself.

### 4.1 Stored data

| Data | When | Purpose |
|---|---|---|
| Player code (random UUID) | with every online feature | Assigning your results to your device without an account |
| Nickname (2–16 characters) | when you choose a name; otherwise the app shows "Spieler" plus a number derived from your player code | Display in leaderboards and to friends |
| Leaderboard results: board (e.g. daily challenge, parcours, time, no mistakes), score, time | after a round in an online area | Leaderboards |
| Online runs ("Against the clock", "No mistakes", parcours, 10-item race): mode, date, number of correct throws, time needed, a short code of the throw sequence and results, time | after an online run | Leaderboards, racing against another player's recorded run ("ghost"), plausibility check against made-up results |
| Friend code (6 characters), friendships (link between two player codes with time), blocks (who removed whom) | when you add or remove friends | Friends feature and challenges |
| Reports: player code of the reporter, reported nickname, area (e.g. "zeit"), time | when you report a name in a leaderboard | Checking and removing inappropriate names (the reporter's player code stays stored until the report is deleted) |

### 4.2 Who sees what?

- **All players** of the app see your **nickname and score** in leaderboards.
- In the **daily / "ghost" race**, your recorded best run may be shown to other players as a "ghost". They see your nickname, your number of hits and your time as well as the sequence of throws.
- **"Online opponent":** the app picks a run of another player from today with a similar result at random. That run (name, result, throw sequence) is loaded onto your device. Your run may be suggested to another player in the same way.
- **Your friends** (people who entered your friend code or whose code you entered) see your nickname, today's best results and your runs so they can challenge you.
- We use the data **only to operate the game**. We do not pass it on for advertising and do not sell it.

### 4.3 About nicknames

- Please do **not use your real name** or personal details (address, phone number, school, etc.).
- A simple filter rejects offensive names. It is not perfect. If you notice an inappropriate name, press and hold it in the leaderboard and choose "Report", or write to [[email address]] – we will check it and remove it if it is inappropriate.
- Whoever you remove as a friend cannot re-add themselves with your code (only you can add them again).

### 4.4 Legal basis

- Providing the online features: Art. 6(1)(b) GDPR (performance of the use you request); for children under 16, use within the scope of their parents' legal representation.
- Protecting leaderboards from made-up results and abuse, server security: Art. 6(1)(f) GDPR (legitimate interest in a fair and safe game).

## 5. Device access, permissions, tracking

- The app needs **no permissions** (no location, no camera, no microphone, no contacts, no photos).
- The app uses **no advertising ID**, no tracking across apps or websites and no cookies.
- Haptics (vibration) and sound are used only locally for game feedback.
- When you **share** results or your friend code, the app opens your device's share menu. What you choose there (e.g. a message to a contact) goes to the app you choose, not to us.

## 6. Recipients, processors, third countries

### 6.1 Supabase (database for online features)

The online data from section 4 is stored in a database operated by **Supabase** (Supabase, Inc., or the entity named in the data processing agreement). The database server is located in the region **[[region, e.g. "Frankfurt (eu-central-1)" – check in the Supabase dashboard under Project Settings → General]]**.

- A **data processing agreement** (Art. 28 GDPR) is in place with Supabase [[conclude it in the Supabase dashboard under "Legal"/"DPA" and confirm here]].
- Where data is transferred to a country outside the EU/EEA, this is based on standard contractual clauses (Art. 46 GDPR) or an adequacy decision [[verify]].
- When the server is called, Supabase technically processes the **IP address** and request data (time, called function) in server logs. We do not use these logs to identify you.

### 6.2 Expo / EAS Update (app updates)

The app can download small updates (text, graphics, program code) through **EAS Update** by **Expo (650 Industries, Inc., USA)**. When checking for updates, technically necessary data is sent to Expo: **IP address**, operating system, app/runtime version, update channel and time. Legal basis is Art. 6(1)(f) GDPR (fixing and improving the app without a new store download). For transfers to the USA, Expo relies on standard contractual clauses or the EU-US Data Privacy Framework [[check Expo's privacy policy and conclude a data processing agreement with Expo]].

### 6.3 Apple App Store and Google Play

If you download the app from the Apple App Store or Google Play, Apple or Google process data about purchase/download, account and device under their own privacy terms. We have no influence on that. If you agreed there to share usage and crash data with developers, we may see **anonymised crash statistics** in App Store Connect or Google Play Console.

### 6.4 Other recipients

We do not pass your data to third parties otherwise, unless legally required.

## 7. Storage period

- **Local data:** until you uninstall the app (XP, level, days in a row and best scores also with "Reset everything").
- **Online data (player code, nickname, results, runs, friendships):** we keep it while you use the online features and delete it **promptly on your request** (in the app itself under Settings → Privacy → Delete online data). [[Only insert if you really set up the daily cleanup job from supabase/datenschutz.sql (pg_cron): "Daily runs (ghost, parcours) and daily results are deleted automatically after 30 days; players inactive for 24 months are deleted automatically." Runs for 'Against the clock' and 'No mistakes' and the fixed leaderboards stay while the player is active.]]
- **Reports** about names: until handled, then we delete them after [[6]] months at the latest.
- **Server logs** at Supabase and Expo: according to their retention periods.

## 8. Children and young people

The game is for all ages, explicitly including children who want to learn waste sorting.

- We do **not ask for a real name, email address, phone number, location or date of birth**.
- The only free input is a **nickname** that is visible to others. Parents should explain to children that no real name or personal details belong there.
- There is **no chat** and no way to send free-text messages to others.
- Children under [[16 – applicable in Germany; other countries have other age limits]] should use the **online features** only with their parents' consent. Parents can ask for deletion of their child's data at any time (section 12).
- The app uses **no advertising** and no behavioural profiling.

## 9. Data security

- The connection between app and server is **encrypted** (HTTPS/TLS).
- The database does not give the app **direct access** to tables, only through defined, checked functions (row level security). The app contains only a public key that grants no further rights.
- Results are checked for plausibility (e.g. not faster than humanly possible) so leaderboards stay fair.
- No service is completely secure. We keep working to improve security.

## 10. No automated individual decisions

No automated decision-making including profiling within the meaning of Art. 22 GDPR takes place. The random choice of an opponent (section 4.2) has no legal effect on you.

## 11. Your rights

Under the GDPR you have the right to:

- **access** (Art. 15) to the data stored about you,
- **rectification** (Art. 16),
- **erasure** (Art. 17), "right to be forgotten",
- **restriction of processing** (Art. 18),
- **data portability** (Art. 20),
- **object** (Art. 21) to processing based on legitimate interests,
- **withdraw consent** with effect for the future (Art. 7(3)), where processing is based on consent,
- **lodge a complaint with a supervisory authority** (Art. 77), e.g. the data protection authority of your state or place of residence. [[Enter the authority responsible for your location]]

## 12. How to exercise your rights – deleting your online data

As there is no account, we can only recognise you by your **player code**. Send an email to **[[email address]]** and tell us **your friend code** (in the app under *Online → Friends*, 6 characters) and your nickname. With the friend code we can find the online data that belongs to you, provide information, correct or delete it. We reply **within one month**.

**Directly in the app:** Settings → Privacy → **Delete online data**. This deletes your player code, nickname, results, runs, friend code, friendships and blocks on the server. [[This works only after you have run supabase/datenschutz.sql in the Supabase SQL editor.]]

If you uninstall the app, your online data remains on the server until you ask for deletion. A new start of the app creates a new, independent player code.

## 13. Changes to this policy

If the app or the law changes, we will update this policy. The version available at this address at the time of your use applies.

[[URL of this policy]]

Last updated: [[DD Month YYYY]]
