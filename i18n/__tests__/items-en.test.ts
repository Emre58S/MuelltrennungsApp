// Jeder Gegenstand braucht einen englischen Namen – und einen englischen
// Fakt, wenn er einen deutschen hat. Ausführen: npm test

import { describe, expect, test } from "@jest/globals";

import { ITEMS } from "@/constants/items";

import { de } from "../de";
import { en } from "../en";
import { ITEMS_EN } from "../items-en";

describe("Übersetzungen", () => {
  test("jeder Gegenstand hat einen englischen Namen", () => {
    const missing = ITEMS.filter((i) => !ITEMS_EN[i.name]?.name).map((i) => i.name);
    expect(missing).toEqual([]);
  });

  test("jeder Fakt ist übersetzt", () => {
    const missing = ITEMS.filter((i) => i.fact && !ITEMS_EN[i.name]?.fact).map((i) => i.name);
    expect(missing).toEqual([]);
  });

  test("keine veralteten Einträge", () => {
    const names = new Set(ITEMS.map((i) => i.name));
    expect(Object.keys(ITEMS_EN).filter((n) => !names.has(n))).toEqual([]);
  });

  test("Englisch hat dieselben Schlüssel wie Deutsch", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
  });
});
