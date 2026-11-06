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
// Zeit (30 s, so viele richtig wie möglich) · Boss am Ende jeder Welt (R2e:
// 10 richtig in Folge, höchstens 20 Würfe; Fehler setzen nur die Serie zurück).

import { type Item, ITEMS } from "@/constants/items";
import { type BinKey } from "@/constants/theme";
import { ALL_BINS, type BinDef, getItemsForBins } from "@/game/bins";
import { TRICK_LEVELS } from "@/game/trick-levels";

export type Difficulty = Item["difficulty"];

/** Art einer Station; ohne Angabe: normal (feste Zahl Würfe). */
export type StationKind = "survival" | "time" | "boss";

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
  /** So viele richtig = geschafft (1 Stern); bei „Ohne Fehler“ und Boss: in Folge. */
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

/** Boss: so viele richtig in Folge, in höchstens so vielen Würfen. */
export const BOSS_STREAK = 10;
export const BOSS_THROWS = 20;
/** Boss mit höchstens so vielen Fehlern = 2 Sterne (fehlerfrei = 3). */
const BOSS_FEW_MISTAKES = 3;

/** Stationen einer Welt: erst leichte Gegenstände, dann alle, Ziel steigt;
 *  dazwischen „Ohne Fehler“ und „Zeit“ (die bisherigen Spielarten). */
const STEPS: { upTo: Difficulty; goal: number; total?: number; kind?: StationKind }[] = [
  { upTo: "leicht", goal: 6 },
  { upTo: "mittel", goal: 7 },
  { upTo: "mittel", goal: 4, kind: "survival" },
  { upTo: "schwer", goal: 7 },
  { upTo: "schwer", goal: 5, total: 8, kind: "time" },
  { upTo: "schwer", goal: 8 },
  { upTo: "schwer", goal: BOSS_STREAK, total: BOSS_THROWS, kind: "boss" },
];

/** Tonnen je Welt: nie mehr als drei. Welt 1 Papier vs. Rest, dann je eine neue Tonne
 *  mit zwei, die man schon kennt – so, dass typische Verwechslungen früh geübt werden
 *  (Glas vs. Papier, Bio vs. Gelber Sack, Sondermüll vs. Gelber Sack). Restmüll bleibt
 *  als Auffangbecken immer dabei. */
const WORLD_BINS: BinKey[][] = [
  ["papier", "rest"],
  ["papier", "gelb", "rest"],
  ["papier", "glas", "rest"],
  ["bio", "gelb", "rest"],
  ["gelb", "sonder", "rest"],
];

const LEARN_WORLDS: World[] = WORLD_BINS.map((bins, w) => ({
  index: w + 1,
  bins,
  // „Neu“ = in keiner früheren Welt vorgekommen (Papier in Welt 4 ist nicht neu)
  newBins: bins.filter((b) => !WORLD_BINS.slice(0, w).some((earlier) => earlier.includes(b))),
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
/** Tonnen der drei Fallen-Stationen (je drei, passend zu den Gegenständen). */
const TRICKY_BINS: BinKey[][] = [
  ["papier", "glas", "rest"],
  ["gelb", "sonder", "rest"],
  ["bio", "gelb", "rest"],
];
/** Vierte Station: Verwechslungen aus allen drei Listen, die in Papier, Gelb oder Rest gehören. */
const MIXED: string[] = [
  "Kassenzettel",
  "Geschenkpapier (mit Folie)",
  "Geschenkpapier (ohne Folie)",
  "Pizzakarton (fettig)",
  "Eierkarton",
  "Toilettenpapier-Rolle",
  "Zeitung",
  "Deckel (Metall)",
  "Kaffeekapsel (Alu)",
  "Spraydose (leer)",
  "Alufolie",
  "Zahnpastatube",
  "Butterverpackung",
  "Backpapier",
  "Kaugummi",
  "Einwegrasierer",
];
const MIXED_BINS: BinKey[] = ["papier", "gelb", "rest"];
/** Boss: die gemischte Liste plus ein paar Fallen aus den anderen Listen (alles Papier, Gelb oder Rest). */
const BOSS_ITEMS: string[] = [
  ...MIXED,
  "Zerbrochener Spiegel",
  "Trinkglas",
  "Tapeten",
  "Alte CD",
  "Kronkorken",
  "Tablettenblister (leer)",
];
const TRICKY_INDEX = WORLD_BINS.length + 1;
const TRICKY_WORLD: World = {
  index: TRICKY_INDEX,
  bins: MIXED_BINS,
  newBins: [],
  stations: [
    ...TRICKY.map((items, s): Station => ({
      id: `${TRICKY_INDEX}-${s + 1}`,
      bins: TRICKY_BINS[s],
      upTo: "schwer",
      items,
      total: 10,
      goal: 6,
    })),
    {
      id: `${TRICKY_INDEX}-${TRICKY.length + 1}`,
      bins: MIXED_BINS,
      upTo: "schwer",
      items: MIXED,
      total: 10,
      goal: 7,
    },
    // Boss: gemischte Fallen aus allen Listen im Dauerlauf
    {
      id: `${TRICKY_INDEX}-${TRICKY.length + 2}`,
      bins: MIXED_BINS,
      upTo: "schwer",
      items: BOSS_ITEMS,
      total: BOSS_THROWS,
      goal: BOSS_STREAK,
      kind: "boss",
    },
  ],
};

export const WORLDS: World[] = [...LEARN_WORLDS, TRICKY_WORLD];

/** Alle Stationen in Pfad-Reihenfolge. */
export const STATIONS: Station[] = WORLDS.flatMap((w) => w.stations);

export function getStation(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

/** Spielart der Runde: „Ohne Fehler“ → survival, „Zeit“ → time, sonst Üben. */
export function stationMode(station: Station): "endless" | "survival" | "time" {
  return station.kind === "boss" ? "endless" : (station.kind ?? "endless");
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

/** Sterne einer Runde je Art. Boss: 10 in Folge geschafft = 1, mit höchstens
 *  3 Fehlern = 2, fehlerfrei = 3. Sonst nach Anzahl richtig (starsFor). */
export function stationStars(
  station: Station,
  run: { correct: number; throws: number; maxStreak: number },
): number {
  if (station.kind !== "boss") return starsFor(station, run.correct);
  if (run.maxStreak < station.goal) return 0;
  const mistakes = run.throws - run.correct;
  return mistakes === 0 ? 3 : mistakes <= BOSS_FEW_MISTAKES ? 2 : 1;
}

/** Frei: die erste Station, sonst ab 1 Stern auf der vorigen. Schon gespielte
 *  Stationen (mit Stern) bleiben frei – auch wenn davor eine neue dazukam. */
export function isUnlocked(stars: CampaignStars, id: string): boolean {
  const i = STATIONS.findIndex((s) => s.id === id);
  if (i < 0) return false;
  return i === 0 || (stars[STATIONS[i - 1].id] ?? 0) >= 1 || (stars[id] ?? 0) >= 1;
}

/** Die Station, mit der es weitergeht: die erste freie ohne Stern (sonst die letzte). */
export function currentStation(stars: CampaignStars): Station {
  return (
    STATIONS.find((s) => (stars[s.id] ?? 0) < 1) ??
    STATIONS[STATIONS.length - 1]
  );
}

/** Vorsprung für Bestandsspieler: Lern-Welten, deren Tonnen man über das Level
 *  schon länger kennt (freigeschaltet vor dem jetzigen Level), gelten als
 *  geschafft – je Station 1 Stern. Level 4 → ab Welt 3, Level 6 → ab Welt 5,
 *  ab Level 8 → Welt 6. „Knifflige Fälle“ werden nie übersprungen. */
export function headStartStars(level: number): CampaignStars {
  const stars: CampaignStars = {};
  for (const world of LEARN_WORLDS) {
    const known = world.bins.every((key) => (ALL_BINS.find((b) => b.key === key)?.unlockLevel ?? Infinity) < level);
    if (!known) break;
    for (const s of world.stations) stars[s.id] = 1;
  }
  return stars;
}

/** Freies Spiel: die Tonnen der Station, an der man gerade ist (nie mehr als drei). */
export function freePlayBins(stars: CampaignStars): BinKey[] {
  return currentStation(stars).bins ?? WORLD_BINS[0];
}

/** Tonnen aus dem Link („papier,rest“) – Unbekanntes fällt weg, leer = keine. */
export function parseFreeBins(raw: string | undefined): BinKey[] | undefined {
  const keys = (raw ?? "").split(",").filter((k): k is BinKey => ALL_BINS.some((b) => b.key === k));
  return keys.length >= 2 ? keys : undefined;
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

/** Trick-Schule: je Welt eine Seitenstation mit 4 Trick-Leveln (1–4, 5–8 …).
 *  Nicht Teil der Pfad-Kette – sie sperrt nichts. */
export const TRICKS_PER_WORLD = 4;

/** Trick-Level (IDs) der Seitenstation einer Welt – je 4; die letzte Welt
 *  nimmt alle übrigen (neue Meister-Level kommen so automatisch dazu). */
export function worldTricks(world: World): number[] {
  const from = (world.index - 1) * TRICKS_PER_WORLD + 1;
  const last = world.index === WORLDS.length;
  const length = last ? Math.max(TRICK_LEVELS.length - from + 1, TRICKS_PER_WORLD) : TRICKS_PER_WORLD;
  return Array.from({ length }, (_, k) => from + k);
}

/** Welches Level die Seitenstation startet: das erste ohne Stern, sonst das
 *  mit den wenigsten. `locked`: das Level davor (Trick-Regel: ab 1 Stern auf
 *  dem vorigen) fehlt noch – erst die Trick-Schule davor. */
export function trickTarget(
  world: World,
  trickStars: Record<number, number>,
): { level: number; locked: boolean } {
  const levels = worldTricks(world);
  const open = levels.find((l) => (trickStars[l] ?? 0) < 1);
  const level =
    open ?? levels.reduce((a, b) => ((trickStars[b] ?? 0) < (trickStars[a] ?? 0) ? b : a));
  const locked = level > 1 && (trickStars[level - 1] ?? 0) < 1;
  return { level, locked };
}
