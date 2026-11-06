// Datei: components/areas/people.tsx
//
// Bausteine für Freunde und Rangliste im Arena-Stil: runder Avatar mit Anfangsbuchstabe
// und das Siegerpodest für die ersten drei Plätze.

import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { tone } from "@/components/ui/chunky";
import { Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";

/** Mittlere bis dunkle Töne, damit weiße Buchstaben gut lesbar bleiben. */
const AVATAR_COLORS = ["#2F6FC4", "#1E8A57", "#C4532B", "#6B49C4", "#B03A6E", "#2B7A8C"] as const;

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const color = colorFor(name);
  const letter = (Array.from(name.trim())[0] ?? "?").toUpperCase();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderColor: tone(color, -0.3) },
      ]}
    >
      <AppText variant="label" color="#FFFFFF" style={{ fontSize: size * 0.45, lineHeight: size * 0.6 }}>
        {letter}
      </AppText>
    </View>
  );
}

export type PodiumRow = { rank: number; name: string; score: number; isMe?: boolean };

const MEDALS = ["🥇", "🥈", "🥉"] as const;
const STEP_COLOR = ["#E8B500", "#9AA5B1", "#B87333"] as const;
const STEP_HEIGHT = [96, 72, 56] as const;

/** Die ersten drei: Mitte der Erste, links der Zweite, rechts der Dritte. */
export function Podium({
  rows,
  scoreText,
  youLabel,
}: {
  rows: PodiumRow[];
  scoreText: (score: number) => string;
  /** Wort für den eigenen Eintrag („Du“), auch für Screenreader. */
  youLabel: string;
}) {
  const { colors } = useAppTheme();
  // Nach Position, nicht nach Rangnummer: bei Gleichstand (1, 1, 1, 1) bleibt nichts hängen
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  // Reihenfolge der Spalten: 2, 1, 3
  const order = [1, 0, 2].filter((i) => top[i]).map((i) => ({ row: top[i], i }));
  return (
    <View style={styles.podium} accessibilityRole="list">
      {order.map(({ row, i }) => {
        return (
          <View
            key={`${i}-${row.name}`}
            accessible
            accessibilityLabel={`${row.rank}. ${row.name}${row.isMe ? ` (${youLabel})` : ""}, ${scoreText(row.score)}`}
            style={styles.column}
          >
            <AppText style={styles.medal}>{MEDALS[Math.min(Math.max(row.rank, 1), 3) - 1]}</AppText>
            <Avatar name={row.name} size={i === 0 ? 52 : 44} />
            <AppText variant="label" numberOfLines={1} style={styles.name}>
              {row.isMe ? `${row.name} (${youLabel})` : row.name}
            </AppText>
            <AppText variant="caption" tone="textSecondary" numberOfLines={1}>
              {scoreText(row.score)}
            </AppText>
            <View
              style={[
                styles.step,
                {
                  height: STEP_HEIGHT[i],
                  backgroundColor: STEP_COLOR[i],
                  borderColor: row.isMe ? colors.primary : "transparent",
                  borderWidth: row.isMe ? 4 : 2,
                  borderBottomColor: tone(STEP_COLOR[i], -0.3),
                },
              ]}
            >
              <AppText variant="heading" color="#2B1D00">
                {row.rank}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderBottomWidth: 4 },
  podium: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: Spacing.sm, paddingTop: Spacing.sm },
  column: { flex: 1, maxWidth: 150, alignItems: "center", gap: 2 },
  medal: { fontSize: 24, lineHeight: 30 },
  name: { maxWidth: "100%" },
  step: {
    alignSelf: "stretch",
    marginTop: 4,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: Spacing.sm,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    borderWidth: 2,
    borderBottomWidth: 5,
  },
});
