// Datei: game/duel.ts
// Schnell-Duell (1 gegen 1 an einem Handy): Beide sehen denselben
// Gegenstand und wischen gleichzeitig – links Spieler 1, rechts Spieler 2.
// Wer zuerst richtig wirft, bekommt den Punkt. Wer falsch wirft, ist für
// diesen Gegenstand raus (der andere darf noch). Der letzte Gegenstand ist
// das Finale und zählt doppelt. Rein und ohne React (Tests: __tests__/duel.test.ts).

/** Gegenstände pro Duell (der letzte ist das Finale). */
export const DUEL_ITEMS = 10;
/** So lange (ms) bleibt ein Gegenstand, bevor er ungelöst weitergeht. */
export const DUEL_ITEM_MS = 7000;
/** Richtig, aber so knapp (ms) nach dem Sieger: „Fotofinish!“ */
export const PHOTO_FINISH_MS = 250;
/** Ab so vielen gewonnenen Gegenständen in Folge: „heiß“ (🔥). */
export const DUEL_HOT = 3;

export type Player = 0 | 1;

export type DuelPlayer = {
  points: number;
  correct: number;
  wrong: number;
  /** Schnellster richtiger Wurf (ms ab Erscheinen) – oder null. */
  fastest: number | null;
  /** Summe der Zeiten richtiger Würfe (für den Schnitt). */
  totalMs: number;
  /** Gegenstände in Folge gewonnen. */
  streak: number;
};

/** Ein gespielter Gegenstand fürs Ergebnis (Lernliste, Höhepunkte). */
export type DuelEntry = {
  item: string;
  winner: Player | null;
  /** Zeit des Siegers (ms) – oder null. */
  ms: number | null;
  /** Wer hier falsch geworfen hat. */
  wrong: Player[];
};

export type DuelState = {
  /** Aktueller Gegenstand (0 … DUEL_ITEMS − 1); DUEL_ITEMS = vorbei. */
  index: number;
  /** Ist dieser Spieler für den aktuellen Gegenstand raus? */
  out: [boolean, boolean];
  /** Gegenstand schon entschieden (gewonnen, beide falsch oder Zeit um)? */
  settled: boolean;
  /** Zeitpunkt des Siegs (ms) – für das Fotofinish. */
  wonAt: number | null;
  players: [DuelPlayer, DuelPlayer];
  log: DuelEntry[];
};

const freshPlayer = (): DuelPlayer => ({ points: 0, correct: 0, wrong: 0, fastest: null, totalMs: 0, streak: 0 });

export function createDuel(): DuelState {
  return { index: 0, out: [false, false], settled: false, wonAt: null, players: [freshPlayer(), freshPlayer()], log: [] };
}

/** Punkte für den Gegenstand Nr. `index` (Finale doppelt). */
export function pointsFor(index: number): number {
  return index === DUEL_ITEMS - 1 ? 2 : 1;
}

export function isFinale(index: number): boolean {
  return index === DUEL_ITEMS - 1;
}

export type ThrowOutcome =
  /** Erster richtiger Wurf: Punkt(e). */
  | "win"
  /** Richtig, aber der andere war schneller (knapp: Fotofinish). */
  | "late"
  | "photo"
  /** Falsch: für diesen Gegenstand raus. */
  | "wrong"
  /** Falsch – und der andere ist auch schon raus. */
  | "bothWrong"
  /** Zählt nicht (schon raus, entschieden oder vorbei). */
  | "ignored";

function patchPlayer(state: DuelState, p: Player, patch: Partial<DuelPlayer>): [DuelPlayer, DuelPlayer] {
  const players: [DuelPlayer, DuelPlayer] = [state.players[0], state.players[1]];
  players[p] = { ...players[p], ...patch };
  return players;
}

/**
 * Ein Wurf von Spieler `p`: `correct` = richtige Tonne, `ms` = Zeit seit
 * Erscheinen des Gegenstands, `now` = Uhrzeit (fürs Fotofinish).
 */
export function duelThrow(
  state: DuelState,
  p: Player,
  correct: boolean,
  ms: number,
  item: string,
  now = ms,
): { state: DuelState; outcome: ThrowOutcome } {
  if (state.index >= DUEL_ITEMS || state.out[p]) return { state, outcome: "ignored" };
  if (state.settled) {
    // Der Sieger selbst (zweiter Wisch) zählt nicht
    if (state.log[state.log.length - 1]?.winner === p) return { state, outcome: "ignored" };
    // Nach dem Sieg zählt nichts mehr – nur das knappe „Fotofinish“ zeigen
    if (correct && state.wonAt !== null && now - state.wonAt <= PHOTO_FINISH_MS) return { state, outcome: "photo" };
    return { state, outcome: correct ? "late" : "ignored" };
  }
  const me = state.players[p];
  if (correct) {
    const other = (1 - p) as Player;
    const players = patchPlayer(state, p, {
      points: me.points + pointsFor(state.index),
      correct: me.correct + 1,
      fastest: me.fastest === null ? ms : Math.min(me.fastest, ms),
      totalMs: me.totalMs + ms,
      streak: me.streak + 1,
    });
    players[other] = { ...players[other], streak: 0 };
    const wrong = state.out[other] ? [other] : [];
    return {
      state: { ...state, settled: true, wonAt: now, players, log: [...state.log, { item, winner: p, ms, wrong }] },
      outcome: "win",
    };
  }
  const out: [boolean, boolean] = [state.out[0], state.out[1]];
  out[p] = true;
  const players = patchPlayer(state, p, { wrong: me.wrong + 1, streak: 0 });
  if (out[0] && out[1]) {
    return {
      state: { ...state, out, settled: true, players, log: [...state.log, { item, winner: null, ms: null, wrong: [0, 1] }] },
      outcome: "bothWrong",
    };
  }
  return { state: { ...state, out, players }, outcome: "wrong" };
}

/** Zeit um: niemand bekommt den Punkt (Serien reißen nicht – keiner hat verloren). */
export function duelTimeout(state: DuelState, item: string): DuelState {
  if (state.settled || state.index >= DUEL_ITEMS) return state;
  const wrong = ([0, 1] as Player[]).filter((p) => state.out[p]);
  return { ...state, settled: true, log: [...state.log, { item, winner: null, ms: null, wrong }] };
}

/** Nächster Gegenstand. */
export function duelNext(state: DuelState): DuelState {
  return { ...state, index: state.index + 1, out: [false, false], settled: false, wonAt: null };
}

export function duelOver(state: DuelState): boolean {
  return state.index >= DUEL_ITEMS;
}

/** Sieger (null = unentschieden). */
export function duelWinner(state: DuelState): Player | null {
  const [a, b] = state.players;
  if (a.points === b.points) return null;
  return a.points > b.points ? 0 : 1;
}

/** Durchschnittliche Zeit richtiger Würfe (ms) – oder null. */
export function averageMs(p: DuelPlayer): number | null {
  return p.correct ? Math.round(p.totalMs / p.correct) : null;
}

/** Tauziehen: −1 (Spieler 1 vorn) … +1 (Spieler 2 vorn). Wird bei großem
 *  Abstand nie ganz voll, damit ein Comeback sichtbar möglich bleibt. */
export function tugOf(state: DuelState): number {
  const [a, b] = state.players;
  const diff = b.points - a.points;
  return Math.max(-0.9, Math.min(0.9, diff / 6));
}

/** Höhepunkt des Duells: der schnellste Treffer (wer, welcher Gegenstand, ms). */
export function fastestHit(state: DuelState): DuelEntry | null {
  let best: DuelEntry | null = null;
  for (const e of state.log) if (e.ms !== null && (best === null || e.ms < (best.ms ?? Infinity))) best = e;
  return best;
}

/** Gegenstände, bei denen jemand danebenlag (für die Lernliste, ohne Doppelte). */
export function mistakesOf(state: DuelState): string[] {
  const names: string[] = [];
  for (const e of state.log) if (e.wrong.length && !names.includes(e.item)) names.push(e.item);
  return names;
}
