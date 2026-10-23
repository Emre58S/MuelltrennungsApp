// Datei: app/tutorial.tsx
// „So geht's“: Werfen, Tonnen (mit Freischalt-Level), Punkte und Modi.
// Inhalte kommen aus den echten Spieldaten, damit nichts veraltet.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { type ComponentProps, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { IconButton } from "@/components/ui/icon-button";
import { MODES, startGame } from "@/constants/modes";
import { Radius, Spacing } from "@/constants/theme";
import { ALL_BINS } from "@/game/bins";
import { FEVER_EVERY, FEVER_SECONDS } from "@/game/logic";
import { type TranslationKey } from "@/i18n";
import { useAppTheme, useI18n } from "@/providers/app-settings";

type IconName = ComponentProps<typeof Feather>["name"];

const BINS_BY_LEVEL = [...ALL_BINS].sort((a, b) => a.unlockLevel - b.unlockLevel);

export default function TutorialScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t } = useI18n();

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top + Spacing.md, Spacing.lg), paddingBottom: Spacing.xl },
        ]}
      >
        <FadeIn>
          <View style={styles.header}>
            <IconButton icon="chevron-left" label={t("common.back")} onPress={handleBack} />
            <View style={styles.flex}>
              <AppText variant="title" accessibilityRole="header">
                {t("home.tutorial")}
              </AppText>
              <AppText tone="textSecondary">{t("tutorial.subtitle")}</AppText>
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={60}>
          <Section title={t("tutorial.throw")}>
            <Card style={styles.list}>
              <Row icon="arrow-up" text={t("modes.swipeUp")} />
              <Row icon="target" text={t("modes.swipeLeft")} />
            </Card>
          </Section>
        </FadeIn>

        <FadeIn delay={120}>
          <Section title={t("tutorial.bins")} hint={t("tutorial.binsHint")}>
            {BINS_BY_LEVEL.map((bin) => (
              <View key={bin.key} style={[styles.bin, { backgroundColor: bin.color }]}>
                <AppText style={styles.binIcon}>{bin.icon}</AppText>
                <View style={styles.flex}>
                  <AppText variant="heading" color={bin.onColor}>
                    {t(bin.labelKey)}
                  </AppText>
                  <AppText variant="caption" color={bin.onColor}>
                    {t(`${bin.labelKey}.examples` as TranslationKey)}
                  </AppText>
                </View>
                {bin.unlockLevel > 1 && (
                  <View style={[styles.levelPill, { backgroundColor: colors.surface }]}>
                    <AppText variant="caption">
                      {t("tutorial.fromLevel", { level: bin.unlockLevel })}
                    </AppText>
                  </View>
                )}
              </View>
            ))}
          </Section>
        </FadeIn>

        <FadeIn delay={180}>
          <Section title={t("tutorial.points")}>
            <Card style={styles.list}>
              <Row icon="trending-up" title={t("tutorial.streak.title")} text={t("tutorial.streak.text")} />
              <Row icon="star" title={t("tutorial.perfect.title")} text={t("tutorial.perfect.text")} />
              <Row
                icon="zap"
                title={t("tutorial.fever.title")}
                text={t("tutorial.fever.text", { n: FEVER_EVERY, s: FEVER_SECONDS })}
              />
            </Card>
          </Section>
        </FadeIn>

        <FadeIn delay={240}>
          <Section title={t("tutorial.modes")}>
            <Card style={styles.list}>
              {MODES.map((m) => (
                <Row key={m.mode} icon={m.icon} title={t(m.titleKey)} text={t(m.descKey)} />
              ))}
            </Card>
          </Section>
        </FadeIn>

        <FadeIn delay={300}>
          <View style={[styles.tip, { backgroundColor: colors.primarySoft }]}>
            <AppText tone="onPrimarySoft">💡 {t("tutorial.tip")}</AppText>
          </View>
        </FadeIn>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.bg, borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
        <Button title={t("tutorial.play")} icon="play" size="lg" onPress={() => startGame("endless")} />
      </View>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" tone="textMuted" accessibilityRole="header">
        {title.toUpperCase()}
      </AppText>
      {hint && <AppText tone="textSecondary">{hint}</AppText>}
      {children}
    </View>
  );
}

function Row({ icon, title, text }: { icon: IconName; title?: string; text: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Feather name={icon} size={20} color={colors.text} />
      </View>
      <View style={styles.flex}>
        {title && <AppText variant="label">{title}</AppText>}
        <AppText tone={title ? "textSecondary" : "text"}>{text}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, gap: Spacing.lg },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  section: { gap: Spacing.sm },
  list: { gap: Spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  bin: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  binIcon: { fontSize: 28, lineHeight: 34 },
  levelPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  tip: { padding: Spacing.md, borderRadius: Radius.lg },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md + 4,
    paddingTop: Spacing.md,
  },
});
