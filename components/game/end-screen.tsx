// Datei: components/game/end-screen.tsx
// Rundenende nach dem Peak-End-Prinzip: zuerst das Positive (Lob, Punkte,
// Bestwert), dann eine kurze Lern-Zusammenfassung, dann „Nochmal“.

import { useEffect, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { type Item } from "@/constants/items";
import { Radius, Spacing } from "@/constants/theme";
import { type BinDef } from "@/game/bins";
import { type Stats } from "@/game/logic";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";

export type Mistake = { item: Item; bin: BinDef };

export function EndScreen({
  title,
  stats,
  xpEarned,
  newBest,
  mistakes,
  onAgain,
  onMenu,
}: {
  title: string;
  stats: Stats;
  xpEarned: number;
  newBest: boolean;
  mistakes: Mistake[];
  onAgain: () => void;
  onMenu: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t, formatNumber } = useI18n();
  const { reduceMotion } = useAppSettings();

  const [enter] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [counter] = useState(() => new Animated.Value(reduceMotion ? stats.score : 0));
  const [shown, setShown] = useState(reduceMotion ? stats.score : 0);

  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
    // Punkte zählen hoch – kleiner Spannungsmoment
    const id = counter.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(counter, {
      toValue: stats.score,
      duration: Math.min(1400, 400 + stats.score * 2),
      delay: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => counter.removeListener(id);
  }, [enter, counter, stats.score, reduceMotion]);

  const accuracy = stats.throws > 0 ? Math.round((stats.correct / stats.throws) * 100) : 0;

  // Jedes falsch sortierte Item nur einmal
  const unique = mistakes.filter(
    (m, i) => mistakes.findIndex((x) => x.item.name === m.item.name) === i,
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.surface, opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
          ]}
          accessibilityViewIsModal
        >
          <AppText style={styles.bigEmoji}>{accuracy >= 80 ? "🏆" : accuracy >= 50 ? "🌟" : "💪"}</AppText>
          <AppText variant="title" center accessibilityRole="header">
            {accuracy >= 50 ? t("game.end.great") : title}
          </AppText>
          <AppText tone="textSecondary" center>
            {t("game.end.sorted", { n: stats.correct })}
          </AppText>

          <AppText variant="display" tone="primary" style={styles.score}>
            {formatNumber(shown)}
          </AppText>
          <AppText variant="overline" tone="textMuted">
            {t("common.points").toUpperCase()}
          </AppText>

          {newBest && (
            <View style={[styles.pill, { backgroundColor: colors.goldSoft }]}>
              <AppText variant="label" tone="onGoldSoft">
                🏆 {t("game.end.newBest")}
              </AppText>
            </View>
          )}

          <View style={[styles.stats, { backgroundColor: colors.surfaceAlt }]}>
            <Stat value={`🔥 ${stats.maxStreak}`} label={t("game.end.bestStreak")} />
            <Stat value={`${accuracy}%`} label={t("game.end.accuracy")} />
            <Stat value={`⭐ ${stats.perfects}`} label={t("game.end.perfects")} />
            <Stat value={`+${xpEarned}`} label={t("common.xp")} />
          </View>

          {unique.length > 0 && (
            <View style={styles.learned}>
              <AppText variant="bodyStrong">💡 {t("game.end.learned")}</AppText>
              {unique.slice(0, 4).map((m) => (
                <View
                  key={m.item.name}
                  style={[styles.learnRow, { borderColor: colors.border }]}
                  accessible
                  accessibilityLabel={`${m.item.name} → ${t(m.bin.labelKey)}`}
                >
                  <AppText style={styles.rowEmoji}>{m.item.emoji}</AppText>
                  <AppText style={styles.flex} numberOfLines={2}>
                    {m.item.name}
                  </AppText>
                  <View style={[styles.binPill, { backgroundColor: m.bin.color }]}>
                    <AppText variant="caption" color={m.bin.onColor}>
                      {m.bin.icon} {t(m.bin.labelKey)}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Button title={t("game.end.again")} icon="rotate-ccw" size="lg" onPress={onAgain} style={styles.fullWidth} />
          <Button title={t("game.end.menu")} variant="ghost" onPress={onMenu} style={styles.fullWidth} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="caption" tone="textMuted" center numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: Spacing.md },
  card: { borderRadius: Radius.xxl, padding: Spacing.lg, alignItems: "center", gap: Spacing.sm },
  bigEmoji: { fontSize: 52, lineHeight: 62 },
  score: { fontSize: 56, lineHeight: 64, marginTop: Spacing.sm, fontVariant: ["tabular-nums"] },
  pill: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill },
  stats: {
    flexDirection: "row",
    alignSelf: "stretch",
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md - 4,
    marginTop: Spacing.sm,
  },
  stat: { flex: 1, alignItems: "center", paddingHorizontal: 2 },
  learned: { alignSelf: "stretch", gap: Spacing.sm, marginTop: Spacing.sm },
  learnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  rowEmoji: { fontSize: 24, lineHeight: 30 },
  flex: { flex: 1 },
  binPill: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm },
  fullWidth: { alignSelf: "stretch", marginTop: Spacing.xs },
});
