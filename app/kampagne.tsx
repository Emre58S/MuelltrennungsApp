// Datei: app/kampagne.tsx — Bereich „Kampagne“ (Einzelspieler)
//
// Hinter der grünen Menü-Tonne: der Lernpfad (ROADMAP.md, R2c) – Welten mit
// Stationen (game/campaign.ts), Sterne darunter, die aktuelle Station hüpft
// und ist mit 1 Tipp gestartet. Je Welt eine Seitenstation „Trick-Schule“
// (4 der Trick-Level, sperrt nichts). Oben eine schmale Reihe mit den bisherigen
// Spielarten (Freies Spiel mit den Tonnen der aktuellen Welt, Ohne Fehler, Zeit,
// Tricks), bis sie mit
// R2d als Stationen im Pfad leben. Darunter die 3 Tagesmissionen (R3a). Die
// Tagesaufgabe ist ein goldener Kreis direkt unter der aktuellen Station (R3b).

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
  freePlayBins,
  isUnlocked,
  type Station,
  trickTarget,
  type World,
  worldTricks,
  WORLDS,
} from "@/game/campaign";
import { type Mission, type MissionDay, MISSION_XP, missionProgress } from "@/game/missions";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import {
  type DailyResult,
  getCampaignStars,
  getMissionDay,
  getTodayDaily,
  grantCampaignHeadStart,
  getTrickStars,
  type TrickStars,
} from "@/utils/storage";
import { sfx } from "@/utils/sfx";

const MODE_LOOK: Partial<Record<GameMode, string>> = {
  endless: "🌱",
  survival: "🛡️",
  time: "⏱️",
};

/** Zickzack des Pfads: seitlicher Versatz je Station (in px). */
const ZIGZAG = [-56, 0, 56, 0];
const DOT = 64;
/** Kennzeichen der Stations-Arten (klein am Kreis). */
const KIND_EMOJI = { survival: "🛡️", time: "⏱️", boss: "👑" } as const;
/** Farbe der Trick-Schule (wie die Trickwürfe). */
const TRICK_COLOR = "#7C5CD6";
/** Gold der Tagesaufgaben-Station. */
const DAILY_GOLD = "#F5B800";
/** Farbe der „Knifflige Fälle“-Welt (ohne eigene Tonne). */
const TRICKY_COLOR = "#7C5CD6";

const binDef = (key: string): BinDef | undefined => ALL_BINS.find((b) => b.key === key);

/** Farbe einer Welt: die neue Tonne (Welt 1: Papier), sonst lila. */
function worldColor(world: World): string {
  const key = world.newBins[world.newBins.length - 1];
  return (key && binDef(key)?.color) || TRICKY_COLOR;
}

/** Freies Spiel (früher „Üben“): ohne Ziel, mit den Tonnen der aktuellen Welt. */
function startFreePlay(stars: CampaignStars) {
  router.push({ pathname: "/runde", params: { mode: "endless", bins: freePlayBins(stars).join(",") } });
}

function startStation(station: Station) {
  router.push({ pathname: "/runde", params: { mode: "endless", station: station.id } });
}

export default function KampagneScreen() {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const [stars, setStars] = useState<CampaignStars | null>(null);
  /** Tagesaufgabe von heute (undefined = noch nicht geladen, null = offen). */
  const [daily, setDaily] = useState<DailyResult | null | undefined>(undefined);
  const [trickStars, setTrickStars] = useState<TrickStars>({});
  const [missions, setMissions] = useState<MissionDay | null>(null);
  /** Gerade Vorsprung nach Level bekommen – einmal erklären (nur diese Sitzung). */
  const [headStart, setHeadStart] = useState(false);
  const { colors } = useAppTheme();
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
      // Bestandsspieler: einmalig Welten nach Level vorab freischalten
      grantCampaignHeadStart()
        .then((granted) => granted && active && setHeadStart(true))
        .catch(() => undefined)
        .then(getCampaignStars)
        .then((s) => active && setStars(s))
        .catch(() => active && setStars({}));
      getTodayDaily()
        .then((d) => active && setDaily(d))
        .catch(() => undefined);
      getTrickStars()
        .then((s) => active && setTrickStars(s))
        .catch(() => undefined);
      getMissionDay()
        .then((m) => active && setMissions(m))
        .catch(() => undefined);
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
        <Chip emoji="🌱" label={t("campaign.freePlay")} onPress={() => stars && startFreePlay(stars)} />
        {MENU_MODES.filter((m) => m.mode !== "endless").map((m) => (
          <Chip key={m.mode} emoji={MODE_LOOK[m.mode] ?? "🎮"} label={t(m.titleKey)} onPress={() => startGame(m.mode)} />
        ))}
        <Chip emoji="🎯" label={t("home.tricks")} onPress={() => router.push("/tricks")} />
      </View>

      {missions && <MissionCard day={missions} />}

      {headStart && (
        <View style={[styles.headStart, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText variant="caption">🎉 {t("campaign.headStart")}</AppText>
        </View>
      )}

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
              <View key={station.id}>
                <StationDot
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
                {/* Tagesaufgabe gleich dort, wo man weiterspielt */}
                {station.id === current.id && daily !== undefined && <DailyStation result={daily} />}
              </View>
            ))}
            <TrickSchool
              world={world}
              reached={isUnlocked(stars, world.stations[0].id)}
              trickStars={trickStars}
            />
          </View>
        ))}
    </HubScreen>
  );
}

function Chip({
  emoji,
  label,
  dot,
  onPress,
}: {
  emoji: string;
  label: string;
  /** Roter Punkt: hier wartet etwas (z. B. Tagesaufgabe noch offen). */
  dot?: boolean;
  onPress: () => void;
}) {
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
      {dot && <View style={styles.chipDot} />}
    </Pressable>
  );
}

const MISSION_EMOJI = { streak: "🔥", correct: "✅", station: "⭐" } as const;

/** Die 3 Tagesmissionen mit Fortschritt (game/missions.ts). */
function MissionCard({ day }: { day: MissionDay }) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const allDone = day.done.length >= day.missions.length;
  const text = (m: Mission) => {
    if (m.kind === "bin" && m.bin) return t("mission.bin", { bin: t(`bin.${m.bin}`), n: m.goal });
    if (m.kind === "streak") return t("mission.streak", { n: m.goal });
    if (m.kind === "correct") return t("mission.correct", { n: m.goal });
    return t("mission.station");
  };
  return (
    <View style={[styles.missions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.missionHead}>
        <AppText variant="label" accessibilityRole="header">
          📋 {t("mission.title")}
        </AppText>
        <AppText variant="caption" tone="textMuted">
          {t("mission.reward", { xp: MISSION_XP })}
        </AppText>
      </View>
      {day.missions.map((m) => {
        const n = missionProgress(m, day.counts);
        const done = day.done.includes(m.id);
        const emoji = m.kind === "bin" ? (binDef(m.bin ?? "")?.icon ?? "🗑️") : MISSION_EMOJI[m.kind];
        return (
          <View
            key={m.id}
            style={styles.missionRow}
            accessible
            accessibilityLabel={`${text(m)}: ${done ? t("mission.doneA11y") : `${n}/${m.goal}`}`}
          >
            <AppText variant="caption" style={styles.missionText} tone={done ? "textMuted" : undefined}>
              {emoji} {text(m)}
            </AppText>
            <AppText variant="caption" style={{ fontWeight: "700" }} tone={done ? "primary" : "textSecondary"}>
              {done ? "✓" : `${n}/${m.goal}`}
            </AppText>
          </View>
        );
      })}
      {allDone && (
        <AppText variant="caption" tone="textSecondary">
          🎉 {t("mission.allDone")}
        </AppText>
      )}
    </View>
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

/** Seitenstation „Trick-Schule“ einer Welt: 4 Trick-Level, 1 Tipp startet das nächste. */
/** Tagesaufgabe als goldene Station: offen → einladen, erledigt → Ergebnis + „morgen neu“. */
function DailyStation({ result }: { result: DailyResult | null }) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const status = result
    ? `${t("home.dailyDone", { correct: result.correct, total: result.total, score: result.score })} · ${t("campaign.dailyTomorrow")}`
    : t("home.dailyNew");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("home.daily")}, ${status}`}
      onPress={() => {
        sfx("tap");
        tapHaptic();
        startDaily();
      }}
      style={({ pressed }) => [
        styles.trick,
        styles.daily,
        { backgroundColor: colors.surface, borderColor: DAILY_GOLD },
        pressed && press.pressed,
      ]}
    >
      <View style={[styles.dailyDot, { backgroundColor: result ? colors.goldSoft : DAILY_GOLD }]}>
        <AppText style={styles.trickEmoji}>{result ? "✓" : "📅"}</AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="label">{t("home.daily")}</AppText>
        <AppText variant="caption" tone="textSecondary">
          {status}
        </AppText>
      </View>
    </Pressable>
  );
}

function TrickSchool({
  world,
  reached,
  trickStars,
}: {
  world: World;
  /** Welt erreicht (erste Station frei)? */
  reached: boolean;
  trickStars: TrickStars;
}) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const levels = worldTricks(world);
  const got = levels.reduce((sum, l) => sum + (trickStars[l] ?? 0), 0);
  const target = trickTarget(world, trickStars);
  const open = reached && !target.locked;
  const range = t("campaign.trickLevels", { from: levels[0], to: levels[levels.length - 1] });
  const status = !reached
    ? t("campaign.trickReach", { id: world.stations[0].id })
    : target.locked
      ? t("campaign.trickBefore")
      : t("campaign.trickNext", { n: target.level });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("campaign.trick")}, ${range}, ${t("campaign.trickStars", { n: got, max: levels.length * 3 })}, ${status}`}
      accessibilityState={{ disabled: !open }}
      disabled={!open}
      onPress={() => {
        sfx("tap");
        tapHaptic();
        router.push({ pathname: "/runde", params: { mode: "trick", level: String(target.level) } });
      }}
      style={({ pressed }) => [
        styles.trick,
        {
          backgroundColor: colors.surface,
          borderColor: open ? TRICK_COLOR : colors.border,
          opacity: open ? 1 : 0.7,
        },
        pressed && press.pressed,
      ]}
    >
      <AppText style={styles.trickEmoji}>{open ? "🎯" : "🔒"}</AppText>
      <View style={styles.flex}>
        <AppText variant="label">
          {t("campaign.trick")} · {range}
        </AppText>
        <AppText variant="caption" tone="textSecondary">
          {status}
        </AppText>
      </View>
      <AppText variant="label" style={styles.trickStars}>
        ★ {got}/{levels.length * 3}
      </AppText>
    </Pressable>
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

  const kind = station.kind ? `, ${t(`campaign.kind.${station.kind}`)}` : "";
  const label = unlocked
    ? `${t("campaign.station", { id: station.id })}${kind}, ${t("common.starsOf", { n: stars })}`
    : `${t("campaign.station", { id: station.id })}${kind}, ${t("campaign.locked")}`;
  const goal =
    station.kind === "time"
      ? t("campaign.goalTime", { goal: station.goal })
      : station.kind === "survival"
        ? t("campaign.goalSurvival", { goal: station.goal })
        : station.kind === "boss"
          ? t("campaign.goalBoss", { goal: station.goal, total: station.total })
          : t("campaign.goal", { goal: station.goal, total: station.total });
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
        {station.kind && (
          <View pointerEvents="none" style={[styles.kind, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={styles.kindEmoji}>{KIND_EMOJI[station.kind]}</AppText>
          </View>
        )}
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
            {goal}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  headStart: { padding: Spacing.md - 4, borderRadius: Radius.md, borderWidth: 1.5 },
  daily: { marginTop: Spacing.sm, borderStyle: "solid", borderWidth: 2 },
  dailyDot: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  missions: { padding: Spacing.md - 4, borderRadius: Radius.md, borderWidth: 1.5, gap: 6 },
  missionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  missionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  missionText: { flex: 1 },
  chip: {
    paddingHorizontal: Spacing.md - 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  chipDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF4D4D",
    borderWidth: 2,
    borderColor: "#FFFFFF",
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
  flex: { flex: 1 },
  trick: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md - 4,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  trickEmoji: { fontSize: 22, lineHeight: 28 },
  trickStars: { color: "#F5B800" },
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
  kind: {
    position: "absolute",
    top: -4,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  kindEmoji: { fontSize: 15, lineHeight: 19 },
  stars: { marginTop: 2, color: "#FFB300", letterSpacing: 2 },
  goal: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
});
