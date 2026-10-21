// Datei: components/game/game-round.tsx — eine Spielrunde
// (Route: app/(tabs)/runde.tsx)
//
// Mehrere Würfe gleichzeitig, auch sehr schnell hintereinander. Würfe,
// Konfetti und Tonnen-Reaktionen gehen über den SceneBus direkt an die
// 3D-Szene (feste Pools, kein Re-Render der Szene pro Wurf). React-State
// gibt es nur noch für das, was im HUD sichtbar ist. Gespeichert wird
// gebündelt. Lernkarte nur im Üben-Modus.
import { EndScreen, type Mistake } from "@/components/game/end-screen";
import { cancelSlowMotion, createFx, shake } from "@/components/game/fx";
import { GameScene } from "@/components/game/game-scene";
import {
  Banner,
  BinLabels,
  FeverBanner,
  FloatingText,
  type FloatText,
  HudButton,
  ItemCard,
  LearnCard,
  Praise,
  ScoreBadge,
  TimerBar,
} from "@/components/game/hud";
import {
  createBus,
  queueBinEvent,
  queueBurst,
  queueThrow,
  setAim,
  setLandHandler,
  setPreview,
  type ThrowSpec,
} from "@/components/game/scene-bus";
import { IconButton } from "@/components/ui/icon-button";
import { type Item } from "@/constants/items";
import { type GameMode } from "@/constants/modes";
import { Spacing } from "@/constants/theme";
import {
  getBinByCategory,
  getBinsForLevel,
  getItemsForBins,
  getUnlockAtLevel,
} from "@/game/bins";
import { BIN_OPENING_Y, CAMERA_FOV, computeLayout } from "@/game/layout";
import {
  aimFromDrag,
  DAILY_COUNT,
  dailyItems,
  FEVER_EVERY,
  FEVER_SECONDS,
  getMultiplier,
  getPoints,
  type HitResult,
  INITIAL_STATS,
  itemWeight,
  pickItem,
  recentLimit,
  statsReducer,
  XP_PER_RESULT,
} from "@/game/logic";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { devLog } from "@/utils/dev-error-reporter";
import { preloadSfx, refreshSfxSetting, sfx, sfxStreak } from "@/utils/sfx";
import {
  EMPTY_ITEM_STAT,
  getHighscoreKey,
  getItemStats,
  getLevelFromXP,
  getNumber,
  getTodayDaily,
  type ItemStats,
  queueThrowRecord,
  todayKey,
} from "@/utils/storage";
import { Canvas } from "@react-three/fiber/native";
import * as Haptics from "expo-haptics";
import {
  type ComponentProps,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  PixelRatio,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HIGHSCORE_MODE, useCommitRound, useLater } from "./round-hooks";

const ROUND_SECONDS = 60;
/** Nach Zeitablauf: so lange dürfen fliegende Würfe noch landen. */
const TIME_UP_GRACE_MS = 1000;
/** Höchstens so viele „+10“ gleichzeitig. */
const MAX_FLOATS = 5;
/** expo-gl rendert immer in voller Auflösung. Auf 3x-Displays sind Kanten
 *  ohnehin fein – dort Kantenglättung (MSAA) sparen, das entlastet die GPU. */
const ANTIALIAS = PixelRatio.get() < 3;

type Praised = { id: number; text: string; gold: boolean };
type Picker = { recent: string[]; dailyIndex: number };

/** Nächstes Item: Tagesaufgabe der Reihe nach, sonst lernend gewichtet. */
function drawItem(
  picker: Picker,
  pool: Item[],
  dailyList: Item[] | null,
  stats: ItemStats,
  throws: number,
): Item | null {
  if (dailyList) return dailyList[picker.dailyIndex++] ?? null;
  const now = Date.now();
  const item = pickItem(
    pool,
    (i) => itemWeight(i, stats[i.name], throws, now),
    picker.recent,
  );
  if (item) {
    picker.recent.push(item.name);
    while (picker.recent.length > recentLimit(pool.length))
      picker.recent.shift();
  }
  return item;
}
type Learn = { id: number; item: Item; bin: Mistake["bin"] };

export function GameRound({
  mode,
  daily,
  level,
  startXp,
  onAgain,
  onExit,
}: {
  mode: GameMode;
  daily: boolean;
  level: number;
  startXp: number;
  onAgain: () => void;
  onExit: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { scheme } = useAppTheme();
  const { t } = useI18n();
  const { reduceMotion } = useAppSettings();
  const fx = useRef(createFx());
  const bus = useRef(createBus());
  useEffect(() => {
    fx.current.calm = reduceMotion;
  }, [reduceMotion]);
  // Tagesaufgabe immer mit den 3 Grund-Tonnen – damit sie für alle gleich ist.
  const bins = useMemo(
    () => getBinsForLevel(daily ? 1 : level),
    [daily, level],
  );
  const pool = useMemo(() => getItemsForBins(bins), [bins]);
  const dailyQueue = useMemo(
    () => (daily ? dailyItems(pool, todayKey()) : []),
    [daily, pool],
  );
  const { width: screenW, height: screenH } = useWindowDimensions();
  const layout = useMemo(
    () => computeLayout(screenW, screenH, bins.length),
    [screenW, screenH, bins.length],
  );
  const [stats, dispatch] = useReducer(statsReducer, INITIAL_STATS);
  // Synchroner Spiegel von `stats`: bei schnellen Würfen landen mehrere Items,
  // bevor React neu gerendert hat – dann wäre `stats` im Handler veraltet.
  const liveStats = useRef(INITIAL_STATS);
  // Lernstand pro Item: oft falsch Sortiertes kommt häufiger (siehe itemWeight)
  const itemStats = useRef<ItemStats>({});
  const [picker] = useState<Picker>(() => ({ recent: [], dailyIndex: 0 }));
  const dailyList = daily ? dailyQueue : null;
  const [currentItem, setCurrentItemState] = useState<Item | null>(() =>
    drawItem(picker, pool, dailyList, {}, 0),
  );
  // Vorlagen bauen: das erste Item zuerst, dann der ganze Pool.
  const [warmItems] = useState(() =>
    currentItem ? [currentItem, ...pool] : pool,
  );
  const drawNext = () =>
    drawItem(
      picker,
      pool,
      dailyList,
      itemStats.current,
      liveStats.current.throws,
    );
  const itemRef = useRef<Item | null>(currentItem);
  // Die 3D-Szene liest das Item direkt aus dem Bus (kein Neu-Rendern dort);
  // der React-State ist nur für die Item-Karte im HUD.
  const setCurrentItem = useCallback((item: Item | null) => {
    itemRef.current = item;
    setPreview(bus.current, item);
    setCurrentItemState(item);
  }, []);
  useLayoutEffect(() => {
    setPreview(bus.current, itemRef.current);
  }, []);
  const throwMap = useRef(new Map<number, ThrowSpec>());
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [praise, setPraise] = useState<Praised | null>(null);
  const [learn, setLearn] = useState<Learn | null>(null);
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(
    null,
  );
  const [feverId, setFeverId] = useState<number | null>(null);
  const feverRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [timerStarted, setTimerStarted] = useState(false);
  const [hasThrown, setHasThrown] = useState(false);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  // Ergebnis pro Wurf (nur Tagesaufgabe: für die Teilen-Kästchen)
  const [results, setResults] = useState<HitResult[]>([]);
  const [xpEarned, setXpEarned] = useState(0);
  const [bestBefore, setBestBefore] = useState<number | null>(null);
  const xpTotal = useRef(startXp);
  const levelNow = useRef(level);
  const fever = feverId !== null;
  const lock = useRef({
    ended: false,
    over: false,
    timeUp: false,
    id: 0,
  });
  const later = useLater();
  // Dezentes Sound-Feedback (siehe utils/sfx.ts)
  useEffect(() => {
    refreshSfxSetting();
    preloadSfx();
    getItemStats()
      .then((s) => {
        itemStats.current = { ...s, ...itemStats.current };
      })
      .catch(() => undefined);
    if (daily) getTodayDaily().then((d) => setBestBefore(d?.score ?? 0));
    else getNumber(getHighscoreKey(HIGHSCORE_MODE[mode])).then(setBestBefore);
  }, [mode, daily]);
  const timerRunning =
    mode === "time" && timerStarted && !finished && timeLeft > 0;
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimeLeft((v) => Math.max(v - 1, 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);
  useEffect(() => {
    if (mode !== "time" || !timerStarted) return;
    if (timeLeft <= 5 && timeLeft > 0) {
      sfx("tick");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => undefined,
      );
    }
    if (timeLeft <= 0 && !lock.current.timeUp) {
      // Keine neuen Würfe mehr; fliegende dürfen noch landen.
      lock.current.timeUp = true;
      lock.current.ended = true;
      setAim(bus.current, null);
      later(() => setFinished(true), TIME_UP_GRACE_MS);
    }
  }, [mode, timerStarted, timeLeft, later]);
  const showEnd = finished;
  const commitRound = useCommitRound(liveStats, mode, daily);
  useEffect(() => {
    if (!showEnd) return;
    setAim(bus.current, null);
    setPreview(bus.current, null);
    commitRound();
    sfx("end");
  }, [showEnd, commitRound]);
  const showBanner = useCallback(
    (text: string, ms = 2200) => {
      const id = ++lock.current.id;
      setBanner({ id, text });
      later(() => {
        setBanner((b) => (b?.id === id ? null : b));
      }, ms);
    },
    [later],
  );
  const startFever = useCallback(() => {
    const id = ++lock.current.id;
    feverRef.current = true;
    setFeverId(id);
    sfx("fever");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
    later(() => {
      setFeverId((f) => {
        if (f !== id) return f;
        feverRef.current = false;
        return null;
      });
    }, FEVER_SECONDS * 1000);
  }, [later]);
  const throwTo = (binIndex: number, perfect: boolean, power = 1) => {
    const l = lock.current;
    const item = itemRef.current;
    if (!item || l.ended || finished) return;
    setAim(bus.current, null);
    cancelSlowMotion(fx.current);
    if (mode === "time" && !timerStarted) setTimerStarted(true);
    if (!hasThrown) setHasThrown(true);
    const hit = bins[binIndex].category === item.category;
    const spec: ThrowSpec = {
      id: ++l.id,
      item,
      binIndex,
      hit,
      perfect: hit && perfect,
      glow: (hit && perfect) || feverRef.current,
      power,
    };
    throwMap.current.set(spec.id, spec);
    queueThrow(bus.current, spec);

    // Nächstes Item: die Szene tauscht im nächsten Frame nur das Modell
    // (Kopie der Vorlage) – gleich schnell bei jedem Wurftempo.
    setCurrentItem(drawNext());

    sfx("throw", { rate: perfect ? 1.1 : 1 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
  };
  const handleLand = (throwId: number) => {
    const ts = throwMap.current.get(throwId);
    if (!ts) return;
    throwMap.current.delete(throwId);
    const l = lock.current;
    if (mode === "survival" && l.over) return;
    const i = ts.binIndex;
    const bin = bins[i];
    const result: HitResult = ts.hit
      ? ts.perfect
        ? "perfect"
        : "correct"
      : "wrong";
    const feverNow = feverRef.current;
    const before = liveStats.current;
    const points = getPoints(result, before.streak, feverNow);
    const top = layout.binTops[i];
    const id = ++l.id;
    const action = { type: "result", result, points } as const;
    const after = statsReducer(before, action);
    liveStats.current = after;
    dispatch(action);
    if (daily) setResults((r) => [...r, result]);
    // Lernstand sofort lokal mitführen (Gewichtung passt sich in der Runde an)
    const old = itemStats.current[ts.item.name] ?? EMPTY_ITEM_STAT;
    itemStats.current[ts.item.name] = ts.hit
      ? { ...old, correct: old.correct + 1, streak: old.streak + 1 }
      : { ...old, wrong: old.wrong + 1, streak: 0, lastWrong: Date.now() };
    if (daily && after.throws >= DAILY_COUNT && !l.ended) {
      l.ended = true;
      setAim(bus.current, null);
      later(() => setFinished(true), 900);
    }
    queueBinEvent(
      bus.current,
      i,
      ts.hit ? (ts.perfect ? "perfect" : "hit") : "reject",
    );
    if (ts.hit) {
      const streakNow = after.streak;
      sfx("land");
      if (ts.perfect) sfx("perfect");
      else sfxStreak(streakNow);
      if (ts.perfect)
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => undefined);
      else
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
          () => undefined,
        );
      shake(fx.current, ts.perfect ? 0.05 : 0.015);
      queueBurst(bus.current, {
        id,
        x: layout.bins[i].x,
        y: BIN_OPENING_Y + 0.15,
        z: layout.bins[i].z + 0.1,
        colors: ts.perfect
          ? ["#FFD54A", "#FFFFFF", bin.colorLight, "#FFB300"]
          : [bin.color, bin.colorLight, "#FFFFFF"],
        count: ts.perfect ? 30 : feverNow ? 20 : 12,
        power: ts.perfect ? 1.25 : 1,
        ring: ts.perfect,
      });
      setFloats((f) => [
        ...f.slice(-(MAX_FLOATS - 1)),
        {
          id,
          x: top.x,
          y: top.y,
          text: `+${points}`,
          color: ts.perfect || feverNow ? "#FFD54A" : "#FFFFFF",
        },
      ]);
      const praiseKey = (
        [
          "game.praise.1",
          "game.praise.2",
          "game.praise.3",
          "game.praise.4",
        ] as const
      )[id % 4];
      // Dezent: Lob-Text nur bei Perfekt und bei Serien (5, 10, 15 …)
      if (ts.perfect || streakNow % 5 === 0) {
        setPraise({
          id,
          text: ts.perfect
            ? t("game.perfect")
            : `${t(praiseKey)} ×${streakNow}`,
          gold: ts.perfect,
        });
        later(() => {
          setPraise((p) => (p?.id === id ? null : p));
        }, 900);
      }
      if (streakNow % FEVER_EVERY === 0) startFever();
      // Jede 5er-Serie: die anderen Tonnen hüpfen mit
      if (streakNow % 5 === 0)
        bins.forEach((_, k) => {
          if (k !== i) queueBinEvent(bus.current, k, "peek");
        });
    } else {
      sfx("wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => undefined,
      );
      shake(fx.current, 0.04, "x");
      const correctBin = getBinByCategory(ts.item.category) ?? bin;
      if (mode === "endless") {
        setLearn({ id, item: ts.item, bin: correctBin });
        later(() => {
          setLearn((v) => (v?.id === id ? null : v));
        }, 1800);
      }
      setMistakes((m) => [...m, { item: ts.item, bin: correctBin }]);
      if (mode === "survival") {
        l.over = true;
        l.ended = true;
        setAim(bus.current, null);
        later(() => {
          setFinished(true);
        }, 1900);
      }
    }
    // XP + Level-Aufstieg lokal berechnen; gespeichert wird gebündelt.
    const xp = XP_PER_RESULT[result];
    setXpEarned((v) => v + xp);
    queueThrowRecord({ correct: ts.hit, xp, item: ts.item.name });
    xpTotal.current += xp;
    const newLevel = getLevelFromXP(xpTotal.current);
    if (newLevel > levelNow.current) {
      levelNow.current = newLevel;
      sfx("levelup");
      showBanner(`⬆ ${t("game.levelUp", { level: newLevel })}`);
      const unlocked = getUnlockAtLevel(newLevel);
      if (unlocked)
        later(() => {
          showBanner(
            `🎁 ${t("game.newBin", { bin: t(unlocked.labelKey) })}`,
            3000,
          );
        }, 2400);
    }
  };
  const handlers = useRef({
    aim: (_dx: number, _dy: number) => {},
    release: (_dx: number, _dy: number, _vy: number) => {},
    cancel: () => {},
    tap: (_x: number, _y: number) => {},
    throwTo: (_i: number) => {},
    land: (_id: number) => {},
  });
  useLayoutEffect(() => {
    handlers.current = {
      aim: (dx, dy) => {
        if (lock.current.ended) return;
        const idx = aimFromDrag(dx, dy, layout.binAngles)?.binIndex ?? null;
        if (idx === bus.current.aim) return;
        setAim(bus.current, idx);
        if (idx !== null) {
          sfx("aim");
          Haptics.selectionAsync().catch(() => undefined);
        }
      },
      release: (dx, dy, vy) => {
        const aim = aimFromDrag(dx, dy, layout.binAngles);
        setAim(bus.current, null);
        // Schneller Wisch → kräftigere, flachere Bahn; langsamer → höherer Bogen
        const power = Math.min(Math.max(0.8 + -vy / 5000, 0.8), 1.3);
        if (aim) throwTo(aim.binIndex, aim.perfect, power);
      },
      cancel: () => setAim(bus.current, null),
      tap: (x, y) => {
        const i = layout.binRects.findIndex(
          (r) =>
            x >= r.x - 8 &&
            x <= r.x + r.w + 8 &&
            y >= r.y - 24 &&
            y <= r.y + r.h + 64,
        );
        if (i !== -1) throwTo(i, false);
      },
      throwTo: (i) => throwTo(i, false),
      land: handleLand,
    };
  });
  useEffect(() => {
    const b = bus.current;
    setLandHandler(b, (id) => handlers.current.land(id));
    return () => setLandHandler(b, () => undefined);
  }, []);
  const onAim = useCallback(
    (dx: number, dy: number) => handlers.current.aim(dx, dy),
    [],
  );
  const onRelease = useCallback(
    (dx: number, dy: number, vy: number) =>
      handlers.current.release(dx, dy, vy),
    [],
  );
  const onCancel = useCallback(() => handlers.current.cancel(), []);
  const onTap = useCallback(
    (x: number, y: number) => handlers.current.tap(x, y),
    [],
  );
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(!showEnd)
      .runOnJS(true)
      .minDistance(6)
      .onUpdate((e) => {
        onAim(e.translationX, e.translationY);
      })
      .onEnd((e) => {
        onRelease(e.translationX, e.translationY, e.velocityY);
      })
      .onFinalize(onCancel);
    const tap = Gesture.Tap()
      .enabled(!showEnd)
      .runOnJS(true)
      .maxDistance(12)
      .onEnd((e, success) => {
        if (success) onTap(e.x, e.y);
      });
    return Gesture.Race(pan, tap);
  }, [onAim, onRelease, onCancel, onTap, showEnd]);
  /* eslint-enable react-hooks/refs */
  const onFloatDone = useCallback((id: number) => {
    setFloats((f) => f.filter((x) => x.id !== id));
  }, []);
  const onActivateBin = useCallback(
    (i: number) => handlers.current.throwTo(i),
    [],
  );
  const ready = screenW > 0 && screenH > 0;
  const praiseTop = (layout.binRects[0]?.y ?? 200) - 80;
  const endTitle = mode === "time" ? t("game.end.timeUp") : t("game.end.over");
  const newBest =
    bestBefore !== null && stats.score > bestBefore && stats.score > 0;
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
            fever={fever}
            fx={fx}
            bus={bus}
            calm={reduceMotion}
            warmItems={warmItems}
          />
        )}
        {ready && !showEnd && (
          <>
            <BinLabels
              bins={bins}
              rects={layout.binRects}
              bus={bus}
              onActivate={onActivateBin}
            />
            {floats.map((f) => (
              <FloatingText key={f.id} item={f} onDone={onFloatDone} />
            ))}

            {praise && (
              <View
                pointerEvents="none"
                style={[styles.praiseWrap, { top: praiseTop }]}
              >
                <Praise key={praise.id} text={praise.text} gold={praise.gold} />
              </View>
            )}
            <View
              pointerEvents="box-none"
              style={[styles.top, { paddingTop: insets.top + Spacing.sm }]}
            >
              <View pointerEvents="box-none" style={styles.topRow}>
                <IconButton
                  icon="x"
                  label={t("common.close")}
                  onPress={onExit}
                />
                <ScoreBadge
                  score={stats.score}
                  streak={stats.streak}
                  multiplier={getMultiplier(stats.streak) * (fever ? 2 : 1)}
                  feverProgress={(stats.streak % FEVER_EVERY) / FEVER_EVERY}
                  fever={fever}
                />
                {mode === "endless" && !daily && stats.throws > 0 ? (
                  <HudButton
                    label={t("game.finish")}
                    onPress={() => setFinished(true)}
                  />
                ) : (
                  <View style={styles.topSpacer} />
                )}
              </View>
              {mode === "time" && (
                <TimerBar timeLeft={timeLeft} total={ROUND_SECONDS} />
              )}
              {fever && <FeverBanner key={feverId} seconds={FEVER_SECONDS} />}
            </View>
            {banner && (
              <View
                pointerEvents="none"
                style={[styles.bannerWrap, { top: insets.top + 150 }]}
              >
                <Banner key={banner.id} text={banner.text} />
              </View>
            )}
            <View
              pointerEvents="none"
              style={[
                styles.bottom,
                { paddingBottom: insets.bottom + Spacing.md },
              ]}
            >
              {mode === "endless" && learn && (
                <LearnCard key={learn.id} item={learn.item} bin={learn.bin} />
              )}
              {currentItem && (
                <ItemCard
                  key={currentItem.name}
                  item={currentItem}
                  showHint={!hasThrown}
                />
              )}
            </View>
          </>
        )}
        {showEnd && (
          <EndScreen
            title={endTitle}
            stats={stats}
            startXp={startXp}
            xpEarned={xpEarned}
            daily={daily}
            results={results}
            newBest={newBest}
            mistakes={mistakes}
            onAgain={onAgain}
            onMenu={onExit}
          />
        )}
      </View>
    </GestureDetector>
  );
}
/** Die 3D-Fläche. Eigene memo-Komponente: Punkte, Lob, „+10“ und Timer
 *  rendern nur das HUD neu – die Canvas (und R3F) bleiben unberührt. */
const SceneCanvas = memo(function SceneCanvas({
  width,
  height,
  ...scene
}: { width: number; height: number } & ComponentProps<typeof GameScene>) {
  return (
    <Canvas
      style={{ position: "absolute", left: 0, top: 0, width, height }}
      shadows={false}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 80 }}
      gl={{ antialias: ANTIALIAS }}
      onCreated={(s) =>
        devLog(
          "CANVAS",
          "erstellt",
          s.size.width,
          s.size.height,
          "screen",
          width,
          height,
        )
      }
    >
      <GameScene {...scene} />
    </Canvas>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    position: "absolute",
    top: 0,
    left: Spacing.md,
    right: Spacing.md,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  topSpacer: { width: 48 },
  praiseWrap: { position: "absolute", left: 0, right: 0 },
  bannerWrap: { position: "absolute", left: 0, right: 0 },
  bottom: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    bottom: 0,
    gap: Spacing.sm,
  },
});
