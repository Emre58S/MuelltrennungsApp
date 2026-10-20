// Datei: components/game/trash-bin.tsx — Low-Poly-Tonne
//
// Schlichte, realistische 240-Liter-Tonne im Low-Poly-Stil (facettierte
// Kanten, flache Schattierung). Ruhige, klare Rückmeldung:
//  - Zielen: Tonne hebt sich leicht, Deckel öffnet sich, Ring am Boden leuchtet
//  - Treffer: federt kurz, Deckel klappt einmal auf/zu
//  - Fehler: kurzes Kopfschütteln, Deckel bleibt zu

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type BinDef } from "@/game/bins";

import { type FxRef } from "./fx";
import { lowpoly, lowpolyOwn, roundedFrustum, roundedSlab } from "./materials";

export type BinEvent = { type: "hit" | "perfect" | "reject"; id: number };

const LID_OPEN = 1.0;
const BODY_Y = 0.08;
const BODY_H = 1.42;
const BOTTOM = { w: 0.9, d: 0.84 };
const TOP = { w: 1.06, d: 1.0 };

function frontZ(y: number) {
  const k = (y - BODY_Y) / BODY_H;
  return (BOTTOM.d + (TOP.d - BOTTOM.d) * k) / 2;
}
const TAPER = Math.atan((TOP.d - BOTTOM.d) / 2 / BODY_H);

// seg = 1 → abgeschrägte statt runde Ecken: typischer Low-Poly-Look
const GEO = {
  body: roundedFrustum(BOTTOM, TOP, BODY_H, 0.12, 1),
  inset: roundedSlab(0.68, 0.9, 0.014, 0.08, 1),
  rim: roundedSlab(1.12, 1.06, 0.07, 0.12, 1),
  opening: roundedSlab(0.92, 0.84, 0.02, 0.1, 1),
  lid: roundedSlab(1.16, 1.1, 0.06, 0.13, 1),
  grip: new THREE.BoxGeometry(0.5, 0.05, 0.06),
  wheel: new THREE.CylinderGeometry(0.17, 0.17, 0.11, 8),
  hub: new THREE.CylinderGeometry(0.07, 0.07, 0.12, 6),
  axle: new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6),
  pad: new THREE.CircleGeometry(0.8, 8),
  blob: new THREE.CircleGeometry(0.62, 16),
  ring: new THREE.RingGeometry(0.72, 0.86, 8),
};

const SHARED = {
  dark: new THREE.MeshBasicMaterial({ color: "#22262B" }),
  // Günstiger Boden-Schatten statt Echtzeit-Schatten (flüssiger auf Handys)
  blob: new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.22, depthWrite: false }),
  wheel: lowpoly("#2E3238"),
  hub: lowpoly("#A7ADB3"),
};

function shade(hex: string, amount: number) {
  return `#${new THREE.Color(hex).offsetHSL(0, 0, amount).getHexString()}`;
}

export const TrashBin = memo(function TrashBin({
  bin,
  x,
  z,
  index,
  aimed,
  event,
  fx,
}: {
  bin: BinDef;
  x: number;
  z: number;
  index: number;
  aimed: boolean;
  event: BinEvent | null;
  fx: FxRef;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const anim = useRef({ hit: 0, reject: 0, lift: 0, lastId: -1 });

  const mats = useMemo(
    () => ({
      body: lowpolyOwn(bin.color),
      inset: lowpoly(shade(bin.color, -0.06)),
      lid: lowpoly(shade(bin.color, 0.06)),
      rim: lowpoly(shade(bin.color, -0.03)),
      pad: new THREE.MeshBasicMaterial({
        color: bin.colorLight,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
      ring: new THREE.MeshBasicMaterial({
        color: "#FFFFFF",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    }),
    [bin],
  );
  useEffect(
    () => () => {
      mats.body.dispose();
      mats.pad.dispose();
      mats.ring.dispose();
    },
    [mats],
  );

  useEffect(() => {
    if (!event || event.id === anim.current.lastId) return;
    anim.current.lastId = event.id;
    if (event.type === "reject") anim.current.reject = 1;
    else anim.current.hit = event.type === "perfect" ? 1.3 : 1;
  }, [event]);

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const lid = lidRef.current;
    if (!root || !lid) return;

    const f = fx.current;
    const delta = Math.min(rawDelta, 0.05) * f.timeScale;
    const t = state.clock.elapsedTime;
    const a = anim.current;

    a.lift = THREE.MathUtils.damp(a.lift, aimed ? 1 : 0, 12, delta);
    a.hit = Math.max(0, a.hit - delta * 2.8);
    a.reject = Math.max(0, a.reject - delta * 2.2);

    root.position.y = a.lift * 0.07;

    // Treffer: einmal weich federn
    const wave = a.hit > 0 ? Math.sin((1 - a.hit / 1.3) * Math.PI * 2) * a.hit : 0;
    root.scale.set(1 + wave * 0.04, 1 - wave * 0.06, 1 + wave * 0.04);
    // Fehler: kurzes Kopfschütteln
    root.rotation.z = a.reject > 0 && !f.calm ? Math.sin(t * 28) * 0.06 * a.reject : 0;

    // Deckel: offen beim Zielen, einmal auf/zu beim Treffer, zu bei Fehler
    let lidTarget = aimed ? LID_OPEN : 0;
    if (a.hit > 0.3) lidTarget = LID_OPEN * 0.7;
    if (a.reject > 0.2) lidTarget = 0;
    lid.rotation.x = -THREE.MathUtils.damp(-lid.rotation.x, lidTarget, 16, delta);

    if (ringRef.current) {
      ringRef.current.visible = a.lift > 0.02;
      ringRef.current.scale.setScalar(0.92 + a.lift * 0.12);
      mats.ring.opacity = a.lift * 0.7;
    }
    mats.body.emissive.set(bin.color);
    mats.body.emissiveIntensity = a.lift * 0.14 + a.hit * 0.22;
  });

  const zInset = frontZ(0.68) + 0.004;

  return (
    <group position={[x, 0, z]}>
      <mesh geometry={GEO.pad} material={mats.pad} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]} />
      <mesh geometry={GEO.blob} material={SHARED.blob} position={[0.06, 0.016, -0.04]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.9, 1]} />
      <mesh
        ref={ringRef}
        geometry={GEO.ring}
        material={mats.ring}
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 8]}
        visible={false}
      />

      <group ref={rootRef}>
        <mesh geometry={GEO.body} material={mats.body} position={[0, BODY_Y, 0]} castShadow receiveShadow />

        {/* Eingelassene Front + Griffleiste */}
        <group position={[0, 0.68, zInset]} rotation={[Math.PI / 2 + TAPER, 0, 0]}>
          <mesh geometry={GEO.inset} material={mats.inset} />
        </group>
        <mesh geometry={GEO.grip} material={mats.rim} position={[0, 1.36, frontZ(1.36) + 0.02]} />

        {/* Rand + Öffnung */}
        <group position={[0, BODY_Y + BODY_H - 0.02, 0]}>
          <mesh geometry={GEO.rim} material={mats.rim} castShadow />
          <mesh geometry={GEO.opening} material={SHARED.dark} position={[0, 0.06, 0]} />
        </group>

        {/* Deckel – Scharnier hinten */}
        <group ref={lidRef} position={[0, BODY_Y + BODY_H + 0.04, -TOP.d / 2 - 0.03]}>
          <group position={[0, 0, 0.55]}>
            <mesh geometry={GEO.lid} material={mats.lid} castShadow />
            <mesh geometry={GEO.grip} material={mats.rim} position={[0, 0.03, 0.57]} />
          </group>
        </group>

        {/* Räder + Achse */}
        <mesh geometry={GEO.axle} material={SHARED.wheel} position={[0, 0.17, -0.36]} rotation={[0, 0, Math.PI / 2]} />
        {[-0.48, 0.48].map((wx) => (
          <group key={wx} position={[wx, 0.17, -0.36]} rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={GEO.wheel} material={SHARED.wheel} castShadow />
            <mesh geometry={GEO.hub} material={SHARED.hub} />
          </group>
        ))}
      </group>
    </group>
  );
});
