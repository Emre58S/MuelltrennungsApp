// Datei: game/rewards.ts
// Belohnungen: Wurfspuren, die man mit Trick-Sternen oder dem XP-Level
// freischaltet und dann für alle Würfe auswählt. Rein und ohne React –
// Farben der Spuren macht components/game/items.tsx (trailColor).

import { type TranslationKey } from "@/i18n";

export type TrailId =
  | "standard"
  | "gold"
  | "komet"
  | "herbstlaub"
  | "regenbogen"
  | "konfetti"
  | "polarlicht"
  | "seifenblasen"
  | "funken"
  | "sternenstaub";

export type TrailReward = {
  id: TrailId;
  name: TranslationKey;
  /** Frei ab so vielen Trick-Sternen … */
  stars?: number;
  /** … oder ab diesem XP-Level. */
  level?: number;
};

/** Reihenfolge = Anzeige auf der Belohnungs-Seite (von leicht nach schwer). */
export const TRAILS: TrailReward[] = [
  { id: "standard", name: "reward.trail.standard" },
  { id: "gold", name: "reward.trail.gold", stars: 5 },
  { id: "komet", name: "reward.trail.komet", level: 4 },
  { id: "herbstlaub", name: "reward.trail.herbstlaub", level: 6 },
  { id: "regenbogen", name: "reward.trail.regenbogen", stars: 12 },
  { id: "konfetti", name: "reward.trail.konfetti", stars: 20 },
  { id: "polarlicht", name: "reward.trail.polarlicht", level: 8 },
  { id: "seifenblasen", name: "reward.trail.seifenblasen", stars: 28 },
  { id: "funken", name: "reward.trail.funken", level: 12 },
  { id: "sternenstaub", name: "reward.trail.sternenstaub", stars: 40 },
];

export type Progress = { stars: number; level: number };

export function isUnlocked(reward: TrailReward, progress: Progress): boolean {
  if (reward.stars !== undefined) return progress.stars >= reward.stars;
  if (reward.level !== undefined) return progress.level >= reward.level;
  return true;
}

/** Spuren, die zwischen zwei Ständen neu frei geworden sind. */
export function newlyUnlocked(before: Progress, after: Progress): TrailReward[] {
  return TRAILS.filter((r) => !isUnlocked(r, before) && isUnlocked(r, after));
}

/** Gespeicherte Auswahl prüfen: gesperrt oder unbekannt → Standard. */
export function usableTrail(id: string | null, progress: Progress): TrailId {
  const reward = TRAILS.find((r) => r.id === id);
  return reward && isUnlocked(reward, progress) ? reward.id : "standard";
}

/** Summe aller Trick-Sterne (Tages-Trick zählt nicht – er wechselt täglich). */
export function totalStars(stars: Record<number, number>): number {
  return Object.values(stars).reduce((sum, n) => sum + n, 0);
}
