// Datei: components/ui/progress-bar.tsx
// Fortschrittsbalken (XP, Gegenstände im Regal, Sterne). Reine Anzeige, die
// Beschriftung liest VoiceOver vor.

import { StyleSheet, View } from "react-native";

import { Radius } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";

export function ProgressBar({
  value,
  color,
  height = 10,
  accessibilityLabel,
}: {
  /** 0 … 1 */
  value: number;
  color?: string;
  height?: number;
  accessibilityLabel?: string;
}) {
  const { colors } = useAppTheme();
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, backgroundColor: colors.surfaceAlt }]}
    >
      <View
        style={[
          styles.fill,
          { width: `${pct * 100}%`, backgroundColor: color ?? colors.primary },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: Radius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: Radius.pill },
});
