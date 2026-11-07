// Datei: components/nav/area-bar.tsx
//
// Feste untere Leiste: Pfad · Online · Regal, je mit eigenem Symbol
// (Karte, Globus, Buch). Wie bei Clash Royale füllt jeder Bereich sein ganzes Feld in seiner Farbe –
// der gewählte hell mit Lichtkante oben, die anderen dunkler; keine weiße Fläche dazwischen.

import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NavIcon } from "@/components/nav/nav-icon";
import { tone } from "@/components/ui/chunky";
import { tapHaptic } from "@/components/ui/press";
import { AREA_ORDER, AREAS, type AreaKey } from "@/constants/areas";
import { useAppSettings, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";

/** Höhe der Leiste ohne Sicherheitsabstand unten. */
export const AREA_BAR_HEIGHT = 72;

export function AreaBar({
  active,
  wiggles,
  dots,
  onSelect,
}: {
  active: AreaKey;
  /** Wackel-Zähler je Bereich (Tippen auf das Icon). */
  wiggles: Record<AreaKey, number>;
  /** Roter Punkt am Icon: hier wartet etwas (Tagesaufgabe, Herausforderung). */
  dots?: Partial<Record<AreaKey, boolean>>;
  onSelect: (key: AreaKey) => void;
}) {
  const { reduceMotion } = useAppSettings();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          height: AREA_BAR_HEIGHT + insets.bottom,
        },
      ]}
    >
      {AREA_ORDER.map((key) => {
        const area = AREAS[key];
        const selected = key === active;
        const label = t(`nav.${key}`);
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={dots?.[key] ? `${label}, ${t("nav.news")}` : label}
            onPress={() => {
              sfx("tap");
              tapHaptic();
              onSelect(key);
            }}
            style={[
              styles.item,
              {
                backgroundColor: selected ? area.fill : tone(area.fill, -0.42),
                borderTopColor: selected ? tone(area.fill, 0.45) : tone(area.fill, -0.6),
              },
            ]}
          >
            <NavIcon area={area} selected={selected} wiggle={wiggles[key]} reduceMotion={reduceMotion} />
            {dots?.[key] && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row" },
  // Das ganze Feld (bis zum unteren Rand) trägt die Farbe; das Symbol liegt in der Mitte
  item: { flex: 1, alignItems: "center", justifyContent: "center", borderTopWidth: 4 },
  dot: {
    position: "absolute",
    top: 12,
    right: "30%",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF4D4D",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
