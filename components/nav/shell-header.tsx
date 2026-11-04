// Datei: components/nav/shell-header.tsx
//
// Schmale Kopfzeile über den Bereichen: Level mit Fortschritt und Flamme links,
// rechts Hilfe (roter Punkt, solange die Anleitung ungesehen ist) und Einstellungen.

import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { press, tapHaptic } from "@/components/ui/press";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Radius, Spacing } from "@/constants/theme";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import type { FlameStatus } from "@/utils/streak";

export function ShellHeader({
  loaded,
  level,
  progress,
  streak,
  flame,
  seenTutorial,
  hint,
}: {
  loaded: boolean;
  level: number;
  /** 0 … 1 bis zum nächsten Level. */
  progress: number;
  streak: number;
  flame: FlameStatus;
  seenTutorial: boolean;
  /** Ein Hinweis (Flamme, Tagesaufgabe, Freund …); Tippen führt in den passenden Bereich. */
  hint?: { text: string; onPress: () => void } | null;
}) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const label = `${t("common.level")} ${level}, ${streak} ${t("home.daysInRow")}${
    flame === "atRisk" ? `. ${t("home.flameAtRisk")}` : ""
  }`;
  return (
    <View>
    <View style={[styles.row, { paddingTop: insets.top + Spacing.sm }]}>
      <View
        accessible
        accessibilityLabel={label}
        style={[styles.level, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.levelTop}>
          <AppText variant="label" numberOfLines={1}>
            Lv {loaded ? level : "—"}
          </AppText>
          {streak > 0 && (
            <AppText variant="caption" tone="textSecondary" numberOfLines={1}>
              {/* ⏳ = gestern Pause, heute spielen rettet die Flamme */}
              🔥 {streak}
              {flame === "atRisk" ? " ⏳" : ""}
            </AppText>
          )}
        </View>
        <ProgressBar value={progress} height={6} />
      </View>
      <View style={styles.spacer} />
      <View>
        <IconButton icon="help-circle" label={t("home.tutorial")} onPress={() => router.push("/tutorial")} />
        {loaded && !seenTutorial && <View style={styles.dot} />}
      </View>
      <IconButton icon="settings" label={t("home.settings")} onPress={() => router.push("/einstellung")} />
    </View>
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
  level: {
    // Kompakt statt den ganzen Platz zu füllen; der Rest bleibt frei bis zu den Knöpfen
    minWidth: 112,
    // Bei großer Systemschrift schrumpfen statt die Knöpfe aus dem Bild zu drücken
    flexShrink: 1,
    overflow: "hidden",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
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
