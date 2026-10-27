// Tests für den Combo-Balken (game/logic.ts → comboProgress) und das Gewicht
// der Gegenstände (game/item-mass.ts). Ausführen: npm test

import { describe, expect, test } from "@jest/globals";

import { ITEMS } from "@/constants/items";

import { itemMass, MASS_FEEL } from "../item-mass";
import { comboProgress } from "../logic";

describe("Combo", () => {
  test("Balken füllt sich bis zum nächsten Multiplikator", () => {
    expect(comboProgress(0)).toEqual({ multiplier: 1, next: 1.5, progress: 0 });
    expect(comboProgress(2).progress).toBeCloseTo(2 / 3);
    expect(comboProgress(3)).toEqual({ multiplier: 1.5, next: 2, progress: 0 });
    expect(comboProgress(4).progress).toBeCloseTo(0.5);
    expect(comboProgress(7)).toMatchObject({ multiplier: 2, next: 3 });
  });

  test("ganz oben: Balken zählt bis zum nächsten Fieber", () => {
    expect(comboProgress(10)).toMatchObject({ multiplier: 3, next: null, progress: 0 });
    expect(comboProgress(15).progress).toBeCloseTo(0.5);
  });
});

describe("Gewicht", () => {
  test("Glas ist schwer, Papier und Folien leicht, sonst normal", () => {
    expect(itemMass({ name: "Weinflasche", category: "Glas" })).toBe("schwer");
    expect(itemMass({ name: "Zeitung", category: "Papier" })).toBe("leicht");
    expect(itemMass({ name: "Plastiktüte", category: "Gelber Sack" })).toBe("leicht");
    expect(itemMass({ name: "Apfelrest", category: "Biomüll" })).toBe("normal");
  });

  test("genug schwere und leichte Gegenstände für Abwechslung", () => {
    expect(ITEMS.filter((i) => itemMass(i) === "schwer").length).toBeGreaterThan(10);
    expect(ITEMS.filter((i) => itemMass(i) === "leicht").length).toBeGreaterThan(10);
  });

  test("schwer fliegt flacher und treibt weniger, leicht umgekehrt", () => {
    expect(MASS_FEEL.schwer.loft).toBeLessThan(MASS_FEEL.normal.loft);
    expect(MASS_FEEL.leicht.loft).toBeGreaterThan(MASS_FEEL.normal.loft);
    expect(MASS_FEEL.schwer.drift).toBeLessThan(MASS_FEEL.leicht.drift);
  });
});
