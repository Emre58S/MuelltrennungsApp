import { type Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { type ComponentProps } from "react";

import { type TranslationKey } from "@/i18n";
import { getItem, setItem, StorageKeys } from "@/utils/storage";

export type GameMode = "endless" | "survival" | "time";

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
];

export function getModeConfig(mode: GameMode): ModeConfig {
  return MODES.find((m) => m.mode === mode) ?? MODES[0];
}

function isGameMode(value: string | null): value is GameMode {
  return value === "endless" || value === "survival" || value === "time";
}

export async function getLastMode(): Promise<GameMode> {
  const stored = await getItem(StorageKeys.LAST_MODE);
  return isGameMode(stored) ? stored : "endless";
}

/** Startet das Spiel und merkt sich den Modus für „Weiter mit …“. */
export function startGame(mode: GameMode) {
  setItem(StorageKeys.LAST_MODE, mode);
  router.push({ pathname: "/(tabs)/explore", params: { mode } });
}
