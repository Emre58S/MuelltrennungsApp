// Datei: game/rewards.ts
// Belohnungen: Wurfspuren und Tonnen-Sticker, die man mit Trick-Sternen oder
// dem XP-Level freischaltet und dann auswählt (Sticker: components/game/trash-bin.tsx). Rein und ohne React –
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

export type BinSkinId = "keiner" | "stern" | "herz" | "punkte";

export type BinSkinReward = {
  id: BinSkinId;
  name: TranslationKey;
  stars?: number;
  level?: number;
};

/** Tonnen-Sticker (nur Optik), Reihenfolge = Anzeige. */
export const BIN_SKINS: BinSkinReward[] = [
  { id: "keiner", name: "reward.skin.keiner" },
  { id: "stern", name: "reward.skin.stern", stars: 8 },
  { id: "herz", name: "reward.skin.herz", level: 5 },
  { id: "punkte", name: "reward.skin.punkte", stars: 16 },
];

/** Gespeicherten Sticker prüfen: gesperrt oder unbekannt → keiner. */
export function usableSkin(id: string | null, progress: Progress): BinSkinId {
  const reward = BIN_SKINS.find((r) => r.id === id);
  return reward && isUnlocked(reward, progress) ? reward.id : "keiner";
}

export function isUnlocked(reward: { stars?: number; level?: number }, progress: Progress): boolean {
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
