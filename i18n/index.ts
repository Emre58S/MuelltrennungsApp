import { de, type TranslationKey, type Translations } from "./de";
import { en } from "./en";

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
