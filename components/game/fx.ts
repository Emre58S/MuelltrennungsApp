// Datei: components/game/fx.ts
// Gemeinsamer, veränderlicher Effekt-Zustand (Zeitlupe, Kamera-Wackeln).
// Wird außerhalb von React mutiert und in useFrame gelesen – kein Re-Render.

import * as THREE from "three";

export { flightPoint } from "@/game/physics";

export type Fx = {
  /** 1 = normal, < 1 = Zeitlupe. Alle Animationen multiplizieren delta damit. */
  timeScale: number;
  slowUntil: number;
  /** Frühestens ab hier darf eine neue Zeitlupe starten (kein Dauer-Bremsen). */
  slowCooldownUntil: number;
  /** Hit-Stop: bis hier steht die Szene kurz fast still (Swish-„Wumms“). */
  stopUntil: number;
  /** Anzahl gerade fliegender Würfe – Zeitlupe nur bei einem einzelnen. */
  flying: number;
  shake: number;
  shakeAxis: "x" | "y";
  /** Für weniger Bewegung: Wackeln/Zeitlupe aus. */
  calm: boolean;
  /** Wohin die Tonnen-Augen schauen (aktueller Gegenstand). */
  lookAt: THREE.Vector3;
};

export type FxRef = { readonly current: Fx };

export function createFx(): Fx {
  return {
    timeScale: 1,
    slowUntil: 0,
    slowCooldownUntil: 0,
    stopUntil: 0,
    flying: 0,
    shake: 0,
    shakeAxis: "y",
    calm: false,
    lookAt: new THREE.Vector3(0, 1, 5),
  };
}

/** Gegenstand meldet seine Position → Tonnen schauen ihn an. */
export function setLook(fx: Fx, position: THREE.Vector3) {
  fx.lookAt.copy(position);
}

/** Wurf startet (+1) bzw. ist gelandet/entfernt (−1). */
export function trackFlying(fx: Fx, delta: 1 | -1) {
  fx.flying = Math.max(0, fx.flying + delta);
}

/** Zeitlupe/Hit-Stop sofort beenden (z. B. wenn der nächste Wurf losgeht). */
export function cancelSlowMotion(fx: Fx) {
  fx.slowUntil = 0;
  fx.stopUntil = 0;
  fx.timeScale = 1;
}

/** Hit-Stop: ein paar Millisekunden Fast-Stillstand – der „Wumms“ bei
 *  einem besonderen Treffer. Keine Zeitlupe; der nächste Wurf beendet ihn. */
export function hitStop(fx: Fx, ms: number) {
  if (fx.calm) return;
  fx.stopUntil = performance.now() + ms;
  fx.timeScale = 0.04;
}

export function shake(fx: Fx, amount: number, axis: "x" | "y" = "y") {
  if (fx.calm) return;
  fx.shake = Math.max(fx.shake, amount);
  fx.shakeAxis = axis;
}

/** Pro Frame: Zeitlupe weich ein-/ausblenden, Wackeln abklingen lassen.
 *  Gibt den aktuellen Wackel-Versatz der Kamera zurück. */
export function stepFx(fx: Fx, delta: number, time: number): number {
  const now = performance.now();
  if (now < fx.stopUntil) fx.timeScale = 0.04;
  else {
    const slow = now < fx.slowUntil;
    // Nach einem Hit-Stop schnell (aber nicht ruckartig) wieder auf Tempo
    fx.timeScale = THREE.MathUtils.damp(fx.timeScale, slow ? 0.22 : 1, slow ? 30 : 18, delta);
  }
  if (fx.shake <= 0.001) return 0;
  // Ruhigere Frequenz: wirkt wie ein Stoß, nicht wie Zittern
  const offset = Math.sin(time * 34) * fx.shake;
  fx.shake *= Math.exp(-9 * delta);
  return offset;
}

export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
