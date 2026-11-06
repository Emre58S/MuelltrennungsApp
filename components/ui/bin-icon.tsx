// Datei: components/ui/bin-icon.tsx
// Kleine Tonne aus Flächen (ohne Bild/SVG): Deckel mit Griff, Körper mit zwei
// Rippen. Beim Erhöhen von `wiggle` wackelt sie kurz.

import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export function BinIcon({
  color,
  size = 30,
  wiggle = 0,
  reduceMotion,
  glyph,
  glyphColor = "#FFFFFF",
}: {
  color: string;
  size?: number;
  /** Zähler: jede Erhöhung löst ein kurzes Wackeln aus. */
  wiggle?: number;
  reduceMotion?: boolean;
  /** Aufkleber vorn auf dem Körper (z. B. „★“) – für die Tonnen-Sticker in den Belohnungen. */
  glyph?: string;
  glyphColor?: string;
}) {
  const [tilt] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (wiggle === 0 || reduceMotion) return;
    Animated.sequence([
      Animated.timing(tilt, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(tilt, { toValue: -1, duration: 110, useNativeDriver: true }),
      Animated.timing(tilt, { toValue: 0.5, duration: 90, useNativeDriver: true }),
      Animated.timing(tilt, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [wiggle, reduceMotion, tilt]);

  const rotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ["-9deg", "9deg"] });
  const lidH = Math.max(4, Math.round(size * 0.16));
  const bodyW = Math.round(size * 0.74);
  const rib = Math.max(2, Math.round(size * 0.07));
  return (
    <Animated.View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={[styles.box, { width: size, height: size, transform: [{ rotate }] }]}
    >
      <View
        style={{
          width: Math.round(size * 0.3),
          height: Math.max(3, Math.round(size * 0.1)),
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: size,
          height: lidH,
          borderRadius: lidH / 2,
          backgroundColor: color,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.28)",
        }}
      />
      <View
        style={{
          width: bodyW,
          flex: 1,
          marginTop: 1,
          borderBottomLeftRadius: Math.round(size * 0.14),
          borderBottomRightRadius: Math.round(size * 0.14),
          backgroundColor: color,
          borderWidth: 1,
          borderTopWidth: 0,
          borderColor: "rgba(0,0,0,0.28)",
          flexDirection: "row",
          justifyContent: "space-evenly",
          paddingVertical: Math.round(size * 0.1),
        }}
      >
        <View style={{ width: rib, borderRadius: rib, backgroundColor: "rgba(255,255,255,0.4)" }} />
        <View style={{ width: rib, borderRadius: rib, backgroundColor: "rgba(255,255,255,0.4)" }} />
        {glyph ? (
          <View pointerEvents="none" style={styles.glyphWrap}>
            <Text style={{ color: glyphColor, fontSize: glyph.length > 1 ? size * 0.2 : size * 0.38, fontWeight: "800" }}>
              {glyph}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center" },
  glyphWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
});
