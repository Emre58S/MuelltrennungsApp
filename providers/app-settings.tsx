// Datei: providers/app-settings.tsx
// Zentrale Einstellungen: Aussehen (System/Hell/Dunkel), Sprache und
// „Weniger Bewegung“. Werden gespeichert und sind überall per Hook verfügbar.

import { useLocales } from "expo-localization";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AccessibilityInfo, useColorScheme } from "react-native";

import {
  type ColorScheme,
  Palettes,
  type ThemeColors,
} from "@/constants/theme";
import { type Item } from "@/constants/items";
import {
  isLanguage,
  itemFact,
  itemName,
  type Language,
  resolveLanguage,
  translate,
  type TranslationKey,
} from "@/i18n";
import {
  getBoolean,
  getItem,
  setBoolean,
  setItem,
  StorageKeys,
} from "@/utils/storage";

export type ThemeMode = "system" | ColorScheme;
export type LanguageSetting = "system" | Language;

type AppSettings = {
  ready: boolean;

  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  scheme: ColorScheme;
  colors: ThemeColors;

  languageSetting: LanguageSetting;
  setLanguage: (lang: LanguageSetting) => void;
  lang: Language;

  reduceMotionSetting: boolean;
  setReduceMotion: (value: boolean) => void;
  /** true, wenn der Nutzer ODER das Betriebssystem weniger Bewegung wünscht. */
  reduceMotion: boolean;

  /** Lernkarte nach Fehlwurf („Üben“) zeigt eine kurze Begründung. */
  learnReason: boolean;
  setLearnReason: (value: boolean) => void;
};

const AppSettingsContext = createContext<AppSettings | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [primaryLocale] = useLocales();

  const [ready, setReady] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [languageSetting, setLanguageState] =
    useState<LanguageSetting>("system");
  const [reduceMotionSetting, setReduceMotionState] = useState(false);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const [learnReason, setLearnReasonState] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const [storedTheme, storedLang, storedMotion, storedReason] = await Promise.all([
        getItem(StorageKeys.THEME_MODE),
        getItem(StorageKeys.LANGUAGE),
        getBoolean(StorageKeys.REDUCE_MOTION, false),
        getBoolean(StorageKeys.LEARN_REASON, true),
      ]);
      if (!active) return;
      if (isThemeMode(storedTheme)) setThemeModeState(storedTheme);
      if (isLanguage(storedLang)) setLanguageState(storedLang);
      setReduceMotionState(storedMotion);
      setLearnReasonState(storedReason);
      setReady(true);
    })();

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => active && setSystemReduceMotion(enabled))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystemReduceMotion,
    );

    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    setItem(StorageKeys.THEME_MODE, mode);
  }, []);

  const setLanguage = useCallback((value: LanguageSetting) => {
    setLanguageState(value);
    setItem(StorageKeys.LANGUAGE, value);
  }, []);

  const setReduceMotion = useCallback((value: boolean) => {
    setReduceMotionState(value);
    setBoolean(StorageKeys.REDUCE_MOTION, value);
  }, []);

  const setLearnReason = useCallback((value: boolean) => {
    setLearnReasonState(value);
    setBoolean(StorageKeys.LEARN_REASON, value);
  }, []);

  const scheme: ColorScheme =
    themeMode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;

  const lang: Language =
    languageSetting === "system"
      ? resolveLanguage(primaryLocale?.languageCode)
      : languageSetting;

  const value = useMemo<AppSettings>(
    () => ({
      ready,
      themeMode,
      setThemeMode,
      scheme,
      colors: Palettes[scheme],
      languageSetting,
      setLanguage,
      lang,
      reduceMotionSetting,
      setReduceMotion,
      reduceMotion: reduceMotionSetting || systemReduceMotion,
      learnReason,
      setLearnReason,
    }),
    [
      ready,
      themeMode,
      setThemeMode,
      scheme,
      languageSetting,
      setLanguage,
      lang,
      reduceMotionSetting,
      setReduceMotion,
      systemReduceMotion,
      learnReason,
      setLearnReason,
    ],
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettings {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings muss innerhalb von AppSettingsProvider liegen.");
  }
  return ctx;
}

/** Farben + aktuelles Schema (hell/dunkel). */
export function useAppTheme() {
  const { colors, scheme } = useAppSettings();
  return { colors, scheme };
}

/** Übersetzungsfunktion + Zahlenformat für die aktuelle Sprache. */
export function useI18n() {
  const { lang } = useAppSettings();

  return useMemo(() => {
    const locale = lang === "de" ? "de-DE" : "en-GB";
    return {
      lang,
      t: (key: TranslationKey, vars?: Record<string, string | number>) =>
        translate(lang, key, vars),
      itemName: (item: Item) => itemName(lang, item),
      itemFact: (item: Item) => itemFact(lang, item),
      formatNumber: (n: number) => n.toLocaleString(locale),
    };
  }, [lang]);
}
