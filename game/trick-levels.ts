// Datei: game/trick-levels.ts
// Level des Modus „Trickwürfe“: Reifen in der Luft, durch die der Wurf auf
// dem Weg zur Zieltonne fliegen muss – ruhig, gleitend oder drehend –,
// Windräder, an deren Flügeln man im richtigen Moment vorbeiwirft,
// Ventilatoren, deren Wind den Wurf (je nach Gewicht) seitlich schiebt, und
// eine Tonne, die auf dich zu und weg fährt. Die Hindernisse stehen dort, wo
// die Wurfkurve ohnehin vorbeikommt (eher hinten, nahe den Tonnen), damit
// sich ein Trick wie ein guter Wurf anfühlt.
//
// Sterne: ★ geschafft · ★ in höchstens 3 Versuchen · ★ Bonus-Ziel des Levels
// (Swish ohne Berührung, gleich im 1. Versuch oder Bandenwurf übers Schild).
// Dazu ein Tages-Trick: für alle gleich, aus Datum gewählt (dailyTrick).
//
// Jedes Level und jede Tages-Vorlage wird in __tests__/tricks.test.ts
// geprüft: lösbar, mit fairem Fenster an Würfen (bei Bewegung auch zeitlich),
// auf großem und kleinem iPhone, im Wind mit jedem Gewicht.
//
// Koordinaten: Welt-Einheiten. Tonnen stehen bei z = 0 (x = −1,28 / 0 / 1,28),
// der Gegenstand startet bei z ≈ 7,3; + z = Richtung Spieler.

import { type TranslationKey } from "@/i18n";

import { hashString, seededRandom } from "./logic";
import { type BinSlide, type LidFlap, type PropCollider, type RingMotion } from "./physics";

/** Dicke des Reifen-Rohrs (passend zu components/game/trick-props.tsx). */
export const RING_TUBE = 0.05;
/** Dicke des Autoreifens an der Reifenschaukel. */
export const TIRE_TUBE = 0.13;

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
      /** Eine Umdrehung (s); negativ = andersherum. */
      period: number;
    }
  | {
      /** Bauzaun quer vor den Tonnen (Gitter, steht auf dem Boden) – drüberwerfen. */
      kind: "fence";
      z: number;
      /** Höhe der Oberkante. */
      top: number;
      halfW: number;
    }
  | {
      kind: "lamp";
      /** Fuß des Masts. */
      x: number;
      z: number;
      height: number;
      /** Länge des Auslegers. */
      arm: number;
      side: 1 | -1;
    }
  | {
      kind: "sign";
      /** Mitte der Tafel. */
      x: number;
      y: number;
      z: number;
      halfW: number;
      halfH: number;
      /** Neigung (rad), oben zum Spieler hin. */
      tilt: number;
      /** Drehung um die Hochachse (rad), + = schaut nach rechts. */
      yaw: number;
    }
  | {
      kind: "fan";
      /** Mitte des Windfelds. */
      x: number;
      y: number;
      z: number;
      halfW: number;
      halfH: number;
      halfD: number;
      /** Wind-Beschleunigung in x (+ = nach rechts). */
      force: number;
    }
  | {
      /** Torwand-Feld: Tafel mit einem Loch (game/physics.ts → BoardCollider). */
      kind: "board";
      x: number;
      y: number;
      z: number;
      halfW: number;
      halfH: number;
      hole: { x: number; y: number; r: number };
      post?: 1 | -1;
    }
  | {
      /** Trampolin vor einer Tonne: Sprungtuch-Mitte bei x/z, Oberkante y. */
      kind: "trampoline";
      x: number;
      y: number;
      z: number;
      halfW: number;
      halfD: number;
      /** Scheitel des Sprungs über dem Tonnenrand. */
      kick: number;
      /** Fährt seitlich hin und her (schleudert zur Tonne davor). */
      slide?: { amp: number; period: number; phase?: number };
    };

/** Bonus-Ziel für den dritten Stern (bank = Bandenwurf: übers Schild hinein). */
export type TrickBonus = "swish" | "firstTry" | "bank";

export type TrickLevel = {
  /** 1… für die Level-Liste, 0 = Tages-Trick. */
  id: number;
  /** Zieltonne (0 = links, 1 = Mitte, 2 = rechts; Grund-Tonnen Bio/Gelb/Rest). */
  target: 0 | 1 | 2;
  props: TrickProp[];
  /** Durch diese Reifen (Index in `props`) muss der Wurf fliegen (Windräder,
   *  Ventilatoren: keine Pflicht – nur im Weg). */
  requires: number[];
  /** Die Zieltonne fährt (auf dich zu und weg). */
  binSlide?: BinSlide;
  /** Der Deckel der Zieltonne klappt auf und zu (Timing). */
  binFlap?: LidFlap;
  /** Alle Deckel klappen im selben Takt wie `binFlap` (Parcours: für jede
   *  Spur gleich). */
  flapAll?: boolean;
  /** Alle Tonnen rollen (je um einen Takt versetzt, wie eine Welle) – nicht nur die Zieltonne. */
  slideAll?: boolean;
  bonus: TrickBonus;
  /** Kurze Aufgabe, z. B. „Durch den Reifen“. */
  task: TranslationKey;
  /** Kulisse der Runde (Standard: Hauswand). Die Küche ist eine eigene Welt. */
  scene?: "haus" | "kueche";
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

/** Reifenschaukel: Autoreifen am Seil, pendelt über alle Tonnen (±1 m). */
const tire = (period: number): TrickProp =>
  ring(0, 2.8, 1.5, 0.62, { kind: "swing", length: 3.5, amp: Math.asin(1.0 / 3.5), period });

/** Torwand vor den Tonnen: 3 Felder nebeneinander, je Tonne ein Loch in der
 *  Wurfbahn (Felder 0–2 = Tonne links, Mitte, rechts). Hoch genug, dass sie
 *  auf dem Bildschirm über den Tonnen steht und keine verdeckt. */
const goalWall = (r: number): TrickProp[] =>
  ([-1, 0, 1] as const).map((side) => ({
    kind: "board",
    x: side * 1.0,
    y: 2.75,
    z: 1.5,
    halfW: 0.5,
    halfH: 0.6,
    hole: { x: 0, y: 0.05, r },
    post: side === 0 ? undefined : side,
  }));

/** Windfeld vor den Tonnen (zwischen Scheitel und Öffnung). */
const fan = (x: number, force: number): TrickProp => ({
  kind: "fan",
  x,
  y: 2.6,
  z: 2.2,
  halfW: 1.5,
  halfH: 1.3,
  halfD: 1.4,
  force,
});

/** Trampolin vor einer Tonne: kurz werfen, aufs Tuch – „Boing“ – hinein. */
export const trampoline = (
  x: number,
  slide?: { amp: number; period: number; phase?: number },
  z = 2.3,
  halfW = 0.6,
): TrickProp => ({
  kind: "trampoline",
  x,
  y: 0.42,
  z,
  halfW,
  halfD: 0.55,
  kick: 1.1,
  slide,
});

/** Bauzaun über die ganze Breite vor den Tonnen – weit genug weg, dass ein
 *  Abpraller an der Rückseite nicht in die Tonne fällt (Treffer gehen drüber). */
export const fence = (z = 1.5, top = 2.8): TrickProp => ({ kind: "fence", z, top, halfW: 2.4 });

/** Laternenmast in der Wurfbahn, Ausleger zur Seite `side`. */
export const lamp = (x: number, z: number, side: 1 | -1, height = 3.0, arm = 0.7): TrickProp => ({
  kind: "lamp",
  x,
  z,
  height,
  arm,
  side,
});

/** Straßenschild neben einer Tonne, schräg gedreht – als Bande. */
export const sign = (x: number, y: number, z: number, yaw: number, tilt = 0): TrickProp => ({
  kind: "sign",
  x,
  y,
  z,
  halfW: 0.42,
  halfH: 0.32,
  tilt,
  yaw,
});

/** Trampolin vor einer äußeren Tonne (Abstand der Tonnen, game/layout.ts). */
const TRAMP_SIDE = 1.28;

/** Tonne fährt auf dich zu und zurück (0 … 1,7 vor der Reihe). */
const ROLL: BinSlide = { axis: "z", amp: 0.85, shift: 0.85, period: 3.4 };

export const TRICK_LEVELS: TrickLevel[] = [
  // ── Leicht ──
  // Einstieg: ein großer Reifen kurz vor der mittleren Tonne
  { id: 1, target: 1, props: [ring(0, 2.8, 1.5, 0.55)], requires: [0], bonus: "swish", task: "trick.task.ring" },
  { id: 2, target: 0, props: [ring(-1.0, 2.8, 1.5, 0.55)], requires: [0], bonus: "swish", task: "trick.task.ring" },
  // Hoch oben am Scheitel der Wurfkurve
  { id: 3, target: 2, props: [ring(0.75, 3.35, 3.3, 0.5)], requires: [0], bonus: "firstTry", task: "trick.task.ring" },
  // Zwei Reifen hintereinander
  {
    id: 4,
    target: 1,
    props: [ring(0, 3.35, 3.4, 0.5), ring(0, 2.6, 1.2, 0.5)],
    requires: [0, 1],
    bonus: "swish",
    task: "trick.task.rings",
  },
  // ── Mittel ──
  // Bewegt: gleitet seitlich, dann auf und ab
  {
    id: 5,
    target: 1,
    props: [ring(0, 2.8, 1.5, 0.55, { kind: "slide", axis: "x", amp: 0.9, period: 3.2 })],
    requires: [0],
    bonus: "firstTry",
    task: "trick.task.moving",
  },
  {
    id: 6,
    target: 0,
    props: [ring(-1.0, 2.8, 1.5, 0.55, { kind: "slide", axis: "y", amp: 0.45, period: 2.6 })],
    requires: [0],
    bonus: "swish",
    task: "trick.task.moving",
  },
  // Drehender Reifen: nur werfen, wenn er zu dir schaut
  {
    id: 7,
    target: 2,
    props: [ring(1.0, 2.8, 1.5, 0.55, { kind: "spin", period: 3.0 })],
    requires: [0],
    bonus: "firstTry",
    task: "trick.task.spin",
  },
  // Die Tonne fährt: im richtigen Moment werfen
  { id: 8, target: 1, props: [], requires: [], binSlide: ROLL, bonus: "swish", task: "trick.task.movingBin" },
  // Wind von links: gegen den Wind zielen – leichte Sachen treibt es weiter
  { id: 9, target: 2, props: [fan(0.6, 9)], requires: [], bonus: "firstTry", task: "trick.task.wind" },
  // ── Schwer ──
  // Oben ein ruhiger, unten ein gleitender Reifen
  {
    id: 10,
    target: 1,
    props: [
      ring(0, 3.35, 3.3, 0.55),
      ring(0, 2.6, 1.2, 0.58, { kind: "slide", axis: "x", amp: 0.7, period: 2.8 }),
    ],
    requires: [0, 1],
    bonus: "swish",
    task: "trick.task.rings",
  },
  // Windrad: im richtigen Moment durch die Lücke zwischen den Flügeln
  { id: 11, target: 1, props: [windmill(-0.95, 2.8, 1.5, 4.5)], requires: [], bonus: "firstTry", task: "trick.task.windmill" },
  // Oben durch den Reifen, unten am Windrad vorbei
  {
    id: 12,
    target: 0,
    props: [windmill(-0.25, 2.8, 1.5, 4), ring(-0.7, 3.35, 3.3, 0.55)],
    requires: [1],
    bonus: "swish",
    task: "trick.task.windmillRing",
  },
  // Wind von rechts und ein Reifen an der Tonne
  {
    id: 13,
    target: 0,
    props: [fan(-0.6, -5.5), ring(-1.0, 2.8, 1.5, 0.65)],
    requires: [1],
    bonus: "firstTry",
    task: "trick.task.windRing",
  },
  // Oben durch den Reifen – und die rechte Tonne fährt
  {
    id: 14,
    target: 2,
    props: [ring(0.75, 3.35, 3.3, 0.6)],
    requires: [0],
    binSlide: ROLL,
    bonus: "firstTry",
    task: "trick.task.ringMovingBin",
  },
  // Oben ein ruhiger Reifen, unten ein drehender – beide treffen
  {
    id: 15,
    target: 2,
    props: [ring(0.75, 3.35, 3.3, 0.58), ring(1.0, 2.8, 1.5, 0.58, { kind: "spin", period: 3.4 })],
    requires: [0, 1],
    bonus: "swish",
    task: "trick.task.ringSpin",
  },
  // Doppeltes Timing: Reifen gleitet auf und ab, die Tonne fährt
  {
    id: 16,
    target: 1,
    props: [ring(0, 2.8, 1.5, 0.6, { kind: "slide", axis: "y", amp: 0.4, period: 2.6 })],
    requires: [0],
    binSlide: ROLL,
    bonus: "firstTry",
    task: "trick.task.doubleTiming",
  },
  // Wie Level 12, gespiegelt: Windrad und Reifen vor der rechten Tonne
  {
    id: 17,
    target: 2,
    props: [windmill(0.25, 2.8, 1.5, -4), ring(0.7, 3.35, 3.3, 0.55)],
    requires: [1],
    bonus: "firstTry",
    task: "trick.task.windmillRing",
  },
  // Wie Level 13, gespiegelt: Wind von links, Reifen an der rechten Tonne
  {
    id: 18,
    target: 2,
    props: [fan(0.6, 5.5), ring(1.0, 2.8, 1.5, 0.65)],
    requires: [1],
    bonus: "swish",
    task: "trick.task.windRing",
  },
  // ── Spielplatz (ersetzt Schild, Laterne und Bauzaun: die standen nur im
  // Weg). Trampolin = kurz werfen, „Boing“, hinein; Deckel = Timing. ──
  // Trampolin vor der mittleren Tonne: kurz werfen, aufs Tuch – hinein
  { id: 19, target: 1, props: [trampoline(0)], requires: [0], bonus: "swish", task: "trick.task.trampoline" },
  // Trampolin vor der rechten Tonne
  { id: 20, target: 2, props: [trampoline(TRAMP_SIDE)], requires: [0], bonus: "swish", task: "trick.task.trampoline" },
  // Der Deckel klappt auf und zu: werfen, wenn er gleich offen ist
  { id: 21, target: 1, props: [], requires: [], binFlap: { period: 2.6 }, bonus: "swish", task: "trick.task.flap" },
  // Aufs Trampolin und im Sprung durch den Reifen
  {
    id: 22,
    target: 1,
    props: [trampoline(0), ring(0, 2.7, 1.0, 0.5)],
    requires: [0, 1],
    bonus: "firstTry",
    task: "trick.task.trampolineRing",
  },
  // Das Trampolin fährt: treffen, wenn es vor der rechten Tonne steht –
  // sonst springt der Wurf in die mittlere
  {
    id: 23,
    target: 2,
    props: [trampoline(0.64, { amp: 0.9, period: 3.6 })],
    requires: [0],
    bonus: "firstTry",
    task: "trick.task.trampolineMoving",
  },
  // Trampolin vor der linken Tonne, deren Deckel klappt
  {
    id: 24,
    target: 0,
    props: [trampoline(-TRAMP_SIDE)],
    requires: [0],
    binFlap: { period: 2.8 },
    bonus: "firstTry",
    task: "trick.task.trampolineFlap",
  },
  // ── Meister: zwei Dinge auf einmal ──
  // Gleitender Reifen vor der Mitte – und der Deckel klappt
  {
    id: 25,
    target: 1,
    props: [ring(0, 2.8, 1.5, 0.6, { kind: "slide", axis: "x", amp: 0.7, period: 3.2 })],
    requires: [0],
    binFlap: { period: 2.6 },
    bonus: "firstTry",
    task: "trick.task.ringFlap",
  },
  // Aufs Trampolin, im Sprung durch den drehenden Reifen
  {
    id: 26,
    target: 1,
    props: [trampoline(0), ring(0, 2.7, 1.0, 0.55, { kind: "spin", period: 3.4 })],
    requires: [0, 1],
    bonus: "firstTry",
    task: "trick.task.trampolineSpin",
  },
  // Am Windrad vorbei in die klappende Tonne
  {
    id: 27,
    target: 1,
    props: [windmill(-0.95, 2.8, 1.5, 4.5)],
    requires: [],
    binFlap: { period: 2.6 },
    bonus: "firstTry",
    task: "trick.task.windmillFlap",
  },
  // Oben durch den Reifen in die linke Tonne, deren Deckel klappt
  {
    id: 28,
    target: 0,
    props: [ring(-0.75, 3.35, 3.3, 0.58)],
    requires: [0],
    binFlap: { period: 2.8 },
    bonus: "swish",
    task: "trick.task.ringFlap",
  },
];

/** Kleine Symbole für die Level-Kachel: was einen erwartet (höchstens zwei). */
export function levelIcons(level: Pick<TrickLevel, "props" | "binSlide" | "binFlap" | "scene">): string[] {
  const icons: string[] = [];
  for (const p of level.props) {
    const icon =
      p.kind === "fan"
        ? "💨"
        : p.kind === "sign"
          ? "🪧"
          : p.kind === "lamp"
          ? "💡"
          : p.kind === "fence"
          ? "🚧"
          : p.kind === "board"
          ? "🥅"
          : p.kind === "windmill"
          ? "🌀"
          : p.kind === "trampoline"
          ? "🤸"
          : p.motion?.kind === "spin"
            ? "🔄"
            : p.motion?.kind === "slide" && p.motion.axis === "y"
              ? "↕️"
              : p.motion
                ? "↔️"
                : "⭕";
    if (!icons.includes(icon)) icons.push(icon);
  }
  if (level.binSlide) icons.unshift("🗑️");
  if (level.binFlap) icons.unshift("⏱️");
  // Küche: Pfanne vorn, damit man die neue Welt auf der Kachel erkennt
  if (level.scene === "kueche") icons.unshift("🍳");
  return icons.slice(0, 2);
}

/** Schwierigkeit für die Level-Liste. */
export type TrickDifficulty = "easy" | "medium" | "hard";
export function difficultyOf(level: TrickLevel): TrickDifficulty {
  return level.id <= 4 ? "easy" : level.id <= 9 ? "medium" : "hard";
}

/* ── Tages-Trick ──────────────────────────────────────────── */

/** Zusätzliche Vorlagen nur für den Tages-Trick (geprüft wie die Level). */
export const DAILY_TEMPLATES: Omit<TrickLevel, "id">[] = [
  // Oben durch den Reifen, die Tonne fährt
  { target: 1, props: [ring(0, 3.35, 3.3, 0.6)], requires: [0], binSlide: ROLL, bonus: "swish", task: "trick.task.ringMovingBin" },
  // Oben ein Reifen, Wind von rechts
  { target: 2, props: [fan(0.6, -6), ring(0.75, 3.35, 3.3, 0.6)], requires: [1], bonus: "firstTry", task: "trick.task.windRing" },
  // Auf und ab gleitender Reifen vor der Mitte, oben ein ruhiger
  {
    target: 1,
    props: [ring(0, 3.35, 3.3, 0.55), ring(0, 2.7, 1.4, 0.5, { kind: "slide", axis: "y", amp: 0.55, period: 2.4 })],
    requires: [0, 1],
    bonus: "swish",
    task: "trick.task.rings",
  },
  // Windrad vor der rechten Tonne
  { target: 2, props: [windmill(0.35, 2.8, 1.5, -4.2)], requires: [], bonus: "firstTry", task: "trick.task.windmill" },
  // Drehender Reifen mit Rückenwind (Swish gelingt auf kleinen Handys nur
  // mit Glück – daher Bonus „1. Versuch“)
  {
    target: 0,
    props: [fan(-0.6, 7), ring(-1.0, 2.8, 1.5, 0.58, { kind: "spin", period: 3.4 })],
    requires: [1],
    bonus: "firstTry",
    task: "trick.task.spin",
  },
];

/** Level spiegeln (links ↔ rechts): Die Szene ist symmetrisch, also bleibt
 *  ein faires Level fair. Bewegungen laufen gespiegelt. */
export function mirrorLevel<T extends Omit<TrickLevel, "id">>(level: T): T {
  const target = (2 - level.target) as 0 | 1 | 2;
  const props = level.props.map((p): TrickProp => {
    if (p.kind === "fan") return { ...p, x: -p.x, force: -p.force };
    if (p.kind === "windmill") return { ...p, x: -p.x, period: -p.period };
    if (p.kind === "sign") return { ...p, x: -p.x, yaw: -p.yaw };
    if (p.kind === "lamp") return { ...p, x: -p.x, side: (-p.side) as 1 | -1 };
    if (p.kind === "fence") return p;
    if (p.kind === "board")
      return { ...p, x: -p.x, hole: { ...p.hole, x: -p.hole.x }, post: p.post && ((-p.post) as 1 | -1) };
    if (p.kind === "trampoline")
      return { ...p, x: -p.x, slide: p.slide && { ...p.slide, phase: (p.slide.phase ?? 0) + Math.PI } };
    const m = p.motion;
    const motion: RingMotion | undefined = !m
      ? undefined
      : m.kind === "spin"
        ? { ...m, period: -m.period, phase: -(m.phase ?? 0) }
        : m.kind === "swing" || m.axis === "x"
          ? { ...m, phase: (m.phase ?? 0) + Math.PI }
          : m;
    return { ...p, x: -p.x, motion };
  });
  const binSlide = level.binSlide?.axis === "x" ? { ...level.binSlide, amp: -level.binSlide.amp } : level.binSlide;
  return { ...level, target, props, binSlide };
}

/** Tages-Trick: für alle gleich (nur vom Datum abhängig), aus Leveln und
 *  Tages-Vorlagen gewählt, manchmal gespiegelt. */
export function dailyTrick(date: string): TrickLevel {
  const rand = seededRandom(hashString(`trick:${date}`));
  const pool: Omit<TrickLevel, "id">[] = [...TRICK_LEVELS.filter((l) => l.id >= 5 && l.id !== 20), ...DAILY_TEMPLATES];
  const pick = pool[Math.floor(rand() * pool.length)];
  const level = rand() < 0.5 ? mirrorLevel(pick) : pick;
  return { ...level, id: 0 };
}

/** Zufalls-Trick: beliebig oft, aus allen geprüften Leveln und Tages-Vorlagen
 *  (jede davon besteht den Fairness-Test), manchmal gespiegelt – also immer
 *  lösbar. Leichte Level kommen seltener als die spannenden. */
export function randomTrick(seed: number): TrickLevel {
  const rand = seededRandom(seed);
  const pool: Omit<TrickLevel, "id">[] = [
    ...TRICK_LEVELS.filter((l) => l.id >= 3),
    ...DAILY_TEMPLATES,
    ...DAILY_TEMPLATES,
  ];
  const pick = pool[Math.floor(rand() * pool.length)];
  const level = rand() < 0.5 ? mirrorLevel(pick) : pick;
  return { ...level, id: 0 };
}

/* ── Parcours (R5) ────────────────────────────────────────── */

/** Parcours: keine feste Zieltonne – sie ergibt sich aus dem Gegenstand.
 *  Deshalb muss er für alle 3 Tonnen gleich fair sein: entweder dasselbe
 *  Hindernis vor jeder Tonne oder eins, das über alle Tonnen wandert.
 *  `lanes[i]` = Pflicht-Hindernisse (Index in `props`) für Tonne i. Fahrende
 *  Tonne / klappender Deckel gelten für die Tonne des Gegenstands – mit
 *  `flapAll` klappen alle Deckel im selben Takt. */
export type ParcoursLevel = Omit<TrickLevel, "id" | "target" | "requires"> & {
  id: number;
  lanes: [number[], number[], number[]];
  /** Rundenzeit der Parcours-Runde (s). */
  seconds: 20 | 25 | 30;
};

/** Der Parcours für einen Gegenstand, der in Tonne `bin` gehört – als
 *  normales Level (gleiche Physik, Wertung und Fairness-Prüfung). */
export function parcoursLane(level: ParcoursLevel, bin: 0 | 1 | 2): TrickLevel {
  const { lanes, ...rest } = level;
  return { ...rest, target: bin, requires: lanes[bin] };
}

/** Kopie eines Parcours in der Küche: gleiche Physik und Spuren, eigene Kulisse und Aufgabentext. */
const inKitchen = (p: ParcoursLevel, id: number, task: TranslationKey): ParcoursLevel => ({
  ...p,
  id,
  task,
  scene: "kueche",
});

const CLASSIC_PARCOURS: ParcoursLevel[] = [
  // Reifenschaukel pendelt über alle Tonnen: werfen, wenn sie vor DEINER Tonne ist
  { id: 1, props: [tire(4.0)], lanes: [[0], [0], [0]], seconds: 30, bonus: "firstTry", task: "trick.task.swing" },
  // Vor jeder Tonne ein Trampolin (schmaler, damit die Rahmen nicht
  // ineinanderstehen): aufs Tuch vor DEINER Tonne werfen
  {
    id: 2,
    props: [-TRAMP_SIDE, 0, TRAMP_SIDE].map((x) => trampoline(x, undefined, 2.3, 0.52)),
    lanes: [[0], [1], [2]],
    seconds: 20,
    bonus: "swish",
    task: "trick.task.trampolineLanes",
  },
  // Torwand: durchs Loch vor DEINER Tonne
  { id: 3, props: goalWall(0.42), lanes: [[0], [1], [2]], seconds: 25, bonus: "swish", task: "trick.task.board" },
  // Alle Deckel klappen im Takt: werfen, wenn DEIN Deckel offen ist
  {
    id: 4,
    props: [],
    lanes: [[], [], []],
    seconds: 25,
    binFlap: { period: 2.6 },
    flapAll: true,
    bonus: "swish",
    task: "trick.task.flapAll",
  },
];

/** Küchen-Parcours: dieselben vier Prüfungen, aber mit Objekten, die in die Küche gehören
 *  (Küchenrolle am Faden, Töpfe mit Deckel, Standregal mit Fächern). Der Deckel-Takt hat kein
 *  Objekt und bleibt ohne Küchen-Kopie. */
/** Küchen-Parcours, die das Spiel zeigt: Saugroboter (fahrendes Trampolin, natürlich auf dem Boden) und
 *  klappende Deckel in der Küchenszene (kein Hindernis nötig – die Tonnen selbst sind die Aufgabe). */
export const KITCHEN_PARCOURS: ParcoursLevel[] = [
  // Saugroboter rollt über alle Tonnen: draufwerfen, wenn er vor DEINER Tonne ist
  {
    id: 5,
    props: [trampoline(0, { amp: TRAMP_SIDE, period: 5.2 }, 2.3, 0.52)],
    lanes: [[0], [0], [0]],
    seconds: 30,
    bonus: "swish",
    task: "trick.task.cart",
    scene: "kueche",
  },
  inKitchen(CLASSIC_PARCOURS[3], 6, "trick.task.flapAll"),
];

/** Küchen-Parcours in Arbeit – bewusst NICHT in der Liste (Nutzer, 4.11.: Küchenrolle, Töpfe und Regal wirken
 *  unnatürlich/verdecken die Tonnen). Per Direktlink erreichbar, bis eine bessere Fassung steht. */
export const KITCHEN_PARCOURS_WIP: ParcoursLevel[] = [
  // Tonnen auf Rollen: alle fahren vor und zurück, jede im eigenen Takt (Welle)
  {
    id: 12,
    props: [],
    lanes: [[], [], []],
    binSlide: { axis: "z", amp: 0.4, shift: 0.4, period: 6 },
    slideAll: true,
    seconds: 30,
    bonus: "swish",
    task: "trick.task.rollBins",
    scene: "kueche",
  },
  // Wind vom offenen Fenster (rechts) durch die Küche: Wurf gegen den Wind abstimmen (Stärke 4–7 ist für alle Tonnen fair)
  {
    id: 11,
    props: [fan(0, -6)],
    lanes: [[], [], []],
    seconds: 30,
    bonus: "firstTry",
    task: "trick.task.windWindow",
    scene: "kueche",
  },
  inKitchen(CLASSIC_PARCOURS[0], 7, "trick.task.swingKitchen"),
  inKitchen(CLASSIC_PARCOURS[1], 8, "trick.task.potLanes"),
  inKitchen(CLASSIC_PARCOURS[2], 9, "trick.task.shelf"),
  // Töpfe mit Deckel vor allen Tonnen UND alle Tonnendeckel klappen im Takt
  {
    id: 10,
    props: [-TRAMP_SIDE, 0, TRAMP_SIDE].map((x) => trampoline(x, undefined, 2.3, 0.52)),
    lanes: [[0], [1], [2]],
    seconds: 25,
    binFlap: { period: 2.8 },
    flapAll: true,
    bonus: "firstTry",
    task: "trick.task.potFlap",
    scene: "kueche",
  },
];

/** Die Parcours, die das Spiel anzeigt und für den Tages-Parcours zieht. */
export const PARCOURS: ParcoursLevel[] = [...CLASSIC_PARCOURS, ...KITCHEN_PARCOURS];

/* ── Physik und Wertung ───────────────────────────────────── */

/** Physik-Körper eines Levels (Hindernis-id = Index in `props`). */
export function levelColliders(level: Pick<TrickLevel, "props">): PropCollider[] {
  return level.props.map((p, id): PropCollider => {
    if (p.kind === "ring") return { ...p, id, tube: p.motion?.kind === "swing" ? TIRE_TUBE : RING_TUBE };
    // Bauzaun rechnet wie eine aufrechte Tafel vom Boden bis zur Oberkante
    if (p.kind === "fence")
      return { kind: "sign", id, x: 0, y: p.top / 2, z: p.z, halfW: p.halfW, halfH: p.top / 2, tilt: 0, yaw: 0, look: "fence" };
    return { ...p, id };
  });
}

/** Nach dieser Zeit (s) wiederholt sich ein Hindernis (0 = ruht). Ein
 *  Windrad mit n Flügeln sieht nach 1/n Umdrehung wieder gleich aus. */
function propPeriod(p: TrickProp): number {
  if (p.kind === "windmill") return Math.abs(p.period) / p.blades;
  if (p.kind === "ring") return Math.abs(p.motion?.period ?? 0);
  if (p.kind === "trampoline") return p.slide?.period ?? 0;
  return 0;
}

/** Längste Bewegungs-Periode eines Levels (0 = alles ruht). */
export function levelPeriod(level: Pick<TrickLevel, "props" | "binSlide" | "binFlap">): number {
  return Math.max(Math.abs(level.binSlide?.period ?? 0), level.binFlap?.period ?? 0, ...level.props.map(propPeriod));
}

/** Weht in diesem Level Wind (Gewicht des Gegenstands zählt)? */
export function hasWind(level: Pick<TrickLevel, "props">): boolean {
  return level.props.some((p) => p.kind === "fan");
}

/** Ist der Wurf durch alle nötigen Reifen geflogen (Reihenfolge egal)? */
export function meetsRequirement(level: Pick<TrickLevel, "requires">, passed: number[]): boolean {
  return level.requires.every((id) => passed.includes(id));
}

/** Bonus-Ziel erreicht? Swish = ohne jede Berührung, firstTry = 1. Versuch,
 *  bank = vorher ein Schild berührt. */
export function bonusMet(
  bonus: TrickBonus,
  result: { attempts: number; clean: boolean; banked?: boolean },
): boolean {
  if (bonus === "bank") return !!result.banked;
  return bonus === "swish" ? result.clean : result.attempts <= 1;
}

/** Hat der Wurf ein Schild berührt (Bandenwurf)? `touched` = Hindernis-ids. */
export function bankedOff(level: Pick<TrickLevel, "props">, touched: number[]): boolean {
  return touched.some((id) => level.props[id]?.kind === "sign");
}

/** Sterne: ★ geschafft · ★ höchstens 3 Versuche · ★ Bonus-Ziel. */
export function starsFor(attempts: number, bonus: boolean): 1 | 2 | 3 {
  return (1 + (attempts <= 3 ? 1 : 0) + (bonus ? 1 : 0)) as 1 | 2 | 3;
}
