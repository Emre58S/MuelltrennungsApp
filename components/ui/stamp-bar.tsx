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
  size = 34,
  accessibilityLabel,
}: {
  done: number;
  total?: number;
  /** Stempelfarbe (Standard: Gold wie Belohnungen). */
  color?: string;
  /** Durchmesser eines Stempels. */
  size?: number;
  /** Fehlt sie, ist die Leiste reine Deko (die Umgebung beschreibt den Stand). */
  accessibilityLabel?: string;
}) {
  const { colors, scheme } = useAppTheme();
  const stamp = color ?? colors.gold;
  // Gold ist im Hellmodus dunkel (weißer Stern), im Dunkelmodus hell (dunkler Stern)
  const star = (color || scheme === "light") ? "#FFFFFF" : "#2B1D00";
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? "auto" : "no-hide-descendants"}
      accessibilityElementsHidden={!accessibilityLabel}
      style={styles.row}
    >
      {Array.from({ length: total }, (_, i) => {
        const on = i < done;
        return (
          <View
            key={i}
            style={[
              styles.slot,
              { width: size, height: size },
              on
                ? { backgroundColor: stamp, borderColor: stamp }
                : { backgroundColor: "transparent", borderColor: colors.border },
            ]}
          >
            <AppText style={[styles.mark, { fontSize: Math.round(size * 0.53), lineHeight: Math.round(size * 0.65) }]} color={on ? star : colors.textMuted}>
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
