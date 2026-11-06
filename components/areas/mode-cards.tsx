// Datei: components/areas/mode-cards.tsx
//
// Die Duell-Modi im Reiter „Online“ als ruhige, einheitliche Zeilen: kleines Symbol in
// einem getönten Kreis, Titel, eine Zeile Text, rechts der Stand von heute und ein Pfeil.
// Bewusst schlicht (Nutzer, 6.11.: „clean und simpel, aber ansprechend und hochwertig“) –
// Farbe nur im Symbol, sonst die normalen Flächen der App.

import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { FadeIn } from "@/components/ui/fade-in";
import { press, tapHaptic } from "@/components/ui/press";
import { Radius, Shadow, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";

/** Sperre gegen Doppeltippen (sonst liegt z. B. das Ghost-Rennen zweimal auf dem Stapel). */
const TAP_LOCK_MS = 900;
let lockedUntil = 0;

export function ModeRow({
  emoji,
  accent,
  title,
  desc,
  stand,
  index = 0,
  emphasize,
  onPress,
}: {
  emoji: string;
  /** Farbe des Symbol-Kreises (wird stark aufgehellt dargestellt). */
  accent: string;
  title: string;
  desc: string;
  /** Kleine Pille rechts, z. B. „Heute: 14“ (leer lassen, wenn es nichts zu zeigen gibt). */
  stand?: string | null;
  index?: number;
  /** Hauptzeile: Rand in der Akzentfarbe. */
  emphasize?: boolean;
  onPress: () => void;
}) {
  const { colors, scheme } = useAppTheme();
  return (
    <FadeIn delay={40 + index * 50}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[title, desc, stand].filter(Boolean).join(". ")}
        onPress={() => {
          const now = Date.now();
          if (now < lockedUntil) return;
          lockedUntil = now + TAP_LOCK_MS;
          sfx("tap");
          tapHaptic();
          onPress();
        }}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface, borderColor: emphasize ? accent : colors.border, borderWidth: emphasize ? 1.5 : 1 },
          scheme === "light" && Shadow,
          pressed && press.pressedLarge,
        ]}
      >
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[styles.icon, { backgroundColor: `${accent}26` }]}
        >
          <AppText style={styles.emoji}>{emoji}</AppText>
        </View>
        <View style={styles.text}>
          <AppText variant="heading" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" tone="textSecondary" numberOfLines={2}>
            {desc}
          </AppText>
          {stand ? (
            <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
              <AppText variant="caption" tone="textSecondary" numberOfLines={1}>
                {stand}
              </AppText>
            </View>
          ) : null}
        </View>
        <Feather name="chevron-right" size={20} color={colors.textMuted} />
      </Pressable>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 76,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 24, lineHeight: 30 },
  text: { flex: 1, gap: 2 },
  pill: { alignSelf: "flex-start", marginTop: 4, paddingHorizontal: Spacing.sm + 2, paddingVertical: 3, borderRadius: Radius.pill },
});
