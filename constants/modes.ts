import { type Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { type ComponentProps } from "react";

import { type TranslationKey } from "@/i18n";
import { getItem, setItem, StorageKeys } from "@/utils/storage";

export type GameMode = "endless" | "survival" | "time" | "aim";

export type ModeConfig = {
  mode: GameMode;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: ComponentProps<typeof Feather>["name"];
  recommended?: boolean;
};

// Reihenfolge = Empfehlung: zuerst ohne Druck üben.
export const MODES: ModeConfig[] = [
  {
    mode: "endless",
    titleKey: "mode.endless.title",
    descKey: "mode.endless.desc",
    icon: "feather",
    recommended: true,
  },
  {
    mode: "survival",
    titleKey: "mode.survival.title",
    descKey: "mode.survival.desc",
    icon: "shield",
  },
  {
    mode: "time",
    titleKey: "mode.time.title",
    descKey: "mode.time.desc",
    icon: "clock",
  },
  // „Zielwurf“ (mode: "aim") ist ausgeblendet (Nutzer, 29.10.): Trickwürfe
  // übernehmen das Zielen. Spiellogik bleibt, falls er zurückkommt.
];

/** Im Hauptmenü steht je Modus eine Tonne – dort immer genau 3. */
export const MENU_MODES: ModeConfig[] = MODES.filter((m) => m.mode !== "aim");

/** Modi mit 60-Sekunden-Uhr. */
export function isTimed(mode: GameMode): boolean {
  return mode === "time" || mode === "aim";
}

export function getModeConfig(mode: GameMode): ModeConfig {
  return MODES.find((m) => m.mode === mode) ?? MODES[0];
}

function isGameMode(value: string | null): value is GameMode {
  return value === "endless" || value === "survival" || value === "time" || value === "aim";
}

export async function getLastMode(): Promise<GameMode> {
  const stored = await getItem(StorageKeys.LAST_MODE);
  // ausgeblendeter Zielwurf → wieder mit „Üben“ weitermachen
  return isGameMode(stored) && stored !== "aim" ? stored : "endless";
}

/** Tagesaufgabe: 10 feste Gegenstände (für alle gleich), Ablauf wie „Üben“. */
export function startDaily() {
  router.push({ pathname: "/runde", params: { mode: "endless", daily: "1" } });
}

/** Startet das Spiel und merkt sich den Modus für „Weiter mit …“. */
export function startGame(mode: GameMode) {
  setItem(StorageKeys.LAST_MODE, mode);
  router.push({ pathname: "/runde", params: { mode } });
}
