// Datei: game/mastery.ts
// Gegenstände meistern: Wer einen Gegenstand oft richtig sortiert, bekommt
// dafür eine Medaille – Bronze, Silber, Gold. Gezählt werden nur richtige
// Würfe insgesamt; eine Medaille geht nie wieder verloren (nie strafend).
// Gold-Gegenstände fliegen mit goldener Spur, und mit genug Gold-Medaillen
// gibt es neue Wurfspuren (game/rewards.ts). Rein und ohne React.

export type Medal = "bronze" | "silver" | "gold";

/** Richtige Würfe, ab denen es die Medaille gibt. */
export const MEDAL_AT: Record<Medal, number> = { bronze: 3, silver: 8, gold: 15 };

export const MEDAL_ICON: Record<Medal, string> = { bronze: "🥉", silver: "🥈", gold: "🥇" };

/** Medaille für so viele richtige Würfe (oder null). */
export function medalFor(correct: number): Medal | null {
  if (correct >= MEDAL_AT.gold) return "gold";
  if (correct >= MEDAL_AT.silver) return "silver";
  if (correct >= MEDAL_AT.bronze) return "bronze";
  return null;
}

/** Neue Medaille durch diesen Wurf? (null = keine neue) */
export function medalUp(correctBefore: number, correctAfter: number): Medal | null {
  const after = medalFor(correctAfter);
  return after !== medalFor(correctBefore) ? after : null;
}

/** Wie viele richtige Würfe bis zur nächsten Medaille (null = schon Gold). */
export function nextMedal(correct: number): { medal: Medal; left: number } | null {
  for (const medal of ["bronze", "silver", "gold"] as Medal[])
    if (correct < MEDAL_AT[medal]) return { medal, left: MEDAL_AT[medal] - correct };
  return null;
}

/** Anzahl Gold-Gegenstände in den Lernständen. */
export function goldCount(stats: Record<string, { correct: number }>): number {
  return Object.values(stats).filter((s) => medalFor(s.correct) === "gold").length;
}
