// Datei: components/ui/stamp-bar.tsx
// Stempelleiste für die Tagesmission: n Felder, erledigte tragen einen Stempel.
// Beschriftung kommt von außen (i18n), die Leiste kennt keine Texte.

import { StyleSheet, View } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";

import { AppText } from "./app-text";

export function StampBar({
  done,
  total = 3,
  color,
  accessibilityLabel,
}: {
  done: number;
  total?: number;
  /** Stempelfarbe (Standard: Gold wie Belohnungen). */
  color?: string;
  accessibilityLabel: string;
}) {
  const { colors } = useAppTheme();
  const stamp = color ?? colors.gold;
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const on = i < done;
        return (
          <View
            key={i}
            style={[
              styles.slot,
              on
                ? { backgroundColor: stamp, borderColor: stamp }
                : { backgroundColor: "transparent", borderColor: colors.border },
            ]}
          >
            <AppText style={styles.mark} color={on ? "#FFFFFF" : colors.textMuted}>
              {on ? "★" : "·"}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: Spacing.sm },
  slot: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  mark: { fontSize: 18, lineHeight: 22 },
});
