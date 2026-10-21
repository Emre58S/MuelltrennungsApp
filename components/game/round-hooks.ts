// Datei: components/game/round-hooks.ts
//
// Hilfs-Hooks der Spielrunde: verzögerte Aufrufe, die beim Abbau der Runde
// verworfen werden, und das einmalige Speichern der Runde.
import { type GameMode } from "@/constants/modes";
import { type Stats } from "@/game/logic";
import {
  flushThrowRecords,
  recordRound,
  saveDaily,
  saveHighscore,
  todayKey,
} from "@/utils/storage";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

/** Speicher-Schlüssel der Bestwerte pro Modus. */
export const HIGHSCORE_MODE = {
  endless: "endlos",
  survival: "runden",
  time: "zeit",
} as const;

/** Wie setTimeout, aber alle offenen Aufrufe fallen beim Abbau weg. */
export function useLater() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach(clearTimeout);
    };
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
}

/** Runde speichern (Statistik + Bestwert) – genau einmal, am Ende oder
 *  spätestens beim Verlassen. `liveStats` ist der synchrone Spielstand. */
export function useCommitRound(
  liveStats: RefObject<Stats>,
  mode: GameMode,
  daily: boolean,
) {
  const saved = useRef(false);
  const latest = useRef({ mode, daily });
  useLayoutEffect(() => {
    latest.current = { mode, daily };
  });
  const commit = useCallback(() => {
    if (saved.current) return;
    const s = liveStats.current;
    const { mode: m, daily: d } = latest.current;
    if (s.throws === 0) return;
    saved.current = true;
    if (d) {
      saveDaily({
        date: todayKey(),
        score: s.score,
        correct: s.correct,
        total: s.throws,
      }).catch(() => undefined);
      flushThrowRecords().catch(() => undefined);
      return;
    }
    recordRound(m, {
      maxStreak: s.maxStreak,
      throws: s.throws,
      correct: s.correct,
    }).catch(() => undefined);
    if (s.score > 0)
      saveHighscore(HIGHSCORE_MODE[m], s.score).catch(() => undefined);
    flushThrowRecords().catch(() => undefined);
  }, [liveStats]);
  useEffect(() => commit, [commit]);
  return commit;
}
