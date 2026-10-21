// Datei: components/game/trick-round.tsx — ein Trickwurf-Level
// (Route: app/(tabs)/runde.tsx mit mode=trick)
//
// Gleiche Wurf-Regeln wie der Zielwurf (Richtung = Seite, Tempo = Weite,
// gelerntes Tempo), dazu Hindernisse aus game/trick-levels.ts. Ein Wurf zur
// Zeit: der nächste Gegenstand kommt erst nach der Landung – so ist klar,
// welcher Wurf was ausgelöst hat. Kein Zufall in der Physik: gleicher Wurf,
// gleiches Ergebnis. Beim Wischen zeigt eine Vorschau die ersten ~60 % des Flugs.
import { type BinDef, getItemsForBins, STANDARD_BINS } from "@/game/bins";
import { computeLayout } from "@/game/layout";
import {
  adaptiveIdeal,
  aimFromDrag,
  flickPower,
  type FreeShot,
  freeShot,
  LEARN_WINDOW,
  pickItem,
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
  setAim,
  setLandHandler,
  setPreview,
  setShotGuide,
  type ThrowSpec,
} from "./scene-bus";

/** Wurfbogen: kräftiger Wisch → flacher (wie im Zielwurf). */
const powerFor = (vy: number) => Math.min(Math.max(0.8 + -vy / 5000, 0.8), 1.3);

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

  const flicks = useRef<number[]>([]);
  const busy = useRef(false);
  const done = useRef(false);
  const ids = useRef(0);
  const smoothVy = useRef(0);
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

  /** Ziel-Tiefe eines Wurfs (nie hinter dem Startpunkt). */
  const landZ = (shot: FreeShot) =>
    Math.min((layout.bins[0]?.z ?? 0) + shot.depth, layout.item.position.z - 1.2);

  const throwShot = (shot: FreeShot, power: number) => {
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
      power,
      land: { x: shot.x, z: landZ(shot) },
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
    aim: (_dx: number, _dy: number, _vy: number) => {},
    release: (_dx: number, _dy: number, _vy: number) => {},
    cancel: () => {},
    land: (_id: number, _outcome?: LandOutcome) => {},
  });
  useLayoutEffect(() => {
    handlers.current = {
      aim: (dx, dy, vy) => {
        if (busy.current || done.current) return;
        const idx = aimFromDrag(dx, dy, layout.binAngles)?.binIndex ?? null;
        if (idx !== bus.current.aim) {
          setAim(bus.current, idx);
          if (idx !== null) sfx("aim");
        }
        // Vorschau mit geglättetem Wisch-Tempo: so würde der Wurf jetzt fliegen
        smoothVy.current = smoothVy.current * 0.6 + vy * 0.4;
        const shot = freeShot(dx, dy, smoothVy.current, layout.binAngles, binXs, {
          ideal: adaptiveIdeal(flicks.current),
        });
        setShotGuide(
          bus.current,
          shot ? { x: shot.x, z: landZ(shot), power: powerFor(smoothVy.current) } : null,
        );
      },
      release: (dx, dy, vy) => {
        setAim(bus.current, null);
        setShotGuide(bus.current, null);
        smoothVy.current = 0;
        if (busy.current || done.current) return;
        // Keine Pech-Hilfe hier: sie zöge Würfe zur Tonne – Tricks zielen woanders hin
        const shot = freeShot(dx, dy, vy, layout.binAngles, binXs, {
          ideal: adaptiveIdeal(flicks.current),
        });
        if (!shot) return;
        flicks.current = [...flicks.current, flickPower(dx, dy, vy)].slice(-LEARN_WINDOW);
        throwShot(shot, powerFor(vy));
      },
      cancel: () => {
        setAim(bus.current, null);
        setShotGuide(bus.current, null);
        smoothVy.current = 0;
      },
      land: handleLand,
    };
  });
  useEffect(() => {
    const b = bus.current;
    setLandHandler(b, (id, outcome) => handlers.current.land(id, outcome));
    return () => setLandHandler(b, () => undefined);
  }, []);

  const onAim = useCallback(
    (dx: number, dy: number, vy: number) => handlers.current.aim(dx, dy, vy),
    [],
  );
  const onRelease = useCallback(
    (dx: number, dy: number, vy: number) => handlers.current.release(dx, dy, vy),
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
        .onUpdate((e) => onAim(e.translationX, e.translationY, e.velocityY))
        .onEnd((e) => onRelease(e.translationX, e.translationY, e.velocityY))
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
                <ItemCard key={item.name} item={item} showHint={!hasThrown} hint={t("trick.hint")} />
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
