import { type ReactNode, useEffect, useState } from "react";
import { Animated } from "react-native";

import { useAppSettings } from "@/providers/app-settings";

/** Blendet Inhalt sanft ein. Bei „Weniger Bewegung“ sofort sichtbar. */
export function FadeIn({
  delay = 0,
  children,
}: {
  delay?: number;
  children: ReactNode;
}) {
  const { reduceMotion } = useAppSettings();
  const [anim] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(1);
      return;
    }
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, delay, reduceMotion]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
