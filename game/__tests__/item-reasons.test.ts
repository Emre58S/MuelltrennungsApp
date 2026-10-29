// Tests für die Begründungen der Lernkarte (i18n/item-reasons.ts): jeder
// Gegenstand hat eine – auf Deutsch und Englisch, höchstens vier Wörter.
// Ausführen: npm test

import { describe, expect, test } from "@jest/globals";

import { ITEMS } from "@/constants/items";
import { ITEM_REASONS } from "@/i18n/item-reasons";

const words = (text: string) => text.trim().split(/\s+/).length;

describe("Begründungen auf der Lernkarte", () => {
  test("jeder Gegenstand hat eine Begründung in beiden Sprachen", () => {
    const missing = ITEMS.filter((item) => !ITEM_REASONS[item.name]?.de || !ITEM_REASONS[item.name]?.en);
    expect(missing.map((i) => i.name)).toEqual([]);
  });

  test("keine Begründung für unbekannte Gegenstände (Tippfehler im Namen)", () => {
    const names = new Set(ITEMS.map((i) => i.name));
    expect(Object.keys(ITEM_REASONS).filter((name) => !names.has(name))).toEqual([]);
  });

  test("höchstens vier Wörter", () => {
    const long = Object.entries(ITEM_REASONS).filter(([, r]) => words(r.de) > 4 || words(r.en) > 4);
    expect(long.map(([name]) => name)).toEqual([]);
  });
});
