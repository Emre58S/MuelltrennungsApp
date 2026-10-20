import { StyleSheet, View } from "react-native";

/**
 * Weicher Abdunkelungs-Verlauf (ohne Zusatzbibliothek), damit Text über
 * bewegten/hellen Hintergründen immer genug Kontrast hat (WCAG 1.4.3).
 */
export function Scrim({
  edge,
  height,
  maxOpacity,
  color = "8,18,14",
}: {
  edge: "top" | "bottom";
  height: number;
  maxOpacity: number;
  /** RGB als "r,g,b" */
  color?: string;
}) {
  const slices = 16;
  return (
    <View
      pointerEvents="none"
      style={[styles.base, edge === "top" ? { top: 0 } : { bottom: 0 }, { height }]}
    >
      {Array.from({ length: slices }).map((_, i) => {
        const t = edge === "top" ? 1 - i / (slices - 1) : i / (slices - 1);
        const eased = t * t * (3 - 2 * t); // smoothstep
        return (
          <View
            key={i}
            style={{ flex: 1, backgroundColor: `rgba(${color},${(maxOpacity * eased).toFixed(3)})` }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { position: "absolute", left: 0, right: 0 },
});
