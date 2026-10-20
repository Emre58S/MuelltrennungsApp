// Datei: components/game/menu-scene.tsx
// 3D-Bühne des Hauptmenüs: Die drei Tonnen SIND die Spielmodi. Ein Gegenstand
// schwebt davor – wer ihn in eine Tonne wirft (oder auf sie tippt), startet
// diesen Modus. Gesteuert wird alles über den SceneBus (Zielen, Wurf,
// Konfetti, Tonnen lupfen den Deckel zum Einladen) – dieselben Pools wie im
// Spiel, also auch hier flüssig.

import { useFrame } from "@react-three/fiber/native";
import { memo, useMemo } from "react";
import * as THREE from "three";

import { type Item } from "@/constants/items";
import { type ColorScheme } from "@/constants/theme";
import { type BinDef } from "@/game/bins";
import { BIN_OPENING_Y, type GameLayout } from "@/game/layout";

import { BurstLayer } from "./effects";
import { type FxRef, stepFx } from "./fx";
import { AimGuide, PreviewItem, ThrowLayer } from "./items";
import { ModelWarmup } from "./model-cache";
import { type BusRef } from "./scene-bus";
import { Stage } from "./stage";
import { TrashBin } from "./trash-bin";

const END_SCALE = 0.42;

/** Feste Kamera (Schilder im HUD liegen exakt über den Tonnen); wackelt nur bei Effekten. */
function MenuCamera({ layout, fx }: { layout: GameLayout; fx: FxRef }) {
  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const offset = stepFx(fx.current, delta, state.clock.elapsedTime);
    state.camera.position.copy(layout.camera.position);
    state.camera.position.y += offset;
    state.camera.lookAt(layout.camera.target);
  });
  return null;
}

export const MenuScene = memo(function MenuScene({
  layout,
  bins,
  scheme,
  calm,
  fx,
  bus,
  item,
  nextItem,
  warmItems,
}: {
  layout: GameLayout;
  bins: BinDef[];
  scheme: ColorScheme;
  calm: boolean;
  fx: FxRef;
  bus: BusRef;
  item: Item | null;
  nextItem: Item | null;
  warmItems: Item[];
}) {
  const openings = useMemo(
    () => layout.bins.map((b) => new THREE.Vector3(b.x, BIN_OPENING_Y + 0.1, b.z + 0.05)),
    [layout],
  );
  const aimColors = useMemo(() => bins.map((b) => b.colorLight), [bins]);
  const next = nextItem && nextItem.name !== item?.name ? nextItem : null;

  return (
    <>
      <MenuCamera layout={layout} fx={fx} />
      <Stage scheme={scheme} fever={false} calm={calm} />

      {bins.map((bin, i) => (
        <TrashBin
          key={bin.key}
          bin={bin}
          x={layout.bins[i].x}
          z={layout.bins[i].z}
          index={i}
          fx={fx}
          bus={bus}
        />
      ))}

      {[item, next].map(
        (it, i) =>
          it && (
            <PreviewItem
              key={it.name}
              item={it}
              visible={i === 0}
              position={layout.item.position}
              scale={layout.item.scale}
              openings={openings}
              bus={bus}
              fx={fx}
            />
          ),
      )}

      <AimGuide start={layout.item.position} openings={openings} colors={aimColors} bus={bus} />

      <ThrowLayer
        bus={bus}
        fx={fx}
        start={layout.item.position}
        startScale={layout.item.scale}
        endScale={END_SCALE}
        openings={openings}
      />

      <BurstLayer bus={bus} fx={fx} />

      <ModelWarmup items={warmItems} at={layout.item.position} perFrame={2} />
    </>
  );
});
