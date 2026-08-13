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
} as const;

type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

// ── Helpers ───────────────────────────────────────────────────────────
export async function getItem(key: StorageKey): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`[Storage] Fehler beim Lesen von "${key}":`, error);
    return null;
  }
}

export async function setItem(key: StorageKey, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
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
  } catch (error) {
    console.warn(`[Storage] Fehler beim Löschen:`, error);
  }
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

export async function updateStreak(): Promise<{
  newCount: number;
  isNewDay: boolean;
}> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
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

// ── XP Helpers ────────────────────────────────────────────────────────
export function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

export async function addXP(
  amount: number,
): Promise<{ totalXP: number; level: number; leveledUp: boolean }> {
  const currentXP = await getNumber(StorageKeys.TOTAL_XP);
  const currentLevel = await getNumber(StorageKeys.LEVEL);
  const level = currentLevel || 1;

  const newXP = currentXP + amount;
  await setNumber(StorageKeys.TOTAL_XP, newXP);

  // Check Level-Up
  const xpNeeded = getXPForLevel(level);
  if (newXP >= xpNeeded) {
    const newLevel = level + 1;
    await setNumber(StorageKeys.LEVEL, newLevel);
    return { totalXP: newXP, level: newLevel, leveledUp: true };
  }

  return { totalXP: newXP, level, leveledUp: false };
}

export function getLevelTitle(level: number): string {
  if (level >= 50) return "♻️ Umwelt-Legende";
  if (level >= 30) return "🌟 Recycling-Meister";
  if (level >= 20) return "🏆 Sortier-Experte";
  if (level >= 10) return "📦 Sortier-Profi";
  if (level >= 5) return "🌱 Müll-Kenner";
  return "🔰 Müll-Anfänger";
}
