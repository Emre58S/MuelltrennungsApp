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

/** Höchstens so viele Treffer im Code (mehr schafft niemand in 30 s). */
const CODE_HITS = 100;

/** Lauf als kurzer Text für den Server (supabase/parcours.sql): je Treffer
 *  Punkte (1–4) + Zeitabstand in Zehntelsekunden (2 Zeichen, Basis 36). */
export function encodeParcours(run: ParcoursRun): string {
  let body = "";
  let prevAt = 0;
  let prevTotal = 0;
  for (const [ms, total] of run.hits.slice(0, CODE_HITS)) {
    const gained = Math.min(Math.max(total - prevTotal, 1), 4);
    const at = Math.max(prevAt, Math.round(ms / 100));
    body += String(gained) + Math.min(at - prevAt, 36 * 36 - 1).toString(36).padStart(2, "0");
    prevAt = at;
    prevTotal += gained;
  }
  return body;
}

/** Lauf aus einem Code (null, wenn der Code nicht passt). */
export function decodeParcours(code: string): ParcoursRun | null {
  if (!code || code.length > CODE_HITS * 3 || !/^([1-4][0-9a-z]{2})+$/.test(code)) return null;
  const hits: [number, number][] = [];
  let at = 0;
  let total = 0;
  for (let i = 0; i < code.length; i += 3) {
    total += Number(code[i]);
    at += parseInt(code.slice(i + 1, i + 3), 36);
    hits.push([at * 100, total]);
  }
  return { points: total, hits };
}

/** Dieselbe Prüfung wie der Server (supabase/parcours.sql): höchstens 31 s
 *  insgesamt und höchstens ein Treffer je halbe Sekunde. */
export function parcoursCodePlausible(code: string): boolean {
  const run = decodeParcours(code);
  if (!run) return false;
  const ds = Math.round((run.hits[run.hits.length - 1]?.[0] ?? 0) / 100);
  return ds <= 310 && run.hits.length <= 1 + Math.floor(ds / 5);
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
