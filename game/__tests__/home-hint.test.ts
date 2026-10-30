// Tests für den einen Hinweis auf dem Startschirm (game/home-hint.ts): Vorrang-Regel.

import { describe, expect, test } from "@jest/globals";

import { homeHint, type HomeHintInput } from "@/game/home-hint";

const base: HomeHintInput = { totalXP: 100, flame: "ok", dailyDone: true, dayBest: null };

describe("homeHint", () => {
  test("Neue Spieler sehen immer, wie man startet", () => {
    expect(homeHint({ ...base, totalXP: 0, flame: "atRisk", dailyDone: false }).key).toBe("home.throwHint");
  });

  test("Flamme in Gefahr geht vor allem anderen", () => {
    const h = homeHint({ ...base, flame: "atRisk", dailyDone: false, dayBest: { name: "Emre", isMe: false } });
    expect(h.key).toBe("home.flameAtRisk");
  });

  test("Gerettete Flamme ohne Pfeil", () => {
    expect(homeHint({ ...base, flame: "rescued", dailyDone: false })).toEqual({ key: "home.flameRescued", arrow: false });
  });

  test("Offene Tagesaufgabe vor dem Tagesbesten", () => {
    expect(homeHint({ ...base, dailyDone: false, dayBest: { name: "Emre", isMe: false } }).key).toBe("home.hintDaily");
  });

  test("Tagesbester mit Name, oder man selbst", () => {
    expect(homeHint({ ...base, dayBest: { name: "Emre", isMe: false } })).toEqual({
      key: "home.hintDayBest",
      arrow: true,
      name: "Emre",
    });
    expect(homeHint({ ...base, dayBest: { name: "Ich", isMe: true } }).key).toBe("home.hintDayBestMe");
  });

  test("Lange Namen werden gekürzt", () => {
    const h = homeHint({ ...base, dayBest: { name: "Maximilian-Alexander", isMe: false } });
    expect(h.key === "home.hintDayBest" && h.name).toBe("Maximilian-…");
  });

  test("Sonst der Start-Hinweis", () => {
    expect(homeHint(base).key).toBe("home.throwHint");
  });
});
