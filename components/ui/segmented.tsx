import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { Radius, TOUCH_MIN } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";

import { AppText } from "./app-text";

/** Auswahl aus wenigen Optionen (z. B. Wie Gerät / Hell / Dunkel). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  color,
  onColor,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Farbe des gewählten Reiters (Standard: Grün), z. B. Bereichsfarbe. */
  color?: string;
  /** Schriftfarbe auf `color`. */
  onColor?: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.wrap, { backgroundColor: colors.surfaceAlt }]}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onChange(opt.value);
            }}
            style={[
              styles.option,
              selected && { backgroundColor: color ?? colors.primary },
            ]}
          >
            <AppText
              variant="label"
              tone={selected && !onColor ? "onPrimary" : "textSecondary"}
              color={selected && onColor ? onColor : undefined}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", borderRadius: Radius.lg, padding: 4, gap: 4 },
  option: {
    flex: 1,
    minHeight: TOUCH_MIN - 4,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
});
