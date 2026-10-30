// Datei: game/home-hint.ts — der eine Hinweis unter den Menü-Tonnen
//
// Auf dem Startschirm steht immer nur EIN Hinweis. Vorrang (oben gewinnt):
//  1. Ganz neu (noch keine XP) → „Wirf in eine Tonne …“ (wie man startet)
//  2. Flamme in Gefahr → heute spielen rettet sie
//  3. Flamme gerade gerettet
//  4. Tagesaufgabe noch offen (liegt in der Kampagne)
//  5. Tagesbester im Ghost-Rennen (Online) – jemand anderes oder man selbst
//  6. sonst: „Wirf in eine Tonne …“

import type { FlameStatus } from "@/utils/streak";

export type HomeHintInput = {
  totalXP: number;
  flame: FlameStatus;
  dailyDone: boolean;
  /** Tagesbester (Server) – null: keiner, offline oder nicht eingerichtet. */
  dayBest: { name: string; isMe: boolean } | null;
};

export type HomeHint =
  | { key: "home.throwHint" | "home.flameAtRisk" | "home.hintDaily" | "home.hintDayBestMe"; arrow: boolean }
  | { key: "home.flameRescued"; arrow: false }
  | { key: "home.hintDayBest"; arrow: true; name: string };

/** Lange Namen kürzen, damit der Rest des Hinweises sichtbar bleibt. */
const NAME_MAX = 12;
function shortName(name: string): string {
  const chars = Array.from(name.trim());
  return chars.length > NAME_MAX ? `${chars.slice(0, NAME_MAX - 1).join("")}…` : chars.join("");
}

export function homeHint({ totalXP, flame, dailyDone, dayBest }: HomeHintInput): HomeHint {
  if (totalXP <= 0) return { key: "home.throwHint", arrow: true };
  if (flame === "atRisk") return { key: "home.flameAtRisk", arrow: true };
  if (flame === "rescued") return { key: "home.flameRescued", arrow: false };
  if (!dailyDone) return { key: "home.hintDaily", arrow: true };
  if (dayBest?.isMe) return { key: "home.hintDayBestMe", arrow: false };
  if (dayBest) return { key: "home.hintDayBest", arrow: true, name: shortName(dayBest.name) };
  return { key: "home.throwHint", arrow: true };
}
