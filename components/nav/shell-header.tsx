// Datei: components/nav/shell-header.tsx
//
// Schmale Kopfzeile über den Bereichen: Level mit Fortschritt und Flamme links,
// rechts Hilfe (roter Punkt, solange die Anleitung ungesehen ist) und Einstellungen.

import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { tone } from "@/components/ui/chunky";
import { IconButton } from "@/components/ui/icon-button";
import { press, tapHaptic } from "@/components/ui/press";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { useShell } from "@/components/nav/shell-context";
import { Radius, Spacing } from "@/constants/theme";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import type { FlameStatus } from "@/utils/streak";

export function ShellHeader({
  loaded,
  level,
  progress,
  xpRemaining,
  streak,
  flame,
  seenTutorial,
  stars,
  hint,
}: {
  loaded: boolean;
  level: number;
  /** 0 … 1 bis zum nächsten Level. */
  progress: number;
  /** XP bis zum nächsten Level. */
  xpRemaining: number;
  streak: number;
  flame: FlameStatus;
  seenTutorial: boolean;
  /** Gesammelte Kampagnen-Sterne. */
  stars: number;
  /** Ein Hinweis (Flamme, Tagesaufgabe, Freund …); Tippen führt in den passenden Bereich. */
  hint?: { text: string; onPress: () => void } | null;
}) {
  const { colors } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  // Level-Aufstieg: Abzeichen poppt kurz auf (nicht beim ersten Laden, nur wenn es wirklich steigt)
  const [pop] = useState(() => new Animated.Value(1));
  const seenLevel = useRef<number | null>(null);
  useEffect(() => {
    if (!loaded) return;
    const before = seenLevel.current;
    seenLevel.current = level;
    if (before === null || level <= before || reduceMotion) return;
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.55, duration: 160, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 3, tension: 140, useNativeDriver: true }),
    ]).start();
  }, [loaded, level, reduceMotion, pop]);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const shell = useShell();
  /** Welches Blatt ist offen (Tippen auf Level oder Flamme)? */
  const [info, setInfo] = useState<"level" | "flame" | null>(null);
  const GOLD = "#F2B632";
  const label = `${t("common.level")} ${level}, ${streak} ${t("home.daysInRow")}${
    flame === "atRisk" ? `. ${t("home.flameAtRisk")}` : ""
  }`;
  return (
    <View>
    <View style={[styles.row, { paddingTop: insets.top + Spacing.sm }]}>
      {/* Links: Level-Abzeichen mit Fortschrittsbalken (wie die Spielerkarte bei Clash Royale) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t("header.level.hint")}
        onPress={() => {
          tapHaptic();
          setInfo("level");
        }}
        style={({ pressed }) => [styles.levelWrap, pressed && press.pressed]}
      >
        <Animated.View style={[styles.badge, { backgroundColor: GOLD, borderColor: tone(GOLD, -0.35), transform: [{ scale: pop }] }]}>
          <AppText variant="label" color="#3A2A00" style={styles.badgeText}>
            {loaded ? level : "–"}
          </AppText>
        </Animated.View>
        <View style={[styles.xp, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ProgressBar value={progress} height={10} />
        </View>
      </Pressable>
      <View style={styles.spacer} />
      {/* Mitte/rechts: Stand-Pillen (Flamme, Sterne) wie die Währungen bei Duolingo */}
      {streak > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${streak} ${t("home.daysInRow")}${flame === "atRisk" ? `. ${t("home.flameAtRisk")}` : ""}`}
          accessibilityHint={t("header.flame.hint")}
          hitSlop={4}
          onPress={() => {
            tapHaptic();
            setInfo("flame");
          }}
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: colors.surface, borderColor: flame === "atRisk" ? colors.warning : colors.border },
            pressed && press.pressed,
          ]}
        >
          <AppText variant="label" numberOfLines={1}>
            🔥 {streak}
            {flame === "atRisk" ? " ⏳" : ""}
          </AppText>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${stars} ${t("common.stars")}`}
        accessibilityHint={t("header.stars.hint")}
        hitSlop={4}
        onPress={() => {
          tapHaptic();
          if (shell.inShell) shell.goArea("regal", "rewards");
          else router.push("/belohnungen");
        }}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && press.pressed,
        ]}
      >
        <AppText variant="label" numberOfLines={1}>
          ⭐ {stars}
        </AppText>
      </Pressable>
      <View>
        <IconButton icon="help-circle" label={t("home.tutorial")} onPress={() => router.push("/tutorial")} style={styles.small} />
        {loaded && !seenTutorial && <View style={styles.dot} />}
      </View>
      <IconButton icon="settings" label={t("home.settings")} onPress={() => router.push("/einstellung")} style={styles.small} />
    </View>
    <Sheet
      visible={info !== null}
      title={info === "flame" ? t("header.flame.title", { n: streak }) : t("header.level.title", { n: level })}
      onClose={() => setInfo(null)}
    >
      {info === "flame" ? (
        <AppText tone="textSecondary">
          {flame === "atRisk" ? t("header.flame.risk") : t("header.flame.desc")}
        </AppText>
      ) : (
        <>
          <ProgressBar value={progress} height={12} />
          <AppText tone="textSecondary">{t("header.level.desc", { xp: xpRemaining, next: level + 1 })}</AppText>
        </>
      )}
    </Sheet>
    {hint && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hint.text}
        onPress={() => {
          tapHaptic();
          hint.onPress();
        }}
        style={({ pressed }) => [
          styles.hint,
          { backgroundColor: colors.goldSoft },
          pressed && press.pressed,
        ]}
      >
        <AppText variant="caption" color={colors.onGoldSoft} numberOfLines={3}>
          {hint.text}
        </AppText>
      </Pressable>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md + 4,
    paddingBottom: Spacing.sm,
  },
  levelWrap: { flexDirection: "row", alignItems: "center", flexShrink: 1, minWidth: 96, minHeight: 44 },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  badgeText: { fontWeight: "800", fontSize: 17, lineHeight: 22 },
  // Balken schiebt sich unter das Abzeichen
  xp: {
    flexShrink: 1,
    minWidth: 60,
    maxWidth: 84,
    marginLeft: -14,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  pill: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 2,
  },
  small: { width: 40, height: 40, borderRadius: 20 },
  spacer: { flex: 1 },
  hint: {
    marginHorizontal: Spacing.md + 4,
    marginBottom: Spacing.sm,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  levelTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  dot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#FF4D4D",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
