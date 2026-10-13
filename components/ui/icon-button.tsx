import { Feather } from "@expo/vector-icons";
import { type ComponentProps } from "react";
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from "react-native";

import { TOUCH_MIN } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";

/** Runder Icon-Button (48×48). Label ist Pflicht – für Screenreader. */
export function IconButton({
  icon,
  label,
  onPress,
  style,
}: {
  icon: ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Feather name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: TOUCH_MIN / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
