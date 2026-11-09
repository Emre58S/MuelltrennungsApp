// Datei: game/item-stats-migration.ts — Statistik nach der Umbenennung von Gegenständen (rein, testbar)

/** Umbenannte Gegenstände (8.11.: ganze Früchte statt „…schalen“): alter Name → neuer Name. */
export const RENAMED_ITEMS: Record<string, string> = {
  Karottenschalen: "Karotte",
  Zwiebelschale: "Zwiebel",
  Kartoffelschalen: "Kartoffel",
};

/** Alte Namen auf die neuen umschreiben, damit Statistik und Sammlung nicht bei null beginnen. */
export function migrateItemStats<T>(all: Record<string, T>): Record<string, T> {
  for (const [from, to] of Object.entries(RENAMED_ITEMS)) {
    if (all[from]) {
      all[to] ??= all[from];
      delete all[from];
    }
  }
  return all;
}
