/**
 * Tages-Flamme (🔥 Tage in Folge) mit Rettung: Einen ausgelassenen Tag
 * verzeiht die Flamme einmal pro Woche. Tage sind lokale Datums-Schlüssel
 * „JJJJ-MM-TT“ (storage.ts todayKey).
 */

/** Rettung höchstens alle 7 Tage. */
export const RESCUE_EVERY_DAYS = 7;

export type StreakData = { count: number; lastDate: string | null; lastRescue: string | null };

/** ok: läuft · atRisk: gestern ausgelassen, heute spielen rettet sie ·
 *  rescued: heute gerettet · none: keine Flamme */
export type FlameStatus = "ok" | "atRisk" | "rescued" | "none";

/** Ganze Tage von a bis b (NaN bei unlesbarem Datum). */
export function dayDiff(a: string, b: string): number {
  const ms = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(b) - ms(a)) / 86400000);
}

function canRescue(lastRescue: string | null, today: string): boolean {
  return !lastRescue || !(dayDiff(lastRescue, today) < RESCUE_EVERY_DAYS);
}

/** Flamme für die Anzeige (ohne zu speichern). */
export function flameState({ count, lastDate, lastRescue }: StreakData, today: string): { count: number; status: FlameStatus } {
  if (!lastDate || count <= 0) return { count: 0, status: "none" };
  const d = dayDiff(lastDate, today);
  if (d <= 0) return { count, status: lastRescue === today ? "rescued" : "ok" };
  if (d === 1) return { count, status: "ok" };
  if (d === 2 && canRescue(lastRescue, today)) return { count, status: "atRisk" };
  return { count: 0, status: "none" };
}

/** Neuer Stand nach einem Spiel heute (rescued: Rettung wurde gerade verbraucht). */
export function nextStreak({ count, lastDate, lastRescue }: StreakData, today: string): StreakData & { rescued: boolean } {
  const d = lastDate ? dayDiff(lastDate, today) : NaN;
  if (d <= 0) return { count, lastDate, lastRescue, rescued: false }; // heute schon (oder Uhr zurückgestellt)
  if (d === 1) return { count: count + 1, lastDate: today, lastRescue, rescued: false };
  if (d === 2 && count > 0 && canRescue(lastRescue, today)) {
    return { count: count + 1, lastDate: today, lastRescue: today, rescued: true };
  }
  return { count: 1, lastDate: today, lastRescue, rescued: false };
}
