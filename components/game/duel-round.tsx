// Datei: components/game/duel-round.tsx — Schnell-Duell (1 gegen 1)
// (Route: app/runde.tsx?mode=duel)
//
// Ein Handy, zwei Spieler nebeneinander: Der Bildschirm ist unten geteilt,
// links wischt Spieler 1, rechts Spieler 2 – gleichzeitig, auf denselben
// Gegenstand. Wer zuerst in die richtige Tonne wirft, bekommt den Punkt; wer
// falsch wirft, ist für diesen Gegenstand raus. Oben zeigt ein Tauziehen,
// wer vorne liegt; das Finale zählt doppelt. Am Ende: Tabelle, schnellster
// Wurf und eine kleine Lernliste. Regeln: game/duel.ts.

import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createFx, shake } from "@/components/game/fx";
import { SceneCanvas } from "@/components/game/game-round";
import { Banner, FloatingText, type FloatText, ItemCard } from "@/components/game/hud";
import {
  createBus,
  queueBinEvent,
  queueBurst,
  queueThrow,
  setLandHandler,
  setPreview,
  type ThrowSpec,
} from "@/components/game/scene-bus";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { type Item } from "@/constants/items";
import { Radius, Spacing } from "@/constants/theme";
import { getBinByCategory, getBinsForScene, getItemsForBins } from "@/game/bins";
import {
  averageMs,
  createDuel,
  DUEL_HOT,
  DUEL_ITEM_MS,
  DUEL_ITEMS,
  duelNext,
  duelOver,
  duelThrow,
  duelTimeout,
  duelWinner,
  type DuelState,
  fastestHit,
  isFinale,
  mistakesOf,
  type Player,
  pointsFor,
  tugOf,
} from "@/game/duel";
import { itemMaterial } from "@/game/item-mass";
import { BIN_OPENING_Y, computeLayout } from "@/game/layout";
import { aimFromDrag } from "@/game/logic";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { playMusic } from "@/utils/music";
import { preloadSfx, refreshSfxSetting, sfx, sfxMaterial } from "@/utils/sfx";

import { useLater } from "./round-hooks";
import { nextScene } from "./stage";

/** Spielerfarben: kräftig, auf Himmel und Pflaster gut zu unterscheiden
 *  (auch bei Rot-Grün-Schwäche: Orange gegen Blau). Text darauf dunkel. */
export const PLAYER = [
  { color: "#FF8A3D", on: "#2A1400" },
  { color: "#4DA3FF", on: "#00213F" },
] as const;

/** Pause nach einem entschiedenen Gegenstand (ms), dann der nächste. */
const NEXT_MS = 1150;
/** Ansage „Finale“ (ms), bevor der letzte Gegenstand kommt. */
const FINALE_MS = 1500;

type Phase = "ready" | "countdown" | "play" | "end";

/** Mischen (Fisher-Yates) – jedes Duell andere Gegenstände. */
function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function DuelRound({ onAgain, onExit }: { onAgain: () => void; onExit: () => void }) {
  const insets = useSafeAreaInsets();
  const { scheme, colors } = useAppTheme();
  const { t, lang, itemName, formatNumber } = useI18n();
  const { reduceMotion } = useAppSettings();
  const fx = useRef(createFx());
  const bus = useRef(createBus());
  useEffect(() => {
    fx.current.calm = reduceMotion;
  }, [reduceMotion]);
  const [scene] = useState(nextScene);
  // Grund-Tonnen der Szene – unabhängig vom eigenen Level, fair für beide
  const bins = useMemo(() => getBinsForScene(scene, 1), [scene]);
  const [queue] = useState<Item[]>(() => shuffled(getItemsForBins(bins)).slice(0, DUEL_ITEMS));
  const { width: screenW, height: screenH } = useWindowDimensions();
  const layout = useMemo(() => computeLayout(screenW, screenH, bins.length), [screenW, screenH, bins.length]);
  const later = useLater();

  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [count, setCount] = useState(3);
  const [duel, setDuelState] = useState<DuelState>(createDuel);
  const duelRef = useRef(duel);
  const setDuel = useCallback((d: DuelState) => {
    duelRef.current = d;
    setDuelState(d);
  }, []);
  const [item, setItem] = useState<Item | null>(null);
  const shownAt = useRef(0);
  /** Wechselt mit jedem Gegenstand – alte Zeitgeber wissen so, dass sie veraltet sind. */
  const token = useRef(0);
  const ids = useRef(0);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);
  const throws = useRef(new Map<number, { player: Player; hit: boolean; bin: number; item: Item }>());

  useEffect(() => {
    refreshSfxSetting();
    preloadSfx();
    // Auch nach „Revanche“ wieder Spielmusik (am Ende lief die Menü-Musik)
    playMusic("game");
  }, []);

  const goPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const showBanner = useCallback(
    (text: string, ms = 1600) => {
      const id = ++ids.current;
      setBanner({ id, text });
      AccessibilityInfo.announceForAccessibility(text.replace(/[^\p{L}\p{N}\s:,.!–-]/gu, "").trim());
      later(() => setBanner((b) => (b?.id === id ? null : b)), ms);
    },
    [later],
  );

  const float = useCallback((text: string, x: number, y: number, color: string) => {
    setFloats((f) => [...f.slice(-5), { id: ++ids.current, x, y, text, color }]);
  }, []);

  /** Nächster Schritt (advance, unten) – über eine Ref, weil sich
   *  Gegenstand → Zeitgeber → nächster Gegenstand gegenseitig aufrufen. */
  const advanceRef = useRef<() => void>(() => undefined);
  /** Weiter nach `ms` – außer es ist inzwischen ein anderer Gegenstand dran. */
  const advanceLater = (ms: number) => {
    const my = token.current;
    later(() => {
      if (token.current === my) advanceRef.current();
    }, ms);
  };

  /** Richtige Tonne kurz hüpfen lassen und sagen, wohin es gehört. */
  const reveal = (it: Item) => {
    const i = bins.findIndex((b) => b.category === it.category);
    if (i >= 0) queueBinEvent(bus.current, i, "peek");
    const bin = getBinByCategory(it.category);
    if (bin) showBanner(t("duel.belongsIn", { item: itemName(it), bin: t(bin.labelKey) }), 1500);
  };

  const showItem = (index: number) => {
    const next = queue[index] ?? null;
    const my = ++token.current;
    setItem(next);
    setPreview(bus.current, next);
    shownAt.current = Date.now();
    // Niemand trifft: nach DUEL_ITEM_MS zeigen, wohin es gehört, und weiter
    later(() => {
      if (token.current !== my || !next) return;
      const s = duelRef.current;
      if (s.settled) return;
      setDuel(duelTimeout(s, next.name));
      reveal(next);
      advanceLater(NEXT_MS + 300);
    }, DUEL_ITEM_MS);
  };

  const advance = () => {
    const s = duelNext(duelRef.current);
    setDuel(s);
    if (duelOver(s)) {
      setItem(null);
      setPreview(bus.current, null);
      goPhase("end");
      sfx("end");
      playMusic("menu");
      return;
    }
    if (isFinale(s.index)) {
      setItem(null);
      setPreview(bus.current, null);
      showBanner(`🏆 ${t("duel.finale")}`, FINALE_MS);
      sfx("fever");
      later(() => showItem(s.index), FINALE_MS);
      return;
    }
    showItem(s.index);
  };
  useLayoutEffect(() => {
    advanceRef.current = advance;
  });

  const start = () => {
    // Doppelt getippt? Nur ein Countdown
    if (phaseRef.current !== "ready") return;
    goPhase("countdown");
    setCount(3);
    sfx("tick");
    later(() => {
      setCount(2);
      sfx("tick");
    }, 700);
    later(() => {
      setCount(1);
      sfx("tick");
    }, 1400);
    later(() => {
      goPhase("play");
      sfx("comboUp");
      showItem(0);
    }, 2100);
  };

  /** Bildschirm-x der Hälfte eines Spielers (für Rückmeldungen). */
  const sideX = (p: Player) => (p === 0 ? screenW * 0.25 : screenW * 0.75);
  const feedbackY = screenH - insets.bottom - 150;

  /** Richtung zu jeder Tonne vom Startpunkt des Daumens aus (Grad, 0 = gerade
   *  hoch) – wer links sitzt, zielt von links auf die Tonnen. */
  const anglesFrom = (x: number, y: number) =>
    layout.binTops.map((b) => (Math.atan2(b.x - x, y - b.y) * 180) / Math.PI);

  const handleThrow = (p: Player, x0: number, y0: number, dx: number, dy: number, vy: number) => {
    if (phaseRef.current !== "play") return;
    const current = item;
    if (!current) return;
    const aim = aimFromDrag(dx, dy, anglesFrom(x0, y0));
    if (!aim) return;
    const correct = bins[aim.binIndex].category === current.category;
    const now = Date.now();
    const { state, outcome } = duelThrow(duelRef.current, p, correct, now - shownAt.current, current.name, now);
    if (outcome === "ignored") return;
    if (outcome === "late" || outcome === "photo") {
      if (outcome === "photo") showBanner(`📸 ${t("duel.photo")}`, 1300);
      return;
    }
    setDuel(state);
    // Der Wurf fliegt sichtbar in die gewählte Tonne
    const spec: ThrowSpec = {
      id: ++ids.current,
      item: current,
      binIndex: aim.binIndex,
      hit: correct,
      perfect: false,
      glow: correct && state.players[p].streak >= DUEL_HOT,
      power: Math.min(Math.max(0.8 + -vy / 5000, 0.8), 1.3),
    };
    throws.current.set(spec.id, { player: p, hit: correct, bin: aim.binIndex, item: current });
    queueThrow(bus.current, spec);
    sfx("throw");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (outcome === "win") {
      token.current++;
      setItem(null);
      setPreview(bus.current, null);
      const pts = pointsFor(state.index);
      const top = layout.binTops[aim.binIndex];
      float(`+${pts}`, top.x, top.y, PLAYER[p].color);
      const streak = state.players[p].streak;
      if (streak === DUEL_HOT) later(() => showBanner(`🔥 ${t("duel.hot", { name: t(nameKey(p)) })}`, 1300), 450);
      advanceLater(NEXT_MS);
      return;
    }
    // Falsch: diese Seite ist für den Gegenstand raus
    float("✗", sideX(p), feedbackY, "#FFB4A8");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    if (outcome === "bothWrong") {
      token.current++;
      later(() => reveal(current), 350);
      advanceLater(NEXT_MS + 600);
    }
  };
  const throwRef = useRef(handleThrow);
  useLayoutEffect(() => {
    throwRef.current = handleThrow;
  });

  // Landung in der Szene: Tonne reagiert, Funken in Spielerfarbe
  useEffect(() => {
    const b = bus.current;
    setLandHandler(b, (id) => {
      const thrown = throws.current.get(id);
      if (!thrown) return;
      throws.current.delete(id);
      const { player, hit, bin, item: it } = thrown;
      queueBinEvent(b, bin, hit ? "hit" : "reject");
      if (hit) {
        // Landeklang je Material (Glas klirrt, Dose scheppert …) und Jubel
        sfxMaterial(itemMaterial(it));
        sfx("perfect");
        shake(fx.current, 0.02);
        queueBurst(b, {
          id: ++ids.current,
          x: layout.bins[bin].x,
          y: BIN_OPENING_Y + 0.15,
          z: layout.bins[bin].z + 0.1,
          colors: [PLAYER[player].color, "#FFFFFF", "#FFD54A"],
          count: 22,
          power: 1.1,
          ring: true,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      } else sfx("plop");
    });
    return () => setLandHandler(b, () => undefined);
  }, [layout]);

  const askExit = () => {
    if (phaseRef.current === "end" || phaseRef.current === "ready") {
      onExit();
      return;
    }
    Alert.alert(t("duel.quit.title"), t("duel.quit.message"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("duel.quit.confirm"), style: "destructive", onPress: onExit },
    ]);
  };

  /* eslint-disable react-hooks/refs */
  const gestures = useMemo(() => {
    const pan = (p: Player) =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(6)
        .onEnd((e) =>
          throwRef.current(
            p,
            e.absoluteX - e.translationX,
            e.absoluteY - e.translationY,
            e.translationX,
            e.translationY,
            e.velocityY,
          ),
        );
    const left = pan(0);
    const right = pan(1);
    // Beide dürfen gleichzeitig wischen (zwei Finger, zwei Hälften)
    left.simultaneousWithExternalGesture(right);
    right.simultaneousWithExternalGesture(left);
    return [left, right] as const;
  }, []);
  /* eslint-enable react-hooks/refs */

  const ready = screenW > 0 && screenH > 0;
  const itemTagTop = layout.item.screen.y + screenW * 0.15 + 4;
  const onFloatDone = useCallback((id: number) => setFloats((f) => f.filter((x) => x.id !== id)), []);
  const [a, b] = duel.players;
  const shownIndex = Math.min(duel.index + 1, DUEL_ITEMS);

  return (
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
          scene={scene}
          guide={false}
          warmItems={queue}
        />
      )}

      {/* Zwei Wisch-Hälften, je über die ganze Höhe */}
      <View style={styles.halves} pointerEvents={phase === "play" ? "auto" : "none"}>
        {([0, 1] as Player[]).map((p) => (
          <GestureDetector key={p} gesture={gestures[p]}>
            <View
              style={styles.half}
              accessible
              accessibilityLabel={t("duel.side", { name: t(nameKey(p)) })}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.sideBar,
                  { paddingBottom: insets.bottom + Spacing.sm, borderTopColor: PLAYER[p].color },
                  duel.out[p] && phase === "play" && styles.sideOut,
                ]}
              >
                <AppText variant="label" color="#FFFFFF" style={styles.center}>
                  {duel.out[p] && phase === "play" ? `✗ ${t("duel.out")}` : `👆 ${t(nameKey(p))}`}
                </AppText>
              </View>
            </View>
          </GestureDetector>
        ))}
        <View pointerEvents="none" style={[styles.divider, { bottom: insets.bottom }]} />
      </View>

      {floats.map((f) => (
        <FloatingText key={f.id} item={f} onDone={onFloatDone} />
      ))}

      {/* Oben: Punkte beider Spieler und das Tauziehen */}
      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + Spacing.sm }]}>
        <View pointerEvents="box-none" style={styles.topRow}>
          <IconButton icon="x" label={t("common.close")} onPress={askExit} />
          <ScoreChip p={0} points={a.points} hot={a.streak >= DUEL_HOT} label={t(nameKey(0))} calm={reduceMotion} />
          <AppText variant="label" color="#FFFFFF" style={styles.counter}>
            {phase === "play" || phase === "end" ? `${shownIndex}/${DUEL_ITEMS}` : "VS"}
          </AppText>
          <ScoreChip p={1} points={b.points} hot={b.streak >= DUEL_HOT} label={t(nameKey(1))} calm={reduceMotion} />
        </View>
        <Tug value={tugOf(duel)} calm={reduceMotion} />
      </View>

      {banner && (
        <View pointerEvents="none" style={[styles.bannerWrap, { top: insets.top + 120 }]}>
          <Banner key={banner.id} text={banner.text} />
        </View>
      )}

      {item && phase === "play" && (
        <View pointerEvents="none" style={[styles.overlayRow, { top: itemTagTop }]}>
          <ItemCard key={`${duel.index}-${item.name}`} item={item} showHint={false} />
          {isFinale(duel.index) && (
            <AppText variant="label" color="#FFD54A" style={styles.center}>
              {t("duel.double")}
            </AppText>
          )}
        </View>
      )}

      {phase === "ready" && (
        <View
          pointerEvents="box-none"
          style={[styles.cover, { paddingTop: insets.top + 90, paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <AppText variant="title" style={styles.center}>
              ⚡ {t("duel.title")}
            </AppText>
            <AppText variant="body" tone="textSecondary" style={styles.center}>
              {t("duel.rules")}
            </AppText>
            <View style={styles.rulesRow}>
              <RulePill p={0} text={t("duel.leftSide", { name: t(nameKey(0)) })} />
              <RulePill p={1} text={t("duel.rightSide", { name: t(nameKey(1)) })} />
            </View>
            <AppText variant="caption" tone="textMuted" style={styles.center}>
              {t("duel.rulesWrong")}
            </AppText>
            <Button title={t("duel.start")} icon="zap" size="lg" onPress={start} />
          </View>
        </View>
      )}

      {phase === "countdown" && (
        <View pointerEvents="none" style={styles.countWrap}>
          <Countdown key={count} n={count} calm={reduceMotion} />
        </View>
      )}

      {phase === "end" && (
        <DuelEnd duel={duel} queue={queue} onAgain={onAgain} onMenu={onExit} formatNumber={formatNumber} />
      )}
    </View>
  );
}

const nameKey = (p: Player) => (p === 0 ? "duel.p1" : "duel.p2");

export function ScoreChip({
  p,
  points,
  hot,
  label,
  calm,
}: {
  p: Player;
  points: number;
  hot: boolean;
  label: string;
  calm: boolean;
}) {
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!points || calm) return;
    pulse.setValue(1.25);
    Animated.spring(pulse, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  }, [points, pulse, calm]);
  return (
    <Animated.View
      accessible
      accessibilityLabel={`${label}: ${points}`}
      style={[styles.chip, { backgroundColor: PLAYER[p].color, transform: [{ scale: pulse }] }]}
    >
      <AppText variant="caption" color={PLAYER[p].on} numberOfLines={1}>
        {label}
        {hot ? " 🔥" : ""}
      </AppText>
      <AppText variant="title" color={PLAYER[p].on}>
        {points}
      </AppText>
    </Animated.View>
  );
}

/** Tauziehen-Balken: Mitte = Gleichstand; die Farbe des Führenden wächst. */
export function Tug({ value, calm }: { value: number; calm: boolean }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, {
      toValue: value,
      duration: calm ? 0 : 420,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: false,
    }).start();
  }, [value, v, calm]);
  const left = v.interpolate({ inputRange: [-1, 1], outputRange: ["100%", "0%"] });
  return (
    <View style={styles.tug} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: PLAYER[1].color }]} />
      <Animated.View style={[styles.tugLeft, { width: left, backgroundColor: PLAYER[0].color }]} />
      <View style={styles.tugMid} />
    </View>
  );
}

function RulePill({ p, text }: { p: Player; text: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: PLAYER[p].color }]}>
      <AppText variant="label" color={PLAYER[p].on} style={styles.center}>
        {text}
      </AppText>
    </View>
  );
}

export function Countdown({ n, calm }: { n: number; calm: boolean }) {
  const [s] = useState(() => new Animated.Value(calm ? 1 : 1.8));
  useEffect(() => {
    if (!calm) Animated.spring(s, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  }, [s, calm]);
  return (
    <Animated.View style={{ transform: [{ scale: s }] }}>
      <AppText variant="display" color="#FFFFFF" style={styles.countText}>
        {n}
      </AppText>
    </Animated.View>
  );
}

function DuelEnd({
  duel,
  queue,
  onAgain,
  onMenu,
  formatNumber,
}: {
  duel: DuelState;
  queue: Item[];
  onAgain: () => void;
  onMenu: () => void;
  formatNumber: (n: number) => string;
}) {
  const { t, itemName } = useI18n();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const winner = duelWinner(duel);
  const [a, b] = duel.players;
  const sec = (ms: number | null) => (ms === null ? "–" : `${formatNumber(Math.round(ms / 100) / 10)} s`);
  const best = fastestHit(duel);
  const bestItem = best ? queue.find((i) => i.name === best.item) : undefined;
  const learn = mistakesOf(duel)
    .map((name) => queue.find((i) => i.name === name))
    .filter((i): i is Item => !!i);
  const rows: [string, string, string][] = [
    [t("duel.row.points"), String(a.points), String(b.points)],
    [t("duel.row.correct"), String(a.correct), String(b.correct)],
    [t("duel.row.wrong"), String(a.wrong), String(b.wrong)],
    [t("duel.row.fastest"), sec(a.fastest), sec(b.fastest)],
    [t("duel.row.average"), sec(averageMs(a)), sec(averageMs(b))],
  ];
  useEffect(() => {
    const text = winner === null ? t("duel.draw") : t("duel.wins", { name: t(nameKey(winner)) });
    AccessibilityInfo.announceForAccessibility(`${text} ${a.points} : ${b.points}`);
  }, [winner, a.points, b.points, t]);

  return (
    <View style={[styles.endRoot, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.endContent,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <AppText variant="display" style={styles.center}>
          {winner === null ? "🤝" : "🏆"}
        </AppText>
        <AppText variant="title" style={styles.center}>
          {winner === null ? t("duel.draw") : t("duel.wins", { name: t(nameKey(winner)) })}
        </AppText>
        <View style={styles.bigScore}>
          <View style={[styles.scorePill, { backgroundColor: PLAYER[0].color }]}>
            <AppText variant="display" color={PLAYER[0].on} style={styles.scoreNum}>
              {a.points}
            </AppText>
          </View>
          <AppText variant="title" tone="textMuted">
            :
          </AppText>
          <View style={[styles.scorePill, { backgroundColor: PLAYER[1].color }]}>
            <AppText variant="display" color={PLAYER[1].on} style={styles.scoreNum}>
              {b.points}
            </AppText>
          </View>
        </View>

        {/* Tabelle: Spalte je Spieler */}
        <View style={[styles.table, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.tableRow}>
            <View style={styles.tableLabel} />
            {([0, 1] as Player[]).map((p) => (
              <View key={p} style={[styles.tableHead, { backgroundColor: PLAYER[p].color }]}>
                <AppText variant="label" color={PLAYER[p].on}>
                  {t(nameKey(p))}
                </AppText>
              </View>
            ))}
          </View>
          {rows.map(([label, l, r], i) => (
            <View
              key={label}
              style={[styles.tableRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              accessible
              accessibilityLabel={`${label}: ${t(nameKey(0))} ${l}, ${t(nameKey(1))} ${r}`}
            >
              <AppText variant="body" tone="textSecondary" style={styles.tableLabel}>
                {label}
              </AppText>
              <AppText variant="bodyStrong" style={styles.tableCell}>
                {l}
              </AppText>
              <AppText variant="bodyStrong" style={styles.tableCell}>
                {r}
              </AppText>
            </View>
          ))}
        </View>

        {best && best.winner !== null && bestItem && (
          <View style={[styles.highlight, { backgroundColor: colors.goldSoft }]}>
            <AppText variant="label" color={colors.onGoldSoft}>
              ⚡ {t("duel.highlight")}
            </AppText>
            <AppText variant="body" color={colors.onGoldSoft}>
              {t("duel.highlightText", {
                name: t(nameKey(best.winner)),
                item: `${bestItem.emoji} ${itemName(bestItem)}`,
                time: sec(best.ms),
              })}
            </AppText>
          </View>
        )}

        {learn.length > 0 && (
          <View style={[styles.learn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="label">{t("duel.learn")}</AppText>
            {learn.map((it) => {
              const bin = getBinByCategory(it.category);
              return (
                <View key={it.name} style={styles.learnRow}>
                  <AppText variant="body">{it.emoji}</AppText>
                  <AppText variant="body" style={styles.flex}>
                    {itemName(it)}
                  </AppText>
                  {bin && (
                    <View style={[styles.binTag, { backgroundColor: bin.colorLight }]}>
                      <AppText variant="caption" color="#1A1A1A">
                        {t(bin.labelKey)}
                      </AppText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Button title={t("duel.again")} icon="refresh-cw" size="lg" onPress={onAgain} />
        <Button title={t("duel.menu")} variant="secondary" onPress={onMenu} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: "center" },
  halves: { ...StyleSheet.absoluteFill, flexDirection: "row" },
  half: { flex: 1, justifyContent: "flex-end" },
  sideBar: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 4,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  sideOut: { backgroundColor: "rgba(0,0,0,0.55)" },
  divider: {
    position: "absolute",
    left: "50%",
    marginLeft: -1,
    width: 2,
    height: 150,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  top: { position: "absolute", top: 0, left: Spacing.md, right: Spacing.md, gap: Spacing.sm },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  counter: {
    minWidth: 44,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 4,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  tug: {
    height: 12,
    borderRadius: Radius.pill,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  tugLeft: { position: "absolute", left: 0, top: 0, bottom: 0 },
  tugMid: {
    position: "absolute",
    left: "50%",
    marginLeft: -1,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#FFFFFF",
  },
  bannerWrap: { position: "absolute", left: 0, right: 0 },
  overlayRow: { position: "absolute", left: Spacing.md, right: Spacing.md, alignItems: "center", gap: Spacing.xs },
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.md,
  },
  card: { borderRadius: Radius.xxl, padding: Spacing.lg, gap: Spacing.md },
  rulesRow: { flexDirection: "row", gap: Spacing.sm },
  pill: { flex: 1, borderRadius: Radius.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  countWrap: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 120, lineHeight: 132, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 12 },
  endRoot: { ...StyleSheet.absoluteFill },
  endContent: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  bigScore: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.md },
  scoreNum: { fontSize: 56, lineHeight: 64 },
  scorePill: { minWidth: 88, alignItems: "center", borderRadius: Radius.xl, paddingHorizontal: Spacing.md },
  table: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.sm },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, gap: Spacing.sm },
  tableLabel: { flex: 1.4 },
  tableHead: { flex: 1, alignItems: "center", borderRadius: Radius.sm, paddingVertical: Spacing.xs },
  tableCell: { flex: 1, textAlign: "center" },
  highlight: { borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.xs },
  learn: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, gap: Spacing.sm },
  learnRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  binTag: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
});
