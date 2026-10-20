// Datei: utils/storage.ts — erweitert um Level-Berechnung, Highscore-, Streak- und Wurf-Speicherung
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Storage Keys ──────────────────────────────────────────────────────
export const StorageKeys = {
  SOUND_ENABLED: "muell_sound_enabled",
  HIGHSCORE_RUNDEN: "muell_highscore_runden",
  HIGHSCORE_ZEIT: "muell_highscore_zeit",
  HIGHSCORE_ENDLOS: "muell_highscore_endlos",
  STREAK_COUNT: "muell_streak_count",
  STREAK_LAST_DATE: "muell_streak_last_date",
  TOTAL_XP: "muell_total_xp",
  LEVEL: "muell_level",
  TOTAL_CORRECT: "muell_total_correct",
  TOTAL_PLAYED: "muell_total_played",
  HAS_SEEN_TUTORIAL: "muell_has_seen_tutorial",
  USER_NAME: "muell_user_name",
  THEME_MODE: "muell_theme_mode",
  LANGUAGE: "muell_language",
  LAST_MODE: "muell_last_mode",
  MODE_STATS: "muell_mode_stats",
  REDUCE_MOTION: "muell_reduce_motion",
} as const;

type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

// ── Helpers ───────────────────────────────────────────────────────────
export async function getItem(key: StorageKey): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error: unknown) {
    console.warn(`[Storage] Fehler beim Lesen von "${key}":`, error);
    return null;
  }
}

export async function setItem(key: StorageKey, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error: unknown) {
    console.warn(`[Storage] Fehler beim Schreiben von "${key}":`, error);
  }
}

export async function getNumber(key: StorageKey): Promise<number> {
  const value = await getItem(key);
  return value !== null ? parseInt(value, 10) || 0 : 0;
}

export async function setNumber(key: StorageKey, value: number): Promise<void> {
  await setItem(key, value.toString());
}

export async function getBoolean(
  key: StorageKey,
  defaultValue = true,
): Promise<boolean> {
  const value = await getItem(key);
  return value !== null ? value === "true" : defaultValue;
}

export async function setBoolean(
  key: StorageKey,
  value: boolean,
): Promise<void> {
  await setItem(key, value.toString());
}

export async function removeItems(keys: StorageKey[]): Promise<void> {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error: unknown) {
    console.warn(`[Storage] Fehler beim Löschen:`, error);
  }
}

// Schreibzugriffe laufen nacheinander, damit sich schnelle Würfe nicht überschreiben.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task);
  writeQueue = run.catch(() => undefined);
  return run;
}

// ── Highscore Helpers ─────────────────────────────────────────────────
export function getHighscoreKey(
  mode: "runden" | "zeit" | "endlos",
): StorageKey {
  const map: Record<string, StorageKey> = {
    runden: StorageKeys.HIGHSCORE_RUNDEN,
    zeit: StorageKeys.HIGHSCORE_ZEIT,
    endlos: StorageKeys.HIGHSCORE_ENDLOS,
  };
  return map[mode];
}

export async function getBestHighscore(): Promise<number> {
  const [runden, zeit, endlos] = await Promise.all([
    getNumber(StorageKeys.HIGHSCORE_RUNDEN),
    getNumber(StorageKeys.HIGHSCORE_ZEIT),
    getNumber(StorageKeys.HIGHSCORE_ENDLOS),
  ]);
  return Math.max(runden, zeit, endlos);
}

/** Speichert den Wert nur, wenn er besser ist. Gibt zurück, ob es ein neuer Bestwert war. */
export function saveHighscore(
  mode: "runden" | "zeit" | "endlos",
  score: number,
): Promise<boolean> {
  return enqueue(async () => {
    const key = getHighscoreKey(mode);
    const current = await getNumber(key);
    if (score > current) {
      await setNumber(key, score);
      return true;
    }
    return false;
  });
}

// ── Statistik pro Modus ───────────────────────────────────────────────

export type ModeKey = "endless" | "survival" | "time";

export type ModeStats = {
  games: number;
  bestStreak: number;
  bestCorrect: number;
  throws: number;
  correct: number;
};

export type ModeStatsMap = Record<ModeKey, ModeStats>;

const EMPTY_MODE_STATS: ModeStats = {
  games: 0,
  bestStreak: 0,
  bestCorrect: 0,
  throws: 0,
  correct: 0,
};

function emptyModeStatsMap(): ModeStatsMap {
  return {
    endless: { ...EMPTY_MODE_STATS },
    survival: { ...EMPTY_MODE_STATS },
    time: { ...EMPTY_MODE_STATS },
  };
}

export async function getModeStats(): Promise<ModeStatsMap> {
  const base = emptyModeStatsMap();
  const raw = await getItem(StorageKeys.MODE_STATS);
  if (!raw) return base;

  try {
    const parsed = JSON.parse(raw) as Partial<ModeStatsMap>;
    return {
      endless: { ...base.endless, ...parsed.endless },
      survival: { ...base.survival, ...parsed.survival },
      time: { ...base.time, ...parsed.time },
    };
  } catch {
    return base;
  }
}

/** Wird einmal pro beendeter Runde aufgerufen. */
export function recordRound(
  mode: ModeKey,
  round: { maxStreak: number; throws: number; correct: number },
): Promise<void> {
  return enqueue(async () => {
    const all = await getModeStats();
    const m = all[mode];

    all[mode] = {
      games: m.games + 1,
      bestStreak: Math.max(m.bestStreak, round.maxStreak),
      bestCorrect: Math.max(m.bestCorrect, round.correct),
      throws: m.throws + round.throws,
      correct: m.correct + round.correct,
    };

    await setItem(StorageKeys.MODE_STATS, JSON.stringify(all));
  });
}

// ── Streak Helpers ────────────────────────────────────────────────────
export async function getStreakData(): Promise<{
  count: number;
  lastDate: string | null;
}> {
  const [count, lastDate] = await Promise.all([
    getNumber(StorageKeys.STREAK_COUNT),
    getItem(StorageKeys.STREAK_LAST_DATE),
  ]);
  return { count, lastDate };
}

/** Streak für die Anzeige: 0, wenn weder heute noch gestern gespielt wurde. */
export async function getActiveStreak(): Promise<number> {
  const { count, lastDate } = await getStreakData();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  return lastDate === today || lastDate === yesterday ? count : 0;
}

export async function updateStreak(): Promise<{
  newCount: number;
  isNewDay: boolean;
}> {
  const today = new Date().toISOString().split("T")[0];
  const { count, lastDate } = await getStreakData();

  if (lastDate === today) {
    return { newCount: count, isNewDay: false };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const newCount = lastDate === yesterday ? count + 1 : 1;

  await Promise.all([
    setNumber(StorageKeys.STREAK_COUNT, newCount),
    setItem(StorageKeys.STREAK_LAST_DATE, today),
  ]);

  return { newCount, isNewDay: true };
}

// ── XP / Level Helpers ────────────────────────────────────────────────

/** XP, die für den Aufstieg von `level` auf `level + 1` nötig sind. */
export function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

/** Gesamt-XP, ab der `level` beginnt (Level 1 beginnt bei 0). */
export function getXPToReachLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += getXPForLevel(l);
  return total;
}

export function getLevelFromXP(totalXP: number): number {
  let xp = Math.max(totalXP, 0);
  let level = 1;
  let needed = getXPForLevel(level);

  while (xp >= needed && level < 999) {
    xp -= needed;
    level++;
    needed = getXPForLevel(level);
  }

  return level;
}

/** Alles, was die Startseite für die Fortschrittsanzeige braucht. */
export function getLevelProgress(totalXP: number) {
  const level = getLevelFromXP(totalXP);
  const levelStartXP = getXPToReachLevel(level);
  const range = getXPForLevel(level);
  const nextLevelXP = levelStartXP + range;
  const xpIntoLevel = Math.max(totalXP - levelStartXP, 0);

  return {
    level,
    levelStartXP,
    nextLevelXP,
    xpIntoLevel,
    progress: Math.min(xpIntoLevel / Math.max(range, 1), 1),
    xpRemaining: Math.max(nextLevelXP - totalXP, 0),
  };
}

export async function addXP(
  amount: number,
): Promise<{ totalXP: number; level: number; leveledUp: boolean }> {
  const currentXP = await getNumber(StorageKeys.TOTAL_XP);
  const oldLevel = getLevelFromXP(currentXP);

  const newXP = currentXP + Math.max(0, Math.round(amount));
  const level = getLevelFromXP(newXP);

  await Promise.all([
    setNumber(StorageKeys.TOTAL_XP, newXP),
    setNumber(StorageKeys.LEVEL, level),
  ]);

  return { totalXP: newXP, level, leveledUp: level > oldLevel };
}

export function getLevelTitle(level: number): string {
  if (level >= 50) return "♻️ Umwelt-Legende";
  if (level >= 30) return "🌟 Recycling-Meister";
  if (level >= 20) return "🏆 Sortier-Experte";
  if (level >= 10) return "📦 Sortier-Profi";
  if (level >= 5) return "🌱 Müll-Kenner";
  return "🔰 Müll-Anfänger";
}

// ── Ergebnis eines Wurfs speichern ────────────────────────────────────

/**
 * Wird nach jedem Wurf aufgerufen: Streak aktualisieren, Statistik zählen, XP vergeben.
 */
export function recordThrow(params: {
  correct: boolean;
  xp: number;
}): Promise<{ totalXP: number; level: number; leveledUp: boolean }> {
  return enqueue(async () => {
    await updateStreak();

    const [played, correct] = await Promise.all([
      getNumber(StorageKeys.TOTAL_PLAYED),
      getNumber(StorageKeys.TOTAL_CORRECT),
    ]);

    await Promise.all([
      setNumber(StorageKeys.TOTAL_PLAYED, played + 1),
      setNumber(StorageKeys.TOTAL_CORRECT, correct + (params.correct ? 1 : 0)),
    ]);

    return addXP(params.xp);
  });
}
