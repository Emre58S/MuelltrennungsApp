// Datei: components/ui/hub.tsx
// Gemeinsamer Aufbau der drei Bereiche hinter den Menü-Tonnen (Kampagne,
// Online, Sammlung): Kopf wie die übrigen Unterseiten, darunter große Karten
// mit Symbol, Name, kurzer Zeile und rechts optional Rekord/Stand.

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type ComponentRef, type ReactNode, type Ref, useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Chunky, tone } from "@/components/ui/chunky";
import { FadeIn } from "@/components/ui/fade-in";
import { useShell } from "@/components/nav/shell-context";
import { PageHeader } from "@/components/ui/page-header";
import { type Area } from "@/constants/areas";
import { Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";

/** Sperre gegen Doppeltippen: Ein schneller zweiter Tipp würde sonst z. B.
 *  zwei Runden übereinander öffnen. */
const TAP_LOCK_MS = 900;
let lockedUntil = 0;

export function HubScreen({
  title,
  subtitle,
  emoji,
  area,
  scrollRef,
  scrollKey,
  children,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  /** Bereichsfarbe für den Kopf. */
  area?: Area;
  /** Zum Hinscrollen, z. B. zur aktuellen Station im Lernpfad. */
  scrollRef?: Ref<ComponentRef<typeof ScrollView>>;
  /** Ändert sich der Wert (z. B. Reiter gewechselt), beginnt die Seite wieder oben. */
  scrollKey?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const shell = useShell();
  const ownRef = useRef<ComponentRef<typeof ScrollView>>(null);
  // Neuer Bereich gewählt oder anderer Reiter: oben anfangen
  const topSignal = area ? shell.topSignal[area.key] : 0;
  useEffect(() => {
    ownRef.current?.scrollTo({ y: 0, animated: false });
  }, [topSignal, scrollKey]);
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* In der Hülle: Band in der Bereichsfarbe (wie der Pfad), steht fest über dem Inhalt */}
      {shell.inShell && area && (
        <View style={[styles.banner, { backgroundColor: area.fill, borderBottomColor: tone(area.fill, -0.3) }]}>
          <LinearGradient
            // Bei weißer Schrift nicht aufhellen (Kontrast), bei dunkler Schrift ein Hauch Licht
            colors={[tone(area.fill, area.on === "#FFFFFF" ? 0 : 0.12), tone(area.fill, -0.14)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppText
            importantForAccessibility="no"
            accessibilityElementsHidden
            style={styles.bannerDecor}
          >
            {emoji}
          </AppText>
          <AppText variant="overline" color={area.on} style={styles.bannerTitle} accessibilityRole="header">
            {`${emoji} ${title}`.toUpperCase()}
          </AppText>
          <AppText variant="heading" color={area.on} numberOfLines={2}>
            {subtitle}
          </AppText>
        </View>
      )}
      <ScrollView
        ref={scrollRef ?? ownRef}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          {
            // In der Hülle sitzt die Kopfzeile (mit Sicherheitsabstand) schon darüber
            paddingTop: shell.inShell ? Spacing.sm : Math.max(insets.top + Spacing.md, Spacing.lg),
            // In der Hülle sitzt unten die Bereichs-Leiste (hat den Sicherheitsabstand schon)
            paddingBottom: (shell.inShell ? shell.bottomInset : insets.bottom) + Spacing.lg,
          },
        ]}
      >
        {!(shell.inShell && area) && (
          <PageHeader title={title} subtitle={subtitle} emoji={emoji} area={area} hideBack={shell.inShell} compact={shell.inShell} />
        )}
        {children}
      </ScrollView>
    </View>
  );
}

export function HubCard({
  emoji,
  color,
  title,
  desc,
  info,
  badge,
  dot,
  index,
  onPress,
}: {
  emoji: string;
  /** Farbe des Symbol-Kreises. */
  color: string;
  title: string;
  desc: string;
  /** Rechts klein, z. B. „🏆 1.240“ oder „✓ 9/10“. */
  info?: string | null;
  /** Kleines Schild über dem Namen, z. B. „Zuletzt“. */
  badge?: string | null;
  /** Roter Punkt: hier wartet etwas Neues. */
  dot?: boolean;
  /** Reihenfolge – für die gestaffelte Einblendung. */
  index: number;
  onPress: () => void;
}) {
  // Farbfläche etwas dunkler, damit weiße Schrift gut lesbar bleibt
  const face = tone(color, -0.32);
  return (
    <FadeIn delay={60 + index * 60}>
      <Chunky
        color={face}
        depth={6}
        radius={Radius.xl}
        label={[title, desc, info].filter(Boolean).join(". ")}
        onPress={() => {
          const now = Date.now();
          if (now < lockedUntil) return;
          lockedUntil = now + TAP_LOCK_MS;
          onPress();
        }}
        faceStyle={styles.card}
      >
        <View style={styles.icon}>
          <AppText style={styles.emoji}>{emoji}</AppText>
          {dot && <View style={styles.dot} />}
        </View>
        <View style={styles.flex}>
          {badge && (
            <View style={styles.badge}>
              <AppText variant="overline" color="#FFFFFF">
                {badge.toUpperCase()}
              </AppText>
            </View>
          )}
          <AppText variant="heading" color="#FFFFFF">
            {title}
          </AppText>
          <AppText color="#FFFFFF">{desc}</AppText>
          {info ? (
            <AppText variant="label" color="#FFFFFF" style={styles.info}>
              {info}
            </AppText>
          ) : null}
        </View>
        <Feather name="chevron-right" size={24} color="#FFFFFF" />
      </Chunky>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, gap: Spacing.md },
  flex: { flex: 1 },
  banner: {
    overflow: "hidden",
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm + 2,
    gap: 2,
    borderBottomWidth: 4,
  },
  bannerDecor: { position: "absolute", right: 8, top: -6, fontSize: 64, lineHeight: 78, opacity: 0.2, transform: [{ rotate: "12deg" }] },
  bannerTitle: { opacity: 0.85 },
  card: {
    flexDirection: "row",
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: Spacing.md,
    minHeight: 96,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 28, lineHeight: 34 },
  dot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#FF4D4D",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(0,0,0,0.28)",
    marginBottom: 2,
  },
  info: { marginTop: 2 },
});
