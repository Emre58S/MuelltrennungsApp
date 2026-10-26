// Datei: app/tricks.tsx
// Level-Auswahl der Trickwürfe: Raster mit Sternen; ein Level wird frei,
// sobald das vorige geschafft ist.

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { FadeIn } from "@/components/ui/fade-in";
import { IconButton } from "@/components/ui/icon-button";
import { Radius, Shadow, Spacing } from "@/constants/theme";
import { TRICK_LEVELS } from "@/game/trick-levels";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";
import { getTrickStars, type TrickStars } from "@/utils/storage";

export default function TricksScreen() {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useAppTheme();
  const { t } = useI18n();
  const [stars, setStars] = useState<TrickStars>({});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTrickStars()
        .then((s) => active && setStars(s))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );

  const total = TRICK_LEVELS.reduce((sum, l) => sum + (stars[l.id] ?? 0), 0);

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function open(id: number) {
    sfx("tap");
    router.push({ pathname: "/runde", params: { mode: "trick", level: String(id) } });
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
        <FadeIn>
          <View style={styles.header}>
            <IconButton icon="chevron-left" label={t("common.back")} onPress={handleBack} />
            <View style={styles.flex}>
              <AppText variant="title" accessibilityRole="header">
                {t("tricks.title")}
              </AppText>
              <AppText tone="textSecondary">{t("tricks.subtitle")}</AppText>
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={60}>
          <AppText variant="label" tone="textSecondary">
            ★ {t("tricks.progress", { stars: total, total: TRICK_LEVELS.length * 3 })}
          </AppText>
        </FadeIn>

        <View style={styles.grid}>
          {TRICK_LEVELS.map((level, index) => {
            const got = stars[level.id] ?? 0;
            const unlocked = index === 0 || (stars[TRICK_LEVELS[index - 1].id] ?? 0) > 0;
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
                    disabled={!unlocked}
                    onPress={() => open(level.id)}
                    style={({ pressed }) => [
                      styles.tile,
                      {
                        backgroundColor: unlocked ? colors.surface : colors.surfaceAlt,
                        borderColor: got === 3 ? "#F5B800" : colors.border,
                      },
                      scheme === "light" && unlocked && Shadow,
                      pressed && styles.pressed,
                    ]}
                  >
                    {unlocked ? (
                      <>
                        <AppText variant="number">{level.id}</AppText>
                        <AppText style={styles.stars}>
                          {[1, 2, 3].map((n) => (n <= got ? "★" : "☆")).join("")}
                        </AppText>
                      </>
                    ) : (
                      <Feather name="lock" size={22} color={colors.textMuted} />
                    )}
                  </Pressable>
                </FadeIn>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, gap: Spacing.md },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
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
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
