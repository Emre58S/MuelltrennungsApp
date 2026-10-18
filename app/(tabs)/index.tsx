// Datei: app/(tabs)/index.tsx — Design v9 „Statistik pro Modus“
//
// Aufbau: Streak + Icons → Hero (Tonnen-Bühne, Modus-Chips, Start-Pille)
// → Statistik-Panel, das mit dem gewählten Modus wechselt → Level → Fakt.

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { BinIcon } from "@/components/ui/bin-icon";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { IconButton } from "@/components/ui/icon-button";
import { ITEMS } from "@/constants/items";
import {
  type GameMode,
  getLastMode,
  getModeConfig,
  MODES,
  startGame,
} from "@/constants/modes";
import { type BinKey, Radius, Spacing, TOUCH_MIN } from "@/constants/theme";
import {
  useAppSettings,
  useAppTheme,
  useI18n,
} from "@/providers/app-settings";
import {
  getActiveStreak,
  getHighscoreKey,
  getLevelProgress,
  getModeStats,
  getNumber,
  type ModeStatsMap,
  StorageKeys,
} from "@/utils/storage";

const HIGHSCORE_MODE = {
  endless: "endlos",
  survival: "runden",
  time: "zeit",
} as const;

type Scores = Record<GameMode, number>;

const NO_SCORES: Scores = { endless: 0, survival: 0, time: 0 };

const NO_STATS: ModeStatsMap = {
  endless: { games: 0, bestStreak: 0, bestCorrect: 0, throws: 0, correct: 0 },
  survival: { games: 0, bestStreak: 0, bestCorrect: 0, throws: 0, correct: 0 },
  time: { games: 0, bestStreak: 0, bestCorrect: 0, throws: 0, correct: 0 },
};

type StatItem = { emoji: string; label: string; value: string };

/** Welche Werte pro Modus gezeigt werden. */
function buildStatItems(
  mode: GameMode,
  score: number,
  stats: ModeStatsMap[GameMode],
  fmt: (n: number) => string,
): StatItem[] {
  const accuracy =
    stats.throws > 0 ? Math.round((stats.correct / stats.throws) * 100) : 0;

  const special: StatItem =
    mode === "time"
      ? { emoji: "⏱️", label: "Treffer in 60 s", value: fmt(stats.bestCorrect) }
      : mode === "survival"
        ? { emoji: "🔥", label: "Serie ohne Fehler", value: fmt(stats.bestStreak) }
        : { emoji: "🔥", label: "Beste Serie", value: fmt(stats.bestStreak) };

  return [
    { emoji: "🏆", label: "Bestwert", value: fmt(score) },
    special,
    { emoji: "🎮", label: "Runden", value: fmt(stats.games) },
    { emoji: "🎯", label: "Trefferquote", value: `${accuracy} %` },
  ];
}

/** Täglich wechselnder Fakt aus den Items. */
function pickDailyFact() {
  const withFact = ITEMS.filter((item) => item.fact);
  if (withFact.length === 0) return null;

  const day = Math.floor(Date.now() / 86_400_000);
  return withFact[day % withFact.length];
}

/** Tonne auf Standfläche: schwebt, Schatten schrumpft beim Anheben. */
function FloatingBin({
  bin,
  size,
  delay,
  still,
  tilt = 0,
}: {
  bin: BinKey;
  size: number;
  delay: number;
  still: boolean;
  tilt?: number;
}) {
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (still) {
      lift.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(lift, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(lift, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [delay, lift, still]);

  const translateY = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -9],
  });

  const shadowScale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.78],
  });

  const shadowOpacity = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.14],
  });

  return (
    <View style={styles.standing}>
      <Animated.View
        style={{ transform: [{ translateY }, { rotate: `${tilt}deg` }] }}
      >
        <BinIcon bin={bin} size={size} />
      </Animated.View>

      <Animated.View
        style={[
          styles.binShadow,
          {
            width: size * 0.85,
            opacity: shadowOpacity,
            transform: [{ scaleX: shadowScale }],
          },
        ]}
      />
    </View>
  );
}

/** Pressable mit spürbarem Feder-Feedback. */
function Bouncy({
  onPress,
  label,
  style,
  children,
}: {
  onPress: () => void;
  label: string;
  style?: object;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => to(0.96)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** Modus-Chip: gewählt = gefüllt, sonst nur Rand. */
function ModeChip({
  title,
  icon,
  selected,
  onPress,
  fg,
  bg,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  selected: boolean;
  onPress: () => void;
  fg: string;
  bg: string;
}) {
  const textColor = selected ? bg : fg;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: fg, borderColor: fg }
          : { backgroundColor: "transparent", borderColor: fg + "70" },
      ]}
    >
      <Feather name={icon} size={18} color={textColor} />
      <AppText variant="label" style={{ color: textColor }}>
        {title}
      </AppText>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t, formatNumber } = useI18n();
  const { reduceMotion } = useAppSettings();

  const [scores, setScores] = useState<Scores>(NO_SCORES);
  const [modeStats, setModeStats] = useState<ModeStatsMap>(NO_STATS);
  const [streak, setStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [mode, setMode] = useState<GameMode>("endless");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([
        getNumber(getHighscoreKey(HIGHSCORE_MODE.endless)),
        getNumber(getHighscoreKey(HIGHSCORE_MODE.survival)),
        getNumber(getHighscoreKey(HIGHSCORE_MODE.time)),
        getModeStats(),
        getActiveStreak(),
        getNumber(StorageKeys.TOTAL_XP),
        getLastMode(),
      ])
        .then(([endless, survival, time, stats, streakCount, xp, last]) => {
          if (!active) return;

          setScores({ endless, survival, time });
          setModeStats(stats);
          setStreak(streakCount);
          setTotalXP(xp);
          setMode(last);
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, []),
  );

  const { level, progress, xpRemaining } = getLevelProgress(totalXP);
  const [dailyFact] = useState(pickDailyFact);

  const current = getModeConfig(mode);
  const modeTitle = t(current.titleKey);
  const modeDesc = t(current.descKey);

  const items = buildStatItems(
    mode,
    scores[mode],
    modeStats[mode],
    formatNumber,
  );
  const hasPlayed = modeStats[mode].games > 0 || scores[mode] > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + Spacing.sm, Spacing.lg),
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        {/* Top-Leiste */}
        <FadeIn>
          <View style={styles.topBar}>
            <View style={[styles.streakPill, { backgroundColor: colors.goldSoft }]}>
              <AppText variant="bodyStrong" tone="onGoldSoft">
                🔥 {formatNumber(streak)}
              </AppText>
            </View>

            <View style={styles.headerActions}>
              <IconButton
                icon="help-circle"
                label={t("home.tutorial")}
                onPress={() => router.push("/tutorial")}
              />
              <IconButton
                icon="settings"
                label={t("home.settings")}
                onPress={() => router.push("/einstellung")}
              />
            </View>
          </View>
        </FadeIn>

        {/* Hero: Tonnen → Modus wählen → Starten */}
        <FadeIn delay={60}>
          <View style={[styles.hero, { backgroundColor: colors.primary }]}>
            <View style={styles.stage}>
              <View
                style={[styles.spotlight, { backgroundColor: colors.onPrimary }]}
              />

              <View style={styles.stageRow}>
                <View style={styles.sideLeft}>
                  <FloatingBin
                    bin="bio"
                    size={62}
                    delay={0}
                    still={reduceMotion}
                    tilt={-6}
                  />
                </View>

                <View style={styles.center}>
                  <FloatingBin
                    bin="gelb"
                    size={86}
                    delay={350}
                    still={reduceMotion}
                  />
                </View>

                <View style={styles.sideRight}>
                  <FloatingBin
                    bin="rest"
                    size={62}
                    delay={700}
                    still={reduceMotion}
                    tilt={6}
                  />
                </View>
              </View>

              <View style={[styles.ground, { backgroundColor: colors.onPrimary }]} />
            </View>

            <View accessibilityRole="radiogroup" style={styles.chips}>
              {MODES.map((m) => (
                <ModeChip
                  key={m.mode}
                  title={t(m.titleKey)}
                  icon={m.icon}
                  selected={m.mode === mode}
                  fg={colors.onPrimary}
                  bg={colors.primary}
                  onPress={() => setMode(m.mode)}
                />
              ))}
            </View>

            <AppText
              variant="caption"
              style={[styles.modeDesc, { color: colors.onPrimary }]}
            >
              {modeDesc}
            </AppText>

            <Bouncy
              label={modeTitle}
              onPress={() => startGame(mode)}
              style={[styles.playPill, { backgroundColor: colors.onPrimary }]}
            >
              <View style={[styles.playCircle, { backgroundColor: colors.primary }]}>
                <Feather name="play" size={20} color={colors.onPrimary} />
              </View>

              <View style={styles.flex}>
                <AppText variant="heading" style={{ color: colors.primary }}>
                  {modeTitle}
                </AppText>
              </View>

              <Feather name="chevron-right" size={22} color={colors.primary} />
            </Bouncy>
          </View>
        </FadeIn>

        {/* Statistik: wechselt mit dem gewählten Modus */}
        <FadeIn key={mode} delay={0}>
          <Card style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <View
                style={[styles.statsBadge, { backgroundColor: colors.primarySoft }]}
              >
                <Feather
                  name={current.icon}
                  size={22}
                  color={colors.onPrimarySoft}
                />
              </View>

              <View style={styles.flex}>
                <AppText variant="heading">{modeTitle}</AppText>
                {!hasPlayed && (
                  <AppText variant="caption" tone="textMuted">
                    Noch keine Runde gespielt
                  </AppText>
                )}
              </View>
            </View>

            <View style={styles.grid}>
              {items.map((item) => (
                <View
                  key={item.label}
                  accessible
                  accessibilityLabel={`${item.label}: ${item.value}`}
                  style={[styles.stat, { backgroundColor: colors.surfaceAlt }]}
                >
                  <AppText style={styles.statEmoji}>{item.emoji}</AppText>
                  <AppText variant="number">{item.value}</AppText>
                  <AppText
                    variant="caption"
                    tone="textMuted"
                    numberOfLines={1}
                  >
                    {item.label}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>
        </FadeIn>

        {/* Level (gilt für alle Modi) */}
        <FadeIn delay={120}>
          <Card style={styles.levelCard}>
            <View style={styles.levelRow}>
              <View style={[styles.levelBadge, { backgroundColor: colors.goldSoft }]}>
                <AppText variant="title" tone="onGoldSoft">
                  {level}
                </AppText>
              </View>

              <View style={styles.flex}>
                <AppText variant="heading">
                  {t("common.level")} {level}
                </AppText>
                <AppText variant="caption" tone="textMuted">
                  {t("home.xpToNext", {
                    xp: formatNumber(xpRemaining),
                    level: level + 1,
                  })}
                </AppText>
              </View>

              <AppText variant="bodyStrong" tone="textMuted">
                ⚡ {formatNumber(totalXP)}
              </AppText>
            </View>

            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={t("home.progress")}
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(progress * 100),
              }}
              style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
            >
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.max(progress * 100, totalXP > 0 ? 5 : 0)}%`,
                  },
                ]}
              />
            </View>
          </Card>
        </FadeIn>

        {/* Fakt des Tages */}
        {dailyFact && (
          <FadeIn delay={180}>
            <View style={[styles.fact, { backgroundColor: colors.infoSoft }]}>
              <AppText style={styles.factEmoji}>{dailyFact.emoji}</AppText>

              <View style={styles.flex}>
                <AppText variant="overline" tone="info">
                  {t("home.factTitle").toUpperCase()}
                </AppText>
                <AppText variant="caption">{dailyFact.fact}</AppText>
              </View>
            </View>
          </FadeIn>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  flex: { flex: 1, gap: 2 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  streakPill: {
    minHeight: TOUCH_MIN - 8,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },

  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },

  hero: {
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },

  /* Tonnen-Bühne */
  standing: { alignItems: "center" },

  binShadow: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#000",
    marginTop: 4,
  },

  stage: {
    height: 170,
    justifyContent: "flex-end",
    alignItems: "center",
  },

  spotlight: {
    position: "absolute",
    top: 0,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.1,
  },

  stageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },

  sideLeft: { marginRight: -10, zIndex: 1 },
  center: { zIndex: 2 },
  sideRight: { marginLeft: -10, zIndex: 1 },

  ground: {
    width: "88%",
    height: 4,
    borderRadius: 2,
    opacity: 0.18,
    marginTop: 2,
  },

  /* Modus-Chips */
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
  },

  chip: {
    minHeight: TOUCH_MIN,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },

  modeDesc: {
    textAlign: "center",
    opacity: 0.9,
  },

  playPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm + 2,
    paddingLeft: Spacing.sm + 2,
    paddingRight: Spacing.md,
  },

  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Statistik-Panel */
  statsCard: { gap: Spacing.md },

  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },

  statsBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },

  stat: {
    width: "48.5%",
    alignItems: "center",
    gap: 2,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.lg,
  },

  statEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },

  /* Level */
  levelCard: { gap: Spacing.md },

  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },

  levelBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  track: {
    height: 14,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },

  fill: {
    height: "100%",
    borderRadius: Radius.pill,
  },

  /* Fakt */
  fact: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.md,
  },

  factEmoji: {
    fontSize: 30,
    lineHeight: 36,
  },
});
