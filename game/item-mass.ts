// Datei: game/item-mass.ts
// Gewicht der Gegenstände: Schwere (Glas, Dosen, Geschirr …) fliegen flacher
// und lassen sich vom Wind kaum schieben, leichte (Papier, Folie, Tüten …)
// fliegen höher und treibt der Wind weit ab. Das Gewicht steht auf der
// Gegenstand-Karte, damit man den Wurf planen kann. Dazu das Material für
// den Landeklang (Glas klirrt, Papier raschelt, Dose scheppert …).

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
  "Trinkglas",
]);

const LIGHT = new Set([
  "Teelicht-Hülle (Alu)",
  "Brötchentüte (Papier)",
  "Tablettenblister (leer)",
  "Kaffeekapsel (Alu)",
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
  "Backpapier",
  "Zeitschrift",
  "Obstnetz (Plastik)",
]);

/** Woraus ein Gegenstand ist – bestimmt seinen Landeklang (utils/sfx). */
export type Material = "glas" | "papier" | "plastik" | "metall" | "bio" | "rest";

const METAL = new Set([
  "Konservendose",
  "Alufolie",
  "Einweg-Aluschale",
  "Deckel (Metall)",
  "Kronkorken",
  "Kaffeekapsel (Alu)",
  "Spraydose (leer)",
  "Teelicht-Hülle (Alu)",
  "Batterie",
  "Altes Smartphone",
  "Alter Laptop",
  "Ladekabel",
  "Fieberthermometer (Quecksilber)",
]);
/** Zerbrechliches, das klirrt wie Glas. */
const BRITTLE = new Set(["Trinkglas", "Kaputtes Geschirr", "Zerbrochener Spiegel", "Kaputte Glühbirne", "Energiesparlampe"]);
/** Papierartiges außerhalb der Papier-Tonne. */
const PAPERY = new Set([
  "Kassenzettel",
  "Backpapier",
  "Geschenkpapier (mit Folie)",
  "Tapeten",
  "Pizzakarton (fettig)",
  "Küchenrolle (unbeschichtet)",
  "Getränkekarton",
  "Milchkarton",
]);

export function itemMaterial(item: Pick<Item, "name" | "category">): Material {
  if (item.category === "Glas" || BRITTLE.has(item.name)) return "glas";
  if (METAL.has(item.name)) return "metall";
  if (item.category === "Papier" || PAPERY.has(item.name)) return "papier";
  if (item.category === "Gelber Sack") return "plastik";
  if (item.category === "Biomüll") return "bio";
  return "rest";
}

/** Gewicht eines Gegenstands: Glas ist immer schwer, sonst laut Liste. */
export function itemMass(item: Pick<Item, "name" | "category">): Mass {
  if (item.category === "Glas" || HEAVY.has(item.name)) return "schwer";
  return LIGHT.has(item.name) ? "leicht" : "normal";
}
