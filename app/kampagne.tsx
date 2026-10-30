// Datei: app/kampagne.tsx — Bereich „Kampagne“ (Einzelspieler)
//
// Hinter der grünen Menü-Tonne: der Lernpfad (ROADMAP.md, R2c) – Welten mit
// Stationen (game/campaign.ts), Sterne darunter, die aktuelle Station hüpft
// und ist mit 1 Tipp gestartet. Oben eine schmale Reihe mit den bisherigen
// Spielarten (Üben, Ohne Fehler, Zeit, Tagesaufgabe, Tricks), bis sie mit
// R2d als Stationen im Pfad leben.

import { router, useFocusEffect } from "expo-router";
import { type ComponentRef, useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, type ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import { HubScreen } from "@/components/ui/hub";
import { AppText } from "@/components/ui/app-text";
import { press, tapHaptic } from "@/components/ui/press";
import { type GameMode, MENU_MODES, startDaily, startGame } from "@/constants/modes";
import { Radius, Spacing } from "@/constants/theme";
import { ALL_BINS, type BinDef } from "@/game/bins";
import {
  type CampaignStars,
  currentStation,
  isUnlocked,
  type Station,
  type World,
  WORLDS,
} from "@/game/campaign";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { getCampaignStars } from "@/utils/storage";
import { sfx } from "@/utils/sfx";

const MODE_LOOK: Partial<Record<GameMode, string>> = {
  endless: "🌱",
  survival: "🛡️",
  time: "⏱️",
};

/** Zickzack des Pfads: seitlicher Versatz je Station (in px). */
const ZIGZAG = [-56, 0, 56, 0];
const DOT = 64;
/** Farbe der „Knifflige Fälle“-Welt (ohne eigene Tonne). */
const TRICKY_COLOR = "#7C5CD6";

const binDef = (key: string): BinDef | undefined => ALL_BINS.find((b) => b.key === key);

/** Farbe einer Welt: die neue Tonne (Welt 1: Papier), sonst lila. */
function worldColor(world: World): string {
  const key = world.newBins[world.newBins.length - 1];
  return (key && binDef(key)?.color) || TRICKY_COLOR;
}

function startStation(station: Station) {
  router.push({ pathname: "/runde", params: { mode: "endless", station: station.id } });
}

export default function KampagneScreen() {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const [stars, setStars] = useState<CampaignStars | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  /** Lage der Welten im Pfad – zum Hinscrollen zur aktuellen Station. */
  const worldY = useRef<Record<number, number>>({});
  const scrolled = useRef(false);
  /** Lage der aktuellen Station in ihrer Welt (Reihenfolge der onLayout-Aufrufe ist offen). */
  const currentAt = useRef<{ world: number; y: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      scrolled.current = false;
      getCampaignStars()
        .then((s) => active && setStars(s))
        .catch(() => active && setStars({}));
      return () => {
        active = false;
      };
    }, []),
  );

  const current = stars ? currentStation(stars) : null;
  /** Aktuelle Station liegt tief im Pfad → so scrollen, dass sie gut sichtbar ist. */
  const scrollToCurrent = () => {
    const at = currentAt.current;
    const top = at ? worldY.current[at.world] : undefined;
    if (scrolled.current || !at || top === undefined) return;
    scrolled.current = true;
    const target = top + at.y - height * 0.4;
    if (target > 0) scroll.current?.scrollTo({ y: target, animated: false });
  };

  return (
    <HubScreen
      title={t("hub.campaign.title")}
      subtitle={t("hub.campaign.subtitle")}
      emoji="🎓"
      scrollRef={scroll}
    >
      {/* Bisherige Spielarten – klein, damit der Pfad im Mittelpunkt steht */}
      <View style={styles.chips}>
        {MENU_MODES.map((m) => (
          <Chip key={m.mode} emoji={MODE_LOOK[m.mode] ?? "🎮"} label={t(m.titleKey)} onPress={() => startGame(m.mode)} />
        ))}
        <Chip emoji="📅" label={t("home.daily")} onPress={startDaily} />
        <Chip emoji="🎯" label={t("home.tricks")} onPress={() => router.push("/tricks")} />
      </View>

      {stars &&
        current &&
        WORLDS.map((world) => (
          <View
            key={world.index}
            onLayout={(e) => {
              worldY.current[world.index] = e.nativeEvent.layout.y;
              scrollToCurrent();
            }}
          >
            <WorldHeader world={world} />
            {world.stations.map((station, i) => (
              <StationDot
                key={station.id}
                station={station}
                offset={ZIGZAG[i % ZIGZAG.length]}
                color={worldColor(world)}
                stars={stars[station.id] ?? 0}
                unlocked={isUnlocked(stars, station.id)}
                isCurrent={station.id === current.id}
                onCurrentLayout={(y) => {
                  currentAt.current = { world: world.index, y };
                  scrollToCurrent();
                }}
              />
            ))}
          </View>
        ))}
    </HubScreen>
  );
}

function Chip({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        sfx("tap");
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && press.pressed,
      ]}
    >
      <AppText variant="label">
        {emoji} {label}
      </AppText>
    </Pressable>
  );
}

/** Kopf einer Welt: Nummer, Tonnen der Welt, neue Tonne mit Beispielen. */
function WorldHeader({ world }: { world: World }) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const bins = world.bins.map(binDef).filter((b): b is BinDef => !!b);
  const isNew = (b: BinDef) => world.newBins.includes(b.key);
  return (
    <View style={[styles.world, { backgroundColor: colors.surface, borderColor: worldColor(world) }]}>
      <AppText variant="heading">
        {world.newBins.length === 0 ? `🧩 ${t("campaign.tricky")}` : t("campaign.world", { n: world.index })}
      </AppText>
      <View style={styles.binRow} accessible accessibilityLabel={bins.map((b) => t(b.labelKey)).join(", ")}>
        {bins.map((b) => (
          <View
            key={b.key}
            style={[styles.bin, { backgroundColor: b.color }, isNew(b) && styles.binNew]}
          >
            <AppText style={styles.binIcon}>{b.icon}</AppText>
          </View>
        ))}
      </View>
      {world.newBins.map((key) => {
        const b = binDef(key);
        if (!b) return null;
        return (
          <AppText key={key} variant="caption" tone="textSecondary">
            <AppText variant="caption" style={{ fontWeight: "700" }}>
              {t("campaign.new", { bin: t(b.labelKey) })}
            </AppText>{" "}
            {t(`bin.${key}.examples`)}
          </AppText>
        );
      })}
      {world.newBins.length === 0 && (
        <AppText variant="caption" tone="textSecondary">
          {t("campaign.trickyDesc")}
        </AppText>
      )}
    </View>
  );
}

function StationDot({
  station,
  offset,
  color,
  stars,
  unlocked,
  isCurrent,
  onCurrentLayout,
}: {
  station: Station;
  offset: number;
  color: string;
  stars: number;
  unlocked: boolean;
  isCurrent: boolean;
  onCurrentLayout: (y: number) => void;
}) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  const [hop] = useState(() => new Animated.Value(0));
  // Aktuelle Station hüpft sanft („hier geht's weiter“)
  useEffect(() => {
    if (!isCurrent || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: -8, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(700),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      hop.setValue(0);
    };
  }, [isCurrent, reduceMotion, hop]);

  const label = unlocked
    ? `${t("campaign.station", { id: station.id })}, ${t("common.starsOf", { n: stars })}`
    : `${t("campaign.station", { id: station.id })}, ${t("campaign.locked")}`;
  return (
    <View
      style={[styles.stationWrap, { transform: [{ translateX: offset }] }]}
      onLayout={isCurrent ? (e) => onCurrentLayout(e.nativeEvent.layout.y) : undefined}
    >
      {/* drei Pünktchen als Weg zur Station */}
      <View style={styles.trail}>
        {[0, 1, 2].map((k) => (
          <View key={k} style={[styles.trailDot, { backgroundColor: unlocked ? color : colors.border }]} />
        ))}
      </View>
      <Animated.View style={{ transform: [{ translateY: hop }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: !unlocked }}
          disabled={!unlocked}
          onPress={() => {
            sfx("tap");
            tapHaptic();
            startStation(station);
          }}
          style={({ pressed }) => [
            styles.dot,
            unlocked
              ? { backgroundColor: color, borderColor: isCurrent ? "#FFD54A" : "rgba(255,255,255,0.6)" }
              : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            isCurrent && styles.dotCurrent,
            pressed && press.pressedLarge,
          ]}
        >
          <AppText variant="heading" color={unlocked ? "#FFFFFF" : colors.textMuted}>
            {unlocked ? station.id : "🔒"}
          </AppText>
        </Pressable>
      </Animated.View>
      {unlocked && stars > 0 && (
        <AppText variant="label" style={styles.stars}>
          {"★".repeat(stars)}
          <AppText variant="label" color={colors.border}>
            {"★".repeat(3 - stars)}
          </AppText>
        </AppText>
      )}
      {isCurrent && (
        <View style={[styles.goal, { backgroundColor: colors.goldSoft }]}>
          <AppText variant="caption" tone="onGoldSoft">
            {t("campaign.goal", { goal: station.goal, total: station.total })}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md - 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  world: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 2,
    gap: Spacing.xs + 2,
  },
  binRow: { flexDirection: "row", gap: Spacing.xs + 2 },
  bin: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
  },
  binNew: { opacity: 1, borderWidth: 2, borderColor: "#FFD54A" },
  binIcon: { fontSize: 18, lineHeight: 22 },
  stationWrap: { alignItems: "center", paddingTop: Spacing.xs },
  trail: { alignItems: "center", gap: 5, marginBottom: 6 },
  trailDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCurrent: { width: DOT + 12, height: DOT + 12, borderRadius: (DOT + 12) / 2, borderWidth: 4 },
  stars: { marginTop: 2, color: "#FFB300", letterSpacing: 2 },
  goal: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
});
