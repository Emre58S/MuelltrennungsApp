// Datei: game/rewards.ts
// Belohnungen: Wurfspuren und Tonnen-Sticker, die man mit Trick-Sternen, dem
// XP-Level, Gold-Medaillen im Sammelbuch (game/mastery.ts) oder Truhen
// (alle 3 Tagesmissionen, game/missions.ts) freischaltet und dann auswählt (Sticker: components/game/trash-bin.tsx). Rein und ohne React –
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
  | "diamant"
  | "ozean"
  | "kirschbluete"
  | "neon";

export type TrailReward = {
  id: TrailId;
  name: TranslationKey;
  /** Frei ab so vielen Trick-Sternen … */
  stars?: number;
  /** … oder ab diesem XP-Level … */
  level?: number;
  /** … oder ab so vielen Gold-Gegenständen (Sammelbuch) … */
  gold?: number;
  /** … oder aus der so-vielten geöffneten Truhe. */
  chests?: number;
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
  { id: "ozean", name: "reward.trail.ozean", chests: 1 },
  { id: "kirschbluete", name: "reward.trail.kirschbluete", chests: 3 },
  { id: "neon", name: "reward.trail.neon", chests: 6 },
];

/** Treffer-Funken je Wurfspur (ROADMAP R6a) – dieselben Töne wie die Spur
 *  (components/game/items.tsx trailColor); Standard behält die Tonnenfarbe. */
export const TRAIL_SPARKS: Partial<Record<TrailId, string[]>> = {
  gold: ["#FFD54A", "#FFE082", "#FFC107"],
  komet: ["#5AA9FF", "#FFFFFF", "#A9D2FF"],
  herbstlaub: ["#E8772E", "#C94A2A", "#F2B134", "#9C5B2E"],
  regenbogen: ["#FF5A5F", "#FFD54A", "#3DDC97", "#4D9DE0", "#B57EDC"],
  konfetti: ["#FF5A5F", "#FFD54A", "#3DDC97", "#4D9DE0", "#B57EDC"],
  polarlicht: ["#4DE8B0", "#4DB8E8", "#9B6BE8"],
  seifenblasen: ["#9FF3E8", "#F7B5E3", "#C9E8FF"],
  funken: ["#FFF3B0", "#FFB74D", "#FFFFFF"],
  sternenstaub: ["#5B4BC4", "#FFFFFF", "#8E80E0"],
  smaragd: ["#1FBF6A", "#5EE89A", "#0E8A4A"],
  lava: ["#7A1408", "#FFB000", "#FF5A1F"],
  diamant: ["#FFFFFF", "#A8E6FF", "#D6F3FF"],
  ozean: ["#0E5FA8", "#2EC4D6", "#5AA9E6"],
  kirschbluete: ["#F8C8DC", "#F06FA8", "#FFE4EE"],
  neon: ["#FF2BD6", "#00F0FF"],
};

/** `gold` = Gegenstände mit Gold-Medaille, `chests` = geöffnete Truhen (fehlt = 0). */
export type Progress = { stars: number; level: number; gold?: number; chests?: number };

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

export function isUnlocked(
  reward: { stars?: number; level?: number; gold?: number; chests?: number },
  progress: Progress,
): boolean {
  if (reward.chests !== undefined) return (progress.chests ?? 0) >= reward.chests;
  if (reward.gold !== undefined) return (progress.gold ?? 0) >= reward.gold;
  if (reward.stars !== undefined) return progress.stars >= reward.stars;
  if (reward.level !== undefined) return progress.level >= reward.level;
  return true;
}

/** Nächste Belohnung, die man mit Sternen erreicht (die mit den wenigsten
 *  fehlenden Sternen) – fürs Ziel vor Augen am Pfad. null = alle frei. */
export function nextStarReward(progress: Progress): { reward: TrailReward | BinSkinReward; left: number } | null {
  let best: { reward: TrailReward | BinSkinReward; left: number } | null = null;
  for (const r of [...TRAILS, ...BIN_SKINS] as (TrailReward | BinSkinReward)[]) {
    if (r.stars === undefined || progress.stars >= r.stars) continue;
    const left = r.stars - progress.stars;
    if (!best || left < best.left) best = { reward: r, left };
  }
  return best;
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

// ── Truhen ────────────────────────────────────────────────────────────

/** XP aus einer Truhe ohne neue Wurfspur. */
export const CHEST_XP = 50;

/** Inhalt der so-vielten geöffneten Truhe: eine Wurfspur oder (null) XP. */
export function chestReward(opened: number): TrailReward | null {
  return TRAILS.find((r) => r.chests === opened) ?? null;
}

/** Nächste Wurfspur aus Truhen und wie viele Truhen noch fehlen (null = alle da). */
export function nextChestTrail(opened: number): { reward: TrailReward; left: number } | null {
  const reward = TRAILS.find((r) => r.chests !== undefined && r.chests > opened);
  return reward ? { reward, left: reward.chests! - opened } : null;
}
