// Tests für die Tagesmissionen (game/missions.ts).

import { describe, expect, test } from "@jest/globals";

import {
  addMissionCounts,
  dailyMissions,
  EMPTY_COUNTS,
  missionDayFor,
  missionProgress,
} from "@/game/missions";

describe("Tagesmissionen", () => {
  test("3 Missionen, Tonne nur aus den bekannten, immer eine Station", () => {
    for (let d = 1; d <= 28; d++) {
      const date = `2026-11-${String(d).padStart(2, "0")}`;
      const ms = dailyMissions(date, ["papier", "rest"]);
      expect(ms).toHaveLength(3);
      expect(["papier", "rest"]).toContain(ms[0].bin);
      expect(ms[2].kind).toBe("station");
      expect(new Set(ms.map((m) => m.id)).size).toBe(3);
    }
  });

  test("gleicher Tag → gleiche Missionen, alle Arten kommen vor", () => {
    expect(dailyMissions("2026-11-02", ["bio", "gelb", "rest"])).toEqual(
      dailyMissions("2026-11-02", ["bio", "gelb", "rest"]),
    );
    const kinds = new Set(
      Array.from({ length: 10 }, (_, i) => dailyMissions(`2026-12-1${i}`, ["rest"])[1].kind),
    );
    expect(kinds).toEqual(new Set(["streak", "correct", "online"]));
  });

  test("Tag bleibt bis Mitternacht, danach neu", () => {
    const day = missionDayFor(null, "2026-11-02", ["papier"]);
    expect(missionDayFor(day, "2026-11-02", ["glas"])).toBe(day);
    const next = missionDayFor(day, "2026-11-03", ["papier"]);
    expect(next.date).toBe("2026-11-03");
    expect(next.counts).toEqual(EMPTY_COUNTS);
  });

  test("Fortschritt zählt, Mission wird genau einmal geschafft", () => {
    const day = missionDayFor(null, "2026-11-02", ["papier"]);
    const a = addMissionCounts(day, { bins: { papier: 3 }, correct: 3, maxStreak: 3, stations: 0 });
    expect(a.newlyDone).toHaveLength(0);
    expect(missionProgress(day.missions[0], a.day.counts)).toBe(3);
    const b = addMissionCounts(a.day, { bins: { papier: 4 }, correct: 4, maxStreak: 2, stations: 1 });
    expect(b.newlyDone.map((m) => m.id)).toEqual(["bin-papier", "station"]);
    expect(missionProgress(day.missions[0], b.day.counts)).toBe(5);
    expect(b.day.counts.maxStreak).toBe(3);
    const c = addMissionCounts(b.day, { bins: { papier: 9 }, correct: 20, maxStreak: 9, stations: 1, online: 1 });
    expect(c.newlyDone.map((m) => m.id)).toEqual([day.missions[1].id]);
    expect(c.day.done).toHaveLength(3);
  });
});
