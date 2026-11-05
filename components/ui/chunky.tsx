// Datei: components/ui/chunky.tsx
//
// „Dicker“ Knopf im Stil von Spielen (Duolingo, Clash Royale): farbige Fläche mit
// dunkler Unterkante, die beim Drücken einsinkt. Gemeinsamer Baustein für Pfad-
// Stationen, Schnellstart-Kacheln, „Weiter“ und die gewählte Reiter-Tonne.

import { type ReactNode } from "react";
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { tapHaptic } from "@/components/ui/press";
import { sfx } from "@/utils/sfx";

/** Hex-Farbe dunkler (amount < 0) oder heller (> 0) machen, −1 … 1. */
export function tone(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 255;
    const out = amount < 0 ? v * (1 + amount) : v + (255 - v) * amount;
    return Math.max(0, Math.min(255, Math.round(out)));
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

export function Chunky({
  color,
  edge,
  depth = 5,
  radius = 18,
  disabled,
  label,
  onPress,
  style,
  faceStyle,
  children,
}: {
  /** Farbe der Fläche. */
  color: string;
  /** Farbe der Unterkante (Standard: dunkler Ton der Fläche). */
  edge?: string;
  /** Dicke der Unterkante. */
  depth?: number;
  radius?: number;
  disabled?: boolean;
  /** Pflicht für Screenreader. */
  label: string;
  onPress?: () => void;
  /** Außen (Größe, Abstand). */
  style?: StyleProp<ViewStyle>;
  /** Innen (Ausrichtung, Abstand). */
  faceStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const edgeColor = edge ?? tone(color, -0.28);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={() => {
        sfx("tap");
        tapHaptic();
        onPress?.();
      }}
      style={style}
    >
      {({ pressed }) => (
        <View style={{ paddingBottom: depth, borderRadius: radius, backgroundColor: edgeColor }}>
          <View
            style={[
              styles.face,
              { backgroundColor: color, borderRadius: radius },
              // Gedrückt: Fläche sinkt auf die Unterkante
              pressed && { transform: [{ translateY: depth - 1 }] },
              faceStyle,
            ]}
          >
            {/* heller Rand oben – wirkt wie eine Wölbung */}
            <View pointerEvents="none" style={[styles.shine, { borderRadius: radius, backgroundColor: tone(color, 0.32) }]} />
            {children}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  shine: { position: "absolute", top: 2, left: 6, right: 6, height: 3, opacity: 0.55 },
});
