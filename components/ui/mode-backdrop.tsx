// Datei: components/ui/mode-backdrop.tsx
// Dekorative Hintergründe für die Modus-Karten. Nur Views + Animated,
// keine zusätzlichen Pakete. Bei „Weniger Bewegung“ stehen sie still.

import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { type ModeTheme } from "@/constants/mode-themes";
import { type GameMode } from "@/constants/modes";
import { useAppSettings } from "@/providers/app-settings";

/** Endlos-Schleife 0 → 1 → 0 (sanft), still bei reduceMotion. */
function useLoop(duration: number, reduceMotion: boolean) {
  const [value] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration, reduceMotion]);

  return value;
}

/** Endlos-Drehung (0 → 360°), still bei reduceMotion. */
function useSpin(duration: number, reduceMotion: boolean) {
  const [value] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration, reduceMotion]);

  return value.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
}

/* ── Üben: sanfte Wiese mit Hügeln und schwebenden Blättern ───── */

function Meadow({ t, reduceMotion }: { t: ModeTheme; reduceMotion: boolean }) {
  const drift = useLoop(3200, reduceMotion);
  const driftB = useLoop(4200, reduceMotion);

  const up = (range: number) =>
    drift.interpolate({ inputRange: [0, 1], outputRange: [0, -range] });
  const upB = (range: number) =>
    driftB.interpolate({ inputRange: [0, 1], outputRange: [0, -range] });

  return (
    <>
      {/* Hügel unten rechts */}
      <View
        style={[
          s.circle,
          {
            width: 220,
            height: 220,
            right: -70,
            bottom: -130,
            backgroundColor: t.deco1,
          },
        ]}
      />
      <View
        style={[
          s.circle,
          {
            width: 170,
            height: 170,
            right: 40,
            bottom: -120,
            backgroundColor: t.deco2,
          },
        ]}
      />
      {/* Blätter */}
      <Animated.View
        style={[
          s.leaf,
          {
            right: 26,
            top: 16,
            backgroundColor: t.deco2,
            transform: [{ translateY: up(6) }, { rotate: "-28deg" }],
          },
        ]}
      />
      <Animated.View
        style={[
          s.leaf,
          {
            right: 74,
            top: 44,
            width: 14,
            height: 14,
            backgroundColor: t.deco1,
            transform: [{ translateY: upB(8) }, { rotate: "18deg" }],
          },
        ]}
      />
      <Animated.View
        style={[
          s.leaf,
          {
            right: 118,
            top: 14,
            width: 12,
            height: 12,
            backgroundColor: t.deco2,
            transform: [{ translateY: upB(5) }, { rotate: "40deg" }],
          },
        ]}
      />
    </>
  );
}

/* ── Ohne Fehler: Schild-Radar mit pulsierenden Ringen ───────── */

function Shield({ t, reduceMotion }: { t: ModeTheme; reduceMotion: boolean }) {
  const pulse = useLoop(1800, reduceMotion);
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const BOX = 200;

  return (
    <View
      style={[
        s.anchor,
        { width: BOX, height: BOX, right: -44, marginTop: -BOX / 2 },
      ]}
    >
      <Animated.View style={[s.layer, { transform: [{ scale }] }]}>
        <View
          style={[s.ring, { width: 190, height: 190, borderColor: t.deco1 }]}
        />
      </Animated.View>
      <View style={s.layer}>
        <View
          style={[s.ring, { width: 136, height: 136, borderColor: t.deco2 }]}
        />
      </View>
      <View style={s.layer}>
        <View
          style={[
            s.ring,
            { width: 86, height: 86, borderColor: t.deco1, borderWidth: 8 },
          ]}
        />
      </View>
      <View style={s.layer}>
        <View
          style={[s.dot, { width: 38, height: 38, backgroundColor: t.deco2 }]}
        />
      </View>
    </View>
  );
}

/* ── Gegen die Zeit: Zifferblatt mit Strichen und Zeiger ─────── */

const TICKS = Array.from({ length: 12 }, (_, i) => i);

function ClockFace({
  t,
  reduceMotion,
}: {
  t: ModeTheme;
  reduceMotion: boolean;
}) {
  const spin = useSpin(12000, reduceMotion);
  const SIZE = 180;

  return (
    <View
      style={[
        s.anchor,
        { width: SIZE, height: SIZE, right: -40, marginTop: -SIZE / 2 },
      ]}
    >
      <View style={s.layer}>
        <View
          style={[
            s.dot,
            { width: SIZE, height: SIZE, backgroundColor: t.deco1 },
          ]}
        />
      </View>
      {TICKS.map((i) => (
        <View
          key={i}
          style={[
            s.layer,
            s.tickLayer,
            { transform: [{ rotate: `${i * 30}deg` }] },
          ]}
        >
          <View
            style={{
              width: i % 3 === 0 ? 6 : 3,
              height: i % 3 === 0 ? 16 : 10,
              borderRadius: 3,
              marginTop: 10,
              backgroundColor: t.deco2,
            }}
          />
        </View>
      ))}
      <Animated.View
        style={[s.layer, s.tickLayer, { transform: [{ rotate: spin }] }]}
      >
        <View
          style={{
            width: 5,
            height: SIZE / 2 - 24,
            marginTop: 24,
            borderRadius: 3,
            backgroundColor: t.accent,
            opacity: 0.55,
          }}
        />
      </Animated.View>
      <View style={s.layer}>
        <View
          style={[
            s.dot,
            { width: 14, height: 14, backgroundColor: t.accent, opacity: 0.55 },
          ]}
        />
      </View>
    </View>
  );
}

/* ── Hülle ───────────────────────────────────────────────────── */

export function ModeBackdrop({
  mode,
  theme,
}: {
  mode: GameMode;
  theme: ModeTheme;
}) {
  const { reduceMotion } = useAppSettings();

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {mode === "endless" && <Meadow t={theme} reduceMotion={reduceMotion} />}
      {mode === "survival" && <Shield t={theme} reduceMotion={reduceMotion} />}
      {mode === "time" && <ClockFace t={theme} reduceMotion={reduceMotion} />}
    </View>
  );
}

const s = StyleSheet.create({
  circle: { position: "absolute", borderRadius: 999 },
  dot: { borderRadius: 999 },
  ring: { borderRadius: 999, borderWidth: 6 },
  // Feste Box, vertikal zur Kartenmitte ausgerichtet
  anchor: { position: "absolute", top: "50%" },
  // Jede Ebene füllt die Box und zentriert ihren Inhalt
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  // Für Striche/Zeiger: oben ansetzen, um die Mitte drehen
  tickLayer: { justifyContent: "flex-start" },
  leaf: {
    position: "absolute",
    width: 20,
    height: 20,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 3,
  },
});
