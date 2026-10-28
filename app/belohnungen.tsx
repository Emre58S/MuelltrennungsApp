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
import {
  BIN_SKINS,
  type BinSkinId,
  isUnlocked,
  type Progress,
  type TrailId,
  TRAILS,
  usableSkin,
  usableTrail,
} from "@/game/rewards";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";
import { getBinSkin, getRewardProgress, getTrail, saveBinSkin, saveTrail } from "@/utils/storage";

/** Vorschau der Tonnen-Sticker: Zeichen + Farbe. */
const SKIN_PREVIEW: Record<BinSkinId, { glyph: string; color: string }> = {
  keiner: { glyph: "–", color: "#9AA3AC" },
  stern: { glyph: "★", color: "#FFC93C" },
  herz: { glyph: "♥", color: "#FF5C8A" },
  punkte: { glyph: "•••", color: "#9AA3AC" },
};

/** Vorschau-Farben je Spur (wie sie im Spiel ungefähr aussehen). */
const SWATCH: Record<TrailId, string[]> = {
  standard: ["#FFFFFF", "#FFFFFF", "#FFFFFF"],
  gold: ["#FFE89A", "#FFD54A", "#FFB300"],
  komet: ["#5AA9FF", "#9CCBFF", "#FFFFFF"],
  regenbogen: ["#FF5A5F", "#FFB347", "#FFD54A", "#3DDC97", "#4D9DE0", "#B57EDC"],
  konfetti: ["#FF5A5F", "#FFD54A", "#3DDC97", "#4D9DE0", "#B57EDC"],
  polarlicht: ["#3DDC97", "#38BDF8", "#8B5CF6"],
  herbstlaub: ["#9C5B2E", "#C94A2A", "#E8772E", "#F2B134"],
  seifenblasen: ["#B9F3F0", "#D9CCFF", "#FFD1EC"],
  funken: ["#FF9F1C", "#FFD54A", "#FFFFFF"],
  sternenstaub: ["#5B4BC4", "#FFFFFF", "#7A6AE0", "#FFFFFF"],
};

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useAppTheme();
  const { t } = useI18n();
  const [progress, setProgress] = useState<Progress>({ stars: 0, level: 0 });
  const [selected, setSelected] = useState<TrailId>("standard");
  const [skin, setSkin] = useState<BinSkinId>("keiner");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getRewardProgress(), getTrail(), getBinSkin()])
        .then(([p, id, savedSkin]) => {
          if (!active) return;
          setProgress(p);
          setSelected(usableTrail(id, p));
          setSkin(usableSkin(savedSkin, p));
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

  function chooseSkin(id: BinSkinId) {
    sfx("tap");
    tapHaptic();
    setSkin(id);
    saveBinSkin(id).catch(() => undefined);
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
                    {active ? t("reward.selected") : open ? t("reward.tapToSelect") : need}
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

        {/* Tonnen-Sticker: kleiner Aufkleber vorn auf allen Tonnen */}
        <AppText variant="heading" accessibilityRole="header" style={styles.section}>
          {t("reward.skinsTitle")}
        </AppText>
        {BIN_SKINS.map((reward, index) => {
          const open = isUnlocked(reward, progress);
          const active = open && skin === reward.id;
          const need =
            reward.stars !== undefined
              ? t("reward.needStars", { n: reward.stars })
              : reward.level !== undefined
                ? t("reward.needLevel", { n: reward.level })
                : "";
          const preview = SKIN_PREVIEW[reward.id];
          return (
            <FadeIn key={reward.id} delay={90 + (TRAILS.length + index) * 40}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !open, selected: active }}
                accessibilityLabel={`${t("reward.skinsTitle")}: ${t(reward.name)}${open ? "" : `, ${need}`}`}
                disabled={!open}
                onPress={() => chooseSkin(reward.id)}
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
                <View style={[styles.swatch, { opacity: open ? 1 : 0.35 }]}>
                  <AppText style={[styles.skinGlyph, { color: preview.color }]}>{preview.glyph}</AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="label">{t(reward.name)}</AppText>
                  <AppText variant="caption" tone={active ? "primary" : "textSecondary"}>
                    {active ? t("reward.selected") : open ? t("reward.tapToSelect") : need}
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
  section: { marginTop: Spacing.md },
  skinGlyph: { fontSize: 26, lineHeight: 32 },
});
