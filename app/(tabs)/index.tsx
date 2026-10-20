// Datei: app/(tabs)/index.tsx — Titelbild-Menü
//
// Vorbild: Titelbildschirme wie „Just wanted to FISH“ – die Spielwelt IST
// das Menü. Für Hochformat angepasst: Logo oben, lebendige 3D-Szene in der
// Mitte (führt sich selbst vor und zeigt, was in welche Tonne gehört),
// Menü unten im Daumenbereich. Jede Zeile startet direkt – ein Tipp genügt.

import { Feather } from "@expo/vector-icons";
import { Canvas } from "@react-three/fiber/native";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useIsFocused } from "expo-router";
import { type ComponentProps, useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MenuScene } from "@/components/game/menu-scene";
import { AppText } from "@/components/ui/app-text";
import { Scrim } from "@/components/ui/scrim";
import { CAMERA_FOV } from "@/game/layout";
import {
  type GameMode,
  getLastMode,
  getModeConfig,
  MODES,
  startGame,
} from "@/constants/modes";
import { Radius, Spacing } from "@/constants/theme";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import {
  getActiveStreak,
  getHighscoreKey,
  getLevelProgress,
  getNumber,
  StorageKeys,
} from "@/utils/storage";
import { refreshSfxSetting, sfx } from "@/utils/sfx";

type IconName = ComponentProps<typeof Feather>["name"];
type Scores = Record<GameMode, number>;

const HIGHSCORE_MODE = { endless: "endlos", survival: "runden", time: "zeit" } as const;

// Text über der Szene: immer hell mit Schatten (Kontrast auf hellem & dunklem Himmel)
const ON_SCENE = "#FFFFFF";
const ON_SCENE_SOFT = "rgba(255,255,255,0.86)";
const TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.55)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
} as const;

/** Farbe des Icon-Kreises pro Modus (gut unterscheidbar, nicht nur über Farbe: Icon + Text). */
const MODE_ACCENT: Record<GameMode, string> = {
  endless: "#4CC38A",
  survival: "#86B7F0",
  time: "#E8C46A",
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { colors, scheme } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  const { t, formatNumber } = useI18n();
  // Nur zeichnen, wenn sichtbar – sonst liefen Menü- und Spiel-3D gleichzeitig.
  const focused = useIsFocused();

  const [scores, setScores] = useState<Scores>({ endless: 0, survival: 0, time: 0 });
  const [lastMode, setLastMode] = useState<GameMode>("endless");
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const starting = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      starting.current = false;
      refreshSfxSetting();

      Promise.all([
        getNumber(getHighscoreKey(HIGHSCORE_MODE.endless)),
        getNumber(getHighscoreKey(HIGHSCORE_MODE.survival)),
        getNumber(getHighscoreKey(HIGHSCORE_MODE.time)),
        getActiveStreak(),
        getNumber(StorageKeys.TOTAL_XP),
        getLastMode(),
      ])
        .then(([endless, survival, time, activeStreak, xp, mode]) => {
          if (!active) return;
          setScores({ endless, survival, time });
          setStreak(activeStreak);
          setTotalXP(xp);
          setLastMode(mode);
        })
        .catch((error) => console.warn("[Home] Fortschritt konnte nicht geladen werden:", error))
        .finally(() => active && setLoaded(true));

      return () => {
        active = false;
      };
    }, []),
  );

  const start = (mode: GameMode) => {
    if (starting.current) return;
    starting.current = true;
    sfx("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    startGame(mode);
  };

  const { level, progress } = getLevelProgress(totalXP);
  const lastTitle = t(getModeConfig(lastMode).titleKey);
  const menuHeight = Math.min(height * 0.58, 520);
  // Kleine Handys (z. B. iPhone SE): Untertitel ausblenden, Zeilen flacher
  const compact = height < 740;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Durchgehender, lebendiger Hintergrund */}
      {focused && (
        <Canvas
          style={{ position: "absolute", left: 0, top: 0, width, height }}
          shadows={false}
          camera={{ fov: CAMERA_FOV, near: 0.1, far: 80 }}
          gl={{ antialias: true }}
        >
          <MenuScene width={width} height={height} scheme={scheme} calm={reduceMotion} />
        </Canvas>
      )}

      <Scrim edge="top" height={insets.top + 170} maxOpacity={0.45} />
      <Scrim edge="bottom" height={menuHeight + 80} maxOpacity={0.82} />

      {/* Kopf: Logo links, Fortschritt + Einstellungen rechts */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View
          style={styles.logo}
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${t("home.titleTop")} ${t("home.titleBottom")}`}
        >
          <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
            <AppText style={styles.logoIcon}>♻️</AppText>
          </View>
          <View>
            <AppText variant="title" color={ON_SCENE} style={[styles.logoTop, TEXT_SHADOW]}>
              {t("home.titleTop").toUpperCase()}
            </AppText>
            <AppText variant="display" color={ON_SCENE} style={[styles.logoBottom, TEXT_SHADOW]}>
              {t("home.titleBottom").toUpperCase()}
            </AppText>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View
            style={styles.levelChip}
            accessible
            accessibilityLabel={`${t("common.level")} ${level}, ${streak} ${t("home.daysInRow")}`}
          >
            <AppText variant="label" color={ON_SCENE}>
              Lv {loaded ? level : "—"}
            </AppText>
            <View style={styles.levelTrack}>
              <View
                style={[
                  styles.levelFill,
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
            {streak > 0 && (
              <AppText variant="caption" color={ON_SCENE_SOFT}>
                🔥 {streak}
              </AppText>
            )}
          </View>
        </View>
      </View>

      {/* Menü unten im Daumenbereich */}
      <View
        style={[styles.menu, { paddingBottom: insets.bottom + Spacing.md }]}
        accessibilityRole="menu"
        accessibilityLabel={t("home.modesLabel")}
      >
        {/* Hauptaktion: dort weitermachen, wo man aufgehört hat */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t("home.continue")}: ${lastTitle}`}
          onPress={() => start(lastMode)}
          style={({ pressed }) => [
            styles.continue,
            { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
            pressed && styles.pressed,
          ]}
        >
          <Feather name="play" size={26} color={colors.onPrimary} />
          <View style={styles.flex}>
            <AppText variant="heading" tone="onPrimary">
              {t("home.continue")}
            </AppText>
            <AppText variant="caption" tone="onPrimary">
              {lastTitle}
              {loaded && scores[lastMode] > 0
                ? `  ·  🏆 ${formatNumber(scores[lastMode])}`
                : ""}
            </AppText>
          </View>
          <Feather name="chevron-right" size={24} color={colors.onPrimary} />
        </Pressable>

        {/* Die 3 Modi – direkt auf dem Hintergrund */}
        {MODES.map((m) => (
          <MenuRow
            key={m.mode}
            icon={m.icon}
            accent={MODE_ACCENT[m.mode]}
            title={t(m.titleKey)}
            description={t(m.descKey)}
            record={loaded && scores[m.mode] > 0 ? formatNumber(scores[m.mode]) : null}
            recordLabel={t("home.record")}
            highlight={m.mode === lastMode}
            compact={compact}
            onPress={() => start(m.mode)}
          />
        ))}

        {/* Kleine Nebenaktionen */}
        <View style={styles.footer}>
          <FooterLink icon="help-circle" label={t("home.tutorial")} onPress={() => router.push("/tutorial")} />
          <View style={styles.footerDot} />
          <FooterLink icon="settings" label={t("home.settings")} onPress={() => router.push("/einstellung")} />
        </View>
      </View>
    </View>
  );
}

/* ── Bausteine ─────────────────────────────────────────────── */

function MenuRow({
  icon,
  accent,
  title,
  description,
  record,
  recordLabel,
  highlight,
  compact,
  onPress,
}: {
  icon: IconName;
  accent: string;
  title: string;
  description: string;
  record: string | null;
  recordLabel: string;
  highlight: boolean;
  compact: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}${record ? `. ${recordLabel} ${record}` : ""}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        highlight && styles.rowHighlight,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: accent }]}>
        <Feather name={icon} size={22} color="#0D1A14" />
      </View>
      <View style={styles.flex}>
        <AppText variant="heading" color={ON_SCENE} style={TEXT_SHADOW}>
          {title}
        </AppText>
        {!compact && (
          <AppText variant="caption" color={ON_SCENE_SOFT} style={TEXT_SHADOW} numberOfLines={1}>
            {description}
          </AppText>
        )}
      </View>
      {record && (
        <View style={styles.record}>
          <AppText variant="caption" color={ON_SCENE_SOFT}>
            🏆
          </AppText>
          <AppText variant="label" color={ON_SCENE} style={TEXT_SHADOW}>
            {record}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

function FooterLink({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.footerLink, pressed && { opacity: 0.6 }]}
    >
      <Feather name={icon} size={18} color={ON_SCENE_SOFT} />
      <AppText variant="label" color={ON_SCENE_SOFT}>
        {label}
      </AppText>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  header: {
    position: "absolute",
    top: 0,
    left: Spacing.md + 4,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  logo: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  logoIcon: { fontSize: 28, lineHeight: 34 },
  logoTop: { fontSize: 22, lineHeight: 24, letterSpacing: 3 },
  logoBottom: { fontSize: 34, lineHeight: 38, letterSpacing: 0.5 },

  headerRight: { alignItems: "flex-end", gap: Spacing.sm },
  levelChip: {
    alignItems: "flex-end",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  levelTrack: {
    width: 64,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  levelFill: { height: "100%", borderRadius: 3 },

  menu: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    bottom: 0,
    gap: Spacing.xs,
  },
  continue: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 68,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 62,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
  },
  rowCompact: { minHeight: 52 },
  rowHighlight: { backgroundColor: "rgba(255,255,255,0.08)" },
  rowPressed: { backgroundColor: "rgba(255,255,255,0.18)", transform: [{ scale: 0.98 }] },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  record: { alignItems: "flex-end" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  footerLink: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  footerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: ON_SCENE_SOFT },

  pressed: { transform: [{ scale: 0.98 }] },
});
