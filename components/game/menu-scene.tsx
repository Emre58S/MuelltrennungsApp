// Datei: components/game/menu-scene.tsx
// Lebendiger Menü-Hintergrund („Attract Mode“ wie bei Arcade-Spielen):
// Ein Gegenstand schwebt über den Tonnen, die richtige Tonne öffnet sich,
// der Gegenstand fliegt hinein, Konfetti – dann der nächste. So lernt man
// schon im Menü, was wohin gehört. Bei „Weniger Bewegung“: ruhiges Standbild.

import { useFrame } from "@react-three/fiber/native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { type Item } from "@/constants/items";
import { type ColorScheme } from "@/constants/theme";
import { getBinsForLevel, getItemsForBins } from "@/game/bins";
import { BIN_OPENING_Y, computeLayout } from "@/game/layout";
import { drawFromBag } from "@/game/logic";

import { type Burst, Effects } from "./effects";
import { Environment } from "./environment";
import { createFx, type FxRef, stepFx } from "./fx";
import { PreviewItem, ThrownItem } from "./items";
import { type BinEvent, TrashBin } from "./trash-bin";

/** Szene liegt im oberen Teil – unten ist Platz für das Menü. */
const LOOK_DOWN = 0.55;
const HOVER_MS = 1600;

function MenuCamera({
  position,
  target,
  fx,
  calm,
}: {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fx: FxRef;
  calm: boolean;
}) {
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    stepFx(fx.current, delta, state.clock.elapsedTime);
    const t = state.clock.elapsedTime;
    // Langsames Schweben: leichtes Hin und Her, kaum merklich
    const sway = calm ? 0 : Math.sin(t * 0.18) * 0.55;
    const bob = calm ? 0 : Math.sin(t * 0.27) * 0.12;
    state.camera.position.set(position.x + sway, position.y + bob, position.z);
    look.set(target.x + sway * 0.35, target.y - LOOK_DOWN, target.z);
    state.camera.lookAt(look);
  });
  return null;
}

type Demo = { id: number; item: Item; binIndex: number; phase: "hover" | "throw" };

export const MenuScene = memo(function MenuScene({
  width,
  height,
  scheme,
  calm,
}: {
  width: number;
  height: number;
  scheme: ColorScheme;
  calm: boolean;
}) {
  const fx = useRef(createFx());
  useEffect(() => {
    fx.current.calm = calm;
  }, [calm]);

  const bins = useMemo(() => getBinsForLevel(1), []);
  const pool = useMemo(() => getItemsForBins(bins), [bins]);
  const [bag] = useState(() => ({ current: [] as Item[] }));
  const layout = useMemo(() => computeLayout(width, height, bins.length), [width, height, bins.length]);

  const openings = useMemo(
    () => layout.bins.map((b) => new THREE.Vector3(b.x, BIN_OPENING_Y + 0.1, b.z + 0.05)),
    [layout],
  );
  // Gegenstand schwebt über der Mitte, etwas vor den Tonnen
  const hoverPos = useMemo(() => new THREE.Vector3(0, BIN_OPENING_Y + 0.75, 1.6), []);

  const nextDemo = useCallback(
    (id: number, exclude?: string): Demo | null => {
      const item = drawFromBag(bag, pool, exclude);
      if (!item) return null;
      const binIndex = Math.max(0, bins.findIndex((b) => b.category === item.category));
      return { id, item, binIndex, phase: "hover" };
    },
    [bag, pool, bins],
  );

  const [demo, setDemo] = useState<Demo | null>(() => nextDemo(0));
  const [events, setEvents] = useState<(BinEvent | null)[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);

  // Nach kurzer Schwebezeit werfen (nicht bei „Weniger Bewegung“)
  useEffect(() => {
    if (!demo || demo.phase !== "hover" || calm) return;
    const id = setTimeout(
      () => setDemo((d) => (d && d.id === demo.id ? { ...d, phase: "throw" } : d)),
      HOVER_MS,
    );
    return () => clearTimeout(id);
  }, [demo, calm]);

  const land = (d: Demo) => {
    const bin = bins[d.binIndex];
    setEvents((ev) => {
      const next = [...ev];
      next[d.binIndex] = { type: "hit", id: d.id };
      return next;
    });
    setBursts((b) => [
      ...b,
      {
        id: d.id,
        x: layout.bins[d.binIndex].x,
        y: BIN_OPENING_Y + 0.15,
        z: 0.1,
        colors: [bin.color, bin.colorLight, "#FFFFFF"],
        count: 18,
        power: 0.9,
        ring: false,
      },
    ]);
  };

  const onDone = useCallback(() => {
    setDemo((d) => (d ? nextDemo(d.id + 1, d.item.name) : d));
  }, [nextDemo]);

  const onBurstDone = useCallback(
    (id: number) => setBursts((b) => b.filter((x) => x.id !== id)),
    [],
  );

  const aimed = demo ? demo.binIndex : null;

  return (
    <>
      <MenuCamera position={layout.camera.position} target={layout.camera.target} fx={fx} calm={calm} />
      <Environment scheme={scheme} fever={false} calm={calm} />

      {bins.map((bin, i) => (
        <TrashBin
          key={bin.key}
          bin={bin}
          x={layout.bins[i].x}
          z={layout.bins[i].z}
          index={i}
          aimed={!calm && aimed === i}
          event={events[i] ?? null}
          fx={fx}
        />
      ))}

      {demo && demo.phase === "hover" && (
        <PreviewItem
          key={`hover-${demo.id}`}
          item={demo.item}
          position={hoverPos}
          scale={0.62}
          aimTarget={calm ? null : openings[demo.binIndex]}
          fx={fx}
        />
      )}

      {demo && demo.phase === "throw" && (
        <ThrownItem
          key={`throw-${demo.id}`}
          item={demo.item}
          start={hoverPos}
          startScale={0.62}
          target={openings[demo.binIndex]}
          endScale={0.42}
          hit
          perfect={false}
          glow={false}
          fx={fx}
          onLand={() => land(demo)}
          onDone={onDone}
        />
      )}

      <Effects bursts={bursts} fx={fx} onDone={onBurstDone} />
    </>
  );
});
