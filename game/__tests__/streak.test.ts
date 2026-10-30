// Tests für die Tages-Flamme (utils/streak.ts): Tage zählen, Rettung 1× pro Woche.
import { describe, expect, it } from "@jest/globals";

import { dayDiff, flameState, nextStreak } from "@/utils/streak";

const data = (count: number, lastDate: string | null, lastRescue: string | null = null) => ({
  count,
  lastDate,
  lastRescue,
});

describe("Tages-Flamme", () => {
  it("zählt Tage über Monats- und Jahresgrenzen", () => {
    expect(dayDiff("2026-10-31", "2026-11-01")).toBe(1);
    expect(dayDiff("2026-12-31", "2027-01-02")).toBe(2);
    expect(dayDiff("2026-03-28", "2026-03-30")).toBe(2); // Zeitumstellung
  });

  it("wächst am nächsten Tag und bleibt am selben Tag", () => {
    expect(nextStreak(data(4, "2026-10-29"), "2026-10-30")).toMatchObject({ count: 5, rescued: false });
    expect(nextStreak(data(4, "2026-10-30"), "2026-10-30")).toMatchObject({ count: 4, lastDate: "2026-10-30" });
    expect(nextStreak(data(0, null), "2026-10-30")).toMatchObject({ count: 1, lastDate: "2026-10-30" });
  });

  it("rettet einen ausgelassenen Tag einmal pro Woche", () => {
    const saved = nextStreak(data(4, "2026-10-28"), "2026-10-30");
    expect(saved).toMatchObject({ count: 5, lastRescue: "2026-10-30", rescued: true });
    // 6 Tage später geht es noch nicht wieder, nach 7 Tagen schon
    expect(nextStreak(data(9, "2026-11-03", "2026-10-30"), "2026-11-05")).toMatchObject({ count: 1, rescued: false });
    expect(nextStreak(data(9, "2026-11-04", "2026-10-30"), "2026-11-06")).toMatchObject({ count: 10, rescued: true });
  });

  it("zwei ausgelassene Tage beenden die Flamme", () => {
    expect(nextStreak(data(4, "2026-10-27"), "2026-10-30")).toMatchObject({ count: 1, rescued: false });
    expect(flameState(data(4, "2026-10-27"), "2026-10-30")).toEqual({ count: 0, status: "none" });
  });

  it("zeigt an, ob die Flamme läuft, gerettet werden kann oder gerettet wurde", () => {
    expect(flameState(data(4, "2026-10-29"), "2026-10-30")).toEqual({ count: 4, status: "ok" });
    expect(flameState(data(4, "2026-10-28"), "2026-10-30")).toEqual({ count: 4, status: "atRisk" });
    expect(flameState(data(4, "2026-10-28", "2026-10-25"), "2026-10-30")).toEqual({ count: 0, status: "none" });
    expect(flameState(data(5, "2026-10-30", "2026-10-30"), "2026-10-30")).toEqual({ count: 5, status: "rescued" });
  });
});
