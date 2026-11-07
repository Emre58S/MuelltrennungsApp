// Datei: components/ui/chest-icon.tsx
//
// Kleine Schatztruhe aus Flächen: gewölbter Deckel, Holzkörper, Goldbänder und Schloss.
// Mit `pulse` atmet sie leise (wenn etwas zum Öffnen wartet); „Weniger Bewegung“ hält sie still.

import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { useAppSettings } from "@/providers/app-settings";

const WOOD = "#9A5B2B";
const WOOD_DARK = "#6E3F1B";
const GOLD = "#F2B632";

export function ChestIcon({ size = 36, active = true, pulse }: { size?: number; active?: boolean; pulse?: boolean }) {
  const { reduceMotion } = useAppSettings();
  const [s] = useState(() => new Animated.Value(0));
  const running = !!pulse && !reduceMotion;
  useEffect(() => {
    if (!running) {
      s.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(s, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      s.setValue(0);
    };
  }, [running, s]);

  const scale = s.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const w = size;
  const lidH = Math.round(size * 0.4);
  const bodyH = Math.round(size * 0.42);
  const band = Math.max(3, Math.round(size * 0.14));
  const bandOffset = Math.round(size * 0.18);
  return (
    <Animated.View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={{ width: w, height: lidH + bodyH, opacity: active ? 1 : 0.5, transform: [{ scale }] }}
    >
      <View
        style={{
          height: lidH,
          backgroundColor: WOOD,
          borderTopLeftRadius: w / 2,
          borderTopRightRadius: w / 2,
          borderWidth: 1.5,
          borderColor: WOOD_DARK,
          overflow: "hidden",
        }}
      >
        <View style={[styles.band, { left: bandOffset, width: band, backgroundColor: GOLD }]} />
        <View style={[styles.band, { right: bandOffset, width: band, backgroundColor: GOLD }]} />
      </View>
      <View
        style={{
          height: bodyH,
          backgroundColor: WOOD,
          borderBottomLeftRadius: 5,
          borderBottomRightRadius: 5,
          borderWidth: 1.5,
          borderTopWidth: 0,
          borderColor: WOOD_DARK,
          overflow: "hidden",
        }}
      >
        <View style={[styles.band, { left: bandOffset, width: band, backgroundColor: GOLD }]} />
        <View style={[styles.band, { right: bandOffset, width: band, backgroundColor: GOLD }]} />
      </View>
      {/* Schloss auf der Naht */}
      <View
        style={{
          position: "absolute",
          top: lidH - Math.round(size * 0.11),
          alignSelf: "center",
          width: Math.round(size * 0.22),
          height: Math.round(size * 0.24),
          borderRadius: 3,
          backgroundColor: GOLD,
          borderWidth: 1.5,
          borderColor: WOOD_DARK,
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: { position: "absolute", top: 0, bottom: 0 },
});
