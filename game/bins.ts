// Datei: game/bins.ts
// Welche Tonnen es gibt und ab welchem Level sie freigeschaltet werden.

import { type Category, type Item, ITEMS } from "@/constants/items";
import { BinColors, type BinKey } from "@/constants/theme";
import { type TranslationKey } from "@/i18n";

export type BinDef = {
  key: BinKey;
  category: Category;
  labelKey: TranslationKey;
  /** Ab diesem Spieler-Level im Spiel. */
  unlockLevel: number;
  color: string;
  colorLight: string;
  onColor: string;
  icon: string;
};

export const light = (hex: string, amount = 0.22) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix(n >> 16);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

function def(
  key: BinKey,
  category: Category,
  labelKey: TranslationKey,
  unlockLevel: number,
): BinDef {
  const c = BinColors[key];
  return {
    key,
    category,
    labelKey,
    unlockLevel,
    color: c.fill,
    colorLight: light(c.fill),
    onColor: c.on,
    icon: c.icon,
  };
}

// Reihenfolge = Reihenfolge von links nach rechts.
export const ALL_BINS: BinDef[] = [
  def("papier", "Papier", "bin.papier", 3),
  def("bio", "Biomüll", "bin.bio", 1),
  def("gelb", "Gelber Sack", "bin.gelb", 1),
  def("rest", "Restmüll", "bin.rest", 1),
  def("glas", "Glas", "bin.glas", 5),
];

export function getBinsForLevel(level: number): BinDef[] {
  return ALL_BINS.filter((b) => level >= b.unlockLevel);
}

/** Tonne, die bei genau diesem Level neu dazukommt (für „Neu freigeschaltet“). */
export function getUnlockAtLevel(level: number): BinDef | null {
  return ALL_BINS.find((b) => b.unlockLevel === level && level > 1) ?? null;
}

export function getBinByCategory(category: Category): BinDef | undefined {
  return ALL_BINS.find((b) => b.category === category);
}

export function getItemsForBins(bins: BinDef[]): Item[] {
  const cats = new Set(bins.map((b) => b.category));
  return ITEMS.filter((i) => cats.has(i.category));
}
