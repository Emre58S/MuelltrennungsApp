// Datei: app/tricks.tsx
// Level-Auswahl der Trickwürfe: oben der Tages-Trick (für alle gleich),
// darunter die Level nach Schwierigkeit mit Sternen; ein Level wird frei,
// sobald das vorige geschafft ist.

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { FadeIn } from "@/components/ui/fade-in";
import { PageHeader } from "@/components/ui/page-header";
import { press, tapHaptic } from "@/components/ui/press";
import { Radius, Shadow, Spacing } from "@/constants/theme";
import {
  difficultyOf,
  levelIcons,
  TRICK_LEVELS,
  type TrickDifficulty,
} from "@/game/trick-levels";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";
import { getTrickDaily, getTrickStars, type TrickStars } from "@/utils/storage";

const GROUPS: TrickDifficulty[] = ["easy", "medium", "hard"];

export default function TricksScreen() {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useAppTheme();
  const { t } = useI18n();
  const [stars, setStars] = useState<TrickStars>({});
  const [daily, setDaily] = useState(0);
  /** Hinweis nach Tipp auf ein gesperrtes Level (welches zuerst schaffen). */
  const [lockHint, setLockHint] = useState<number | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  function showLocked(previous: number) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    setLockHint(previous);
    // VoiceOver (iPhone) liest die Pille sonst nicht vor
    AccessibilityInfo.announceForAccessibility(t("tricks.lockedHint", { n: previous }));
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setLockHint(null), 2600);
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTrickStars()
        .then((s) => active && setStars(s))
        .catch(() => undefined);
      getTrickDaily()
        .then((s) => active && setDaily(s))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );

  const total = TRICK_LEVELS.reduce((sum, l) => sum + (stars[l.id] ?? 0), 0);


  function open(id: number) {
    sfx("tap");
    tapHaptic();
    router.push({
      pathname: "/runde",
      params: { mode: "trick", level: String(id) },
    });
  }

  function openDaily() {
    sfx("tap");
    tapHaptic();
    router.push({ pathname: "/runde", params: { mode: "trick", daily: "1" } });
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + Spacing.md, Spacing.lg),
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <PageHeader title={t("tricks.title")} subtitle={t("tricks.subtitle")} emoji="🎯" />

        <FadeIn delay={60}>
          <AppText variant="label" tone="textSecondary">
            ★{" "}
            {t("tricks.progress", {
              stars: total,
              total: TRICK_LEVELS.length * 3,
            })}
          </AppText>
        </FadeIn>

        {/* Tages-Trick: jeden Tag neu, für alle gleich */}
        <FadeIn delay={70}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t("tricks.daily")}, ${daily} / 3 ★`}
            onPress={openDaily}
            style={({ pressed }) => [
              styles.daily,
              {
                backgroundColor: colors.surface,
                borderColor: daily === 3 ? "#F5B800" : colors.primary,
              },
              scheme === "light" && Shadow,
              pressed && press.pressedLarge,
            ]}
          >
            <Feather name="sun" size={26} color={colors.primary} />
            <View style={styles.flex}>
              <AppText variant="label">{t("tricks.daily")}</AppText>
              <AppText variant="caption" tone="textSecondary">
                {daily > 0
                  ? t("tricks.dailyStars", { stars: daily })
                  : t("tricks.dailyDesc")}
              </AppText>
            </View>
            <AppText style={styles.stars}>
              {[1, 2, 3].map((n) => (n <= daily ? "★" : "☆")).join("")}
            </AppText>
          </Pressable>
        </FadeIn>

        {GROUPS.map((group) => (
          <View key={group} style={styles.group}>
            <AppText variant="label" tone="textSecondary">
              {t(`tricks.${group}`)}
            </AppText>
            <View style={styles.grid}>
              {TRICK_LEVELS.filter((l) => difficultyOf(l) === group).map(
                (level) => {
                  const index = TRICK_LEVELS.indexOf(level);
                  const got = stars[level.id] ?? 0;
                  const unlocked =
                    index === 0 || (stars[TRICK_LEVELS[index - 1].id] ?? 0) > 0;
                  return (
                    <View key={level.id} style={styles.cell}>
                      <FadeIn delay={90 + index * 40}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !unlocked }}
                          accessibilityLabel={
                            unlocked
                              ? `${t("tricks.level", { n: level.id })}, ${got} / 3 ★`
                              : `${t("tricks.level", { n: level.id })}, ${t("tricks.locked")}`
                          }
                          onPress={() =>
                            unlocked ? open(level.id) : showLocked(TRICK_LEVELS[index - 1].id)
                          }
                          style={({ pressed }) => [
                            styles.tile,
                            {
                              backgroundColor: unlocked
                                ? colors.surface
                                : colors.surfaceAlt,
                              borderColor:
                                got === 3 ? "#F5B800" : colors.border,
                            },
                            scheme === "light" && unlocked && Shadow,
                            pressed && press.pressed,
                          ]}
                        >
                          {unlocked ? (
                            <>
                              <AppText variant="number">{level.id}</AppText>
                              {/* Was einen erwartet: Reifen, Windrad, Wind … */}
                              <AppText style={styles.icons} importantForAccessibility="no">
                                {levelIcons(level).join(" ")}
                              </AppText>
                              <AppText style={styles.stars}>
                                {[1, 2, 3]
                                  .map((n) => (n <= got ? "★" : "☆"))
                                  .join("")}
                              </AppText>
                            </>
                          ) : (
                            <Feather
                              name="lock"
                              size={22}
                              color={colors.textMuted}
                            />
                          )}
                        </Pressable>
                      </FadeIn>
                    </View>
                  );
                },
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Gesperrt angetippt: kurz erklären, statt nichts zu tun */}
      {lockHint !== null && (
        <View
          pointerEvents="none"
          style={[
            styles.lockHint,
            { bottom: insets.bottom + Spacing.lg, backgroundColor: colors.text },
          ]}
        >
          <Feather name="lock" size={16} color={colors.bg} />
          <AppText variant="label" color={colors.bg}>
            {t("tricks.lockedHint", { n: lockHint })}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lockHint: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
  },
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, gap: Spacing.md },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  icons: { fontSize: 13, lineHeight: 16 },
  group: { gap: Spacing.sm },
  daily: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  cell: { width: "23%", flexGrow: 1 },
  tile: {
    aspectRatio: 1,
    borderRadius: Radius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  stars: { color: "#F5B800", fontSize: 14, letterSpacing: 1 },
});
