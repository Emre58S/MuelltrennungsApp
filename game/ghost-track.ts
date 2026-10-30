// Datei: game/ghost-track.ts — Strecke eines Tages und Prüfung von Freundes-Codes
//
// Aus components/game/ghost-round.tsx herausgelöst, damit auch der
// Online-Bereich einen Code prüfen kann, bevor das Rennen startet.

import { type SceneKind } from "@/components/game/stage";
import { getBinsForScene, getItemsForBins } from "@/game/bins";
import {
  type Challenge,
  challengeRun,
  decodeChallenge,
  ghostQueue,
  ghostSeed,
  isOtherVersionCode,
  trackSign,
} from "@/game/ghost";

/** Die Szene der Strecke steht mit dem Tag fest (gleiche Tonnen für alle). */
const SCENES: SceneKind[] = ["haus", "ziegel", "garten"];

/** Strecke eines Tages: Szene, Tonnen, 10 Gegenstände und je die richtige Tonne. */
export function trackFor(day: string) {
  const scene = SCENES[ghostSeed(day) % SCENES.length];
  const bins = getBinsForScene(scene, 1);
  const queue = ghostQueue(getItemsForBins(bins), day);
  const correctBins = queue.map((it) => bins.findIndex((b) => b.category === it.category));
  return { scene, bins, queue, correctBins, sign: trackSign(queue.map((it) => it.name)) };
}

/** Herausforderung aus einem Code – oder warum sie nicht geht: kein gültiger
 *  Code („invalid“) oder anderer App-Stand mit anderer Strecke („update“). */
export function readCode(text: string): Challenge | "invalid" | "update" {
  const ch = decodeChallenge(text);
  if (!ch) return isOtherVersionCode(text) ? "update" : "invalid";
  const { correctBins, bins, sign } = trackFor(ch.day);
  if (ch.track !== sign) return "update";
  return challengeRun(ch, correctBins, bins.length) ? ch : "update";
}
