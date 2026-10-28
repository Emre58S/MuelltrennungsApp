// Datei: app/(tabs)/index.tsx — Titelbild-Menü
//
// Die Spielwelt IST das Menü: Die drei Tonnen stehen für die drei Spielmodi.
// Ein Gegenstand schwebt davor – wirf ihn in eine Tonne (wischen wie im
// Spiel) oder tippe auf Tonne bzw. Schild, und der Modus startet mit einem
// echten Wurf samt Konfetti. Im Leerlauf lupfen die Tonnen nacheinander den
// Deckel und der Gegenstand wechselt – so lernt man die Geste schon hier.
// „Weiter“ wirft in die Tonne des zuletzt gespielten Modus.

import { Feather } from "@expo/vector-icons";
import { Canvas } from "@react-three/fiber/native";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useIsFocused } from "expo-router";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  PixelRatio,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createFx, shake } from "@/components/game/fx";
import { MenuScene } from "@/components/game/menu-scene";
import {
  type BusRef,
  createBus,
  queueBinEvent,
  queueBurst,
  queueThrow,
  resetBus,
  setAim,
  setBinSkin,
  setLandHandler,
  setPreview,
  useAim,
} from "@/components/game/scene-bus";
import { AppText } from "@/components/ui/app-text";
import { press, tapHaptic } from "@/components/ui/press";
import { Scrim } from "@/components/ui/scrim";
import { type Item } from "@/constants/items";
import {
  type GameMode,
  getLastMode,
  getModeConfig,
  MENU_MODES,
  startDaily,
  startGame,
} from "@/constants/modes";
import { Radius, Spacing } from "@/constants/theme";
import { ALL_BINS, type BinDef, getItemsForBins, light, STANDARD_BINS } from "@/game/bins";
import { HIGHSCORE_MODE } from "@/components/game/round-hooks";
import { aimFromDrag, drawFromBag } from "@/game/logic";
import { BIN_OPENING_Y, CAMERA_FOV, computeLayout, type ScreenRect } from "@/game/layout";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { refreshSfxSetting, sfx, sfxStreak } from "@/utils/sfx";
import { playMusic, refreshMusicSetting } from "@/utils/music";
import {
  type DailyResult,
  flushThrowRecords,
  getActiveStreak,
  getBoolean,
  getHighscoreKey,
  getLevelProgress,
  getBinSkin,
  getNumber,
  getRewardProgress,
  getTodayDaily,
  StorageKeys,
} from "@/utils/storage";
import { usableSkin } from "@/game/rewards";

type IconName = ComponentProps<typeof Feather>["name"];
type Scores = Record<GameMode, number>;

const ANTIALIAS = PixelRatio.get() < 3;
/** Leerlauf: so oft wechselt der Gegenstand bzw. lupft eine Tonne den Deckel. */
const ITEM_CYCLE_MS = 4200;
const PEEK_MS = 2300;
/** Nach dem Landen kurz das Konfetti zeigen, dann starten. */
const LAUNCH_DELAY_MS = 420;

// Text über der Szene: immer hell mit Schatten (Kontrast auf hellem & dunklem Himmel)
const ON_SCENE = "#FFFFFF";
const ON_SCENE_SOFT = "rgba(255,255,255,0.88)";
const TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.55)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
} as const;

/** Farbe pro Modus – Tonne, Schild und Flugbahn (nicht nur Farbe: Icon + Text).
 *  `sign`: etwas dunklere Schild-Farbe, damit die Schrift mindestens 4,5 : 1
 *  Kontrast hat – Tonne und Flugbahn bleiben hell und freundlich. */
const MODE_COLOR: Record<GameMode, { fill: string; sign: string; on: string }> = {
  endless: { fill: "#2FA86E", sign: "#258356", on: "#FFFFFF" },
  survival: { fill: "#3D82D9", sign: "#3775C3", on: "#FFFFFF" },
  time: { fill: "#E3A92E", sign: "#E3A92E", on: "#2B1D00" }, // dunkle Schrift: hell genug
  aim: { fill: "#D9622B", sign: "#BD5525", on: "#FFFFFF" },
};

/** Die Menü-Tonnen: echte Tonnen-Modelle in Modus-Farben, Reihenfolge wie MENU_MODES. */
const MENU_BINS: BinDef[] = MENU_MODES.map((m, i) => {
  const base = ALL_BINS[i + 1] ?? ALL_BINS[0];
  const c = MODE_COLOR[m.mode];
  return { ...base, color: c.fill, colorLight: light(c.fill, 0.3), onColor: c.on };
});

const MENU_POOL: Item[] = getItemsForBins(STANDARD_BINS);

/** Breite des schwebenden Gegenstands im Menü (Anteil der Bildschirmbreite). */
const MENU_ITEM_WIDTH = 0.22;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const { colors, scheme } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  const { t, formatNumber } = useI18n();
  // Nur zeichnen, wenn sichtbar – sonst liefen Menü- und Spiel-3D gleichzeitig.
  const focused = useIsFocused();

  const [scores, setScores] = useState<Scores>({ endless: 0, survival: 0, time: 0, aim: 0 });
  const [lastMode, setLastMode] = useState<GameMode>("endless");
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [daily, setDaily] = useState<DailyResult | null>(null);
  const [seenTutorial, setSeenTutorial] = useState(true);

  const fx = useRef(createFx());
  const bus = useRef(createBus());
  useEffect(() => {
    fx.current.calm = reduceMotion;
  }, [reduceMotion]);

  // Kleine Handys (z. B. iPhone SE): alles etwas enger
  const compact = height < 740;
  /** Oberkante des unteren Menüs (gemessen) – der Gegenstand schwebt darüber. */
  const [menuTop, setMenuTop] = useState(0);
  const layout = useMemo(() => {
    const options = { binsNdcY: compact ? 0.46 : 0.4, itemNdcY: compact ? -0.14 : -0.28, itemWidth: MENU_ITEM_WIDTH };
    const base = computeLayout(width, height, MENU_BINS.length, options);
    if (menuTop <= 0) return base;
    // Zwischen Schildern und Menü: knapp über dem Menü, aber nie in die Schilder
    const half = (width * MENU_ITEM_WIDTH) / 2;
    const signBottom = Math.max(...base.binRects.map((r) => r.y + r.h)) + 4 + (compact ? 56 : 72) + 6 +
      // Große Systemschrift: Titel (und Rekord) werden höher
      (Math.min(fontScale, 1.6) - 1) * (compact ? 17 : 31);
    const y = Math.max(signBottom + half, menuTop - half - 10);
    return computeLayout(width, height, MENU_BINS.length, { ...options, itemNdcY: 1 - (2 * y) / height });
  }, [width, height, fontScale, compact, menuTop]);

  /* ── Schwebender Gegenstand (die Szene liest ihn aus dem Bus) ── */
  const [bag] = useState(() => ({ current: [] as Item[] }));
  const [firstItem] = useState(() => drawFromBag(bag, MENU_POOL));
  // Vorlagen bauen: das erste Item zuerst, dann der Rest
  const [warmItems] = useState(() => (firstItem ? [firstItem, ...MENU_POOL] : MENU_POOL));
  const itemRef = useRef(firstItem);
  useLayoutEffect(() => {
    setPreview(bus.current, itemRef.current);
  }, []);
  const advanceItem = useCallback(() => {
    const upcoming = drawFromBag(bag, MENU_POOL, itemRef.current?.name);
    itemRef.current = upcoming;
    setPreview(bus.current, upcoming);
  }, [bag]);

  /* ── Start per Wurf ─────────────────────────────────────────── */
  const starting = useRef(false);
  const pendingMode = useRef<GameMode | null>(null);
  const throwId = useRef(0);
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

  const go = useCallback((mode: GameMode) => {
    if (pendingMode.current !== mode) return;
    pendingMode.current = null;
    startGame(mode);
  }, []);

  const launch = useCallback(
    (mode: GameMode) => {
      if (starting.current) return;
      starting.current = true;
      pendingMode.current = mode;
      setAim(bus.current, null);
      // Modi ohne Menü-Tonne (Zielwurf) starten direkt
      const binIndex = MENU_MODES.findIndex((m) => m.mode === mode);
      const current = itemRef.current;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

      if (!current || reduceMotion || binIndex < 0) {
        sfx("tap");
        go(mode);
        return;
      }
      sfx("throw");
      queueThrow(bus.current, {
        id: ++throwId.current,
        item: current,
        binIndex,
        hit: true,
        perfect: false,
        glow: true,
      });
      advanceItem();
      // Sicherheitsnetz, falls die Szene den Wurf nicht abspielt
      later(() => go(mode), 1400);
    },
    [advanceItem, go, later, reduceMotion],
  );

  // Landung: Konfetti, Ton – dann starten
  const onLand = useRef((_id: number) => {});
  useLayoutEffect(() => {
    onLand.current = () => {
      const mode = pendingMode.current;
      if (!mode) return;
      const i = MENU_MODES.findIndex((m) => m.mode === mode);
      const bin = MENU_BINS[i];
      queueBinEvent(bus.current, i, "perfect");
      queueBurst(bus.current, {
        id: throwId.current,
        x: layout.bins[i].x,
        y: BIN_OPENING_Y + 0.15,
        z: layout.bins[i].z + 0.1,
        colors: [bin.color, bin.colorLight, "#FFFFFF", "#FFD54A"],
        count: 26,
        power: 1.15,
        ring: true,
      });
      shake(fx.current, 0.03);
      sfx("land");
      sfxStreak(3);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      later(() => go(mode), LAUNCH_DELAY_MS);
    };
  });

  /* ── Beim Zurückkommen: frisch starten + Fortschritt laden ───── */
  useFocusEffect(
    useCallback(() => {
      let active = true;
      starting.current = false;
      pendingMode.current = null;
      resetBus(bus.current);
      setLandHandler(bus.current, (id) => onLand.current(id));
      refreshSfxSetting();
      // Gewählter Tonnen-Sticker auch auf den Menü-Tonnen (sofort sichtbar nach der Auswahl)
      Promise.all([getBinSkin(), getRewardProgress()])
        .then(([skin, progress]) => {
          if (active) setBinSkin(bus.current, usableSkin(skin, progress));
        })
        .catch(() => undefined);
      // Ruhige Menü-Musik (blendet sanft von der Runde herüber)
      refreshMusicSetting().then(() => playMusic("menu"));

      // Erst gesammelte Würfe der letzten Runde schreiben, dann lesen
      flushThrowRecords()
        .then(() =>
          Promise.all([
            getNumber(getHighscoreKey(HIGHSCORE_MODE.endless)),
            getNumber(getHighscoreKey(HIGHSCORE_MODE.survival)),
            getNumber(getHighscoreKey(HIGHSCORE_MODE.time)),
            getNumber(getHighscoreKey(HIGHSCORE_MODE.aim)),
            getActiveStreak(),
            getNumber(StorageKeys.TOTAL_XP),
            getLastMode(),
            getTodayDaily(),
            getBoolean(StorageKeys.HAS_SEEN_TUTORIAL, false),
          ]),
        )
        .then(([endless, survival, time, aim, activeStreak, xp, mode, today, seen]) => {
          if (!active) return;
          setSeenTutorial(seen);
          setDaily(today);
          setScores({ endless, survival, time, aim });
          setStreak(activeStreak);
          setTotalXP(xp);
          setLastMode(mode);
        })
        .catch((error) => console.warn("[Home] Fortschritt konnte nicht geladen werden:", error))
        .finally(() => active && setLoaded(true));

      return () => {
        active = false;
      };
    }, []),
  );

  /* ── Leerlauf: Gegenstand wechseln, Tonnen laden zum Werfen ein ─ */
  useEffect(() => {
    if (!focused || reduceMotion) return;
    let peek = 0;
    const idle = () => !starting.current && bus.current.aim === null;
    const cycle = setInterval(() => {
      if (idle()) advanceItem();
    }, ITEM_CYCLE_MS);
    const peeker = setInterval(() => {
      if (!idle()) return;
      queueBinEvent(bus.current, peek % MENU_BINS.length, "peek");
      peek += 1;
    }, PEEK_MS);
    return () => {
      clearInterval(cycle);
      clearInterval(peeker);
    };
  }, [focused, reduceMotion, advanceItem]);

  /* ── Geste: wie im Spiel zur Tonne wischen ──────────────────── */
  const handlers = useRef({
    aim: (_dx: number, _dy: number) => {},
    release: (_dx: number, _dy: number) => {},
  });
  useLayoutEffect(() => {
    handlers.current = {
      aim: (dx, dy) => {
        if (starting.current) return;
        const idx = aimFromDrag(dx, dy, layout.binAngles)?.binIndex ?? null;
        if (idx === bus.current.aim) return;
        setAim(bus.current, idx);
        if (idx !== null) {
          sfx("aim");
          Haptics.selectionAsync().catch(() => undefined);
        }
      },
      release: (dx, dy) => {
        const aim = aimFromDrag(dx, dy, layout.binAngles);
        setAim(bus.current, null);
        if (aim) launch(MENU_MODES[aim.binIndex].mode);
      },
    };
  });
  const onAim = useCallback((dx: number, dy: number) => handlers.current.aim(dx, dy), []);
  const onRelease = useCallback((dx: number, dy: number) => handlers.current.release(dx, dy), []);
  const onCancel = useCallback(() => setAim(bus.current, null), []);
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(6)
        .onUpdate((e) => onAim(e.translationX, e.translationY))
        .onEnd((e) => onRelease(e.translationX, e.translationY))
        .onFinalize(onCancel),
    [onAim, onRelease, onCancel],
  );
  /* eslint-enable react-hooks/refs */

  const { level, progress } = getLevelProgress(totalXP);
  const lastTitle = t(getModeConfig(lastMode).titleKey);
  const firstRect = layout.binRects[0];
  // Wisch-Fläche: von den Tonnen bis unter den Gegenstand
  const swipeTop = Math.max((firstRect?.y ?? 0) - 20, insets.top + 90);
  const swipeBottom = layout.item.screen.y + 90;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {focused && (
        <Canvas
          style={{ position: "absolute", left: 0, top: 0, width, height }}
          shadows={false}
          camera={{ fov: CAMERA_FOV, near: 0.1, far: 80 }}
          gl={{ antialias: ANTIALIAS }}
        >
          <MenuScene
            layout={layout}
            bins={MENU_BINS}
            scheme={scheme}
            calm={reduceMotion}
            fx={fx}
            bus={bus}
            warmItems={warmItems}
          />
        </Canvas>
      )}

      <Scrim edge="top" height={insets.top + 150} maxOpacity={0.42} />
      <Scrim edge="bottom" height={300 + insets.bottom} maxOpacity={0.8} />

      {/* Wisch-Fläche hinter den Schildern */}
      <GestureDetector gesture={gesture}>
        <View
          style={[styles.swipeArea, { top: swipeTop, height: swipeBottom - swipeTop }]}
          accessible={false}
        />
      </GestureDetector>

      {/* Kopf: Logo links, Fortschritt rechts */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="box-none">
        <Logo
          top={t("home.titleTop")}
          bottom={t("home.titleBottom")}
          badgeColor={colors.primary}
          calm={reduceMotion}
        />

        <View
          style={styles.levelChip}
          accessible
          accessibilityLabel={`${t("common.level")} ${level}, ${streak} ${t("home.daysInRow")}`}
        >
          <View style={styles.levelRow}>
            <AppText variant="label" color={ON_SCENE}>
              Lv {loaded ? level : "—"}
            </AppText>
            {streak > 0 && (
              <AppText variant="caption" color={ON_SCENE_SOFT}>
                🔥 {streak}
              </AppText>
            )}
          </View>
          <View style={styles.levelTrack}>
            <View
              style={[
                styles.levelFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Die Tonnen = die Modi: Tipp-Fläche über jeder Tonne + Schild darunter */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityRole="menu" accessibilityLabel={t("home.modesLabel")}>
        {MENU_MODES.map((m, i) => (
          <ModeBin
            key={m.mode}
            rect={layout.binRects[i]}
            bus={bus}
            index={i}
            color={MODE_COLOR[m.mode]}
            icon={m.icon}
            title={t(m.titleKey)}
            description={t(m.descKey)}
            record={loaded && scores[m.mode] > 0 ? formatNumber(scores[m.mode]) : null}
            recordLabel={t("home.record")}
            last={loaded && m.mode === lastMode}
            compact={compact}
            startLabel={t("home.startMode", { mode: t(m.titleKey) })}
            onPress={() => launch(m.mode)}
          />
        ))}
      </View>

      {/* Unten im Daumenbereich: Hinweis, Weiter, weitere Spielarten, Nebenseiten */}
      <View
        style={[styles.menu, { paddingBottom: Math.max(insets.bottom - 8, Spacing.sm) }]}
        pointerEvents="box-none"
        onLayout={(e) => setMenuTop(Math.round(e.nativeEvent.layout.y))}
      >
        {!compact && <ThrowHint text={t("home.throwHint")} calm={reduceMotion} />}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t("home.continue")}: ${lastTitle}`}
          onPress={() => launch(lastMode)}
          style={({ pressed }) => [
            styles.continue,
            { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
            pressed && press.pressedLarge,
          ]}
        >
          <View style={styles.continueIcon}>
            <Feather name="play" size={22} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <AppText variant="heading" tone="onPrimary">
              {t("home.continue")}
            </AppText>
            <AppText variant="caption" tone="onPrimary">
              {lastTitle}
              {loaded && scores[lastMode] > 0 ? `  ·  🏆 ${formatNumber(scores[lastMode])}` : ""}
            </AppText>
          </View>
          <Feather name="chevron-right" size={24} color={colors.onPrimary} />
        </Pressable>

        {/* Weitere Spielarten als eine ruhige Reihe kleiner Kacheln */}
        <View style={styles.tiles}>
          <SideTile
            icon={daily ? "check" : "calendar"}
            fill="#FFD54A"
            on="#3A2500"
            dot={loaded && !daily}
            title={t("home.daily")}
            caption={
              daily
                ? daily.score < 10000
                  ? t("home.dailyDoneShort", { correct: daily.correct, total: daily.total, score: daily.score })
                  : t("home.dailyDoneTiny", { correct: daily.correct, total: daily.total })
                : t("home.dailyShort")
            }
            a11y={`${t("home.daily")}. ${
              daily
                ? t("home.dailyDone", { correct: daily.correct, total: daily.total, score: daily.score })
                : t("home.dailyNew")
            }`}
            onPress={() => {
              if (starting.current) return;
              starting.current = true;
              sfx("tap");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              startDaily();
            }}
          />
          <SideTile
            icon="award"
            fill="#7C5CD6"
            on="#FFFFFF"
            title={t("home.tricks")}
            caption={t("home.tricksShort")}
            a11y={`${t("home.tricks")}. ${t("home.tricksDesc")}`}
            onPress={() => {
              if (starting.current) return;
              sfx("tap");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              router.push("/tricks");
            }}
          />
          <SideTile
            icon="crosshair"
            fill={MODE_COLOR.aim.sign}
            on={MODE_COLOR.aim.on}
            title={t("mode.aim.title")}
            caption={loaded && scores.aim > 0 ? `🏆 ${formatNumber(scores.aim)}` : t("home.aimShort")}
            a11y={`${t("mode.aim.title")}. ${t("mode.aim.desc")}`}
            onPress={() => launch("aim")}
          />
        </View>

        <View style={styles.footer}>
          <FooterLink icon="book-open" label={t("home.book")} onPress={() => router.push("/sammelbuch")} />
          <FooterLink icon="award" label={t("home.rank")} onPress={() => router.push("/rangliste")} />
          <FooterLink icon="gift" label={t("home.rewards")} onPress={() => router.push("/belohnungen")} />
          {/* Selten gebraucht: klein und abgesetzt */}
          <View style={styles.divider} />
          <View style={styles.tools}>
            <ToolButton icon="help-circle" label={t("home.tutorial")} dot={loaded && !seenTutorial} onPress={() => router.push("/tutorial")} />
            <ToolButton icon="settings" label={t("home.settings")} onPress={() => router.push("/einstellung")} />
          </View>
        </View>
      </View>
    </View>
  );
}

/* ── Bausteine ─────────────────────────────────────────────── */

/** Tipp-Fläche über einer Menü-Tonne + Schild mit Modus, Beschreibung, Rekord. */
function ModeBin({
  rect,
  bus,
  index,
  color,
  icon,
  title,
  description,
  record,
  recordLabel,
  last,
  compact,
  startLabel,
  onPress,
}: {
  rect: ScreenRect | undefined;
  bus: BusRef;
  index: number;
  color: { fill: string; sign: string; on: string };
  icon: IconName;
  title: string;
  description: string;
  record: string | null;
  recordLabel: string;
  last: boolean;
  compact: boolean;
  startLabel: string;
  onPress: () => void;
}) {
  const aimed = useAim(bus) === index;
  if (!rect) return null;
  const width = Math.max(rect.w + 6, 96);
  const left = rect.x + rect.w / 2 - width / 2;

  return (
    <>
      {/* Unsichtbare Tipp-Fläche über der 3D-Tonne */}
      <Pressable
        accessible={false}
        onPress={onPress}
        style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${startLabel}. ${description}${record ? `. ${recordLabel} ${record}` : ""}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.modeSign,
          {
            left,
            top: rect.y + rect.h + 4,
            width,
            backgroundColor: color.sign,
            transform: [{ scale: aimed ? 1.1 : pressed ? 0.96 : 1 }, { translateY: aimed ? -4 : 0 }],
          },
          aimed && [styles.modeSignAimed, { shadowColor: color.fill }],
        ]}
      >
        {last && (
          <View style={styles.lastBadge}>
            <Feather name="rotate-ccw" size={10} color="#1B2420" />
          </View>
        )}
        <View style={styles.modeIcon}>
          <Feather name={icon} size={13} color={color.sign} />
        </View>
        <AppText
          variant="label"
          color={color.on}
          center
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={styles.modeTitle}
        >
          {title}
        </AppText>
        {!compact && (
          <AppText variant="caption" color={color.on} center style={styles.modeRecord}>
            {record ? `🏆 ${record}` : " "}
          </AppText>
        )}
      </Pressable>
    </>
  );
}

/** „Wirf in eine Tonne …“ mit sanft hüpfendem Pfeil. */
function ThrowHint({ text, calm }: { text: string; calm: boolean }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, calm]);

  return (
    <View style={styles.hint} pointerEvents="none">
      <Animated.View
        style={{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }}
      >
        <Feather name="arrow-up" size={16} color={ON_SCENE} />
      </Animated.View>
      <AppText variant="label" color={ON_SCENE} style={TEXT_SHADOW}>
        {text}
      </AppText>
    </View>
  );
}

/** Farben der Mülltonnen für den Streifen unter dem Schriftzug. */
const LOGO_STRIPE = ALL_BINS;
/** Der Auftritt läuft nur einmal pro App-Start, nicht bei jeder Rückkehr. */
let logoShown = false;

/** Schriftzug „Müll Sortieren“: Abzeichen ploppt auf, Wörter gleiten herein,
 *  darunter ein Streifen in den Tonnenfarben. Bei „Weniger Bewegung“ ruhig. */
function Logo({
  top,
  bottom,
  badgeColor,
  calm,
}: {
  top: string;
  bottom: string;
  badgeColor: string;
  calm: boolean;
}) {
  const [still] = useState(() => calm || logoShown);
  const [badge] = useState(() => new Animated.Value(still ? 1 : 0));
  const [word1] = useState(() => new Animated.Value(still ? 1 : 0));
  const [word2] = useState(() => new Animated.Value(still ? 1 : 0));
  const [stripe] = useState(() => new Animated.Value(still ? 1 : 0));
  useEffect(() => {
    logoShown = true;
    if (still) return;
    const ease = Easing.out(Easing.cubic);
    // Kurz warten, bis der Startbildschirm sicher weg ist
    const anim = Animated.sequence([Animated.delay(150), Animated.parallel([
      Animated.spring(badge, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(word1, { toValue: 1, duration: 360, delay: 120, easing: ease, useNativeDriver: true }),
      Animated.timing(word2, { toValue: 1, duration: 380, delay: 220, easing: ease, useNativeDriver: true }),
      Animated.timing(stripe, { toValue: 1, duration: 420, delay: 420, easing: ease, useNativeDriver: true }),
    ])]);
    anim.start();
    return () => anim.stop();
  }, [still, badge, word1, word2, stripe]);

  const slide = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
  });

  return (
    <View style={styles.logo} accessible accessibilityRole="header" accessibilityLabel={`${top} ${bottom}`}>
      <Animated.View
        style={[
          styles.logoBadge,
          {
            backgroundColor: badgeColor,
            opacity: badge.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [
              { scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
              { rotate: badge.interpolate({ inputRange: [0, 1], outputRange: ["-25deg", "0deg"] }) },
            ],
          },
        ]}
      >
        <AppText style={styles.logoIcon}>♻️</AppText>
      </Animated.View>
      <View>
        <Animated.View style={slide(word1)}>
          <AppText variant="title" color={ON_SCENE} style={[styles.logoTop, TEXT_SHADOW]}>
            {top.toUpperCase()}
          </AppText>
        </Animated.View>
        <Animated.View style={slide(word2)}>
          <AppText variant="display" color={ON_SCENE} style={[styles.logoBottom, TEXT_SHADOW]}>
            {bottom.toUpperCase()}
          </AppText>
        </Animated.View>
        {/* Liegt über dem Rand (absolut) – nimmt keinen Platz weg */}
        <Animated.View
          style={[
            styles.logoStripe,
            { opacity: stripe, transform: [{ scaleX: stripe }] },
          ]}
        >
          {LOGO_STRIPE.map((b) => (
            <View key={b.key} style={[styles.logoStripePart, { backgroundColor: b.color }]} />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

/** Kleine Kachel für weitere Spielarten (Symbol, Name, kurze Zeile). */
function SideTile({
  icon,
  fill,
  on,
  dot,
  title,
  caption,
  a11y,
  onPress,
}: {
  icon: IconName;
  fill: string;
  on: string;
  dot?: boolean;
  title: string;
  caption: string;
  a11y: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, dot && styles.tileNew, pressed && press.pressed]}
    >
      <View style={[styles.tileIcon, { backgroundColor: fill }]}>
        <Feather name={icon} size={18} color={on} />
        {dot && <View style={styles.tileDot} />}
      </View>
      <AppText variant="label" color={ON_SCENE} center numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {title}
      </AppText>
      <AppText variant="caption" color={ON_SCENE_SOFT} center numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {caption}
      </AppText>
    </Pressable>
  );
}

/** Kleiner runder Knopf ohne Beschriftung (Anleitung, Einstellungen). */
function ToolButton({
  icon,
  label,
  dot,
  onPress,
}: {
  icon: IconName;
  label: string;
  dot?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        sfx("tap");
        tapHaptic();
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => [styles.tool, pressed && press.pressed]}
    >
      <Feather name={icon} size={18} color="#FFFFFF" />
      {dot && <View style={[styles.tileDot, styles.toolDot]} />}
    </Pressable>
  );
}

/** Runder Symbol-Knopf mit kurzer Beschriftung darunter (Fußzeile). */
function FooterLink({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        sfx("tap");
        tapHaptic();
        onPress();
      }}
      hitSlop={4}
      style={({ pressed }) => [styles.footerLink, pressed && press.pressed]}
    >
      <View style={styles.footerIcon}>
        <Feather name={icon} size={20} color="#FFFFFF" />
      </View>
      <AppText
        variant="caption"
        color={ON_SCENE_SOFT}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={styles.footerLabel}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.22,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 5,
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  swipeArea: { position: "absolute", left: 0, right: 0 },

  header: {
    position: "absolute",
    top: 0,
    left: Spacing.md + 4,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  logo: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    ...shadow,
  },
  logoIcon: { fontSize: 28, lineHeight: 34 },
  logoTop: { fontSize: 22, lineHeight: 24, letterSpacing: 3 },
  logoBottom: { fontSize: 34, lineHeight: 38, letterSpacing: 0.5 },
  logoStripe: {
    position: "absolute",
    left: 2,
    right: 2,
    bottom: -3,
    height: 4,
    flexDirection: "row",
    gap: 3,
    transformOrigin: "left",
  },
  logoStripePart: {
    flex: 1,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.6)",
  },

  // Punkt auf dem runden Knopf etwas nach innen, damit er am Kreis sitzt
  toolDot: { top: 1, right: 1 },
  tools: { flexDirection: "row", gap: Spacing.sm, paddingTop: 3 },
  divider: { width: 1, height: 40, marginTop: 3, marginHorizontal: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  tool: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.32)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  levelChip: {
    alignItems: "stretch",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(0,0,0,0.32)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  levelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  levelTrack: {
    width: 72,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  levelFill: { height: "100%", borderRadius: 3 },

  modeSign: {
    position: "absolute",
    alignItems: "center",
    gap: 2,
    paddingTop: 5,
    paddingBottom: 5,
    paddingHorizontal: 5,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.75)",
    ...shadow,
  },
  modeSignAimed: {
    borderColor: "#FFFFFF",
    borderWidth: 3,
    shadowOpacity: 0.95,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  modeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  modeTitle: { fontSize: 14, lineHeight: 17 },
  modeRecord: { fontSize: 11, lineHeight: 14, opacity: 0.92 },
  lastBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD54A",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  menu: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    bottom: 0,
    gap: Spacing.sm,
  },
  // Drei gleich breite Kacheln nebeneinander
  tiles: { flexDirection: "row", gap: Spacing.sm },
  tile: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(0,0,0,0.34)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  // Tagesaufgabe noch offen: dezent goldener Rand
  tileNew: { borderColor: "rgba(255,213,74,0.75)" },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tileDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#FF4D4D",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  continue: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 64,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    ...shadow,
  },
  continueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  // Eine Reihe gleich breiter Symbol-Knöpfe (passt auch auf kleine Handys)
  footer: { flexDirection: "row", justifyContent: "space-between", gap: 2 },
  footerLink: { flex: 1, alignItems: "center", gap: 4, minHeight: 64 },
  footerIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  footerLabel: { textAlign: "center", fontSize: 12 },

});
