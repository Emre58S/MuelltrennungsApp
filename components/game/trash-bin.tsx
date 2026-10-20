// Datei: components/game/trash-bin.tsx — Charakter-Tonne (Stylized Realism)
//
// Form nach echter 240-Liter-Tonne, Material wie Spritzguss-Plastik.
// Charakter im Pixar-Stil: glänzende Augen mit Iris + Glanzpunkt, echte
// Augenlider (Blinzeln, verschmitzt, verärgert), Brauen, Wangen-Röte.
// Der Deckel ist der Mund: öffnet beim Zielen, kaut beim Treffer, knallt bei
// Falschem zu – und bewegt sich, wenn die Tonne spricht (talking).

import { useFrame } from "@react-three/fiber/native";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { type BinDef } from "@/game/bins";

import { type FxRef } from "./fx";
import { plastic, roundedFrustum, roundedSlab } from "./materials";

export type BinEvent = { type: "hit" | "perfect" | "reject"; id: number };

const LID_OPEN = 1.0;
const LID_IDLE = 0.03;

// Maße (Welt-Einheiten); Vorderseite zeigt zur Kamera (+z)
const BODY_Y = 0.08;
const BODY_H = 1.42;
const BOTTOM = { w: 0.9, d: 0.84 };
const TOP = { w: 1.06, d: 1.0 };
const EYE_Y = 1.12;
const EYE_X = 0.205;
const EYE_R = 0.16;

// Augenlid-Rotation: offen (nach hinten weggeklappt) … zu (nach vorn)
const LID_UP = -1.45;
const LID_DOWN = 1.45;

/** Jede Tonne hat ihre eigene Augenfarbe → mehr Persönlichkeit. */
const IRIS: Record<string, string> = {
  bio: "#7A9A3A",
  gelb: "#3C7FD0",
  rest: "#8B5A2B",
  papier: "#2F6FB8",
  glas: "#2E8B6A",
};

function frontZ(y: number) {
  const k = (y - BODY_Y) / BODY_H;
  return (BOTTOM.d + (TOP.d - BOTTOM.d) * k) / 2;
}
const TAPER = Math.atan((TOP.d - BOTTOM.d) / 2 / BODY_H);

const GEO = {
  body: roundedFrustum(BOTTOM, TOP, BODY_H, 0.13),
  inset: roundedSlab(0.66, 0.62, 0.012, 0.08),
  rim: roundedSlab(1.12, 1.06, 0.07, 0.14),
  opening: roundedSlab(0.92, 0.84, 0.02, 0.1),
  lid: roundedSlab(1.16, 1.1, 0.06, 0.15),
  handle: new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10),
  eye: new THREE.SphereGeometry(EYE_R, 28, 20),
  iris: new THREE.CircleGeometry(EYE_R * 0.56, 28),
  pupil: new THREE.CircleGeometry(EYE_R * 0.3, 24),
  shine: new THREE.CircleGeometry(EYE_R * 0.13, 12),
  eyelid: new THREE.SphereGeometry(EYE_R * 1.07, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
  brow: new THREE.CapsuleGeometry(0.026, 0.14, 4, 10),
  cheek: new THREE.CircleGeometry(0.075, 20),
  wheel: new THREE.CylinderGeometry(0.17, 0.17, 0.11, 24),
  hub: new THREE.CylinderGeometry(0.07, 0.07, 0.12, 12),
  axle: new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8),
  pad: new THREE.CircleGeometry(0.78, 40),
  ring: new THREE.RingGeometry(0.7, 0.84, 48),
};

const SHARED = {
  sclera: plastic("#FFFFFF", { roughness: 0.12 }),
  pupil: new THREE.MeshBasicMaterial({ color: "#121417" }),
  shine: new THREE.MeshBasicMaterial({ color: "#FFFFFF" }),
  dark: new THREE.MeshBasicMaterial({ color: "#14181C" }),
  wheel: plastic("#26292E", { roughness: 0.7 }),
  hub: plastic("#9AA0A6", { roughness: 0.35, metalness: 0.5 }),
  brow: plastic("#2A2420", { roughness: 0.6 }),
  cheek: new THREE.MeshBasicMaterial({
    color: "#FF7A8A",
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }),
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
  talking = false,
  event,
  fx,
}: {
  bin: BinDef;
  x: number;
  z: number;
  index: number;
  aimed: boolean;
  /** Tonne spricht gerade → Deckel bewegt sich wie ein Mund. */
  talking?: boolean;
  event: BinEvent | null;
  fx: FxRef;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pupilL = useRef<THREE.Group>(null);
  const pupilR = useRef<THREE.Group>(null);
  const lidL = useRef<THREE.Mesh>(null);
  const lidR = useRef<THREE.Mesh>(null);
  const browL = useRef<THREE.Mesh>(null);
  const browR = useRef<THREE.Mesh>(null);

  const anim = useRef({
    hit: 0,
    reject: 0,
    lift: 0,
    lastId: -1,
    blink: 0,
    nextBlink: 2 + index * 1.3,
    eyelid: LID_UP,
    look: new THREE.Vector2(),
    talk: 0,
  });

  const mats = useMemo(
    () => ({
      body: plastic(bin.color, { roughness: 0.38 }),
      inset: plastic(shade(bin.color, -0.05), { roughness: 0.5 }),
      lid: plastic(shade(bin.color, 0.05), { roughness: 0.32 }),
      rim: plastic(shade(bin.color, -0.06), { roughness: 0.4 }),
      eyelid: plastic(shade(bin.color, 0.03), { roughness: 0.38 }),
      iris: new THREE.MeshBasicMaterial({ color: IRIS[bin.key] ?? "#3C7FD0" }),
      pad: new THREE.MeshBasicMaterial({
        color: bin.colorLight,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
      ring: new THREE.MeshBasicMaterial({
        color: "#FFFFFF",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      cheek: SHARED.cheek.clone(),
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

    a.lift = THREE.MathUtils.damp(a.lift, aimed ? 1 : 0, 12, delta);
    a.hit = Math.max(0, a.hit - delta * 2.2);
    a.reject = Math.max(0, a.reject - delta * 1.5);
    a.talk = THREE.MathUtils.damp(a.talk, talking ? 1 : 0, 14, delta);

    // Atmen + Vorfreude beim Zielen (weich, nicht zappelig)
    const breathe = f.calm ? 0 : Math.sin(t * 1.6 + index * 1.3) * 0.01;
    root.position.y = breathe + a.lift * 0.08;

    // Squash & Stretch beim Treffer
    const wave = a.hit > 0 ? Math.sin((1 - a.hit / 1.4) * Math.PI * 3) * a.hit : 0;
    root.scale.set(1 + wave * 0.05 + a.lift * 0.03, 1 - wave * 0.07 + a.lift * 0.03, 1 + wave * 0.05);
    root.rotation.z = a.reject > 0 ? Math.sin(t * 30) * 0.08 * a.reject : 0;
    // Sprechen: leichtes Mitwippen
    root.rotation.x = a.talk * Math.sin(t * 9) * 0.02;

    // Deckel = Mund
    let lidTarget = aimed ? LID_OPEN : LID_IDLE;
    if (a.talk > 0.05) {
      // Silben: unregelmäßiges Auf/Zu wirkt wie echtes Sprechen
      const syll = Math.abs(Math.sin(t * 13) * Math.sin(t * 5.3 + index));
      lidTarget = 0.08 + syll * 0.42 * a.talk;
    }
    if (a.hit > 0) lidTarget = LID_OPEN * (0.25 + Math.abs(Math.sin(t * 15)) * 0.55);
    if (a.reject > 0.3) lidTarget = 0;
    lid.rotation.x = -THREE.MathUtils.damp(-lid.rotation.x, lidTarget, 20, delta);

    // Augenlider: Blinzeln + Ausdruck
    a.nextBlink -= delta;
    if (a.nextBlink <= 0 && !f.calm) {
      a.blink = 1;
      a.nextBlink = 2.2 + Math.random() * 3.8;
    }
    a.blink = Math.max(0, a.blink - delta * 7);
    let lidPose = LID_UP + 0.25; // entspannt: Lid leicht sichtbar
    if (aimed) lidPose = LID_UP; // weit offen vor Vorfreude
    if (a.hit > 0.2) lidPose = 0.55; // glücklich verschmitzt
    if (a.reject > 0.15) lidPose = 0.15; // verärgert halb zu
    const blinkPose = THREE.MathUtils.lerp(lidPose, LID_DOWN, Math.sin(a.blink * Math.PI));
    a.eyelid = THREE.MathUtils.damp(a.eyelid, blinkPose, a.blink > 0 ? 40 : 14, delta);
    if (lidL.current) lidL.current.rotation.x = a.eyelid;
    if (lidR.current) lidR.current.rotation.x = a.eyelid;

    // Blick folgt dem Gegenstand
    eyeWorld.set(x, root.position.y + EYE_Y, z + frontZ(EYE_Y));
    const dz = Math.max(f.lookAt.z - eyeWorld.z, 0.3);
    const lx = THREE.MathUtils.clamp((f.lookAt.x - eyeWorld.x) / dz, -1, 1);
    const ly = THREE.MathUtils.clamp((f.lookAt.y - eyeWorld.y) / dz, -1, 1);
    a.look.x = THREE.MathUtils.damp(a.look.x, lx, 9, delta);
    a.look.y = THREE.MathUtils.damp(a.look.y, ly, 9, delta);
    for (const p of [pupilL.current, pupilR.current]) {
      if (p) p.position.set(a.look.x * EYE_R * 0.35, a.look.y * EYE_R * 0.3, EYE_R * 0.76);
    }

    // Brauen
    const browY = EYE_Y + 0.21 + a.lift * 0.04 - a.reject * 0.025;
    const angle = a.reject > 0.1 ? 0.4 : a.lift * -0.12 + a.talk * Math.sin(t * 4) * 0.08;
    if (browL.current) {
      browL.current.position.y = browY;
      browL.current.rotation.z = Math.PI / 2 - angle;
    }
    if (browR.current) {
      browR.current.position.y = browY;
      browR.current.rotation.z = Math.PI / 2 + angle;
    }

    // Wangen erröten beim Treffer
    mats.cheek.opacity = Math.min(a.hit, 1) * 0.55;

    // Leuchtring am Boden + sanftes Glühen beim Zielen
    if (ringRef.current) {
      ringRef.current.visible = a.lift > 0.02;
      ringRef.current.scale.setScalar(0.9 + a.lift * 0.15 + Math.sin(t * 6) * 0.025);
      mats.ring.opacity = a.lift * 0.75;
    }
    mats.body.emissive.set(bin.color);
    mats.body.emissiveIntensity = a.lift * 0.12 + a.hit * 0.25;
  });

  const zEye = frontZ(EYE_Y);
  const zInset = frontZ(0.6) + 0.004;

  return (
    <group position={[x, 0, z]}>
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
        {/* Korpus */}
        <mesh geometry={GEO.body} material={mats.body} position={[0, BODY_Y, 0]} castShadow receiveShadow />
        {/* Eingelassene Frontfläche (Tiefe wie bei echten Tonnen) */}
        <group position={[0, 0.6, zInset]} rotation={[Math.PI / 2 + TAPER, 0, 0]}>
          <mesh geometry={GEO.inset} material={mats.inset} />
        </group>

        {/* Rand + Öffnung */}
        <group position={[0, BODY_Y + BODY_H - 0.02, 0]}>
          <mesh geometry={GEO.rim} material={mats.rim} castShadow />
          <mesh geometry={GEO.opening} material={SHARED.dark} position={[0, 0.06, 0]} />
        </group>

        {/* Gesicht */}
        {[-EYE_X, EYE_X].map((ex, i) => (
          <group key={ex} position={[ex, EYE_Y, zEye - EYE_R * 0.35]}>
            <mesh geometry={GEO.eye} material={SHARED.sclera} scale={[1, 1.08, 0.75]} />
            <group ref={i === 0 ? pupilL : pupilR} position={[0, 0, EYE_R * 0.76]}>
              <mesh geometry={GEO.iris} material={mats.iris} />
              <mesh geometry={GEO.pupil} material={SHARED.pupil} position={[0, 0, 0.002]} />
              <mesh geometry={GEO.shine} material={SHARED.shine} position={[EYE_R * 0.16, EYE_R * 0.18, 0.004]} />
            </group>
            <mesh
              ref={i === 0 ? lidL : lidR}
              geometry={GEO.eyelid}
              material={mats.eyelid}
              scale={[1, 1.08, 0.78]}
              rotation={[LID_UP, 0, 0]}
            />
            <mesh geometry={GEO.cheek} material={mats.cheek} position={[ex < 0 ? -0.04 : 0.04, -EYE_R * 1.25, EYE_R * 0.7]} />
          </group>
        ))}
        <mesh ref={browL} geometry={GEO.brow} material={SHARED.brow} position={[-EYE_X, EYE_Y + 0.21, zEye + 0.01]} />
        <mesh ref={browR} geometry={GEO.brow} material={SHARED.brow} position={[EYE_X, EYE_Y + 0.21, zEye + 0.01]} />

        {/* Deckel – Scharnier hinten */}
        <group ref={lidRef} position={[0, BODY_Y + BODY_H + 0.04, -TOP.d / 2 - 0.03]}>
          <group position={[0, 0, 0.55]}>
            <mesh geometry={GEO.lid} material={mats.lid} castShadow />
            <mesh geometry={GEO.handle} material={mats.rim} position={[0, 0.06, 0.56]} rotation={[0, 0, Math.PI / 2]} />
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
