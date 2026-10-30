// Datei: utils/leaderboard.ts
// Ranglisten (anonym, ohne Login) über Supabase: Spitzname + Punktzahl.
// Die Datenbank-Seite steht in supabase/rangliste.sql.
//
// Zugang über .env.local (wird nicht hochgeladen):
//   EXPO_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_… (oder alter „anon“-Schlüssel)
// Fehlt er, läuft alles weiter: Ergebnisse werden gemerkt und später
// nachgereicht, die Ranglisten-Seite zeigt einen Hinweis.

import { getItem, setItem, StorageKeys, todayKey } from "@/utils/storage";

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Ist die Online-Rangliste eingerichtet? */
export const leaderboardReady = !!URL && !!KEY;

export type FixedBoard = "zielwurf" | "zeit" | "runden";
export type Board = FixedBoard | `tagesaufgabe:${string}` | `tagestrick:${string}`;

export type BoardRow = { rank: number; name: string; score: number; isMe: boolean };
export type BoardResult = { rows: BoardRow[]; me: { rank: number; score: number } | null };

/** Heutige Tages-Bretter (für alle gleich, wechseln um Mitternacht). */
export const dailyBoard = (kind: "tagesaufgabe" | "tagestrick", date = todayKey()): Board =>
  `${kind}:${date}`;

/** Tages-Trick als eine Zahl: mehr Sterne zuerst, dann weniger Versuche. */
export function trickScore(stars: number, attempts: number): number {
  return stars * 100 - Math.min(Math.max(attempts, 1), 99);
}

export function decodeTrickScore(score: number): { stars: number; attempts: number } {
  const stars = Math.ceil(score / 100);
  return { stars, attempts: stars * 100 - score };
}

/** Spitzname bereinigen: 2–16 Zeichen, Buchstaben/Ziffern/Leerzeichen/_.- */
export function cleanName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 16) return null;
  return /^[\p{L}\p{N} _.-]+$/u.test(name) ? name : null;
}

/* ── Spieler (Geräte-ID + Spitzname) ─────────────────────────── */

function randomId(): string {
  // UUID v4 – zufällig genug, um nicht erraten zu werden
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export type Player = { id: string; name: string; named: boolean };

/** Eigener Spieler: ID wird beim ersten Mal erzeugt, Name ist bis zur Wahl
 *  „Spieler 1234“ (aus der ID). */
export async function getPlayer(): Promise<Player> {
  let id = await getItem(StorageKeys.PLAYER_ID);
  if (!id) {
    id = randomId();
    await setItem(StorageKeys.PLAYER_ID, id);
  }
  const name = await getItem(StorageKeys.PLAYER_NAME);
  return name
    ? { id, name, named: true }
    : { id, name: `Spieler ${parseInt(id.slice(0, 4), 16) % 10000}`, named: false };
}

/* ── Server ──────────────────────────────────────────────────── */

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!URL || !KEY) throw new Error("Rangliste nicht eingerichtet");
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 8000);
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      // Neue Schlüssel (sb_publishable_…) nur im apikey-Kopf – als „Bearer“ würden
      // sie als ungültiges JWT abgelehnt. Alte anon-Schlüssel (JWT) zusätzlich als Bearer.
      headers: {
        apikey: KEY,
        ...(KEY.startsWith("eyJ") ? { Authorization: `Bearer ${KEY}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: abort.signal,
    });
    if (!res.ok) throw new Error(`Rangliste: ${res.status}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Spitzname setzen (lokal sofort, online sobald möglich). */
export async function setPlayerName(raw: string): Promise<string | null> {
  const name = cleanName(raw);
  if (!name) return null;
  await setItem(StorageKeys.PLAYER_NAME, name);
  if (leaderboardReady) {
    const player = await getPlayer();
    await rpc("set_name", { p_player: player.id, p_name: name }).catch(() => undefined);
  }
  return name;
}

type Pending = { board: Board; score: number };

async function readPending(): Promise<Pending[]> {
  try {
    return JSON.parse((await getItem(StorageKeys.PENDING_SCORES)) ?? "[]") as Pending[];
  } catch {
    return [];
  }
}

let sending: Promise<void> | null = null;

/** Gemerkte Ergebnisse hochladen (der Reihe nach; was scheitert, bleibt). */
export function flushScores(): Promise<void> {
  if (!leaderboardReady) return Promise.resolve();
  sending ??= (async () => {
    try {
      const pending = await readPending();
      if (!pending.length) return;
      const player = await getPlayer();
      // Spieler (mit Namen) muss online existieren, bevor Ergebnisse zählen
      await rpc("set_name", { p_player: player.id, p_name: player.name });
      const left: Pending[] = [];
      for (const p of pending) {
        try {
          await rpc("submit_score", { p_player: player.id, p_board: p.board, p_score: p.score });
        } catch {
          left.push(p);
        }
      }
      await setItem(StorageKeys.PENDING_SCORES, JSON.stringify(left.slice(-50)));
    } catch {
      // Offline: beim nächsten Mal
    } finally {
      sending = null;
    }
  })();
  return sending;
}

/** Ergebnis einreichen: wird gemerkt und (falls möglich) gleich gesendet. */
export async function submitScore(board: Board, score: number): Promise<void> {
  if (!(score > 0)) return;
  const pending = await readPending();
  pending.push({ board, score: Math.round(score) });
  await setItem(StorageKeys.PENDING_SCORES, JSON.stringify(pending.slice(-50)));
  await flushScores();
}

/** Bestenliste eines Bretts (bester Wert je Spieler) und der eigene Platz. */
export async function fetchBoard(board: Board, limit = 50): Promise<BoardResult> {
  await flushScores();
  const player = await getPlayer();
  const [rows, mine] = await Promise.all([
    rpc<{ rank: number; name: string; score: number; is_me: boolean }[]>("top_scores", {
      p_board: board,
      p_player: player.id,
      p_limit: limit,
    }),
    rpc<{ rank: number; score: number }[]>("my_rank", { p_board: board, p_player: player.id }),
  ]);
  return {
    rows: (rows ?? []).map((r) => ({ rank: Number(r.rank), name: r.name, score: r.score, isMe: r.is_me })),
    me: mine?.[0] ? { rank: Number(mine[0].rank), score: mine[0].score } : null,
  };
}

/* ── Ghost des Tagesbesten (supabase/ghost.sql) ──────────────── */

export type DayGhost = { name: string; code: string; correct: number; ms: number; isMe: boolean };

/** Zuletzt erfolgreich gesendeter Ghost-Lauf (Tag + Code) – nicht bei jedem Öffnen neu senden. */
let sentGhost: string | null = null;

/** Eigenen besten Ghost-Lauf des Tages einreichen (der Server behält nur den
 *  besten je Spieler). Still, wenn offline oder nicht eingerichtet. */
export async function submitGhostRun(day: string, code: string, correct: number, ms: number): Promise<void> {
  if (!leaderboardReady) return;
  const key = `${day}:${code}`;
  if (sentGhost === key) return;
  try {
    const player = await getPlayer();
    await rpc("set_name", { p_player: player.id, p_name: player.name });
    await rpc("submit_ghost", { p_player: player.id, p_day: day, p_code: code, p_correct: correct, p_ms: Math.round(ms) });
    sentGhost = key;
  } catch {
    // Beim nächsten Rennen wird der beste Lauf erneut gesendet
  }
}

/** Bester Lauf des Tages (oder null: keiner, offline oder nicht eingerichtet). */
export async function fetchDayGhost(day: string): Promise<DayGhost | null> {
  if (!leaderboardReady) return null;
  try {
    const player = await getPlayer();
    const rows = await rpc<{ name: string; code: string; correct: number; ms: number; is_me: boolean }[]>(
      "top_ghost",
      { p_day: day, p_player: player.id },
    );
    const r = rows?.[0];
    return r ? { name: r.name, code: r.code, correct: r.correct, ms: r.ms, isMe: r.is_me } : null;
  } catch {
    return null;
  }
}
