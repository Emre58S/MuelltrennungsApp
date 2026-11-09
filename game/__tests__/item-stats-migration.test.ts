// Umbenannte Gegenstände (ganze Früchte statt „…schalen“) behalten ihre Statistik.
import { describe, expect, test } from "@jest/globals";

import { migrateItemStats } from "@/game/item-stats-migration";

const stat = { correct: 3, wrong: 1, lastWrong: 5, streak: 2 };

describe("Statistik nach Umbenennung", () => {
  test("alter Name wird zum neuen, der alte verschwindet", () => {
    const out = migrateItemStats({ Karottenschalen: stat, Zwiebelschale: stat, Kartoffelschalen: stat });
    expect(out.Karotte).toEqual(stat);
    expect(out.Zwiebel).toEqual(stat);
    expect(out.Kartoffel).toEqual(stat);
    expect(out.Karottenschalen).toBeUndefined();
  });

  test("ein schon vorhandener neuer Eintrag wird nicht überschrieben", () => {
    const neu = { correct: 9, wrong: 0, lastWrong: 0, streak: 9 };
    const out = migrateItemStats({ Karottenschalen: stat, Karotte: neu });
    expect(out.Karotte).toEqual(neu);
    expect(out.Karottenschalen).toBeUndefined();
  });

  test("andere Gegenstände bleiben unberührt", () => {
    expect(migrateItemStats({ Bananenschale: stat })).toEqual({ Bananenschale: stat });
  });
});
