// Datei: components/game/game-scene.tsx
// Setzt die 3D-Welt zusammen und steuert Kamera, Zeitlupe und Wackeln.
// Mehrere Würfe können gleichzeitig fliegen.

import { useFrame } from "@react-three/fiber/native";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";

import { type Item } from "@/constants/items";
import { type ColorScheme } from "@/constants/theme";
import { type BinDef } from "@/game/bins";
import { BIN_OPENING_Y, type GameLayout } from "@/game/layout";
import { devLog } from "@/utils/dev-error-reporter";

import { type Burst, Effects } from "./effects";
import { Stage } from "./stage";
import { type FxRef, stepFx } from "./fx";
import { AimGuide, PreviewItem, ThrownItem } from "./items";
import { type BinEvent, TrashBin } from "./trash-bin";

export type ThrowState = {
  id: number;
  item: Item;
  binIndex: number;
  hit: boolean;
  perfect: boolean;
};

const END_SCALE = 0.5;

/** Kamera: Einflug beim Start, folgt Layout-Änderungen weich, wackelt bei Effekten.
 *  Steuert außerdem die Zeitlupe (fx.timeScale). */
function CameraRig({
  layout,
  fx,
  calm,
}: {
  layout: GameLayout;
  fx: FxRef;
  calm: boolean;
}) {
  const rig = useRef({
    intro: calm ? 1 : 0,
    logged: false,
    look: layout.camera.target.clone(),
    pos: layout.camera.position
      .clone()
      .add(new THREE.Vector3(0, 1.6, 3.5)),
  });

  useFrame((state, rawDelta) => {
    if (!rig.current.logged) {
      rig.current.logged = true;

      devLog(
        "FRAME",
        "erstes Bild",
        JSON.stringify(layout.camera.position),
        JSON.stringify(layout.camera.target),
      );
    }

    const delta = Math.min(rawDelta, 0.05);
    const offset = stepFx(fx.current, delta, state.clock.elapsedTime);

    rig.current.intro = Math.min(rig.current.intro + delta / 1.1, 1);

    const speed = rig.current.intro < 1 ? 3.2 : 6;

    rig.current.pos.lerp(
      layout.camera.position,
      1 - Math.exp(-speed * delta),
    );

    rig.current.look.lerp(
      layout.camera.target,
      1 - Math.exp(-6 * delta),
    );

    state.camera.position.copy(rig.current.pos);

    if (fx.current.shakeAxis === "x") {
      state.camera.position.x += offset;
    } else {
      state.camera.position.y += offset;
    }

    state.camera.lookAt(rig.current.look);
  });

  return null;
}

export const GameScene = memo(function GameScene({
  layout,
  bins,
  scheme,
  fever,
  fx,
  calm,
  previewItem,
  aimIndex,
  throws,
  binEvents,
  talkingIndex = null,
  bursts,
  onLand,
  onThrowDone,
  onBurstDone,
}: {
  layout: GameLayout;
  bins: BinDef[];
  scheme: ColorScheme;
  fever: boolean;
  fx: FxRef;
  calm: boolean;
  previewItem: Item | null;
  aimIndex: number | null;
  throws: ThrowState[];
  binEvents: (BinEvent | null)[];
  talkingIndex?: number | null;
  bursts: Burst[];
  onLand: (id: number) => void;
  onThrowDone: (id: number) => void;
  onBurstDone: (id: number) => void;
}) {
  const openings = useMemo(
    () =>
      layout.bins.map(
        (b) => new THREE.Vector3(b.x, BIN_OPENING_Y + 0.1, b.z + 0.05),
      ),
    [layout],
  );

  const aimTarget = aimIndex !== null ? openings[aimIndex] : null;

  return (
    <>
      <CameraRig layout={layout} fx={fx} calm={calm} />
      <Stage scheme={scheme} fever={fever} calm={calm} />

      {bins.map((bin, i) => (
        <TrashBin
          key={bin.key}
          bin={bin}
          x={layout.bins[i].x}
          z={layout.bins[i].z}
          index={i}
          aimed={
            aimIndex === i ||
            throws.some((t) => t.binIndex === i && t.hit)
          }
          talking={talkingIndex === i}
          event={binEvents[i] ?? null}
          fx={fx}
        />
      ))}

      {previewItem && (
        <PreviewItem
          key={previewItem.name}
          item={previewItem}
          position={layout.item.position}
          scale={layout.item.scale}
          aimTarget={aimTarget}
          fx={fx}
        />
      )}

      <AimGuide
        start={layout.item.position}
        target={aimTarget}
        color={aimIndex !== null ? bins[aimIndex].colorLight : "#FFFFFF"}
      />

      {throws.map((ts) => (
        <ThrownItem
          key={ts.id}
          item={ts.item}
          start={layout.item.position}
          startScale={layout.item.scale}
          target={openings[ts.binIndex]}
          endScale={END_SCALE}
          hit={ts.hit}
          perfect={ts.perfect}
          glow={ts.perfect || fever}
          fx={fx}
          onLand={() => onLand(ts.id)}
          onDone={() => onThrowDone(ts.id)}
        />
      ))}

      <Effects bursts={bursts} fx={fx} onDone={onBurstDone} />
    </>
  );
});