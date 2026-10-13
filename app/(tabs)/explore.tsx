// Datei: app/(tabs)/explore.tsx — Spiel v2
//
// Neuaufbau: Die 3D-Teile liegen in components/game/, die Regeln in game/.
// Hier wird nur noch der Ablauf einer Runde gesteuert.
//
// Steuerung: Finger in Richtung Tonne ziehen → Flugbahn + Tonne leuchten →
// loslassen = Wurf. Alternativ auf die Tonne tippen (WCAG 2.5.1).
// Nur die Richtung zählt, nicht die Länge. Genau gezielt = „Perfekt“.

import { Canvas } from "@react-three/fiber/native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Burst } from "@/components/game/effects";
import { EndScreen, type Mistake } from "@/components/game/end-screen";
import { createFx, shake } from "@/components/game/fx";
import { GameScene, type ThrowState } from "@/components/game/game-scene";
import {
  Banner,
  BinLabels,
  FeverBanner,
  type FloatText,
  FloatingText,
  HudButton,
  ItemCard,
  LearnCard,
  Praise,
  ScoreBadge,
  TimerBar,
} from "@/components/game/hud";
import { type BinEvent } from "@/components/game/trash-bin";
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
  drawFromBag,
  FEVER_EVERY,
  FEVER_SECONDS,
  getMultiplier,
  getPoints,
  type HitResult,
  INITIAL_STATS,
  statsReducer,
  XP_PER_RESULT,
} from "@/game/logic";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import {
  getBoolean,
  getHighscoreKey,
  getLevelFromXP,
  getNumber,
  recordThrow,
  saveHighscore,
  StorageKeys,
} from "@/utils/storage";

const ROUND_SECONDS = 60;

const HIGHSCORE_MODE = {
  endless: "endlos",
  survival: "runden",
  time: "zeit",
} as const;

/* ═════════════════════════════════════════════════════════════
 * SCREEN: lädt das Level und startet Runden
 * ═════════════════════════════════════════════════════════════ */

export default function GameScreen() {
  const { mode: rawMode } = useLocalSearchParams<{ mode?: string }>();
  const mode: GameMode =
    rawMode === "survival" || rawMode === "time" ? rawMode : "endless";
  const router = useRouter();
  const { colors } = useAppTheme();

  const [level, setLevel] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  const loadLevel = useCallback(() => {
    getNumber(StorageKeys.TOTAL_XP)
      .then((xp) => setLevel(getLevelFromXP(xp)))
      .catch(() => setLevel(1));
  }, []);

  useEffect(() => {
    loadLevel();
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, [loadLevel]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const playAgain = useCallback(() => {
    loadLevel(); // evtl. neue Tonne freigeschaltet
    setRound((r) => r + 1);
  }, [loadLevel]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bg }]}>
      {level !== null && (
        <GameRound
          key={`${round}-${level}`}
          mode={mode}
          level={level}
          onAgain={playAgain}
          onExit={goBack}
        />
      )}
    </GestureHandlerRootView>
  );
}

/* ═════════════════════════════════════════════════════════════
 * EINE RUNDE
 * ═════════════════════════════════════════════════════════════ */

type Praised = { id: number; text: string; gold: boolean };
type Learn = { item: Item; bin: Mistake["bin"] };

function GameRound({
  mode,
  level,
  onAgain,
  onExit,
}: {
  mode: GameMode;
  level: number;
  onAgain: () => void;
  onExit: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { scheme } = useAppTheme();
  const { t } = useI18n();
  const { reduceMotion } = useAppSettings();

  // Effekt-Zustand wird in useFrame gelesen und in Event-Handlern mutiert.
  const fx = useRef(createFx());
  useEffect(() => {
    fx.current.calm = reduceMotion;
  }, [reduceMotion]);

  /* ── Tonnen, Items, Layout ─────────────────────────────── */

  const bins = useMemo(() => getBinsForLevel(level), [level]);
  const pool = useMemo(() => getItemsForBins(bins), [bins]);
  const [bag] = useState(() => ({ current: [] as Item[] }));

  const [size, setSize] = useState({ w: 0, h: 0 });
  const layout = useMemo(
    () => computeLayout(size.w || 1, size.h || 1, bins.length),
    [size, bins.length],
  );

  /* ── Spielzustand ──────────────────────────────────────── */

  const [stats, dispatch] = useReducer(statsReducer, INITIAL_STATS);
  const [currentItem, setCurrentItem] = useState<Item | null>(() =>
    drawFromBag(bag, pool),
  );
  const [throwState, setThrowState] = useState<ThrowState | null>(null);
  const [aimIndex, setAimIndex] = useState<number | null>(null);
  const [binEvents, setBinEvents] = useState<(BinEvent | null)[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [praise, setPraise] = useState<Praised | null>(null);
  const [learn, setLearn] = useState<Learn | null>(null);
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);
  const [feverId, setFeverId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [timerStarted, setTimerStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [xpEarned, setXpEarned] = useState(0);
  const [bestBefore, setBestBefore] = useState<number | null>(null);

  const fever = feverId !== null;

  // Sperren, die sofort (ohne Re-Render) greifen müssen
  const lock = useRef({ busy: false, ended: false, aim: null as number | null, id: 0 });

  /* ── Timer-Helfer (werden beim Verlassen aufgeräumt) ───── */

  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  useEffect(() => {
    const set = timers.current;
    return () => set.forEach(clearTimeout);
  }, []);

  /* ── Sound ─────────────────────────────────────────────── */

  const sCorrect = useAudioPlayer(require("../../assets/sounds/correct.mp3"));
  const sHit = useAudioPlayer(require("../../assets/sounds/bin-hit.wav"));
  const sMiss = useAudioPlayer(require("../../assets/sounds/bin-miss.wav"));
  const soundOn = useRef(true);

  useEffect(() => {
    getBoolean(StorageKeys.SOUND_ENABLED, true).then((v) => {
      soundOn.current = v;
    });
    getNumber(getHighscoreKey(HIGHSCORE_MODE[mode])).then(setBestBefore);
  }, [mode]);

  const play = useCallback((player: typeof sCorrect) => {
    if (!soundOn.current) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Sound ist Bonus – Spiel läuft weiter.
    }
  }, []);

  /* ── Zeitmodus ─────────────────────────────────────────── */

  const timerRunning = mode === "time" && timerStarted && !finished && timeLeft > 0;
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimeLeft((v) => Math.max(v - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (mode !== "time" || !timerStarted) return;
    if (timeLeft <= 5 && timeLeft > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    if (timeLeft <= 0) lock.current.ended = true;
  }, [mode, timerStarted, timeLeft]);

  // Zeit um → Runde beenden, sobald der letzte Wurf gelandet ist.
  const timeUp = mode === "time" && timeLeft <= 0;
  const showEnd = finished || (timeUp && !throwState);

  /* ── Banner / Fieber ───────────────────────────────────── */

  const showBanner = useCallback(
    (text: string, ms = 2200) => {
      const id = ++lock.current.id;
      setBanner({ id, text });
      later(() => setBanner((b) => (b?.id === id ? null : b)), ms);
    },
    [later],
  );

  const startFever = useCallback(() => {
    const id = ++lock.current.id;
    setFeverId(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    later(() => setFeverId((f) => (f === id ? null : f)), FEVER_SECONDS * 1000);
  }, [later]);

  /* ── Wurf ──────────────────────────────────────────────── */

  const throwTo = (binIndex: number, perfect: boolean) => {
    const l = lock.current;
    if (!currentItem || l.busy || l.ended || finished) return;
    l.busy = true;
    l.aim = null;
    setAimIndex(null);
    if (mode === "time") setTimerStarted(true);

    const hit = bins[binIndex].category === currentItem.category;
    setThrowState({ id: ++l.id, item: currentItem, binIndex, hit, perfect: hit && perfect });
    setPraise(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  /** Item ist an der Tonne angekommen → Wertung + alle Effekte. */
  const handleLand = () => {
    const ts = throwState;
    if (!ts) return;
    const i = ts.binIndex;
    const bin = bins[i];
    const result: HitResult = ts.hit ? (ts.perfect ? "perfect" : "correct") : "wrong";
    const points = getPoints(result, stats.streak, fever);
    const top = layout.binTops[i];
    const id = ++lock.current.id;

    dispatch({ type: "result", result, points });
    setBinEvents((ev) => {
      const next = [...ev];
      next[i] = { type: ts.hit ? (ts.perfect ? "perfect" : "hit") : "reject", id };
      return next;
    });

    if (ts.hit) {
      play(sHit);
      play(sCorrect);
      if (ts.perfect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      }
      shake(fx.current, ts.perfect ? 0.1 : 0.035);

      setBursts((b) => [
        ...b,
        {
          id,
          x: layout.bins[i].x,
          y: BIN_OPENING_Y + 0.15,
          z: layout.bins[i].z + 0.1,
          colors: ts.perfect
            ? ["#FFD54A", "#FFFFFF", bin.colorLight, "#FFB300"]
            : [bin.color, bin.colorLight, "#FFFFFF"],
          count: ts.perfect ? 50 : fever ? 36 : 24,
          power: ts.perfect ? 1.25 : 1,
          ring: ts.perfect,
        },
      ]);
      setFloats((f) => [
        ...f,
        { id, x: top.x, y: top.y, text: `+${points}`, color: ts.perfect || fever ? "#FFD54A" : "#FFFFFF" },
      ]);

      const praiseKey = (["game.praise.1", "game.praise.2", "game.praise.3", "game.praise.4"] as const)[
        id % 4
      ];
      setPraise({ id, text: ts.perfect ? t("game.perfect") : t(praiseKey), gold: ts.perfect });
      later(() => setPraise((p) => (p?.id === id ? null : p)), 750);

      const streakAfter = stats.streak + 1;
      if (streakAfter % FEVER_EVERY === 0) startFever();
    } else {
      play(sMiss);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      shake(fx.current, 0.08, "x");
      const correctBin = getBinByCategory(ts.item.category) ?? bin;
      setLearn({ item: ts.item, bin: correctBin });
      setMistakes((m) => [...m, { item: ts.item, bin: correctBin }]);

      if (mode === "survival") {
        lock.current.ended = true;
        later(() => setFinished(true), 1900);
      }
    }

    // Speichern: XP, Statistik, Bestwert
    const xp = XP_PER_RESULT[result];
    setXpEarned((v) => v + xp);
    recordThrow({ correct: ts.hit, xp })
      .then(({ leveledUp, level: newLevel }) => {
        if (!leveledUp) return;
        showBanner(`⬆ ${t("game.levelUp", { level: newLevel })}`);
        const unlocked = getUnlockAtLevel(newLevel);
        if (unlocked) {
          later(() => showBanner(`🎁 ${t("game.newBin", { bin: t(unlocked.labelKey) })}`, 3000), 2400);
        }
      })
      .catch(() => undefined);
    if (points > 0) saveHighscore(HIGHSCORE_MODE[mode], stats.score + points).catch(() => undefined);
  };

  /** Wurf-Animation ist fertig → nächstes Item. */
  const handleThrowDone = () => {
    const ts = throwState;
    setThrowState(null);
    if (!ts) return;
    const next = drawFromBag(bag, pool, ts.item.name);

    if (ts.hit) {
      setCurrentItem(next);
      lock.current.busy = false;
      return;
    }
    // Nach einem Fehler: Lern-Karte kurz stehen lassen
    later(() => {
      setLearn(null);
      if (lock.current.ended) return;
      setCurrentItem(next);
      lock.current.busy = false;
    }, 1500);
  };

  /* ── Gesten ────────────────────────────────────────────── */

  const handlers = useRef({
    aim: (_dx: number, _dy: number) => {},
    release: (_dx: number, _dy: number) => {},
    cancel: () => {},
    tap: (_x: number, _y: number) => {},
    land: () => {},
    done: () => {},
  });

  useLayoutEffect(() => {
    handlers.current = {
      aim: (dx, dy) => {
        const l = lock.current;
        if (l.busy || l.ended) return;
        const idx = aimFromDrag(dx, dy, layout.binAngles)?.binIndex ?? null;
        if (idx === l.aim) return;
        l.aim = idx;
        setAimIndex(idx);
        if (idx !== null) Haptics.selectionAsync().catch(() => undefined);
      },
      release: (dx, dy) => {
        const aim = aimFromDrag(dx, dy, layout.binAngles);
        lock.current.aim = null;
        setAimIndex(null);
        if (aim) throwTo(aim.binIndex, aim.perfect);
      },
      cancel: () => {
        if (lock.current.aim === null) return;
        lock.current.aim = null;
        setAimIndex(null);
      },
      tap: (x, y) => {
        const i = layout.binRects.findIndex(
          (r) => x >= r.x - 8 && x <= r.x + r.w + 8 && y >= r.y - 24 && y <= r.y + r.h + 64,
        );
        if (i !== -1) throwTo(i, false);
      },
      land: handleLand,
      done: handleThrowDone,
    };
  });

  // Stabile Callbacks → die Geste wird nur einmal gebaut.
  const onAim = useCallback((dx: number, dy: number) => handlers.current.aim(dx, dy), []);
  const onRelease = useCallback(
    (dx: number, dy: number) => handlers.current.release(dx, dy),
    [],
  );
  const onCancel = useCallback(() => handlers.current.cancel(), []);
  const onTap = useCallback((x: number, y: number) => handlers.current.tap(x, y), []);

  // Die Callbacks laufen nur bei Berührung (nie beim Rendern) – der Compiler
  // kann das beim Gesture-Builder nicht erkennen.
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(!showEnd)
      .runOnJS(true)
      .minDistance(6)
      .onUpdate((e) => onAim(e.translationX, e.translationY))
      .onEnd((e) => onRelease(e.translationX, e.translationY))
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

  const onLand = useCallback(() => handlers.current.land(), []);
  const onThrowDone = useCallback(() => handlers.current.done(), []);
  const onBurstDone = useCallback(
    (id: number) => setBursts((b) => b.filter((x) => x.id !== id)),
    [],
  );
  const onFloatDone = useCallback(
    (id: number) => setFloats((f) => f.filter((x) => x.id !== id)),
    [],
  );
  const onActivateBin = useCallback((i: number) => handlers.current.tap(
    layout.binRects[i].x + 1,
    layout.binRects[i].y + 1,
  ), [layout]);

  /* ── Darstellung ───────────────────────────────────────── */

  const ready = size.w > 0;
  const praiseTop = (layout.binRects[0]?.y ?? 200) - 80;
  const endTitle =
    mode === "time" ? t("game.end.timeUp") : t("game.end.over");
  const newBest = bestBefore !== null && stats.score > bestBefore && stats.score > 0;

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.root}
        onLayout={(e) =>
          setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {ready && (
          <Canvas shadows camera={{ fov: CAMERA_FOV, near: 0.1, far: 80 }} gl={{ antialias: true }}>
            <GameScene
              layout={layout}
              bins={bins}
              scheme={scheme}
              fever={fever}
              fx={fx}
              calm={reduceMotion}
              previewItem={showEnd || learn ? null : currentItem}
              aimIndex={aimIndex}
              throwState={throwState}
              binEvents={binEvents}
              bursts={bursts}
              onLand={onLand}
              onThrowDone={onThrowDone}
              onBurstDone={onBurstDone}
            />
          </Canvas>
        )}

        {ready && !showEnd && (
          <>
            <BinLabels
              bins={bins}
              rects={layout.binRects}
              aimIndex={aimIndex}
              onActivate={onActivateBin}
            />

            {floats.map((f) => (
              <FloatingText key={f.id} item={f} onDone={onFloatDone} />
            ))}

            {praise && (
              <View pointerEvents="none" style={[styles.praiseWrap, { top: praiseTop }]}>
                <Praise key={praise.id} text={praise.text} gold={praise.gold} />
              </View>
            )}

            {/* Oben: Zurück · Punkte · Fertig */}
            <View
              pointerEvents="box-none"
              style={[styles.top, { paddingTop: insets.top + Spacing.sm }]}
            >
              <View pointerEvents="box-none" style={styles.topRow}>
                <IconButton icon="x" label={t("common.close")} onPress={onExit} />
                <ScoreBadge
                  score={stats.score}
                  streak={stats.streak}
                  multiplier={getMultiplier(stats.streak) * (fever ? 2 : 1)}
                />
                {mode === "endless" && stats.throws > 0 ? (
                  <HudButton label={t("game.finish")} onPress={() => setFinished(true)} />
                ) : (
                  <View style={styles.topSpacer} />
                )}
              </View>
              {mode === "time" && <TimerBar timeLeft={timeLeft} total={ROUND_SECONDS} />}
              {fever && <FeverBanner key={feverId} seconds={FEVER_SECONDS} />}
            </View>

            {banner && (
              <View pointerEvents="none" style={[styles.bannerWrap, { top: insets.top + 150 }]}>
                <Banner key={banner.id} text={banner.text} />
              </View>
            )}

            {/* Unten: Item oder Lern-Karte */}
            <View
              pointerEvents="none"
              style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.md }]}
            >
              {learn ? (
                <LearnCard item={learn.item} bin={learn.bin} />
              ) : (
                currentItem &&
                !throwState && (
                  <ItemCard
                    key={currentItem.name}
                    item={currentItem}
                    showHint={stats.throws === 0}
                  />
                )
              )}
            </View>
          </>
        )}

        {showEnd && (
          <EndScreen
            title={endTitle}
            stats={stats}
            xpEarned={xpEarned}
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
  },
});
