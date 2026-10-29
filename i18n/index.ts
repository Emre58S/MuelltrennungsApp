import { type Item } from "@/constants/items";

import { de, type TranslationKey, type Translations } from "./de";
import { en } from "./en";
import { ITEMS_EN } from "./items-en";
import { ITEM_REASONS } from "./item-reasons";

export type { TranslationKey };

export type Language = "de" | "en";

/** Sprachen in der Auswahl – Name immer in der eigenen Sprache. */
export const LANGUAGES: { code: Language; nativeName: string; flag: string }[] =
  [
    { code: "de", nativeName: "Deutsch", flag: "🇩🇪" },
    { code: "en", nativeName: "English", flag: "🇬🇧" },
  ];

const DICTIONARIES: Record<Language, Translations> = { de, en };

export function isLanguage(value: string | null | undefined): value is Language {
  return value === "de" || value === "en";
}

/** Nimmt die Gerätesprache, wenn sie unterstützt wird – sonst Englisch
 *  (für Menschen ohne Deutschkenntnisse verständlicher als Deutsch). */
export function resolveLanguage(deviceCode: string | null | undefined): Language {
  return isLanguage(deviceCode) ? deviceCode : "en";
}

export function translate(
  lang: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  let text: string = DICTIONARIES[lang][key] ?? de[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Anzeigename eines Gegenstands. `item.name` bleibt die deutsche ID. */
export function itemName(lang: Language, item: Item): string {
  return lang === "en" ? (ITEMS_EN[item.name]?.name ?? item.name) : item.name;
}

/** Fakt zum Gegenstand in der aktuellen Sprache (falls vorhanden). */
export function itemFact(lang: Language, item: Item): string | undefined {
  return lang === "en" ? (ITEMS_EN[item.name]?.fact ?? item.fact) : item.fact;
}

/** Kurze Begründung (≤ 4 Wörter), warum der Gegenstand in seine Tonne gehört. */
export function itemReason(lang: Language, item: Item): string | undefined {
  return ITEM_REASONS[item.name]?.[lang];
}
