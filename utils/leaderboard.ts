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

/** Verbindung steht, aber die SQL-Funktion fehlt noch (Datei in supabase/ nicht
 *  ausgeführt) – der Server antwortet dann mit 404. */
export const isMissingOnServer = (e: unknown): boolean => (e as { status?: unknown } | null)?.status === 404;

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
    // Fehlertext des Servers mitgeben (z. B. „unbekannter Code“ aus supabase/freunde.sql)
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw Object.assign(new Error(`Rangliste: ${res.status}`), { status: res.status, detail });
    }
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

/* ── Zufallsgegner für Zeit-Sprint und Survival (supabase/online.sql) ── */

export type OnlineMode = "sprint" | "survival";
export type OnlineRun = { name: string; code: string; correct: number; ms: number };

/** Zuletzt gestarteter Versand – die Rangliste wartet darauf, damit der eben
 *  gespielte Lauf schon drinsteht (schlägt nie fehl). */
let onlineSending: Promise<void> = Promise.resolve();

/** Fertigen Lauf einreichen (der Server behält je Tag den besten). Still, wenn
 *  offline oder nicht eingerichtet. */
export function submitOnlineRun(mode: OnlineMode, day: string, code: string, correct: number, ms: number): Promise<void> {
  if (!leaderboardReady || correct < 1) return Promise.resolve();
  onlineSending = (async () => {
    try {
      const player = await getPlayer();
      await rpc("set_name", { p_player: player.id, p_name: player.name });
      await rpc("submit_online_run", {
        p_player: player.id,
        p_mode: mode,
        p_day: day,
        p_code: code,
        p_correct: correct,
        p_ms: Math.round(ms),
      });
    } catch {
      // Kein Netz oder SQL noch nicht eingerichtet – dann eben ohne
    }
  })();
  return onlineSending;
}

/** Lauf eines anderen Spielers von heute mit ähnlich vielen Treffern (oder null). */
export async function fetchRandomRun(mode: OnlineMode, day: string, correct: number): Promise<OnlineRun | null> {
  if (!leaderboardReady) return null;
  try {
    const player = await getPlayer();
    const rows = await rpc<OnlineRun[]>("random_online_run", {
      p_mode: mode,
      p_day: day,
      p_player: player.id,
      p_correct: correct,
    });
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Montag der Woche zu einem Tag (JJJJ-MM-TT) – Beginn der Wochen-Rangliste. */
export function weekStart(day = todayKey()): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Rangliste eines Online-Modus (bester Lauf je Spieler, „richtig“ zählt):
 *  diese Woche oder Allzeit, dazu der eigene Platz. */
export async function fetchOnlineBoard(mode: OnlineMode, span: "week" | "all", limit = 50): Promise<BoardResult> {
  // Höchstens 3 s auf den eigenen Lauf warten – bei schlechtem Netz trotzdem laden
  await Promise.race([onlineSending, new Promise((done) => setTimeout(done, 3000))]);
  const player = await getPlayer();
  const since = span === "week" ? weekStart() : null;
  const [rows, mine] = await Promise.all([
    rpc<{ rank: number; name: string; score: number; is_me: boolean }[]>("online_top", {
      p_mode: mode,
      p_since: since,
      p_player: player.id,
      p_limit: limit,
    }),
    rpc<{ rank: number; score: number }[]>("online_my_rank", { p_mode: mode, p_since: since, p_player: player.id }),
  ]);
  return {
    rows: (rows ?? []).map((r) => ({ rank: Number(r.rank), name: r.name, score: r.score, isMe: r.is_me })),
    me: mine?.[0] ? { rank: Number(mine[0].rank), score: mine[0].score } : null,
  };
}

/* ── Freunde (supabase/freunde.sql) ─────────────────────────── */

export type Friend = { name: string; code: string; sprint: number | null; survival: number | null };
export type FriendError = "invalid" | "unknown" | "self" | "full" | "friendFull" | "setup" | "network";

/** Freundes-Code aus einer Eingabe: 6 Zeichen ohne 0/O/1/I, Bindestrich und
 *  Leerzeichen egal, klein geschrieben geht auch (oder null). */
export function cleanFriendCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code) ? code : null;
}

/** Zum Anzeigen und Teilen: „K7QX2M“ → „K7Q-X2M“. */
export const formatFriendCode = (code: string): string => `${code.slice(0, 3)}-${code.slice(3)}`;

/** Grund eines Fehlers beim Hinzufügen (Texte aus add_friend in freunde.sql). */
function friendError(e: unknown): FriendError {
  if (isMissingOnServer(e)) return "setup";
  const detail = String((e as { detail?: unknown } | null)?.detail ?? "");
  if (detail.includes("unbekannter Code")) return "unknown";
  if (detail.includes("eigener Code")) return "self";
  if (detail.includes("zu viele Freunde")) return "full";
  if (detail.includes("Liste des Freundes voll")) return "friendFull";
  return "network";
}

let myFriendCode: string | null = null;

/** Eigener Freundes-Code (legt Spieler und Code beim ersten Mal an). */
export async function getFriendCode(): Promise<string> {
  if (myFriendCode) return myFriendCode;
  const player = await getPlayer();
  await rpc("set_name", { p_player: player.id, p_name: player.name });
  const code = await rpc<string>("my_friend_code", { p_player: player.id });
  if (!code) throw new Error("kein Code");
  myFriendCode = code;
  return code;
}

/** Freund per Code hinzufügen – beide sind danach befreundet. */
export async function addFriend(raw: string): Promise<{ name: string } | { error: FriendError }> {
  const code = cleanFriendCode(raw);
  if (!code) return { error: "invalid" };
  try {
    await getFriendCode();
    const player = await getPlayer();
    const name = await rpc<string>("add_friend", { p_player: player.id, p_code: code });
    return { name };
  } catch (e) {
    return { error: friendError(e) };
  }
}

export async function removeFriend(code: string): Promise<void> {
  const player = await getPlayer();
  await rpc("remove_friend", { p_player: player.id, p_code: code });
}

/** Freunde mit ihren besten Läufen dieser Woche (ab Montag). */
export async function fetchFriends(): Promise<Friend[]> {
  const player = await getPlayer();
  const rows = await rpc<Friend[]>("friend_list", { p_player: player.id, p_since: weekStart() });
  return rows ?? [];
}
