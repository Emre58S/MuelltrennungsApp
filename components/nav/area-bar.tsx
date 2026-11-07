// Datei: components/nav/area-bar.tsx
//
// Feste untere Leiste: Pfad · Online · Regal, je mit Tonnen-Icon in der
// Bereichsfarbe. Der gewählte Bereich ist farbig und trägt oben einen Balken.

import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { BinIcon } from "@/components/ui/bin-icon";
import { tapHaptic } from "@/components/ui/press";
import { AREA_ORDER, AREAS, type AreaKey } from "@/constants/areas";
import { Spacing } from "@/constants/theme";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";

/** Höhe der Leiste ohne Sicherheitsabstand unten. */
export const AREA_BAR_HEIGHT = 70;

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
  const { colors, scheme } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: AREA_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
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
            style={styles.item}
          >
            {/* Gewählt: farbiger Rahmen, Tonne hebt sich heraus (wie Duolingo/Clash Royale) */}
            <View
              style={[
                styles.tab,
                selected && { backgroundColor: area.fill + "26", borderColor: area.fill, transform: [{ translateY: -6 }] },
              ]}
            >
              <View style={{ opacity: selected ? 1 : 0.55, transform: [{ scale: selected ? 1.18 : 1 }] }}>
                <BinIcon color={area.fill} size={30} wiggle={wiggles[key]} reduceMotion={reduceMotion} />
              </View>
              <AppText
                variant="caption"
                color={selected ? (scheme === "dark" ? area.fill : area.sign) : colors.textMuted}
                style={selected && styles.selectedLabel}
                numberOfLines={1}
              >
                {label}
              </AppText>
            </View>
            {dots?.[key] && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: 2, alignItems: "flex-end" },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingTop: Spacing.xs },
  tab: {
    minWidth: 84,
    alignItems: "center",
    gap: 2,
    paddingTop: 6,
    paddingBottom: 5,
    paddingHorizontal: Spacing.sm,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  dot: {
    position: "absolute",
    top: 4,
    right: "26%",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF4D4D",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  selectedLabel: { fontWeight: "700" },
});
