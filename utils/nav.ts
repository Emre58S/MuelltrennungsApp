// Datei: utils/nav.ts
//
// „Zum Start“: je nach Schalter „Neues Menü“ (StorageKeys.NAV_V2) in die
// Bereichs-Hülle oder ins alte Tonnen-Menü. `replace("/")` taugt dafür nicht –
// „/“ gibt es zweimal (app/index.tsx und app/(tabs)/index.tsx).

import { type Href, router } from "expo-router";

import { getBoolean, StorageKeys } from "@/utils/storage";

/** Standard: neues Menü. Nur wer es in den Einstellungen abschaltet, sieht das alte. */
export const NAV_V2_DEFAULT = true;

export async function homeRoute(): Promise<Href> {
  const v2 = await getBoolean(StorageKeys.NAV_V2, NAV_V2_DEFAULT).catch(() => NAV_V2_DEFAULT);
  return v2 ? "/bereiche" : "/(tabs)";
}

/** Ersetzt die aktuelle Seite durch den Start (wenn es kein „Zurück“ gibt). */
export function goHome() {
  homeRoute().then((href) => router.replace(href));
}
