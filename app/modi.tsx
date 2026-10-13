// Datei: app/modi.tsx — Design v2
//
// Drei große, klar unterscheidbare Karten. „Üben“ steht oben und ist
// empfohlen: erst ohne Druck lernen, dann steigern.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { IconButton } from "@/components/ui/icon-button";
import { type GameMode, MODES, startGame } from "@/constants/modes";
import { Radius, Spacing, type ThemeColors } from "@/constants/theme";
import { useAppTheme, useI18n } from "@/providers/app-settings";

/** Akzent pro Modus – aus dem Theme, damit hell/dunkel stimmen. */
function modeColors(mode: GameMode, c: ThemeColors) {
  switch (mode) {
    case "endless":
      return { bg: c.primarySoft, fg: c.onPrimarySoft };
    case "survival":
      return { bg: c.infoSoft, fg: c.info };
    case "time":
      return { bg: c.goldSoft, fg: c.onGoldSoft };
  }
}

export default function ModiScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t } = useI18n();

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
        <FadeIn>
          <View style={styles.header}>
            <IconButton
              icon="chevron-left"
              label={t("common.back")}
              onPress={() => router.back()}
            />
            <View style={styles.flex}>
              <AppText variant="title" accessibilityRole="header">
                {t("modes.title")}
              </AppText>
              <AppText tone="textSecondary">{t("modes.subtitle")}</AppText>
            </View>
          </View>
        </FadeIn>

        {MODES.map((item, index) => {
          const accent = modeColors(item.mode, colors);
          const title = t(item.titleKey);
          const desc = t(item.descKey);

          return (
            <FadeIn key={item.mode} delay={60 + index * 60}>
              <Card
                onPress={() => startGame(item.mode)}
                accessibilityLabel={`${title}. ${desc}`}
                style={[
                  styles.modeCard,
                  item.recommended && {
                    borderColor: colors.primary,
                    borderWidth: 2,
                  },
                ]}
              >
                <View style={[styles.modeIcon, { backgroundColor: accent.bg }]}>
                  <Feather name={item.icon} size={28} color={accent.fg} />
                </View>

                <View style={styles.flex}>
                  {item.recommended && (
                    <View
                      style={[styles.badge, { backgroundColor: colors.primary }]}
                    >
                      <AppText variant="overline" tone="onPrimary">
                        {t("mode.recommended").toUpperCase()}
                      </AppText>
                    </View>
                  )}
                  <AppText variant="heading">{title}</AppText>
                  <AppText tone="textSecondary">{desc}</AppText>
                </View>

                <Feather name="chevron-right" size={24} color={colors.textMuted} />
              </Card>
            </FadeIn>
          );
        })}

        {/* Steuerung */}
        <FadeIn delay={260}>
          <Card style={[styles.hintCard, { backgroundColor: colors.surfaceAlt }]}>
            <AppText variant="overline" tone="textMuted">
              {t("modes.howTo").toUpperCase()}
            </AppText>
            <HintRow icon="arrow-up" text={t("modes.swipeUp")} />
            <HintRow icon="arrow-left" text={t("modes.swipeLeft")} />
          </Card>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

function HintRow({
  icon,
  text,
}: {
  icon: "arrow-up" | "arrow-left";
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
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, gap: Spacing.md },
  flex: { flex: 1 },

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
    paddingVertical: Spacing.lg,
  },
  modeIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
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

  hintCard: { gap: Spacing.md, borderWidth: 0, marginTop: Spacing.sm },
  hintRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  hintIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
