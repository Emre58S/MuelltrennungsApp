// Datei: game/parcours.ts
// Parcours-Runde (ROADMAP R5d): Gegenstände aller Tonnen in der Reihenfolge
// des Tages (für alle gleich), Zeit je Parcours, Punkte je Wurf. Die
// Hindernisse hängen nur an der Rundenzeit – ein Ghost sieht später exakt
// denselben Parcours. Rein und ohne React (Tests: __tests__/parcours.test.ts).

import { hashString } from "./logic";
import { sprintQueue } from "./sprint";

/** Länge der Strecke – mehr, als jemand in 30 s werfen kann. */
export const PARCOURS_ITEMS = 40;

/** Die Gegenstände eines Parcours heute: für alle gleich, je Parcours anders. */
export function parcoursQueue<T>(pool: T[], day: string, id: number): T[] {
  return sprintQueue(pool, day, PARCOURS_ITEMS, `parcours-${id}`);
}

/** Parcours des Tages (Online-Karte): für alle gleich, nur vom Datum abhängig. */
export function dailyParcoursId(day: string, ids: number[]): number {
  return ids[hashString(`parcours-day:${day}`) % ids.length];
}

/** Ein Parcours-Lauf als Ghost: Punktestand nach jedem Treffer (ms seit Start). */
export type ParcoursRun = { points: number; hits: [ms: number, total: number][] };

/** Punkte des Ghosts zur Rundenzeit `ms` – nur, was er bis dahin geschafft hatte. */
export function ghostPointsAt(run: ParcoursRun, ms: number): number {
  let total = 0;
  for (const [at, sum] of run.hits) {
    if (at > ms) break;
    total = sum;
  }
  return total;
}

/** Prüft einen gespeicherten Lauf (null = unbrauchbar). */
export function parseParcoursRun(value: unknown): ParcoursRun | null {
  if (!value || typeof value !== "object") return null;
  const { points, hits } = value as { points?: unknown; hits?: unknown };
  if (typeof points !== "number" || !Number.isFinite(points) || points <= 0 || !Array.isArray(hits)) return null;
  const ok = hits.every(
    (h, i) =>
      Array.isArray(h) &&
      h.length === 2 &&
      typeof h[0] === "number" &&
      typeof h[1] === "number" &&
      (i === 0 || (h[0] >= hits[i - 1][0] && h[1] >= hits[i - 1][1])),
  );
  return ok ? { points, hits: hits as [number, number][] } : null;
}

export type ParcoursThrow = {
  /** In der richtigen Tonne gelandet. */
  correct: boolean;
  /** Pflicht-Hindernis der eigenen Spur geschafft (Reifen, Loch, Trampolin …). */
  trick: boolean;
  /** Ohne jede Berührung hinein (Swish). */
  clean: boolean;
};

/** Punkte für einen Wurf: falsche Tonne 0 · richtig 1 · richtig mit Trick 3 ·
 *  Swish +1 (nur zusammen mit dem Trick – ein glatter Wurf ohne Trick bleibt 1). */
export function parcoursPoints({ correct, trick, clean }: ParcoursThrow): number {
  if (!correct) return 0;
  if (!trick) return 1;
  return clean ? 4 : 3;
}
