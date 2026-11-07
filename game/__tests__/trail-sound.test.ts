// Jede Wurfspur (außer Standard) hat ihr eigenes Klangbild – keine zwei gleich, keine noteN in den
// Treffer-Schichten (die Treffer-Melodie gehört der Serie), nur leise Zusatzschichten.
import { describe, expect, test } from "@jest/globals";

import { TRAILS } from "@/game/rewards";
import { TRAIL_SOUND } from "@/game/trail-sound";

describe("Klangbild der Wurfspuren", () => {
  const ids = TRAILS.map((t) => t.id).filter((id) => id !== "standard");

  test("jede Spur außer Standard hat Töne, und es gibt keine unbekannten Einträge", () => {
    for (const id of ids) {
      const s = TRAIL_SOUND[id];
      expect(s).toBeDefined();
      expect((s?.throw?.length ?? 0) + (s?.hit?.length ?? 0)).toBeGreaterThan(0);
    }
    expect(Object.keys(TRAIL_SOUND).filter((k) => !ids.includes(k as never))).toEqual([]);
  });

  test("keine zwei Spuren klingen gleich", () => {
    const seen = new Set(ids.map((id) => JSON.stringify(TRAIL_SOUND[id])));
    expect(seen.size).toBe(ids.length);
  });

  test("Treffer-Schichten nutzen keine Serien-Noten, Lautstärke und Tempo bleiben im Rahmen", () => {
    for (const id of ids) {
      for (const phase of ["throw", "hit"] as const) {
        for (const [name, rate, volume, delay] of TRAIL_SOUND[id]?.[phase] ?? []) {
          if (phase === "hit") expect(name.startsWith("note")).toBe(false);
          expect(rate).toBeGreaterThanOrEqual(0.5);
          expect(rate).toBeLessThanOrEqual(2);
          expect(volume).toBeGreaterThan(0);
          expect(volume).toBeLessThanOrEqual(1.5);
          expect(delay ?? 0).toBeLessThanOrEqual(300);
        }
      }
    }
  });
});
