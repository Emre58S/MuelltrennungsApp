import { Feather } from "@expo/vector-icons";
import { type ComponentProps } from "react";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { Radius, Spacing, TOUCH_MIN } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";

import { AppText } from "./app-text";
import { press, tapHaptic } from "./press";

type Variant = "primary" | "secondary" | "ghost";

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: "md" | "lg";
  icon?: ComponentProps<typeof Feather>["name"];
  iconPosition?: "start" | "end";
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "start",
  accessibilityHint,
  style,
  disabled,
}: ButtonProps) {
  const { colors } = useAppTheme();

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.primarySoft
        : "transparent";
  const bgPressed =
    variant === "primary"
      ? colors.primaryPressed
      : variant === "secondary"
        ? colors.primarySoft
        : colors.surfaceAlt;
  const fg =
    variant === "primary"
      ? colors.onPrimary
      : variant === "secondary"
        ? colors.onPrimarySoft
        : colors.text;

  const iconEl = icon ? (
    <Feather name={icon} size={size === "lg" ? 22 : 18} color={fg} />
  ) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        size === "lg" && styles.lg,
        { backgroundColor: pressed ? bgPressed : bg },
        variant === "ghost" && { borderWidth: 1, borderColor: colors.border },
        pressed && (size === "lg" ? press.pressedLarge : press.pressed),
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {iconPosition === "start" && iconEl}
        <AppText
          variant={size === "lg" ? "heading" : "label"}
          color={fg}
          numberOfLines={1}
        >
          {title}
        </AppText>
        {iconPosition === "end" && iconEl}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH_MIN,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  lg: { minHeight: 60, borderRadius: Radius.xl },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  disabled: { opacity: 0.5 },
});
