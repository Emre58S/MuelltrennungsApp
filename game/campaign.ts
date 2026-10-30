// Datei: game/campaign.ts — Kampagne als Lernpfad (ROADMAP.md, R2)
//
// Welten → Stationen. Jede Welt bringt eine neue Tonne dazu; jede Station
// hat eine Tonnen-Auswahl, einen Gegenstands-Pool (bis zu einer Schwierigkeit)
// und ein Ziel („7 von 10 richtig“). Ergebnis: 0–3 Sterne. Die nächste
// Station ist ab 1 Stern auf der vorigen frei.
//
// Inhalte der Welten (Welt 6 „Knifflige Fälle“, Lernkarten) folgen mit R2b,
// Stations-Arten (Zeit, Ohne Fehler, Trick, Boss) mit R2d/R2e.

import { type Item } from "@/constants/items";
import { type BinKey } from "@/constants/theme";
import { ALL_BINS, type BinDef, getItemsForBins } from "@/game/bins";

export type Difficulty = Item["difficulty"];

export type Station = {
  /** „Welt-Nummer“ – z. B. "2-3" (Welt 2, Station 3). */
  id: string;
  bins: BinKey[];
  /** Gegenstände bis zu dieser Schwierigkeit (leicht < mittel < schwer). */
  upTo: Difficulty;
  /** Würfe pro Runde. */
  total: number;
  /** So viele richtig = geschafft (1 Stern). */
  goal: number;
};

export type World = {
  index: number;
  bins: BinKey[];
  /** Die Tonne, die in dieser Welt neu dazukommt (Welt 1: beide neu). */
  newBin: BinKey;
  stations: Station[];
};

/** Sterne je Station (nur der beste Lauf zählt). */
export type CampaignStars = Record<string, number>;

const ORDER: Difficulty[] = ["leicht", "mittel", "schwer"];

/** Stationen einer Welt: erst leichte Gegenstände, dann alle, Ziel steigt. */
const STEPS: { upTo: Difficulty; goal: number }[] = [
  { upTo: "leicht", goal: 7 },
  { upTo: "mittel", goal: 8 },
  { upTo: "schwer", goal: 8 },
  { upTo: "schwer", goal: 9 },
];

/** Reihenfolge der Tonnen: Welt 1 Papier vs. Rest, dann je eine neue. */
const WORLD_BINS: BinKey[][] = [
  ["papier", "rest"],
  ["papier", "gelb", "rest"],
  ["papier", "gelb", "rest", "glas"],
  ["papier", "bio", "gelb", "rest", "glas"],
  ["papier", "bio", "gelb", "rest", "glas", "sonder"],
];

export const WORLDS: World[] = WORLD_BINS.map((bins, w) => ({
  index: w + 1,
  bins,
  newBin: w === 0 ? "papier" : (bins.find((b) => !WORLD_BINS[w - 1].includes(b)) as BinKey),
  stations: STEPS.map((step, s) => ({ id: `${w + 1}-${s + 1}`, bins, upTo: step.upTo, total: 10, goal: step.goal })),
}));

/** Alle Stationen in Pfad-Reihenfolge. */
export const STATIONS: Station[] = WORLDS.flatMap((w) => w.stations);

export function getStation(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

/** Tonnen einer Station (in der Reihenfolge von ALL_BINS, wie im Spiel). */
export function stationBins(station: Station): BinDef[] {
  return ALL_BINS.filter((b) => station.bins.includes(b.key));
}

/** Gegenstände, die in dieser Station vorkommen können. */
export function stationPool(station: Station): Item[] {
  const max = ORDER.indexOf(station.upTo);
  return getItemsForBins(stationBins(station)).filter((it) => ORDER.indexOf(it.difficulty) <= max);
}

/** Sterne für ein Ergebnis: Ziel = 1, mehr als das Ziel = 2, alles richtig = 3. */
export function starsFor(station: Station, correct: number): number {
  if (correct >= station.total) return 3;
  if (correct > station.goal) return 2;
  if (correct >= station.goal) return 1;
  return 0;
}

/** Frei: die erste Station, sonst ab 1 Stern auf der vorigen. */
export function isUnlocked(stars: CampaignStars, id: string): boolean {
  const i = STATIONS.findIndex((s) => s.id === id);
  if (i < 0) return false;
  return i === 0 || (stars[STATIONS[i - 1].id] ?? 0) >= 1;
}

/** Die Station, mit der es weitergeht: die erste freie ohne Stern (sonst die letzte). */
export function currentStation(stars: CampaignStars): Station {
  return STATIONS.find((s) => (stars[s.id] ?? 0) < 1) ?? STATIONS[STATIONS.length - 1];
}

/** Neues Ergebnis eintragen – nur mehr Sterne zählen (nie weniger). */
export function withStars(stars: CampaignStars, id: string, earned: number): CampaignStars {
  if ((stars[id] ?? 0) >= earned) return stars;
  return { ...stars, [id]: Math.min(3, Math.max(0, earned)) };
}
