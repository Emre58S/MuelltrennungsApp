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
import { useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";

/** Himmel wie in der Spielszene (components/game/stage.tsx → LIGHT). */
const SKY = ["#4FA9E6", "#74C3F2", "#A9DCF5"] as const;

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export function PageHeader({
  title,
  subtitle,
  emoji,
  onBack = goBack,
  area,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Großes Symbol rechts oben (z. B. „🏆“). */
  emoji: string;
  onBack?: () => void;
  /** Bereichsfarbe (Pfad/Online/Regal) statt Himmel-Blau. */
  area?: Area;
  /** Zusätzlicher Inhalt unten in der Karte (z. B. Fortschritt). */
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const ink = area?.on ?? "#FFFFFF";
  return (
    <FadeIn>
      <LinearGradient colors={area?.sky ?? SKY} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* Weiche Wolken als Deko */}
        <View pointerEvents="none" style={[styles.cloud, styles.cloudA]} />
        <View pointerEvents="none" style={[styles.cloud, styles.cloudB]} />

        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            hitSlop={8}
            onPress={() => {
              sfx("tap");
              tapHaptic();
              onBack();
            }}
            style={({ pressed }) => [styles.back, pressed && press.pressed]}
          >
            <Feather name="chevron-left" size={24} color={ink} />
          </Pressable>
          <View style={styles.badge} importantForAccessibility="no" accessibilityElementsHidden>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
        </View>

        <AppText variant="title" color={ink} accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText color={ink} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
        {children}
      </LinearGradient>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg + 6,
    padding: Spacing.md + 4,
    gap: Spacing.xs,
    overflow: "hidden",
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  emoji: { fontSize: 30 },
  title: {
    textShadowColor: "rgba(20,60,100,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: { lineHeight: 22 },
  cloud: { position: "absolute", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999 },
  cloudA: { width: 160, height: 60, right: -30, bottom: 14 },
  cloudB: { width: 110, height: 44, right: 70, bottom: -14 },
});
