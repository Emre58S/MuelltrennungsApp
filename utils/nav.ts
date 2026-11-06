// Datei: utils/nav.ts
//
// „Zum Start“: immer die Bereichs-Hülle (app/bereiche.tsx). Das alte Tonnen-Menü
// und der Schalter „Neues Menü“ gibt es nicht mehr (5.11.2026).

import { type Href, router } from "expo-router";

export const HOME: Href = "/bereiche";

/** Ersetzt die aktuelle Seite durch den Start (wenn es kein „Zurück“ gibt). */
export function goHome() {
  router.replace(HOME);
}
