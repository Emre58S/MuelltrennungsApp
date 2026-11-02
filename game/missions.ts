// Datei: game/missions.ts — 3 Tagesmissionen (ROADMAP.md, R3a)
//
// Jeden Tag 3 kleine Aufgaben, für alle Runden gleich (Pfad, Freies Spiel,
// Modi, Tagesaufgabe): eine Tonne aus der aktuellen Welt (nur Bekanntes),
// reihum Serie, Menge oder eine Online-Runde, und eine Station im Pfad. Die Missionen
// stehen ab dem ersten Abruf des Tages fest; der Fortschritt zählt mit.
// Reine Logik – gespeichert wird in utils/storage.ts.

import { type BinKey } from "@/constants/theme";

export type MissionKind = "bin" | "streak" | "correct" | "online" | "station";

export type Mission = {
  id: string;
  kind: MissionKind;
  goal: number;
  /** Nur bei „bin“: welche Tonne. */
  bin?: BinKey;
};

/** Was seit Tagesbeginn gezählt wurde. */
export type MissionCounts = {
  /** Richtig sortiert je Tonne. */
  bins: Partial<Record<BinKey, number>>;
  correct: number;
  /** Längste Serie in einer Runde. */
  maxStreak: number;
  /** Stationen mit mindestens 1 Stern (auch nochmal gespielte). */
  stations: number;
  /** Fertig gespielte Online-Runden (Sprint/Survival); fehlt in älteren Ständen. */
  online?: number;
};

export type MissionDay = {
  date: string;
  missions: Mission[];
  counts: MissionCounts;
  /** Schon belohnte Missionen (id). */
  done: string[];
};

/** XP je geschaffter Mission. */
export const MISSION_XP = 30;

export const EMPTY_COUNTS: MissionCounts = { bins: {}, correct: 0, maxStreak: 0, stations: 0, online: 0 };

/** Kleine, feste Zahl aus dem Datum – alle Geräte bekommen am selben Tag dieselbe Wahl. */
function daySeed(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) h = (h * 31 + date.charCodeAt(i)) >>> 0;
  return h;
}

/** Die 3 Missionen eines Tages – nur mit Tonnen, die man schon kennt. */
export function dailyMissions(date: string, bins: BinKey[]): Mission[] {
  const seed = daySeed(date);
  const bin = bins.length > 0 ? bins[seed % bins.length] : "rest";
  const second: Mission =
    seed % 3 === 0
      ? { id: "streak", kind: "streak", goal: 6 }
      : seed % 3 === 1
        ? { id: "correct", kind: "correct", goal: 20 }
        : { id: "online", kind: "online", goal: 1 };
  return [
    { id: `bin-${bin}`, kind: "bin", goal: 5, bin },
    second,
    { id: "station", kind: "station", goal: 1 },
  ];
}

/** Erreichter Stand einer Mission (höchstens das Ziel). */
export function missionProgress(m: Mission, c: MissionCounts): number {
  const n =
    m.kind === "bin"
      ? (m.bin ? c.bins[m.bin] : 0) ?? 0
      : m.kind === "streak"
        ? c.maxStreak
        : m.kind === "correct"
          ? c.correct
          : m.kind === "online"
            ? (c.online ?? 0)
            : c.stations;
  return Math.min(n, m.goal);
}

/** Neuer Tag (oder anderer Tag gespeichert) → frische Missionen. */
export function missionDayFor(saved: MissionDay | null, date: string, bins: BinKey[]): MissionDay {
  if (saved && saved.date === date) return saved;
  return { date, missions: dailyMissions(date, bins), counts: EMPTY_COUNTS, done: [] };
}

/** Fortschritt dazurechnen; `newlyDone` sind die gerade geschafften Missionen. */
export function addMissionCounts(
  day: MissionDay,
  delta: MissionCounts,
): { day: MissionDay; newlyDone: Mission[] } {
  const bins = { ...day.counts.bins };
  for (const [key, n] of Object.entries(delta.bins) as [BinKey, number][]) {
    bins[key] = (bins[key] ?? 0) + n;
  }
  const counts: MissionCounts = {
    bins,
    correct: day.counts.correct + delta.correct,
    maxStreak: Math.max(day.counts.maxStreak, delta.maxStreak),
    stations: day.counts.stations + delta.stations,
    online: (day.counts.online ?? 0) + (delta.online ?? 0),
  };
  const newlyDone = day.missions.filter(
    (m) => !day.done.includes(m.id) && missionProgress(m, counts) >= m.goal,
  );
  return {
    day: { ...day, counts, done: [...day.done, ...newlyDone.map((m) => m.id)] },
    newlyDone,
  };
}
