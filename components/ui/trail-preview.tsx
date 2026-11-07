// Datei: components/ui/trail-preview.tsx
//
// Vorschau einer Wurfspur: die Punkte (zum Kopf hin größer) und eine kleine Tonne am Ende.
// Mit `animate` läuft ein Leuchten von hinten nach vorn über die Punkte, als flöge der Wurf
// in die Tonne – nur für die gewählte Spur, bei „Weniger Bewegung“ steht alles still.

import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { BinIcon } from "@/components/ui/bin-icon";
import { useAppSettings } from "@/providers/app-settings";

export function TrailPreview({
  dots,
  border,
  binColor,
  animate,
}: {
  /** Farben der Punkte, vom Anfang zum Kopf. */
  dots: string[];
  border: string;
  binColor: string;
  animate?: boolean;
}) {
  const { reduceMotion } = useAppSettings();
  const [t] = useState(() => new Animated.Value(0));
  const running = !!animate && !reduceMotion;
  useEffect(() => {
    if (!running) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(450),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      t.setValue(0);
    };
  }, [running, t]);

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {dots.map((color, i, all) => {
          const size = 8 + (i / all.length) * 10;
          // Das Leuchten erreicht Punkt i zur Zeit a (0,15 … 0,85)
          const a = 0.15 + (i / Math.max(1, all.length - 1)) * 0.7;
          const opacity = running
            ? t.interpolate({ inputRange: [0, a - 0.15, a, a + 0.15, 1], outputRange: [0.45, 0.45, 1, 0.45, 0.45] })
            : 1;
          const scale = running
            ? t.interpolate({ inputRange: [0, a - 0.15, a, a + 0.15, 1], outputRange: [1, 1, 1.5, 1, 1] })
            : 1;
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: color, borderColor: border, width: size, height: size, opacity, transform: [{ scale }] },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.bin}>
        <BinIcon color={binColor} size={30} reduceMotion />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 132, flexDirection: "row", alignItems: "center" },
  dots: { width: 92, flexDirection: "row", alignItems: "center", gap: 3 },
  dot: { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  bin: { marginLeft: 6 },
});
