// Datei: components/game/throw-input.ts
// Wurf-Eingabe für Zielwurf und Trickwürfe – ohne Umschalten:
//  - schnell wischen → normaler Wurf (Schwung = Weite, lernt mit)
//  - länger halten → Flugbahn-Vorschau, Wischlänge = Weite (planbar)
// Entscheidend ist das Tempo beim Loslassen: Wer schnell loswischt, wirft
// normal – auch wenn der Finger vorher kurz lag oder die Vorschau schon kam.
// Rein und ohne React; die Runden halten den Zustand in einem useRef.

import {
  adaptiveIdeal,
  type FreeShot,
  flickPower,
  flickShot,
  LEARN_WINDOW,
  swipeShot,
} from "@/game/logic";

/** Ab so langer Berührung (ms) erscheint die Vorschau (ein Wisch ist schneller). */
export const HOLD_MS = 240;
/** Ab diesem Tempo nach oben (px/s) ist es ein Wisch, kein gezieltes Halten. */
export const FLICK_SPEED = 700;

export type ThrowInput = {
  /** Beginn der Berührung (ms). */
  start: number;
  /** Vorschau wurde gezeigt → Loslassen wirft genau so (Wischlänge). */
  aiming: boolean;
  /** Kraft-Stufe fürs leise Vibrations-Klicken in der Vorschau. */
  step: number;
  /** Schwung der letzten schnellen Würfe (lernt den „richtigen“ Schwung). */
  flicks: number[];
};

export type ThrowContext = {
  /** Wischlänge (px) für volle Kraft. */
  full: number;
  binAngles: number[];
  binXs: number[];
  /** Hilfe nach Pech (missAssist). */
  assist?: number;
};

export function createThrowInput(): ThrowInput {
  return { start: 0, aiming: false, step: -1, flicks: [] };
}

export function beginThrow(input: ThrowInput, now: number) {
  input.start = now;
  input.aiming = false;
  input.step = -1;
}

/** Während des Wischens: erst nach HOLD_MS und bei ruhigem Finger gibt es
 *  eine Vorschau (sonst null). `vy` = aktuelles Tempo (px/s). */
export function previewShot(
  input: ThrowInput,
  now: number,
  dx: number,
  dy: number,
  vy: number,
  ctx: ThrowContext,
): FreeShot | null {
  if (!input.aiming && (now - input.start < HOLD_MS || -vy > FLICK_SPEED)) return null;
  input.aiming = true;
  return swipeShot(dx, dy, ctx.full, ctx.binAngles, ctx.binXs, { assist: ctx.assist });
}

/** Loslassen: ruhig mit Vorschau → genau wie gezeigt; schnell losgewischt →
 *  normaler Wurf nach Tempo. */
export function releaseShot(
  input: ThrowInput,
  dx: number,
  dy: number,
  vy: number,
  ctx: ThrowContext,
): FreeShot | null {
  if (input.aiming && -vy < FLICK_SPEED)
    return swipeShot(dx, dy, ctx.full, ctx.binAngles, ctx.binXs, { assist: ctx.assist });
  const shot = flickShot(dx, dy, vy, ctx.binAngles, ctx.binXs, {
    ideal: adaptiveIdeal(input.flicks),
    assist: ctx.assist,
  });
  if (shot) input.flicks = [...input.flicks, flickPower(dx, dy, vy)].slice(-LEARN_WINDOW);
  return shot;
}

/** Vorschau-Klicken: true, wenn die Kraft eine neue (höhere) 10-%-Stufe erreicht. */
export function stepClick(input: ThrowInput, shot: FreeShot | null): boolean {
  const step = shot ? Math.floor(shot.strength * 10) : -1;
  const click = step > input.step && step >= 0;
  input.step = step;
  return click;
}
