// Datei: app/(tabs)/index.tsx

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { type ComponentProps, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { ITEMS } from "@/constants/items";
import {
  type GameMode,
  getLastMode,
  getModeConfig,
  MODES,
  startGame,
} from "@/constants/modes";
import { Radius, Spacing } from "@/constants/theme";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import {
  getActiveStreak,
  getHighscoreKey,
  getLevelProgress,
  getModeStats,
  getNumber,
  type ModeStatsMap,
  StorageKeys,
} from "@/utils/storage";

type IconName = ComponentProps<typeof Feather>["name"];
type Scores = Record<GameMode, number>;
type BinKind = "bio" | "gelb" | "rest";

const HIGHSCORE_MODE = {
  endless: "endlos",
  survival: "runden",
  time: "zeit",
} as const;

const INITIAL_SCORES: Scores = {
  endless: 0,
  survival: 0,
  time: 0,
};

const INITIAL_STATS: ModeStatsMap = {
  endless: {
    games: 0,
    bestStreak: 0,
    bestCorrect: 0,
    throws: 0,
    correct: 0,
  },
  survival: {
    games: 0,
    bestStreak: 0,
    bestCorrect: 0,
    throws: 0,
    correct: 0,
  },
  time: {
    games: 0,
    bestStreak: 0,
    bestCorrect: 0,
    throws: 0,
    correct: 0,
  },
};

const BIN_PALETTE: Record<
  BinKind,
  {
    body: string;
    side: string;
    lid: string;
    badge: string;
    ink: string;
    icon: IconName;
  }
> = {
  bio: {
    body: "#986544",
    side: "#71452F",
    lid: "#B28059",
    badge: "#F8EAD9",
    ink: "#795037",
    icon: "feather",
  },
  gelb: {
    body: "#E6B82E",
    side: "#B88C17",
    lid: "#F6D15B",
    badge: "#FFF3CC",
    ink: "#8B6812",
    icon: "package",
  },
  rest: {
    body: "#647381",
    side: "#455460",
    lid: "#82939E",
    badge: "#EAF0F3",
    ink: "#4C5D69",
    icon: "trash-2",
  },
};

const SCENE_PALETTE: Record<
  GameMode,
  {
    accent: string;
    ink: string;
    icon: IconName;
  }
> = {
  endless: {
    accent: "#52B78A",
    ink: "#91D9AF",
    icon: "feather",
  },
  survival: {
    accent: "#548CA8",
    ink: "#A9D2E4",
    icon: "shield",
  },
  time: {
    accent: "#4FA5AA",
    ink: "#F5D78B",
    icon: "clock",
  },
};

function pickDailyFact() {
  const candidates = ITEMS.filter((item) => Boolean(item.fact));

  if (candidates.length === 0) return null;

  const day = Math.floor(Date.now() / 86_400_000);
  return candidates[day % candidates.length];
}

function formatAccuracy(
  correct: number,
  throws: number,
  formatNumber: (value: number) => string,
) {
  if (throws === 0) return "—";

  const percentage = Math.min(
    100,
    Math.max(0, Math.round((correct / throws) * 100)),
  );

  return `${formatNumber(percentage)} %`;
}

/**
 * Ausschließlich Menü-Illustration.
 * Keine Änderung an den Tonnen im eigentlichen Spiel.
 */
function IllustratedBin({ kind }: { kind: BinKind }) {
  const palette = BIN_PALETTE[kind];

  return (
    <View style={styles.bin}>
      <View style={styles.binShadowOuter} />
      <View style={styles.binShadowInner} />

      <View style={[styles.binBody, { backgroundColor: palette.body }]}>
        <View style={styles.binHighlight} />

        <View style={[styles.binSide, { backgroundColor: palette.side }]} />

        <View style={[styles.binBadge, { backgroundColor: palette.badge }]}>
          <Feather name={palette.icon} size={22} color={palette.ink} />
        </View>

        <View style={[styles.binBottom, { backgroundColor: palette.side }]} />
      </View>

      <View style={[styles.binLid, { backgroundColor: palette.lid }]}>
        <View style={styles.lidHighlight} />
      </View>

      <View style={[styles.binHandle, { backgroundColor: palette.side }]} />

      <View style={[styles.binWheel, styles.leftWheel]} />
      <View style={[styles.binWheel, styles.rightWheel]} />
    </View>
  );
}

function Plant({
  color,
  mirrored = false,
}: {
  color: string;
  mirrored?: boolean;
}) {
  return (
    <View style={[styles.plant, mirrored && styles.mirrored]}>
      <View style={[styles.plantStem, { backgroundColor: color }]} />

      <View
        style={[
          styles.plantLeaf,
          styles.plantLeafLeft,
          { backgroundColor: color },
        ]}
      />

      <View
        style={[
          styles.plantLeaf,
          styles.plantLeafRight,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

function ModeEmblem({ mode }: { mode: GameMode }) {
  const scene = SCENE_PALETTE[mode];

  return (
    <View style={styles.modeEmblem}>
      {mode === "time" && (
        <View
          style={[styles.stopwatchButton, { backgroundColor: scene.ink }]}
        />
      )}

      <Feather name={scene.icon} size={34} color={scene.ink} />

      {mode === "survival" && (
        <View style={styles.shieldCheck}>
          <Feather name="check" size={13} color={scene.ink} />
        </View>
      )}
    </View>
  );
}

function SceneAccent({ mode }: { mode: GameMode }) {
  const scene = SCENE_PALETTE[mode];

  if (mode === "endless") {
    return (
      <View style={styles.sceneAccent}>
        <View style={styles.smallLeaf}>
          <Feather name="feather" size={18} color={scene.ink} />
        </View>

        <View
          style={[
            styles.pathDash,
            styles.pathDashOne,
            { backgroundColor: scene.ink },
          ]}
        />

        <View
          style={[
            styles.pathDash,
            styles.pathDashTwo,
            { backgroundColor: scene.ink },
          ]}
        />

        <View style={styles.pathArrow}>
          <Feather name="arrow-down-left" size={12} color={scene.ink} />
        </View>
      </View>
    );
  }

  if (mode === "survival") {
    return (
      <View style={styles.sceneAccent}>
        <View style={styles.sparkOne}>
          <Feather name="plus" size={15} color={scene.ink} />
        </View>

        <View style={styles.sparkTwo}>
          <Feather name="plus" size={10} color={scene.ink} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sceneAccent}>
      <View style={styles.flyingPackage}>
        <Feather name="package" size={20} color={scene.ink} />
      </View>

      <View
        style={[
          styles.speedLine,
          styles.speedLineOne,
          { backgroundColor: scene.ink },
        ]}
      />

      <View
        style={[
          styles.speedLine,
          styles.speedLineTwo,
          { backgroundColor: scene.ink },
        ]}
      />

      <View
        style={[
          styles.speedLine,
          styles.speedLineThree,
          { backgroundColor: scene.ink },
        ]}
      />
    </View>
  );
}

function MenuIllustration({ mode }: { mode: GameMode }) {
  const { colors } = useAppTheme();
  const scene = SCENE_PALETTE[mode];

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.illustration, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.sceneTint, { backgroundColor: scene.accent }]} />

      {/* Dezenter Hintergrund */}
      <View
        style={[
          styles.hill,
          styles.hillLeft,
          { backgroundColor: scene.accent },
        ]}
      />

      <View
        style={[
          styles.hill,
          styles.hillRight,
          { backgroundColor: scene.accent },
        ]}
      />

      {/* Flacher, zurückhaltender Boden */}
      <View style={[styles.sceneGround, { backgroundColor: scene.accent }]} />

      {/* Motiv in jedem Modus an derselben Position */}
      <ModeEmblem mode={mode} />
      <SceneAccent mode={mode} />

      {mode === "endless" && (
        <>
          <View style={styles.plantLeft}>
            <Plant color="#69A87C" />
          </View>

          <View style={styles.plantRight}>
            <Plant color="#528A69" mirrored />
          </View>
        </>
      )}

      <View style={styles.binGroup}>
        <View style={styles.leftBinRotation}>
          <IllustratedBin kind="bio" />
        </View>

        <View style={styles.middleBinPosition}>
          <IllustratedBin kind="gelb" />
        </View>

        <View style={styles.rightBinRotation}>
          <IllustratedBin kind="rest" />
        </View>
      </View>
    </View>
  );
}

function ModeOption({
  title,
  fullTitle,
  icon,
  selected,
  onPress,
}: {
  title: string;
  fullTitle: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={fullTitle}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeOption,
        {
          backgroundColor: selected ? colors.primarySoft : "transparent",
        },
        pressed && styles.pressed,
      ]}
    >
      <Feather
        name={icon}
        size={18}
        color={selected ? colors.onPrimarySoft : colors.textMuted}
      />

      <AppText
        variant="label"
        center
        style={[
          styles.modeTitle,
          {
            color: selected ? colors.onPrimarySoft : colors.textSecondary,
          },
        ]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

function RecordValue({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.recordValue}
    >
      <View style={styles.recordLabel}>
        <Feather name={icon} size={15} color={colors.textMuted} />

        <AppText variant="caption" tone="textMuted" style={styles.shrink}>
          {label}
        </AppText>
      </View>

      <AppText variant="number" style={styles.number}>
        {value}
      </AppText>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.detailRow}
    >
      <AppText tone="textSecondary" style={styles.flex}>
        {label}
      </AppText>

      <AppText variant="bodyStrong" style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t, formatNumber } = useI18n();

  const [scores, setScores] = useState<Scores>(INITIAL_SCORES);

  const [modeStats, setModeStats] = useState<ModeStatsMap>(INITIAL_STATS);

  const [mode, setMode] = useState<GameMode>("endless");
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dailyFact, setDailyFact] = useState(pickDailyFact);

  const selectionVersion = useRef(0);
  const starting = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const versionAtStart = selectionVersion.current;

      starting.current = false;
      setLoadError(false);
      setDailyFact(pickDailyFact());

      async function loadHome() {
        try {
          const [
            endless,
            survival,
            time,
            storedStats,
            activeStreak,
            xp,
            lastMode,
          ] = await Promise.all([
            getNumber(getHighscoreKey(HIGHSCORE_MODE.endless)),
            getNumber(getHighscoreKey(HIGHSCORE_MODE.survival)),
            getNumber(getHighscoreKey(HIGHSCORE_MODE.time)),
            getModeStats(),
            getActiveStreak(),
            getNumber(StorageKeys.TOTAL_XP),
            getLastMode(),
          ]);

          if (!active) return;

          setScores({ endless, survival, time });
          setModeStats(storedStats);
          setStreak(activeStreak);
          setTotalXP(xp);

          if (selectionVersion.current === versionAtStart) {
            setMode(lastMode);
          }
        } catch (error) {
          if (!active) return;

          setLoadError(true);

          console.warn(
            "[Home] Fortschritt konnte nicht geladen werden:",
            error,
          );
        } finally {
          if (active) setLoading(false);
        }
      }

      void loadHome();

      return () => {
        active = false;
      };
    }, []),
  );

  const selectMode = (nextMode: GameMode) => {
    selectionVersion.current += 1;
    setMode(nextMode);
  };

  const handleStart = () => {
    if (loading || starting.current) return;

    starting.current = true;

    try {
      startGame(mode);
    } catch (error) {
      starting.current = false;

      console.warn("[Home] Spielstart fehlgeschlagen:", error);
    }
  };

  const current = getModeConfig(mode);
  const modeTitle = t(current.titleKey);
  const modeDescription = t(current.descKey);
  const selectedStats = modeStats[mode];

  const { level, progress, xpRemaining } = getLevelProgress(totalXP);

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(progress * 100)),
  );

  const scoreValue = loading || loadError ? "—" : formatNumber(scores[mode]);

  const specialLabel = mode === "time" ? "Treffer-Rekord" : "Beste Serie";

  const specialValue =
    loading || loadError
      ? "—"
      : formatNumber(
          mode === "time"
            ? selectedStats.bestCorrect
            : selectedStats.bestStreak,
        );

  const accuracy = formatAccuracy(
    selectedStats.correct,
    selectedStats.throws,
    formatNumber,
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.sm,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <View style={styles.container}>
          {/* Kopfzeile */}
          <View style={styles.header}>
            <View style={styles.progressSummary}>
              <View style={styles.progressLabels}>
                <AppText variant="bodyStrong">
                  {t("common.level")} {loading ? "—" : formatNumber(level)}
                </AppText>

                <View
                  accessible
                  accessibilityLabel={`Tägliche Spielserie: ${formatNumber(streak)} Tage`}
                  style={styles.streak}
                >
                  <Feather name="sun" size={14} color={colors.gold} />

                  <AppText variant="caption" tone="textMuted">
                    {loading ? "—" : formatNumber(streak)}{" "}
                    {streak === 1 ? "Tag" : "Tage"}
                  </AppText>
                </View>
              </View>

              <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={t("home.progress")}
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: loading ? 0 : progressPercent,
                }}
                style={[
                  styles.progressTrack,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${loading ? 0 : progressPercent}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.headerActions}>
              <IconButton
                icon="help-circle"
                label={t("home.tutorial")}
                onPress={() => router.push("/tutorial")}
              />

              <IconButton
                icon="settings"
                label={t("home.settings")}
                onPress={() => router.push("/einstellung")}
              />
            </View>
          </View>

          <MenuIllustration mode={mode} />

          <View style={styles.playSection}>
            {/* Moduswahl */}
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Spielmodus"
              style={[
                styles.modeSelector,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              {MODES.map((item) => {
                const fullTitle = t(item.titleKey);

                return (
                  <ModeOption
                    key={item.mode}
                    title={item.mode === "time" ? "Zeit" : fullTitle}
                    fullTitle={fullTitle}
                    icon={item.icon}
                    selected={item.mode === mode}
                    onPress={() => selectMode(item.mode)}
                  />
                );
              })}
            </View>

            <AppText
              variant="caption"
              tone="textSecondary"
              center
              style={styles.modeDescription}
            >
              {modeDescription}
            </AppText>

            {/* Rekorde ohne wiederholte Moduszeile */}
            <View style={[styles.records, { borderColor: colors.border }]}>
              <View style={styles.recordsRow} accessibilityLiveRegion="polite">
                <RecordValue
                  icon="award"
                  label="Punkte-Rekord"
                  value={scoreValue}
                />

                <View
                  style={[
                    styles.recordDivider,
                    { backgroundColor: colors.border },
                  ]}
                />

                <RecordValue
                  icon={mode === "time" ? "clock" : "trending-up"}
                  label={specialLabel}
                  value={specialValue}
                />
              </View>

              {loadError && (
                <AppText variant="caption" tone="textMuted" center>
                  Statistik momentan nicht verfügbar.
                </AppText>
              )}
            </View>

            {/* Reihenfolge bleibt erhalten */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t("home.play")} – ${modeTitle}`}
              accessibilityState={{
                disabled: loading,
                busy: loading,
              }}
              disabled={loading}
              onPress={handleStart}
              style={({ pressed }) => [
                styles.playButton,
                {
                  backgroundColor: pressed
                    ? colors.primaryPressed
                    : colors.primary,
                  opacity: loading ? 0.65 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Feather name="play" size={23} color={colors.onPrimary} />
              )}

              <AppText variant="heading" style={{ color: colors.onPrimary }}>
                {t("home.play")}
              </AppText>
            </Pressable>
          </View>

          {/* Aufklappbare Statistik */}
          <View style={[styles.details, { borderColor: colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Deine Statistik"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded((value) => !value)}
              style={({ pressed }) => [
                styles.detailsToggle,
                pressed && styles.pressed,
              ]}
            >
              <Feather
                name="bar-chart-2"
                size={19}
                color={colors.textSecondary}
              />

              <AppText variant="label" style={styles.flex}>
                Deine Statistik
              </AppText>

              <Feather
                name={expanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>

            {expanded && (
              <View
                style={[
                  styles.detailsContent,
                  { borderTopColor: colors.border },
                ]}
              >
                <AppText variant="bodyStrong" style={styles.detailsHeading}>
                  {modeTitle}
                </AppText>

                <DetailRow
                  label="Runden"
                  value={
                    loading || loadError
                      ? "—"
                      : formatNumber(selectedStats.games)
                  }
                />

                <DetailRow
                  label="Trefferquote"
                  value={loading || loadError ? "—" : accuracy}
                />

                <DetailRow
                  label="Richtig sortiert"
                  value={
                    loading || loadError
                      ? "—"
                      : formatNumber(selectedStats.correct)
                  }
                />

                <DetailRow
                  label="Gewertete Würfe"
                  value={
                    loading || loadError
                      ? "—"
                      : formatNumber(selectedStats.throws)
                  }
                />

                <View
                  style={[
                    styles.totalProgress,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <DetailRow
                    label="Gesamt-XP · alle Modi"
                    value={loading || loadError ? "—" : formatNumber(totalXP)}
                  />

                  {!loading && !loadError && (
                    <AppText variant="caption" tone="textMuted">
                      {t("home.xpToNext", {
                        xp: formatNumber(xpRemaining),
                        level: level + 1,
                      })}
                    </AppText>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Bestehender Faktbereich */}
          {dailyFact && (
            <View style={[styles.fact, { backgroundColor: colors.surface }]}>
              <View
                style={[styles.factIcon, { backgroundColor: colors.infoSoft }]}
              >
                <Feather name="info" size={18} color={colors.info} />
              </View>

              <View style={styles.factText}>
                <AppText variant="overline" tone="textMuted">
                  {t("home.factTitle")}
                </AppText>

                <AppText variant="label" tone="textSecondary">
                  {dailyFact.fact}
                </AppText>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  container: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: Spacing.lg,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  shrink: {
    flexShrink: 1,
  },

  // Kopfzeile
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 56,
  },
  progressSummary: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  progressLabels: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  progressTrack: {
    width: "100%",
    maxWidth: 200,
    height: 6,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: Radius.pill,
  },

  // Illustration
  illustration: {
    height: 182,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
  },
  sceneTint: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.09,
  },
  hill: {
    position: "absolute",
    width: 220,
    height: 110,
    borderRadius: 110,
    opacity: 0.035,
  },
  hillLeft: {
    left: -70,
    bottom: -28,
    transform: [{ rotate: "-12deg" }],
  },
  hillRight: {
    right: -80,
    bottom: -10,
    transform: [{ rotate: "12deg" }],
  },
  sceneGround: {
    position: "absolute",
    width: "82%",
    maxWidth: 330,
    height: 28,
    bottom: 20,
    borderRadius: 160,
    opacity: 0.1,
  },

  // Gleich positionierte Modusmotive
  modeEmblem: {
    position: "absolute",
    top: 22,
    right: "14%",
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
  },
  stopwatchButton: {
    position: "absolute",
    top: -2,
    left: 15,
    width: 9,
    height: 4,
    borderRadius: 2,
  },
  shieldCheck: {
    position: "absolute",
    top: 12,
    left: 13,
  },
  sceneAccent: {
    position: "absolute",
    top: 28,
    left: "16%",
    width: 64,
    height: 34,
    opacity: 0.65,
  },
  smallLeaf: {
    position: "absolute",
    top: 0,
    right: 6,
    transform: [{ rotate: "15deg" }],
  },
  pathDash: {
    position: "absolute",
    width: 6,
    height: 2,
    borderRadius: 2,
    opacity: 0.7,
  },
  pathDashOne: {
    top: 17,
    left: 31,
    transform: [{ rotate: "-38deg" }],
  },
  pathDashTwo: {
    top: 23,
    left: 21,
    transform: [{ rotate: "-45deg" }],
  },
  pathArrow: {
    position: "absolute",
    top: 24,
    left: 7,
    opacity: 0.8,
  },
  sparkOne: {
    position: "absolute",
    top: 2,
    left: 10,
  },
  sparkTwo: {
    position: "absolute",
    top: 19,
    right: 5,
    opacity: 0.65,
  },
  flyingPackage: {
    position: "absolute",
    top: 3,
    right: 0,
    transform: [{ rotate: "-16deg" }],
  },
  speedLine: {
    position: "absolute",
    height: 2,
    borderRadius: 2,
    opacity: 0.7,
  },
  speedLineOne: {
    top: 7,
    left: 7,
    width: 16,
  },
  speedLineTwo: {
    top: 14,
    left: 0,
    width: 22,
  },
  speedLineThree: {
    top: 21,
    left: 11,
    width: 12,
  },

  // Tonnen
  binGroup: {
    position: "absolute",
    bottom: 32,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 13,
  },
  leftBinRotation: {
    transform: [{ rotate: "-3deg" }],
  },
  middleBinPosition: {
    marginBottom: 3,
  },
  rightBinRotation: {
    transform: [{ rotate: "3deg" }],
  },
  bin: {
    width: 63,
    height: 85,
  },
  binShadowOuter: {
    position: "absolute",
    bottom: -5,
    left: 2,
    width: 59,
    height: 10,
    borderRadius: 30,
    backgroundColor: "#000000",
    opacity: 0.035,
  },
  binShadowInner: {
    position: "absolute",
    bottom: -2,
    left: 8,
    width: 47,
    height: 5,
    borderRadius: 24,
    backgroundColor: "#000000",
    opacity: 0.08,
  },
  binBody: {
    position: "absolute",
    top: 12,
    left: 5,
    right: 3,
    bottom: 5,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    overflow: "hidden",
  },
  binSide: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 10,
    opacity: 0.65,
  },
  binHighlight: {
    position: "absolute",
    left: 4,
    top: 6,
    width: 3,
    height: 43,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    opacity: 0.14,
  },
  binBadge: {
    position: "absolute",
    left: 9,
    top: 19,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  binBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
    opacity: 0.24,
  },
  binLid: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 5,
    height: 10,
    borderRadius: 4,
    overflow: "hidden",
  },
  lidHighlight: {
    position: "absolute",
    top: 1,
    left: 4,
    right: 5,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    opacity: 0.22,
  },
  binHandle: {
    position: "absolute",
    top: 0,
    left: 23,
    width: 18,
    height: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  binWheel: {
    position: "absolute",
    bottom: 0,
    width: 8,
    height: 8,
    borderRadius: 3,
    backgroundColor: "#25332F",
  },
  leftWheel: {
    left: 11,
  },
  rightWheel: {
    right: 8,
  },

  // Pflanzen im Übungsmodus
  plantLeft: {
    position: "absolute",
    bottom: 35,
    left: "8%",
    opacity: 0.65,
  },
  plantRight: {
    position: "absolute",
    bottom: 35,
    right: "8%",
    opacity: 0.5,
  },
  plant: {
    width: 24,
    height: 32,
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  plantStem: {
    position: "absolute",
    bottom: 0,
    left: 11,
    width: 2,
    height: 24,
    borderRadius: 2,
  },
  plantLeaf: {
    position: "absolute",
    width: 13,
    height: 7,
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  plantLeafLeft: {
    left: 0,
    top: 13,
    transform: [{ rotate: "32deg" }],
  },
  plantLeafRight: {
    right: 0,
    top: 5,
    transform: [{ rotate: "-30deg" }],
  },

  // Moduswahl
  playSection: {
    gap: Spacing.md,
  },
  modeSelector: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: Radius.xl,
  },
  modeOption: {
    flex: 1,
    minWidth: 0,
    minHeight: 62,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: Spacing.sm,
    gap: 5,
  },
  modeTitle: {
    flexShrink: 1,
  },
  modeDescription: {
    paddingHorizontal: Spacing.sm,
  },

  // Kompaktere Rekorde
  records: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  recordsRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  recordValue: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  recordLabel: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  recordDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: Spacing.sm,
  },
  number: {
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  playButton: {
    minHeight: 62,
    borderRadius: Radius.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm + 4,
  },

  // Statistik
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailsToggle: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm + 4,
    paddingVertical: Spacing.md,
  },
  detailsContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm + 4,
  },
  detailsHeading: {
    marginBottom: Spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  totalProgress: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },

  // Faktbereich
  fact: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm + 4,
  },
  factIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  factText: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});
