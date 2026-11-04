// Datei: components/areas/today-panel.tsx
//
// Tagesmissionen mit Stempeln und Truhe – Reiter „Heute“ im Regal (früher als
// große Karte im Pfad; dort bleibt nur noch eine schmale Stempelleiste).

import { router, useFocusEffect } from "expo-router";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { useShell } from "@/components/nav/shell-context";
import { AppText } from "@/components/ui/app-text";
import { press, tapHaptic } from "@/components/ui/press";
import { StampBar } from "@/components/ui/stamp-bar";
import { Radius, Spacing } from "@/constants/theme";
import { ALL_BINS, type BinDef } from "@/game/bins";
import { type Mission, type MissionDay, MISSION_XP, missionProgress } from "@/game/missions";
import { nextChestTrail, type TrailReward } from "@/game/rewards";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";
import { getChests, getMissionDay, getTodayDaily, openChest } from "@/utils/storage";

/** Gold der Truhen-Knöpfe (wie die Tagesaufgabe). */
const DAILY_GOLD = "#F5B800";

const binDef = (key: string): BinDef | undefined => ALL_BINS.find((b) => b.key === key);

const MISSION_EMOJI = { streak: "🔥", correct: "✅", online: "🌍", station: "⭐" } as const;

/** Die 3 Tagesmissionen mit Fortschritt (game/missions.ts). */
export type ChestResult = { reward: TrailReward | null; xp: number; opened: number; levelUp: number | null };

export function MissionCard({
  day,
  dailyDone,
  chestsWaiting,
  chest,
  onOpenChest,
}: {
  day: MissionDay;
  dailyDone: boolean;
  /** Verdiente, noch nicht geöffnete Truhen. */
  chestsWaiting: number;
  chest: ChestResult | null;
  onOpenChest: () => Promise<void>;
}) {
  const { t } = useI18n();
  const shell = useShell();
  const { colors } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  const next = chest ? nextChestTrail(chest.opened) : null;
  // Öffnen: Truhe wackelt kurz, dann springt das Ergebnis auf
  const [wobble] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(1));
  /** Gesperrt, bis das Ergebnis kurz zu sehen war – sonst überdeckt ein Doppeltipp die neue Spur. */
  const busy = useRef(false);
  /** Online-Mission: Doppeltipp öffnet den Online-Bereich nur einmal. */
  const goneAt = useRef(0);
  const goOnline = () => {
    const now = Date.now();
    if (now - goneAt.current < 1000) return;
    goneAt.current = now;
    // In der Bereichs-Hülle den Reiter wechseln, sonst die Seite öffnen
    if (shell.inShell) shell.goArea("online");
    else router.push("/online");
  };
  const openWithWobble = () => {
    if (busy.current) return;
    busy.current = true;
    tapHaptic();
    const open = () =>
      onOpenChest().finally(() => {
        setTimeout(() => {
          busy.current = false;
        }, 1500);
      });
    if (reduceMotion) {
      open();
      return;
    }
    const step = (to: number) => Animated.timing(wobble, { toValue: to, duration: 70, useNativeDriver: true });
    Animated.sequence([step(1), step(-1), step(1), step(-1), step(0)]).start(() => {
      open();
    });
  };
  const opened = chest?.opened;
  // Vor dem Zeichnen klein setzen – sonst blitzt die Karte einen Frame groß auf
  useLayoutEffect(() => {
    if (opened === undefined || reduceMotion) return;
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [opened, reduceMotion, pop]);
  const allDone = day.done.length >= day.missions.length;
  const text = (m: Mission) => {
    if (m.kind === "bin" && m.bin) return t("mission.bin", { bin: t(`bin.${m.bin}`), n: m.goal });
    if (m.kind === "streak") return t("mission.streak", { n: m.goal });
    if (m.kind === "correct") return t("mission.correct", { n: m.goal });
    if (m.kind === "online") return t("mission.online");
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
        // Online-Runde: direkt in den Online-Bereich springen
        const go = m.kind === "online" && !done;
        return (
          <Pressable
            key={m.id}
            style={({ pressed }) => [styles.missionRow, pressed && { opacity: 0.6 }]}
            disabled={!go}
            onPress={goOnline}
            accessible
            accessibilityRole={go ? "button" : undefined}
            accessibilityLabel={`${text(m)}: ${done ? t("mission.doneA11y") : `${n}/${m.goal}`}`}
          >
            <StampBar done={done ? 1 : 0} total={1} size={28} />
            <AppText variant="caption" style={styles.missionText} tone={done ? "textMuted" : go ? "primary" : undefined}>
              {emoji} {text(m)}{go ? " ›" : ""}
            </AppText>
            {!done && (
              <AppText variant="caption" style={{ fontWeight: "700" }} tone="textSecondary">
                {`${n}/${m.goal}`}
              </AppText>
            )}
          </Pressable>
        );
      })}
      {/* Flamme heute noch nicht sicher → erklären, was sie hält */}
      {day.done.length === 0 && !dailyDone && (
        <AppText variant="caption" tone="textMuted">
          {t("mission.flame")}
        </AppText>
      )}
      {!allDone && (
        <AppText variant="caption" tone="textSecondary">
          {t("chest.goal")}
        </AppText>
      )}
      {allDone && (
        <AppText variant="caption" tone="textSecondary">
          🎉 {t("mission.allDone")}
        </AppText>
      )}
      {chestsWaiting > 0 && (
        <Animated.View
          style={[
            styles.chestWrap,
            { transform: [{ rotate: wobble.interpolate({ inputRange: [-1, 1], outputRange: ["-8deg", "8deg"] }) }] },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chest.open")}
            onPress={openWithWobble}
            style={({ pressed }) => [styles.chestBtn, pressed && press.pressed]}
          >
            <AppText variant="label" color="#3A2A00">
              {t("chest.open")}
              {chestsWaiting > 1 ? ` (${chestsWaiting})` : ""}
            </AppText>
          </Pressable>
        </Animated.View>
      )}
      {chest && (
        <Animated.View
          style={[styles.chestResult, { backgroundColor: colors.goldSoft, transform: [{ scale: pop }] }]}
          accessibilityLiveRegion="polite"
        >
          <AppText variant="label" tone="onGoldSoft">
            {chest.reward ? `🎉 ${t("reward.new", { name: t(chest.reward.name) })}` : `🎁 ${t("chest.xp", { xp: chest.xp })}`}
          </AppText>
          {chest.levelUp !== null && (
            <AppText variant="label" tone="onGoldSoft">
              ⬆ {t("game.levelUp", { level: chest.levelUp })}
            </AppText>
          )}
          {chest.reward && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                sfx("tap");
                tapHaptic();
                router.push("/belohnungen");
              }}
              style={({ pressed }) => [styles.chestChoose, pressed && press.pressed]}
            >
              <AppText variant="label" tone="onGoldSoft">
                {t("chest.choose")} ›
              </AppText>
            </Pressable>
          )}
          {next && (
            <AppText variant="caption" tone="onGoldSoft">
              {next.left === 1 ? t("chest.nextOne") : t("chest.next", { n: next.left })}
            </AppText>
          )}
        </Animated.View>
      )}
    </View>
  );
}

export function TodayPanel() {
  const shell = useShell();
  const [missions, setMissions] = useState<MissionDay | null>(null);
  const [chests, setChests] = useState({ earned: 0, opened: 0 });
  /** Gerade geöffnete Truhe (nur diese Sitzung). */
  const [chest, setChest] = useState<ChestResult | null>(null);
  /** Tagesaufgabe heute schon gespielt? (erklärt, was die Flamme hält) */
  const [dailyDone, setDailyDone] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMissionDay()
        .then((m) => active && setMissions(m))
        .catch(() => undefined);
      getChests()
        .then((c) => active && setChests(c))
        .catch(() => undefined);
      getTodayDaily()
        .then((d) => active && setDailyDone(d !== null))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );

  if (!missions) return null;
  return (
    <MissionCard
      day={missions}
      dailyDone={dailyDone}
      chestsWaiting={chests.earned - chests.opened}
      chest={chest}
      onOpenChest={() =>
        openChest()
          .then((res) => {
            if (!res) return;
            sfx(res.levelUp !== null ? "levelup" : "unlock");
            setChest(res);
            setChests((c) => ({ ...c, opened: res.opened }));
            // Leiste und Reiter im Regal sollen den Punkt gleich zurücknehmen
            shell.setChestWaiting(chests.earned - res.opened > 0);
          })
          .catch(() => undefined)
      }
    />
  );
}

const styles = StyleSheet.create({
  missions: { padding: Spacing.md - 4, borderRadius: Radius.md, borderWidth: 1.5, gap: 6 },
  missionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  missionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  missionText: { flex: 1 },
  chestBtn: {
    backgroundColor: DAILY_GOLD,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  chestResult: { padding: Spacing.sm, borderRadius: Radius.md, gap: 2 },
  chestWrap: { alignSelf: "flex-start" },
  chestChoose: { alignSelf: "flex-start", paddingVertical: Spacing.sm, minHeight: 44, justifyContent: "center" },
});
