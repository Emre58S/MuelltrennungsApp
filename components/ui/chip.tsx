// Datei: components/ui/chip.tsx
// Kleine Pille für Stände und Nebenwege („🔥 4“, „Pfad“, „12/60“). Ohne onPress
// nur Anzeige, mit onPress ein Knopf (Tippfläche ≥ 44 durch hitSlop).

import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";

import { AppText } from "./app-text";
import { press, tapHaptic } from "./press";

export function Chip({
  label,
  icon,
  color,
  onColor,
  dot,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  /** Emoji oder Symbol links vom Text. */
  icon?: ReactNode;
  /** Füllfarbe (Standard: helle Fläche). */
  color?: string;
  /** Textfarbe auf `color`. */
  onColor?: string;
  /** Roter Punkt: hier wartet etwas Neues. */
  dot?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const bg = color ?? colors.surfaceAlt;
  const fg = onColor ?? colors.text;
  const body = (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: color ? bg : colors.border }]}>
      {typeof icon === "string" ? <AppText style={styles.icon}>{icon}</AppText> : icon}
      <AppText variant="label" color={fg} numberOfLines={1}>
        {label}
      </AppText>
      {dot && <View style={styles.dot} />}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel ?? label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={8}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => pressed && press.pressed}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs + 2,
    minHeight: 32,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  icon: { fontSize: 16, lineHeight: 20 },
  dot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#FF4D4D",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
