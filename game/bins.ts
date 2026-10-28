// Datei: game/bins.ts
// Welche Tonnen es gibt und welche 3 in welcher Szene stehen. Es sind immer
// genau 3: Standard ist Bio · Gelber Sack · Restmüll; ab Level 3 bzw. 5
// zeigen manche Szenen stattdessen Papier bzw. Glas, ab Level 7 die Haus-Szene
// die rote Sondermüll-Tonne (Batterien, Handys, Kabel …).

import { type Category, type Item, ITEMS } from "@/constants/items";
import { type SceneKind } from "@/components/game/stage";
import { BinColors, type BinKey } from "@/constants/theme";
import { type TranslationKey } from "@/i18n";

export type BinDef = {
  key: BinKey;
  category: Category;
  labelKey: TranslationKey;
  /** Ab diesem Spieler-Level taucht die Tonne (in manchen Szenen) auf. */
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

// Alle Tonnen (welche wo stehen: SCENE_BINS).
export const ALL_BINS: BinDef[] = [
  def("papier", "Papier", "bin.papier", 3),
  def("bio", "Biomüll", "bin.bio", 1),
  def("gelb", "Gelber Sack", "bin.gelb", 1),
  def("rest", "Restmüll", "bin.rest", 1),
  def("glas", "Glas", "bin.glas", 5),
  def("sonder", "Sondermüll", "bin.sonder", 7),
];

function byKey(key: BinKey): BinDef {
  const bin = ALL_BINS.find((b) => b.key === key);
  if (!bin) throw new Error(`Unbekannte Tonne: ${key}`);
  return bin;
}

/** Die Grund-Tonnen (Level 1, Tagesaufgabe, Menü). */
export const STANDARD_BINS: BinDef[] = (["bio", "gelb", "rest"] as const).map(byKey);

/** Welche 3 Tonnen in welcher Szene stehen (links → rechts). */
const SCENE_BINS: Record<SceneKind, BinKey[]> = {
  haus: ["bio", "gelb", "rest"],
  ziegel: ["papier", "gelb", "rest"],
  garten: ["bio", "glas", "rest"],
};

/** Ab Level 7: Haus-Szene mit Sondermüll statt Bio (Bio bleibt im Garten). */
const SCENE_BINS_LATE: Partial<Record<SceneKind, BinKey[]>> = {
  haus: ["sonder", "gelb", "rest"],
};

/** Tonnen einer Runde: die der Szene – solange eine davon noch nicht
 *  freigeschaltet ist, die Standard-Tonnen. */
export function getBinsForScene(scene: SceneKind, level: number): BinDef[] {
  const late = SCENE_BINS_LATE[scene];
  if (late && late.every((k) => level >= byKey(k).unlockLevel)) return late.map(byKey);
  const bins = SCENE_BINS[scene].map(byKey);
  return bins.every((b) => level >= b.unlockLevel) ? bins : STANDARD_BINS;
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
