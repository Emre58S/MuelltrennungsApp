// Datei: game/trick-levels.ts
// Level des Modus „Trickwürfe“: Hindernisse (Trampolin, Auto, Zaun), welche
// Tonne das Ziel ist und welche Hindernisse der Wurf vorher berühren muss.
// Jedes Level wird in __tests__/tricks.test.ts geprüft: lösbar, mit einem
// fairen Fenster an Würfen – und ohne Trick zählt es nicht.
//
// Koordinaten: Welt-Einheiten. Tonnen stehen bei z = 0 (x = −1,28 / 0 / 1,28),
// der Gegenstand startet bei z ≈ 7,3; + z = Richtung Spieler.

import { type TranslationKey } from "@/i18n";

import { type Launch, type PropCollider } from "./physics";

/** Trampolin: hoher Sprung, Weite ±20 % je nach Trefferlage. */
const TRAMPOLINE: Launch = { minUp: 9, spread: 0.2, assist: 0.6 };
/** Autodach: flacherer, schwächerer Absprung. */
const CAR_ROOF: Launch = { minUp: 5.5, spread: 0.2, assist: 0.5 };

export type TrickProp =
  | { kind: "trampoline"; x: number; z: number }
  | { kind: "car"; x: number; z: number; color: string }
  | { kind: "fence"; x: number; z: number; w: number; h: number };

export type TrickLevel = {
  id: number;
  /** Zieltonne (0 = links, 1 = Mitte, 2 = rechts; Grund-Tonnen Bio/Gelb/Rest). */
  target: 0 | 1 | 2;
  props: TrickProp[];
  /** Diese Hindernisse (Index in `props`) muss der Wurf vorher berühren. */
  requires: number[];
  /** Trampolin zielt aufs nächste Hindernis (Trampolin/Auto) statt auf die Tonnen (Index in `props`). */
  chain?: { from: number; to: number };
  /** Kurze Aufgabe, z. B. „Über das Trampolin“. */
  task: TranslationKey;
};

/** Maße der Hindernisse (passend zu components/game/trick-props.tsx). */
export const PROP_SIZE = {
  trampoline: { halfW: 0.6, halfD: 0.7, top: 0.42 },
  car: {
    body: { halfW: 1.0, halfH: 0.3, halfD: 0.46, y: 0.45 },
    cabin: { halfW: 0.56, halfH: 0.21, halfD: 0.4, y: 0.96, dx: -0.12 },
  },
  fence: { halfD: 0.05 },
};

export const TRICK_LEVELS: TrickLevel[] = [
  // Einstieg: Trampolin direkt vor der Tonne
  { id: 1, target: 1, props: [{ kind: "trampoline", x: 0, z: 3.0 }], requires: [0], task: "trick.task.trampoline" },
  { id: 2, target: 0, props: [{ kind: "trampoline", x: -1.28, z: 3.2 }], requires: [0], task: "trick.task.trampoline" },
  // Autodach als Sprungbrett
  { id: 3, target: 1, props: [{ kind: "car", x: 0, z: 2.4, color: "#D9483B" }], requires: [0], task: "trick.task.car" },
  // Weiter weg
  { id: 4, target: 2, props: [{ kind: "trampoline", x: 1.28, z: 3.9 }], requires: [0], task: "trick.task.trampoline" },
  // Zaun vor den Tonnen: nur der hohe Sprung kommt drüber
  {
    id: 5,
    target: 1,
    props: [
      { kind: "fence", x: 0, z: 1.15, w: 4.2, h: 1.0 },
      { kind: "trampoline", x: 0, z: 2.9 },
    ],
    requires: [1],
    task: "trick.task.fence",
  },
  // Auto vor der linken Tonne, Trampolin als Ablenkung
  {
    id: 6,
    target: 0,
    props: [
      { kind: "car", x: -1.28, z: 2.3, color: "#3B7BD9" },
      { kind: "trampoline", x: 1.1, z: 3.4 },
    ],
    requires: [0],
    task: "trick.task.car",
  },
  // Doppel-Boing: vom ersten Trampolin aufs zweite
  {
    id: 7,
    target: 2,
    props: [
      { kind: "trampoline", x: -1.0, z: 3.8 },
      { kind: "trampoline", x: 1.28, z: 2.5 },
    ],
    requires: [0, 1],
    chain: { from: 0, to: 1 },
    task: "trick.task.double",
  },
  // Finale: Trampolin → Autodach → Tonne
  {
    id: 8,
    target: 1,
    props: [
      { kind: "trampoline", x: 1.0, z: 3.8 },
      { kind: "car", x: 0, z: 2.1, color: "#2E9E6E" },
    ],
    requires: [0, 1],
    chain: { from: 0, to: 1 },
    task: "trick.task.both",
  },
];

/** Physik-Körper eines Levels (Prop-id = Index in `props`). */
export function levelColliders(level: Pick<TrickLevel, "props" | "chain">): PropCollider[] {
  const out: PropCollider[] = [];
  level.props.forEach((prop, id) => {
    if (prop.kind === "trampoline") {
      const t = PROP_SIZE.trampoline;
      // Kette (Trampolin → Auto): Sprung zielt aufs Dach des nächsten Hindernisses
      const next = level.chain?.from === id ? level.props[level.chain.to] : undefined;
      const aimY =
        next?.kind === "car" ? PROP_SIZE.car.cabin.y + PROP_SIZE.car.cabin.halfH : PROP_SIZE.trampoline.top;
      const aim = next ? { x: next.x, y: aimY, z: next.z } : undefined;
      out.push({
        kind: "trampoline",
        id,
        x: prop.x,
        z: prop.z,
        halfW: t.halfW,
        halfD: t.halfD,
        top: t.top,
        // Kette: der Sprung trifft das nächste Hindernis zuverlässig (seitlich)
        launch: aim ? { ...TRAMPOLINE, aim, assist: 0.9 } : TRAMPOLINE,
      });
    } else if (prop.kind === "car") {
      const { body, cabin } = PROP_SIZE.car;
      const car = { kind: "box", id, part: "car", restitution: 0.45, launch: CAR_ROOF } as const;
      out.push({ ...car, x: prop.x, y: body.y, z: prop.z, halfW: body.halfW, halfH: body.halfH, halfD: body.halfD });
      out.push({
        ...car,
        x: prop.x + cabin.dx,
        y: cabin.y,
        z: prop.z,
        halfW: cabin.halfW,
        halfH: cabin.halfH,
        halfD: cabin.halfD,
      });
    } else {
      out.push({
        kind: "box",
        id,
        part: "fence",
        x: prop.x,
        y: prop.h / 2,
        z: prop.z,
        halfW: prop.w / 2,
        halfH: prop.h / 2,
        halfD: PROP_SIZE.fence.halfD,
        restitution: 0.35,
      });
    }
  });
  return out;
}

/** Hat der Wurf alle nötigen Hindernisse berührt (Reihenfolge egal)? */
export function meetsRequirement(level: TrickLevel, touched: number[]): boolean {
  return level.requires.every((id) => touched.includes(id));
}

/** Sterne nach Versuchen: 1. Versuch 3 ★, bis 3 Versuche 2 ★, sonst 1 ★. */
export function starsFor(attempts: number): 1 | 2 | 3 {
  return attempts <= 1 ? 3 : attempts <= 3 ? 2 : 1;
}
