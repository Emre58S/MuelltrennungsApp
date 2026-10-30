// Datei: game/campaign.ts — Kampagne als Lernpfad (ROADMAP.md, R2)
//
// Welten → Stationen. Jede Welt bringt eine neue Tonne dazu; jede Station
// hat eine Tonnen-Auswahl, einen Gegenstands-Pool (bis zu einer Schwierigkeit)
// und ein Ziel („7 von 10 richtig“). Ergebnis: 0–3 Sterne. Die nächste
// Station ist ab 1 Stern auf der vorigen frei.
//
// Welt 6 „Knifflige Fälle“: alle Tonnen, Stationen mit festen Fallen-Listen.
// Neue Tonne = Lernkarte (introExamples + Text bin.<key>.examples).
// Stations-Arten (R2d): normal · Ohne Fehler (endet beim ersten Fehler) ·
// Zeit (60 s, so viele richtig wie möglich). Trick und Boss folgen (R2d/R2e).

import { type Item, ITEMS } from "@/constants/items";
import { type BinKey } from "@/constants/theme";
import { ALL_BINS, type BinDef, getItemsForBins } from "@/game/bins";

export type Difficulty = Item["difficulty"];

/** Art einer Station; ohne Angabe: normal (feste Zahl Würfe). */
export type StationKind = "survival" | "time";

export type Station = {
  /** „Welt-Nummer“ – z. B. "2-3" (Welt 2, Station 3). */
  id: string;
  bins: BinKey[];
  /** Gegenstände bis zu dieser Schwierigkeit (leicht < mittel < schwer). */
  upTo: Difficulty;
  /** Feste Liste (Namen) statt Schwierigkeit – für „Knifflige Fälle“. */
  items?: string[];
  /** Würfe pro Runde – bei „Zeit“: so viele richtig = 3 Sterne. */
  total: number;
  /** So viele richtig = geschafft (1 Stern); bei „Ohne Fehler“: in Folge. */
  goal: number;
  kind?: StationKind;
};

export type World = {
  index: number;
  bins: BinKey[];
  /** Tonnen, die in dieser Welt neu sind (Lernkarte; Welt 1: beide, Welt 6: keine). */
  newBins: BinKey[];
  stations: Station[];
};

/** Sterne je Station (nur der beste Lauf zählt). */
export type CampaignStars = Record<string, number>;

const ORDER: Difficulty[] = ["leicht", "mittel", "schwer"];

/** Stationen einer Welt: erst leichte Gegenstände, dann alle, Ziel steigt;
 *  dazwischen „Ohne Fehler“ und „Zeit“ (die bisherigen Spielarten). */
const STEPS: { upTo: Difficulty; goal: number; total?: number; kind?: StationKind }[] = [
  { upTo: "leicht", goal: 6 },
  { upTo: "mittel", goal: 7 },
  { upTo: "mittel", goal: 4, kind: "survival" },
  { upTo: "schwer", goal: 7 },
  { upTo: "schwer", goal: 10, total: 16, kind: "time" },
  { upTo: "schwer", goal: 8 },
];

/** Reihenfolge der Tonnen: Welt 1 Papier vs. Rest, dann je eine neue. */
const WORLD_BINS: BinKey[][] = [
  ["papier", "rest"],
  ["papier", "gelb", "rest"],
  ["papier", "gelb", "rest", "glas"],
  ["papier", "bio", "gelb", "rest", "glas"],
  ["papier", "bio", "gelb", "rest", "glas", "sonder"],
];

const LEARN_WORLDS: World[] = WORLD_BINS.map((bins, w) => ({
  index: w + 1,
  bins,
  newBins: w === 0 ? bins : bins.filter((b) => !WORLD_BINS[w - 1].includes(b)),
  stations: STEPS.map((step, s) => ({
    id: `${w + 1}-${s + 1}`,
    bins,
    upTo: step.upTo,
    total: step.total ?? 10,
    goal: step.goal,
    ...(step.kind && { kind: step.kind }),
  })),
}));

/** Welt 6: Fallen – richtige und falsche „Doppelgänger“ gemischt. */
const TRICKY: string[][] = [
  // Sieht aus wie Papier oder Glas
  [
    "Kassenzettel",
    "Geschenkpapier (mit Folie)",
    "Geschenkpapier (ohne Folie)",
    "Zerbrochener Spiegel",
    "Trinkglas",
    "Parfümflasche",
    "Pizzakarton (fettig)",
    "Tapeten",
    "Eierkarton",
    "Toilettenpapier-Rolle",
    // echte Papier-/Glas-Gegenstücke, damit „alles in Rest“ nicht reicht
    "Zeitung",
    "Marmeladenglas",
    "Weinflasche",
  ],
  // Verpackung oder Sondermüll?
  [
    "Deckel (Metall)",
    "Kaffeekapsel (Alu)",
    "Tablettenblister (leer)",
    "Spraydose (leer)",
    "Kronkorken",
    "Alufolie",
    "Ladekabel",
    "Energiesparlampe",
    "Nagellackentferner",
    "Fieberthermometer (Quecksilber)",
    "Druckerpatronen",
    "Alte CD",
    "Einwegrasierer",
  ],
  // Küche und Bad
  [
    "Teebeutel",
    "Kaffeefilter",
    "Küchenrolle (unbeschichtet)",
    "Backpapier",
    "Kaugummi",
    "Wattestäbchen",
    "Alte Zahnbürste",
    "Zahnpastatube",
    "Butterverpackung",
    "Kerzenreste",
  ],
];
const ALL_KEYS: BinKey[] = WORLD_BINS[WORLD_BINS.length - 1];
const TRICKY_WORLD: World = {
  index: WORLD_BINS.length + 1,
  bins: ALL_KEYS,
  newBins: [],
  stations: [...TRICKY, TRICKY.flat()].map((items, s) => ({
    id: `${WORLD_BINS.length + 1}-${s + 1}`,
    bins: ALL_KEYS,
    upTo: "schwer",
    items,
    total: 10,
    goal: s < TRICKY.length ? 6 : 7,
  })),
};

export const WORLDS: World[] = [...LEARN_WORLDS, TRICKY_WORLD];

/** Alle Stationen in Pfad-Reihenfolge. */
export const STATIONS: Station[] = WORLDS.flatMap((w) => w.stations);

export function getStation(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

/** Spielart der Runde: „Ohne Fehler“ → survival, „Zeit“ → time, sonst Üben. */
export function stationMode(station: Station): "endless" | "survival" | "time" {
  return station.kind ?? "endless";
}

/** Tonnen einer Station (in der Reihenfolge von ALL_BINS, wie im Spiel). */
export function stationBins(station: Station): BinDef[] {
  return ALL_BINS.filter((b) => station.bins.includes(b.key));
}

/** Gegenstände, die in dieser Station vorkommen können. */
export function stationPool(station: Station): Item[] {
  if (station.items) {
    const names = new Set(station.items);
    return ITEMS.filter((it) => names.has(it.name));
  }
  const max = ORDER.indexOf(station.upTo);
  return getItemsForBins(stationBins(station)).filter(
    (it) => ORDER.indexOf(it.difficulty) <= max,
  );
}

/** Je nach Kommune verschieden – nicht als eindeutiges Beispiel zeigen. */
const UNCLEAR = new Set(["Abgelaufene Medikamente"]);

/** Lernkarte für eine neue Tonne: 3 typische Beispiele, leichte zuerst. */
export function introExamples(bin: BinKey): Item[] {
  const def = ALL_BINS.find((b) => b.key === bin);
  if (!def) return [];
  return ITEMS.filter(
    (it) => it.category === def.category && it.difficulty !== "schwer" && !UNCLEAR.has(it.name),
  )
    .sort((a, b) => ORDER.indexOf(a.difficulty) - ORDER.indexOf(b.difficulty))
    .slice(0, 3);
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
  return (
    STATIONS.find((s) => (stars[s.id] ?? 0) < 1) ??
    STATIONS[STATIONS.length - 1]
  );
}

/** Neues Ergebnis eintragen – nur mehr Sterne zählen (nie weniger). */
export function withStars(
  stars: CampaignStars,
  id: string,
  earned: number,
): CampaignStars {
  if ((stars[id] ?? 0) >= earned) return stars;
  return { ...stars, [id]: Math.min(3, Math.max(0, earned)) };
}

/** Die Station nach dieser (oder keine – Ende des Pfads). */
export function nextStation(id: string): Station | undefined {
  const i = STATIONS.findIndex((s) => s.id === id);
  return i < 0 ? undefined : STATIONS[i + 1];
}

/** Gegenstände einer Runde: gemischt und ohne Zurücklegen gezogen – erst
 *  wenn der Pool leer ist, wird neu gemischt (kein Gegenstand doppelt, solange
 *  es genug gibt; nie zweimal direkt hintereinander). */
export function stationQueue(station: Station, random: () => number = Math.random): Item[] {
  const pool = stationPool(station);
  const queue: Item[] = [];
  while (pool.length > 0 && queue.length < station.total) {
    const deck = [...pool];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // Übergang zwischen zwei Durchgängen: nicht derselbe Gegenstand doppelt
    if (deck.length > 1 && deck[0] === queue[queue.length - 1]) deck.push(deck.shift()!);
    queue.push(...deck);
  }
  return queue.slice(0, station.total);
}
