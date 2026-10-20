// Datei: app/modi.tsx — Design v3 (Modus-Karten mit eigenen Hintergründen)

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { IconButton } from "@/components/ui/icon-button";
import { ModeBackdrop } from "@/components/ui/mode-backdrop";
import { ModeThemes } from "@/constants/mode-themes";
import { type ModeConfig, MODES, startGame } from "@/constants/modes";
import { Radius, Shadow, Spacing } from "@/constants/theme";
import { useAppTheme, useI18n } from "@/providers/app-settings";

export default function ModiScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t } = useI18n();

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Weiche Farbflecken hinter der Kopfzeile */}
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobA,
          { backgroundColor: colors.primarySoft },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobB,
          { backgroundColor: colors.goldSoft },
        ]}
      />

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
        <FadeIn>
          <View style={styles.header}>
            <IconButton
              icon="chevron-left"
              label={t("common.back")}
              onPress={handleBack}
            />

            <View style={styles.flex}>
              <AppText variant="title" accessibilityRole="header">
                {t("modes.title")}
              </AppText>

              <AppText tone="textSecondary">{t("modes.subtitle")}</AppText>
            </View>
          </View>
        </FadeIn>

        {MODES.map((item, index) => (
          <FadeIn key={item.mode} delay={60 + index * 70}>
            <ModeCard item={item} />
          </FadeIn>
        ))}

        <FadeIn delay={300}>
          <Card
            style={[styles.hintCard, { backgroundColor: colors.surfaceAlt }]}
          >
            <AppText variant="overline" tone="textMuted">
              {t("modes.howTo").toUpperCase()}
            </AppText>

            <HintRow icon="arrow-up" text={t("modes.swipeUp")} />
            <HintRow icon="target" text={t("modes.swipeLeft")} />
          </Card>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

function ModeCard({ item }: { item: ModeConfig }) {
  const { scheme } = useAppTheme();
  const { t } = useI18n();

  const theme = ModeThemes[scheme][item.mode];
  const title = t(item.titleKey);
  const desc = t(item.descKey);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${desc}`}
      onPress={() => startGame(item.mode)}
      style={({ pressed }) => [
        styles.modeCard,
        {
          borderColor: item.recommended ? theme.accent : "transparent",
          borderWidth: item.recommended ? 2 : 0,
        },
        scheme === "light" && Shadow,
        pressed && styles.pressed,
      ]}
    >
      <ModeBackdrop mode={item.mode} theme={theme} />

      <View style={[styles.modeIcon, { backgroundColor: theme.accent }]}>
        <Feather name={item.icon} size={28} color={theme.onAccent} />
      </View>

      <View style={styles.flex}>
        {item.recommended && (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <AppText variant="overline" color={theme.onAccent}>
              {t("mode.recommended").toUpperCase()}
            </AppText>
          </View>
        )}

        <AppText variant="heading" color={theme.text}>
          {title}
        </AppText>
        <AppText color={theme.textSecondary}>{desc}</AppText>
      </View>

      <View style={[styles.chevron, { backgroundColor: theme.accent }]}>
        <Feather name="chevron-right" size={22} color={theme.onAccent} />
      </View>
    </Pressable>
  );
}

function HintRow({
  icon,
  text,
}: {
  icon: "arrow-up" | "target";
  text: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.hintRow}>
      <View style={[styles.hintIcon, { backgroundColor: colors.surface }]}>
        <Feather name={icon} size={20} color={colors.text} />
      </View>

      <AppText style={styles.flex}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
  },

  blob: {
    position: "absolute",
    borderRadius: Radius.pill,
    opacity: 0.8,
  },
  blobA: { width: 260, height: 260, top: -110, right: -80 },
  blobB: { width: 180, height: 180, top: 60, left: -90 },

  content: {
    paddingHorizontal: Spacing.md + 4,
    gap: Spacing.md,
  },

  flex: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },

  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 132,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    overflow: "hidden",
  },

  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

  modeIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  chevron: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },

  hintCard: {
    gap: Spacing.md,
    borderWidth: 0,
    marginTop: Spacing.sm,
  },

  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },

  hintIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
