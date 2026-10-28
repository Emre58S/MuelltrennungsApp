// Tests für die Belohnungen (game/rewards.ts). Ausführen: npm test

import { describe, expect, test } from "@jest/globals";

import {
  BIN_SKINS,
  isUnlocked,
  newlyUnlocked,
  totalStars,
  TRAILS,
  unlockMessageKey,
  usableSkin,
  usableTrail,
} from "../rewards";
import { TRICK_LEVELS } from "../trick-levels";

const trail = (id: string) => TRAILS.find((r) => r.id === id)!;

describe("Wurfspuren", () => {
  test("Standard ist immer frei, andere nach Sternen oder Level", () => {
    expect(isUnlocked(trail("standard"), { stars: 0, level: 0 })).toBe(true);
    expect(isUnlocked(trail("gold"), { stars: 4, level: 99 })).toBe(false);
    expect(isUnlocked(trail("gold"), { stars: 5, level: 0 })).toBe(true);
    expect(isUnlocked(trail("komet"), { stars: 99, level: 3 })).toBe(false);
    expect(isUnlocked(trail("komet"), { stars: 0, level: 4 })).toBe(true);
  });

  test("neu freigeschaltet wird nur, was die Grenze überschreitet", () => {
    expect(newlyUnlocked({ stars: 4, level: 1 }, { stars: 6, level: 1 }).map((r) => r.id)).toEqual(["gold"]);
    expect(newlyUnlocked({ stars: 6, level: 1 }, { stars: 7, level: 1 })).toEqual([]);
    expect(newlyUnlocked({ stars: 0, level: 3 }, { stars: 0, level: 4 }).map((r) => r.id)).toEqual(["komet"]);
  });

  test("gespeicherte Auswahl: gesperrt oder unbekannt → Standard", () => {
    expect(usableTrail("gold", { stars: 2, level: 0 })).toBe("standard");
    expect(usableTrail("quatsch", { stars: 99, level: 99 })).toBe("standard");
    expect(usableTrail(null, { stars: 99, level: 99 })).toBe("standard");
    expect(usableTrail("konfetti", { stars: 20, level: 0 })).toBe("konfetti");
  });

  test("alle Stern-Belohnungen sind mit den Leveln erreichbar", () => {
    const max = TRICK_LEVELS.length * 3;
    for (const r of TRAILS) if (r.stars !== undefined) expect(r.stars).toBeLessThanOrEqual(max);
    expect(totalStars({ 1: 3, 2: 2 })).toBe(5);
  });
});

describe("Tonnen-Sticker", () => {
  test("gesperrt oder unbekannt → ohne Sticker", () => {
    expect(usableSkin("stern", { stars: 2, level: 0 })).toBe("keiner");
    expect(usableSkin("quatsch", { stars: 99, level: 99 })).toBe("keiner");
    expect(usableSkin(null, { stars: 99, level: 99 })).toBe("keiner");
    expect(usableSkin("herz", { stars: 0, level: 5 })).toBe("herz");
  });

  test("Freischalten meldet auch Sticker – mit eigenem Text", () => {
    const got = newlyUnlocked({ stars: 7, level: 1 }, { stars: 8, level: 1 });
    expect(got.map((r) => r.id)).toEqual(["stern"]);
    expect(unlockMessageKey(got[0])).toBe("reward.newSticker");
    expect(newlyUnlocked({ stars: 0, level: 4 }, { stars: 0, level: 5 }).map((r) => r.id)).toEqual(["herz"]);
    expect(unlockMessageKey(TRAILS[1])).toBe("reward.new");
  });

  test("alle Sticker sind erreichbar", () => {
    const max = TRICK_LEVELS.length * 3;
    for (const r of BIN_SKINS) if (r.stars !== undefined) expect(r.stars).toBeLessThanOrEqual(max);
  });
});
