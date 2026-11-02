// Tests für den Zeit-Sprint (game/sprint.ts): gleiche Strecke für alle,
// nur 30 s zählen, Übungs-Ghost schlagbar, Wertung nach Treffern.

import { describe, expect, test } from "@jest/globals";

import { makeRun } from "../ghost";
import {
  decodeSprint,
  encodeSprint,
  parseSprint,
  practiceSprint,
  SPRINT_ITEMS,
  SPRINT_MS,
  sprintQueue,
  sprintResult,
  sprintRun,
} from "../sprint";

const pool = Array.from({ length: 12 }, (_, i) => `item${i}`);

describe("Strecke", () => {
  test("für alle gleich, täglich anders, lang genug", () => {
    const a = sprintQueue(pool, "2026-11-02");
    expect(a).toEqual(sprintQueue(pool, "2026-11-02"));
    expect(a).toHaveLength(SPRINT_ITEMS);
    expect(sprintQueue(pool, "2026-11-03")).not.toEqual(a);
  });

  test("nie zweimal derselbe Gegenstand direkt nacheinander", () => {
    for (const day of ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]) {
      const a = sprintQueue(pool.slice(0, 3), day);
      for (let i = 1; i < a.length; i++) expect(a[i]).not.toBe(a[i - 1]);
    }
  });

  test("leerer Vorrat → leere Strecke", () => {
    expect(sprintQueue([], "2026-11-02")).toEqual([]);
  });
});

describe("Wertung", () => {
  test("Würfe nach 30 s zählen nicht", () => {
    const run = sprintRun("d", [
      { i: 0, ms: 1000, bin: 0, correct: true },
      { i: 1, ms: SPRINT_MS + 1, bin: 0, correct: true },
    ]);
    expect(run.correct).toBe(1);
    expect(run.throws).toHaveLength(1);
  });

  test("mehr richtig gewinnt, gleich viele = Gleichstand", () => {
    const run = (n: number, step: number) =>
      makeRun(
        "d",
        Array.from({ length: n }, (_, i) => ({ i, ms: (i + 1) * step, bin: 0, correct: true })),
      );
    expect(sprintResult(run(5, 3000), run(4, 1000))).toBe("win");
    expect(sprintResult(run(4, 1000), run(5, 3000))).toBe("lose");
    expect(sprintResult(run(4, 1000), run(4, 3000))).toBe("draw");
  });
});

describe("Übungs-Ghost", () => {
  test("bleibt in 30 s, macht Fehler, ist schlagbar", () => {
    const bins = Array.from({ length: SPRINT_ITEMS }, (_, i) => i % 3);
    const run = practiceSprint("2026-11-02", bins, 3);
    expect(run.ms).toBeLessThanOrEqual(SPRINT_MS);
    expect(run.correct).toBeGreaterThanOrEqual(7);
    expect(run.correct).toBeLessThanOrEqual(11);
    expect(run.throws.some((t) => !t.correct)).toBe(true);
    for (const t of run.throws) expect(t.correct).toBe(t.bin === bins[t.i]);
  });
});

describe("Speichern", () => {
  test("nur gültige Läufe von heute", () => {
    const run = makeRun("2026-11-02", [{ i: 0, ms: 900, bin: 1, correct: true }]);
    expect(parseSprint(JSON.stringify(run), "2026-11-02")).toEqual(run);
    expect(parseSprint(JSON.stringify(run), "2026-11-03")).toBeNull();
    expect(parseSprint("kaputt", "2026-11-02")).toBeNull();
    expect(parseSprint(null, "2026-11-02")).toBeNull();
  });
});

describe("Code für Zufallsgegner", () => {
  const bins = Array.from({ length: SPRINT_ITEMS }, (_, i) => i % 3);

  test("hin und zurück: gleiche Tonnen, Zeiten auf 0,1 s, richtig neu gerechnet", () => {
    const run = practiceSprint("2026-11-02", bins, 3);
    const back = decodeSprint(encodeSprint(run), bins, 3);
    expect(back).not.toBeNull();
    expect(back!.map((t) => t.bin)).toEqual(run.throws.map((t) => t.bin));
    expect(back!.map((t) => t.correct)).toEqual(run.throws.map((t) => t.correct));
    back!.forEach((t, k) => expect(Math.abs(t.ms - run.throws[k].ms)).toBeLessThanOrEqual(50));
  });

  test("kaputte oder unpassende Codes werden abgelehnt", () => {
    expect(decodeSprint("", bins, 3)).toBeNull();
    expect(decodeSprint("0a", bins, 3)).toBeNull();
    expect(decodeSprint("0A1", bins, 3)).toBeNull();
    expect(decodeSprint("30a", bins, 3)).toBeNull();
    expect(decodeSprint("00a".repeat(101), bins, 3)).toBeNull();
  });

  test("mehr Würfe als die Strecke lang ist: beginnt von vorn", () => {
    const back = decodeSprint("101".repeat(5), [0, 1], 3);
    expect(back!.map((t) => t.correct)).toEqual([false, true, false, true, false]);
  });
});
