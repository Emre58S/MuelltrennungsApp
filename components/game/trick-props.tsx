// Datei: components/game/trick-props.tsx
// Hindernisse der Trickwürfe als Low-Poly-Modelle: Trampolin, Auto, Zaun.
// Jedes wird einmal gebaut und „gebacken“ (model-cache: bake) – ein Auto
// kostet so 1–2 Zeichenaufrufe statt Dutzender. Maße passen zur Physik
// (game/trick-levels.ts → PROP_SIZE).

import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";

import { PROP_SIZE, type TrickProp } from "@/game/trick-levels";

import { lowpoly, roundedFrame } from "./materials";
import { bake } from "./model-cache";

function add(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  color: string,
  pos: [number, number, number],
  rot?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geometry, lowpoly(color));
  mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  group.add(mesh);
  return mesh;
}

function trampoline(): THREE.Group {
  const g = new THREE.Group();
  const { halfW, halfD, top } = PROP_SIZE.trampoline;
  const w = halfW * 2;
  const d = halfD * 2;
  // Rahmen mit Polsterung, Sprungmatte, vier Beine
  add(g, roundedFrame(w + 0.24, d + 0.24, w, d, 0.07, 0.14, 2), "#2563EB", [0, top - 0.06, 0]);
  add(g, new THREE.BoxGeometry(w, 0.025, d), "#111827", [0, top - 0.01, 0]);
  const leg = new THREE.CylinderGeometry(0.035, 0.035, top - 0.06, 6);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) add(g, leg, "#6B7280", [sx * (halfW + 0.05), (top - 0.06) / 2, sz * (halfD + 0.05)]);
  return g;
}

function car(color: string): THREE.Group {
  const g = new THREE.Group();
  const { body, cabin } = PROP_SIZE.car;
  const dark = "#1F2937";
  // Karosserie + Schweller, Kabine mit Fensterband, Räder, Lichter
  add(g, new THREE.BoxGeometry(body.halfW * 2, body.halfH * 2, body.halfD * 2), color, [0, body.y, 0]);
  add(g, new THREE.BoxGeometry(body.halfW * 2 + 0.02, 0.1, body.halfD * 2 + 0.02), dark, [0, body.y - body.halfH + 0.05, 0]);
  add(g, new THREE.BoxGeometry(cabin.halfW * 2, cabin.halfH * 2, cabin.halfD * 2), color, [cabin.dx, cabin.y, 0]);
  add(g, new THREE.BoxGeometry(cabin.halfW * 2 + 0.02, cabin.halfH * 1.1, cabin.halfD * 2 + 0.02), "#334155", [
    cabin.dx,
    cabin.y + 0.01,
    0,
  ]);
  const wheel = new THREE.CylinderGeometry(0.2, 0.2, 0.16, 10);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(g, wheel, "#111827", [sx * (body.halfW - 0.35), 0.2, sz * (body.halfD - 0.02)], [Math.PI / 2, 0, 0]);
  const lamp = new THREE.BoxGeometry(0.04, 0.09, 0.16);
  for (const sz of [-1, 1]) {
    add(g, lamp, "#FDE68A", [body.halfW + 0.01, body.y + 0.08, sz * (body.halfD - 0.14)]);
    add(g, lamp, "#EF4444", [-body.halfW - 0.01, body.y + 0.08, sz * (body.halfD - 0.14)]);
  }
  return g;
}

function fence(w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const wood = "#B45309";
  const posts = Math.max(2, Math.round(w / 0.7) + 1);
  const post = new THREE.BoxGeometry(0.09, h, 0.09);
  for (let i = 0; i < posts; i++) add(g, post, wood, [-w / 2 + (w * i) / (posts - 1), h / 2, 0]);
  const rail = new THREE.BoxGeometry(w, 0.08, 0.05);
  add(g, rail, "#C2681C", [0, h * 0.38, 0.02]);
  add(g, rail, "#C2681C", [0, h * 0.82, 0.02]);
  return g;
}

function build(prop: TrickProp): THREE.Object3D {
  const model =
    prop.kind === "trampoline" ? trampoline() : prop.kind === "car" ? car(prop.color) : fence(prop.w, prop.h);
  const baked = bake(model);
  baked.position.set(prop.x, 0, prop.z);
  // Bau-Geometrien wurden ins gebackene Modell kopiert
  model.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  return baked;
}

/** Alle Hindernisse eines Levels. */
export const TrickProps = memo(function TrickProps({ props }: { props: TrickProp[] }) {
  const objects = useMemo(() => props.map(build), [props]);
  useEffect(
    () => () =>
      objects.forEach((o) =>
        o.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) mesh.geometry.dispose();
        }),
      ),
    [objects],
  );
  return (
    <>
      {objects.map((object, i) => (
        <primitive key={i} object={object} />
      ))}
    </>
  );
});
