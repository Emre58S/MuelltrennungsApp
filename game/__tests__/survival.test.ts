// Tests für Survival (game/survival.ts): Tempo steigt bis zum Höchsttempo,
// Übungs-Ghost scheidet schlagbar aus, Wertung nach Treffern.

import { describe, expect, test } from "@jest/globals";

import { makeRun } from "../ghost";
import { sprintQueue } from "../sprint";
import {
  itemLimit,
  practiceSurvival,
  SURVIVAL_MAX_MS,
  SURVIVAL_MIN_MS,
  SURVIVAL_RAMP_MS,
  SURVIVAL_START_MS,
  survivalResult,
  survivalRun,
} from "../survival";

describe("Tempo", () => {
  test("startet ruhig, wird schneller, bleibt dann beim Höchsttempo", () => {
    expect(itemLimit(0)).toBe(SURVIVAL_START_MS);
    expect(itemLimit(SURVIVAL_RAMP_MS / 2)).toBeLessThan(SURVIVAL_START_MS);
    expect(itemLimit(SURVIVAL_RAMP_MS / 2)).toBeGreaterThan(SURVIVAL_MIN_MS);
    expect(itemLimit(SURVIVAL_RAMP_MS)).toBe(SURVIVAL_MIN_MS);
    expect(itemLimit(SURVIVAL_MAX_MS)).toBe(SURVIVAL_MIN_MS);
  });
});

describe("Strecke", () => {
  test("Survival hat eine andere Reihenfolge als der Sprint", () => {
    const pool = Array.from({ length: 12 }, (_, i) => `item${i}`);
    expect(sprintQueue(pool, "2026-11-02", 60, "survival")).not.toEqual(sprintQueue(pool, "2026-11-02"));
  });
});

describe("Übungs-Ghost", () => {
  test("wirft rechtzeitig, liegt beim 10. oder 11. daneben", () => {
    for (const day of ["2026-11-01", "2026-11-02", "2026-11-03"]) {
      const bins = Array.from({ length: 60 }, (_, i) => i % 3);
      const run = practiceSurvival(day, bins, 3);
      expect([9, 10]).toContain(run.correct);
      expect(run.throws[run.throws.length - 1].correct).toBe(false);
      expect(run.ms).toBe(run.throws[run.throws.length - 1].ms);
      let prev = 0;
      for (const t of run.throws) {
        expect(t.ms - prev).toBeLessThan(itemLimit(prev));
        expect(t.correct).toBe(t.bin === bins[t.i]);
        prev = t.ms;
      }
    }
  });
});

describe("Wertung", () => {
  test("Ausscheiden zählt als Zeit, höchstens bis zum Schluss", () => {
    const throws = [{ i: 0, ms: 1500, bin: 0, correct: true }];
    expect(survivalRun("d", throws, 4000).ms).toBe(4000);
    expect(survivalRun("d", throws, SURVIVAL_MAX_MS + 500).ms).toBe(SURVIVAL_MAX_MS);
  });

  test("mehr richtig gewinnt, gleich viele = Gleichstand", () => {
    const run = (n: number) =>
      makeRun(
        "d",
        Array.from({ length: n }, (_, i) => ({ i, ms: (i + 1) * 1000, bin: 0, correct: true })),
      );
    expect(survivalResult(run(6), run(5))).toBe("win");
    expect(survivalResult(run(5), run(6))).toBe("lose");
    expect(survivalResult(run(5), run(5))).toBe("draw");
  });
});
