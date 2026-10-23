// Datei: components/game/trick-round.tsx — ein Trickwurf-Level
// (Route: app/(tabs)/runde.tsx mit mode=trick)
//
// Gleiche Wurf-Regeln wie der Zielwurf (zurückziehen: Richtung = Seite,
// Zuglänge = Weite), dazu Hindernisse aus game/trick-levels.ts. Ein Wurf zur
// Zeit: der nächste Gegenstand kommt erst nach der Landung – so ist klar,
// welcher Wurf was ausgelöst hat. Kein Zufall in der Physik: gleicher Wurf,
// gleiches Ergebnis. Beim Ziehen zeigt eine Vorschau die ersten ~60 % des Flugs.
import { type BinDef, getItemsForBins, STANDARD_BINS } from "@/game/bins";
import { computeLayout, shotLanding } from "@/game/layout";
import {
  type FreeShot,
  FULL_PULL_SHARE,
  pickItem,
  pullShot,
  recentLimit,
} from "@/game/logic";
import {
  levelColliders,
  meetsRequirement,
  starsFor,
  TRICK_LEVELS,
} from "@/game/trick-levels";
import { type Item } from "@/constants/items";
import { Spacing } from "@/constants/theme";
import { IconButton } from "@/components/ui/icon-button";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { preloadSfx, refreshSfxSetting, sfx } from "@/utils/sfx";
import { saveTrickStars } from "@/utils/storage";
import * as Haptics from "expo-haptics";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cancelSlowMotion, createFx, hitStop, shake } from "./fx";
import { SceneCanvas } from "./game-round";
import {
  FloatingText,
  type FloatText,
  ItemCard,
  TrickHud,
  TrickResult,
} from "./hud";
import { useLater } from "./round-hooks";
import {
  createBus,
  type LandOutcome,
  queueBinEvent,
  queueBurst,
  queueThrow,
  setLandHandler,
  setPreview,
  setShotGuide,
  type ThrowSpec,
} from "./scene-bus";

export function TrickRound({
  levelId,
  onExit,
  onNext,
  onRetry,
}: {
  levelId: number;
  onExit: () => void;
  onNext: () => void;
  onRetry: () => void;
}) {
  const level = TRICK_LEVELS.find((l) => l.id === levelId) ?? TRICK_LEVELS[0];
  const isLast = level.id === TRICK_LEVELS[TRICK_LEVELS.length - 1].id;
  const insets = useSafeAreaInsets();
  const { scheme } = useAppTheme();
  const { t, lang } = useI18n();
  const { reduceMotion } = useAppSettings();
  const fx = useRef(createFx());
  const bus = useRef(createBus());
  useEffect(() => {
    fx.current.calm = reduceMotion;
  }, [reduceMotion]);

  const bins: BinDef[] = STANDARD_BINS;
  const target = bins[level.target];
  const pool = useMemo(() => getItemsForBins([target]), [target]);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const layout = useMemo(
    () => computeLayout(screenW, screenH, bins.length),
    [screenW, screenH, bins.length],
  );
  const binXs = useMemo(() => layout.bins.map((b) => b.x), [layout]);
  const trick = useMemo(
    () => ({ props: level.props, colliders: levelColliders(level) }),
    [level],
  );

  // Gegenstände: immer aus der Zieltonne, ohne direkte Wiederholung
  // (veränderliche Liste wie der „picker“ der Spielrunde – darf beim ersten Render gelesen werden)
  const [recent] = useState<string[]>(() => []);
  const draw = useCallback(() => {
    const item = pickItem(pool, () => 1, recent);
    if (item) {
      recent.push(item.name);
      while (recent.length > recentLimit(pool.length)) recent.shift();
    }
    return item;
  }, [pool, recent]);
  const [item, setItemState] = useState<Item | null>(draw);
  const [warmItems] = useState(() => pool);
  const itemRef = useRef<Item | null>(item);
  const setItem = useCallback((next: Item | null) => {
    itemRef.current = next;
    setPreview(bus.current, next);
    setItemState(next);
  }, []);
  useLayoutEffect(() => {
    setPreview(bus.current, itemRef.current);
  }, []);

  const busy = useRef(false);
  const done = useRef(false);
  const ids = useRef(0);
  /** Kraft-Stufe fürs Vibrations-Klicken beim Ziehen. */
  const pullStep = useRef(-1);
  const attemptsRef = useRef(0);
  /** Angezeigter Versuch: der laufende bzw. der nächste nach einem Fehlwurf. */
  const [attempt, setAttempt] = useState(1);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [result, setResult] = useState<{ stars: number; attempts: number } | null>(null);
  const [hasThrown, setHasThrown] = useState(false);
  const later = useLater();

  useEffect(() => {
    refreshSfxSetting();
    preloadSfx();
  }, []);

  const float = useCallback((text: string, x: number, y: number, color = "#FFFFFF") => {
    setFloats((f) => [...f.slice(-4), { id: ++ids.current, x, y, text, color }]);
  }, []);

  /** Welt-x → Bildschirm-x (zwischen den Tonnen linear). */
  const screenX = (worldX: number) => {
    const first = layout.binTops[0];
    const last = layout.binTops[layout.binTops.length - 1];
    const x0 = binXs[0];
    const x1 = binXs[binXs.length - 1];
    const k = x1 !== x0 ? (worldX - x0) / (x1 - x0) : 0.5;
    return Math.min(Math.max(first.x + k * (last.x - first.x), 60), screenW - 60);
  };

  const throwShot = (shot: FreeShot) => {
    const current = itemRef.current;
    if (!current || busy.current || done.current) return;
    busy.current = true;
    attemptsRef.current += 1;
    setAttempt(attemptsRef.current);
    if (!hasThrown) setHasThrown(true);
    cancelSlowMotion(fx.current);
    const spec: ThrowSpec = {
      id: ++ids.current,
      item: current,
      binIndex: -1,
      hit: false,
      perfect: false,
      glow: false,
      land: shotLanding(layout, shot),
      strength: shot.strength,
      free: { accept: bins.map((b) => b.category === current.category), center: shot.perfect },
    };
    queueThrow(bus.current, spec);
    // Ein Wurf zur Zeit: der nächste Gegenstand erst nach der Landung
    setItem(null);
    sfx("throw");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const succeed = () => {
    done.current = true;
    const stars = starsFor(attemptsRef.current);
    saveTrickStars(level.id, stars).catch(() => undefined);
    const top = layout.binTops[level.target];
    queueBinEvent(bus.current, level.target, "perfect");
    queueBurst(bus.current, {
      id: ++ids.current,
      x: layout.bins[level.target].x,
      y: 1.75,
      z: layout.bins[level.target].z + 0.1,
      colors: ["#FFD54A", "#FFFFFF", target.colorLight, "#FFB300"],
      count: 32,
      power: 1.3,
      ring: true,
    });
    hitStop(fx.current, 90);
    shake(fx.current, 0.035);
    sfx("perfect");
    sfx("swish");
    later(() => sfx("levelup"), 350);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    float("★".repeat(stars), top.x, top.y, "#FFD54A");
    const attempts = attemptsRef.current;
    later(() => setResult({ stars, attempts }), 1000);
  };

  const handleLand = (_id: number, outcome?: LandOutcome) => {
    busy.current = false;
    const bin = outcome?.bin ?? null;
    const y = layout.binTops[0].y;
    if (bin === level.target && meetsRequirement(level, outcome?.props ?? [])) {
      succeed();
      return;
    }
    if (bin === level.target) {
      // In der richtigen Tonne – aber ohne den verlangten Trick
      float(t("trick.noTrick"), screenX(binXs[bin]), y);
      sfx("plop");
    } else if (bin !== null) {
      queueBinEvent(bus.current, bin, "reject");
      float(t("trick.wrongBin"), screenX(binXs[bin]), y);
      sfx("plop");
    } else {
      const text = outcome?.near ? t("game.near") : t("game.miss");
      float(text, screenX(outcome?.x ?? 0), y);
      sfx("plop");
    }
    setAttempt(attemptsRef.current + 1);
    later(() => {
      if (!done.current) setItem(draw());
    }, 350);
  };

  // Gesten-Handler (aktuell halten, ohne die Geste neu zu bauen)
  const handlers = useRef({
    aim: (_dx: number, _dy: number) => {},
    release: (_dx: number, _dy: number) => {},
    cancel: () => {},
    land: (_id: number, _outcome?: LandOutcome) => {},
  });
  // Keine Pech-Hilfe hier: sie zöge Würfe zur Tonne – Tricks zielen woanders hin
  const fullPull = screenH * FULL_PULL_SHARE;
  const aimShot = (dx: number, dy: number) =>
    pullShot(dx, dy, fullPull, layout.binAngles, binXs);
  useLayoutEffect(() => {
    handlers.current = {
      aim: (dx, dy) => {
        if (busy.current || done.current) return;
        // Zurückziehen: so würde der Wurf jetzt fliegen (Kraft klickt leise mit)
        const shot = aimShot(dx, dy);
        setShotGuide(
          bus.current,
          shot ? { ...shotLanding(layout, shot), strength: shot.strength } : null,
        );
        const step = shot ? Math.floor(shot.strength * 10) : -1;
        if (step !== pullStep.current) {
          if (step > pullStep.current && step >= 0)
            Haptics.selectionAsync().catch(() => undefined);
          pullStep.current = step;
        }
      },
      release: (dx, dy) => {
        setShotGuide(bus.current, null);
        pullStep.current = -1;
        if (busy.current || done.current) return;
        const shot = aimShot(dx, dy);
        if (shot) throwShot(shot);
        // Aus Gewohnheit nach oben gewischt? Kurz erklären, wie es geht
        else if (dy < -60) float(`👇 ${t("game.pullHint")}`, screenW / 2, layout.binTops[0].y);
      },
      cancel: () => {
        setShotGuide(bus.current, null);
        pullStep.current = -1;
      },
      land: handleLand,
    };
  });
  useEffect(() => {
    const b = bus.current;
    setLandHandler(b, (id, outcome) => handlers.current.land(id, outcome));
    return () => setLandHandler(b, () => undefined);
  }, []);

  const onAim = useCallback((dx: number, dy: number) => handlers.current.aim(dx, dy), []);
  const onRelease = useCallback(
    (dx: number, dy: number) => handlers.current.release(dx, dy),
    [],
  );
  const onCancel = useCallback(() => handlers.current.cancel(), []);
  const finished = result !== null;
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!finished)
        .runOnJS(true)
        .minDistance(6)
        .onUpdate((e) => onAim(e.translationX, e.translationY))
        .onEnd((e) => onRelease(e.translationX, e.translationY))
        .onFinalize(onCancel),
    [onAim, onRelease, onCancel, finished],
  );
  /* eslint-enable react-hooks/refs */
  const onFloatDone = useCallback((id: number) => {
    setFloats((f) => f.filter((x) => x.id !== id));
  }, []);

  const ready = screenW > 0 && screenH > 0;
  const itemTagTop = layout.item.screen.y + screenW * 0.15 + 4;
  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.root, { width: screenW, height: screenH }]}>
        {ready && (
          <SceneCanvas
            width={screenW}
            height={screenH}
            layout={layout}
            bins={bins}
            scheme={scheme}
            fever={false}
            fx={fx}
            bus={bus}
            calm={reduceMotion}
            lang={lang}
            scene="haus"
            guide={false}
            openLids
            trick={trick}
            warmItems={warmItems}
          />
        )}
        {ready && (
          <>
            {floats.map((f) => (
              <FloatingText key={f.id} item={f} onDone={onFloatDone} />
            ))}
            <View
              pointerEvents="box-none"
              style={[styles.top, { paddingTop: insets.top + Spacing.sm }]}
            >
              <IconButton icon="x" label={t("common.close")} onPress={onExit} />
              <TrickHud level={level.id} attempt={attempt} task={t(level.task)} />
              <View style={styles.topSpacer} />
            </View>
            {item && !finished && (
              <View pointerEvents="none" style={[styles.overlayRow, { top: itemTagTop }]}>
                <ItemCard key={item.name} item={item} showHint={!hasThrown} hint={t("trick.hint")} pull />
              </View>
            )}
          </>
        )}
        {result && (
          <TrickResult
            stars={result.stars}
            attempts={result.attempts}
            isLast={isLast}
            onNext={onNext}
            onRetry={onRetry}
            onLevels={onExit}
          />
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    position: "absolute",
    top: 0,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  topSpacer: { width: 48 },
  overlayRow: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    alignItems: "center",
  },
});
