// Datei: app/kampagne.tsx — Bereich „Kampagne“ (Einzelspieler)
//
// Hinter der grünen Menü-Tonne: der Lernpfad (ROADMAP.md, R2c) – Welten mit
// Stationen (game/campaign.ts), Sterne darunter, die aktuelle Station hüpft
// und ist mit 1 Tipp gestartet. Je Welt eine Seitenstation „Trick-Schule“
// (4 der Trick-Level, sperrt nichts). Oben eine schmale Reihe mit den bisherigen
// Spielarten (Freies Spiel mit den Tonnen der aktuellen Welt, Ohne Fehler, Zeit,
// Tricks), bis sie mit
// R2d als Stationen im Pfad leben. Darunter die 3 Tagesmissionen (R3a). Die
// Tagesaufgabe ist eine goldene Karte direkt unter der aktuellen Station (R3b).
// Alle 3 Missionen → Truhe, die man auf der Missionskarte öffnet (R3c).

import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type ComponentRef, Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { MissionSlots } from "@/components/areas/mission-slots";
import { BinIcon } from "@/components/ui/bin-icon";
import { Chunky, tone } from "@/components/ui/chunky";
import { AppText } from "@/components/ui/app-text";
import { press, tapHaptic } from "@/components/ui/press";
import { MENU_MODES, startDaily, startGame } from "@/constants/modes";
import { useShell } from "@/components/nav/shell-context";
import { Radius, Spacing } from "@/constants/theme";
import { ALL_BINS, type BinDef } from "@/game/bins";
import { dailyParcoursId } from "@/game/parcours";
import { nextStarReward } from "@/game/rewards";
import { levelIcons, PARCOURS } from "@/game/trick-levels";
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
import { type MissionDay } from "@/game/missions";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import {
  type DailyResult,
  getCampaignStars,
  getChests,
  getMissionDay,
  getParcoursBest,
  getTodayDaily,
  grantCampaignHeadStart,
  getTrickStars,
  getRewardProgress,
  todayKey,
  type TrickStars,
} from "@/utils/storage";
import { sfx } from "@/utils/sfx";

/** Farben der Schnellstart-Kacheln (dunkel genug für weiße Schrift). */
const TILE_COLOR = { endless: "#1E8A57", time: "#2F6FC4", survival: "#C4532B", tricks: "#6B49C4" } as const;
const TILE_EMOJI = { endless: "🌱", time: "⏱️", survival: "🛡️", tricks: "🎯" } as const;

/** Zickzack des Pfads: seitlicher Versatz je Station (in px). */
const ZIGZAG = [-56, 0, 56, 0];
const DOT = 64;
/** Abstand der Begleiter-Tonne zur aktuellen Station (Mitte zu Mitte, px). */
const MASCOT_GAP = 96;
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

/** Schriftfarbe auf der Weltfarbe (Gelb braucht dunkle Schrift, sonst ~2:1). */
function worldOnColor(world: World): string {
  const key = world.newBins[world.newBins.length - 1];
  return (key && binDef(key)?.onColor) || "#FFFFFF";
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
  /** Bestwerte der Parcours (für die Station am Ende des Pfads). */
  const [parcoursBest, setParcoursBest] = useState<Record<number, number>>({});
  const [missions, setMissions] = useState<MissionDay | null>(null);
  const [chests, setChests] = useState({ earned: 0, opened: 0 });
  /** Ziel vor Augen: nächste Belohnung über Sterne (null = alle frei / lädt). */
  const [nextReward, setNextReward] = useState<ReturnType<typeof nextStarReward>>(null);
  /** Gerade Vorsprung nach Level bekommen – einmal erklären (nur diese Sitzung). */
  const [headStart, setHeadStart] = useState(false);
  /** Welt, die im Band oben steht (null = die der aktuellen Station). */
  const [shownWorld, setShownWorld] = useState<number | null>(null);
  const { colors } = useAppTheme();
  const shell = useShell();
  const insets = useSafeAreaInsets();
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
        // Nicht lesbar → als offen zeigen, damit die Tagesaufgabe erreichbar bleibt
        .catch(() => active && setDaily(null));
      getTrickStars()
        .then((s) => active && setTrickStars(s))
        .catch(() => undefined);
      getParcoursBest()
        .then((b) => active && setParcoursBest(b))
        .catch(() => undefined);
      getMissionDay()
        .then((m) => active && setMissions(m))
        .catch(() => undefined);
      getChests()
        .then((c) => active && setChests(c))
        .catch(() => undefined);
      getRewardProgress()
        .then((p) => active && setNextReward(nextStarReward(p)))
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

  const shownIndex =
    shownWorld ?? WORLDS.find((w) => current && w.stations.some((st) => st.id === current.id))?.index ?? WORLDS[0].index;
  const bannerWorld = WORLDS.find((w) => w.index === shownIndex) ?? WORLDS[0];
  /** Das Band zeigt die Welt, in der man gerade scrollt (wie bei Duolingo). */
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y + 160;
    let idx = WORLDS[0].index;
    for (const w of WORLDS) {
      const top = worldY.current[w.index];
      if (top !== undefined && top <= y) idx = w.index;
    }
    if (idx !== shownIndex) setShownWorld(idx);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {stars && current && <WorldBanner key={bannerWorld.index} world={bannerWorld} />}
      <ScrollView
        ref={scroll}
        onScroll={onScroll}
        scrollEventThrottle={64}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (shell.inShell ? shell.bottomInset : insets.bottom) + Spacing.lg },
        ]}
      >
        {/* Schnellstart: die bisherigen Spielarten als dicke Kacheln */}
        <View style={styles.tiles}>
          <PlayTile kind="endless" label={t("campaign.freePlay")} onPress={() => stars && startFreePlay(stars)} />
          {MENU_MODES.filter((m) => m.mode !== "endless").map((m) => (
            <PlayTile
              key={m.mode}
              kind={m.mode === "time" ? "time" : "survival"}
              label={t(m.titleKey)}
              onPress={() => startGame(m.mode)}
            />
          ))}
          <PlayTile kind="tricks" label={t("home.tricks")} onPress={() => router.push("/tricks")} />
        </View>

        {daily !== undefined && <DailyStation result={daily} />}

        {nextReward && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t("reward.next", { name: t(nextReward.reward.name) })}. ${t("reward.nextLeft", { n: nextReward.left })}`}
            onPress={() => {
              tapHaptic();
              // In der Bereichs-Hülle gleich den Reiter „Belohnungen“ im Regal zeigen
              if (shell.inShell) shell.goArea("regal", "rewards");
              else router.push("/belohnungen");
            }}
            style={({ pressed }) => [styles.nextReward, { backgroundColor: colors.goldSoft }, pressed && press.pressed]}
          >
            <AppText style={styles.nextRewardEmoji}>🎁</AppText>
            <View style={styles.flex}>
              <AppText variant="label" color={colors.onGoldSoft}>
                {t("reward.next", { name: t(nextReward.reward.name) })}
              </AppText>
              <AppText variant="caption" color={colors.onGoldSoft}>
                {t("reward.nextLeft", { n: nextReward.left })}
              </AppText>
            </View>
          </Pressable>
        )}

        {missions && <MissionSlots day={missions} chestsWaiting={chests.earned - chests.opened} />}

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
                <Fragment key={station.id}>
                  <StationDot
                    station={station}
                    offset={ZIGZAG[i % ZIGZAG.length]}
                    color={worldColor(world)}
                    onColor={worldOnColor(world)}
                    stars={stars[station.id] ?? 0}
                    unlocked={isUnlocked(stars, station.id)}
                    isCurrent={station.id === current.id}
                    onCurrentLayout={(y) => {
                      currentAt.current = { world: world.index, y };
                      scrollToCurrent();
                    }}
                  />
                </Fragment>
              ))}
              <TrickSchool
                world={world}
                reached={isUnlocked(stars, world.stations[0].id)}
                trickStars={trickStars}
              />
              {/* Am Ende des Pfads: Parcours des Tages (sortieren mit Trickwurf, alle Tonnen) */}
              {world.index === WORLDS[WORLDS.length - 1].index && isUnlocked(stars, world.stations[0].id) && (
                <ParcoursStation best={parcoursBest} />
              )}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

/** Schnellstart-Kachel: dicker Knopf mit Symbol und Name. */
function PlayTile({
  kind,
  label,
  onPress,
}: {
  kind: keyof typeof TILE_COLOR;
  label: string;
  onPress: () => void;
}) {
  return (
    <Chunky
      color={TILE_COLOR[kind]}
      depth={5}
      radius={16}
      label={label}
      onPress={onPress}
      style={styles.tile}
      faceStyle={styles.tileFace}
    >
      <AppText style={styles.tileEmoji}>{TILE_EMOJI[kind]}</AppText>
      <AppText variant="caption" color="#FFFFFF" center numberOfLines={2} style={styles.tileText}>
        {label}
      </AppText>
    </Chunky>
  );
}

/** Band oben: die Welt, in der man gerade ist – Name, Tonnen, Buch für „Was gehört hinein?“. */
function WorldBanner({ world }: { world: World }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const color = worldColor(world);
  const on = worldOnColor(world);
  const bins = world.bins.map(binDef).filter((b): b is BinDef => !!b);
  const tricky = world.newBins.length === 0;
  const title = tricky ? `🧩 ${t("campaign.tricky")}` : t("campaign.world", { n: world.index });
  const sub = tricky ? t("campaign.trickyDesc") : bins.map((b) => t(b.labelKey)).join(" · ");
  return (
    <View style={[styles.banner, { backgroundColor: color, borderBottomColor: tone(color, -0.3) }]}>
      <View style={styles.bannerRow}>
        <View style={styles.flex}>
          <AppText variant="overline" color={on} style={styles.bannerTitle}>
            {title.toUpperCase()}
          </AppText>
          <AppText variant="heading" color={on} numberOfLines={2}>
            {sub}
          </AppText>
        </View>
        {!tricky && (
          <Chunky
            color={tone(color, -0.16)}
            edge={tone(color, -0.42)}
            depth={4}
            radius={12}
            label={t("campaign.info")}
            onPress={() => setOpen((o) => !o)}
            faceStyle={styles.bookFace}
          >
            <AppText style={styles.bookEmoji}>{open ? "✕" : "📖"}</AppText>
          </Chunky>
        )}
      </View>
      {open &&
        world.newBins.map((key) => {
          const b = binDef(key);
          if (!b) return null;
          return (
            <AppText key={key} variant="caption" color={on}>
              <AppText variant="caption" color={on} style={styles.bold}>
                {t("campaign.new", { bin: t(b.labelKey) })}
              </AppText>{" "}
              {t(`bin.${key}.examples`)}
            </AppText>
          );
        })}
    </View>
  );
}

/** Trenner im Pfad: Linie, Weltname, Linie (die Erklärung steht im Band oben). */
function WorldHeader({ world }: { world: World }) {
  const { t } = useI18n();
  const color = worldColor(world);
  const title = world.newBins.length === 0 ? `🧩 ${t("campaign.tricky")}` : t("campaign.world", { n: world.index });
  return (
    <View style={styles.ribbon} accessible accessibilityRole="header" accessibilityLabel={title}>
      <View style={[styles.ribbonLine, { backgroundColor: color }]} />
      <AppText variant="label" tone="textSecondary">
        {title}
      </AppText>
      <View style={[styles.ribbonLine, { backgroundColor: color }]} />
    </View>
  );
}

/** Tagesaufgabe als goldene Station: offen → einladen, erledigt → Ergebnis + „morgen neu“. */
function DailyStation({ result }: { result: DailyResult | null }) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const status = result
    ? t("home.dailyDone", { correct: result.correct, total: result.total, score: result.score })
    : t("home.dailyNew");
  return (
    <Chunky
      color={result ? colors.surface : DAILY_GOLD}
      edge={result ? colors.border : "#B58300"}
      depth={6}
      radius={Radius.xl}
      label={`${t("home.daily")}, ${status}${result ? `, ${t("campaign.dailyTomorrow")}` : ""}`}
      onPress={startDaily}
      style={styles.dailyWrap}
      faceStyle={styles.dailyFace}
    >
      <View style={[styles.dailyDot, { backgroundColor: result ? colors.goldSoft : "#FFFFFF55" }]}>
        <AppText style={styles.trickEmoji}>{result ? "✓" : "📅"}</AppText>
        {!result && <View style={styles.chipDot} />}
      </View>
      <View style={styles.flex}>
        <AppText variant="label" color={result ? colors.text : "#2B1D00"}>
          {t("home.daily")}
        </AppText>
        <AppText variant="caption" color={result ? colors.textSecondary : "#2B1D00"}>
          {status}
        </AppText>
        {result && (
          <AppText variant="caption" tone="textMuted">
            {t("campaign.dailyTomorrow")}
          </AppText>
        )}
      </View>
    </Chunky>
  );
}

/** Station „Parcours des Tages“ am Ende des Pfads: wie die Online-Karte, mit Bestwert. */
function ParcoursStation({ best }: { best: Record<number, number> }) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  // Bei jedem Zeichnen neu (die Seite zeichnet bei jeder Rückkehr) – nach Mitternacht der neue Parcours
  const id = dailyParcoursId(todayKey(), PARCOURS.map((p) => p.id));
  const level = PARCOURS.find((p) => p.id === id) ?? PARCOURS[0];
  const score = best[level.id] ?? 0;
  const sub = score > 0 ? t("parcours.best", { n: score }) : t("parcours.noBest");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("hub.parcours.title")}. ${t(level.task)}. ${sub}`}
      onPress={() => {
        sfx("tap");
        tapHaptic();
        router.push({ pathname: "/runde", params: { mode: "parcours", level: String(level.id) } });
      }}
      style={({ pressed }) => [
        styles.trick,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && press.pressed,
      ]}
    >
      <AppText style={styles.trickEmoji} importantForAccessibility="no">
        {levelIcons(level)[0] ?? "🎯"}
      </AppText>
      <View style={styles.flex}>
        <AppText variant="label">{t("hub.parcours.title")}</AppText>
        <AppText variant="caption" tone="textSecondary" numberOfLines={3}>
          {t("hub.parcours.desc", { task: t(level.task), s: level.seconds })}
        </AppText>
        <AppText variant="caption" tone={score > 0 ? "gold" : "textMuted"}>
          {sub}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Seitenstation „Trick-Schule“ einer Welt: 4 Trick-Level, 1 Tipp startet das nächste. */
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
      onPress={() => {
        // Gesperrt: spürbar antworten und den Grund vorlesen (steht auch auf der Karte)
        if (!open) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          AccessibilityInfo.announceForAccessibility(status);
          return;
        }
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
        pressed && open && press.pressed,
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
      <AppText variant="label" tone="gold">
        ★ {got}/{levels.length * 3}
      </AppText>
    </Pressable>
  );
}

function StationDot({
  station,
  offset,
  color,
  onColor,
  stars,
  unlocked,
  isCurrent,
  onCurrentLayout,
}: {
  station: Station;
  offset: number;
  color: string;
  /** Schriftfarbe auf `color`. */
  onColor: string;
  stars: number;
  unlocked: boolean;
  isCurrent: boolean;
  onCurrentLayout: (y: number) => void;
}) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  const [hop] = useState(() => new Animated.Value(0));
  // Begleiter-Tonne wackelt alle paar Sekunden kurz
  const [wiggle, setWiggle] = useState(0);
  useEffect(() => {
    if (!isCurrent || reduceMotion) return;
    const id = setInterval(() => setWiggle((w) => w + 1), 3500);
    return () => clearInterval(id);
  }, [isCurrent, reduceMotion]);
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

  // Neue Sterne (zurück aus der Runde): Sterne springen kurz auf (ROADMAP R6d)
  const [pop] = useState(() => new Animated.Value(1));
  const seenStars = useRef(stars);
  // Vor dem Zeichnen klein setzen – sonst blitzen neue Sterne einen Frame groß auf
  useLayoutEffect(() => {
    const more = stars > seenStars.current;
    seenStars.current = stars;
    if (!more || reduceMotion) return;
    pop.setValue(0);
    Animated.sequence([
      Animated.delay(350),
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [stars, reduceMotion, pop]);

  const kind = station.kind ? `, ${t(`campaign.kind.${station.kind}`)}` : "";
  const goal =
    station.kind === "time"
      ? t("campaign.goalTime", { goal: station.goal, total: station.total })
      : station.kind === "survival"
        ? t("campaign.goalSurvival", { goal: station.goal })
        : station.kind === "boss"
          ? t("campaign.goalBoss", { goal: station.goal, total: station.total })
          : t("campaign.goal", { goal: station.goal, total: station.total });
  // Vorleser: Ziel gehört dazu (sehend steht es nur an der aktuellen Station) –
  // eigene Texte ohne Emojis und ★, sonst liest VoiceOver Symbolnamen vor
  const spoken =
    station.kind === "time"
      ? t("campaign.a11y.goalTime", { goal: station.goal, total: station.total })
      : station.kind === "survival"
        ? t("campaign.a11y.goalSurvival", { goal: station.goal })
        : station.kind === "boss"
          ? t("campaign.a11y.goalBoss", { goal: station.goal, total: station.total })
          : goal;
  const label = unlocked
    ? `${t("campaign.station", { id: station.id })}${kind}, ${t("common.starsOf", { n: stars })}, ${spoken}`
    : `${t("campaign.station", { id: station.id })}${kind}, ${t("campaign.locked")}`;
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
      {/* Begleiter: die Tonne der Welt steht neben der aktuellen Station */}
      {isCurrent && unlocked && (
        <View
          pointerEvents="none"
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={[styles.mascot, { marginLeft: offset > 0 ? -(MASCOT_GAP + 28) : MASCOT_GAP - 28 }]}
        >
          <BinIcon color={color} size={56} wiggle={wiggle} reduceMotion={reduceMotion} />
        </View>
      )}
      <Animated.View style={{ transform: [{ translateY: hop }] }}>
        {/* Sprechblase „Los!“ über der aktuellen Station */}
        {isCurrent && unlocked && stars < 3 && (
          <View
            pointerEvents="none"
            importantForAccessibility="no"
            accessibilityElementsHidden
            style={styles.startWrap}
          >
            <View style={[styles.startBubble, { backgroundColor: colors.surface, borderColor: color }]}>
              <AppText variant="label" color={colors.text}>
                {t("campaign.go").toUpperCase()}
              </AppText>
            </View>
            <View style={[styles.startCaret, { backgroundColor: colors.surface, borderColor: color }]} />
          </View>
        )}
        <View style={isCurrent && unlocked ? [styles.ring, { borderColor: "#FFD54A" }] : undefined}>
          <Chunky
            color={unlocked ? color : colors.surfaceAlt}
            edge={unlocked ? tone(color, -0.32) : colors.border}
            depth={7}
            radius={DOT}
            label={label}
            disabled={!unlocked}
            onPress={() => startStation(station)}
            faceStyle={styles.dotFace}
          >
            <AppText variant="heading" color={unlocked ? onColor : colors.textMuted}>
              {unlocked ? station.id : "🔒"}
            </AppText>
          </Chunky>
        </View>
        {station.kind && (
          <View pointerEvents="none" style={[styles.kind, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={styles.kindEmoji}>{KIND_EMOJI[station.kind]}</AppText>
          </View>
        )}
      </Animated.View>
      {unlocked && stars > 0 && (
        <Animated.View style={{ opacity: pop, transform: [{ scale: pop }] }}>
          <AppText variant="label" style={styles.stars}>
            {"★".repeat(stars)}
            <AppText variant="label" color={colors.border}>
              {"★".repeat(3 - stars)}
            </AppText>
          </AppText>
        </Animated.View>
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
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  nextReward: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  nextRewardEmoji: { fontSize: 26, lineHeight: 32 },
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, paddingTop: Spacing.sm, gap: Spacing.md },
  bold: { fontWeight: "700" },
  tiles: { flexDirection: "row", gap: Spacing.sm },
  tile: { flex: 1 },
  tileFace: { minHeight: 88, gap: 2, paddingVertical: 10, paddingHorizontal: 4 },
  tileEmoji: { fontSize: 26, lineHeight: 32 },
  tileText: { fontWeight: "700" },
  banner: {
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.xs + 2,
    borderBottomWidth: 4,
  },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  bannerTitle: { opacity: 0.85 },
  bookFace: { width: 44, height: 40 },
  bookEmoji: { fontSize: 20, lineHeight: 26 },
  ribbon: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.md },
  ribbonLine: { flex: 1, height: 3, borderRadius: 2, opacity: 0.7 },
  mascot: { position: "absolute", left: "50%", top: 44 },
  startWrap: { position: "absolute", top: -34, left: 0, right: 0, alignItems: "center", zIndex: 2 },
  startBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.md,
    borderWidth: 2,
  },
  startCaret: {
    width: 12,
    height: 12,
    marginTop: -7,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: "45deg" }],
  },
  ring: { padding: 4, borderWidth: 3, borderRadius: DOT },
  dotFace: { width: DOT, height: DOT },
  headStart: { padding: Spacing.md - 4, borderRadius: Radius.md, borderWidth: 1.5 },
  dailyWrap: { alignSelf: "stretch" },
  dailyFace: { flexDirection: "row", alignSelf: "stretch", justifyContent: "flex-start", gap: Spacing.sm, minHeight: 68, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  dailyDot: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  /** Roter Punkt „hier wartet etwas“ (Tagesaufgabe offen). */
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
  stationWrap: { alignItems: "center", paddingTop: Spacing.lg },
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
  goBadge: {
    position: "absolute",
    top: (DOT + 12) / 2 - 15,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: "#FFD54A",
  },
  goBadgeRight: { left: DOT + 18 },
  goBadgeLeft: { right: DOT + 18 },
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
