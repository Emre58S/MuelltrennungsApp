// Datei: components/game/round-hooks.ts
//
// Hilfs-Hooks der Spielrunde: verzögerte Aufrufe, die beim Abbau der Runde
// verworfen werden, und das einmalige Speichern der Runde (inklusive
// Rangliste, utils/leaderboard.ts).
import { type GameMode } from "@/constants/modes";
import { type Station, stationStars } from "@/game/campaign";
import { type Stats } from "@/game/logic";
import { type Board, dailyBoard, submitScore } from "@/utils/leaderboard";
import {
  flushThrowRecords,
  queueStationMission,
  recordRound,
  saveCampaignStars,
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
  aim: "zielwurf",
} as const;

/** Rangliste je Modus (Üben/Endlos hat keine). */
// Zeit/Ohne Fehler gibt es mit Rangliste nur noch online (Sprint/Survival, ROADMAP R4f)
const BOARD: Partial<Record<GameMode, Board>> = { aim: "zielwurf" };

/** Rangliste einer Runde (Tagesaufgabe: die von heute) – oder keine. */
export function boardFor(mode: GameMode, daily: boolean): Board | undefined {
  return daily ? dailyBoard("tagesaufgabe") : BOARD[mode];
}

/** Lernkarte nach Fehlwurf: mit Begründung bleibt sie länger stehen (zum Lesen). */
export const learnCardMs = (withReason: boolean) => (withReason ? 2300 : 1800);
/** Endet die Runde mit einem Fehlwurf, erst kurz nach der Lernkarte. */
export const learnEndMs = (withReason: boolean) => (withReason ? 2600 : 1900);

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
  station?: Station,
) {
  const saved = useRef(false);
  const latest = useRef({ mode, daily, station });
  useLayoutEffect(() => {
    latest.current = { mode, daily, station };
  });
  const commit = useCallback(() => {
    if (saved.current) return;
    const s = liveStats.current;
    const { mode: m, daily: d, station: st } = latest.current;
    if (s.throws === 0) return;
    saved.current = true;
    if (st) {
      // Station: Sterne (nur mehr zählen) + Statistik; kein Punkte-Rekord
      const won = stationStars(st, s);
      saveCampaignStars(st.id, won).catch(() => undefined);
      if (won >= 1) queueStationMission();
      recordRound(m, { maxStreak: s.maxStreak, throws: s.throws, correct: s.correct }).catch(
        () => undefined,
      );
      flushThrowRecords().catch(() => undefined);
      return;
    }
    if (d) {
      saveDaily({
        date: todayKey(),
        score: s.score,
        correct: s.correct,
        total: s.throws,
      }).catch(() => undefined);
      // Tagesaufgabe: für alle gleich → eigene Tages-Rangliste
      submitScore(boardFor(m, true)!, s.score).catch(() => undefined);
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
    const board = boardFor(m, false);
    if (board) submitScore(board, s.score).catch(() => undefined);
    flushThrowRecords().catch(() => undefined);
  }, [liveStats]);
  useEffect(() => commit, [commit]);
  return commit;
}
