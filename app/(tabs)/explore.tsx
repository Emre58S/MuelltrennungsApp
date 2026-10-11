/**
 * explore.tsx – optimierte Version (alles in einer Datei)
 *
 * Änderungen gegenüber dem Original:
 *  - Trefferergebnis wird EINMAL pro Wurf am Zielpunkt berechnet (planThrow),
 *    nicht mehr an der verschobenen Bounce-Position. onImpact(result, binIndex).
 *  - "near" (FAST) gibt jetzt wirklich Punkte (vorher wurde "+3" angezeigt, aber nicht gutgeschrieben).
 *  - Highlight leuchtet nur noch, wenn der Wurf wirklich in Reichweite einer Tonne liegt.
 *  - ImpactParticles: kein Geometrie-Spread mehr, onFinished nur einmal.
 *  - Szene bleibt bei Zeitablauf bestehen; Restart-Button im Overlay.
 *  - Gesture wird nur einmal gebaut (useMemo + "latest ref").
 *  - Modell-Erkennung per Regex-Tabelle statt includes-Kette (\bcd\b, \btee ...).
 *  - memo() + stabile Callbacks, geteilte Materialien/Geometrien, weniger Schatten/Lichter.
 *  - Spielstand in useReducer (keine Stale-Closure bei combo mehr).
 *  - Shuffle-Bag statt reinem Zufall (keine schnellen Wiederholungen).
 *  - useWindowDimensions statt Dimensions auf Modulebene.
 *  - UI überarbeitet: Zurück-Button, Modus-Label, Timer-Balken, Item-Karte, Menü-Button im Overlay.
 *  - Nach links wischen = zurück ins Menü (router.back()).
 *  - Rückwand neu: Backsteinwand (InstancedMesh), Betonsockel/-band/-pfeiler, Fallrohr,
 *    Wandlampe mit Lichtschein und "gebackener" Beleuchtung.
 *  - Items: höhere Startposition (nicht mehr unten abgeschnitten), sanftes Schweben,
 *    gleiche Größe/Neigung bei Vorschau und Wurf (kein Sprung), Bodenschatten im Flug.
 *  - HUD kompakter; Multiplikator erscheint knapp über dem mittleren Tonnendeckel.
 *  - Objekt-Modelle überarbeitet (Drehkörper, abgerundete Kanten, zerknittertes Material,
 *    geteilte Geometrien) und "Küchenrolle" ergänzt (fiel vorher auf das graue Standardobjekt zurück).
 *  - Tonnen näher zusammen (BIN_SPACING), damit alle komplett im Bild sind.
 *  - Szene aufpoliert: gepflasterter Boden (Instanced), Kontaktschatten, Pfützen, Laub,
 *    leichter Nebel, weicherer Lampenschein, Verläufe oben/unten.
 *  - Fortschritt wird gespeichert: XP/Level, Streak, Statistik und Bestwert (siehe utils/storage.ts).
 *  - Modi: Unendlich, Survival (endet bei jedem Fehlwurf) und Zeitmodus; Leicht/Schwer entfernt.
 *  - Modelle neu: Bananenschale, Windel, Unterwäsche, Geschenkpapier.
 *  - Toter Code entfernt (getFeedbackText, emoji im Bin, distance im ThrowVector ...).
 */

import { Canvas, useFrame } from "@react-three/fiber/native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as THREE from "three";

import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import {
  getMainGameItems,
  type Item,
  type MainGameCategory,
} from "@/constants/items";
import {
  getHighscoreKey,
  getNumber,
  recordThrow,
  saveHighscore,
} from "@/utils/storage";

/* ═════════════════════════════════════════════════════════════
 * TYPES & CONFIG
 * ═════════════════════════════════════════════════════════════ */

// endless = unendlich, survival = weiter solange man richtig trifft, time = 60 Sekunden
type GameMode = "endless" | "survival" | "time";

type HitResult = "perfect" | "correct" | "near" | "wrongBin" | "miss";

type DifficultyConfig = {
  assistMax: number;
  perfectRadius: number;
  correctRadius: number;
  assistedRadius: number;
};

const DIFFICULTY_CONFIG: Record<GameMode, DifficultyConfig> = {
  endless: {
    assistMax: 0.2,
    perfectRadius: 0.48,
    correctRadius: 1.02,
    assistedRadius: 1.18,
  },
  survival: {
    assistMax: 0.2,
    perfectRadius: 0.48,
    correctRadius: 1.02,
    assistedRadius: 1.18,
  },
  time: {
    assistMax: 0.16,
    perfectRadius: 0.46,
    correctRadius: 0.98,
    assistedRadius: 1.14,
  },
};

// Survival: Diese Ergebnisse beenden die Runde (nur echte Treffer zählen).
const SURVIVAL_ENDS_ON: HitResult[] = ["near", "wrongBin", "miss"];

const COMBO_MULTIPLIERS = [
  { minCombo: 0, multiplier: 1 },
  { minCombo: 2, multiplier: 1.2 },
  { minCombo: 4, multiplier: 1.5 },
  { minCombo: 7, multiplier: 2 },
  { minCombo: 10, multiplier: 3 },
];

type ThrowVector = {
  screenX: number;
  screenY: number;
  speed: number;
  throwId: number;
};

type AimPosition = { x: number; z: number };

type MainBin = {
  category: MainGameCategory;
  color: string;
  colorLight: string;
};

type ImpactEffect = {
  id: number;
  binIndex: number;
  color: string;
};

type ThrowPlan = {
  aim: AimPosition;
  binIndex: number | null;
  enters: boolean;
  near: boolean;
  result: HitResult;
};

const MAIN_BINS: MainBin[] = [
  { category: "Biomüll", color: "#6D4C2A", colorLight: "#8B6B3D" },
  { category: "Gelber Sack", color: "#F9A825", colorLight: "#FBC02D" },
  { category: "Restmüll", color: "#37474F", colorLight: "#546E7A" },
];

const BIN_SCALE = 1.0;

// Nebel in der Ferne (wirkt tiefer, ist aber ein Renderer-Feature). Bei Problemen auf false lassen.
const USE_FOG = false;

// Abstand zwischen den Tonnen (Mittelpunkt zu Mittelpunkt). Eine Tonne ist ca. 1.14 breit.
// Kleiner = näher zusammen. Vorher 1.45 (äußere Tonnen waren am Rand abgeschnitten).
const BIN_SPACING = 1.22;

// Wie weit das Ziel seitlich wandern kann; passend zum Tonnenabstand skaliert,
// damit sich die Wischdistanz zu den Tonnen genauso anfühlt wie vorher.
const AIM_RANGE_X = 3.2 * (BIN_SPACING / 1.45);
const OPEN_LID_ROTATION = Math.PI * 0.62;
const ITEM_SCALE = 0.4;
const ROUND_SECONDS = 60;

// XP pro Wurf – fließt ins Level auf der Startseite (Anpassen nach Geschmack)
const XP_PER_RESULT: Record<HitResult, number> = {
  perfect: 8,
  correct: 5,
  near: 1,
  wrongBin: 0,
  miss: 0,
};

const BIN_OPENING = { halfWidth: 0.56, halfDepth: 0.45 };

// Startposition des Items (y = Höhe, z = Abstand zu den Tonnen; größeres z = näher an der Kamera)
const THROW_START = new THREE.Vector3(0, 0.6, 4.3);
const PREVIEW_SCALE = 0.58;
const PREVIEW_ROTATION: [number, number, number] = [0.15, -0.25, 0.1];

/* ═════════════════════════════════════════════════════════════
 * SPIELLOGIK (reine Funktionen)
 * ═════════════════════════════════════════════════════════════ */

function getDifficultyConfig(mode: GameMode): DifficultyConfig {
  return DIFFICULTY_CONFIG[mode];
}

function getComboMultiplier(combo: number): number {
  let multiplier = 1;
  for (const tier of COMBO_MULTIPLIERS) {
    if (combo >= tier.minCombo) multiplier = tier.multiplier;
  }
  return multiplier;
}

function getBinPosition(index: number) {
  return { x: (index - 1) * BIN_SPACING, z: -1.85 };
}

function getOpeningBounds(_mode: GameMode) {
  const scale = 1;
  return {
    halfWidth: BIN_OPENING.halfWidth * BIN_SCALE * scale,
    halfDepth: BIN_OPENING.halfDepth * BIN_SCALE * scale,
  };
}

function isInsideBinOpening(
  x: number,
  z: number,
  binIndex: number,
  mode: GameMode,
): boolean {
  const bin = getBinPosition(binIndex);
  const { halfWidth, halfDepth } = getOpeningBounds(mode);
  return Math.abs(x - bin.x) <= halfWidth && Math.abs(z - bin.z) <= halfDepth;
}

function getItemPool(_mode: GameMode): Item[] {
  return getMainGameItems();
}

function normalizeCategory(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss");
}

function getClosestBin(x: number, z: number) {
  let closestIndex = -1;
  let closestDistance = Infinity;

  for (let index = 0; index < MAIN_BINS.length; index++) {
    const position = getBinPosition(index);
    const distance = Math.hypot(x - position.x, z - position.z);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }

  return { index: closestIndex, distance: closestDistance };
}

function getPreviewTarget(
  translationX: number,
  translationY: number,
): AimPosition {
  const horizontalRatio = THREE.MathUtils.clamp(translationX / 280, -1, 1);
  const verticalRatio = THREE.MathUtils.clamp(-translationY / 420, 0, 1);

  return {
    x: horizontalRatio * AIM_RANGE_X,
    z: -0.35 - verticalRatio * 2.8,
  };
}

function applySoftAimAssist(x: number, z: number, mode: GameMode): AimPosition {
  const closest = getClosestBin(x, z);
  const config = getDifficultyConfig(mode);

  if (closest.index === -1 || closest.distance > config.assistedRadius) {
    return { x, z };
  }

  const bin = getBinPosition(closest.index);
  const normalizedDistance =
    (config.assistedRadius - closest.distance) / config.assistedRadius;
  const strength = THREE.MathUtils.clamp(
    normalizedDistance * config.assistMax,
    0,
    config.assistMax,
  );

  return {
    x: THREE.MathUtils.lerp(x, bin.x, strength),
    z: THREE.MathUtils.lerp(z, bin.z, strength),
  };
}

function getHitResult(
  x: number,
  z: number,
  itemCategory: string,
  mode: GameMode,
): HitResult {
  const closest = getClosestBin(x, z);
  const config = getDifficultyConfig(mode);

  if (closest.index === -1 || closest.distance > config.assistedRadius) {
    return "miss";
  }

  const isCorrect =
    normalizeCategory(MAIN_BINS[closest.index].category) ===
    normalizeCategory(itemCategory);

  if (!isCorrect) return "wrongBin";

  const insideOpening = isInsideBinOpening(x, z, closest.index, mode);

  if (insideOpening && closest.distance <= config.perfectRadius) {
    return "perfect";
  }
  if (insideOpening || closest.distance <= config.correctRadius) {
    return "correct";
  }
  return "near";
}

/** Berechnet Ziel, Bin und Ergebnis eines Wurfs genau einmal. */
function planThrow(
  vector: ThrowVector,
  category: string,
  mode: GameMode,
): ThrowPlan {
  const raw = getPreviewTarget(vector.screenX, vector.screenY);
  const aim = applySoftAimAssist(raw.x, raw.z, mode);
  const closest = getClosestBin(aim.x, aim.z);
  const near =
    closest.index !== -1 &&
    closest.distance <= getDifficultyConfig(mode).assistedRadius;
  const binIndex = near ? closest.index : null;
  const result = getHitResult(aim.x, aim.z, category, mode);
  const scored = result === "perfect" || result === "correct";
  const overOpening =
    binIndex !== null && isInsideBinOpening(aim.x, aim.z, binIndex, mode);

  return {
    aim,
    binIndex,
    near,
    result,
    // Das Item fällt sichtbar in die Tonne, wenn es über der Öffnung liegt
    // oder als Treffer gewertet wird (visuell konsistent mit der Wertung).
    enters: binIndex !== null && (overOpening || scored),
  };
}

function getScoreForResult(result: HitResult, combo: number): number {
  const baseScore =
    result === "perfect"
      ? 25
      : result === "correct"
        ? 10
        : result === "near"
          ? 3
          : 0;

  if (baseScore === 0) return 0;
  return Math.round(baseScore * getComboMultiplier(combo));
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Shuffle-Bag: jedes Item kommt einmal pro Runde, keine direkten Wiederholungen. */
function drawFromBag(
  bagRef: { current: Item[] },
  pool: Item[],
  exclude?: string,
): Item | null {
  if (pool.length === 0) return null;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (bagRef.current.length === 0) bagRef.current = shuffle(pool);
    const index = bagRef.current.findIndex((i) => i.name !== exclude);
    if (index !== -1) return bagRef.current.splice(index, 1)[0];
    bagRef.current = [];
  }

  return pool[0];
}

/* ── Spielstand (Reducer) ─────────────────────────────────── */

type Stats = {
  score: number;
  combo: number;
  maxCombo: number;
  throwCount: number;
  lastPoints: number;
};

type StatsAction =
  | { type: "reset" }
  | { type: "throw" }
  | { type: "result"; result: HitResult };

const INITIAL_STATS: Stats = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  throwCount: 0,
  lastPoints: 0,
};

function statsReducer(state: Stats, action: StatsAction): Stats {
  switch (action.type) {
    case "reset":
      return INITIAL_STATS;

    case "throw":
      return { ...state, throwCount: state.throwCount + 1 };

    case "result": {
      const points = getScoreForResult(action.result, state.combo);

      if (action.result === "perfect" || action.result === "correct") {
        const combo = state.combo + 1;
        return {
          ...state,
          score: state.score + points,
          combo,
          maxCombo: Math.max(state.maxCombo, combo),
          lastPoints: points,
        };
      }

      if (action.result === "near") {
        // Combo bleibt unverändert, aber es gibt Punkte
        return { ...state, score: state.score + points, lastPoints: points };
      }

      return { ...state, combo: Math.max(state.combo - 1, 0), lastPoints: 0 };
    }
  }
}

/* ═════════════════════════════════════════════════════════════
 * 3D: MODELLE DER MÜLLOBJEKTE
 * ═════════════════════════════════════════════════════════════ */

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

// Reihenfolge entscheidet – spezifische Regeln zuerst.
// Nur Items aus Biomüll, Gelber Sack und Restmüll (das sind die im Spiel genutzten).
const MODEL_RULES: [RegExp, string][] = [
  // Biomüll
  [/kuechenrolle/, "kitchenroll"],
  [/bananenschale|banane|banana/, "banana"],
  [/kaffee/, "coffee"],
  [/eierschale/, "eggshell"],
  [/kartoffelschale|karottenschale|zwiebelschale/, "peel"],
  [/teebeutel|\btee/, "teabag"],
  [/brot/, "bread"],
  [/laub/, "leaves"],
  [/nuss/, "nut"],
  [/maiskolben/, "corn"],
  [/apfel|apple/, "apple"],
  [/blume/, "flower"],
  // Gelber Sack
  [/aluschale/, "alutray"],
  [/alufolie|alu folie/, "foil"],
  [/joghurt|becher/, "yogurt"],
  [/konserve|dose/, "can"],
  [/shampoo|spuelmittel/, "bottle"],
  [/getraenkekarton|milchkarton/, "carton"],
  [/plastiktuete|plastiktute/, "bag"],
  [/plastikflasche/, "pet"],
  [/metalldeckel|deckel/, "lid"],
  [/chipstuete|chipstute/, "chips"],
  [/styropor/, "styro"],
  [/zahnpasta|tube/, "tube"],
  [/butterverpackung/, "butter"],
  [/eisverpackung/, "icecream"],
  // Restmüll
  [/zahnbuerste|zahnburste/, "toothbrush"],
  [/kassenzettel/, "receipt"],
  [/windel/, "diaper"],
  [/pizzakarton/, "pizza"],
  [/gluhbirne|gluehbirne/, "bulb"],
  [/geschirr/, "dish"],
  [/staubsauger/, "vacuum"],
  [/kugelschreiber/, "pen"],
  [/einwegrasierer|rasierer/, "razor"],
  [/wattestaebchen|wattestabchen/, "swab"],
  [/spiegel/, "mirror"],
  [/\bcd\b/, "cd"],
  [/zigarettenkippe/, "cigarette"],
  [/pflaster/, "plaster"],
  [/unterwaesche/, "underwear"],
  [/katzenstreu/, "litter"],
  [/tapeten/, "wallpaper"],
  [/geschenkpapier/, "wrap"],
];

function resolveModelKey(name: string): string {
  return MODEL_RULES.find(([re]) => re.test(name))?.[1] ?? "fallback";
}

/* ── Hilfsfunktionen für die Objekt-Modelle ───────────────────────────────
 * Geometrien werden einmal erzeugt und danach geteilt (Cache), Teile werden
 * über <Part /> zusammengesetzt. So bleiben die Modelle kurz und schnell.
 */

const geoCache = new Map<string, THREE.BufferGeometry>();

function memoGeo<A extends unknown[]>(
  name: string,
  build: (...args: A) => THREE.BufferGeometry,
) {
  return (...args: A): THREE.BufferGeometry => {
    const key = `${name}:${args.join(",")}`;
    let geometry = geoCache.get(key);
    if (!geometry) {
      geometry = build(...args);
      geoCache.set(key, geometry);
    }
    return geometry;
  };
}

function polyShape(points: number[]) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points.length; i += 2) {
    if (i === 0) shape.moveTo(points[i], points[i + 1]);
    else shape.lineTo(points[i], points[i + 1]);
  }
  shape.closePath();
  return shape;
}

const G = {
  /** Quader mit abgerundeten Kanten */
  box: memoGeo("box", (w: number, h: number, d: number, r: number = 0.03) => {
    const rr = Math.max(
      Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001),
      0.001,
    );
    const hw = w / 2 - rr;
    const hh = h / 2 - rr;
    const geometry = new THREE.ExtrudeGeometry(
      polyShape([-hw, -hh, hw, -hh, hw, hh, -hw, hh]),
      {
        depth: Math.max(d - rr * 2, 0.001),
        bevelEnabled: true,
        bevelThickness: rr,
        bevelSize: rr,
        bevelSegments: 2,
        curveSegments: 1,
      },
    );
    geometry.center();
    return geometry;
  }),

  cyl: memoGeo(
    "cyl",
    (
      rt: number,
      rb: number,
      h: number,
      seg: number = 16,
      open: boolean = false,
      ts: number = 0,
      tl: number = Math.PI * 2,
    ) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl),
  ),

  ball: memoGeo(
    "ball",
    (
      r: number,
      ws: number = 14,
      hs: number = 10,
      ts: number = 0,
      tl: number = Math.PI,
    ) => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, ts, tl),
  ),

  torus: memoGeo(
    "torus",
    (
      R: number,
      r: number,
      rs: number = 8,
      ts: number = 18,
      arc: number = Math.PI * 2,
    ) => new THREE.TorusGeometry(R, r, rs, ts, arc),
  ),

  cone: memoGeo(
    "cone",
    (r: number, h: number, seg: number = 12) =>
      new THREE.ConeGeometry(r, h, seg),
  ),

  ring: memoGeo(
    "ring",
    (ri: number, ro: number, seg: number = 24) =>
      new THREE.RingGeometry(ri, ro, seg),
  ),

  circle: memoGeo(
    "circle",
    (r: number, seg: number = 20) => new THREE.CircleGeometry(r, seg),
  ),

  /** Drehkörper: pts = [radius, höhe, radius, höhe, ...] von unten nach oben */
  lathe: memoGeo("lathe", (seg: number, pts: number[]) => {
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      profile.push(new THREE.Vector2(pts[i], pts[i + 1]));
    }
    return new THREE.LatheGeometry(profile, seg);
  }),

  /** Flache Form aus Umriss-Punkten (x, y, x, y, ...) mit Dicke */
  poly: memoGeo("poly", (depth: number, bevel: number, pts: number[]) => {
    const geometry = new THREE.ExtrudeGeometry(polyShape(pts), {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 1,
      curveSegments: 1,
    });
    geometry.center();
    return geometry;
  }),

  /** Zerknitterte Kugel (Folie, Papier, Brot, Streu ...) */
  crumple: memoGeo(
    "crumple",
    (r: number, amp: number, seed: number, detail: number = 1) => {
      const geometry = new THREE.IcosahedronGeometry(r, detail);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const n =
          Math.sin(x * 11 + seed) * Math.cos(y * 9 - seed * 1.3) +
          Math.sin(z * 13 + seed * 0.7) * 0.7 +
          Math.sin((x + y + z) * 17 + seed) * 0.4;
        const k = 1 + (amp * n) / 2.1;
        p.setXYZ(i, x * k, y * k, z * k);
      }
      geometry.computeVertexNormals();
      return geometry;
    },
  ),

  /** Gewellte Fläche (Folie, Papier) */
  wave: memoGeo(
    "wave",
    (w: number, h: number, amp: number, freq: number, seed: number = 0) => {
      const geometry = new THREE.PlaneGeometry(w, h, 10, 8);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        p.setZ(
          i,
          amp * (Math.sin(x * freq + seed) + Math.cos(y * freq * 1.3 - seed)),
        );
      }
      geometry.computeVertexNormals();
      return geometry;
    },
  ),

  /** Gebogenes Rohr entlang von Punkten (x, y, z, ...) */
  tube: memoGeo("tube", (r: number, pts: number[]) => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < pts.length; i += 3) {
      points.push(new THREE.Vector3(pts[i], pts[i + 1], pts[i + 2]));
    }
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      18,
      r,
      6,
      false,
    );
  }),
};

type V3 = [number, number, number];

type MatProps = {
  color: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  flat?: boolean;
  double?: boolean;
  emissive?: string;
};

type PartProps = MatProps & {
  geo: THREE.BufferGeometry;
  pos?: V3;
  rot?: V3;
  scale?: V3 | number;
  /** Unbeleuchtet (für Aufdrucke, Löcher, Linien) */
  basic?: boolean;
  /** Schreibt nicht in den Tiefenpuffer (für weiche, überlagerte Flächen) */
  noDepthWrite?: boolean;
};

function Part({
  geo: geometry,
  pos,
  rot,
  scale,
  basic,
  noDepthWrite,
  color,
  roughness = 0.8,
  metalness = 0,
  opacity = 1,
  flat,
  double,
  emissive,
}: PartProps) {
  const side = double ? THREE.DoubleSide : THREE.FrontSide;
  const transparent = opacity < 1;

  return (
    <mesh
      geometry={geometry}
      position={pos}
      rotation={rot}
      scale={scale}
      castShadow={!basic}
    >
      {basic ? (
        <meshBasicMaterial
          color={color}
          transparent={transparent}
          opacity={opacity}
          side={side}
          depthWrite={!noDepthWrite}
        />
      ) : (
        <meshStandardMaterial
          color={color}
          roughness={roughness}
          metalness={metalness}
          transparent={transparent}
          opacity={opacity}
          flatShading={flat}
          side={side}
          emissive={emissive}
          depthWrite={!noDepthWrite}
        />
      )}
    </mesh>
  );
}

// ── Statische Umrisse ─────────────────────────────────────────────────────

const LEAF_POINTS = (() => {
  const n = 7;
  const width = (t: number) =>
    0.16 * Math.pow(Math.sin(Math.PI * t), 0.75) * (1 - 0.25 * t);
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(width(t), -0.25 + t * 0.5);
  }
  for (let i = n - 1; i >= 1; i--) {
    const t = i / n;
    pts.push(-width(t), -0.25 + t * 0.5);
  }
  return pts;
})();

// Pflasterstreifen mit runden Enden
const STRIP_POINTS = (() => {
  const w = 0.64;
  const r = 0.085;
  const pts: number[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    pts.push(w / 2 - r + Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 8;
    pts.push(-(w / 2 - r) + Math.cos(a) * r, Math.sin(a) * r);
  }
  return pts;
})();

const UNDERWEAR_POINTS = [
  -0.3, 0.25, 0.3, 0.25, 0.3, 0.1, 0.26, -0.02, 0.19, -0.13, 0.12, -0.22, 0.09,
  -0.28, -0.09, -0.28, -0.12, -0.22, -0.19, -0.13, -0.26, -0.02, -0.3, 0.1,
];

const MIRROR_SHARDS: { pts: number[]; pos: V3; rot: V3 }[] = [
  {
    pts: [-0.28, -0.12, -0.02, -0.2, 0.02, 0.1, -0.24, 0.2],
    pos: [-0.12, 0, 0],
    rot: [0.05, 0.1, 0.08],
  },
  {
    pts: [0.04, -0.18, 0.3, -0.14, 0.24, 0.1, 0.06, 0.12],
    pos: [0.1, -0.02, 0.03],
    rot: [-0.08, -0.12, -0.1],
  },
  {
    pts: [-0.06, 0.14, 0.2, 0.14, 0.12, 0.3, -0.12, 0.28],
    pos: [0, 0.05, 0.05],
    rot: [0.12, 0.05, 0.15],
  },
  {
    pts: [0.1, -0.26, 0.26, -0.22, 0.18, -0.12],
    pos: [0.1, -0.06, 0.02],
    rot: [0.1, 0.2, -0.3],
  },
];

function renderModel(key: string, name: string) {
  switch (key) {
    /* ═══════════════ BIOMÜLL ═══════════════ */

    case "banana":
      return (
        <group rotation={[0.15, 0.2, -0.15]} scale={0.85}>
          {/* Stielansatz und Mitte */}
          <Part
            geo={G.cyl(0.045, 0.06, 0.16, 10)}
            pos={[0, 0.34, 0]}
            rot={[0, 0, 0.1]}
            color="#6B4A22"
            roughness={1}
          />
          <Part
            geo={G.ball(0.1, 12, 8)}
            pos={[0, 0.2, 0]}
            scale={[1.1, 0.8, 0.5]}
            color="#EAB308"
            roughness={0.8}
          />
          {/* drei aufgeklappte Schalenlappen */}
          {[-1.0, 0, 1.0].map((a, i) => {
            const len = i === 1 ? 0.54 : 0.48;
            const dx = Math.sin(a);
            const dy = -Math.cos(a);
            const dist = len / 2 + 0.04;
            const cx = dx * dist;
            const cy = 0.2 + dy * dist;
            const sy = len / 0.2;
            const tip = len + 0.04;
            const spot = 0.04 + len * 0.6;

            return (
              <group key={i}>
                <Part
                  geo={G.ball(0.1, 12, 8)}
                  pos={[cx, cy, 0]}
                  rot={[0, 0, Math.PI + a]}
                  scale={[0.95, sy, 0.12]}
                  color="#F2C811"
                  roughness={0.8}
                />
                <Part
                  geo={G.ball(0.1, 12, 8)}
                  pos={[cx, cy, 0.028]}
                  rot={[0, 0, Math.PI + a]}
                  scale={[0.62, sy * 0.88, 0.12]}
                  color="#FDE9A9"
                  roughness={0.9}
                />
                <Part
                  geo={G.ball(0.035, 8, 6)}
                  pos={[dx * tip, 0.2 + dy * tip, 0]}
                  color="#4A3216"
                  roughness={1}
                />
                <Part
                  geo={G.circle(0.02, 10)}
                  pos={[
                    dx * spot - dy * 0.025,
                    0.2 + dy * spot + dx * 0.025,
                    0.046,
                  ]}
                  basic
                  color="#8A5A2B"
                  opacity={0.6}
                />
              </group>
            );
          })}
        </group>
      );

    case "coffee":
      return (
        <group rotation={[0.15, 0.35, -0.1]}>
          {/* Kaffeefilter */}
          <Part
            geo={G.lathe(20, [0.02, -0.22, 0.2, 0.12, 0.26, 0.2])}
            double
            color="#E7D8B8"
            roughness={1}
          />
          <Part
            geo={G.torus(0.26, 0.012, 6, 20)}
            pos={[0, 0.2, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#D6C7A4"
            roughness={1}
          />
          {/* Kaffeesatz */}
          <Part
            geo={G.crumple(0.16, 0.18, 3, 1)}
            pos={[0, 0.1, 0]}
            scale={[1, 0.55, 1]}
            flat
            color="#3B2418"
            roughness={1}
          />
        </group>
      );

    case "eggshell":
      return (
        <group rotation={[0.2, -0.25, 0.12]}>
          <Part
            geo={G.ball(0.22, 9, 6, 0, Math.PI * 0.56)}
            pos={[-0.14, 0, 0]}
            rot={[0.2, 0.1, -0.25]}
            double
            flat
            color="#F4E8CC"
            roughness={0.9}
          />
          <Part
            geo={G.ball(0.18, 8, 5, 0, Math.PI * 0.58)}
            pos={[0.16, -0.03, 0.06]}
            rot={[0.15, -0.2, 0.28]}
            double
            flat
            color="#FFF7E8"
            roughness={0.9}
          />
          <Part
            geo={G.ball(0.1, 6, 4, 0, Math.PI * 0.5)}
            pos={[0.02, 0.05, 0.2]}
            rot={[1.2, 0.4, 0.2]}
            double
            flat
            color="#EFE2C4"
            roughness={0.9}
          />
        </group>
      );

    case "peel": {
      const isCarrot = name.includes("karotte");
      const c1 = isCarrot ? "#F97316" : "#C2860A";
      const c2 = isCarrot ? "#FB923C" : "#A16207";
      const c3 = isCarrot ? "#EA580C" : "#D9A441";

      return (
        <group rotation={[0.28, 0.2, -0.3]}>
          <Part
            geo={G.torus(0.23, 0.045, 6, 18, Math.PI * 1.35)}
            scale={[1, 1, 0.5]}
            color={c1}
            roughness={0.9}
          />
          <Part
            geo={G.torus(0.15, 0.035, 6, 14, Math.PI * 1.18)}
            pos={[0.13, 0.08, 0.03]}
            rot={[0.3, -0.3, 0.15]}
            scale={[1, 1, 0.5]}
            color={c2}
            roughness={0.9}
          />
          <Part
            geo={G.torus(0.1, 0.03, 6, 12, Math.PI * 1.5)}
            pos={[-0.12, -0.1, 0.05]}
            rot={[-0.4, 0.3, 0.8]}
            scale={[1, 1, 0.5]}
            color={c3}
            roughness={0.9}
          />
        </group>
      );
    }

    case "teabag":
      return (
        <group rotation={[0.1, 0.28, -0.18]}>
          <Part
            geo={G.box(0.3, 0.34, 0.05, 0.02)}
            color="#D9C29A"
            roughness={0.95}
          />
          <Part
            geo={G.circle(0.075, 14)}
            pos={[0.02, -0.03, 0.027]}
            basic
            color="#7A5230"
            opacity={0.55}
          />
          <Part
            geo={G.box(0.3, 0.035, 0.06, 0.01)}
            pos={[0, 0.185, 0]}
            color="#B89D74"
            roughness={0.95}
          />
          <Part
            geo={G.cyl(0.006, 0.006, 0.3, 6)}
            pos={[0.05, 0.34, 0]}
            rot={[0, 0, 0.15]}
            color="#E5E7EB"
          />
          <Part
            geo={G.box(0.14, 0.11, 0.02, 0.01)}
            pos={[0.1, 0.52, 0]}
            rot={[0, 0, 0.2]}
            color="#22C55E"
          />
        </group>
      );

    case "bread":
      return (
        <group rotation={[0.15, -0.28, 0.08]}>
          <Part
            geo={G.ball(0.3, 20, 14)}
            scale={[1.15, 0.7, 0.8]}
            color="#B86629"
            roughness={0.95}
          />
          {[-0.14, 0, 0.14].map((x) => (
            <Part
              key={x}
              geo={G.box(0.05, 0.03, 0.2, 0.01)}
              pos={[x, 0.2, 0.04]}
              rot={[0.25, 0, 0.5]}
              color="#F2C27A"
              roughness={1}
            />
          ))}
          {/* Schimmelflecken */}
          {(
            [
              [0.2, 0.12, 0.15],
              [-0.22, 0.1, 0.18],
              [0.05, 0.2, -0.1],
            ] as V3[]
          ).map((p, i) => (
            <Part
              key={i}
              geo={G.crumple(0.05, 0.3, i + 2, 1)}
              pos={p}
              flat
              color={i === 1 ? "#9CA3AF" : "#7C9A6B"}
              roughness={1}
            />
          ))}
        </group>
      );

    case "leaves":
      return (
        <group rotation={[0.2, -0.25, 0.28]}>
          {(
            [
              { p: [0, 0, 0], r: [-0.9, 0, 0.3], c: "#B45309" },
              { p: [0.14, 0.04, 0.06], r: [-1.0, 0.3, -0.7], c: "#CA8A04" },
              { p: [-0.1, 0.02, -0.08], r: [-0.8, -0.4, 1.5], c: "#9A3412" },
            ] as { p: V3; r: V3; c: string }[]
          ).map((leaf, i) => (
            <group key={i} position={leaf.p} rotation={leaf.r}>
              <Part
                geo={G.poly(0.012, 0.004, LEAF_POINTS)}
                double
                color={leaf.c}
                roughness={1}
              />
              <Part
                geo={G.box(0.012, 0.5, 0.004, 0.002)}
                pos={[0, 0, 0.01]}
                color="#5B2A0A"
                roughness={1}
              />
            </group>
          ))}
        </group>
      );

    case "nut":
      return (
        <group rotation={[0.2, 0.25, -0.12]}>
          <Part
            geo={G.crumple(0.16, 0.16, 5, 1)}
            pos={[-0.13, 0, 0]}
            scale={[1.05, 0.8, 0.9]}
            flat
            color="#8B5A2B"
            roughness={1}
          />
          <Part
            geo={G.crumple(0.14, 0.16, 7, 1)}
            pos={[0.14, 0.03, 0.05]}
            rot={[0.4, 0.5, 0.2]}
            scale={[1, 0.8, 0.9]}
            flat
            color="#A66A39"
            roughness={1}
          />
          <Part
            geo={G.crumple(0.05, 0.3, 9, 0)}
            pos={[0, -0.1, 0.18]}
            flat
            color="#6B4423"
            roughness={1}
          />
        </group>
      );

    case "corn":
      return (
        <group rotation={[0.1, 0.25, -0.35]}>
          {/* Körner (unten) */}
          <Part
            geo={G.cyl(0.13, 0.14, 0.3, 14)}
            pos={[0, -0.13, 0]}
            flat
            color="#F5CB3D"
            roughness={0.75}
          />
          {[-0.22, -0.14, -0.06].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.136, 0.011, 5, 14)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#C99A12"
              roughness={0.9}
            />
          ))}
          {/* abgenagter Kolben (oben) */}
          <Part
            geo={G.cyl(0.11, 0.13, 0.28, 12)}
            pos={[0, 0.16, 0]}
            flat
            color="#EBD9A0"
            roughness={0.9}
          />
          {/* Lieschblätter */}
          <Part
            geo={G.ball(0.1, 10, 8)}
            pos={[0.1, -0.3, 0.02]}
            rot={[0, 0, -0.3]}
            scale={[0.6, 2.2, 0.25]}
            color="#65A30D"
            roughness={0.9}
          />
          <Part
            geo={G.ball(0.1, 10, 8)}
            pos={[-0.09, -0.3, -0.03]}
            rot={[0, 0, 0.35]}
            scale={[0.6, 2.0, 0.25]}
            color="#84CC16"
            roughness={0.9}
          />
          <Part
            geo={G.cyl(0.03, 0.04, 0.08, 8)}
            pos={[0, -0.34, 0]}
            color="#7C5A2E"
            roughness={1}
          />
        </group>
      );

    case "apple":
      return (
        <group rotation={[0.1, 0.2, 0.1]}>
          <Part
            geo={G.lathe(
              16,
              [
                0, -0.32, 0.1, -0.3, 0.17, -0.2, 0.11, -0.08, 0.07, 0, 0.11,
                0.08, 0.17, 0.2, 0.1, 0.3, 0, 0.32,
              ],
            )}
            color="#F4E7B8"
            roughness={0.7}
          />
          <Part
            geo={G.cyl(0.076, 0.076, 0.16, 12)}
            color="#7A5230"
            roughness={0.9}
          />
          {[0.2, -0.2].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.168, 0.02, 6, 16)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#B91C1C"
              roughness={0.6}
            />
          ))}
          <Part
            geo={G.cyl(0.018, 0.024, 0.12, 8)}
            pos={[0, 0.37, 0]}
            rot={[0, 0, -0.2]}
            color="#5B3716"
            roughness={1}
          />
        </group>
      );

    case "flower":
      return (
        <group rotation={[0.05, 0.2, -0.12]}>
          <Part
            geo={G.tube(
              0.025,
              [
                0, -0.35, 0, 0, -0.1, 0, 0.06, 0.14, 0, 0.18, 0.27, 0, 0.28,
                0.24, 0,
              ],
            )}
            color="#4D7C0F"
            roughness={0.9}
          />
          <Part
            geo={G.ball(0.1, 10, 8)}
            pos={[-0.08, -0.15, 0]}
            rot={[0, 0, 0.8]}
            scale={[0.5, 1.8, 0.15]}
            color="#65742B"
            roughness={0.9}
          />
          {/* hängender Blütenkopf */}
          <group position={[0.3, 0.2, 0]} rotation={[1.0, 0.2, 0]}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 7]}>
                <Part
                  geo={G.ball(0.07, 8, 6)}
                  pos={[0, 0.12, 0]}
                  scale={[0.6, 1.5, 0.25]}
                  color={
                    i % 3 === 0 ? "#7C4A3A" : i % 2 ? "#B96A8A" : "#A3506F"
                  }
                  roughness={0.9}
                />
              </group>
            ))}
            <Part geo={G.ball(0.055, 8, 6)} color="#8A5A2B" roughness={0.9} />
          </group>
        </group>
      );

    case "kitchenroll":
      return (
        <group rotation={[0.2, 0.3, -0.1]}>
          <Part
            geo={G.cyl(0.2, 0.2, 0.4, 24, true)}
            double
            color="#F8FAFC"
            roughness={0.95}
          />
          <Part
            geo={G.ring(0.062, 0.2, 24)}
            pos={[0, 0.2, 0]}
            rot={[-Math.PI / 2, 0, 0]}
            color="#F1F5F9"
            roughness={1}
          />
          <Part
            geo={G.ring(0.062, 0.2, 24)}
            pos={[0, -0.2, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#F1F5F9"
            roughness={1}
          />
          <Part
            geo={G.cyl(0.062, 0.062, 0.402, 16, true)}
            double
            color="#B08B5B"
            roughness={1}
          />
          {[-0.1, 0.1].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.2, 0.004, 4, 24)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#CBD5E1"
              roughness={1}
            />
          ))}
          <Part
            geo={G.wave(0.3, 0.34, 0.012, 10, 0)}
            pos={[0.14, -0.23, 0.2]}
            rot={[-1.2, 0, 0]}
            double
            color="#FFFFFF"
            roughness={1}
          />
        </group>
      );

    /* ═══════════════ GELBER SACK ═══════════════ */

    case "foil":
      return (
        <group rotation={[0.2, -0.28, 0.12]}>
          <Part
            geo={G.crumple(0.22, 0.28, 11, 1)}
            pos={[-0.1, 0.05, 0]}
            flat
            color="#D5DCE6"
            roughness={0.3}
            metalness={0.5}
          />
          <Part
            geo={G.wave(0.42, 0.34, 0.035, 9, 2)}
            pos={[0.2, -0.08, 0.1]}
            rot={[-1.2, 0, 0.4]}
            double
            flat
            color="#E2E8F0"
            roughness={0.28}
            metalness={0.5}
          />
        </group>
      );

    case "alutray":
      return (
        <group rotation={[0.35, 0.3, 0.05]}>
          <Part
            geo={G.cyl(0.34, 0.26, 0.12, 4, true)}
            rot={[0, Math.PI / 4, 0]}
            double
            color="#C9D1DC"
            roughness={0.35}
            metalness={0.5}
          />
          <Part
            geo={G.cyl(0.26, 0.26, 0.01, 4)}
            pos={[0, -0.055, 0]}
            rot={[0, Math.PI / 4, 0]}
            color="#9AA5B4"
            roughness={0.4}
            metalness={0.5}
          />
          <Part
            geo={G.cyl(0.355, 0.345, 0.016, 4, true)}
            pos={[0, 0.058, 0]}
            rot={[0, Math.PI / 4, 0]}
            double
            color="#DDE3EA"
            roughness={0.3}
            metalness={0.5}
          />
        </group>
      );

    case "yogurt":
      return (
        <group rotation={[0.08, 0.2, -0.08]}>
          <Part
            geo={G.lathe(
              24,
              [
                0, -0.28, 0.15, -0.28, 0.22, 0.2, 0.245, 0.24, 0.245, 0.28,
                0.23, 0.28,
              ],
            )}
            double
            color="#F8FAFC"
            roughness={0.6}
          />
          <Part
            geo={G.cyl(0.208, 0.178, 0.2, 24, true)}
            pos={[0, -0.03, 0]}
            double
            color="#EC4899"
            roughness={0.6}
          />
          {/* abgerissener Alu-Deckel */}
          <Part
            geo={G.cyl(0.235, 0.235, 0.008, 20)}
            pos={[0.2, 0.32, 0]}
            rot={[0, 0, -1.0]}
            color="#D5DCE6"
            roughness={0.3}
            metalness={0.5}
          />
        </group>
      );

    case "can":
      return (
        <group rotation={[0.05, 0.3, -0.05]}>
          <Part
            geo={G.cyl(0.23, 0.23, 0.5, 20)}
            color="#C0C8D4"
            roughness={0.35}
            metalness={0.5}
          />
          <Part
            geo={G.cyl(0.236, 0.236, 0.26, 20, true)}
            double
            color="#DC2626"
            roughness={0.6}
          />
          <Part
            geo={G.cyl(0.238, 0.238, 0.04, 20, true)}
            pos={[0, 0.03, 0]}
            double
            color="#FDE68A"
            roughness={0.6}
          />
          {[0.25, -0.25].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.23, 0.016, 6, 20)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#9AA6B6"
              roughness={0.4}
              metalness={0.6}
            />
          ))}
          <Part
            geo={G.cyl(0.19, 0.19, 0.01, 20)}
            pos={[0, 0.255, 0]}
            color="#AEB8C6"
            roughness={0.35}
            metalness={0.5}
          />
          <Part
            geo={G.torus(0.05, 0.011, 6, 14)}
            pos={[0.04, 0.275, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#DDE3EA"
            roughness={0.3}
            metalness={0.6}
          />
          <Part
            geo={G.box(0.09, 0.012, 0.04, 0.005)}
            pos={[-0.02, 0.268, 0]}
            color="#DDE3EA"
            roughness={0.3}
            metalness={0.6}
          />
        </group>
      );

    case "bottle": {
      const shampoo = name.includes("shampoo");
      const body = shampoo ? "#2563EB" : "#22C55E";
      const accent = shampoo ? "#F8FAFC" : "#FDE047";

      return (
        <group rotation={[0.08, -0.25, 0.08]}>
          <Part
            geo={G.lathe(
              24,
              [
                0, -0.34, 0.17, -0.34, 0.215, -0.3, 0.225, -0.2, 0.225, 0.1,
                0.19, 0.2, 0.09, 0.26, 0.08, 0.3,
              ],
            )}
            color={body}
            roughness={0.4}
          />
          <Part
            geo={G.cyl(0.228, 0.228, 0.22, 24, true)}
            pos={[0, -0.07, 0]}
            double
            color={accent}
            roughness={0.6}
          />
          <Part
            geo={G.circle(0.065, 18)}
            pos={[0, -0.07, 0.229]}
            basic
            color={body}
          />
          <Part
            geo={G.torus(0.082, 0.015, 6, 16)}
            pos={[0, 0.3, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#F8FAFC"
            roughness={0.5}
          />
          <Part
            geo={G.cyl(0.09, 0.095, 0.12, 16)}
            pos={[0, 0.37, 0]}
            color={shampoo ? "#F8FAFC" : "#0F172A"}
            roughness={0.45}
          />
          <Part
            geo={G.cyl(0.03, 0.035, 0.07, 10)}
            pos={[0.06, 0.45, 0]}
            rot={[0, 0, -0.9]}
            color={shampoo ? "#E2E8F0" : "#1E293B"}
            roughness={0.45}
          />
        </group>
      );
    }

    case "carton": {
      const milk = name.includes("milch");
      const band = milk ? "#2563EB" : "#F97316";

      return (
        <group rotation={[0.08, -0.28, 0.05]}>
          <Part
            geo={G.box(0.34, 0.5, 0.34, 0.02)}
            color="#F8FAFC"
            roughness={0.7}
          />
          <Part
            geo={G.box(0.345, 0.18, 0.345, 0.015)}
            pos={[0, -0.08, 0]}
            color={band}
            roughness={0.6}
          />
          <Part
            geo={G.circle(0.06, 18)}
            pos={[0, -0.08, 0.176]}
            basic
            color="#FFFFFF"
          />
          {/* Giebeldach */}
          <Part
            geo={G.poly(0.34, 0.01, [-0.17, 0, 0.17, 0, 0, 0.15])}
            pos={[0, 0.325, 0]}
            color="#F8FAFC"
            roughness={0.7}
          />
          <Part
            geo={G.box(0.02, 0.03, 0.34, 0.005)}
            pos={[0, 0.41, 0]}
            color="#E2E8F0"
            roughness={0.7}
          />
          <Part
            geo={G.cyl(0.04, 0.045, 0.04, 10)}
            pos={[0.07, 0.34, 0]}
            rot={[0, 0, -0.72]}
            color={band}
            roughness={0.45}
          />
        </group>
      );
    }

    case "bag":
      return (
        <group rotation={[0.15, -0.2, -0.1]}>
          <Part
            geo={G.box(0.44, 0.5, 0.07, 0.03)}
            double
            color="#DBEAFE"
            roughness={0.35}
            opacity={0.6}
          />
          {[0.08, -0.1].map((y, i) => (
            <Part
              key={y}
              geo={G.box(0.3, 0.012, 0.075, 0.004)}
              pos={[0, y, 0]}
              rot={[0, 0, i ? -0.2 : 0.25]}
              color="#FFFFFF"
              opacity={0.7}
            />
          ))}
          {[-0.13, 0.13].map((x) => (
            <Part
              key={x}
              geo={G.torus(0.1, 0.02, 6, 14, Math.PI)}
              pos={[x, 0.25, 0]}
              color="#BFDBFE"
              opacity={0.8}
              roughness={0.4}
            />
          ))}
          <Part
            geo={G.circle(0.07, 18)}
            pos={[0, -0.03, 0.037]}
            basic
            color="#EF4444"
            opacity={0.8}
          />
        </group>
      );

    case "pet":
      return (
        <group rotation={[0.08, 0.28, -0.1]}>
          <Part
            geo={G.lathe(
              24,
              [
                0, -0.36, 0.14, -0.36, 0.19, -0.3, 0.2, -0.2, 0.2, 0.1, 0.18,
                0.18, 0.12, 0.26, 0.075, 0.3, 0.075, 0.36,
              ],
            )}
            double
            color="#93C5FD"
            opacity={0.5}
            roughness={0.15}
          />
          <Part
            geo={G.cyl(0.204, 0.204, 0.2, 24, true)}
            pos={[0, -0.06, 0]}
            double
            color="#FFFFFF"
            roughness={0.5}
          />
          <Part
            geo={G.cyl(0.2055, 0.2055, 0.08, 24, true)}
            pos={[0, -0.06, 0]}
            double
            color="#2563EB"
            roughness={0.5}
          />
          {[-0.27, -0.22].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.196, 0.012, 5, 20)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#BFDBFE"
              opacity={0.6}
              roughness={0.2}
            />
          ))}
          <Part
            geo={G.torus(0.08, 0.01, 5, 16)}
            pos={[0, 0.33, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#BFDBFE"
            roughness={0.3}
          />
          <Part
            geo={G.cyl(0.088, 0.088, 0.07, 16)}
            pos={[0, 0.39, 0]}
            color="#2563EB"
            roughness={0.45}
          />
        </group>
      );

    case "lid":
      return (
        <group rotation={[0.55, 0.3, 0.1]}>
          <Part
            geo={G.lathe(
              28,
              [
                0, -0.035, 0.27, -0.035, 0.3, -0.02, 0.305, 0.03, 0.28, 0.04,
                0.23, 0.035, 0, 0.035,
              ],
            )}
            color="#C99A2E"
            roughness={0.35}
            metalness={0.5}
          />
          <Part
            geo={G.torus(0.15, 0.012, 6, 24)}
            pos={[0, 0.038, 0]}
            rot={[Math.PI / 2, 0, 0]}
            color="#A87B1F"
            roughness={0.4}
            metalness={0.5}
          />
          <Part
            geo={G.cyl(0.055, 0.06, 0.02, 16)}
            pos={[0, 0.042, 0]}
            color="#B88A25"
            roughness={0.4}
            metalness={0.5}
          />
        </group>
      );

    case "chips":
      return (
        <group rotation={[0.18, -0.2, 0.08]}>
          <Part
            geo={G.ball(0.3, 16, 12)}
            scale={[0.82, 1.05, 0.28]}
            color="#DC2626"
            roughness={0.35}
            metalness={0.3}
          />
          {[0.33, -0.33].map((y) => (
            <Part
              key={y}
              geo={G.box(0.46, 0.05, 0.05, 0.01)}
              pos={[0, y, 0]}
              color="#B91C1C"
              roughness={0.4}
              metalness={0.3}
            />
          ))}
          {[-0.2, -0.14, -0.08, -0.02, 0.04, 0.1, 0.16, 0.22].map((x) => (
            <Part
              key={x}
              geo={G.box(0.012, 0.05, 0.056, 0.004)}
              pos={[x, 0.355, 0]}
              color="#991B1B"
              roughness={0.4}
            />
          ))}
          <Part
            geo={G.circle(0.12, 24)}
            pos={[0, 0.04, 0.086]}
            basic
            color="#FACC15"
          />
          <Part
            geo={G.circle(0.07, 20)}
            pos={[0, 0.04, 0.088]}
            basic
            color="#F97316"
          />
        </group>
      );

    case "styro":
      return (
        <group rotation={[0.25, 0.2, -0.1]}>
          <Part
            geo={G.box(0.66, 0.2, 0.46, 0.035)}
            color="#F1F5F9"
            roughness={1}
          />
          <Part
            geo={G.box(0.44, 0.004, 0.26, 0.001)}
            pos={[0, 0.102, 0]}
            color="#D3DBE4"
            roughness={1}
          />
          {(
            [
              [0.34, -0.06, 0.26],
              [-0.3, -0.08, 0.27],
              [0.25, -0.09, 0.3],
              [-0.12, -0.09, 0.3],
            ] as V3[]
          ).map((p, i) => (
            <Part
              key={i}
              geo={G.crumple(0.03, 0.3, i + 1, 0)}
              pos={p}
              flat
              color="#FFFFFF"
              roughness={1}
            />
          ))}
        </group>
      );

    case "tube":
      return (
        <group rotation={[0.15, 0.2, 0.9]}>
          <group scale={[1, 1, 0.6]}>
            <Part
              geo={G.lathe(
                20,
                [
                  0, -0.38, 0.16, -0.38, 0.17, -0.2, 0.17, 0.12, 0.13, 0.25,
                  0.075, 0.31, 0.07, 0.34, 0, 0.34,
                ],
              )}
              color="#F1F5F9"
              roughness={0.35}
            />
            <Part
              geo={G.cyl(0.173, 0.173, 0.1, 20, true)}
              pos={[0, -0.02, 0]}
              double
              color="#2563EB"
              roughness={0.4}
            />
          </group>
          <Part
            geo={G.box(0.36, 0.07, 0.04, 0.012)}
            pos={[0, -0.4, 0]}
            color="#E2E8F0"
            roughness={0.4}
          />
          {[-0.12, -0.06, 0, 0.06, 0.12].map((x) => (
            <Part
              key={x}
              geo={G.box(0.012, 0.05, 0.045, 0.004)}
              pos={[x, -0.4, 0]}
              color="#CBD5E1"
              roughness={0.4}
            />
          ))}
          <Part
            geo={G.cyl(0.08, 0.085, 0.12, 16)}
            pos={[0, 0.4, 0]}
            color="#2563EB"
            roughness={0.35}
          />
        </group>
      );

    case "butter":
      return (
        <group rotation={[0.18, 0.22, -0.12]}>
          <Part
            geo={G.box(0.5, 0.14, 0.28, 0.03)}
            color="#E8C766"
            roughness={0.45}
            metalness={0.4}
          />
          <Part
            geo={G.box(0.28, 0.01, 0.22, 0.004)}
            pos={[-0.04, 0.071, 0]}
            color="#2563EB"
            roughness={0.5}
          />
          <Part
            geo={G.box(0.28, 0.011, 0.06, 0.004)}
            pos={[-0.04, 0.072, 0]}
            color="#F8FAFC"
            roughness={0.5}
          />
          <Part
            geo={G.box(0.18, 0.12, 0.24, 0.025)}
            pos={[0.3, -0.01, 0]}
            color="#FDE68A"
            roughness={0.5}
          />
          <Part
            geo={G.wave(0.3, 0.24, 0.025, 12, 1)}
            pos={[-0.3, 0.04, 0.08]}
            rot={[-1.1, 0.2, 0.5]}
            double
            flat
            color="#E8C766"
            roughness={0.45}
            metalness={0.4}
          />
        </group>
      );

    case "icecream":
      return (
        <group rotation={[0.2, -0.22, 0.08]}>
          <Part
            geo={G.lathe(
              26,
              [
                0, -0.2, 0.2, -0.2, 0.27, 0.18, 0.285, 0.2, 0.285, 0.23, 0.265,
                0.23,
              ],
            )}
            double
            color="#60A5FA"
            roughness={0.45}
          />
          <Part
            geo={G.cyl(0.252, 0.226, 0.14, 26, true)}
            pos={[0, -0.02, 0]}
            double
            color="#F8FAFC"
            roughness={0.5}
          />
          <Part
            geo={G.circle(0.06, 20)}
            pos={[0, -0.02, 0.248]}
            basic
            color="#F472B6"
          />
          <Part
            geo={G.circle(0.03, 16)}
            pos={[0, -0.02, 0.25]}
            basic
            color="#FFFFFF"
          />
          <Part
            geo={G.cyl(0.28, 0.28, 0.025, 24)}
            pos={[0.34, -0.12, 0.1]}
            rot={[0.9, 0.2, 0.6]}
            color="#F9A8D4"
            roughness={0.5}
          />
        </group>
      );

    /* ═══════════════ RESTMÜLL ═══════════════ */

    case "cigarette":
      return (
        <group rotation={[0.12, 0.3, Math.PI / 2]}>
          <Part
            geo={G.cyl(0.05, 0.05, 0.2, 12)}
            pos={[0, -0.05, 0]}
            color="#D9A25A"
            roughness={0.9}
          />
          {[-0.1, -0.03].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.051, 0.006, 5, 12)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#A06A2B"
              roughness={1}
            />
          ))}
          <Part
            geo={G.cyl(0.048, 0.046, 0.18, 12)}
            pos={[0, 0.14, 0]}
            color="#F1EBDD"
            roughness={0.95}
          />
          <Part
            geo={G.crumple(0.05, 0.3, 4, 1)}
            pos={[0, 0.25, 0]}
            scale={[1, 0.6, 1]}
            flat
            color="#3F3F46"
            roughness={1}
          />
        </group>
      );

    case "dish":
      return (
        <group rotation={[0.22, -0.25, 0.18]}>
          {(
            [
              { ts: 0, tl: 2.3, pos: [0.02, 0, 0.02], rot: [0.08, 0, 0.05] },
              {
                ts: 2.55,
                tl: 1.7,
                pos: [-0.06, 0.02, -0.04],
                rot: [-0.12, 0.3, 0.1],
              },
              { ts: 4.5, tl: 1.2, pos: [0, 0.01, 0.1], rot: [0.2, -0.4, -0.1] },
            ] as { ts: number; tl: number; pos: V3; rot: V3 }[]
          ).map((shard, i) => (
            <group key={i} position={shard.pos} rotation={shard.rot}>
              <Part
                geo={G.cyl(0.34, 0.3, 0.04, 18, false, shard.ts, shard.tl)}
                double
                color="#F8FAFC"
                roughness={0.45}
              />
              <Part
                geo={G.cyl(0.345, 0.315, 0.02, 18, true, shard.ts, shard.tl)}
                pos={[0, 0.012, 0]}
                double
                color="#2563EB"
                roughness={0.5}
              />
            </group>
          ))}
        </group>
      );

    case "plaster":
      return (
        <group rotation={[0.12, -0.2, 0.15]}>
          <Part
            geo={G.poly(0.012, 0.004, STRIP_POINTS)}
            color="#E8C9A0"
            roughness={0.9}
          />
          <Part
            geo={G.box(0.2, 0.12, 0.02, 0.008)}
            pos={[0, 0, 0.012]}
            color="#F1F5F9"
            roughness={0.9}
          />
          {[-0.26, -0.2, 0.2, 0.26].flatMap((x) =>
            [-0.04, 0.04].map((y) => (
              <Part
                key={`${x}:${y}`}
                geo={G.circle(0.012, 8)}
                pos={[x, y, 0.017]}
                basic
                color="#B98F63"
              />
            )),
          )}
        </group>
      );

    case "bulb":
      return (
        <group rotation={[0.12, 0.2, -0.1]}>
          {/* zerbrochener Glaskolben */}
          <Part
            geo={G.lathe(
              10,
              [
                0.1, -0.2, 0.15, -0.1, 0.23, 0.02, 0.26, 0.12, 0.24, 0.22, 0.2,
                0.28,
              ],
            )}
            double
            flat
            color="#E0F2FE"
            opacity={0.5}
            roughness={0.1}
          />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i * Math.PI) / 3;
            const h = 0.07 + (i % 3) * 0.03;
            return (
              <Part
                key={i}
                geo={G.cone(0.035, h, 4)}
                pos={[Math.cos(a) * 0.19, 0.27 + h / 2, Math.sin(a) * 0.19]}
                rot={[Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]}
                double
                flat
                color="#E0F2FE"
                opacity={0.55}
                roughness={0.1}
              />
            );
          })}
          {/* Glühwendel */}
          <Part
            geo={G.torus(0.04, 0.006, 5, 10)}
            pos={[0, 0.03, 0]}
            color="#F59E0B"
            emissive="#B45309"
          />
          {[-0.04, 0.04].map((x) => (
            <Part
              key={x}
              geo={G.cyl(0.004, 0.004, 0.22, 5)}
              pos={[x, -0.07, 0]}
              color="#94A3B8"
              metalness={0.5}
            />
          ))}
          {/* Sockel */}
          <Part
            geo={G.cyl(0.11, 0.1, 0.16, 14)}
            pos={[0, -0.28, 0]}
            color="#B8C0CC"
            roughness={0.35}
            metalness={0.55}
          />
          {[-0.32, -0.28, -0.24].map((y) => (
            <Part
              key={y}
              geo={G.torus(0.108, 0.012, 5, 14)}
              pos={[0, y, 0]}
              rot={[Math.PI / 2, 0, 0]}
              color="#8E99A8"
              roughness={0.4}
              metalness={0.55}
            />
          ))}
          <Part
            geo={G.cyl(0.05, 0.05, 0.04, 10)}
            pos={[0, -0.38, 0]}
            color="#4B5563"
            metalness={0.5}
            roughness={0.5}
          />
        </group>
      );

    case "vacuum":
      return (
        <group rotation={[0.15, 0.25, -0.12]}>
          <Part
            geo={G.box(0.5, 0.62, 0.12, 0.04)}
            color="#E5E7EB"
            roughness={1}
          />
          <Part
            geo={G.box(0.5, 0.3, 0.125, 0.04)}
            pos={[0, -0.16, 0]}
            color="#9CA3AF"
            roughness={1}
          />
          <Part
            geo={G.box(0.34, 0.14, 0.02, 0.01)}
            pos={[0, 0.18, 0.07]}
            color="#B08B5B"
            roughness={0.95}
          />
          <Part
            geo={G.circle(0.045, 16)}
            pos={[0, 0.18, 0.082]}
            basic
            color="#1F2937"
          />
          {[-0.12, 0.12].map((x, i) => (
            <Part
              key={x}
              geo={G.box(0.01, 0.4, 0.125, 0.003)}
              pos={[x, -0.02, 0]}
              rot={[0, 0, i ? 0.1 : -0.1]}
              color="#CBD5E1"
              roughness={1}
            />
          ))}
        </group>
      );

    case "pen":
      return (
        <group rotation={[0.2, 0.3, Math.PI / 2]}>
          <Part
            geo={G.cyl(0.045, 0.05, 0.5, 12)}
            pos={[0, 0.05, 0]}
            color="#2563EB"
            opacity={0.88}
            roughness={0.3}
          />
          <Part
            geo={G.cyl(0.052, 0.054, 0.14, 12)}
            pos={[0, -0.14, 0]}
            color="#1E293B"
            roughness={0.7}
          />
          <Part
            geo={G.cone(0.053, 0.14, 12)}
            pos={[0, -0.28, 0]}
            rot={[Math.PI, 0, 0]}
            color="#CBD5E1"
            roughness={0.25}
            metalness={0.6}
          />
          <Part
            geo={G.cyl(0.032, 0.032, 0.06, 10)}
            pos={[0, 0.33, 0]}
            color="#E2E8F0"
            roughness={0.3}
            metalness={0.5}
          />
          <Part
            geo={G.box(0.014, 0.22, 0.02, 0.005)}
            pos={[0.054, 0.15, 0]}
            color="#E2E8F0"
            roughness={0.3}
            metalness={0.5}
          />
        </group>
      );

    case "receipt":
      return (
        <group rotation={[0.18, 0.15, -0.35]}>
          <Part
            geo={G.box(0.22, 0.8, 0.012, 0.004)}
            color="#F8FAFC"
            roughness={0.9}
          />
          {[0.3, 0.22, 0.14, 0.06, -0.02, -0.1].map((y, i) => (
            <Part
              key={y}
              geo={G.box(0.12 + (i % 3) * 0.03, 0.012, 0.004, 0.001)}
              pos={[-0.02 - (i % 3) * 0.015, y, 0.008]}
              basic
              color="#475569"
            />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Part
              key={i}
              geo={G.box(0.008 + (i % 2) * 0.01, 0.07, 0.004, 0.001)}
              pos={[-0.075 + i * 0.025, -0.28, 0.008]}
              basic
              color="#1E293B"
            />
          ))}
        </group>
      );

    case "razor":
      return (
        <group rotation={[0.18, 0.25, -0.38]}>
          <Part
            geo={G.box(0.12, 0.55, 0.07, 0.03)}
            pos={[0, -0.1, 0]}
            color="#3B82F6"
            roughness={0.45}
          />
          {[-0.32, -0.25, -0.18, -0.11].map((y) => (
            <Part
              key={y}
              geo={G.box(0.125, 0.015, 0.075, 0.005)}
              pos={[0, y, 0]}
              color="#1D4ED8"
              roughness={0.5}
            />
          ))}
          <Part
            geo={G.box(0.07, 0.1, 0.05, 0.02)}
            pos={[0, 0.22, 0]}
            color="#3B82F6"
            roughness={0.45}
          />
          <Part
            geo={G.box(0.3, 0.1, 0.08, 0.025)}
            pos={[0, 0.31, 0]}
            color="#F1F5F9"
            roughness={0.4}
          />
          <Part
            geo={G.box(0.26, 0.018, 0.082, 0.005)}
            pos={[0, 0.285, 0]}
            color="#22C55E"
            roughness={0.5}
          />
          <Part
            geo={G.box(0.26, 0.02, 0.083, 0.005)}
            pos={[0, 0.325, 0]}
            color="#0F172A"
            roughness={0.6}
          />
          <Part
            geo={G.box(0.25, 0.006, 0.084, 0.002)}
            pos={[0, 0.337, 0]}
            color="#E2E8F0"
            roughness={0.25}
            metalness={0.6}
          />
        </group>
      );

    case "swab":
      return (
        <group rotation={[0.2, -0.25, 0.2]}>
          {(
            [
              { r: 0, y: 0, tip: "#F8FAFC" },
              { r: 0.5, y: 0.06, tip: "#D6C7A8" },
            ] as { r: number; y: number; tip: string }[]
          ).map((swab) => (
            <group
              key={swab.r}
              position={[0, swab.y, 0]}
              rotation={[0, 0, swab.r + Math.PI / 2]}
            >
              <Part
                geo={G.cyl(0.022, 0.022, 0.62, 8)}
                color="#F1F5F9"
                roughness={0.9}
              />
              {[0.31, -0.31].map((y) => (
                <Part
                  key={y}
                  geo={G.ball(0.06, 10, 8)}
                  pos={[0, y, 0]}
                  scale={[1, 1.5, 1]}
                  color={y > 0 ? swab.tip : "#F8FAFC"}
                  roughness={1}
                />
              ))}
            </group>
          ))}
        </group>
      );

    case "underwear": {
      // Beinausschnitt (linke Seite); rechts wird gespiegelt
      const legPts = [
        -0.3, 0.1, -0.26, -0.02, -0.19, -0.13, -0.12, -0.22, -0.09, -0.28,
      ];
      const leg = (sign: number) => {
        const pts: number[] = [];
        for (let i = 0; i < legPts.length; i += 2) {
          pts.push(sign * legPts[i], legPts[i + 1], 0.036);
        }
        return pts;
      };

      return (
        <group rotation={[0.18, -0.22, 0.08]}>
          <Part
            geo={G.poly(0.045, 0.012, UNDERWEAR_POINTS)}
            color="#6F7F96"
            roughness={1}
          />
          {/* verwaschene Streifen */}
          {(
            [
              [0.12, 0.56],
              [0.04, 0.5],
              [-0.04, 0.4],
              [-0.12, 0.28],
            ] as [number, number][]
          ).map(([y, w]) => (
            <Part
              key={y}
              geo={G.box(w, 0.016, 0.004, 0.001)}
              pos={[0, y, 0.036]}
              color="#8D9BB1"
              roughness={1}
            />
          ))}
          <Part
            geo={G.box(0.008, 0.46, 0.004, 0.001)}
            pos={[0, -0.03, 0.036]}
            color="#566377"
            roughness={1}
          />
          {/* Gummibund mit Muster */}
          <Part
            geo={G.box(0.62, 0.075, 0.062, 0.02)}
            pos={[0, 0.225, 0]}
            color="#E2E8F0"
            roughness={1}
          />
          {[-0.27, -0.18, -0.09, 0, 0.09, 0.18, 0.27].map((x) => (
            <Part
              key={x}
              geo={G.box(0.012, 0.07, 0.064, 0.003)}
              pos={[x, 0.225, 0]}
              color="#EF4444"
              roughness={1}
            />
          ))}
          {/* Beinbündchen */}
          {[1, -1].map((sign) => (
            <Part
              key={sign}
              geo={G.tube(0.012, leg(sign))}
              color="#CBD5E1"
              roughness={1}
            />
          ))}
          {/* abgenutzte Stelle mit Loch und Fäden */}
          <Part
            geo={G.circle(0.045, 12)}
            pos={[0.13, -0.06, 0.037]}
            basic
            color="#08111E"
          />
          <Part
            geo={G.torus(0.047, 0.007, 5, 12)}
            pos={[0.13, -0.06, 0.037]}
            color="#94A3B8"
            roughness={1}
          />
          <Part
            geo={G.tube(
              0.004,
              [0.16, -0.1, 0.04, 0.2, -0.14, 0.06, 0.23, -0.12, 0.08],
            )}
            color="#94A3B8"
            roughness={1}
          />
        </group>
      );
    }

    case "litter":
      return (
        <group rotation={[0.2, 0.25, -0.12]}>
          {(
            [
              [-0.18, -0.05, 0.04, 0.11],
              [0.02, -0.06, 0.1, 0.13],
              [0.2, -0.04, -0.02, 0.1],
              [-0.04, 0.07, 0, 0.11],
              [0.1, 0.06, 0.08, 0.09],
              [-0.12, 0.05, 0.12, 0.08],
            ] as number[][]
          ).map(([x, y, z, r], i) => (
            <Part
              key={i}
              geo={G.crumple(r, 0.25, i + 1, 1)}
              pos={[x, y, z]}
              flat
              color={["#A8A29E", "#8D857C", "#78716C"][i % 3]}
              roughness={1}
            />
          ))}
          {/* verklumpte Streu */}
          <Part
            geo={G.crumple(0.11, 0.3, 8, 1)}
            pos={[0.02, 0.17, 0.04]}
            flat
            color="#6B5B4B"
            roughness={1}
          />
          {(
            [
              [-0.26, -0.1, 0.12],
              [0.3, -0.08, 0.1],
              [0.12, -0.1, 0.2],
              [-0.08, -0.1, 0.22],
            ] as V3[]
          ).map((p, i) => (
            <Part
              key={i}
              geo={G.crumple(0.03, 0.3, i + 20, 0)}
              pos={p}
              flat
              color="#A8A29E"
              roughness={1}
            />
          ))}
        </group>
      );

    case "diaper":
      return (
        <group rotation={[0.15, 0.22, -0.12]}>
          {/* zusammengerollte Windel (Achse in x-Richtung) */}
          <Part
            geo={G.cyl(0.16, 0.16, 0.52, 22)}
            rot={[0, 0, Math.PI / 2]}
            color="#F8FAFC"
            roughness={1}
          />
          {[-0.26, 0.26].map((x) => (
            <group key={x}>
              <Part
                geo={G.torus(0.16, 0.045, 6, 22)}
                pos={[x, 0, 0]}
                rot={[0, Math.PI / 2, 0]}
                color="#E8EEF4"
                roughness={1}
              />
              <Part
                geo={G.torus(0.09, 0.022, 6, 18)}
                pos={[x * 1.04, 0, 0]}
                rot={[0, Math.PI / 2, 0]}
                color="#DDE5ED"
                roughness={1}
              />
            </group>
          ))}
          {/* Klebeband mit Verschlussfläche */}
          <Part
            geo={G.cyl(0.166, 0.166, 0.1, 22, true)}
            pos={[0.06, 0, 0]}
            rot={[0, 0, Math.PI / 2]}
            double
            color="#7DD3FC"
            roughness={0.8}
          />
          <Part
            geo={G.box(0.1, 0.02, 0.07, 0.008)}
            pos={[0.06, 0.168, 0]}
            color="#F8FAFC"
            roughness={0.9}
          />
          {/* Aufdruck */}
          {(
            [
              [-0.2, 0.04],
              [-0.12, -0.04],
              [-0.04, 0.04],
              [0.2, -0.03],
              [0.18, 0.06],
            ] as [number, number][]
          ).map(([x, y], i) => (
            <Part
              key={i}
              geo={G.circle(0.025, 10)}
              pos={[x, y, 0.162]}
              basic
              color="#93C5FD"
            />
          ))}
          <Part
            geo={G.circle(0.06, 14)}
            pos={[-0.16, -0.1, 0.152]}
            basic
            color="#C9A227"
            opacity={0.22}
          />
        </group>
      );

    case "toothbrush":
      return (
        <group rotation={[0.2, 0.4, -0.35]}>
          <Part
            geo={G.box(0.07, 0.62, 0.045, 0.02)}
            pos={[0, -0.08, 0]}
            color="#38BDF8"
            roughness={0.45}
          />
          <Part
            geo={G.box(0.085, 0.2, 0.05, 0.02)}
            pos={[0, -0.17, 0.003]}
            color="#E2E8F0"
            roughness={0.6}
          />
          <Part
            geo={G.box(0.05, 0.1, 0.035, 0.015)}
            pos={[0, 0.28, 0]}
            color="#38BDF8"
            roughness={0.45}
          />
          <Part
            geo={G.box(0.11, 0.2, 0.04, 0.02)}
            pos={[0, 0.4, 0]}
            color="#38BDF8"
            roughness={0.45}
          />
          {[0.34, 0.4, 0.46].flatMap((y, row) =>
            [-0.03, 0.03].map((x, col) => (
              <Part
                key={`${y}:${x}`}
                geo={G.cyl(0.014, 0.012, 0.08, 6)}
                pos={[x, y, 0.055]}
                rot={[Math.PI / 2, 0, (row + col) % 2 ? 0.2 : -0.15]}
                color={(row + col) % 3 === 0 ? "#CBD5E1" : "#F8FAFC"}
                roughness={0.9}
              />
            )),
          )}
        </group>
      );

    case "wrap":
      return (
        <group rotation={[0.25, -0.18, 0.1]}>
          {/* Papierrolle (Achse in x-Richtung) */}
          <Part
            geo={G.cyl(0.13, 0.13, 0.62, 22)}
            pos={[0, 0.02, 0]}
            rot={[0, 0, Math.PI / 2]}
            color="#DB2777"
            roughness={0.3}
            metalness={0.4}
          />
          <Part
            geo={G.cyl(0.045, 0.045, 0.66, 10, true)}
            pos={[0, 0.02, 0]}
            rot={[0, 0, Math.PI / 2]}
            double
            color="#B08B5B"
            roughness={1}
          />
          {[-0.2, 0.2].map((x) => (
            <Part
              key={x}
              geo={G.torus(0.132, 0.01, 5, 22)}
              pos={[x, 0.02, 0]}
              rot={[0, Math.PI / 2, 0]}
              color="#F5C542"
              roughness={0.3}
              metalness={0.5}
            />
          ))}
          {/* abgerollte Bahn mit Mustern */}
          <group position={[0, -0.105, 0.21]} rotation={[-1.45, 0, 0]}>
            <Part
              geo={G.wave(0.62, 0.42, 0.012, 9, 1)}
              double
              color="#EC4899"
              roughness={0.3}
              metalness={0.4}
            />
            {(
              [
                [-0.2, 0.1],
                [0.05, -0.05],
                [0.22, 0.12],
                [-0.1, -0.12],
                [0.2, -0.14],
              ] as [number, number][]
            ).map(([x, y], i) => (
              <Part
                key={i}
                geo={G.circle(0.025, 10)}
                pos={[x, y, 0.03]}
                basic
                color="#F5C542"
              />
            ))}
          </group>
          {/* Schleife */}
          <Part
            geo={G.cyl(0.134, 0.134, 0.05, 22, true)}
            pos={[0, 0.02, 0]}
            rot={[0, 0, Math.PI / 2]}
            double
            color="#F5C542"
            roughness={0.3}
            metalness={0.5}
          />
          <group position={[0, 0.17, 0.02]}>
            {[-1, 1].map((sg) => (
              <Part
                key={sg}
                geo={G.ball(0.06, 10, 8)}
                pos={[sg * 0.08, 0.03, 0]}
                rot={[0, 0, sg * 0.5]}
                scale={[1.4, 0.8, 0.5]}
                color="#F5C542"
                roughness={0.3}
                metalness={0.5}
              />
            ))}
            <Part
              geo={G.ball(0.035, 10, 8)}
              color="#E8B22B"
              roughness={0.3}
              metalness={0.5}
            />
            {[-1, 1].map((sg) => (
              <Part
                key={`t${sg}`}
                geo={G.box(0.035, 0.17, 0.01, 0.004)}
                pos={[sg * 0.04, -0.08, 0.02]}
                rot={[0, 0, sg * 0.35]}
                color="#F5C542"
                roughness={0.3}
                metalness={0.5}
              />
            ))}
          </group>
        </group>
      );

    case "mirror":
      return (
        <group rotation={[0.2, -0.2, 0.12]}>
          {MIRROR_SHARDS.map((shard, i) => (
            <group key={i} position={shard.pos} rotation={shard.rot}>
              <Part
                geo={G.poly(0.015, 0.003, shard.pts)}
                color="#BFE3FF"
                roughness={0.08}
                metalness={0.6}
              />
            </group>
          ))}
          <Part
            geo={G.box(0.3, 0.04, 0.035, 0.012)}
            pos={[-0.2, -0.28, 0]}
            rot={[0, 0, 0.5]}
            color="#7C4A25"
            roughness={0.8}
          />
        </group>
      );

    case "pizza":
      return (
        <group rotation={[0.1, -0.22, 0.08]}>
          <Part
            geo={G.box(0.66, 0.07, 0.66, 0.02)}
            color="#C99A5B"
            roughness={0.95}
          />
          {(
            [
              [0.1, 0.0, 0.2],
              [-0.15, 0.1, 0.12],
              [0.18, -0.12, 0.09],
            ] as number[][]
          ).map(([x, z, r], i) => (
            <Part
              key={i}
              geo={G.circle(r, 16)}
              pos={[x, 0.036, z]}
              rot={[-Math.PI / 2, 0, 0]}
              basic
              color="#7C2D12"
              opacity={0.55}
            />
          ))}
          {/* aufgeklappter Deckel */}
          <group position={[0, 0.04, -0.33]} rotation={[-1.0, 0, 0]}>
            <Part
              geo={G.box(0.66, 0.025, 0.66, 0.012)}
              pos={[0, 0, 0.33]}
              color="#D6AC6C"
              roughness={0.95}
            />
            <Part
              geo={G.circle(0.15, 16)}
              pos={[-0.1, -0.014, 0.3]}
              rot={[Math.PI / 2, 0, 0]}
              basic
              color="#7C2D12"
              opacity={0.55}
            />
            <Part
              geo={G.circle(0.09, 14)}
              pos={[0.15, -0.014, 0.45]}
              rot={[Math.PI / 2, 0, 0]}
              basic
              color="#7C2D12"
              opacity={0.5}
            />
          </group>
        </group>
      );

    case "cd":
      return (
        <group rotation={[0.2, -0.15, 0.12]}>
          <Part
            geo={G.cyl(0.3, 0.3, 0.02, 36)}
            color="#D5DCE6"
            roughness={0.15}
            metalness={0.6}
          />
          {(
            [
              [0.12, 0.2, "#22D3EE", 0.35],
              [0.2, 0.26, "#E879F9", 0.3],
              [0.26, 0.295, "#FDE047", 0.3],
            ] as [number, number, string, number][]
          ).map(([ri, ro, c, o]) => (
            <Part
              key={ri}
              geo={G.ring(ri, ro, 32)}
              pos={[0, 0.0105, 0]}
              rot={[-Math.PI / 2, 0, 0]}
              basic
              color={c}
              opacity={o}
            />
          ))}
          <Part
            geo={G.ring(0.04, 0.11, 24)}
            pos={[0, 0.0108, 0]}
            rot={[-Math.PI / 2, 0, 0]}
            basic
            color="#F8FAFC"
            opacity={0.7}
          />
          <Part
            geo={G.circle(0.04, 16)}
            pos={[0, 0.011, 0]}
            rot={[-Math.PI / 2, 0, 0]}
            basic
            color="#08111E"
          />
          {[0.3, 1.2, 2.2].map((a) => (
            <Part
              key={a}
              geo={G.box(0.2, 0.002, 0.004, 0.001)}
              pos={[Math.cos(a) * 0.1, 0.012, Math.sin(a) * 0.1]}
              rot={[0, -a, 0]}
              basic
              color="#475569"
              opacity={0.5}
            />
          ))}
        </group>
      );

    case "wallpaper":
      return (
        <group rotation={[0.16, -0.18, 0.1]}>
          {/* Rolle (Achse in x-Richtung) */}
          <Part
            geo={G.cyl(0.14, 0.14, 0.7, 20)}
            rot={[0, 0, Math.PI / 2]}
            color="#E9D5FF"
            roughness={0.85}
          />
          {[-0.2, -0.1, 0, 0.1, 0.2].map((x) => (
            <Part
              key={x}
              geo={G.torus(0.142, 0.006, 4, 20)}
              pos={[x, 0, 0]}
              rot={[0, Math.PI / 2, 0]}
              color="#A855F7"
              roughness={0.9}
            />
          ))}
          <Part
            geo={G.cyl(0.05, 0.05, 0.74, 10, true)}
            rot={[0, 0, Math.PI / 2]}
            double
            color="#B08B5B"
            roughness={1}
          />
          {/* abgerollte Bahn mit Streifenmuster */}
          <Part
            geo={G.box(0.7, 0.012, 0.38, 0.004)}
            pos={[0, -0.135, 0.22]}
            color="#F3E8FF"
            roughness={0.9}
          />
          {[-0.27, -0.09, 0.09, 0.27].map((x) => (
            <Part
              key={x}
              geo={G.box(0.05, 0.004, 0.38, 0.001)}
              pos={[x, -0.127, 0.22]}
              color="#C084FC"
              roughness={0.9}
            />
          ))}
        </group>
      );

    default:
      return (
        <group rotation={[0.2, 0.3, -0.12]}>
          <Part
            geo={new THREE.DodecahedronGeometry(0.28, 0)}
            color="#94A3B8"
            roughness={0.7}
            metalness={0.15}
          />
        </group>
      );
  }
}

const TrashObject3D = memo(function TrashObject3D({ item }: { item: Item }) {
  const { key, name } = useMemo(() => {
    const normalized = normalizeName(item.name);
    return { key: resolveModelKey(normalized), name: normalized };
  }, [item.name]);

  return renderModel(key, name);
});

/* ═════════════════════════════════════════════════════════════
 * 3D: TONNEN
 * ═════════════════════════════════════════════════════════════ */

const BinLabel = memo(function BinLabel({ bin }: { bin: MainBin }) {
  return (
    <group position={[0, 1.08, -0.51]}>
      <mesh>
        <planeGeometry args={[0.95, 0.3]} />
        <meshBasicMaterial color="#F8FAFC" />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[0.82, 0.21]} />
        <meshBasicMaterial color={bin.color} />
      </mesh>
    </group>
  );
});

const TrashBin = memo(function TrashBin({
  bin,
  index,
  isOpen,
  isHighlighted,
}: {
  bin: MainBin;
  index: number;
  isOpen: boolean;
  isHighlighted: boolean;
}) {
  const lidRef = useRef<THREE.Group>(null);
  const highlightRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() => getBinPosition(index), [index]);

  // Geteilte Materialien: statt ~25 Instanzen pro Tonne nur 5.
  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({
        color: bin.color,
        roughness: 0.9,
      }),
      light: new THREE.MeshStandardMaterial({
        color: bin.colorLight,
        roughness: 0.78,
      }),
      dark: new THREE.MeshStandardMaterial({ color: "#030712", roughness: 1 }),
      wheel: new THREE.MeshStandardMaterial({ color: "#0B0B0B", roughness: 1 }),
      ring: new THREE.MeshBasicMaterial({
        color: bin.colorLight,
        transparent: true,
        opacity: 0.72,
      }),
    }),
    [bin],
  );

  useEffect(() => {
    return () => {
      Object.values(mats).forEach((m) => m.dispose());
    };
  }, [mats]);

  useFrame((state, delta) => {
    if (!lidRef.current) return;

    const targetRotation = isOpen ? OPEN_LID_ROTATION : 0;
    lidRef.current.rotation.x = THREE.MathUtils.damp(
      lidRef.current.rotation.x,
      targetRotation,
      12,
      delta,
    );

    if (highlightRef.current) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 6) * 0.5;
      highlightRef.current.visible = isHighlighted;
      highlightRef.current.scale.x = 1 + pulse * 0.06;
      highlightRef.current.scale.z = 1 + pulse * 0.06;
    }
  });

  return (
    <group
      position={[position.x, 0.02, position.z]}
      rotation={[0, Math.PI, 0]}
      scale={[BIN_SCALE, 0.92, BIN_SCALE]}
    >
      <mesh
        ref={highlightRef}
        position={[0, 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={isHighlighted}
        material={mats.ring}
      >
        <ringGeometry args={[0.6, 0.7, 32]} />
      </mesh>

      {/* Korpus */}
      <mesh
        position={[0, 0.8, 0]}
        castShadow
        receiveShadow
        material={mats.body}
      >
        <boxGeometry args={[1.08, 1.58, 0.88]} />
      </mesh>

      <mesh position={[0, 0.82, -0.456]} material={mats.light}>
        <boxGeometry args={[0.91, 1.24, 0.028]} />
      </mesh>

      {[-0.29, 0, 0.29].map((x) => (
        <mesh
          key={`front-rib-${x}`}
          position={[x, 0.78, -0.476]}
          material={mats.body}
        >
          <boxGeometry args={[0.018, 1.08, 0.018]} />
        </mesh>
      ))}

      {/* Oberkante + dunkle Öffnung */}
      <mesh position={[0, 1.53, 0]} castShadow material={mats.light}>
        <boxGeometry args={[1.12, 0.14, 0.94]} />
      </mesh>

      <mesh position={[0, 1.6, -0.02]} material={mats.dark}>
        <boxGeometry args={[0.96, 0.12, 0.72]} />
      </mesh>

      {/* Rahmen um die Öffnung */}
      <mesh position={[0, 1.65, -0.35]} material={mats.light}>
        <boxGeometry args={[1.14, 0.1, 0.1]} />
      </mesh>
      <mesh position={[-0.47, 1.65, -0.02]} material={mats.light}>
        <boxGeometry args={[0.1, 0.1, 0.8]} />
      </mesh>
      <mesh position={[0.47, 1.65, -0.02]} material={mats.light}>
        <boxGeometry args={[0.1, 0.1, 0.8]} />
      </mesh>

      {/* Griffe */}
      <mesh position={[-0.54, 1.04, -0.08]} material={mats.light}>
        <boxGeometry args={[0.08, 0.52, 0.13]} />
      </mesh>
      <mesh position={[0.54, 1.04, -0.08]} material={mats.light}>
        <boxGeometry args={[0.08, 0.52, 0.13]} />
      </mesh>

      {/* Deckel – unsichtbarer Pivot hinten */}
      <group ref={lidRef} position={[0, 1.68, 0.5]}>
        <mesh
          position={[0, 0.025, -0.42]}
          castShadow
          receiveShadow
          material={mats.light}
        >
          <boxGeometry args={[1.14, 0.13, 0.86]} />
        </mesh>
        <mesh position={[0, 0.095, -0.41]} material={mats.body}>
          <boxGeometry args={[1.0, 0.028, 0.67]} />
        </mesh>
        <mesh position={[0, 0.02, -0.84]} material={mats.light}>
          <boxGeometry args={[1.08, 0.09, 0.08]} />
        </mesh>
      </group>

      {/* Räder */}
      {[-0.43, 0.43].map((x) => (
        <mesh
          key={`wheel-${x}`}
          position={[x, 0.13, 0.38]}
          rotation={[Math.PI / 2, 0, 0]}
          material={mats.wheel}
        >
          <cylinderGeometry args={[0.16, 0.16, 0.14, 16]} />
        </mesh>
      ))}

      <BinLabel bin={bin} />
    </group>
  );
});

/* ═════════════════════════════════════════════════════════════
 * 3D: PARTIKEL
 * ═════════════════════════════════════════════════════════════ */

const ImpactParticles = memo(function ImpactParticles({
  binIndex,
  color,
  onFinished,
}: {
  binIndex: number;
  color: string;
  onFinished: () => void;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);

  const particleData = useMemo(() => {
    const count = 10;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    for (let index = 0; index < count; index++) {
      velocities.push({
        x: (Math.random() - 0.5) * 1.1,
        y: Math.random() * 0.75 + 0.25,
        z: (Math.random() - 0.5) * 0.8,
      });
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geometry, velocities };
  }, []);

  useEffect(() => {
    return () => particleData.geometry.dispose();
  }, [particleData]);

  useFrame((_, delta) => {
    if (!pointsRef.current || doneRef.current) return;

    elapsedRef.current += delta;

    if (elapsedRef.current >= 0.34) {
      doneRef.current = true;
      onFinished();
      return;
    }

    const attribute = particleData.geometry.attributes.position;
    const values = attribute.array as Float32Array;

    particleData.velocities.forEach((velocity, index) => {
      values[index * 3] += velocity.x * delta;
      values[index * 3 + 1] += velocity.y * delta;
      values[index * 3 + 2] += velocity.z * delta;
      velocity.y -= 2.1 * delta;
    });

    attribute.needsUpdate = true;
  });

  const position = getBinPosition(binIndex);

  return (
    <group position={[position.x, 1.7, position.z]} scale={BIN_SCALE}>
      <points ref={pointsRef} geometry={particleData.geometry}>
        <pointsMaterial
          color={color}
          size={0.07}
          transparent
          opacity={0.9}
          sizeAttenuation
        />
      </points>
    </group>
  );
});

/* ═════════════════════════════════════════════════════════════
 * 3D: WURF-ITEM
 * ═════════════════════════════════════════════════════════════ */

type Phase = "flight" | "sink" | "bounce";

/** Vorschau in Wurfposition: schwebt sanft auf und ab. */
const PreviewItem = memo(function PreviewItem({ item }: { item: Item }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const t = state.clock.elapsedTime;
    group.position.y = THROW_START.y + Math.sin(t * 2) * 0.04;
    group.rotation.z = PREVIEW_ROTATION[2] + Math.sin(t * 1.3) * 0.05;
  });

  return (
    <group
      ref={groupRef}
      position={[THROW_START.x, THROW_START.y, THROW_START.z]}
      rotation={PREVIEW_ROTATION}
      scale={PREVIEW_SCALE}
    >
      <TrashObject3D item={item} />
    </group>
  );
});

function ThrowingItem({
  item,
  mode,
  throwVector,
  onImpact,
}: {
  item: Item;
  mode: GameMode;
  throwVector: ThrowVector;
  onImpact: (result: HitResult, binIndex: number | null) => void;
}) {
  const itemRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const phaseRef = useRef<Phase>("flight");
  const phaseProgressRef = useRef(0);
  const sentRef = useRef(false);

  // Komponente wird pro Wurf neu gemountet (key enthält throwId) → einmal berechnen.
  const plan = useMemo(
    () => planThrow(throwVector, item.category, mode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    flightTarget,
    sinkTarget,
    bounceTarget,
    flightDuration,
    arcHeight,
    rotationPower,
  } = useMemo(
    () => ({
      flightTarget: new THREE.Vector3(
        plan.aim.x,
        plan.enters ? 1.95 : 1.08,
        plan.aim.z,
      ),
      sinkTarget: new THREE.Vector3(plan.aim.x, 0.62, plan.aim.z),
      bounceTarget: new THREE.Vector3(plan.aim.x, 0.28, plan.aim.z + 0.65),
      flightDuration: THREE.MathUtils.clamp(
        1.1 - throwVector.speed / 2500,
        0.68,
        1.1,
      ),
      arcHeight: THREE.MathUtils.clamp(
        1.15 + throwVector.speed / 1850,
        1.15,
        1.9,
      ),
      rotationPower: THREE.MathUtils.clamp(throwVector.speed / 700, 0.55, 2.4),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan],
  );

  const sinkDuration = 0.34;
  const bounceDuration = 0.22;

  const sendImpact = (binIndex: number | null) => {
    if (sentRef.current) return;
    sentRef.current = true;
    onImpact(plan.result, binIndex);
  };

  useFrame((_, delta) => {
    const object = itemRef.current;
    if (!object || sentRef.current) return;

    const frameDelta = Math.min(delta, 0.032);

    // Weicher Bodenschatten folgt dem Item (hilft beim Einschätzen der Flugbahn)
    const shadow = shadowRef.current;
    if (shadow) {
      const height = Math.max(object.position.y, 0);
      shadow.position.set(object.position.x, 0.02, object.position.z);
      shadow.scale.setScalar(
        THREE.MathUtils.clamp(1.15 - height * 0.22, 0.35, 1),
      );
      shadow.visible = phaseRef.current !== "sink";
      (shadow.material as THREE.MeshBasicMaterial).opacity =
        THREE.MathUtils.clamp(0.4 - height * 0.08, 0.12, 0.4);
    }

    if (phaseRef.current === "flight") {
      progressRef.current = Math.min(
        progressRef.current + frameDelta / flightDuration,
        1,
      );
      const progress = progressRef.current;

      const x = THREE.MathUtils.lerp(THROW_START.x, flightTarget.x, progress);
      const z = THREE.MathUtils.lerp(THROW_START.z, flightTarget.z, progress);
      const baseY = THREE.MathUtils.lerp(
        THROW_START.y,
        flightTarget.y,
        progress,
      );
      const arc = Math.sin(progress * Math.PI) * arcHeight;

      object.position.set(x, baseY + arc, z);
      object.scale.setScalar(
        THREE.MathUtils.lerp(
          PREVIEW_SCALE,
          ITEM_SCALE,
          Math.min(progress * 2, 1),
        ),
      );
      object.rotation.x += frameDelta * 5 * rotationPower;
      object.rotation.y += frameDelta * 6 * rotationPower;
      object.rotation.z += frameDelta * 4 * rotationPower;

      if (progress >= 1) {
        phaseProgressRef.current = 0;

        if (plan.enters) {
          phaseRef.current = "sink";
        } else if (plan.near) {
          phaseRef.current = "bounce";
        } else {
          sendImpact(null);
        }
      }
      return;
    }

    if (phaseRef.current === "sink") {
      phaseProgressRef.current = Math.min(
        phaseProgressRef.current + frameDelta / sinkDuration,
        1,
      );
      const progress = phaseProgressRef.current;
      const eased = 1 - Math.pow(1 - progress, 3);

      object.position.lerpVectors(flightTarget, sinkTarget, eased);

      const sinkScale = THREE.MathUtils.lerp(ITEM_SCALE, 0.06, eased);
      object.scale.set(sinkScale, sinkScale, sinkScale);
      object.rotation.x += frameDelta * 2;
      object.rotation.y += frameDelta * 2;

      if (progress >= 1) sendImpact(plan.binIndex);
      return;
    }

    // bounce
    phaseProgressRef.current = Math.min(
      phaseProgressRef.current + frameDelta / bounceDuration,
      1,
    );
    const bounceProgress = phaseProgressRef.current;

    object.position.lerpVectors(flightTarget, bounceTarget, bounceProgress);
    object.position.y += Math.sin(bounceProgress * Math.PI) * 0.22;
    object.rotation.x += frameDelta * 8;
    object.rotation.z += frameDelta * 5;

    if (bounceProgress >= 1) sendImpact(null);
  });

  return (
    <>
      <mesh
        ref={shadowRef}
        position={[THROW_START.x, 0.02, THROW_START.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.32, 20]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      <group
        ref={itemRef}
        position={[THROW_START.x, THROW_START.y, THROW_START.z]}
        rotation={PREVIEW_ROTATION}
        scale={PREVIEW_SCALE}
      >
        <TrashObject3D item={item} />
      </group>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
 * 3D: HINTERHOF
 * ═════════════════════════════════════════════════════════════ */

// Statische Szene → Materialien/Geometrien einmal für alle teilen.
const MAT = {
  slate: new THREE.MeshStandardMaterial({ color: "#4B5A6C", roughness: 0.92 }),
  base: new THREE.MeshStandardMaterial({ color: "#263746", roughness: 0.95 }),
  mortar: new THREE.MeshStandardMaterial({ color: "#2A2F37", roughness: 1 }),
  concrete: new THREE.MeshStandardMaterial({
    color: "#3E4856",
    roughness: 0.95,
  }),
  concreteLight: new THREE.MeshStandardMaterial({
    color: "#56627A",
    roughness: 0.9,
  }),
  metal: new THREE.MeshStandardMaterial({
    color: "#475569",
    roughness: 0.5,
    metalness: 0.45,
  }),
  lampHousing: new THREE.MeshStandardMaterial({
    color: "#1E293B",
    roughness: 0.55,
    metalness: 0.5,
  }),
  bag: new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.98 }),
  bagKnot: new THREE.MeshStandardMaterial({ color: "#0F172A", roughness: 1 }),
  bagEar: new THREE.MeshStandardMaterial({ color: "#1F2937", roughness: 1 }),
};

const GEO = {
  bagBody: new THREE.SphereGeometry(0.72, 14, 10),
  bagKnot: new THREE.SphereGeometry(0.16, 10, 8),
  bagEar: new THREE.ConeGeometry(0.085, 0.2, 8),
};

const GARBAGE_BAGS = [
  {
    key: "between-left",
    position: [-0.68, 0.23, -2.45] as [number, number, number],
    scale: [0.48, 0.55, 0.42] as [number, number, number],
    rotation: [0.05, -0.22, -0.08] as [number, number, number],
  },
  {
    key: "between-right",
    position: [0.72, 0.2, -2.48] as [number, number, number],
    scale: [0.42, 0.5, 0.38] as [number, number, number],
    rotation: [-0.03, 0.18, 0.11] as [number, number, number],
  },
  {
    key: "front-left",
    position: [-1.72, 0.19, -1.03] as [number, number, number],
    scale: [0.34, 0.43, 0.31] as [number, number, number],
    rotation: [0.04, -0.12, -0.06] as [number, number, number],
  },
  {
    key: "front-right",
    position: [1.72, 0.17, -1.08] as [number, number, number],
    scale: [0.3, 0.39, 0.28] as [number, number, number],
    rotation: [0.02, 0.24, 0.07] as [number, number, number],
  },
  {
    key: "back-right",
    position: [2.55, 0.15, -2.6] as [number, number, number],
    scale: [0.3, 0.38, 0.27] as [number, number, number],
    rotation: [0.03, -0.2, -0.05] as [number, number, number],
  },
];

// ── Backsteinwand (InstancedMesh: ~400 Steine in einem Draw-Call) ──────────

const WALL = {
  halfWidth: 4.4,
  bottom: 0.5,
  top: 4.3,
  brickW: 0.44,
  brickH: 0.19,
  gap: 0.025,
  depth: 0.1,
  z: -3.43,
};

// Lichtkegel der Wandlampe (Mittelpunkt des hellen Bereichs auf der Wand)
const WALL_LAMP = { x: -2.0, y: 2.3 };

// Gesamthelligkeit der Wand – hier anpassen, falls sie zu hell/dunkel wirkt
const WALL_BRIGHTNESS = 0.8;

// Farben der Backsteine – hier kannst du die Wand umfärben
const BRICK_PALETTE = ["#8E5143", "#6F3E36", "#A8654F", "#7B4A3A"];

function seededRandom(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Brick = {
  x: number;
  y: number;
  w: number;
  h: number;
  dz: number;
  color: THREE.Color;
};

function buildBricks(): Brick[] {
  const rand = seededRandom(1337);
  const palette = BRICK_PALETTE.map((hex) => new THREE.Color(hex));
  const stain = new THREE.Color("#4A2C2A");
  const warm = new THREE.Color("#FFB86B");

  const { halfWidth, bottom, top, brickW, brickH, gap } = WALL;
  const rows = Math.floor((top - bottom) / (brickH + gap));
  const bricks: Brick[] = [];

  for (let row = 0; row < rows; row++) {
    const y = bottom + gap / 2 + brickH / 2 + row * (brickH + gap);
    // Läuferverband: jede zweite Reihe um einen halben Stein versetzt
    const startX = -halfWidth - (row % 2 === 0 ? 0 : brickW / 2);

    for (let col = 0; ; col++) {
      const cx = startX + brickW / 2 + col * (brickW + gap);
      const left = Math.max(cx - brickW / 2, -halfWidth);
      const right = Math.min(cx + brickW / 2, halfWidth);

      if (cx - brickW / 2 >= halfWidth) break;
      if (right - left < 0.08) continue;

      const x = (left + right) / 2;

      // Farbe: Mix aus zwei Palettenfarben + leichte Helligkeitsstreuung
      const color = palette[Math.floor(rand() * palette.length)]
        .clone()
        .lerp(palette[Math.floor(rand() * palette.length)], rand() * 0.5);

      // Einzelne verschmutzte / dunklere Steine
      if (rand() < 0.07) color.lerp(stain, 0.5);

      // "Gebackenes" Licht: Lampenkegel, Boden-Verschmutzung, Abdunkelung oben
      const dx = x - WALL_LAMP.x;
      const dy = y - WALL_LAMP.y;
      const lamp = 0.85 * Math.exp(-(dx * dx + dy * dy) / 1.1);
      const grime = THREE.MathUtils.lerp(
        0.55,
        1,
        THREE.MathUtils.clamp((y - bottom) / 1.4, 0, 1),
      );
      const topFade = 1 - 0.2 * THREE.MathUtils.clamp((y - 3) / 1.3, 0, 1);
      const variation = 0.88 + rand() * 0.24;

      color.lerp(warm, THREE.MathUtils.clamp(lamp * 0.3, 0, 0.35));
      color.multiplyScalar(
        Math.min(
          WALL_BRIGHTNESS * variation * grime * topFade * (1 + lamp),
          1.5,
        ),
      );

      bricks.push({
        x,
        y,
        w: right - left + (rand() - 0.5) * 0.006,
        h: brickH + (rand() - 0.5) * 0.006,
        dz: (rand() - 0.5) * 0.024, // leichtes Relief
        color,
      });
    }
  }

  return bricks;
}

const IDENTITY_QUATERNION = new THREE.Quaternion();

const BrickWall = memo(function BrickWall() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const bricks = useMemo(buildBricks, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    bricks.forEach((brick, index) => {
      position.set(brick.x, brick.y, WALL.z + brick.dz);
      scale.set(brick.w, brick.h, WALL.depth);
      matrix.compose(position, IDENTITY_QUATERNION, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, brick.color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bricks]);

  const lampX = WALL_LAMP.x;
  const lampY = WALL_LAMP.y + 0.4; // Leuchte sitzt über dem Lichtkegel

  return (
    <group>
      {/* Dunkle Mörtel-Rückwand (sichtbar in den Fugen) */}
      <mesh position={[0, 2.2, -3.52]} receiveShadow material={MAT.mortar}>
        <boxGeometry args={[9.2, 4.4, 0.1]} />
      </mesh>

      {/* Backsteine */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, bricks.length]}
        frustumCulled={false}
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
      </instancedMesh>

      {/* Betonsockel + Abschlusskante */}
      <mesh position={[0, 0.25, -3.39]} receiveShadow material={MAT.concrete}>
        <boxGeometry args={[9.0, 0.5, 0.22]} />
      </mesh>
      <mesh position={[0, 0.53, -3.38]} material={MAT.concreteLight}>
        <boxGeometry args={[9.06, 0.06, 0.26]} />
      </mesh>

      {/* Betonband quer über die Wand */}
      <mesh position={[0, 3.35, -3.33]} receiveShadow material={MAT.concrete}>
        <boxGeometry args={[8.9, 0.08, 0.14]} />
      </mesh>

      {/* Seitliche Betonpfeiler */}
      {[-4.42, 4.42].map((x) => (
        <mesh
          key={`wall-pillar-${x}`}
          position={[x, 2.15, -3.41]}
          receiveShadow
          material={MAT.concrete}
        >
          <boxGeometry args={[0.24, 4.5, 0.24]} />
        </mesh>
      ))}

      {/* Obere Abdeckplatte */}
      <mesh position={[0, 4.4, -3.36]} castShadow material={MAT.concreteLight}>
        <boxGeometry args={[9.2, 0.12, 0.36]} />
      </mesh>

      {/* Fallrohr mit Schellen */}
      <group position={[2.3, 2.3, -3.3]}>
        <mesh material={MAT.metal}>
          <cylinderGeometry args={[0.055, 0.055, 4.1, 10]} />
        </mesh>
        {[-1.6, -0.5, 0.6, 1.7].map((y) => (
          <mesh
            key={`pipe-clamp-${y}`}
            position={[0, y, -0.03]}
            material={MAT.lampHousing}
          >
            <boxGeometry args={[0.14, 0.06, 0.1]} />
          </mesh>
        ))}
      </group>

      {/* Wandlampe */}
      <group position={[lampX, lampY, -3.3]}>
        <mesh position={[0, 0, -0.06]} material={MAT.lampHousing}>
          <boxGeometry args={[0.12, 0.16, 0.03]} />
        </mesh>
        <mesh position={[0, 0.02, 0.0]} material={MAT.lampHousing}>
          <boxGeometry args={[0.05, 0.05, 0.14]} />
        </mesh>
        <mesh position={[0, 0.02, 0.12]} material={MAT.lampHousing}>
          <boxGeometry args={[0.32, 0.12, 0.2]} />
        </mesh>
        <mesh position={[0, -0.045, 0.12]}>
          <boxGeometry args={[0.26, 0.02, 0.15]} />
          <meshBasicMaterial color="#FEF3C7" />
        </mesh>
      </group>

      {/* Sanfter Lichtschein auf der Wand (additiv, mehrere Ringe) */}
      {[
        { r: 0.35, o: 0.03 },
        { r: 0.6, o: 0.03 },
        { r: 0.9, o: 0.028 },
        { r: 1.2, o: 0.026 },
        { r: 1.55, o: 0.024 },
        { r: 1.9, o: 0.022 },
      ].map((glow) => (
        <mesh
          key={`glow-${glow.r}`}
          position={[lampX, WALL_LAMP.y, -3.35]}
          scale={[1, 1.25, 1]}
        >
          <circleGeometry args={[glow.r, 32]} />
          <meshBasicMaterial
            color="#FDBA4C"
            transparent
            opacity={glow.o}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
});

// ── Gepflasterter Boden (InstancedMesh) ─────────────────────────────────

const TILE = 1.2;
const FLOOR_Y = 0.008; // Oberkante der Platten

type FloorTile = { x: number; z: number; color: THREE.Color };

function buildFloorTiles(): FloorTile[] {
  const rand = seededRandom(2024);
  const palette = ["#2C3B4B", "#273644", "#32414F", "#243240"].map(
    (hex) => new THREE.Color(hex),
  );
  const warm = new THREE.Color("#FFB86B");
  const tiles: FloorTile[] = [];

  // Reihen so gelegt, dass die Tonnen mittig auf Platten stehen
  for (let row = -1; row <= 9; row++) {
    const z = -1.85 + row * TILE;

    for (let col = -4; col <= 4; col++) {
      const x = col * TILE;

      const color = palette[Math.floor(rand() * palette.length)].clone();

      // Vordergrund wird dunkler, Bereich unter der Wandlampe etwas wärmer
      const depthFade = 1 - 0.4 * THREE.MathUtils.clamp((z - 0.5) / 7.5, 0, 1);
      const lamp = 0.5 * Math.exp(-((x + 1.5) ** 2 + (z + 2.5) ** 2) / 3);
      const variation = 0.9 + rand() * 0.2;
      const stain = rand() < 0.1 ? 0.8 : 1;

      color.lerp(warm, THREE.MathUtils.clamp(lamp * 0.25, 0, 0.2));
      color.multiplyScalar(variation * depthFade * (1 + lamp * 0.6) * stain);

      tiles.push({ x, z, color });
    }
  }

  return tiles;
}

const PavedFloor = memo(function PavedFloor() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tiles = useMemo(buildFloorTiles, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3(TILE - 0.04, 0.02, TILE - 0.04);

    tiles.forEach((tile, index) => {
      position.set(tile.x, FLOOR_Y - 0.01, tile.z);
      matrix.compose(position, IDENTITY_QUATERNION, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, tile.color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [tiles]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, tiles.length]}
      frustumCulled={false}
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
    </instancedMesh>
  );
});

const PUDDLES = [
  { x: 1.05, z: 0.9, r: 0.45, sx: 1.5 },
  { x: -0.95, z: 2.3, r: 0.35, sx: 1.4 },
];

const FLOOR_LEAVES = [
  { x: -0.4, z: -0.7, r: 0.8, s: 0.5, c: "#7C4A1A" },
  { x: 0.9, z: -0.3, r: 2.1, s: 0.45, c: "#9A6A1F" },
  { x: -1.6, z: 0.2, r: 4.0, s: 0.5, c: "#5F3B18" },
  { x: 1.7, z: 0.6, r: 5.2, s: 0.4, c: "#8A5A1C" },
  { x: 0.2, z: 1.5, r: 1.2, s: 0.45, c: "#7C4A1A" },
  { x: -0.6, z: 1.1, r: 3.0, s: 0.4, c: "#9A6A1F" },
];

/** Kleine Details am Boden – ändern keine Positionen der Spielobjekte. */
const GroundDetails = memo(function GroundDetails() {
  return (
    <group>
      {/* Weiche Kontaktschatten unter den Tonnen */}
      {MAIN_BINS.map((bin, index) => {
        const p = getBinPosition(index);
        return (
          <group
            key={bin.category}
            position={[p.x, 0.021, p.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <Part
              geo={G.circle(0.8, 24)}
              scale={[1.05, 0.92, 1]}
              basic
              noDepthWrite
              color="#000000"
              opacity={0.2}
            />
            <Part
              geo={G.circle(0.62, 24)}
              scale={[1.0, 0.85, 1]}
              basic
              noDepthWrite
              color="#000000"
              opacity={0.22}
            />
          </group>
        );
      })}

      {/* Pfützen */}
      {PUDDLES.map((puddle, i) => (
        <Part
          key={i}
          geo={G.circle(puddle.r, 24)}
          pos={[puddle.x, 0.02, puddle.z]}
          rot={[-Math.PI / 2, 0, 0]}
          scale={[puddle.sx, 1, 1]}
          noDepthWrite
          color="#1E3A5A"
          roughness={0.04}
          metalness={0.4}
          opacity={0.6}
        />
      ))}

      {/* Herbstlaub */}
      {FLOOR_LEAVES.map((leaf, i) => (
        <Part
          key={i}
          geo={G.poly(0.006, 0, LEAF_POINTS)}
          pos={[leaf.x, 0.026, leaf.z]}
          rot={[-Math.PI / 2, 0, leaf.r]}
          scale={leaf.s}
          double
          color={leaf.c}
          roughness={1}
        />
      ))}
    </group>
  );
});

const BackyardDressing = memo(function BackyardDressing() {
  return (
    <group>
      <BrickWall />

      <PavedFloor />
      <GroundDetails />

      {/* Müllsäcke */}
      {GARBAGE_BAGS.map((bag) => (
        <group
          key={bag.key}
          position={bag.position}
          rotation={bag.rotation}
          scale={bag.scale}
        >
          <mesh
            castShadow
            scale={[1, 1, 0.9]}
            geometry={GEO.bagBody}
            material={MAT.bag}
          />
          <mesh
            position={[0, 0.58, 0]}
            geometry={GEO.bagKnot}
            material={MAT.bagKnot}
          />
          <mesh
            position={[-0.1, 0.71, 0]}
            rotation={[0, 0, -0.45]}
            geometry={GEO.bagEar}
            material={MAT.bagEar}
          />
          <mesh
            position={[0.1, 0.71, 0]}
            rotation={[0, 0, 0.45]}
            geometry={GEO.bagEar}
            material={MAT.bagEar}
          />
        </group>
      ))}

      {/* Weitere Säcke / Kisten / Flasche */}
      <group position={[-0.78, 0.34, -2.28]} rotation={[0.05, -0.22, 0]}>
        <mesh
          castShadow
          geometry={GEO.bagBody}
          material={MAT.bag}
          scale={0.47}
        />
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.1, 0.2, 10]} />
          <meshStandardMaterial color="#1F2937" roughness={0.95} />
        </mesh>
      </group>

      <group position={[0.82, 0.27, -2.32]} rotation={[-0.08, 0.26, 0.08]}>
        <mesh
          castShadow
          geometry={GEO.bagBody}
          material={MAT.bagKnot}
          scale={0.4}
        />
        <mesh position={[0.03, 0.28, 0]}>
          <coneGeometry args={[0.085, 0.17, 10]} />
          <meshStandardMaterial color="#1F2937" roughness={0.95} />
        </mesh>
      </group>

      <group position={[2.35, 0.18, -2.42]} rotation={[0, -0.22, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.56, 0.34, 0.45]} />
          <meshStandardMaterial color="#8B5A2B" roughness={0.96} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.52, 0.035, 0.41]} />
          <meshStandardMaterial color="#B7793E" roughness={0.9} />
        </mesh>
      </group>

      <group position={[-2.45, 0.12, -2.45]} rotation={[0.2, 0.3, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.09, 0.38, 12]} />
          <meshStandardMaterial
            color="#3B82F6"
            transparent
            opacity={0.65}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 12]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.55} />
        </mesh>
      </group>
    </group>
  );
});

/* ═════════════════════════════════════════════════════════════
 * SZENE
 * ═════════════════════════════════════════════════════════════ */

const Scene = memo(function Scene({
  mode,
  currentItem,
  displayItem,
  throwing,
  throwVector,
  closedBinIndex,
  impact,
  onImpact,
  onParticlesFinished,
  highlightedBinIndex,
}: {
  mode: GameMode;
  currentItem: Item | null;
  displayItem: Item | null;
  throwing: boolean;
  throwVector: ThrowVector;
  closedBinIndex: number | null;
  impact: ImpactEffect | null;
  onImpact: (result: HitResult, binIndex: number | null) => void;
  onParticlesFinished: () => void;
  highlightedBinIndex: number | null;
}) {
  return (
    <>
      <color attach="background" args={["#08111E"]} />
      {USE_FOG && <fog attach="fog" args={["#08111E", 12, 30]} />}

      <ambientLight intensity={1.18} />
      <hemisphereLight args={["#8EC5FF", "#071018", 0.9]} />

      <directionalLight
        position={[2, 5, 4]}
        intensity={1.68}
        castShadow
        shadow-mapSize-width={768}
        shadow-mapSize-height={768}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />

      <pointLight position={[-3, 3, 3]} intensity={0.38} color="#60A5FA" />

      <mesh
        position={[0, -0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#0A1119" roughness={0.98} />
      </mesh>

      <BackyardDressing />

      {MAIN_BINS.map((bin, index) => (
        <TrashBin
          key={bin.category}
          bin={bin}
          index={index}
          isOpen={closedBinIndex !== index}
          isHighlighted={highlightedBinIndex === index}
        />
      ))}

      {displayItem && (mode === "time" || !throwing) && (
        <PreviewItem key={`preview-${displayItem.name}`} item={displayItem} />
      )}

      {throwing && currentItem && (
        <ThrowingItem
          key={`throw-${currentItem.name}-${throwVector.throwId}`}
          item={currentItem}
          mode={mode}
          throwVector={throwVector}
          onImpact={onImpact}
        />
      )}

      {impact && (
        <ImpactParticles
          key={impact.id}
          binIndex={impact.binIndex}
          color={impact.color}
          onFinished={onParticlesFinished}
        />
      )}
    </>
  );
});

/* ═════════════════════════════════════════════════════════════
 * SCREEN
 * ═════════════════════════════════════════════════════════════ */

/** Weicher Abdunkelungsverlauf am oberen/unteren Rand (ohne Zusatzbibliothek). */
function EdgeFade({
  position,
  height,
  maxOpacity,
}: {
  position: "top" | "bottom";
  height: number;
  maxOpacity: number;
}) {
  const slices = 14;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.edgeFade,
        position === "top" ? { top: 0 } : { bottom: 0 },
        { height },
      ]}
    >
      {Array.from({ length: slices }).map((_, i) => {
        const t = position === "top" ? 1 - i / (slices - 1) : i / (slices - 1);
        return (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: `rgba(8,17,30,${(maxOpacity * t * t).toFixed(3)})`,
            }}
          />
        );
      })}
    </View>
  );
}

const FEEDBACK_LABEL: Record<HitResult, string> = {
  perfect: "PERFEKT",
  correct: "RICHTIG",
  near: "FAST",
  wrongBin: "FALSCHER MÜLLEIMER",
  miss: "DANEBEN",
};

// Höhe des mittleren Tonnendeckels als Anteil der Bildschirmhöhe (von oben).
// Der Multiplikator erscheint knapp darüber. Bei Bedarf feinjustieren.
const MULTIPLIER_TOP_RATIO = 0.157;

const MODE_LABEL: Record<GameMode, string> = {
  endless: "UNENDLICH",
  survival: "SURVIVAL",
  time: "ZEITRENNEN",
};

export default function ExploreScreen() {
  const { mode: rawMode = "classic" } = useLocalSearchParams<{
    mode?: string;
  }>();
  const { height: screenHeight } = useWindowDimensions();
  const [canvasHeight, setCanvasHeight] = useState(screenHeight);
  const router = useRouter();

  // Zurück ins Menü (oder zur Startseite, falls es keinen Verlauf gibt)
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const backRef = useRef(goBack);
  backRef.current = goBack;

  const mode: GameMode =
    rawMode === "survival" || rawMode === "time" ? rawMode : "endless";

  const itemPool = useMemo(() => getItemPool(mode), [mode]);
  const bagRef = useRef<Item[]>([]);

  const [currentItem, setCurrentItem] = useState<Item | null>(
    () => itemPool[0] ?? null,
  );
  const [previewItem, setPreviewItem] = useState<Item | null>(
    () => itemPool[0] ?? null,
  );

  const [throwing, setThrowing] = useState(false);
  const [stats, dispatch] = useReducer(statsReducer, INITIAL_STATS);
  const [timeLeft, setTimeLeft] = useState(mode === "time" ? ROUND_SECONDS : 0);

  // Speicherung: Bestwert vor dieser Runde, verdiente XP, Level-Up-Hinweis
  const highscoreMode =
    mode === "time" ? "zeit" : mode === "survival" ? "runden" : "endlos";
  const [bestScore, setBestScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const levelUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Survival: Runde ist vorbei (Overlay) bzw. sofort gesperrt (Ref)
  const [gameOver, setGameOver] = useState(false);
  const endedRef = useRef(false);
  const gameOverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [feedback, setFeedback] = useState<HitResult>("miss");
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const [throwVector, setThrowVector] = useState<ThrowVector>({
    screenX: 0,
    screenY: -180,
    speed: 500,
    throwId: 0,
  });

  const [closedBinIndex, setClosedBinIndex] = useState<number | null>(null);
  const [impact, setImpact] = useState<ImpactEffect | null>(null);

  const impactIdRef = useRef(0);
  const throwLockRef = useRef(false);
  const throwIdRef = useRef(0);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openLidTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const correctSound = useAudioPlayer(
    require("../../assets/sounds/correct.mp3"),
  );

  const { score, combo, maxCombo, throwCount, lastPoints } = stats;
  const timeUp = mode === "time" && timeLeft <= 0;
  const finished = timeUp || (mode === "survival" && gameOver);

  /* ── Setup / Reset ─────────────────────────────────────── */

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((error) => {
      console.warn("Audio-Modus konnte nicht aktiviert werden:", error);
    });
  }, []);

  const resetGame = useCallback(() => {
    bagRef.current = [];
    const first = drawFromBag(bagRef, itemPool);

    setCurrentItem(first);
    setPreviewItem(first);
    setThrowing(false);
    dispatch({ type: "reset" });
    setXpEarned(0);
    setLevelUp(null);
    setGameOver(false);
    endedRef.current = false;
    if (gameOverTimeoutRef.current) clearTimeout(gameOverTimeoutRef.current);
    getNumber(getHighscoreKey(highscoreMode)).then(setBestScore);
    setTimeLeft(mode === "time" ? ROUND_SECONDS : 0);
    setFeedbackVisible(false);
    setClosedBinIndex(null);
    setImpact(null);
    throwLockRef.current = false;
  }, [itemPool, mode, highscoreMode]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const running = mode === "time" && timeLeft > 0;

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setTimeLeft((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (openLidTimeoutRef.current) clearTimeout(openLidTimeoutRef.current);
      if (levelUpTimeoutRef.current) clearTimeout(levelUpTimeoutRef.current);
      if (gameOverTimeoutRef.current) clearTimeout(gameOverTimeoutRef.current);
    };
  }, []);

  /* ── Spielablauf ───────────────────────────────────────── */

  const playCorrectSound = () => {
    try {
      correctSound.seekTo(0);
      correctSound.play();
    } catch (error) {
      console.warn("Correct-Sound konnte nicht abgespielt werden:", error);
    }
  };

  const showFeedback = (result: HitResult) => {
    dispatch({ type: "result", result });

    if (result === "perfect" || result === "correct") {
      playCorrectSound();
      Haptics.impactAsync(
        result === "perfect"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
    }

    setFeedback(result);
    setFeedbackVisible(true);

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackVisible(false);
    }, 520);
  };

  const finishThrow = (result: HitResult, binIndex: number | null) => {
    showFeedback(result);

    // Survival: ein Fehler beendet die Runde (Overlay erscheint kurz nach dem Feedback)
    if (mode === "survival" && SURVIVAL_ENDS_ON.includes(result)) {
      endedRef.current = true;
      if (gameOverTimeoutRef.current) clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = setTimeout(() => setGameOver(true), 700);
    }

    const isCorrectHit = result === "perfect" || result === "correct";

    if (isCorrectHit && binIndex !== null) {
      setImpact({
        id: impactIdRef.current++,
        binIndex,
        color:
          result === "perfect" ? "#FACC15" : MAIN_BINS[binIndex].colorLight,
      });

      setClosedBinIndex(binIndex);

      if (openLidTimeoutRef.current) clearTimeout(openLidTimeoutRef.current);
      openLidTimeoutRef.current = setTimeout(() => {
        setClosedBinIndex(null);
      }, 620);
    } else {
      setClosedBinIndex(null);
      setImpact(null);
    }

    setThrowing(false);
    throwLockRef.current = false;

    const nextItem =
      mode === "time"
        ? (previewItem ?? drawFromBag(bagRef, itemPool, currentItem?.name))
        : drawFromBag(bagRef, itemPool, currentItem?.name);

    setCurrentItem(nextItem);
    if (mode !== "time") setPreviewItem(nextItem);
  };

  const showLevelUp = (level: number) => {
    setLevelUp(level);
    if (levelUpTimeoutRef.current) clearTimeout(levelUpTimeoutRef.current);
    levelUpTimeoutRef.current = setTimeout(() => setLevelUp(null), 2200);
  };

  /** Speichert XP, Statistik, Streak und Bestwert dieses Wurfs. */
  const persistResult = (result: HitResult) => {
    const correct = result === "perfect" || result === "correct";
    const xp = XP_PER_RESULT[result];
    const newScore = score + getScoreForResult(result, combo);

    setXpEarned((value) => value + xp);

    recordThrow({ correct, xp })
      .then(({ leveledUp, level }) => {
        if (leveledUp) showLevelUp(level);
      })
      .catch(() => {});

    if (newScore > score) {
      saveHighscore(highscoreMode, newScore).catch(() => {});
    }
  };

  const handleImpact = (result: HitResult, binIndex: number | null) => {
    persistResult(result);
    finishThrow(result, binIndex);
  };

  // Stabile Referenzen, damit memo() in Scene/ThrowingItem greift.
  const handleImpactRef = useRef(handleImpact);
  handleImpactRef.current = handleImpact;

  const stableOnImpact = useCallback(
    (result: HitResult, binIndex: number | null) =>
      handleImpactRef.current(result, binIndex),
    [],
  );

  const stableParticlesFinished = useCallback(() => setImpact(null), []);

  const throwItem = (
    translationX: number,
    translationY: number,
    velocityX: number,
    velocityY: number,
  ) => {
    if (!currentItem || throwing || throwLockRef.current || endedRef.current) {
      return;
    }
    if (mode === "time" && timeLeft <= 0) return;

    const rawSpeed = Math.hypot(velocityX, velocityY);
    const speed = THREE.MathUtils.clamp(rawSpeed, 280, 1800);

    throwLockRef.current = true;
    dispatch({ type: "throw" });

    setClosedBinIndex(null);
    setImpact(null);

    setThrowVector({
      screenX: translationX,
      screenY: translationY,
      speed,
      throwId: ++throwIdRef.current,
    });

    if (mode === "time") {
      setPreviewItem(drawFromBag(bagRef, itemPool, currentItem.name));
    }

    setThrowing(true);
  };

  const throwRef = useRef(throwItem);
  throwRef.current = throwItem;

  const highlightedBinIndex = useMemo(() => {
    if (!throwing) return null;

    const target = getPreviewTarget(throwVector.screenX, throwVector.screenY);
    const assisted = applySoftAimAssist(target.x, target.z, mode);
    const closest = getClosestBin(assisted.x, assisted.z);

    return closest.index !== -1 &&
      closest.distance <= getDifficultyConfig(mode).assistedRadius
      ? closest.index
      : null;
  }, [throwing, throwVector, mode]);

  const comboMultiplier = getComboMultiplier(combo);

  // Gesture nur einmal bauen – nicht bei jedem Timer-Tick neu.
  const throwGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(10)
        .onEnd((event) => {
          const x = event.translationX;
          const y = event.translationY;

          const isUpward = y < -48;
          const isMostlyVertical = Math.abs(y) > Math.abs(x) * 0.28;

          // Nach oben wischen = werfen
          if (isUpward && isMostlyVertical) {
            throwRef.current(x, y, event.velocityX, event.velocityY);
            return;
          }

          // Deutlich nach links wischen (fast waagerecht) = zurück ins Menü
          if (x < -100 && Math.abs(x) > Math.abs(y) * 2) {
            backRef.current();
          }
        }),
    [],
  );

  const shownItem = mode === "time" ? previewItem : currentItem;

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={throwGesture}>
        <View
          style={styles.gameArea}
          onLayout={(e) => setCanvasHeight(e.nativeEvent.layout.height)}
        >
          <Canvas
            shadows
            camera={{ position: [0, 3.7, 8.7], fov: 44, near: 0.1, far: 40 }}
            gl={{ antialias: true }}
          >
            <Scene
              mode={mode}
              currentItem={currentItem}
              displayItem={
                mode === "time" ? (previewItem ?? currentItem) : currentItem
              }
              throwing={throwing}
              throwVector={throwVector}
              closedBinIndex={closedBinIndex}
              impact={impact}
              onImpact={stableOnImpact}
              onParticlesFinished={stableParticlesFinished}
              highlightedBinIndex={highlightedBinIndex}
            />
          </Canvas>

          <EdgeFade position="top" height={130} maxOpacity={0.35} />
          <EdgeFade position="bottom" height={190} maxOpacity={0.6} />

          {/* Top-Leiste */}
          <View pointerEvents="box-none" style={styles.topBar}>
            <Pressable
              onPress={goBack}
              hitSlop={12}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>

            <View pointerEvents="none" style={styles.topCenter}>
              <View style={styles.scoreCard}>
                <Text style={styles.modeLabel}>{MODE_LABEL[mode]}</Text>

                <View style={styles.statsRow}>
                  <View style={styles.scoreBlock}>
                    <Text style={styles.hudLabel}>PUNKTE</Text>
                    <Text style={styles.scoreText}>
                      {score.toLocaleString("de-DE")}
                    </Text>
                  </View>

                  <View style={styles.hudDivider} />

                  <View style={styles.comboBlock}>
                    <Text style={styles.hudLabel}>COMBO</Text>
                    <Text style={styles.comboText}>x{combo}</Text>
                  </View>

                  {mode === "time" && (
                    <>
                      <View style={styles.hudDivider} />
                      <View style={styles.timerBlock}>
                        <Text style={styles.hudLabel}>ZEIT</Text>
                        <Text
                          style={[
                            styles.timeText,
                            timeLeft <= 10 && styles.timeWarning,
                          ]}
                        >
                          {timeLeft}s
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {mode === "time" && (
                  <View style={styles.timerTrack}>
                    <View
                      style={[
                        styles.timerFill,
                        timeLeft <= 10 && styles.timerFillWarning,
                        {
                          width: `${Math.max(
                            0,
                            Math.min(100, (timeLeft / ROUND_SECONDS) * 100),
                          )}%` as `${number}%`,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.topBarSpacer} />
          </View>

          {/* Multiplikator: knapp über dem mittleren Tonnendeckel */}
          {combo >= 2 && (
            <View
              pointerEvents="none"
              style={[
                styles.multiplierWrap,
                { top: Math.max(canvasHeight * MULTIPLIER_TOP_RATIO - 30, 0) },
              ]}
            >
              <View style={styles.multiplierPill}>
                <Text style={styles.multiplierText}>
                  🔥 {comboMultiplier}x MULTIPLIKATOR
                </Text>
              </View>
            </View>
          )}

          {/* Aktuelles Item */}
          {shownItem && (
            <View pointerEvents="none" style={styles.itemInfo}>
              <View style={styles.itemCard}>
                <Text style={styles.itemEmoji}>{shownItem.emoji}</Text>
                <View>
                  <Text style={styles.itemLabel}>WOHIN DAMIT?</Text>
                  <Text style={styles.itemName}>{shownItem.name}</Text>
                </View>
              </View>

              {throwCount === 0 && (
                <Text style={styles.hint}>
                  ↑ Wischen zum Werfen ← Wischen für Menü
                </Text>
              )}
            </View>
          )}

          {levelUp !== null && (
            <View
              pointerEvents="none"
              style={[styles.levelUpWrap, { top: screenHeight * 0.3 }]}
            >
              <View style={styles.levelUpPill}>
                <Text style={styles.levelUpText}>⬆ LEVEL {levelUp}</Text>
              </View>
            </View>
          )}

          {finished && !throwing && (
            <View
              pointerEvents="box-none"
              style={[styles.finishedOverlay, { top: screenHeight * 0.24 }]}
            >
              <Text style={styles.finishedEyebrow}>
                {mode === "survival" ? "SURVIVAL" : "RUN COMPLETE"}
              </Text>
              <Text style={styles.finishedTitle}>
                {mode === "survival" ? "GAME OVER" : "ZEIT ABGELAUFEN"}
              </Text>
              <Text style={styles.finishedScore}>
                {score.toLocaleString("de-DE")}
              </Text>
              <Text style={styles.finishedPointsLabel}>PUNKTE</Text>

              {score > 0 && score > bestScore && (
                <View style={styles.newBestPill}>
                  <Text style={styles.newBestText}>🏆 NEUER BESTWERT</Text>
                </View>
              )}

              <View style={styles.finishedStats}>
                <View style={styles.finishedStat}>
                  <Text style={styles.finishedStatValue}>x{maxCombo}</Text>
                  <Text style={styles.finishedStatLabel}>MAX COMBO</Text>
                </View>
                <View style={styles.finishedStatDivider} />
                <View style={styles.finishedStat}>
                  <Text style={styles.finishedStatValue}>{throwCount}</Text>
                  <Text style={styles.finishedStatLabel}>WÜRFE</Text>
                </View>
                <View style={styles.finishedStatDivider} />
                <View style={styles.finishedStat}>
                  <Text style={styles.finishedStatValue}>+{xpEarned}</Text>
                  <Text style={styles.finishedStatLabel}>XP</Text>
                </View>
              </View>

              <Pressable
                onPress={resetGame}
                style={({ pressed }) => [
                  styles.restartButton,
                  pressed && styles.restartButtonPressed,
                ]}
              >
                <Text style={styles.restartText}>NOCHMAL SPIELEN</Text>
              </Pressable>

              <Pressable
                onPress={goBack}
                style={({ pressed }) => [
                  styles.menuButton,
                  pressed && styles.menuButtonPressed,
                ]}
              >
                <Text style={styles.menuText}>ZUM MENÜ</Text>
              </Pressable>
            </View>
          )}

          {feedbackVisible && (
            <View
              pointerEvents="none"
              style={[
                styles.feedback,
                { top: screenHeight * 0.39 },
                feedback === "perfect" && styles.feedbackPerfect,
                feedback === "correct" && styles.feedbackCorrect,
                (feedback === "near" ||
                  feedback === "wrongBin" ||
                  feedback === "miss") &&
                  styles.feedbackBad,
              ]}
            >
              <Text style={styles.feedbackEyebrow}>
                {FEEDBACK_LABEL[feedback]}
              </Text>
              {lastPoints > 0 && (
                <Text style={styles.feedbackPoints}>+{lastPoints}</Text>
              )}
              {(feedback === "perfect" || feedback === "correct") &&
                combo >= 2 && (
                  <Text style={styles.feedbackCombo}>🔥 COMBO x{combo}</Text>
                )}
            </View>
          )}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

/* ═════════════════════════════════════════════════════════════
 * STYLES
 * ═════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },

  gameArea: {
    flex: 1,
  },

  edgeFade: {
    position: "absolute",
    left: 0,
    right: 0,
  },

  topBar: {
    position: "absolute",
    top: 44,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  topCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 10,
  },

  topBarSpacer: {
    width: 38,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  backButtonPressed: {
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    transform: [{ scale: 0.94 }],
  },

  backIcon: {
    color: "#F8FAFC",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "700",
    marginTop: -3,
  },

  scoreCard: {
    minWidth: 190,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 7,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },

  modeLabel: {
    color: "#60A5FA",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 2,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  scoreBlock: {
    alignItems: "center",
    minWidth: 64,
  },

  comboBlock: {
    alignItems: "center",
    minWidth: 50,
  },

  timerBlock: {
    alignItems: "center",
    minWidth: 48,
  },

  hudLabel: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  hudDivider: {
    width: 1,
    height: 22,
    marginHorizontal: 6,
    backgroundColor: "rgba(148,163,184,0.18)",
  },

  scoreText: {
    color: "#FFFFFF",
    fontSize: 19,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 1,
  },

  comboText: {
    color: "#FACC15",
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 1,
  },

  timeText: {
    color: "#F8FAFC",
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "900",
    marginTop: 1,
  },

  timeWarning: {
    color: "#FB7185",
  },

  timerTrack: {
    width: "100%",
    height: 3,
    marginTop: 6,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(148,163,184,0.2)",
  },

  timerFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#60A5FA",
  },

  timerFillWarning: {
    backgroundColor: "#FB7185",
  },

  multiplierWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },

  multiplierPill: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(120, 53, 15, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.35)",
  },

  multiplierText: {
    color: "#FDE68A",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  itemInfo: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 34,
    alignItems: "center",
  },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  itemEmoji: {
    fontSize: 32,
    marginRight: 12,
  },

  itemLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  itemName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },

  hint: {
    marginTop: 10,
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  // top wird inline per useWindowDimensions gesetzt
  finishedOverlay: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 25,
    borderRadius: 24,
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },

  finishedEyebrow: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
  },

  finishedTitle: {
    color: "#F8FAFC",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 5,
  },

  finishedScore: {
    color: "#FACC15",
    fontSize: 40,
    lineHeight: 45,
    fontWeight: "900",
    marginTop: 12,
  },

  finishedPointsLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  finishedStats: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.045)",
  },

  finishedStat: {
    flex: 1,
    alignItems: "center",
  },

  finishedStatValue: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
  },

  finishedStatLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 2,
  },

  finishedStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(148,163,184,0.18)",
  },

  levelUpWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },

  levelUpPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(20, 74, 49, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(215,240,224,0.5)",
  },

  levelUpText: {
    color: "#D7F0E0",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  newBestPill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(224,190,106,0.12)",
    borderWidth: 1,
    borderColor: "rgba(224,190,106,0.4)",
  },

  newBestText: {
    color: "#E0BE6A",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  restartButton: {
    marginTop: 18,
    width: "100%",
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#2563EB",
  },

  restartButtonPressed: {
    backgroundColor: "#1D4ED8",
    opacity: 0.9,
  },

  restartText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  menuButton: {
    marginTop: 10,
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
  },

  menuButtonPressed: {
    backgroundColor: "rgba(148,163,184,0.12)",
  },

  menuText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  // top wird inline per useWindowDimensions gesetzt
  feedback: {
    position: "absolute",
    left: 48,
    right: 48,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    opacity: 0.96,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },

  feedbackPerfect: {
    backgroundColor: "#166534",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.45)",
  },

  feedbackCorrect: {
    backgroundColor: "#15803D",
  },

  feedbackBad: {
    backgroundColor: "#334155",
  },

  feedbackEyebrow: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  feedbackPoints: {
    color: "#FDE68A",
    fontSize: 27,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 1,
  },

  feedbackCombo: {
    color: "#DCFCE7",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },
});
