// Datei: components/game/game-scene.tsx
// Setzt die 3D-Welt zusammen und steuert Kamera, Zeitlupe und Wackeln.
// Würfe, Konfetti und Tonnen-Reaktionen laufen über den SceneBus in festen
// Pools, das schwebende Item ebenso (bus.preview) – die Szene selbst rendert
// nur neu, wenn sich Fieber oder Layout ändern (nie pro Wurf).

import { useFrame } from "@react-three/fiber/native";
import { memo, type ReactNode, useMemo, useRef } from "react";
import * as THREE from "three";

import { type Item } from "@/constants/items";
import { type ColorScheme } from "@/constants/theme";
import { type BinDef } from "@/game/bins";
import { type Language } from "@/i18n";
import { BIN_OPENING_Y, type GameLayout } from "@/game/layout";
import { devLog } from "@/utils/dev-error-reporter";
import { takePerfMarks } from "@/utils/perf-marks";

import { binLabelTexture } from "./bin-label-textures";
import { BurstLayer } from "./effects";
import { type SceneKind, Stage } from "./stage";
import { type FxRef, stepFx } from "./fx";
import { type BinSlide, type PropCollider, slideOffset } from "@/game/physics";
import { type TrickProp } from "@/game/trick-levels";

import { AimGuide, type BinSlideSpec, PreviewItem, ShotGuideDots, ThrowLayer } from "./items";
import { TrickProps } from "./trick-props";
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

/** Einmal alle Shader übersetzen – auch für gerade unsichtbare Dinge
 *  (Leuchtspur, Aufkleber, Ersatzformen) –, damit das nicht mitten in der
 *  Runde passiert. Jede Runde hat eine neue 3D-Fläche, daher pro Runde. */
function ShaderWarmup() {
  const frame = useRef(0);
  useFrame((state) => {
    if (frame.current > 3) return;
    frame.current += 1;
    // Frame 3: Modelle aus <ModelWarmup> sind dann schon in der Szene
    if (frame.current !== 3) return;
    const hidden: THREE.Object3D[] = [];
    state.scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    state.gl.compile(state.scene, state.camera);
    hidden.forEach((o) => {
      o.visible = false;
    });
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
    // Hänger: was ist seit dem letzten Bild passiert? (siehe utils/perf-marks.ts)
    const marks = takePerfMarks();
    if (delta > 0.06)
      console.log(
        `[hänger] ${Math.round(delta * 1000)}ms – ${marks.join(", ") || "nichts gemeldet (Speicher-Sammler oder GPU?)"}`,
      );
    if (a.time < 3) return;
    console.log(
      `[perf] fps=${Math.round(a.frames / a.time)} langsamster=${Math.round(a.worst * 1000)}ms ruckler=${a.slow} drawcalls=${a.calls}`,
    );
    acc.current = { frames: 0, time: 0, worst: 0, slow: 0, calls: 0 };
  });
  return null;
}

/** Fährt eine Tonne hin und her (seitlich oder auf dich zu) – nach der
 *  Szenen-Uhr wie die Physik (slideOffset). */
function SlidingBin({ slide, bus, children }: { slide: BinSlide; bus: BusRef; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position[slide.axis] = slideOffset(slide, bus.current.clock);
  });
  return <group ref={ref}>{children}</group>;
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
  scene,
  guide = true,
  openLids = false,
  trick,
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
  /** Szene dieser Runde (bestimmt auch die Tonnen). */
  scene: SceneKind;
  /** Gepunktete Flugbahn zur anvisierten Tonne (aus im Zielwurf). */
  guide?: boolean;
  /** Zielwurf: Deckel stehen offen (und zählen für die Physik), Flugbahn-Vorschau beim Zurückziehen. */
  openLids?: boolean;
  /** Trickwürfe: Hindernisse (Modelle + Physik), gleitende Zieltonne, Vorschau. */
  trick?: { props: TrickProp[]; colliders: PropCollider[]; binSlide?: BinSlideSpec };
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
      <Stage fever={fever} calm={calm} kind={scene} />

      {bins.map((bin, i) => {
        const tonne = (
          <TrashBin
            key={bin.key}
            bin={bin}
            x={layout.bins[i].x}
            z={layout.bins[i].z}
            index={i}
            fx={fx}
            bus={bus}
            label={binLabelTexture(bin.key, lang)}
            openLid={openLids}
          />
        );
        // Fahrende Zieltonne (Trickwürfe): bewegt sich genau wie in der Physik
        return trick?.binSlide?.bin === i ? (
          <SlidingBin key={bin.key} slide={trick.binSlide.slide} bus={bus}>
            {tonne}
          </SlidingBin>
        ) : (
          tonne
        );
      })}

      <PreviewItem
        position={layout.item.position}
        scale={layout.item.scale}
        openings={openings}
        bus={bus}
        fx={fx}
      />

      {guide && (
        <AimGuide start={layout.item.position} openings={openings} colors={aimColors} bus={bus} />
      )}

      <ThrowLayer
        bus={bus}
        fx={fx}
        start={layout.item.position}
        startScale={layout.item.scale}
        endScale={END_SCALE}
        openings={openings}
        props={trick?.colliders}
        binSlide={trick?.binSlide}
      />

      {trick && <TrickProps props={trick.colliders} bus={bus} calm={calm} />}

      {/* Zielwurf und Trickwürfe: Flugbahn beim Zielen (der Anfang davon) */}
      {(openLids || trick) && (
        <ShotGuideDots
          start={layout.item.position}
          openingY={BIN_OPENING_Y + 0.1}
          openings={openings}
          props={trick?.colliders}
          binSlide={trick?.binSlide}
          bus={bus}
          share={0.6}
          calm={calm}
        />
      )}

      <BurstLayer bus={bus} fx={fx} />

      <ModelWarmup items={warmItems} at={layout.item.position} perFrame={2} />
      <ShaderWarmup />
      {__DEV__ && <PerfProbe />}
    </>
  );
});
