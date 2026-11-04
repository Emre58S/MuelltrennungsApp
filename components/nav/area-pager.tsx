// Datei: components/nav/area-pager.tsx
//
// Legt die Bereiche nebeneinander und lässt sie per Wischen wechseln. Die Seite
// folgt dem Finger; beim Loslassen gleitet sie (native Animation) zum nächsten
// Bereich oder zurück. Ein Bereich wird erst beim ersten Besuch aufgebaut und
// bleibt dann erhalten (Scroll-Stand, geladene Daten).

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

/** Ab dieser Strecke (Anteil der Breite) oder Geschwindigkeit wechselt der Bereich. */
const SWIPE_FRACTION = 0.22;
const SWIPE_VELOCITY = 650;
const SLIDE_MS = 240;
/** Am Rand (kein Nachbar) folgt die Seite dem Finger nur zu einem Teil. */
const EDGE_RESISTANCE = 0.25;

export function AreaPager({
  index,
  onIndexChange,
  reduceMotion,
  children,
}: {
  index: number;
  onIndexChange: (index: number) => void;
  reduceMotion?: boolean;
  /** Eine Seite je Bereich; als Funktion, damit sie erst beim Besuch entsteht. */
  children: (() => ReactNode)[];
}) {
  const { width } = useWindowDimensions();
  const count = children.length;
  const [pos] = useState(() => new Animated.Value(index));
  const [drag] = useState(() => new Animated.Value(0));
  const [visited, setVisited] = useState<number[]>([index]);
  // Neuer Bereich besucht → merken (abgeleiteter Stand, darum schon beim Rendern)
  if (!visited.includes(index)) setVisited([...visited, index]);

  const slideTo = useCallback(
    (target: number, animate: boolean) => {
      const ms = animate && !reduceMotion ? SLIDE_MS : 0;
      Animated.parallel([
        Animated.timing(pos, {
          toValue: target,
          duration: ms,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(drag, {
          toValue: 0,
          duration: ms,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [pos, drag, reduceMotion],
  );

  // Auch Tippen auf die Leiste (index von außen) gleitet hin
  useEffect(() => {
    slideTo(index, true);
  }, [index, slideTo]);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-16, 16])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      const i = index;
      const atEdge = (i === 0 && e.translationX > 0) || (i === count - 1 && e.translationX < 0);
      drag.setValue(atEdge ? e.translationX * EDGE_RESISTANCE : e.translationX);
    })
    .onEnd((e) => {
      const i = index;
      const far = Math.abs(e.translationX) > width * SWIPE_FRACTION;
      const fast = Math.abs(e.velocityX) > SWIPE_VELOCITY;
      const dir = e.translationX < 0 ? 1 : -1;
      const target = far || fast ? Math.min(count - 1, Math.max(0, i + dir)) : i;
      // Wechsel: der Effekt oben gleitet hin und führt den Finger-Versatz auf 0.
      // Sonst (Rand/zu kurz) gleitet die Seite zurück.
      if (target !== i) onIndexChange(target);
      else slideTo(i, true);
    })
    .onFinalize((_e, success) => {
      if (!success) slideTo(index, true);
    });

  const translateX = Animated.add(Animated.multiply(pos, -width), drag);

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.clip}>
        <Animated.View
          style={[styles.row, { width: width * count, transform: [{ translateX }] }]}
        >
          {children.map((render, i) => (
            <View
              key={i}
              style={{ width }}
              importantForAccessibility={i === index ? "auto" : "no-hide-descendants"}
              accessibilityElementsHidden={i !== index}
            >
              {visited.includes(i) ? render() : null}
            </View>
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  clip: { flex: 1, overflow: "hidden" },
  row: { flex: 1, flexDirection: "row" },
});
