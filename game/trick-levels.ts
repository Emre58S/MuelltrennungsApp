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
  bonus: TrickBonus;
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
): TrickProp => ({
  kind: "trampoline",
  x,
  y: 0.42,
  z,
  halfW: 0.6,
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
];

/** Kleine Symbole für die Level-Kachel: was einen erwartet (höchstens zwei). */
export function levelIcons(level: Pick<TrickLevel, "props" | "binSlide">): string[] {
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
    if (p.kind === "trampoline")
      return { ...p, x: -p.x, slide: p.slide && { ...p.slide, phase: (p.slide.phase ?? 0) + Math.PI } };
    const m = p.motion;
    const motion: RingMotion | undefined = !m
      ? undefined
      : m.kind === "spin"
        ? { ...m, period: -m.period, phase: -(m.phase ?? 0) }
        : m.axis === "x"
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

/* ── Physik und Wertung ───────────────────────────────────── */

/** Physik-Körper eines Levels (Hindernis-id = Index in `props`). */
export function levelColliders(level: Pick<TrickLevel, "props">): PropCollider[] {
  return level.props.map((p, id): PropCollider => {
    if (p.kind === "ring") return { ...p, id, tube: RING_TUBE };
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
