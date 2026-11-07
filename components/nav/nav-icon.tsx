// Datei: components/nav/nav-icon.tsx
//
// Symbol der unteren Leiste: Pfad = Karte, Online = Globus, Regal = Buch – direkt auf dem Feld in
// der Bereichsfarbe (kein Hintergrund-Kreis). Beim Erhöhen von `wiggle` wackelt es kurz (Tippen).

import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import { type Area } from "@/constants/areas";

export function NavIcon({
  area,
  selected,
  wiggle,
  reduceMotion,
}: {
  area: Area;
  selected: boolean;
  wiggle: number;
  reduceMotion?: boolean;
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
  const rotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ["-12deg", "12deg"] });
  return (
    <Animated.View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={[styles.disc, { opacity: selected ? 1 : 0.65, transform: [{ rotate }, { scale: selected ? 1.12 : 1 }] }]}
    >
      <Feather name={area.icon} size={30} color={area.on} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disc: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
