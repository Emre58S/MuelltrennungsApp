// Datei: components/game/trash-bin.tsx — Toon-Charakter-Tonne
//
// Form nach echter 240-Liter-Tonne (unten schmaler, abgerundete Ecken,
// überstehender Deckel mit Griff, Räder hinten), im Comic-Stil mit Umriss.
// Charakter wie Om Nom (Cut the Rope): Augen folgen dem Gegenstand, der
// Deckel ist der „Mund“ – geht beim Zielen auf, „kaut“ beim Treffer, knallt
// bei Falschem zu (böse Brauen + Kopfschütteln). Gelegentliches Blinzeln.

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type BinDef } from "@/game/bins";

import { type FxRef } from "./fx";
import { outlineMaterial, roundedFrustum, roundedSlab, toonMaterial } from "./toon";

export type BinEvent = { type: "hit" | "perfect" | "reject"; id: number };

const LID_OPEN = 1.05;
const LID_IDLE = 0.04;
const OUTLINE = 1.035;

// Maße (Welt-Einheiten); Vorderseite zeigt zur Kamera (+z)
const BODY_Y = 0.08;
const BODY_H = 1.42;
const BOTTOM = { w: 0.9, d: 0.84 };
const TOP = { w: 1.06, d: 1.0 };
const EYE_Y = 1.16;
const EYE_X = 0.2;

/** Vorderfläche bei Höhe y (Tonne verjüngt sich nach unten). */
function frontZ(y: number) {
  const k = (y - BODY_Y) / BODY_H;
  return (BOTTOM.d + (TOP.d - BOTTOM.d) * k) / 2;
}
const TAPER = Math.atan((TOP.d - BOTTOM.d) / 2 / BODY_H);

// Geometrien einmal für alle Tonnen
const GEO = {
  body: roundedFrustum(BOTTOM, TOP, BODY_H, 0.13),
  rim: roundedSlab(1.12, 1.06, 0.07, 0.14),
  opening: roundedSlab(0.92, 0.84, 0.02, 0.1),
  lid: roundedSlab(1.16, 1.1, 0.06, 0.15),
  handle: new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10),
  plate: roundedSlab(0.56, 0.34, 0.015, 0.06),
  eye: new THREE.SphereGeometry(0.155, 20, 16),
  pupil: new THREE.SphereGeometry(0.078, 16, 12),
  shine: new THREE.SphereGeometry(0.026, 8, 6),
  brow: new THREE.CapsuleGeometry(0.028, 0.15, 4, 8),
  wheel: new THREE.CylinderGeometry(0.17, 0.17, 0.11, 20),
  hub: new THREE.CylinderGeometry(0.07, 0.07, 0.12, 12),
  axle: new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8),
  pad: new THREE.CircleGeometry(0.78, 40),
  ring: new THREE.RingGeometry(0.7, 0.84, 48),
};

const SHARED = {
  white: toonMaterial("#FFFFFF"),
  pupil: new THREE.MeshBasicMaterial({ color: "#1E2228" }),
  dark: new THREE.MeshBasicMaterial({ color: "#14181C" }),
  wheel: toonMaterial("#2A2E33"),
  hub: toonMaterial("#8A9096"),
  outline: outlineMaterial(),
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
  const eyesRef = useRef<THREE.Group>(null);
  const pupilL = useRef<THREE.Group>(null);
  const pupilR = useRef<THREE.Group>(null);
  const browL = useRef<THREE.Mesh>(null);
  const browR = useRef<THREE.Mesh>(null);

  const anim = useRef({
    hit: 0,
    reject: 0,
    lift: 0,
    lastId: -1,
    blink: 0,
    nextBlink: 2 + index * 1.3,
    look: new THREE.Vector2(),
  });

  const mats = useMemo(
    () => ({
      body: toonMaterial(bin.color),
      lid: toonMaterial(shade(bin.color, 0.06)),
      rim: toonMaterial(shade(bin.color, -0.04)),
      pad: new THREE.MeshBasicMaterial({
        color: bin.colorLight,
        transparent: true,
        opacity: 0.35,
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
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  useEffect(() => {
    if (!event || event.id === anim.current.lastId) return;
    anim.current.lastId = event.id;
    if (event.type === "reject") anim.current.reject = 1;
    else anim.current.hit = event.type === "perfect" ? 1.4 : 1;
  }, [event]);

  const eyeWorld = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const lid = lidRef.current;
    if (!root || !lid) return;

    const f = fx.current;
    const delta = Math.min(rawDelta, 0.05) * f.timeScale;
    const t = state.clock.elapsedTime;
    const a = anim.current;

    a.lift = THREE.MathUtils.damp(a.lift, aimed ? 1 : 0, 14, delta);
    a.hit = Math.max(0, a.hit - delta * 2.2);
    a.reject = Math.max(0, a.reject - delta * 1.6);

    // Atmen + vor Freude hüpfen beim Zielen
    const breathe = f.calm ? 0 : Math.sin(t * 1.8 + index * 1.3) * 0.012;
    const hop = a.lift * (0.1 + (f.calm ? 0 : Math.abs(Math.sin(t * 9)) * 0.04));
    root.position.y = breathe + hop;

    // Squash & Stretch beim Treffer
    const wave = a.hit > 0 ? Math.sin((1 - a.hit / 1.4) * Math.PI * 4) * a.hit : 0;
    root.scale.set(1 + wave * 0.07 + a.lift * 0.04, 1 - wave * 0.1 + a.lift * 0.04, 1 + wave * 0.07);
    root.rotation.z = a.reject > 0 ? Math.sin(t * 34) * 0.1 * a.reject : 0;

    // Deckel = Mund: offen beim Zielen, kauen beim Treffer, zu bei Fehler
    let lidTarget = aimed ? LID_OPEN : LID_IDLE + (f.calm ? 0 : Math.max(0, Math.sin(t * 0.7 + index)) * 0.05);
    if (a.hit > 0) lidTarget = LID_OPEN * (0.25 + Math.abs(Math.sin(t * 16)) * 0.6);
    if (a.reject > 0.25) lidTarget = 0;
    lid.rotation.x = -THREE.MathUtils.damp(-lid.rotation.x, lidTarget, 18, delta);

    // Blinzeln
    a.nextBlink -= delta;
    if (a.nextBlink <= 0 && !f.calm) {
      a.blink = 1;
      a.nextBlink = 2.5 + Math.random() * 3.5;
    }
    a.blink = Math.max(0, a.blink - delta * 8);
    const blinkScale = 1 - Math.sin(a.blink * Math.PI) * 0.92;

    // Augen: groß beim Zielen, ^^ beim Treffer, zusammengekniffen bei Fehler
    const eyes = eyesRef.current;
    if (eyes) {
      const happy = a.hit > 0.15 ? 1 : 0;
      const angry = a.reject > 0.1 ? 1 : 0;
      const sy = blinkScale * (1 + a.lift * 0.18) * (happy ? 0.28 : angry ? 0.55 : 1);
      eyes.scale.set(1 + a.lift * 0.12, sy, 1);
    }

    // Pupillen folgen dem Gegenstand
    eyeWorld.set(x, root.position.y + EYE_Y, z + frontZ(EYE_Y));
    const dx = f.lookAt.x - eyeWorld.x;
    const dy = f.lookAt.y - eyeWorld.y;
    const dz = Math.max(f.lookAt.z - eyeWorld.z, 0.3);
    a.look.x = THREE.MathUtils.damp(a.look.x, THREE.MathUtils.clamp(dx / dz, -1, 1), 10, delta);
    a.look.y = THREE.MathUtils.damp(a.look.y, THREE.MathUtils.clamp(dy / dz, -1, 1), 10, delta);
    for (const p of [pupilL.current, pupilR.current]) {
      if (p) p.position.set(a.look.x * 0.06, a.look.y * 0.06, 0);
    }

    // Brauen: hoch beim Zielen, schräg-böse bei Fehler
    const browY = EYE_Y + 0.2 + a.lift * 0.05 - a.reject * 0.03;
    const angle = a.reject > 0.1 ? 0.45 : a.lift * -0.15;
    if (browL.current) {
      browL.current.position.y = browY;
      browL.current.rotation.z = Math.PI / 2 - angle;
    }
    if (browR.current) {
      browR.current.position.y = browY;
      browR.current.rotation.z = Math.PI / 2 + angle;
    }

    // Leuchtring am Boden + Glühen beim Zielen
    if (ringRef.current) {
      ringRef.current.visible = a.lift > 0.02;
      ringRef.current.scale.setScalar(0.9 + a.lift * 0.15 + Math.sin(t * 7) * 0.03);
      mats.ring.opacity = a.lift * 0.85;
    }
    mats.body.emissive.set(bin.color);
    mats.body.emissiveIntensity = a.lift * 0.18 + a.hit * 0.35;
  });

  const zEye = frontZ(EYE_Y);
  const zPlate = frontZ(0.62) + 0.006;

  return (
    <group position={[x, 0, z]}>
      {/* Stellplatz + Leuchtring (bewegen sich nicht mit) */}
      <mesh geometry={GEO.pad} material={mats.pad} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh
        ref={ringRef}
        geometry={GEO.ring}
        material={mats.ring}
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      />

      <group ref={rootRef}>
        {/* Korpus + Umriss */}
        <group position={[0, BODY_Y, 0]}>
          <mesh geometry={GEO.body} material={mats.body} castShadow receiveShadow />
          <mesh geometry={GEO.body} material={SHARED.outline} scale={[OUTLINE, 1.012, OUTLINE]} position={[0, -0.008, 0]} />
        </group>

        {/* Rand + dunkle Öffnung */}
        <group position={[0, BODY_Y + BODY_H - 0.02, 0]}>
          <mesh geometry={GEO.rim} material={mats.rim} castShadow />
          <mesh geometry={GEO.rim} material={SHARED.outline} scale={[1.03, 1.3, 1.03]} position={[0, -0.01, 0]} />
          <mesh geometry={GEO.opening} material={SHARED.dark} position={[0, 0.06, 0]} />
        </group>

        {/* Aufkleber vorne (Tonnenfarbe-Band auf Weiß) */}
        <group position={[0, 0.62, zPlate]} rotation={[Math.PI / 2 + TAPER, 0, 0]}>
          <mesh geometry={GEO.plate} material={SHARED.white} />
        </group>

        {/* Gesicht */}
        <group ref={eyesRef} position={[0, EYE_Y, zEye]}>
          {[-EYE_X, EYE_X].map((ex, i) => (
            <group key={ex} position={[ex, 0, 0]}>
              <mesh geometry={GEO.eye} material={SHARED.white} scale={[1, 1.1, 0.45]} />
              <mesh geometry={GEO.eye} material={SHARED.outline} scale={[1.09, 1.19, 0.4]} />
              <group ref={i === 0 ? pupilL : pupilR}>
                <mesh geometry={GEO.pupil} material={SHARED.pupil} position={[0, 0, 0.06]} scale={[1, 1.1, 0.5]} />
                <mesh geometry={GEO.shine} material={SHARED.white} position={[0.026, 0.03, 0.1]} />
              </group>
            </group>
          ))}
        </group>
        <mesh ref={browL} geometry={GEO.brow} material={SHARED.pupil} position={[-EYE_X, EYE_Y + 0.2, zEye + 0.02]} />
        <mesh ref={browR} geometry={GEO.brow} material={SHARED.pupil} position={[EYE_X, EYE_Y + 0.2, zEye + 0.02]} />

        {/* Deckel – Scharnier hinten, öffnet nach oben (Mund) */}
        <group ref={lidRef} position={[0, BODY_Y + BODY_H + 0.04, -TOP.d / 2 - 0.03]}>
          <group position={[0, 0, 0.55]}>
            <mesh geometry={GEO.lid} material={mats.lid} castShadow />
            <mesh geometry={GEO.lid} material={SHARED.outline} scale={[1.03, 1.4, 1.03]} position={[0, -0.01, 0]} />
            {/* Griff vorne */}
            <mesh
              geometry={GEO.handle}
              material={mats.rim}
              position={[0, 0.06, 0.56]}
              rotation={[0, 0, Math.PI / 2]}
            />
          </group>
        </group>

        {/* Räder + Achse hinten */}
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
