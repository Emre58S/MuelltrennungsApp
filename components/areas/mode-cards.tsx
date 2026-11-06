// Datei: components/areas/mode-cards.tsx
//
// Die Duell-Modi im Reiter „Online“ als kleine Arena (Vorbild Clash Royale): eine große
// Hauptkarte (Parcours des Tages), zwei quadratische Karten (Zeit-Sprint, Survival)
// und ein Streifen (Ghost-Rennen). Farbverlauf, große Symbole und der Stand von
// heute statt gleich großer Knöpfe mit Fließtext.

import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chunky, tone } from "@/components/ui/chunky";
import { FadeIn } from "@/components/ui/fade-in";
import { Radius, Spacing } from "@/constants/theme";

type Look = { from: string; to: string };

const LOOK = {
  // Dunkel genug für weiße Schrift (≥ 4,5 : 1)
  parcours: { from: "#BE4684", to: "#6C3FC4" },
  sprint: { from: "#1E8A57", to: "#126B4C" },
  survival: { from: "#C9433A", to: "#962A44" },
  ghost: { from: "#2F78D0", to: "#234AA6" },
} as const satisfies Record<string, Look>;

/** Sperre gegen Doppeltippen (sonst liegt z. B. das Ghost-Rennen zweimal auf dem Stapel). */
const TAP_LOCK_MS = 900;
let lockedUntil = 0;

/** Gemeinsame Hülle: dicker Knopf mit Farbverlauf und Dekor-Symbol in der Ecke. */
function ModeFace({
  look,
  label,
  onPress,
  decor,
  decorSize = 90,
  index,
  style,
  faceStyle,
  children,
}: {
  look: Look;
  label: string;
  onPress: () => void;
  /** Großes, blasses Symbol als Hintergrund. */
  decor: string;
  decorSize?: number;
  index: number;
  style?: object;
  faceStyle?: object;
  children: ReactNode;
}) {
  return (
    <View style={style}>
      <FadeIn delay={60 + index * 70}>
      <Chunky color={look.to} edge={tone(look.to, -0.45)} depth={6} radius={Radius.xl} label={label}
        onPress={() => {
          const now = Date.now();
          if (now < lockedUntil) return;
          lockedUntil = now + TAP_LOCK_MS;
          onPress();
        }}
        faceStyle={[styles.face, faceStyle]}
      >
        <LinearGradient
          colors={[look.from, look.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AppText
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={[styles.decor, { fontSize: decorSize, lineHeight: decorSize * 1.2 }]}
        >
          {decor}
        </AppText>
        {children}
      </Chunky>
      </FadeIn>
    </View>
  );
}

/** Kleine Pille: Stand von heute o. Ä. */
function Pill({ text, center }: { text: string; center?: boolean }) {
  return (
    <View style={[styles.pill, center && styles.pillCenter]}>
      <AppText variant="label" color="#FFFFFF" numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}

export function ParcoursHero({
  title,
  task,
  icons,
  best,
  tag,
  cta,
  onPress,
}: {
  title: string;
  task: string;
  /** Symbole des heutigen Parcours. */
  icons: string[];
  best: string;
  tag: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <ModeFace
      look={LOOK.parcours}
      label={`${title}. ${task}. ${best}`}
      onPress={onPress}
      decor="🎯"
      decorSize={130}
      index={0}
      faceStyle={styles.heroFace}
    >
      <View style={styles.heroTop}>
        <View style={styles.tag}>
          <AppText variant="overline" color="#FFFFFF">
            {tag.toUpperCase()}
          </AppText>
        </View>
        <View style={styles.icons}>
          {icons.slice(0, 3).map((e, i) => (
            <View key={i} style={styles.iconBubble}>
              <AppText style={styles.iconEmoji}>{e}</AppText>
            </View>
          ))}
        </View>
      </View>
      <AppText variant="title" color="#FFFFFF">
        {title}
      </AppText>
      <AppText color="#FFFFFF" numberOfLines={2}>
        {task}
      </AppText>
      <View style={styles.heroBottom}>
        <Pill text={best} />
        <View style={styles.cta}>
          <AppText variant="label" color="#3B1F78">
            {cta} ▶
          </AppText>
        </View>
      </View>
    </ModeFace>
  );
}

export function SquareMode({
  kind,
  emoji,
  title,
  tag,
  stand,
  index,
  onPress,
}: {
  kind: "sprint" | "survival";
  emoji: string;
  title: string;
  tag: string;
  stand: string;
  index: number;
  onPress: () => void;
}) {
  return (
    <ModeFace
      look={LOOK[kind]}
      label={`${title}. ${tag}. ${stand}`}
      onPress={onPress}
      decor={emoji}
      decorSize={84}
      index={index}
      style={styles.half}
      faceStyle={styles.squareFace}
    >
      <AppText style={styles.squareEmoji}>{emoji}</AppText>
      <AppText variant="heading" color="#FFFFFF" center numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </AppText>
      <AppText variant="caption" color="#FFFFFF" center numberOfLines={2}>
        {tag}
      </AppText>
      <Pill text={stand} center />
    </ModeFace>
  );
}

export function GhostStrip({
  title,
  desc,
  onPress,
}: {
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <ModeFace
      look={LOOK.ghost}
      label={`${title}. ${desc}`}
      onPress={onPress}
      decor="👻"
      decorSize={90}
      index={3}
      faceStyle={styles.stripFace}
    >
      <View style={styles.stripIcon}>
        <AppText style={styles.iconEmoji}>👻</AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="heading" color="#FFFFFF">
          {title}
        </AppText>
        <AppText variant="caption" color="#FFFFFF" numberOfLines={2}>
          {desc}
        </AppText>
      </View>
      <AppText variant="heading" color="#FFFFFF">
        ▶
      </AppText>
    </ModeFace>
  );
}

const styles = StyleSheet.create({
  face: { alignSelf: "stretch", alignItems: "stretch", justifyContent: "flex-start" },
  flex: { flex: 1 },
  half: { flex: 1 },
  decor: { position: "absolute", right: -10, bottom: -14, opacity: 0.16, transform: [{ rotate: "-14deg" }] },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  pillCenter: { alignSelf: "center", marginTop: 2 },
  // Hauptkarte
  heroFace: { padding: Spacing.md, gap: 4, minHeight: 190 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, backgroundColor: "rgba(0,0,0,0.30)" },
  icons: { flexDirection: "row", gap: 6 },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  iconEmoji: { fontSize: 22, lineHeight: 28 },
  heroBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.sm },
  cta: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: "#FFFFFF" },
  // Quadratische Karten
  squareFace: { padding: Spacing.md, gap: 4, minHeight: 170, alignItems: "center" },
  squareEmoji: { fontSize: 40, lineHeight: 48 },
  // Streifen
  stripFace: { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: Spacing.md, minHeight: 76 },
  stripIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
});
