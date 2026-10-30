// Datei: app/(tabs)/index.tsx — Titelbild-Menü
//
// Die Spielwelt IST das Menü: Die drei Tonnen sind die drei Bereiche –
// Kampagne (allein), Online (gegen andere), Sammlung. Der Name steht direkt
// auf der Tonne. Ein Gegenstand schwebt davor – wirf ihn in eine Tonne
// (wischen wie im Spiel) oder tippe auf die Tonne, und der Bereich öffnet
// sich nach einem echten Wurf samt Konfetti. Im Leerlauf lupfen die Tonnen
// nacheinander den Deckel und der Gegenstand wechselt – so lernt man die
// Geste schon hier.

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
import { Radius, Spacing } from "@/constants/theme";
import { ALL_BINS, type BinDef, getItemsForBins, light, STANDARD_BINS } from "@/game/bins";
import { aimFromDrag, drawFromBag } from "@/game/logic";
import { type TranslationKey } from "@/i18n";
import { BIN_OPENING_Y, CAMERA_FOV, computeLayout, type ScreenRect } from "@/game/layout";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { refreshSfxSetting, sfx, sfxStreak } from "@/utils/sfx";
import { playMusic, refreshMusicSetting } from "@/utils/music";
import type { FlameStatus } from "@/utils/streak";
import {
  flushThrowRecords,
  getFlame,
  getBoolean,
  getLevelProgress,
  getBinSkin,
  getNumber,
  getRewardProgress,
  getTodayDaily,
  StorageKeys,
  todayKey,
} from "@/utils/storage";
import { type DayGhost, fetchDayGhost } from "@/utils/leaderboard";
import { homeHint } from "@/game/home-hint";
import { usableSkin } from "@/game/rewards";

type IconName = ComponentProps<typeof Feather>["name"];

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

type Hub = {
  route: "/kampagne" | "/online" | "/sammlung";
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: IconName;
  /** Tonne und Flugbahn. */
  fill: string;
  /** Schrift auf dem Tonnen-Schild (mind. 4,5 : 1 auf Weiß). */
  sign: string;
  on: string;
};

/** Die drei Bereiche – je eine Tonne (nicht nur Farbe: Symbol + Name). */
const HUBS: Hub[] = [
  { route: "/kampagne", titleKey: "hub.campaign.title", descKey: "hub.campaign.bin", icon: "map", fill: "#2FA86E", sign: "#1E7A4C", on: "#FFFFFF" },
  { route: "/online", titleKey: "hub.online.title", descKey: "hub.online.bin", icon: "globe", fill: "#3D82D9", sign: "#245E9E", on: "#FFFFFF" },
  { route: "/sammlung", titleKey: "hub.collection.title", descKey: "hub.collection.bin", icon: "book-open", fill: "#E3A92E", sign: "#7A5600", on: "#2B1D00" },
];

/** Die Menü-Tonnen: echte Tonnen-Modelle in Bereichs-Farben, Reihenfolge wie HUBS. */
const MENU_BINS: BinDef[] = HUBS.map((h, i) => {
  const base = ALL_BINS[i + 1] ?? ALL_BINS[0];
  return { ...base, color: h.fill, colorLight: light(h.fill, 0.3), onColor: h.on };
});

const MENU_POOL: Item[] = getItemsForBins(STANDARD_BINS);

/** Breite des schwebenden Gegenstands im Menü (Anteil der Bildschirmbreite). */
const MENU_ITEM_WIDTH = 0.22;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { colors, scheme } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  const { t } = useI18n();
  // Nur zeichnen, wenn sichtbar – sonst liefen Menü- und Spiel-3D gleichzeitig.
  const focused = useIsFocused();

  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flame, setFlame] = useState<FlameStatus>("none");
  const [loaded, setLoaded] = useState(false);
  /** Tagesaufgabe heute schon gespielt? Sonst Punkt an der Kampagnen-Tonne. */
  const [dailyDone, setDailyDone] = useState(true);
  const [seenTutorial, setSeenTutorial] = useState(true);
  /** Tagesbester im Ghost-Rennen (Server) – für den einen Hinweis unten. */
  const [dayBest, setDayBest] = useState<DayGhost | null>(null);

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
    const binBottom = Math.max(...base.binRects.map((r) => r.y + r.h)) + 16;
    const y = Math.max(binBottom + half, menuTop - half - 10);
    return computeLayout(width, height, MENU_BINS.length, { ...options, itemNdcY: 1 - (2 * y) / height });
  }, [width, height, compact, menuTop]);

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
  const pendingHub = useRef<number | null>(null);
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

  const go = useCallback((hub: number) => {
    if (pendingHub.current !== hub) return;
    pendingHub.current = null;
    router.push(HUBS[hub].route);
  }, []);

  const launch = useCallback(
    (hub: number) => {
      if (starting.current) return;
      starting.current = true;
      pendingHub.current = hub;
      setAim(bus.current, null);
      const current = itemRef.current;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

      if (!current || reduceMotion) {
        sfx("tap");
        go(hub);
        return;
      }
      sfx("throw");
      queueThrow(bus.current, {
        id: ++throwId.current,
        item: current,
        binIndex: hub,
        hit: true,
        perfect: false,
        glow: true,
      });
      advanceItem();
      // Sicherheitsnetz, falls die Szene den Wurf nicht abspielt
      later(() => go(hub), 1400);
    },
    [advanceItem, go, later, reduceMotion],
  );

  // Landung: Konfetti, Ton – dann öffnen
  const onLand = useRef((_id: number) => {});
  useLayoutEffect(() => {
    onLand.current = () => {
      const i = pendingHub.current;
      if (i === null) return;
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
      later(() => go(i), LAUNCH_DELAY_MS);
    };
  });

  /* ── Beim Zurückkommen: frisch starten + Fortschritt laden ───── */
  useFocusEffect(
    useCallback(() => {
      let active = true;
      starting.current = false;
      pendingHub.current = null;
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
            getFlame(),
            getNumber(StorageKeys.TOTAL_XP),
            getTodayDaily(),
            getBoolean(StorageKeys.HAS_SEEN_TUTORIAL, false),
          ]),
        )
        .then(([flameNow, xp, today, seen]) => {
          if (!active) return;
          setSeenTutorial(seen);
          setDailyDone(today !== null);
          setStreak(flameNow.count);
          setFlame(flameNow.status);
          setTotalXP(xp);
        })
        .catch((error) => console.warn("[Home] Fortschritt konnte nicht geladen werden:", error))
        .finally(() => active && setLoaded(true));
      // Tagesbester (still, falls offline oder nicht eingerichtet)
      fetchDayGhost(todayKey())
        .then((best) => active && setDayBest(best))
        .catch(() => undefined);

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
        if (aim) launch(aim.binIndex);
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
  const hint = homeHint({ totalXP, flame, dailyDone, dayBest });
  const hintText = hint.key === "home.hintDayBest" ? t(hint.key, { name: hint.name }) : t(hint.key);
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
      <Scrim edge="bottom" height={200 + insets.bottom} maxOpacity={0.7} />

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
          accessibilityLabel={`${t("common.level")} ${level}, ${streak} ${t("home.daysInRow")}${flame === "atRisk" ? `. ${t("home.flameAtRisk")}` : ""}`}
        >
          <View style={styles.levelRow}>
            <AppText variant="label" color={ON_SCENE}>
              Lv {loaded ? level : "—"}
            </AppText>
            {streak > 0 && (
              <AppText variant="caption" color={ON_SCENE_SOFT}>
                {/* ⏳ = gestern Pause, heute spielen rettet die Flamme (auch auf kleinen Handys ohne Hinweiszeile) */}
                🔥 {streak}{flame === "atRisk" ? " ⏳" : ""}
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

      {/* Die Tonnen = die Bereiche: Tipp-Fläche über jeder Tonne, Name auf der Tonne */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityRole="menu" accessibilityLabel={t("home.modesLabel")}>
        {HUBS.map((h, i) => (
          <HubBin
            key={h.route}
            rect={layout.binRects[i]}
            bus={bus}
            index={i}
            hub={h}
            title={t(h.titleKey)}
            a11y={`${t("hub.open", { name: t(h.titleKey) })}. ${t(h.descKey)}`}
            dot={loaded && i === 0 && !dailyDone}
            compact={compact}
            onPress={() => launch(i)}
          />
        ))}
      </View>

      {/* Unten im Daumenbereich: Hinweis (Flamme) und die zwei selten gebrauchten Knöpfe */}
      <View
        style={[styles.menu, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
        pointerEvents="box-none"
        onLayout={(e) => setMenuTop(Math.round(e.nativeEvent.layout.y))}
      >
        {/* Ein einziger Hinweis mit Vorrang-Regel (game/home-hint.ts) */}
        <ThrowHint text={hintText} calm={reduceMotion} arrow={hint.arrow} />
        <View style={styles.tools}>
          <ToolButton icon="help-circle" label={t("home.tutorial")} dot={loaded && !seenTutorial} onPress={() => router.push("/tutorial")} />
          <ToolButton icon="settings" label={t("home.settings")} onPress={() => router.push("/einstellung")} />
        </View>
      </View>
    </View>
  );
}

/* ── Bausteine ─────────────────────────────────────────────── */

/** Höhe der Tonnen-Beschriftung im Tonnen-Rechteck (0 = Oberkante über der
 *  Öffnung, 1 = Boden) – dort, wo im Spiel das Tonnen-Schild sitzt. */
const HUB_LABEL_AT = 0.47;

/** Tipp-Fläche über einer Menü-Tonne + Name als Aufkleber auf der Tonne. */
function HubBin({
  rect,
  bus,
  index,
  hub,
  title,
  a11y,
  dot,
  compact,
  onPress,
}: {
  rect: ScreenRect | undefined;
  bus: BusRef;
  index: number;
  hub: Hub;
  title: string;
  a11y: string;
  dot: boolean;
  compact: boolean;
  onPress: () => void;
}) {
  const aimed = useAim(bus) === index;
  if (!rect) return null;
  const width = Math.max(rect.w * 0.92, 84);
  const height = compact ? 50 : 58;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    >
      {({ pressed }) => (
        <View
          pointerEvents="none"
          style={[
            styles.hubLabel,
            {
              left: rect.w / 2 - width / 2,
              top: rect.h * HUB_LABEL_AT - height / 2,
              width,
              minHeight: height,
              borderColor: hub.fill,
              transform: [{ scale: aimed ? 1.12 : pressed ? 0.95 : 1 }, { translateY: aimed ? -4 : 0 }],
            },
            aimed && [styles.hubLabelAimed, { shadowColor: hub.fill }],
          ]}
        >
          <View style={[styles.hubIcon, { backgroundColor: hub.sign }]}>
            <Feather name={hub.icon} size={compact ? 12 : 14} color="#FFFFFF" />
          </View>
          <AppText
            variant="label"
            color={hub.sign}
            center
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={styles.hubTitle}
          >
            {title}
          </AppText>
          {dot && <View style={styles.tileDot} />}
        </View>
      )}
    </Pressable>
  );
}

/** „Wirf in eine Tonne …“ mit sanft hüpfendem Pfeil. */
function ThrowHint({ text, calm, arrow = true }: { text: string; calm: boolean; arrow?: boolean }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (calm || !arrow) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, calm, arrow]);

  return (
    <View style={styles.hint} pointerEvents="none">
      {arrow && (
        <Animated.View
          style={{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }}
        >
          <Feather name="arrow-up" size={16} color={ON_SCENE} />
        </Animated.View>
      )}
      <AppText variant="label" color={ON_SCENE} style={[TEXT_SHADOW, styles.hintText]} numberOfLines={2}>
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
  tools: { flexDirection: "row", justifyContent: "center", gap: Spacing.lg },
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

  hubLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: Radius.md,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.95)",
    ...shadow,
  },
  hubLabelAimed: {
    borderWidth: 3,
    shadowOpacity: 0.95,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  hubIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  hubTitle: { fontSize: 15, lineHeight: 18 },

  menu: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    bottom: 0,
    gap: Spacing.sm,
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
  hintText: {
    flexShrink: 1,
    textAlign: "center",
  },

});
