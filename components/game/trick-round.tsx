// Datei: components/game/trick-round.tsx — ein Trickwurf-Level
// (Route: app/runde.tsx mit mode=trick)
//
// Werfen wie im Zielwurf (schnell wischen = Tempo, halten = Flugbahn),
// dazu Reifen aus game/trick-levels.ts. Ein Wurf zur
// Zeit: der nächste Gegenstand kommt erst nach der Landung – so ist klar,
// welcher Wurf was ausgelöst hat. Kein Zufall in der Physik: gleicher Wurf,
// gleiches Ergebnis. Beim Halten zeigt eine Vorschau die ersten ~60 % des Flugs.
import { type BinDef, getItemsForBins, STANDARD_BINS } from "@/game/bins";
import { computeLayout, shotLanding } from "@/game/layout";
import {
  type FreeShot,
  FULL_SWIPE_SHARE,
  pickItem,
  recentLimit,
} from "@/game/logic";
import { itemMass, itemMaterial, MASS_FEEL } from "@/game/item-mass";
import {
  bonusMet,
  hasWind,
  levelColliders,
  meetsRequirement,
  starsFor,
  TRICK_LEVELS,
  type TrickLevel,
} from "@/game/trick-levels";
import { type Item } from "@/constants/items";
import { Spacing } from "@/constants/theme";
import { IconButton } from "@/components/ui/icon-button";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { preloadSfx, refreshSfxSetting, sfx, sfxMaterial } from "@/utils/sfx";
import { newlyUnlocked, type Progress, usableTrail } from "@/game/rewards";
import { dailyBoard, submitScore, trickScore } from "@/utils/leaderboard";
import {
  getRewardProgress,
  getTrail,
  getTrickStars,
  saveTrickDaily,
  saveTrickStars,
} from "@/utils/storage";
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
  TipCard,
  TrickHud,
  TrickResult,
} from "./hud";
import { useLater } from "./round-hooks";
import { useTips } from "./tips";
import {
  beginThrow,
  createThrowInput,
  FLICK_SPEED,
  previewShot,
  releaseShot,
  stepClick,
} from "./throw-input";
import {
  createBus,
  type LandOutcome,
  queueBinEvent,
  queueBurst,
  queueThrow,
  setLandHandler,
  setPreview,
  setShotGuide,
  setTrail,
  type ThrowSpec,
} from "./scene-bus";

/** Ab diesem Level kommen auch Gegenstände, die woanders hingehören. */
const DECOY_FROM = 5;
/** So oft ist der nächste Gegenstand einer zum Sortieren. */
const DECOY_CHANCE = 0.3;

export function TrickRound({
  level,
  onExit,
  onNext,
  onRetry,
  daily = false,
}: {
  level: TrickLevel;
  onExit: () => void;
  onNext: () => void;
  onRetry: () => void;
  /** Tages-Trick: eigene Wertung, kein „Nächstes Level“. */
  daily?: boolean;
}) {
  const isLast = daily || level.id === TRICK_LEVELS[TRICK_LEVELS.length - 1].id;
  const insets = useSafeAreaInsets();
  const { scheme } = useAppTheme();
  const { t, lang, itemName, itemFact } = useI18n();
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
    () => ({
      props: level.props,
      colliders: levelColliders(level),
      binSlide: level.binSlide ? { bin: level.target, slide: level.binSlide } : undefined,
    }),
    [level],
  );
  /** Gewicht im Trickmodus: gleicher Bogen (die Reifen hängen an der Wurfkurve),
   *  aber leichte Sachen treibt der Wind weiter ab. */
  const feelOf = (it: Item) => ({ loft: 1, drift: MASS_FEEL[itemMass(it)].drift });

  // Gegenstände aus der Zieltonne, ohne direkte Wiederholung. Ab den mittleren
  // Leveln (und im Tages-Trick) kommt manchmal einer, der woanders hingehört:
  // den richtig sortieren – falsch kostet einen Versuch.
  // (veränderliche Listen wie der „picker“ der Spielrunde – dürfen beim ersten Render gelesen werden)
  const decoys = useMemo(
    () => (daily || level.id >= DECOY_FROM ? getItemsForBins(bins.filter((b) => b !== target)) : []),
    [daily, level.id, bins, target],
  );
  const [recent] = useState<string[]>(() => []);
  /** Je gezogenem Gegenstand: war es einer zum Sortieren? */
  const [drawn] = useState<boolean[]>(() => []);
  const draw = useCallback(() => {
    // Nie gleich am Anfang, nie zweimal hintereinander
    const decoy =
      decoys.length > 0 && drawn.length > 0 && !drawn[drawn.length - 1] && Math.random() < DECOY_CHANCE;
    const from = decoy ? decoys : pool;
    const item = pickItem(from, () => 1, recent);
    drawn.push(decoy);
    if (item) {
      recent.push(item.name);
      while (recent.length > recentLimit(pool.length)) recent.shift();
    }
    return item;
  }, [pool, decoys, recent, drawn]);
  const [item, setItemState] = useState<Item | null>(draw);
  // Alle Modelle vorab aufbauen – auch die zum Sortieren (sonst ruckelt der erste)
  const [warmItems] = useState(() => [...pool, ...decoys]);
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
  /** Zuletzt geworfener Gegenstand (ein Wurf zur Zeit). */
  const thrownRef = useRef<Item | null>(null);
  /** Angetippte Tonne beim Sortieren (Fremd-Gegenstand). */
  const sortBin = useRef<number | null>(null);
  const done = useRef(false);
  const ids = useRef(0);
  /** Wurf-Eingabe: schnell wischen oder halten (Vorschau). */
  const input = useRef(createThrowInput());
  const attemptsRef = useRef(0);
  /** Angezeigter Versuch: der laufende bzw. der nächste nach einem Fehlwurf. */
  const [attempt, setAttempt] = useState(1);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [result, setResult] = useState<{
    stars: number;
    attempts: number;
    bonus: boolean;
    unlocked?: string;
    fact?: { name: string; text: string };
  } | null>(null);
  const [hasThrown, setHasThrown] = useState(false);
  const later = useLater();
  // Einführung: je Hindernis einmal erklären; Halten-Tipp nach Fehlwürfen ohne Vorschau
  const tips = useTips();
  const showTip = tips.show;
  // Belohnungen: gewählte Spur, Fortschritt und bisherige Sterne dieses Levels
  const rewardProgress = useRef<Progress>({ stars: 0, level: 0 });
  const levelStars = useRef(0);
  useEffect(() => {
    Promise.all([getTrail(), getRewardProgress(), getTrickStars()])
      .then(([id, progress, stars]) => {
        rewardProgress.current = progress;
        levelStars.current = stars[level.id] ?? 0;
        setTrail(bus.current, usableTrail(id, progress));
      })
      .catch(() => undefined);
  }, [level.id]);
  const heldEver = useRef(false);
  const missesNoHold = useRef(0);
  // Erster Gegenstand, der nicht in die Zieltonne gehört: kurz erklären
  useEffect(() => {
    if (item && item.category !== target.category) showTip("decoy");
  }, [item, target, showTip]);
  useEffect(() => {
    const has = (kind: string) => level.props.some((p) => p.kind === kind);
    const ring = level.props.find((p) => p.kind === "ring");
    const motion = ring?.kind === "ring" ? ring.motion : undefined;
    const id = hasWind(level)
      ? "wind"
      : level.binSlide
        ? "movingBin"
        : has("windmill")
          ? "windmill"
          : motion?.kind === "spin"
            ? "spin"
            : motion
              ? "movingRing"
              : "stars";
    const timer = setTimeout(() => showTip(id), 900);
    return () => clearTimeout(timer);
  }, [level, showTip]);

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
    thrownRef.current = current;
    // Versuch zählt nur für Gegenstände der Zieltonne (falsch Sortiertes zählt bei der Landung)
    if (current.category === target.category) {
      attemptsRef.current += 1;
      setAttempt(attemptsRef.current);
    }
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
      feel: feelOf(current),
      free: { accept: bins.map((b) => b.category === current.category), center: shot.perfect },
    };
    queueThrow(bus.current, spec);
    // Ein Wurf zur Zeit: der nächste Gegenstand erst nach der Landung
    setItem(null);
    sfx("throw");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  /** Geschafft; `clean` = ohne jede Berührung hinein (Swish). */
  const succeed = (clean: boolean) => {
    done.current = true;
    const attempts = attemptsRef.current;
    const bonus = bonusMet(level.bonus, { attempts, clean });
    const stars = starsFor(attempts, bonus);
    (daily ? saveTrickDaily(stars) : saveTrickStars(level.id, stars)).catch(() => undefined);
    // Tages-Trick: Rangliste (mehr Sterne, dann weniger Versuche)
    if (daily) submitScore(dailyBoard("tagestrick"), trickScore(stars, attempts)).catch(() => undefined);
    // Neue Wurfspur durch die Sterne? (Tages-Trick zählt nicht)
    const before = rewardProgress.current;
    const gained = daily ? 0 : Math.max(0, stars - levelStars.current);
    const unlocked = newlyUnlocked(before, { ...before, stars: before.stars + gained })[0];
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
    if (thrownRef.current) sfxMaterial(itemMaterial(thrownRef.current));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    float("★".repeat(stars), top.x, top.y, "#FFD54A");
    // Swish: ohne Berührung (Reifen durchfliegen zählt nicht als Berührung)
    if (clean) later(() => float(t("trick.swish"), top.x, top.y + 40, "#FFFFFF"), 250);
    // „Wusstest du?“ zum geworfenen Gegenstand
    const thrown = thrownRef.current;
    const fact = thrown ? itemFact(thrown) : undefined;
    const tip = thrown && fact ? { name: itemName(thrown), text: fact } : undefined;
    later(
      () => setResult({ stars, attempts, bonus, unlocked: unlocked && t(unlocked.name), fact: tip }),
      1000,
    );
  };

  /** Fremd-Gegenstand per Tippen sortieren: er fliegt in die angetippte Tonne
   *  (richtig → hinein, falsch → prallt ab). Werfen bleibt den Tricks vorbehalten. */
  const sortTo = (bin: number) => {
    const current = itemRef.current;
    if (!current || busy.current || done.current || current.category === target.category) return;
    busy.current = true;
    thrownRef.current = current;
    sortBin.current = bin;
    queueThrow(bus.current, {
      id: ++ids.current,
      item: current,
      binIndex: bin,
      hit: bins[bin].category === current.category,
      perfect: false,
      glow: false,
    });
    setItem(null);
    sfx("throw");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  /** Gegenstand, der nicht in die Zieltonne gehört: richtig sortieren lernen. */
  const landDecoy = (thrown: Item, bin: number | null, x: number | undefined) => {
    const y = layout.binTops[0].y;
    const right = bins.findIndex((b) => b.category === thrown.category);
    if (bin === right) {
      float(`✓ ${t("trick.sorted")}`, screenX(binXs[bin]), y, "#8BE59A");
      queueBinEvent(bus.current, bin, "hit");
      sfxMaterial(itemMaterial(thrown));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } else if (bin !== null) {
      // Falsch sortiert: kostet einen Versuch, die richtige Tonne hüpft
      attemptsRef.current += 1;
      queueBinEvent(bus.current, bin, "reject");
      if (right >= 0) later(() => queueBinEvent(bus.current, right, "peek"), 250);
      float(t("trick.decoyWrong", { bin: t(bins[right]?.labelKey ?? target.labelKey) }), screenX(binXs[bin]), y);
      sfx("wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    } else {
      float(t("game.miss"), screenX(x ?? 0), y);
      sfx("plop");
    }
  };

  const handleLand = (_id: number, outcome?: LandOutcome) => {
    busy.current = false;
    const bin = outcome?.bin ?? null;
    const thrown = thrownRef.current;
    if (thrown && thrown.category !== target.category) {
      landDecoy(thrown, sortBin.current ?? bin, outcome?.x);
      sortBin.current = null;
      setAttempt(attemptsRef.current + 1);
      later(() => {
        if (!done.current) setItem(draw());
      }, 350);
      return;
    }
    const y = layout.binTops[0].y;
    if (bin === level.target && meetsRequirement(level, outcome?.props ?? [])) {
      succeed(!!outcome?.clean);
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
    // Zweimal daneben, nie gehalten: zeigen, dass Halten die Flugbahn zeigt
    if (!heldEver.current && ++missesNoHold.current >= 2) tips.show("hold");
    later(() => {
      if (!done.current) setItem(draw());
    }, 350);
  };

  // Gesten-Handler (aktuell halten, ohne die Geste neu zu bauen)
  const handlers = useRef({
    begin: () => {},
    aim: (_dx: number, _dy: number, _vy: number) => {},
    release: (_dx: number, _dy: number, _vy: number) => {},
    cancel: () => {},
    tap: (_x: number, _y: number) => {},
    land: (_id: number, _outcome?: LandOutcome) => {},
  });
  // Wie im Zielwurf: schnell wischen = normaler Wurf, halten = Flugbahn.
  // Keine Pech-Hilfe hier: sie zöge Würfe zur Tonne – am Reifen vorbei.
  const throwCtx = () => ({
    full: screenH * FULL_SWIPE_SHARE,
    binAngles: layout.binAngles,
    binXs,
  });
  useLayoutEffect(() => {
    handlers.current = {
      begin: () => beginThrow(input.current, Date.now()),
      aim: (dx, dy, vy) => {
        if (busy.current || done.current) return;
        // Länger gehalten: so würde der Wurf jetzt fliegen (Weite klickt leise mit)
        const shot = previewShot(input.current, Date.now(), dx, dy, vy, throwCtx());
        if (!input.current.aiming) return;
        heldEver.current = true;
        setShotGuide(
          bus.current,
          shot && itemRef.current
            ? { ...shotLanding(layout, shot), strength: shot.strength, ...feelOf(itemRef.current) }
            : null,
        );
        if (stepClick(input.current, shot)) Haptics.selectionAsync().catch(() => undefined);
      },
      release: (dx, dy, vy) => {
        setShotGuide(bus.current, null);
        if (busy.current || done.current) return;
        const aiming = input.current.aiming && -vy < FLICK_SPEED;
        const shot = releaseShot(input.current, dx, dy, vy, throwCtx());
        if (shot && __DEV__)
          // Zum Nachjustieren (landet im Metro-Log)
          console.log(
            `[wurf] trick ${aiming ? "halten" : "wisch"} länge=${Math.round(Math.hypot(dx, dy))}px tempo=${Math.round(-vy)} kraft=${shot.strength.toFixed(2)} weite=${shot.depth.toFixed(2)}`,
          );
        if (shot) throwShot(shot);
        // Nach unten gewischt? Kurz erklären, wie es geht
        else if (dy > 60) float(`👆 ${t("game.swipeHint")}`, screenW / 2, layout.binTops[0].y);
      },
      cancel: () => {
        setShotGuide(bus.current, null);
      },
      // Fremd-Gegenstand: Tippen auf eine Tonne sortiert ihn
      tap: (x, y) => {
        const i = layout.binRects.findIndex(
          (r) => x >= r.x - 8 && x <= r.x + r.w + 8 && y >= r.y - 24 && y <= r.y + r.h + 64,
        );
        if (i !== -1) sortTo(i);
      },
      land: handleLand,
    };
  });
  useEffect(() => {
    const b = bus.current;
    setLandHandler(b, (id, outcome) => handlers.current.land(id, outcome));
    return () => setLandHandler(b, () => undefined);
  }, []);

  const onBegin = useCallback(() => handlers.current.begin(), []);
  const onAim = useCallback(
    (dx: number, dy: number, vy: number) => handlers.current.aim(dx, dy, vy),
    [],
  );
  const onRelease = useCallback(
    (dx: number, dy: number, vy: number) => handlers.current.release(dx, dy, vy),
    [],
  );
  const onCancel = useCallback(() => handlers.current.cancel(), []);
  const onTap = useCallback((x: number, y: number) => handlers.current.tap(x, y), []);
  const finished = result !== null;
  /* eslint-disable react-hooks/refs */
  // Fremd-Gegenstand: nur Tippen (sortieren), sonst nur Werfen
  const sorting = !!item && item.category !== target.category;
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(!finished && !sorting)
      .runOnJS(true)
      .minDistance(6)
      .onBegin(onBegin)
      .onUpdate((e) => onAim(e.translationX, e.translationY, e.velocityY))
      .onEnd((e) => onRelease(e.translationX, e.translationY, e.velocityY))
      .onFinalize(onCancel);
    const tap = Gesture.Tap()
      .enabled(!finished && sorting)
      .runOnJS(true)
      .maxDistance(12)
      .onEnd((e, ok) => {
        if (ok) onTap(e.x, e.y);
      });
    return Gesture.Race(pan, tap);
  }, [onBegin, onAim, onRelease, onCancel, onTap, finished, sorting]);
  /* eslint-enable react-hooks/refs */
  const onFloatDone = useCallback((id: number) => {
    setFloats((f) => f.filter((x) => x.id !== id));
  }, []);

  const ready = screenW > 0 && screenH > 0;
  const itemTagTop = layout.item.screen.y + screenW * 0.15 + 4;
  // Tipps knapp unter den Tonnen – im Bild, aber nicht über dem Wurf
  const tipTop = Math.max(0, ...layout.binRects.map((r) => r.y + r.h)) + 10;
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
              <TrickHud
                title={daily ? t("tricks.daily") : t("tricks.level", { n: level.id })}
                attempt={attempt}
                task={sorting ? t("trick.sortTask") : t(level.task)}
                bonus={level.bonus}
              />
              <View style={styles.topSpacer} />
            </View>
            {item && !finished && (
              <View pointerEvents="none" style={[styles.overlayRow, { top: itemTagTop }]}>
                <ItemCard key={item.name} item={item} showHint={!hasThrown} hint={t("trick.hint")}
                  mass={hasWind(level) ? itemMass(item) : undefined}
                />
              </View>
            )}
          </>
        )}
        {ready && tips.tip && !finished && (
          <View pointerEvents="box-none" style={[styles.overlayRow, { top: tipTop }]}>
            <TipCard text={t(tips.tip.key)} onClose={tips.dismiss} />
          </View>
        )}
        {result && (
          <TrickResult
            stars={result.stars}
            attempts={result.attempts}
            bonus={level.bonus}
            bonusDone={result.bonus}
            unlocked={result.unlocked}
            fact={result.fact}
            title={daily || !isLast ? t("trick.done") : t("trick.allDone")}
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
