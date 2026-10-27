// Datei: components/game/end-screen.tsx
// Rundenende nach dem Peak-End-Prinzip: zuerst das Positive (Lob, Punkte,
// Bestwert, Level-Fortschritt), dann eine kurze Lern-Zusammenfassung (Fehler
// antippen → Fakt), dann „Nochmal“. Tagesaufgabe: Ergebnis teilen.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Star } from "@/components/game/hud";
import { type Item } from "@/constants/items";
import { Radius, Spacing } from "@/constants/theme";
import { type BinDef } from "@/game/bins";
import { type HitResult, type Stats } from "@/game/logic";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { type Board, fetchBoard, leaderboardReady } from "@/utils/leaderboard";
import { getLevelProgress, todayKey } from "@/utils/storage";

export type Mistake = { item: Item; bin: BinDef };

const SHARE_BOX: Record<HitResult, string> = { perfect: "⭐", correct: "🟩", wrong: "🟥" };

/** Eigener Platz in der Rangliste nach der Runde (null = offline/keiner).
 *  Kurz warten: das Ergebnis wird gerade erst eingereicht. */
function useBoardPlace(board: Board | undefined, score: number): number | null {
  const [place, setPlace] = useState<number | null>(null);
  useEffect(() => {
    if (!board || !leaderboardReady || score <= 0) return;
    let active = true;
    const timer = setTimeout(() => {
      fetchBoard(board, 1)
        .then((r) => active && setPlace(r.me?.rank ?? null))
        .catch(() => undefined);
    }, 900);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [board, score]);
  return place;
}

export function EndScreen({
  title,
  stats,
  startXp,
  xpEarned,
  newBest,
  mistakes,
  daily,
  results,
  onAgain,
  onMenu,
  board,
}: {
  title: string;
  stats: Stats;
  /** XP vor der Runde (für die Level-Leiste). */
  startXp: number;
  xpEarned: number;
  newBest: boolean;
  mistakes: Mistake[];
  /** Tagesaufgabe: eigener Titel + Teilen. */
  daily: boolean;
  /** Ergebnis pro Wurf (für die Teilen-Kästchen). */
  results: HitResult[];
  onAgain: () => void;
  onMenu: () => void;
  /** Rangliste dieser Runde: zeigt den eigenen Platz (falls online). */
  board?: Board;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t, formatNumber, itemName, itemFact } = useI18n();
  const { reduceMotion } = useAppSettings();
  const place = useBoardPlace(board, stats.score);

  const [enter] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [counter] = useState(
    () => new Animated.Value(reduceMotion ? stats.score : 0),
  );
  const [shown, setShown] = useState(reduceMotion ? stats.score : 0);
  const [open, setOpen] = useState<string | null>(null);

  // Level-Leiste: von vorher nach nachher (bei Aufstieg bis zum Ende füllen)
  const before = getLevelProgress(startXp);
  const after = getLevelProgress(startXp + xpEarned);
  const leveledUp = after.level > before.level;
  const target = leveledUp ? 1 : after.progress;
  const [bar] = useState(() => new Animated.Value(reduceMotion ? target : before.progress));

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
    Animated.timing(bar, {
      toValue: target,
      duration: 900,
      delay: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => counter.removeListener(id);
  }, [enter, counter, bar, target, stats.score, reduceMotion]);

  const share = () => {
    const boxes = results.map((r) => SHARE_BOX[r]).join("");
    Share.share({
      message: t("game.end.shareText", {
        date: todayKey(),
        boxes,
        correct: stats.correct,
        total: stats.throws,
        score: stats.score,
      }),
    }).catch(() => undefined);
  };

  const accuracy =
    stats.throws > 0 ? Math.round((stats.correct / stats.throws) * 100) : 0;
  // Sterne-Bewertung wie bei den Trickwürfen: 90 % → ★★★, 70 % → ★★, sonst ★
  const rating = stats.throws === 0 ? 0 : accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;

  // Jedes falsch sortierte Item nur einmal
  const unique = mistakes.filter(
    (m, i) => mistakes.findIndex((x) => x.item.name === m.item.name) === i,
  );

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              opacity: enter,
              transform: [
                {
                  scale: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            },
          ]}
          accessibilityViewIsModal
        >
          <AppText style={styles.bigEmoji}>
            {accuracy >= 80 ? "🏆" : accuracy >= 50 ? "🌟" : "💪"}
          </AppText>
          <AppText variant="title" center accessibilityRole="header">
            {daily ? t("game.end.dailyTitle") : accuracy >= 50 ? t("game.end.great") : title}
          </AppText>
          <AppText tone="textSecondary" center>
            {t("game.end.sorted", { n: stats.correct })}
          </AppText>

          {rating > 0 && (
            <View style={styles.starRow} accessible accessibilityLabel={`${rating} / 3`}>
              {([1, 2, 3] as const).map((n) => (
                <Star key={n} n={n} filled={n <= rating} delay={300 + n * 180} />
              ))}
            </View>
          )}

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

          {/* Platz in der Rangliste (antippen öffnet sie) */}
          {place !== null && (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/rangliste")}
              style={({ pressed }) => [styles.pill, { backgroundColor: colors.primarySoft }, pressed && { opacity: 0.8 }]}
            >
              <AppText variant="label" tone="onPrimarySoft">
                {place <= 3 ? ["🥇", "🥈", "🥉"][place - 1] : "📊"} {t("rank.place", { rank: place })} ›
              </AppText>
            </Pressable>
          )}

          {/* Level-Fortschritt */}
          <View
            style={styles.levelBox}
            accessible
            accessibilityLabel={`${t("game.end.level", { level: after.level })}${leveledUp ? `, ${t("game.end.levelUp")}` : ""}`}
          >
            <View style={styles.levelRow}>
              <AppText variant="label">{t("game.end.level", { level: after.level })}</AppText>
              {leveledUp && (
                <View style={[styles.levelUp, { backgroundColor: colors.goldSoft }]}>
                  <AppText variant="caption" tone="onGoldSoft">
                    ⬆ {t("game.end.levelUp")}
                  </AppText>
                </View>
              )}
            </View>
            <View style={[styles.levelTrack, { backgroundColor: colors.surfaceAlt }]}>
              <Animated.View
                style={[
                  styles.levelFill,
                  {
                    backgroundColor: leveledUp ? "#FFB300" : colors.primary,
                    width: bar.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                  },
                ]}
              />
            </View>
          </View>

          <View style={[styles.stats, { backgroundColor: colors.surfaceAlt }]}>
            <Stat
              value={`🔥 ${stats.maxStreak}`}
              label={t("game.end.bestStreak")}
            />
            <Stat value={`${accuracy}%`} label={t("game.end.accuracy")} />
            <Stat
              value={`⭐ ${stats.perfects}`}
              label={t("game.end.perfects")}
            />
            <Stat value={`+${xpEarned}`} label={t("common.xp")} />
          </View>

          {unique.length > 0 && (
            <View style={styles.learned}>
              <AppText variant="bodyStrong">💡 {t("game.end.learned")}</AppText>
              <AppText variant="caption" tone="textMuted">
                {t("game.end.tapToLearn")}
              </AppText>
              {unique.slice(0, 4).map((m) => {
                const expanded = open === m.item.name;
                return (
                  <Pressable
                    key={m.item.name}
                    style={[styles.learnItem, { borderColor: colors.border }]}
                    onPress={() => setOpen(expanded ? null : m.item.name)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={`${itemName(m.item)} → ${t(m.bin.labelKey)}`}
                  >
                    <View style={styles.learnRow}>
                      <AppText style={styles.rowEmoji}>{m.item.emoji}</AppText>
                      <AppText style={styles.flex} numberOfLines={2}>
                        {itemName(m.item)}
                      </AppText>
                      <View style={[styles.binPill, { backgroundColor: m.bin.color }]}>
                        <AppText variant="caption" color={m.bin.onColor}>
                          {m.bin.icon} {t(m.bin.labelKey)}
                        </AppText>
                      </View>
                      <Feather
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={colors.textMuted}
                      />
                    </View>
                    {expanded && (
                      <AppText tone="textSecondary" style={styles.factText}>
                        {itemFact(m.item) ?? `${itemName(m.item)} → ${m.bin.icon} ${t(m.bin.labelKey)}`}
                      </AppText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {daily && results.length > 0 && (
            <Button
              title={t("game.end.share")}
              icon="share-2"
              variant="secondary"
              onPress={share}
              style={styles.fullWidth}
            />
          )}
          <Button
            title={t("game.end.again")}
            icon="rotate-ccw"
            size="lg"
            onPress={onAgain}
            style={styles.fullWidth}
          />
          <Button
            title={t("game.end.menu")}
            variant="ghost"
            onPress={onMenu}
            style={styles.fullWidth}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={styles.stat}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <AppText variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText
        variant="caption"
        tone="textMuted"
        center
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  card: {
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  bigEmoji: { fontSize: 52, lineHeight: 62 },
  starRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs },
  score: {
    fontSize: 56,
    lineHeight: 64,
    marginTop: Spacing.sm,
    fontVariant: ["tabular-nums"],
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  stats: {
    flexDirection: "row",
    alignSelf: "stretch",
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md - 4,
    marginTop: Spacing.sm,
  },
  stat: { flex: 1, alignItems: "center", paddingHorizontal: 2 },
  learned: { alignSelf: "stretch", gap: Spacing.sm, marginTop: Spacing.sm },
  learnItem: { borderTopWidth: 1, paddingTop: Spacing.sm, gap: 6 },
  learnRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  factText: { paddingLeft: 32 },
  levelBox: { alignSelf: "stretch", gap: 6, marginTop: Spacing.sm },
  levelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  levelUp: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  levelTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
  levelFill: { height: "100%", borderRadius: 5 },
  rowEmoji: { fontSize: 24, lineHeight: 30 },
  flex: { flex: 1 },
  binPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  fullWidth: { alignSelf: "stretch", marginTop: Spacing.xs },
});
