// Datei: game/layout.ts
// Berechnet Kamera, Tonnen- und Item-Position so, dass die Tonnen auf JEDEM
// Bildschirm die volle Breite füllen (egal ob 3, 4 oder 5 Tonnen). Dieselbe
// Kamera wird in JS nachgebaut, um die 3D-Positionen auf den Bildschirm zu
// projizieren – für Beschriftungen, Tipp-Ziele und Punkte-Einblendungen.

import * as THREE from "three";

export const CAMERA_FOV = 42;
export const BIN_WIDTH = 1.12; // Breite des Tonnen-Modells (Welt-Einheiten)
export const BIN_HEIGHT = 1.58;
export const BIN_OPENING_Y = 1.62;
const BIN_GAP = 0.16;
const SIDE_MARGIN = 0.14;
const PITCH = THREE.MathUtils.degToRad(17);
/** Eingelassene Front der Tonne (siehe trash-bin.tsx): Mitte, Breite, Tiefe. */
const FACE_Y = 0.68;
const FACE_W = 0.68;
const FACE_Z = 0.46;

/** Wo die Tonnen vertikal stehen (NDC, +1 = oben). */
const BINS_NDC_Y = 0.12;
/** Wo das Item vor dem Wurf schwebt (NDC). */
const ITEM_NDC_Y = -0.56;

export type ScreenRect = { x: number; y: number; w: number; h: number };

export type GameLayout = {
  camera: { position: THREE.Vector3; target: THREE.Vector3 };
  bins: { x: number; z: number }[];
  binRects: ScreenRect[];
  /** Bildschirmpunkt über der Öffnung jeder Tonne (für „+10“). */
  binTops: { x: number; y: number }[];
  /** Mitte und Breite der Tonnen-Front auf dem Bildschirm (für die Beschriftung). */
  binFaces: { x: number; y: number; w: number }[];
  item: { position: THREE.Vector3; scale: number; screen: { x: number; y: number } };
  /** Wurf-Winkel (Grad, 0 = gerade hoch) vom Item zu jeder Tonne. */
  binAngles: number[];
};

export type LayoutOptions = {
  /** Vertikale Lage der Tonnen (NDC, +1 = oben). */
  binsNdcY?: number;
  /** Vertikale Lage des Items vor dem Wurf (NDC). */
  itemNdcY?: number;
  /** Item-Breite als Anteil der Bildschirmbreite. */
  itemWidth?: number;
};

export function computeLayout(
  width: number,
  height: number,
  binCount: number,
  options: LayoutOptions = {},
): GameLayout {
  const binsNdcY = options.binsNdcY ?? BINS_NDC_Y;
  const itemNdcY = options.itemNdcY ?? ITEM_NDC_Y;
  const itemWidth = options.itemWidth ?? 0.3;
  const aspect = Math.max(width, 1) / Math.max(height, 1);
  const tanV = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  const tanH = tanV * aspect;

  const rowWidth = binCount * BIN_WIDTH + (binCount - 1) * BIN_GAP;
  const halfW = rowWidth / 2 + SIDE_MARGIN;
  // Abstand, bei dem die Reihe genau in die Breite passt (bei 0.6 Tiefe vorn).
  const distance = halfW / tanH + 0.6;

  const binsY = 0.85;
  const target = new THREE.Vector3(0, binsY - binsNdcY * distance * tanV, 0);
  const position = new THREE.Vector3(
    0,
    target.y + Math.sin(PITCH) * distance,
    Math.cos(PITCH) * distance,
  );

  const cam = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 80);
  cam.position.copy(position);
  cam.lookAt(target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();

  const toScreen = (v: THREE.Vector3) => {
    const p = v.clone().project(cam);
    return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height };
  };

  const bins = Array.from({ length: binCount }, (_, i) => ({
    x: (i - (binCount - 1) / 2) * (BIN_WIDTH + BIN_GAP),
    z: 0,
  }));

  const binRects = bins.map((b) => {
    const tl = toScreen(new THREE.Vector3(b.x - BIN_WIDTH / 2, BIN_OPENING_Y + 0.2, b.z));
    const br = toScreen(new THREE.Vector3(b.x + BIN_WIDTH / 2, 0, b.z + 0.45));
    return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
  });

  const binTops = bins.map((b) =>
    toScreen(new THREE.Vector3(b.x, BIN_OPENING_Y + 0.1, b.z)),
  );

  const binFaces = bins.map((b) => {
    const c = toScreen(new THREE.Vector3(b.x, FACE_Y, FACE_Z));
    const l = toScreen(new THREE.Vector3(b.x - FACE_W / 2, FACE_Y, FACE_Z));
    return { x: c.x, y: c.y, w: 2 * (c.x - l.x) };
  });

  // Item: auf dem Sichtstrahl durch (0, ITEM_NDC_Y), 38 % des Weges zur Szene.
  const ray = new THREE.Vector3(0, itemNdcY, 0.5).unproject(cam).sub(position).normalize();
  const itemDistance = distance * 0.38;
  const itemPos = position.clone().add(ray.multiplyScalar(itemDistance));
  // Item soll ~30 % (bzw. itemWidth) der Bildschirmbreite einnehmen (Modelle sind ~0.55 groß).
  const visibleWidth = 2 * itemDistance * tanH;
  const itemScale = (visibleWidth * itemWidth) / 0.55;
  const itemScreen = toScreen(itemPos);

  const binAngles = binTops.map((top) =>
    THREE.MathUtils.radToDeg(Math.atan2(top.x - itemScreen.x, itemScreen.y - top.y)),
  );

  return {
    camera: { position, target },
    bins,
    binRects,
    binTops,
    binFaces,
    item: { position: itemPos, scale: itemScale, screen: itemScreen },
    binAngles,
  };
}
