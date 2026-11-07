// Datei: components/nav/area-bar.tsx
//
// Feste untere Leiste: Pfad · Online · Regal, je mit eigenem Symbol
// (Karte, Globus, Buch). Wie bei Clash Royale: eine ruhige, dunkle Leiste bis zum Rand; der gewählte
// Bereich ist breiter und heller, trägt oben eine Kante in seiner Bereichsfarbe und ein größeres Symbol.

import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NavIcon } from "@/components/nav/nav-icon";
import { tapHaptic } from "@/components/ui/press";
import { AREA_ORDER, AREAS, type AreaKey } from "@/constants/areas";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";

/** Höhe der Leiste ohne Sicherheitsabstand unten. */
export const AREA_BAR_HEIGHT = 72;

/** Farben der Leiste: ruhig und dunkel, in beiden Themen (Vorbild Clash Royale). */
const BAR_LIGHT = { bg: "#1F2D3F", selected: "#33495F", line: "rgba(255,255,255,0.08)" };
const BAR_DARK = { bg: "#121A26", selected: "#233246", line: "rgba(255,255,255,0.06)" };

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
  const { scheme } = useAppTheme();
  const bar = scheme === "dark" ? BAR_DARK : BAR_LIGHT;
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          height: AREA_BAR_HEIGHT + insets.bottom,
          backgroundColor: bar.bg,
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
              selected && styles.itemSelected,
              {
                backgroundColor: selected ? bar.selected : "transparent",
                borderTopColor: selected ? area.fill : "transparent",
                borderRightColor: bar.line,
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
  // Feine Trennlinie zwischen den Feldern; die Kante oben ist nur beim gewählten Feld gefärbt
  item: { flex: 1, alignItems: "center", justifyContent: "center", borderTopWidth: 4, borderRightWidth: 1 },
  itemSelected: { flex: 1.5 },
  dot: {
    position: "absolute",
    top: 12,
    right: "26%",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF4D4D",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
