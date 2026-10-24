// Datei: game/trick-levels.ts
// Level des Modus „Trickwürfe“: Reifen in der Luft, durch die der Wurf auf
// dem Weg zur Zieltonne fliegen muss – ruhig, gleitend oder drehend – und
// Windräder, an deren Flügeln man im richtigen Moment vorbeiwirft. Die
// Reifen hängen dort, wo die Wurfkurve ohnehin vorbeikommt (eher hinten,
// nahe den Tonnen), damit sich ein Trick wie ein guter Wurf anfühlt.
// Jedes Level wird in __tests__/tricks.test.ts geprüft: lösbar, mit einem
// fairen Fenster an Würfen (bei bewegten Reifen auch zeitlich) – und ohne
// Reifen zählt es nicht.
//
// Koordinaten: Welt-Einheiten. Tonnen stehen bei z = 0 (x = −1,28 / 0 / 1,28),
// der Gegenstand startet bei z ≈ 7,3; + z = Richtung Spieler.

import { type TranslationKey } from "@/i18n";

import { type PropCollider, type RingMotion } from "./physics";

/** Dicke des Reifen-Rohrs (passend zu components/game/trick-props.tsx). */
export const RING_TUBE = 0.05;

export type TrickProp =
  | { kind: "ring"; x: number; y: number; z: number; radius: number; motion?: RingMotion }
  | {
      kind: "windmill";
      x: number;
      y: number;
      z: number;
      blades: number;
      length: number;
      breadth: number;
      /** Eine Umdrehung (s). */
      period: number;
    };

export type TrickLevel = {
  id: number;
  /** Zieltonne (0 = links, 1 = Mitte, 2 = rechts; Grund-Tonnen Bio/Gelb/Rest). */
  target: 0 | 1 | 2;
  props: TrickProp[];
  /** Durch diese Reifen (Index in `props`) muss der Wurf fliegen (Windräder: keine Pflicht – nur im Weg). */
  requires: number[];
  /** Kurze Aufgabe, z. B. „Durch den Reifen“. */
  task: TranslationKey;
};

/** Windrad mit 4 Flügeln; Nabe seitlich der Wurfbahn, die Flügel kreuzen sie. */
const windmill = (x: number, y: number, z: number, period: number): TrickProp => ({
  kind: "windmill",
  x,
  y,
  z,
  blades: 4,
  length: 1.3,
  breadth: 0.2,
  period,
});

const ring = (x: number, y: number, z: number, radius: number, motion?: RingMotion): TrickProp => ({
  kind: "ring",
  x,
  y,
  z,
  radius,
  motion,
});

export const TRICK_LEVELS: TrickLevel[] = [
  // Einstieg: ein großer Reifen kurz vor der mittleren Tonne
  { id: 1, target: 1, props: [ring(0, 2.8, 1.5, 0.55)], requires: [0], task: "trick.task.ring" },
  { id: 2, target: 0, props: [ring(-1.0, 2.8, 1.5, 0.55)], requires: [0], task: "trick.task.ring" },
  // Hoch oben am Scheitel der Wurfkurve
  { id: 3, target: 2, props: [ring(0.75, 3.35, 3.3, 0.5)], requires: [0], task: "trick.task.ring" },
  // Zwei Reifen hintereinander
  {
    id: 4,
    target: 1,
    props: [ring(0, 3.35, 3.4, 0.5), ring(0, 2.6, 1.2, 0.5)],
    requires: [0, 1],
    task: "trick.task.rings",
  },
  // Bewegt: gleitet seitlich, dann auf und ab
  {
    id: 5,
    target: 1,
    props: [ring(0, 2.8, 1.5, 0.55, { kind: "slide", axis: "x", amp: 0.9, period: 3.2 })],
    requires: [0],
    task: "trick.task.moving",
  },
  {
    id: 6,
    target: 0,
    props: [ring(-1.0, 2.8, 1.5, 0.55, { kind: "slide", axis: "y", amp: 0.45, period: 2.6 })],
    requires: [0],
    task: "trick.task.moving",
  },
  // Drehender Reifen: nur werfen, wenn er zu dir schaut
  {
    id: 7,
    target: 2,
    props: [ring(1.0, 2.8, 1.5, 0.55, { kind: "spin", period: 3.0 })],
    requires: [0],
    task: "trick.task.spin",
  },
  // Finale: oben ein ruhiger, unten ein gleitender Reifen
  {
    id: 8,
    target: 1,
    props: [
      ring(0, 3.35, 3.3, 0.55),
      ring(0, 2.6, 1.2, 0.58, { kind: "slide", axis: "x", amp: 0.7, period: 2.8 }),
    ],
    requires: [0, 1],
    task: "trick.task.rings",
  },
  // Windrad: im richtigen Moment durch die Lücke zwischen den Flügeln
  { id: 9, target: 1, props: [windmill(-0.95, 2.8, 1.5, 4.5)], requires: [], task: "trick.task.windmill" },
  // Finale 2: oben durch den Reifen, unten am Windrad vorbei
  {
    id: 10,
    target: 0,
    props: [windmill(-0.25, 2.8, 1.5, 4), ring(-0.7, 3.35, 3.3, 0.55)],
    requires: [1],
    task: "trick.task.windmillRing",
  },
];

/** Physik-Körper eines Levels (Reifen-id = Index in `props`). */
export function levelColliders(level: Pick<TrickLevel, "props">): PropCollider[] {
  return level.props.map((p, id) => (p.kind === "ring" ? { ...p, id, tube: RING_TUBE } : { ...p, id }));
}

/** Nach dieser Zeit (s) wiederholt sich ein Hindernis (0 = ruht). Ein
 *  Windrad mit n Flügeln sieht nach 1/n Umdrehung wieder gleich aus. */
function propPeriod(p: TrickProp): number {
  return p.kind === "windmill" ? p.period / p.blades : (p.motion?.period ?? 0);
}

/** Längste Bewegungs-Periode eines Levels (0 = alles ruht). */
export function levelPeriod(level: Pick<TrickLevel, "props">): number {
  return Math.max(0, ...level.props.map(propPeriod));
}

/** Ist der Wurf durch alle nötigen Reifen geflogen (Reihenfolge egal)? */
export function meetsRequirement(level: TrickLevel, passed: number[]): boolean {
  return level.requires.every((id) => passed.includes(id));
}

/** Sterne nach Versuchen: 1. Versuch 3 ★, bis 3 Versuche 2 ★, sonst 1 ★. */
export function starsFor(attempts: number): 1 | 2 | 3 {
  return attempts <= 1 ? 3 : attempts <= 3 ? 2 : 1;
}
