// Datei: game/rewards.ts
// Belohnungen: Wurfspuren und Tonnen-Sticker, die man mit Trick-Sternen, dem
// XP-Level oder Gold-Medaillen im Sammelbuch (game/mastery.ts) freischaltet und dann auswählt (Sticker: components/game/trash-bin.tsx). Rein und ohne React –
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
  | "sternenstaub"
  | "smaragd"
  | "lava"
  | "diamant";

export type TrailReward = {
  id: TrailId;
  name: TranslationKey;
  /** Frei ab so vielen Trick-Sternen … */
  stars?: number;
  /** … oder ab diesem XP-Level … */
  level?: number;
  /** … oder ab so vielen Gold-Gegenständen (Sammelbuch). */
  gold?: number;
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
  { id: "smaragd", name: "reward.trail.smaragd", gold: 3 },
  { id: "lava", name: "reward.trail.lava", gold: 10 },
  { id: "diamant", name: "reward.trail.diamant", gold: 25 },
];

/** `gold` = Gegenstände mit Gold-Medaille (fehlt = 0). */
export type Progress = { stars: number; level: number; gold?: number };

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

export function isUnlocked(reward: { stars?: number; level?: number; gold?: number }, progress: Progress): boolean {
  if (reward.gold !== undefined) return (progress.gold ?? 0) >= reward.gold;
  if (reward.stars !== undefined) return progress.stars >= reward.stars;
  if (reward.level !== undefined) return progress.level >= reward.level;
  return true;
}

/** Text der Freischalt-Meldung je Art – „Stern“ allein läse sich wie ein Wertungsstern. */
export function unlockMessageKey(reward: TrailReward | BinSkinReward): TranslationKey {
  return (BIN_SKINS as (TrailReward | BinSkinReward)[]).includes(reward) ? "reward.newSticker" : "reward.new";
}

/** Spuren/Sticker, die zwischen zwei Ständen neu frei geworden sind. */
export function newlyUnlocked(before: Progress, after: Progress): (TrailReward | BinSkinReward)[] {
  return [...TRAILS, ...BIN_SKINS].filter((r) => !isUnlocked(r, before) && isUnlocked(r, after));
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
