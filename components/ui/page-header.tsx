// Datei: components/ui/page-header.tsx
// Einheitlicher Kopf der Unterseiten (Trickwürfe, Rangliste, Belohnungen,
// Sammelbuch, Einstellungen, Anleitung): Karte im Himmel-Verlauf des Spiels
// mit Zurück-Knopf, großem Symbol, Titel und Untertitel – damit sich jede
// Seite wie ein Teil der Spielwelt anfühlt statt wie eine nackte Liste.

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { FadeIn } from "@/components/ui/fade-in";
import { press, tapHaptic } from "@/components/ui/press";
import { type Area } from "@/constants/areas";
import { Radius, Spacing } from "@/constants/theme";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import { goHome } from "@/utils/nav";
import { sfx } from "@/utils/sfx";

/** Himmel wie in der Spielszene (components/game/stage.tsx → LIGHT). */
const SKY = ["#4FA9E6", "#74C3F2", "#A9DCF5"] as const;

function goBack() {
  if (router.canGoBack()) router.back();
  else goHome();
}

export function PageHeader({
  title,
  subtitle,
  emoji,
  onBack = goBack,
  area,
  hideBack,
  compact,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Großes Symbol rechts oben (z. B. „🏆“). */
  emoji: string;
  onBack?: () => void;
  /** Bereichsfarbe (Pfad/Online/Regal) statt Himmel-Blau. */
  area?: Area;
  /** Kein Zurück-Pfeil (Seite steht im Bereichs-Menü, hat nichts dahinter). */
  hideBack?: boolean;
  /** Eine schmale Zeile (Titel + Symbol) ohne Untertitel – für die Bereiche mit fester Leiste. */
  compact?: boolean;
  /** Zusätzlicher Inhalt unten in der Karte (z. B. Fortschritt). */
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const ink = area?.on ?? "#FFFFFF";
  if (compact) {
    return (
      <FadeIn>
        <LinearGradient
          colors={area?.sky ?? SKY}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactCard}
        >
          <AppText variant="title" color={ink} accessibilityRole="header" style={styles.compactTitle}>
            {title}
          </AppText>
          <View style={styles.compactBadge} importantForAccessibility="no" accessibilityElementsHidden>
            <Text style={styles.compactEmoji}>{emoji}</Text>
          </View>
        </LinearGradient>
      </FadeIn>
    );
  }
  // Schlicht (Nutzer, 6.11.: ruhig und hochwertig): Zurück-Knopf, Titel, Untertitel – ohne Himmel und Wolken
  return (
    <FadeIn>
      <View style={styles.calm}>
        <View style={styles.calmTop}>
          {hideBack ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              hitSlop={8}
              onPress={() => {
                sfx("tap");
                tapHaptic();
                onBack();
              }}
              style={({ pressed }) => [
                styles.calmBack,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && press.pressed,
              ]}
            >
              <Feather name="chevron-left" size={24} color={colors.text} />
            </Pressable>
          )}
          <View style={styles.calmText}>
            <AppText variant="title" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? <AppText tone="textSecondary">{subtitle}</AppText> : null}
          </View>
        </View>
        {children}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    borderRadius: Radius.lg + 6,
    paddingVertical: Spacing.sm + 2,
    paddingLeft: Spacing.md + 4,
    paddingRight: Spacing.sm + 2,
  },
  compactTitle: { flexShrink: 1 },
  compactBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  compactEmoji: { fontSize: 24 },
  calm: { gap: Spacing.sm },
  calmTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  calmBack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  calmText: { flex: 1, gap: 2 },
});
