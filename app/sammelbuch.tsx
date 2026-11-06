// Datei: app/sammelbuch.tsx — Sammelbuch
//
// Jeder richtig sortierte Gegenstand wird freigeschaltet. Pro Kategorie ein
// Raster; noch unbekannte Gegenstände sind verdeckt. Antippen zeigt Lern-
// Fakt, richtige Tonne und den eigenen Lernstand („Sicher“ / „Noch üben“).
// Motiviert, alle Gegenstände zu finden – und wiederholt nebenbei Wissen.
// Medaillen (game/mastery.ts): Bronze/Silber/Gold je nach richtigen Würfen.

import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { cardEdge } from "@/components/ui/chunky";
import { HubScreen } from "@/components/ui/hub";
import { press, tapHaptic } from "@/components/ui/press";
import { type Category, type Item, ITEMS } from "@/constants/items";
import { AREAS } from "@/constants/areas";
import { ITEM_IMAGE_BG, ITEM_IMAGES } from "@/constants/item-images";
import { BinColors, type BinKey, Radius, Spacing } from "@/constants/theme";
import { type TranslationKey } from "@/i18n";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { ItemPreview3D } from "@/components/game/item-preview";
import { EMPTY_ITEM_STAT, getItemStats, type ItemStat, type ItemStats } from "@/utils/storage";
import { goldCount, MEDAL_AT, MEDAL_ICON, medalFor, nextMedal } from "@/game/mastery";

const CATEGORY_BIN: Record<Category, BinKey> = {
  Biomüll: "bio",
  "Gelber Sack": "gelb",
  Restmüll: "rest",
  Papier: "papier",
  Glas: "glas",
  Sondermüll: "sonder",
};

/** Reihenfolge wie im Spiel: erst die drei Grund-Tonnen, dann die freischaltbaren. */
const SECTIONS: Category[] = ["Biomüll", "Gelber Sack", "Restmüll", "Papier", "Glas", "Sondermüll"];

type Mastery = "mastered" | "practice" | "known";

function masteryOf(stat: ItemStat): Mastery {
  if (stat.streak >= 4) return "mastered";
  if (stat.wrong > stat.correct || (stat.lastWrong > 0 && stat.streak < 2)) return "practice";
  return "known";
}

/** Inhalt „Sammelbuch“ – ohne Kopf, damit er auch als Reiter im Regal stehen kann. */
export function BookPanel() {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const { t, itemName } = useI18n();
  const [stats, setStats] = useState<ItemStats>({});
  const [selected, setSelected] = useState<Item | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getItemStats()
        .then((s) => active && setStats(s))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );

  const isFound = useCallback((item: Item) => (stats[item.name]?.correct ?? 0) > 0, [stats]);
  const found = useMemo(() => ITEMS.filter(isFound).length, [isFound]);
  const progress = found / ITEMS.length;
  const golds = useMemo(() => goldCount(stats), [stats]);
  /** Kurzer Name unter der Kachel: ohne Klammer, außer der Rest wäre nicht eindeutig. */
  const shortName = useMemo(() => {
    const base = (full: string) => full.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
    const counts = new Map<string, number>();
    for (const it of ITEMS) counts.set(base(itemName(it)), (counts.get(base(itemName(it))) ?? 0) + 1);
    return (it: Item) => {
      const full = itemName(it);
      return (counts.get(base(full)) ?? 0) > 1 ? full : base(full);
    };
  }, [itemName]);
  // 4 Kacheln pro Zeile (5 auf breiten Geräten)
  const columns = width >= 600 ? 6 : width >= 400 ? 5 : 4;
  // Seitenrand wie in HubScreen (Spacing.md + 4)
  const tileSize = (width - (Spacing.md + 4) * 2 - Spacing.sm * (columns - 1)) / columns;

  return (
    <View style={styles.panel}>
      <>
        {/* Fortschritt */}
        <View
          style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardEdge(colors.border)]}
          accessible
          accessibilityLabel={t("book.progress", { n: found, total: ITEMS.length })}
        >
          <View style={styles.progressRow}>
            <AppText variant="heading">📖 {t("book.progress", { n: found, total: ITEMS.length })}</AppText>
            <AppText variant="label" tone="primary">
              {Math.round(progress * 100)}%
            </AppText>
          </View>
          <AppText variant="label">{t("book.golds", { n: golds })}</AppText>
          <AppText variant="caption" tone="textSecondary">
            {t("book.medalRule", { b: MEDAL_AT.bronze, s: MEDAL_AT.silver, g: MEDAL_AT.gold })}
          </AppText>
          <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {SECTIONS.map((category) => {
          const bin = BinColors[CATEGORY_BIN[category]];
          const items = ITEMS.filter((i) => i.category === category);
          const foundHere = items.filter(isFound).length;
          return (
            <View key={category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: bin.fill }]}>
                  <AppText style={styles.sectionEmoji}>{bin.icon}</AppText>
                </View>
                <AppText variant="heading" style={styles.flex} accessibilityRole="header">
                  {t(`bin.${CATEGORY_BIN[category]}` as TranslationKey)}
                </AppText>
                <AppText variant="label" tone="textMuted">
                  {foundHere}/{items.length}
                </AppText>
              </View>
              <View style={styles.grid}>
                {items.map((item) => {
                  const stat = stats[item.name] ?? EMPTY_ITEM_STAT;
                  const known = stat.correct > 0;
                  const mastery = known ? masteryOf(stat) : null;
                  return (
                    <View key={item.name} style={{ width: tileSize }}>
                    <Pressable
                      accessibilityRole="button"
                      // VoiceOver: bekannt mit Lernstand, unbekannt mit der Tonne des Abschnitts
                      accessibilityLabel={
                        known
                          ? mastery === "known"
                            ? itemName(item)
                            : `${itemName(item)}, ${t(mastery === "mastered" ? "book.mastered" : "book.practice")}`
                          : `${t("book.lockedItem")}, ${t(`bin.${CATEGORY_BIN[category]}` as TranslationKey)}`
                      }
                      onPress={() => {
                        tapHaptic();
                        setSelected(item);
                      }}
                      style={({ pressed }) => [
                        styles.tile,
                        {
                          width: tileSize,
                          height: tileSize,
                          backgroundColor: known ? ITEM_IMAGE_BG : colors.surfaceAlt,
                          borderColor: known ? bin.fill : colors.border,
                        },
                        pressed && press.pressed,
                      ]}
                    >
                      {known && ITEM_IMAGES[item.name] ? (
                        <View style={styles.tileImageWrap} pointerEvents="none">
                          <Image source={ITEM_IMAGES[item.name]} style={styles.tileImage} resizeMode="cover" accessibilityIgnoresInvertColors />
                        </View>
                      ) : (
                        <AppText style={[styles.tileEmoji, !known && styles.locked]}>{known ? item.emoji : "❔"}</AppText>
                      )}
                      {mastery === "mastered" && <Badge text="⭐" />}
                      {mastery === "practice" && <Badge text="💡" />}
                      {known && medalFor(stat.correct) && (
                        <View style={styles.medal}>
                          <AppText style={styles.badgeText}>{MEDAL_ICON[medalFor(stat.correct)!]}</AppText>
                        </View>
                      )}
                    </Pressable>
                    {/* Name unter der Kachel: gesperrt bleibt leer (Überraschung), die Zeile aber reserviert */}
                    <AppText variant="caption" center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.tileLabel} tone={known ? "text" : "textMuted"}>
                      {known ? shortName(item) : " "}
                    </AppText>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </>

      <DetailSheet item={selected} stat={selected ? stats[selected.name] : undefined} onClose={() => setSelected(null)} />
    </View>
  );
}

export default function CollectionScreen() {
  const { t } = useI18n();
  return (
    <HubScreen title={t("book.title")} subtitle={t("book.subtitle")} emoji="📖" area={AREAS.regal}>
      <BookPanel />
    </HubScreen>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <AppText style={styles.badgeText}>{text}</AppText>
    </View>
  );
}

/** Detailkarte: Fakt, richtige Tonne, Lernstand (bzw. Hinweis, falls noch gesperrt). */
function DetailSheet({
  item,
  stat,
  onClose,
}: {
  item: Item | null;
  stat: ItemStat | undefined;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t, itemName, itemFact, itemReason } = useI18n();
  const { reduceMotion } = useAppSettings();
  const { height } = useWindowDimensions();
  const known = !!item && (stat?.correct ?? 0) > 0;
  const binKey = item ? CATEGORY_BIN[item.category] : "rest";
  const bin = BinColors[binKey];
  const mastery = known && stat ? masteryOf(stat) : null;

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel={t("common.close")}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + Spacing.lg }]}
          onPress={() => undefined}
          accessibilityViewIsModal
        >
          {item && (
            <>
              {/* Bekannte Gegenstände: dasselbe 3D-Modell wie im Spiel */}
              {known ? (
                <ItemPreview3D
                  item={item}
                  size={height < 700 ? 124 : 156}
                  background={ITEM_IMAGE_BG}
                  calm={reduceMotion}
                  label={itemName(item)}
                />
              ) : (
                <AppText style={styles.sheetEmoji}>❔</AppText>
              )}
              <AppText variant="title" center accessibilityRole="header">
                {known ? itemName(item) : t("book.locked")}
              </AppText>

              {known ? (
                <>
                  <View style={styles.binRow}>
                    <AppText tone="textSecondary">{t("book.belongsIn")}</AppText>
                    <View style={[styles.binPill, { backgroundColor: bin.fill }]}>
                      <AppText variant="label" color={bin.on}>
                        {bin.icon} {t(`bin.${binKey}` as TranslationKey)}
                      </AppText>
                    </View>
                  </View>
                  {/* Fakt – oder, wo keiner hinterlegt ist, die kurze Begründung */}
                  {(itemFact(item) ?? itemReason(item)) && (
                    <View style={[styles.fact, { backgroundColor: colors.primarySoft }]}>
                      <AppText tone="onPrimarySoft">💡 {itemFact(item) ?? itemReason(item)}</AppText>
                    </View>
                  )}
                  <View style={[styles.statRow, { backgroundColor: colors.surfaceAlt }]}>
                    <View style={styles.stat}>
                      <AppText variant="heading">{stat?.correct ?? 0}</AppText>
                      <AppText variant="caption" tone="textMuted">
                        {t("book.correct")}
                      </AppText>
                    </View>
                    <View style={styles.stat}>
                      <AppText variant="heading">{stat?.wrong ?? 0}</AppText>
                      <AppText variant="caption" tone="textMuted">
                        {t("book.wrong")}
                      </AppText>
                    </View>
                    <View style={styles.stat}>
                      <AppText variant="heading">
                        {medalFor(stat?.correct ?? 0) ? MEDAL_ICON[medalFor(stat?.correct ?? 0)!] : "–"}
                      </AppText>
                      <AppText variant="caption" tone="textMuted" center>
                        {(() => {
                          const next = nextMedal(stat?.correct ?? 0);
                          return next
                            ? t("medal.next", { n: next.left, medal: t(`medal.${next.medal}`) })
                            : t("medal.max");
                        })()}
                      </AppText>
                    </View>
                    {mastery && mastery !== "known" && (
                      <View style={styles.stat}>
                        <AppText variant="heading">{mastery === "mastered" ? "⭐" : "💡"}</AppText>
                        <AppText variant="caption" tone="textMuted">
                          {mastery === "mastered" ? t("book.mastered") : t("book.practice")}
                        </AppText>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <AppText tone="textSecondary" center>
                  {t("book.lockedHint")}
                </AppText>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                onPress={() => {
                  tapHaptic();
                  onClose();
                }}
                style={({ pressed }) => [styles.close, { backgroundColor: colors.surfaceAlt }, pressed && press.pressed]}
              >
                <Feather name="x" size={18} color={colors.text} />
                <AppText variant="label">{t("common.close")}</AppText>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: { gap: Spacing.lg },
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.lg },
  header: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },

  progressCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  track: { height: 10, borderRadius: 5, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },

  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  sectionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sectionEmoji: { fontSize: 16, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  tile: {
    borderRadius: Radius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { marginTop: 4, minHeight: 34, fontSize: 12, lineHeight: 15 },
  tileEmoji: { fontSize: 30, lineHeight: 38 },
  // Bild füllt die Kachel bis zum Rand (Rahmen bleibt sichtbar)
  tileImageWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: Radius.lg - 2, overflow: "hidden" },
  tileImage: { width: "100%", height: "100%" },
  locked: { opacity: 0.45 },
  badge: { position: "absolute", top: 2, right: 4 },
  medal: { position: "absolute", bottom: 2, left: 4 },
  badgeText: { fontSize: 13, lineHeight: 16 },

  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.lg,
    gap: Spacing.md,
    alignItems: "center",
  },
  sheetEmoji: { fontSize: 64, lineHeight: 76 },
  binRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  binPill: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill },
  fact: { alignSelf: "stretch", borderRadius: Radius.lg, padding: Spacing.md },
  statRow: { flexDirection: "row", alignSelf: "stretch", borderRadius: Radius.lg, paddingVertical: Spacing.sm },
  stat: { flex: 1, alignItems: "center" },
  close: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
  },
});
