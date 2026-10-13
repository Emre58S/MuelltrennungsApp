import { StyleSheet, Text, View } from "react-native";

import { BinColors, type BinKey } from "@/constants/theme";

/** Kleine gezeichnete Mülltonne mit Symbol – Farbe UND Symbol,
 *  damit sie auch ohne Farbsehen erkennbar ist. */
export function BinIcon({ bin, size = 56 }: { bin: BinKey; size?: number }) {
  const { fill, icon } = BinColors[bin];
  const w = size * 0.72;

  return (
    <View
      style={{ alignItems: "center" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.lid,
          { width: w + size * 0.12, height: size * 0.12, backgroundColor: fill },
        ]}
      />
      <View
        style={[
          styles.body,
          {
            width: w,
            height: size * 0.82,
            backgroundColor: fill,
            borderBottomLeftRadius: size * 0.14,
            borderBottomRightRadius: size * 0.14,
          },
        ]}
      >
        <View style={[styles.badge, { width: w * 0.66, height: w * 0.66 }]}>
          <Text style={{ fontSize: w * 0.38 }} allowFontScaling={false}>
            {icon}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lid: { borderRadius: 4, marginBottom: 2 },
  body: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
});
