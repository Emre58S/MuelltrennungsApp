// Jeder Gegenstand braucht sein Vorschaubild (constants/item-images.ts, erzeugt mit
// tools/item-shots.mjs). Kommt ein Gegenstand dazu oder ändert sich die Reihenfolge in
// constants/items.ts, schlägt dieser Test an – dann `node tools/item-shots.mjs` neu laufen lassen.
import { describe, expect, test } from "@jest/globals";

import { ITEMS } from "@/constants/items";
import { ITEM_IMAGES } from "@/constants/item-images";

describe("Vorschaubilder der Gegenstände", () => {
  test("jeder Gegenstand hat ein Bild, und es gibt keine überzähligen", () => {
    const names = ITEMS.map((i) => i.name);
    expect(names.filter((n) => !(n in ITEM_IMAGES))).toEqual([]);
    expect(Object.keys(ITEM_IMAGES).filter((n) => !names.includes(n))).toEqual([]);
  });

  test("Reihenfolge wie bei der Aufnahme (Dateinummer = Index in ITEMS)", () => {
    // Die Zuordnung steht im Quelltext als require("../assets/items/NN.jpg") in Aufnahme-Reihenfolge
    const keys = Object.keys(ITEM_IMAGES);
    expect(keys).toEqual(ITEMS.map((i) => i.name));
  });
});
