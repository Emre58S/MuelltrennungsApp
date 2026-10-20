// Datei: components/game/toon.ts
// „Toon Premium“-Look: harte Schattierungsstufen (Cel-Shading) wie in
// hochwertigen Comic-Spielen (Supercell, Zelda Wind Waker) + dunkle
// Umrisslinien (Inverted-Hull-Technik). Ein gemeinsamer Verlauf für alles.

import * as THREE from "three";

let gradient: THREE.DataTexture | null = null;

/** 3 Stufen: Schatten · Mitte · Licht. Nearest-Filter → harte Kanten. */
export function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  const data = new Uint8Array([150, 212, 255]);
  gradient = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

export function toonMaterial(
  color: string,
  opts: { transparent?: boolean; opacity?: number; side?: THREE.Side } = {},
) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient(),
    transparent: opts.transparent ?? (opts.opacity ?? 1) < 1,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
}

let outline: THREE.MeshBasicMaterial | null = null;

/** Rückseiten-Material für Umrisse: Mesh leicht vergrößert dahinter zeichnen. */
export function outlineMaterial(): THREE.MeshBasicMaterial {
  if (outline) return outline;
  outline = new THREE.MeshBasicMaterial({ color: "#1E2228", side: THREE.BackSide });
  return outline;
}

/* ── Abgerundeter Kegelstumpf (für realistische Mülltonnen) ─────────────── */

function roundedRect(w: number, d: number, r: number, seg: number): [number, number][] {
  const pts: [number, number][] = [];
  const hw = w / 2 - r;
  const hd = d / 2 - r;
  const corners: [number, number, number][] = [
    [hw, hd, 0],
    [-hw, hd, Math.PI / 2],
    [-hw, -hd, Math.PI],
    [hw, -hd, (3 * Math.PI) / 2],
  ];
  for (const [cx, cz, start] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = start + (i / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  }
  return pts;
}

/**
 * Tonnen-Korpus: unten schmaler als oben (wie echte 240-l-Tonnen),
 * abgerundete Ecken, glatte Normalen für weiche Toon-Schattierung.
 * Oben offen (dort sitzen Rand und Deckel).
 */
export function roundedFrustum(
  bottom: { w: number; d: number },
  top: { w: number; d: number },
  height: number,
  radius: number,
  seg = 4,
): THREE.BufferGeometry {
  const b = roundedRect(bottom.w, bottom.d, radius * 0.85, seg);
  const t = roundedRect(top.w, top.d, radius, seg);
  const n = b.length;
  const pos: number[] = [];
  const idx: number[] = [];

  for (const [x, z] of b) pos.push(x, 0, z);
  for (const [x, z] of t) pos.push(x, height, z);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(i, n + i, j, j, n + i, n + j);
  }
  // Boden (eigene Mitte)
  const c = pos.length / 3;
  pos.push(0, 0, 0);
  for (let i = 0; i < n; i++) idx.push(c, i, (i + 1) % n);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Flacher abgerundeter Block (Deckel, Rand). */
export function roundedSlab(w: number, d: number, h: number, r: number, seg = 4) {
  const ring = roundedRect(w, d, r, seg);
  const shape = new THREE.Shape();
  ring.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z)));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: h * 0.25,
    bevelSize: h * 0.25,
    bevelSegments: 2,
  });
  // Extrude läuft entlang z → auf die Seite legen (Höhe = y)
  g.rotateX(Math.PI / 2);
  g.translate(0, h, 0);
  g.computeVertexNormals();
  return g;
}
