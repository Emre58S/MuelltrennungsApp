// Datei: components/game/game-scene.tsx
// Setzt die 3D-Welt zusammen und steuert Kamera, Zeitlupe und Wackeln.
// Würfe, Konfetti und Tonnen-Reaktionen laufen über den SceneBus in festen
// Pools, das schwebende Item ebenso (bus.preview) – die Szene selbst rendert
// nur neu, wenn sich Fieber oder Layout ändern (nie pro Wurf).

import { useFrame } from "@react-three/fiber/native";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";

import { type Item } from "@/constants/items";
import { type ColorScheme } from "@/constants/theme";
import { type BinDef } from "@/game/bins";
import { type Language } from "@/i18n";
import { BIN_OPENING_Y, type GameLayout } from "@/game/layout";
import { devLog } from "@/utils/dev-error-reporter";

import { binLabelTexture } from "./bin-label-textures";
import { BurstLayer } from "./effects";
import { Stage } from "./stage";
import { type FxRef, stepFx } from "./fx";
import { AimGuide, PreviewItem, ThrowLayer } from "./items";
import { ModelWarmup } from "./model-cache";
import { type BusRef } from "./scene-bus";
import { TrashBin } from "./trash-bin";

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

/** Nur Entwicklung: alle 3 s Bildrate, langsamster Frame und Zeichenaufrufe
 *  ins Metro-Log (landet in .expo/dev/logs/start.log). */
function PerfProbe() {
  const acc = useRef({ frames: 0, time: 0, worst: 0, slow: 0, calls: 0 });
  useFrame((state, delta) => {
    const a = acc.current;
    a.frames += 1;
    a.time += delta;
    a.worst = Math.max(a.worst, delta);
    if (delta > 1 / 40) a.slow += 1;
    a.calls = Math.max(a.calls, state.gl.info.render.calls);
    if (a.time < 3) return;
    console.log(
      `[perf] fps=${Math.round(a.frames / a.time)} langsamster=${Math.round(a.worst * 1000)}ms ruckler=${a.slow} drawcalls=${a.calls}`,
    );
    acc.current = { frames: 0, time: 0, worst: 0, slow: 0, calls: 0 };
  });
  return null;
}

export const GameScene = memo(function GameScene({
  layout,
  bins,
  scheme,
  fever,
  fx,
  bus,
  calm,
  lang,
  warmItems,
}: {
  layout: GameLayout;
  bins: BinDef[];
  scheme: ColorScheme;
  fever: boolean;
  fx: FxRef;
  bus: BusRef;
  calm: boolean;
  /** Sprache der Beschriftung auf den Tonnen. */
  lang: Language;
  /** Items, deren Modelle vorab aufgebaut werden (ganzer Item-Pool). */
  warmItems: Item[];
}) {
  const openings = useMemo(
    () =>
      layout.bins.map(
        (b) => new THREE.Vector3(b.x, BIN_OPENING_Y + 0.1, b.z + 0.05),
      ),
    [layout],
  );
  const aimColors = useMemo(() => bins.map((b) => b.colorLight), [bins]);

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
          fx={fx}
          bus={bus}
          label={binLabelTexture(bin.key, lang)}
        />
      ))}

      <PreviewItem
        position={layout.item.position}
        scale={layout.item.scale}
        openings={openings}
        bus={bus}
        fx={fx}
      />

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
      {__DEV__ && <PerfProbe />}
    </>
  );
});
