// Datei: app/belohnungen.tsx — Belohnungen
//
// Wurfspuren, die man mit Trick-Sternen oder dem XP-Level freischaltet
// (game/rewards.ts). Freie Spuren lassen sich antippen und gelten dann für
// alle Würfe; gesperrte zeigen, was noch fehlt.

import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { FadeIn } from "@/components/ui/fade-in";
import { PageHeader } from "@/components/ui/page-header";
import { press, tapHaptic } from "@/components/ui/press";
import { Radius, Shadow, Spacing } from "@/constants/theme";
import { isUnlocked, type Progress, type TrailId, TRAILS, usableTrail } from "@/game/rewards";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";
import { getRewardProgress, getTrail, saveTrail } from "@/utils/storage";

/** Vorschau-Farben je Spur (wie sie im Spiel ungefähr aussehen). */
const SWATCH: Record<TrailId, string[]> = {
  standard: ["#FFFFFF", "#FFFFFF", "#FFFFFF"],
  gold: ["#FFE89A", "#FFD54A", "#FFB300"],
  komet: ["#5AA9FF", "#9CCBFF", "#FFFFFF"],
  regenbogen: ["#FF5A5F", "#FFB347", "#FFD54A", "#3DDC97", "#4D9DE0", "#B57EDC"],
  konfetti: ["#FF5A5F", "#FFD54A", "#3DDC97", "#4D9DE0", "#B57EDC"],
  polarlicht: ["#3DDC97", "#38BDF8", "#8B5CF6"],
};

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useAppTheme();
  const { t } = useI18n();
  const [progress, setProgress] = useState<Progress>({ stars: 0, level: 0 });
  const [selected, setSelected] = useState<TrailId>("standard");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getRewardProgress(), getTrail()])
        .then(([p, id]) => {
          if (!active) return;
          setProgress(p);
          setSelected(usableTrail(id, p));
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );


  function choose(id: TrailId) {
    sfx("tap");
    tapHaptic();
    setSelected(id);
    saveTrail(id).catch(() => undefined);
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
        <PageHeader title={t("reward.title")} subtitle={t("reward.subtitle")} emoji="🎁" />

        <FadeIn delay={60}>
          <AppText variant="label" tone="textSecondary">
            {t("reward.progress", { stars: progress.stars, level: progress.level })}
          </AppText>
        </FadeIn>

        {TRAILS.map((reward, index) => {
          const open = isUnlocked(reward, progress);
          const active = open && selected === reward.id;
          const need =
            reward.stars !== undefined
              ? t("reward.needStars", { n: reward.stars })
              : reward.level !== undefined
                ? t("reward.needLevel", { n: reward.level })
                : "";
          return (
            <FadeIn key={reward.id} delay={90 + index * 40}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !open, selected: active }}
                accessibilityLabel={`${t(reward.name)}${open ? "" : `, ${need}`}`}
                disabled={!open}
                onPress={() => choose(reward.id)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: open ? colors.surface : colors.surfaceAlt,
                    borderColor: active ? colors.primary : colors.border,
                  },
                  scheme === "light" && open && Shadow,
                  pressed && press.pressedLarge,
                ]}
              >
                {/* Kleine Spur als Vorschau: Punkte werden zum Kopf hin größer */}
                <View style={[styles.swatch, { opacity: open ? 1 : 0.35 }]}>
                  {SWATCH[reward.id].map((color, i, all) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: color,
                          borderColor: colors.border,
                          width: 8 + (i / all.length) * 10,
                          height: 8 + (i / all.length) * 10,
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.flex}>
                  <AppText variant="label">{t(reward.name)}</AppText>
                  <AppText variant="caption" tone={active ? "primary" : "textSecondary"}>
                    {active ? t("reward.selected") : open ? " " : need}
                  </AppText>
                </View>
                {open ? (
                  active && <Feather name="check-circle" size={24} color={colors.primary} />
                ) : (
                  <Feather name="lock" size={20} color={colors.textMuted} />
                )}
              </Pressable>
            </FadeIn>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, gap: Spacing.md },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
    minHeight: 64,
  },
  swatch: { width: 96, flexDirection: "row", alignItems: "center", gap: 3 },
  dot: { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
