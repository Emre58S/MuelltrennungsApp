// Tests für die Wurf-Eingabe (components/game/throw-input.ts): schnell
// wischen wirft normal nach Tempo, ruhig halten zeigt die Vorschau und wirft
// nach Wischlänge. Ausführen: npm test

import { describe, expect, test } from "@jest/globals";

import {
  beginThrow,
  createThrowInput,
  HOLD_MS,
  previewShot,
  releaseShot,
} from "@/components/game/throw-input";
import { IDEAL_FLICK } from "../logic";

const ctx = { full: 200, binAngles: [-30, 0, 30], binXs: [-1.3, 0, 1.3] };

describe("Wurf-Eingabe", () => {
  test("schneller Wisch: keine Vorschau, normale Weite in die Tonne", () => {
    const input = createThrowInput();
    beginThrow(input, 0);
    expect(previewShot(input, 80, 0, -60, -IDEAL_FLICK, ctx)).toBeNull();
    expect(releaseShot(input, 0, -90, -IDEAL_FLICK, ctx)?.binIndex).toBe(1);
  });

  test("Finger erst aufgelegt, dann schnell gewischt: trotzdem normaler Wurf", () => {
    const input = createThrowInput();
    beginThrow(input, 0);
    // Nach der Haltezeit, aber schon schnell unterwegs: keine Vorschau
    expect(previewShot(input, HOLD_MS + 200, 0, -40, -IDEAL_FLICK, ctx)).toBeNull();
    // Kurzer, schneller Wisch landet nicht zu kurz
    expect(releaseShot(input, 0, -70, -IDEAL_FLICK, ctx)?.binIndex).toBe(1);
  });

  test("ruhig gehalten: Vorschau, Loslassen wirft nach Wischlänge", () => {
    const input = createThrowInput();
    beginThrow(input, 0);
    const shown = previewShot(input, HOLD_MS + 50, 0, -100, -150, ctx);
    expect(shown).not.toBeNull();
    const thrown = releaseShot(input, 0, -100, -100, ctx);
    expect(thrown?.strength).toBeCloseTo(shown!.strength);
  });
});
