// Datei: components/nav/nav-icon.tsx
//
// Symbol der unteren Leiste: Pfad = Karte, Online = Globus, Regal = Buch. Runde Platte im Spielstil
// (dunklere Unterkante, heller Glanz oben) in der Bereichsfarbe. Gewählt: federt kurz auf und leuchtet
// voll; sonst gedämpft. Beim Erhöhen von `wiggle` wackelt es kurz (Tippen).

import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { tone } from "@/components/ui/chunky";
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
  const [bounce] = useState(() => new Animated.Value(selected ? 1 : 0));
  const first = useRef(true);
  useEffect(() => {
    if (wiggle === 0 || reduceMotion) return;
    Animated.sequence([
      Animated.timing(tilt, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(tilt, { toValue: -1, duration: 110, useNativeDriver: true }),
      Animated.timing(tilt, { toValue: 0.5, duration: 90, useNativeDriver: true }),
      Animated.timing(tilt, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [wiggle, reduceMotion, tilt]);
  // Auswahl wechselt: gewählt federt auf, abgewählt schrumpft sanft zurück
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduceMotion) {
      bounce.setValue(selected ? 1 : 0);
      return;
    }
    Animated.spring(bounce, { toValue: selected ? 1 : 0, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, [selected, reduceMotion, bounce]);
  const rotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ["-12deg", "12deg"] });
  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  return (
    <Animated.View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={[
        styles.disc,
        {
          backgroundColor: area.fill,
          borderBottomColor: tone(area.fill, -0.32),
          opacity: selected ? 1 : 0.62,
          transform: [{ rotate }, { scale }],
        },
      ]}
    >
      <View pointerEvents="none" style={styles.shine} />
      <Feather name={area.icon} size={28} color={area.on} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  shine: {
    position: "absolute",
    top: 5,
    left: 10,
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
    transform: [{ rotate: "-25deg" }],
  },
});
