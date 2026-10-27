import { type ReactNode } from "react";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { Radius, Shadow, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";

import { press, tapHaptic } from "./press";

/** Fläche für zusammengehörige Inhalte. Mit onPress wird sie tippbar. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, scheme } = useAppTheme();

  const base = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
    scheme === "light" && Shadow,
  ];

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [base, pressed && press.pressedLarge, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
});
