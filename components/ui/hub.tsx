// Datei: components/ui/hub.tsx
// Gemeinsamer Aufbau der drei Bereiche hinter den Menü-Tonnen (Kampagne,
// Online, Sammlung): Kopf wie die übrigen Unterseiten, darunter große Karten
// mit Symbol, Name, kurzer Zeile und rechts optional Rekord/Stand.

import { Feather } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { FadeIn } from "@/components/ui/fade-in";
import { PageHeader } from "@/components/ui/page-header";
import { press, tapHaptic } from "@/components/ui/press";
import { Radius, Shadow, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";

export function HubScreen({
  title,
  subtitle,
  emoji,
  children,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
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
        <PageHeader title={title} subtitle={subtitle} emoji={emoji} />
        {children}
      </ScrollView>
    </View>
  );
}

export function HubCard({
  emoji,
  color,
  title,
  desc,
  info,
  badge,
  dot,
  index,
  onPress,
}: {
  emoji: string;
  /** Farbe des Symbol-Kreises. */
  color: string;
  title: string;
  desc: string;
  /** Rechts klein, z. B. „🏆 1.240“ oder „✓ 9/10“. */
  info?: string | null;
  /** Kleines Schild über dem Namen, z. B. „Zuletzt“. */
  badge?: string | null;
  /** Roter Punkt: hier wartet etwas Neues. */
  dot?: boolean;
  /** Reihenfolge – für die gestaffelte Einblendung. */
  index: number;
  onPress: () => void;
}) {
  const { colors, scheme } = useAppTheme();
  return (
    <FadeIn delay={60 + index * 60}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[title, desc, info].filter(Boolean).join(". ")}
        onPress={() => {
          sfx("tap");
          tapHaptic();
          onPress();
        }}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: badge ? color : colors.border },
          scheme === "light" && Shadow,
          pressed && press.pressedLarge,
        ]}
      >
        <View style={[styles.icon, { backgroundColor: color }]}>
          <AppText style={styles.emoji}>{emoji}</AppText>
          {dot && <View style={styles.dot} />}
        </View>
        <View style={styles.flex}>
          {badge && (
            <View style={[styles.badge, { backgroundColor: color }]}>
              <AppText variant="overline" color="#FFFFFF">
                {badge.toUpperCase()}
              </AppText>
            </View>
          )}
          <AppText variant="heading">{title}</AppText>
          <AppText tone="textSecondary">{desc}</AppText>
          {info ? (
            <AppText variant="label" tone="textMuted" style={styles.info}>
              {info}
            </AppText>
          ) : null}
        </View>
        <Feather name="chevron-right" size={22} color={colors.textMuted} />
      </Pressable>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, gap: Spacing.md },
  flex: { flex: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 96,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 2,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 28, lineHeight: 34 },
  dot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#FF4D4D",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginBottom: 2,
  },
  info: { marginTop: 2 },
});
