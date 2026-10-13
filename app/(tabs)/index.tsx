// Datei: app/(tabs)/index.tsx — Design v2 „Klar & freundlich“
//
// Aufbau nach Wichtigkeit: 1 Hauptaktion (Spielen) → Fortschritt →
// Lernwissen (die 3 Tonnen, Fakt des Tages). Kein Druck, kein Ballast.

import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { BinIcon } from "@/components/ui/bin-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { IconButton } from "@/components/ui/icon-button";
import { ITEMS } from "@/constants/items";
import {
  type GameMode,
  getLastMode,
  getModeConfig,
  startGame,
} from "@/constants/modes";
import { type BinKey, Radius, Spacing } from "@/constants/theme";
import { type TranslationKey } from "@/i18n";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import {
  getActiveStreak,
  getBestHighscore,
  getLevelProgress,
  getNumber,
  StorageKeys,
} from "@/utils/storage";

const BINS: { key: BinKey; name: TranslationKey; examples: TranslationKey }[] =
  [
    { key: "bio", name: "bin.bio", examples: "bin.bio.examples" },
    { key: "gelb", name: "bin.gelb", examples: "bin.gelb.examples" },
    { key: "rest", name: "bin.rest", examples: "bin.rest.examples" },
  ];

/** Täglich wechselnder Fakt aus den Items. */
function pickDailyFact() {
  const withFact = ITEMS.filter((item) => item.fact);
  if (withFact.length === 0) return null;
  const day = Math.floor(Date.now() / 86_400_000);
  return withFact[day % withFact.length];
}

function greetingKey(): TranslationKey {
  const hour = new Date().getHours();
  if (hour < 11) return "greeting.morning";
  if (hour < 18) return "greeting.day";
  return "greeting.evening";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t, formatNumber } = useI18n();

  const [highscore, setHighscore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [lastMode, setLastMode] = useState<GameMode>("endless");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([
        getBestHighscore(),
        getActiveStreak(),
        getNumber(StorageKeys.TOTAL_XP),
        getLastMode(),
      ])
        .then(([hs, streakCount, xp, mode]) => {
          if (!active) return;
          setHighscore(hs);
          setStreak(streakCount);
          setTotalXP(xp);
          setLastMode(mode);
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, []),
  );

  const { level, progress, xpRemaining } = getLevelProgress(totalXP);

  const [dailyFact] = useState(pickDailyFact);

  const lastModeTitle = t(getModeConfig(lastMode).titleKey);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + Spacing.md, Spacing.lg),
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        {/* Kopf */}
        <FadeIn>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="title" accessibilityRole="header">
                {t(greetingKey())} 👋
              </AppText>
              <AppText tone="textSecondary">{t("home.subtitle")}</AppText>
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

        {/* Hauptaktion */}
        <FadeIn delay={60}>
          <View style={[styles.hero, { backgroundColor: colors.primarySoft }]}>
            <View style={styles.heroBins}>
              <BinIcon bin="bio" size={58} />
              <BinIcon bin="gelb" size={70} />
              <BinIcon bin="rest" size={58} />
            </View>

            <Button
              title={t("home.playContinue", { mode: lastModeTitle })}
              icon="play"
              size="lg"
              onPress={() => startGame(lastMode)}
            />
            <Button
              title={t("home.chooseMode")}
              variant="ghost"
              onPress={() => router.push("/modi")}
              style={styles.heroSecondary}
            />
          </View>
        </FadeIn>

        {/* Fortschritt */}
        <FadeIn delay={120}>
          <Card style={styles.section}>
            <View style={styles.progressTop}>
              <View
                style={[styles.levelBadge, { backgroundColor: colors.goldSoft }]}
              >
                <AppText variant="heading" tone="onGoldSoft">
                  {level}
                </AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">
                  {t("common.level")} {level}
                </AppText>
                <AppText variant="caption" tone="textMuted">
                  {t("home.xpToNext", {
                    xp: formatNumber(xpRemaining),
                    level: level + 1,
                  })}
                </AppText>
              </View>
            </View>

            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={t("home.progress")}
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
              style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
            >
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.max(progress * 100, totalXP > 0 ? 4 : 0)}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.statsRow}>
              <Stat emoji="🔥" value={formatNumber(streak)} label={t("home.daysInRow")} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <Stat emoji="🏆" value={formatNumber(highscore)} label={t("home.best")} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <Stat emoji="✨" value={formatNumber(totalXP)} label={t("common.xp")} />
            </View>
          </Card>
        </FadeIn>

        {/* Lernwissen: die 3 Tonnen */}
        <FadeIn delay={180}>
          <AppText variant="heading" accessibilityRole="header" style={styles.sectionTitle}>
            {t("home.bins")}
          </AppText>
          <Card style={styles.section}>
            {BINS.map((bin, i) => (
              <View
                key={bin.key}
                accessible
                style={[
                  styles.binRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <BinIcon bin={bin.key} size={44} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{t(bin.name)}</AppText>
                  <AppText variant="caption" tone="textSecondary">
                    {t(bin.examples)}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        </FadeIn>

        {/* Fakt des Tages */}
        {dailyFact && (
          <FadeIn delay={240}>
            <Card style={[styles.factCard, { backgroundColor: colors.infoSoft }]}>
              <AppText style={styles.factEmoji}>{dailyFact.emoji}</AppText>
              <View style={styles.flex}>
                <AppText variant="overline" tone="info">
                  {t("home.factTitle").toUpperCase()}
                </AppText>
                <AppText>{dailyFact.fact}</AppText>
              </View>
            </Card>
          </FadeIn>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="number" numberOfLines={1} adjustsFontSizeToFit>
        {emoji} {value}
      </AppText>
      <AppText variant="caption" tone="textMuted" center numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, gap: Spacing.md },
  flex: { flex: 1 },

  header: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  headerText: { flex: 1, gap: 2 },
  headerActions: { flexDirection: "row", gap: Spacing.sm },

  hero: {
    borderRadius: Radius.xxl,
    padding: Spacing.md + 4,
    paddingTop: Spacing.lg,
  },
  heroBins: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  heroSecondary: { marginTop: Spacing.sm },

  section: { gap: Spacing.md },
  sectionTitle: { marginTop: Spacing.sm },

  progressTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  track: { height: 12, borderRadius: Radius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: Radius.pill },

  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 36 },

  binRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },

  factCard: { flexDirection: "row", alignItems: "center", gap: Spacing.md, borderWidth: 0 },
  factEmoji: { fontSize: 34, lineHeight: 40 },
});
