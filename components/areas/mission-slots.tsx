// Datei: components/areas/mission-slots.tsx
//
// Die 3 Tagesmissionen als „Plätze“ nebeneinander (wie die Truhen-Slots bei Clash
// Royale): je Mission ein Symbol, ein kurzer Satz und ein Fortschrittsbalken; eine
// geschaffte Mission trägt ein Häkchen in Gold. Tippen öffnet „Heute“ im Regal.

import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { useShell } from "@/components/nav/shell-context";
import { AppText } from "@/components/ui/app-text";
import { press, tapHaptic } from "@/components/ui/press";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Radius, Spacing } from "@/constants/theme";
import { ALL_BINS } from "@/game/bins";
import { type Mission, type MissionDay, missionProgress } from "@/game/missions";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";

const KIND_EMOJI: Record<Mission["kind"], string> = {
  bin: "🗑️",
  streak: "🔥",
  correct: "🎯",
  online: "🌐",
  station: "⭐",
};

export function MissionSlots({ day, chestsWaiting }: { day: MissionDay; chestsWaiting: number }) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const shell = useShell();
  const done = day.done.length;
  const total = day.missions.length;
  const text = (m: Mission) => {
    if (m.kind === "bin" && m.bin) return t("mission.bin", { bin: t(`bin.${m.bin}`), n: m.goal });
    if (m.kind === "streak") return t("mission.streak", { n: m.goal });
    if (m.kind === "correct") return t("mission.correct", { n: m.goal });
    if (m.kind === "online") return t("mission.online");
    return t("mission.station");
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("mission.title")}: ${done}/${total}${chestsWaiting > 0 ? `. ${t("chest.open")}` : ""}`}
      onPress={() => {
        sfx("tap");
        tapHaptic();
        if (shell.inShell) shell.goArea("regal", "today");
        else router.push("/sammlung");
      }}
      style={({ pressed }) => [styles.wrap, pressed && press.pressedLarge]}
    >
      <View style={styles.head}>
        <AppText variant="label" style={styles.flex}>
          📋 {t("mission.title")}
        </AppText>
        {chestsWaiting > 0 && <AppText style={styles.chest}>🎁</AppText>}
        <AppText variant="label" tone="textMuted">
          {done}/{total} ›
        </AppText>
      </View>
      <View style={styles.row}>
        {day.missions.map((m) => {
          const finished = day.done.includes(m.id);
          const value = Math.min(1, missionProgress(m, day.counts) / m.goal);
          const emoji = m.kind === "bin" && m.bin ? (ALL_BINS.find((b) => b.key === m.bin)?.icon ?? KIND_EMOJI.bin) : KIND_EMOJI[m.kind];
          return (
            <View
              key={m.id}
              accessible={false}
              style={[
                styles.slot,
                {
                  backgroundColor: finished ? colors.goldSoft : colors.surface,
                  borderColor: finished ? colors.gold : colors.border,
                },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: finished ? colors.gold : colors.surfaceAlt }]}>
                <AppText style={styles.emoji}>{finished ? "✓" : emoji}</AppText>
              </View>
              <AppText variant="caption" center numberOfLines={3} color={finished ? colors.onGoldSoft : colors.text}>
                {text(m)}
              </AppText>
              <View style={styles.bar}>
                <ProgressBar value={finished ? 1 : value} height={6} />
              </View>
            </View>
          );
        })}
        {/* Viertes Fach: die Truhe – wacht auf, sobald alle drei geschafft sind */}
        <View
          accessible={false}
          style={[
            styles.slot,
            {
              backgroundColor: done >= total ? colors.goldSoft : colors.surface,
              borderColor: done >= total ? colors.gold : colors.border,
              borderStyle: "dashed",
            },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: done >= total ? colors.gold : colors.surfaceAlt }]}>
            <AppText style={[styles.emoji, { opacity: done >= total ? 1 : 0.5 }]}>🎁</AppText>
          </View>
          <AppText variant="caption" center numberOfLines={3} color={done >= total ? colors.onGoldSoft : colors.textSecondary}>
            {t("mission.chest")}
          </AppText>
          <View style={styles.bar}>
            <ProgressBar value={done / Math.max(1, total)} height={6} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  head: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  flex: { flex: 1 },
  chest: { fontSize: 20, lineHeight: 26 },
  row: { flexDirection: "row", gap: Spacing.sm },
  slot: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    minHeight: 112,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 6,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 18, lineHeight: 24 },
  bar: { alignSelf: "stretch", marginTop: "auto" },
});
