// Datei: game/ghost.ts
// Ghost-Rennen (1 gegen 1 nacheinander, wie ein Geister-Fahrer im Rennspiel):
// Jeden Tag gibt es eine feste Strecke aus 10 Gegenständen (für alle gleich,
// aus dem Datum gemischt). Dein bester Lauf von heute wird aufgezeichnet und
// fliegt beim nächsten Lauf als durchsichtiger Ghost zur selben Sekunde mit.
// Noch kein Lauf heute? Dann wirft ein Übungs-Ghost mit.
// Gewonnen hat, wer mehr richtig sortiert – bei Gleichstand der Schnellere.
// Ein Lauf ist nur eine kleine Liste von Würfen – so kann er später auch
// verschickt werden (Herausforderung per Code). Rein und ohne React
// (Tests: __tests__/ghost.test.ts).

import { hashString, seededRandom } from "./logic";

/** Gegenstände pro Lauf. */
export const GHOST_ITEMS = 10;

/** Ein Wurf im Lauf: Gegenstand (Index in der Strecke), Zeit ab Start (ms),
 *  gewählte Tonne und ob richtig. */
export type GhostThrow = { i: number; ms: number; bin: number; correct: boolean };

export type GhostRun = {
  /** Tag der Strecke (YYYY-MM-DD). */
  day: string;
  throws: GhostThrow[];
  correct: number;
  /** Zeit des letzten Wurfs (ms ab Start). */
  ms: number;
};

/** Startwert der Tages-Strecke. */
export function ghostSeed(day: string): number {
  return hashString(`ghost:${day}`);
}

/** Die Strecke des Tages: GHOST_ITEMS Gegenstände, für alle gleich gemischt. */
export function ghostQueue<T>(pool: T[], day: string): T[] {
  const rand = seededRandom(ghostSeed(day));
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, GHOST_ITEMS);
}

/** Lauf aus den Würfen zusammenfassen. */
export function makeRun(day: string, throws: GhostThrow[]): GhostRun {
  return {
    day,
    throws,
    correct: throws.filter((t) => t.correct).length,
    ms: throws.length ? throws[throws.length - 1].ms : 0,
  };
}

/** Übungs-Ghost: ruhiges Tempo (gut 2,5 s pro Wurf), zwei Fehler – schlagbar,
 *  aber nicht geschenkt. `correctBins` = richtige Tonne je Gegenstand. */
export function practiceRun(day: string, correctBins: number[], binCount: number): GhostRun {
  const rand = seededRandom(ghostSeed(day) ^ 0x9e3779b9);
  const wrong = new Set<number>();
  while (wrong.size < Math.min(2, correctBins.length)) wrong.add(Math.floor(rand() * correctBins.length));
  let ms = 0;
  const throws = correctBins.map((bin, i): GhostThrow => {
    ms += Math.round(2100 + rand() * 1000);
    const correct = !wrong.has(i);
    return { i, ms, bin: correct ? bin : (bin + 1) % binCount, correct };
  });
  return makeRun(day, throws);
}

/** Richtige Würfe bis zur Zeit `ms` (für den Live-Stand). */
export function scoreAt(run: GhostRun, ms: number): number {
  let n = 0;
  for (const t of run.throws) if (t.correct && t.ms <= ms) n += 1;
  return n;
}

/** Ist Lauf `a` besser als `b`? Mehr richtig – bei Gleichstand schneller. */
export function beats(a: GhostRun, b: GhostRun): boolean {
  return a.correct > b.correct || (a.correct === b.correct && a.ms < b.ms);
}

export type GhostResult = "win" | "lose" | "draw";

export function ghostResult(me: GhostRun, ghost: GhostRun): GhostResult {
  return beats(me, ghost) ? "win" : beats(ghost, me) ? "lose" : "draw";
}

/** Tauziehen: −1 … 1, positiv = der Ghost liegt vorn. */
export function ghostTug(me: number, ghost: number): number {
  return Math.max(-0.9, Math.min(0.9, (ghost - me) / 5));
}

/** Gespeicherten Lauf prüfen (nur ein gültiger Lauf von `day` wird Ghost). */
export function parseRun(raw: string | null, day: string): GhostRun | null {
  if (!raw) return null;
  try {
    const run = JSON.parse(raw) as GhostRun;
    if (run.day !== day || !Array.isArray(run.throws) || run.throws.length === 0) return null;
    return run;
  } catch {
    return null;
  }
}

/* ── Herausforderung per Code (ohne Server) ─────────────────────
 * Der ganze Lauf steckt im Code: „gh“ + Version + Tag + Strecken-Kennung +
 * je Wurf Tonne und Zeitabstand (in 0,1 s) + Prüfzeichen, dahinter optional
 * „.Name“. Die Strecken-Kennung erkennt verschiedene App-Stände (andere
 * Gegenstände → andere Strecke).
 * Beispiel: gh1a3207k1093… .Emre – der Freund fügt die ganze Nachricht ein,
 * der Code wird darin gefunden. Richtig/falsch rechnet das Spiel selbst nach. */

const CODE_VERSION = "2";
const DAY0 = Date.UTC(2026, 0, 1);
const DAY_MS = 86_400_000;
const B36 = "0123456789abcdefghijklmnopqrstuvwxyz";

function checksum(body: string): string {
  let sum = 0;
  for (let k = 0; k < body.length; k++) sum = (sum * 7 + B36.indexOf(body[k]) + k) % 36;
  return B36[sum];
}

const pad2 = (n: number) => n.toString(36).padStart(2, "0");

/** Kennung einer Strecke (2 Zeichen) aus den Namen ihrer Gegenstände. */
export function trackSign(names: string[]): string {
  return pad2(hashString(names.join("|")) % 1296);
}

/** Code für einen Lauf (`track` = trackSign der Strecke; Name optional,
 *  Leerzeichen werden zu „_“). */
export function encodeRun(run: GhostRun, track: string, name?: string | null): string {
  const [y, m, d] = run.day.split("-").map(Number);
  const dayNo = Math.round((Date.UTC(y, m - 1, d) - DAY0) / DAY_MS);
  let body = CODE_VERSION + pad2(Math.min(Math.max(dayNo, 0), 1295)) + track;
  let prev = 0;
  for (const t of run.throws.slice(0, GHOST_ITEMS)) {
    // Zeiten gerundet weiterzählen – so wächst kein Rundungsfehler an
    const at = Math.max(prev, Math.round(t.ms / 100));
    body += String(Math.min(Math.max(t.bin, 0), 9)) + pad2(Math.min(at - prev, 1295));
    prev = at;
  }
  const code = `gh${body}${checksum(body)}`;
  const clean = name?.trim().replace(/\s+/g, "_");
  return clean ? `${code}.${clean}` : code;
}

/** Aus dem Code gelesene Herausforderung: Tag, Strecken-Kennung, Name und je
 *  Wurf Tonne + Zeit. */
export type Challenge = {
  day: string;
  track: string;
  name: string | null;
  picks: { bin: number; ms: number }[];
};

/** Sucht einen gültigen Code im Text (auch mitten in einer Nachricht). */
export function decodeChallenge(text: string): Challenge | null {
  for (const m of text.matchAll(/gh([0-9a-z]{9,})(?:\.([\p{L}\p{N}_.-]{2,16}))?/giu)) {
    const raw = m[1].toLowerCase();
    const body = raw.slice(0, -1);
    if (body[0] !== CODE_VERSION || checksum(body) !== raw.slice(-1)) continue;
    const track = body.slice(3, 5);
    const rest = body.slice(5);
    if (rest.length % 3 !== 0 || rest.length / 3 > GHOST_ITEMS) continue;
    const date = new Date(DAY0 + parseInt(body.slice(1, 3), 36) * DAY_MS);
    const day = date.toISOString().slice(0, 10);
    const picks: Challenge["picks"] = [];
    let ms = 0;
    for (let k = 0; k < rest.length; k += 3) {
      ms += parseInt(rest.slice(k + 1, k + 3), 36) * 100;
      picks.push({ bin: Number(rest[k]), ms });
    }
    const name = m[2]?.replace(/_/g, " ").trim() || null;
    return { day, track, name, picks };
  }
  return null;
}

/** Gültiger Code, aber aus einem anderen App-Stand (andere Version)? */
export function isOtherVersionCode(text: string): boolean {
  for (const m of text.matchAll(/gh([0-9a-z]{7,})/giu)) {
    const raw = m[1].toLowerCase();
    const body = raw.slice(0, -1);
    if (body[0] !== CODE_VERSION && checksum(body) === raw.slice(-1)) return true;
  }
  return false;
}

/** Zeit auf 0,1 s wie im Code – so werten beide Handys einen Vergleich gleich
 *  (sonst könnte bei fast gleicher Zeit auf beiden Handys ein anderer Sieger stehen). */
export function roundRun(run: GhostRun): GhostRun {
  return { ...run, ms: Math.round(run.ms / 100) * 100 };
}

/** Lauf aus einer Herausforderung – richtig/falsch nach den Tonnen der Strecke.
 *  `null`, wenn eine Tonne nicht passt (z. B. Code aus einer anderen Version). */
export function challengeRun(ch: Challenge, correctBins: number[], binCount: number): GhostRun | null {
  if (ch.picks.length === 0 || ch.picks.length > correctBins.length) return null;
  if (ch.picks.some((p) => p.bin >= binCount)) return null;
  return makeRun(
    ch.day,
    ch.picks.map((p, i) => ({ i, ms: p.ms, bin: p.bin, correct: p.bin === correctBins[i] })),
  );
}
