// Datei: game/item-mass.ts
// Gewicht der Gegenstände: Schwere (Glas, Dosen, Geschirr …) fliegen flacher
// und lassen sich vom Wind kaum schieben, leichte (Papier, Folie, Tüten …)
// fliegen höher und treibt der Wind weit ab. Das Gewicht steht auf der
// Gegenstand-Karte, damit man den Wurf planen kann.

import { type Item } from "@/constants/items";

export type Mass = "leicht" | "normal" | "schwer";

/** Bogenhöhe (lobVelocity) und Wind-Empfindlichkeit (Ball.drift) je Gewicht. */
export const MASS_FEEL: Record<Mass, { loft: number; drift: number }> = {
  leicht: { loft: 1.15, drift: 1.8 },
  normal: { loft: 1, drift: 1 },
  schwer: { loft: 0.85, drift: 0.45 },
};

const HEAVY = new Set([
  "Konservendose",
  "Kaputtes Geschirr",
  "Katzenstreu",
  "Altes Buch",
  "Zerbrochener Spiegel",
  "Altes Smartphone",
  "Alter Laptop",
  "Batterie",
  "Farbreste",
]);

const LIGHT = new Set([
  "Laub",
  "Zwiebelschale",
  "Teebeutel",
  "Küchenrolle (unbeschichtet)",
  "Zeitung",
  "Briefumschlag",
  "Schreibpapier",
  "Werbeprospekt",
  "Geschenkpapier (ohne Folie)",
  "Geschenkpapier (mit Folie)",
  "Visitenkarte",
  "Prospekt",
  "Toilettenpapier-Rolle",
  "Kassenzettel",
  "Plastiktüte",
  "Alufolie",
  "Chipstüte",
  "Styropor-Verpackung",
  "Zigarettenkippe",
  "Wattestäbchen",
  "Pflaster",
]);

/** Gewicht eines Gegenstands: Glas ist immer schwer, sonst laut Liste. */
export function itemMass(item: Pick<Item, "name" | "category">): Mass {
  if (item.category === "Glas" || HEAVY.has(item.name)) return "schwer";
  return LIGHT.has(item.name) ? "leicht" : "normal";
}
