// Datei: components/game/hud.tsx
// Alles, was über der 3D-Szene liegt: Punkte, Serie, Fieber, Zeit,
// Tonnen-Schilder (auch Tipp-Ziel + Screenreader), Item-Karte, Lob,
// fliegende Punkte und die Lern-Karte bei Fehlern.

import { type ReactNode, useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { type Item } from "@/constants/items";
import { Radius, Spacing } from "@/constants/theme";
import { type BinDef } from "@/game/bins";
import { type ScreenRect } from "@/game/layout";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";

/* ── Hilfen ────────────────────────────────────────────────── */

/** Startet beim Mount (bzw. bei neuem key) eine Animation 0 → 1. */
function useEnter(duration = 320, easing = Easing.out(Easing.back(1.8))) {
  const { reduceMotion } = useAppSettings();
  const [v] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: true }).start();
  }, [v, duration, easing, reduceMotion]);
  return v;
}

/** Kurzer Puls, wenn sich `value` ändert. */
function usePulse(value: unknown, amount = 0.18) {
  const { reduceMotion } = useAppSettings();
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduceMotion) return;
    v.setValue(1 + amount);
    Animated.spring(v, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, [value, v, amount, reduceMotion]);
  return v;
}

function HudSurface({ children, style }: { children: ReactNode; style?: object }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: colors.hud, borderColor: colors.hudBorder },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ── Punkte + Serie ────────────────────────────────────────── */

export function ScoreBadge({ score, streak, multiplier }: { score: number; streak: number; multiplier: number }) {
  const { t, formatNumber } = useI18n();
  const { colors } = useAppTheme();
  const pulse = usePulse(score);
  const flamePulse = usePulse(streak, 0.35);

  return (
    <View style={styles.scoreWrap} accessible accessibilityLabel={`${t("common.points")}: ${score}`}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <HudSurface style={styles.scoreCard}>
          <AppText variant="overline" tone="textMuted">
            {t("common.points").toUpperCase()}
          </AppText>
          <AppText variant="title" style={styles.scoreValue}>
            {formatNumber(score)}
          </AppText>
        </HudSurface>
      </Animated.View>

      {streak >= 2 && (
        <Animated.View
          style={[
            styles.streakChip,
            { backgroundColor: colors.goldSoft, transform: [{ scale: flamePulse }] },
          ]}
        >
          <AppText style={{ fontSize: 16 + Math.min(streak, 10) }}>🔥</AppText>
          <AppText variant="label" tone="onGoldSoft">
            {streak} · ×{multiplier}
          </AppText>
        </Animated.View>
      )}
    </View>
  );
}

/* ── Fieber ────────────────────────────────────────────────── */

export function FeverBanner({ seconds }: { seconds: number }) {
  const { t } = useI18n();
  const enter = useEnter();
  const [bar] = useState(() => new Animated.Value(1));
  useEffect(() => {
    Animated.timing(bar, {
      toValue: 0,
      duration: seconds * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [bar, seconds]);

  return (
    <Animated.View style={[styles.fever, { transform: [{ scale: enter }] }]}>
      <AppText variant="label" color="#3A2500" center>
        🔥 {t("game.fever")} 🔥
      </AppText>
      <View style={styles.feverTrack}>
        <Animated.View
          style={[
            styles.feverFill,
            { width: bar.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
          ]}
        />
      </View>
    </Animated.View>
  );
}

/* ── Zeit ──────────────────────────────────────────────────── */

export function TimerBar({ timeLeft, total }: { timeLeft: number; total: number }) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const warn = timeLeft <= 10;
  const pulse = usePulse(warn ? timeLeft : 0, 0.25);
  return (
    <View
      style={styles.timerRow}
      accessible
      accessibilityLabel={`${t("game.time")}: ${timeLeft}`}
    >
      <View style={[styles.timerTrack, { backgroundColor: colors.hud, borderColor: colors.hudBorder }]}>
        <View
          style={[
            styles.timerFill,
            {
              backgroundColor: warn ? colors.warning : colors.primary,
              width: `${Math.max(0, Math.min(100, (timeLeft / total) * 100))}%`,
            },
          ]}
        />
      </View>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <AppText variant="heading" tone={warn ? "warning" : "text"} style={styles.timerText}>
          {timeLeft}s
        </AppText>
      </Animated.View>
    </View>
  );
}

/* ── Tonnen-Schilder (auch Tipp-Ziel für Screenreader) ─────── */

export function BinLabels({
  bins,
  rects,
  aimIndex,
  onActivate,
}: {
  bins: BinDef[];
  rects: ScreenRect[];
  aimIndex: number | null;
  onActivate: (index: number) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      {bins.map((bin, i) => {
        const r = rects[i];
        if (!r) return null;
        const aimed = aimIndex === i;
        const width = Math.max(r.w + 14, 84);
        return (
          <View
            key={bin.key}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("game.throwTo", { bin: t(bin.labelKey) })}
            accessibilityActions={[{ name: "activate" }]}
            onAccessibilityAction={() => onActivate(i)}
            pointerEvents="none"
            style={[
              styles.binLabel,
              {
                left: r.x + r.w / 2 - width / 2,
                top: r.y + r.h + 6,
                width,
                backgroundColor: bin.color,
                transform: [{ scale: aimed ? 1.12 : 1 }],
              },
              aimed && styles.binLabelAimed,
            ]}
          >
            <AppText style={styles.binIcon}>{bin.icon}</AppText>
            <AppText
              variant="label"
              color={bin.onColor}
              numberOfLines={2}
              center
              adjustsFontSizeToFit
              style={styles.binText}
            >
              {t(bin.labelKey)}
            </AppText>
          </View>
        );
      })}
    </>
  );
}

/* ── Item-Karte ────────────────────────────────────────────── */

export function ItemCard({ item, showHint }: { item: Item; showHint: boolean }) {
  const { t } = useI18n();
  const enter = useEnter(380);
  const { reduceMotion } = useAppSettings();
  const [hand] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!showHint || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hand, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(250),
        Animated.timing(hand, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showHint, hand, reduceMotion]);

  return (
    <Animated.View
      style={[styles.itemWrap, { opacity: enter, transform: [{ scale: enter }] }]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${t("game.whereTo")} ${item.name}`}
    >
      {showHint && (
        <View style={styles.hint}>
          <Animated.Text
            style={[
              styles.hand,
              {
                opacity: hand.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                transform: [{ translateY: hand.interpolate({ inputRange: [0, 1], outputRange: [10, -40] }) }],
              },
            ]}
          >
            👆
          </Animated.Text>
          <HudSurface style={styles.hintCard}>
            <AppText variant="label" center>
              {t("game.hintSwipe")}
            </AppText>
            <AppText variant="caption" tone="textMuted" center>
              {t("game.hintTap")}
            </AppText>
          </HudSurface>
        </View>
      )}
      <HudSurface style={styles.itemCard}>
        <AppText style={styles.itemEmoji}>{item.emoji}</AppText>
        <View style={styles.flexShrink}>
          <AppText variant="overline" tone="textMuted">
            {t("game.whereTo").toUpperCase()}
          </AppText>
          <AppText variant="heading" numberOfLines={2}>
            {item.name}
          </AppText>
        </View>
      </HudSurface>
    </Animated.View>
  );
}

/* ── Lern-Karte (falsche Tonne) ────────────────────────────── */

export function LearnCard({ item, bin }: { item: Item; bin: BinDef }) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const enter = useEnter(380);

  return (
    <Animated.View
      style={[styles.itemWrap, { opacity: enter, transform: [{ scale: enter }] }]}
      accessible
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${t("game.almost")} ${item.name} ${t("game.belongsIn")} ${t(bin.labelKey)}`}
    >
      <View
        style={[styles.learnCard, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}
      >
        <AppText variant="heading" tone="onWarningSoft">
          {t("game.almost")} 💡
        </AppText>
        <View style={styles.learnRow}>
          <AppText style={styles.learnEmoji}>{item.emoji}</AppText>
          <AppText variant="bodyStrong" tone="onWarningSoft" style={styles.flexShrink}>
            {item.name} {t("game.belongsIn")}
          </AppText>
        </View>
        <View style={[styles.learnBin, { backgroundColor: bin.color }]}>
          <AppText style={styles.binIcon}>{bin.icon}</AppText>
          <AppText variant="heading" color={bin.onColor}>
            {t(bin.labelKey)}
          </AppText>
        </View>
      </View>
    </Animated.View>
  );
}

/* ── Lob + fliegende Punkte + Banner ───────────────────────── */

/** Comic-Lautwort („PLOPP!“) mit Sternen-Burst und dicker Umrandung. */
export function Praise({ text, gold }: { text: string; gold: boolean }) {
  const enter = useEnter(320);
  const fill = gold ? "#FFD54A" : "#FFFFFF";
  const burst = gold ? "#E65100" : "#1E7A4C";
  const spikes = [0, 22.5, 45, 67.5];
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.praise,
        {
          opacity: enter.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
          transform: [
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            { rotate: enter.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "-4deg"] }) },
          ],
        },
      ]}
    >
      <View style={styles.burstWrap}>
        {spikes.map((deg) => (
          <View key={deg} style={[styles.burstSpike, { backgroundColor: burst, transform: [{ rotate: `${deg}deg` }] }]} />
        ))}
      </View>
      <OutlinedText text={text} fill={fill} />
    </Animated.View>
  );
}

/** Comic-Schrift mit dicker dunkler Kontur (8 versetzte Schatten-Kopien). */
function OutlinedText({ text, fill, size = 40 }: { text: string; fill: string; size?: number }) {
  const offsets = [
    [-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2],
  ];
  return (
    <View>
      {offsets.map(([x, y], i) => (
        <AppText
          key={i}
          variant="display"
          color="#1E2228"
          style={[styles.comicText, { fontSize: size, lineHeight: size * 1.2, position: "absolute", left: x, top: y }]}
        >
          {text}
        </AppText>
      ))}
      <AppText variant="display" color={fill} style={[styles.comicText, { fontSize: size, lineHeight: size * 1.2 }]}>
        {text}
      </AppText>
    </View>
  );
}

/** Sprechblase über einer Tonne („Bäh! 🤢“). */
export function SpeechBubble({ x, y, text }: { x: number; y: number; text: string }) {
  const enter = useEnter(280);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubbleWrap,
        {
          left: x - 80,
          top: y - 74,
          opacity: enter,
          transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        },
      ]}
    >
      <View style={styles.bubble}>
        <AppText variant="heading" color="#1E2228" center>
          {text}
        </AppText>
      </View>
      <View style={styles.bubbleTail} />
    </Animated.View>
  );
}

export type FloatText = { id: number; x: number; y: number; text: string; color: string };

export function FloatingText({ item, onDone }: { item: FloatText; onDone: (id: number) => void }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onDone(item.id));
  }, [v, item.id, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.float,
        {
          left: item.x - 60,
          top: item.y - 20,
          opacity: v.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -70] }) },
            { scale: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.5, 1.25, 1] }) },
          ],
        },
      ]}
    >
      <AppText variant="title" color={item.color} center style={styles.floatText}>
        {item.text}
      </AppText>
    </Animated.View>
  );
}

export function Banner({ text }: { text: string }) {
  const { colors } = useAppTheme();
  const enter = useEnter(420);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        {
          backgroundColor: colors.primary,
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        },
      ]}
    >
      <AppText variant="heading" tone="onPrimary" center>
        {text}
      </AppText>
    </Animated.View>
  );
}

/* ── Kleiner Knopf oben (Fertig) ───────────────────────────── */

export function HudButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.hudButton,
        { backgroundColor: colors.hud, borderColor: colors.hudBorder },
        pressed && { opacity: 0.8 },
      ]}
    >
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
}

const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};

const styles = StyleSheet.create({
  flexShrink: { flexShrink: 1 },
  surface: { borderRadius: Radius.xl, borderWidth: 1, ...shadow },

  scoreWrap: { alignItems: "center", gap: 6 },
  scoreCard: { alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: 6, minWidth: 130 },
  scoreValue: { fontVariant: ["tabular-nums"] },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },

  fever: {
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    backgroundColor: "#FFD54A",
    gap: 4,
    ...shadow,
  },
  feverTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(58,37,0,0.2)", overflow: "hidden" },
  feverFill: { height: 6, backgroundColor: "#E65100" },

  timerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  timerTrack: { flex: 1, height: 14, borderRadius: 7, borderWidth: 1, overflow: "hidden" },
  timerFill: { height: "100%", borderRadius: 7 },
  timerText: { minWidth: 48, textAlign: "right", fontVariant: ["tabular-nums"] },

  binLabel: {
    position: "absolute",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    ...shadow,
  },
  binLabelAimed: { borderColor: "#FFFFFF", borderWidth: 3 },
  binIcon: { fontSize: 20, lineHeight: 24 },
  binText: { lineHeight: 18 },

  itemWrap: { alignItems: "center", gap: Spacing.sm },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md - 4,
    maxWidth: "100%",
  },
  itemEmoji: { fontSize: 36, lineHeight: 44 },

  hint: { alignItems: "center" },
  hand: { fontSize: 34, marginBottom: -6 },
  hintCard: { paddingHorizontal: Spacing.md, paddingVertical: 8 },

  learnCard: {
    width: "100%",
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: "center",
    ...shadow,
  },
  learnRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  learnEmoji: { fontSize: 30, lineHeight: 36 },
  learnBin: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },

  praise: { position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center", height: 120 },
  burstWrap: { position: "absolute", width: 150, height: 150, alignItems: "center", justifyContent: "center" },
  burstSpike: { position: "absolute", width: 118, height: 118, borderRadius: 14, opacity: 0.92 },
  comicText: { letterSpacing: 1 },
  bubbleWrap: { position: "absolute", width: 160, alignItems: "center" },
  bubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#1E2228",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleTail: {
    width: 18,
    height: 18,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#1E2228",
    transform: [{ rotate: "45deg" }],
    marginTop: -11,
  },

  float: { position: "absolute", width: 120 },
  floatText: {
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  banner: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    paddingVertical: Spacing.md - 4,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    ...shadow,
  },

  hudButton: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
