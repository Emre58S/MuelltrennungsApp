// Datei: components/game/hud.tsx
// Alles, was über der 3D-Szene liegt – bewusst zurückhaltend, damit die
// Szene im Vordergrund bleibt: kompakte Punkte-Leiste, Tonnen als Tipp-Ziel
// für Screenreader (Beschriftung ist auf die 3D-Tonnen gedruckt), dezenter Item-Name unter
// dem Gegenstand, schmale Hinweiszeile bei Fehlern, Lob und „+10“.

import { Feather } from "@expo/vector-icons";
import { type ReactNode, useEffect, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { press, tapHaptic } from "@/components/ui/press";
import { type Item } from "@/constants/items";
import { FontFamily, Radius, Spacing } from "@/constants/theme";
import { type BinDef } from "@/game/bins";
import { type ScreenRect } from "@/game/layout";
import { itemMaterial, type Mass, type Material } from "@/game/item-mass";
import { type TrickBonus } from "@/game/trick-levels";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";

/* ── Hilfen ────────────────────────────────────────────────── */

/** Startet beim Mount (bzw. bei neuem key) eine Animation 0 → 1. */

/** Blasen-Farbe je Material (Gegenstand-Karte). */
const MATERIAL_TINT: Record<Material, string> = {
  glas: "#D6F1FB",
  papier: "#F4ECDC",
  plastik: "#FFF1C2",
  metall: "#E3E7EB",
  bio: "#DDF0D2",
  rest: "#E6E3DF",
};

function useEnter(duration = 320, easing = Easing.out(Easing.back(1.8)), delay = 0) {
  const { reduceMotion } = useAppSettings();
  const [v] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(v, { toValue: 1, duration, easing, delay, useNativeDriver: true }).start();
  }, [v, duration, easing, delay, reduceMotion]);
  return v;
}

/** Kurzer Puls, wenn sich `value` ändert. */
/** Zahl zählt sichtbar hoch statt zu springen (≈ 0,35 s; nur der Text der
 *  Punkte rendert neu – die 3D-Szene bleibt unberührt). */
function useCountUp(target: number) {
  const { reduceMotion } = useAppSettings();
  const [shown, setShown] = useState(target);
  const [value] = useState(() => new Animated.Value(target));
  useEffect(() => {
    const id = value.addListener(({ value: v }) => setShown(Math.round(v)));
    return () => value.removeListener(id);
  }, [value]);
  useEffect(() => {
    if (reduceMotion) {
      value.setValue(target);
      return;
    }
    const run = Animated.timing(value, {
      toValue: target,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    run.start();
    return () => run.stop();
  }, [target, reduceMotion, value]);
  return shown;
}

function usePulse(value: unknown, amount = 0.18) {
  const { reduceMotion } = useAppSettings();
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduceMotion) return;
    v.setValue(1 + amount);
    Animated.spring(v, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, [value, v, amount, reduceMotion]);
  return v;
}

function HudSurface({ children, style }: { children: ReactNode; style?: object }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: colors.hud, borderColor: colors.hudBorder },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ── Punkte + Serie ────────────────────────────────────────── */

export function ScoreBadge({
  score,
  streak,
  multiplier,
  feverProgress,
  fever,
}: {
  score: number;
  streak: number;
  multiplier: number;
  /** 0…1: wie nah die Serie am nächsten Combo-Schritt ist (ganz oben: am Fieber). */
  feverProgress: number;
  fever: boolean;
}) {
  const { t, formatNumber } = useI18n();
  const { colors } = useAppTheme();
  const pulse = usePulse(score, 0.1);
  const shown = useCountUp(score);
  // Multiplikator als eigenes Abzeichen: hüpft, wenn er steigt
  const multPulse = usePulse(multiplier, 0.35);

  return (
    <Animated.View
      accessible
      accessibilityLabel={`${t("common.points")}: ${score}`}
      style={{ transform: [{ scale: pulse }] }}
    >
      <HudSurface style={styles.scorePill}>
        <View style={styles.scoreRow}>
          <AppText variant="heading" style={styles.tabular}>
            {formatNumber(shown)}
          </AppText>
          {streak >= 2 && (
            <AppText variant="label" tone="gold" style={styles.tabular}>
              🔥{streak}
            </AppText>
          )}
          {multiplier > 1 && (
            <Animated.View
              style={[
                styles.multChip,
                { backgroundColor: fever ? "#FF8A2B" : "#F5B800", transform: [{ scale: multPulse }] },
              ]}
            >
              <AppText variant="label" color="#3A2600" style={styles.tabular}>
                ×{multiplier}
              </AppText>
            </Animated.View>
          )}
        </View>
        {/* Serie → nächster Combo-Schritt: füllt sich mit jedem Treffer, golden im Fieber */}
        <View style={[styles.feverMeter, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.feverMeterFill,
              {
                width: `${Math.round((fever ? 1 : feverProgress) * 100)}%`,
                backgroundColor: fever ? "#FFB300" : colors.primary,
              },
            ]}
          />
        </View>
      </HudSurface>
    </Animated.View>
  );
}

/* ── Fieber ────────────────────────────────────────────────── */

export function FeverBanner({ seconds }: { seconds: number }) {
  const { t } = useI18n();
  const enter = useEnter();
  const [bar] = useState(() => new Animated.Value(1));
  useEffect(() => {
    // Nativ animiert (scaleX statt width): belastet nicht den JS-Thread,
    // auf dem auch die 3D-Szene gezeichnet wird
    Animated.timing(bar, {
      toValue: 0,
      duration: seconds * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [bar, seconds]);

  return (
    <Animated.View style={[styles.fever, { transform: [{ scale: enter }] }]}>
      <AppText variant="caption" color="#3A2500" center style={styles.bold}>
        🔥 {t("game.fever")}
      </AppText>
      <View style={styles.feverTrack}>
        <Animated.View style={[styles.feverFill, { transform: [{ scaleX: bar }] }]} />
      </View>
    </Animated.View>
  );
}

/* ── Zeit ──────────────────────────────────────────────────── */

export function TimerBar({ timeLeft, total }: { timeLeft: number; total: number }) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const warn = timeLeft <= 10;
  const pulse = usePulse(warn ? timeLeft : 0, 0.25);
  // Zum Ende hin: grün → orange (ab 20 s) → rot (ab 10 s)
  const barColor = warn ? "#E5484D" : timeLeft <= 20 ? "#F59E0B" : colors.primary;
  return (
    <View
      style={styles.timerRow}
      accessible
      accessibilityLabel={`${t("game.time")}: ${timeLeft}`}
    >
      <View style={[styles.timerTrack, { backgroundColor: colors.hud }]}>
        <View
          style={[
            styles.timerFill,
            {
              backgroundColor: barColor,
              width: `${Math.max(0, Math.min(100, (timeLeft / total) * 100))}%`,
            },
          ]}
        />
      </View>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <AppText variant="label" tone={warn ? "warning" : "text"} style={styles.timerText}>
          {timeLeft}s
        </AppText>
      </Animated.View>
    </View>
  );
}

/* ── Tonnen als Tipp-Ziel für Screenreader ─────────────────── */

/** Unsichtbare Flächen über den Tonnen: Screenreader können damit werfen.
 *  Die sichtbare Beschriftung ist auf die Tonnen aufgedruckt (3D-Szene). */
export function BinLabels({
  bins,
  rects,
  onActivate,
}: {
  bins: BinDef[];
  rects: ScreenRect[];
  onActivate: (index: number) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      {bins.map((bin, i) => {
        const r = rects[i];
        if (!r) return null;
        return (
          <View
            key={bin.key}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("game.throwTo", { bin: t(bin.labelKey) })}
            accessibilityActions={[{ name: "activate" }]}
            onAccessibilityAction={() => onActivate(i)}
            pointerEvents="none"
            style={[styles.binTarget, { left: r.x, top: r.y, width: r.w, height: r.h }]}
          />
        );
      })}
    </>
  );
}

/* ── Name des Gegenstands (dezent unter dem schwebenden Item) ── */

export function ItemCard({
  item,
  showHint,
  hint,
  mass,
}: {
  item: Item;
  showHint: boolean;
  /** Eigener Hinweis beim ersten Wurf (sonst Wischen/Tippen). */
  hint?: string;
  /** Zielwurf/Trickwürfe: Gewicht des Gegenstands (normal = keine Angabe). */
  mass?: Mass;
}) {
  const { t, itemName } = useI18n();
  const material = itemMaterial(item);
  const enter = useEnter(260, Easing.out(Easing.quad));
  const { reduceMotion } = useAppSettings();
  const [hand] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!showHint || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hand, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(250),
        Animated.timing(hand, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showHint, hand, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.itemWrap,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        },
      ]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${t("game.whereTo")} ${itemName(item)}`}
    >
      <HudSurface style={styles.itemTag}>
        {/* Symbol des Gegenstands in einer Blase in Materialfarbe */}
        <View style={[styles.itemBubble, { backgroundColor: MATERIAL_TINT[material] }]}>
          <AppText style={styles.itemEmoji}>{item.emoji}</AppText>
        </View>
        <View style={styles.itemText}>
          <AppText variant="label" numberOfLines={1}>
            {itemName(item)}
          </AppText>
          {/* Material – und Gewicht: schwer fliegt flach, leicht hoch und treibt im Wind */}
          <AppText variant="caption" tone="textSecondary" numberOfLines={1}>
            {t(`item.material.${material}`)}
            {mass && mass !== "normal" ? ` · ${mass === "schwer" ? "🪨" : "🪶"} ${t(`item.mass.${mass}`)}` : ""}
          </AppText>
        </View>
      </HudSurface>
      {showHint && (
        <View style={styles.hint}>
          <Animated.Text
            style={[
              styles.hand,
              {
                opacity: hand.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  {
                    translateY: hand.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, -24],
                    }),
                  },
                ],
              },
            ]}
          >
            👆
          </Animated.Text>
          <AppText variant="caption" color="#FFFFFF" center style={styles.hintText}>
            {hint ?? `${t("game.hintSwipe")} · ${t("game.hintTap")}`}
          </AppText>
        </View>
      )}
    </Animated.View>
  );
}

/* ── Hinweis bei Fehler (schmale Zeile, die richtige Tonne hüpft dazu) ── */

export function LearnCard({ item, bin }: { item: Item; bin: BinDef }) {
  const { t, itemName } = useI18n();
  const { colors } = useAppTheme();
  const enter = useEnter(260, Easing.out(Easing.quad));

  return (
    <Animated.View
      style={[
        styles.learnWrap,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
        },
      ]}
      accessible
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${t("game.almost")} ${itemName(item)} ${t("game.belongsIn")} ${t(bin.labelKey)}`}
    >
      <HudSurface style={[styles.learnPill, { borderColor: colors.warning }]}>
        <AppText variant="caption" numberOfLines={1} style={styles.flexShrink}>
          {item.emoji} {itemName(item)} →
        </AppText>
        <View style={[styles.learnBin, { backgroundColor: bin.color }]}>
          <AppText variant="caption" color={bin.onColor} style={styles.bold}>
            {t(bin.labelKey)}
          </AppText>
        </View>
      </HudSurface>
    </Animated.View>
  );
}

/* ── Lob + fliegende Punkte + Banner ───────────────────────── */

/** Lob nach Treffer: kurz, mittelgroß, mit weichem Leuchten. */
export function Praise({ text, gold }: { text: string; gold: boolean }) {
  const enter = useEnter(300);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.praise,
        {
          opacity: enter.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
          transform: [
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
        },
      ]}
    >
      <AppText
        variant="title"
        color={gold ? "#FFE082" : "#FFFFFF"}
        style={[styles.praiseText, { textShadowColor: gold ? "rgba(255,170,0,0.8)" : "rgba(0,0,0,0.45)" }]}
      >
        {text}
      </AppText>
    </Animated.View>
  );
}

export type FloatText = { id: number; x: number; y: number; text: string; color: string };

export function FloatingText({ item, onDone }: { item: FloatText; onDone: (id: number) => void }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onDone(item.id));
  }, [v, item.id, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.float,
        {
          left: item.x - 50,
          top: item.y - 16,
          opacity: v.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) },
            { scale: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 1.1, 1] }) },
          ],
        },
      ]}
    >
      <AppText variant="heading" color={item.color} center style={styles.floatText}>
        {item.text}
      </AppText>
    </Animated.View>
  );
}

export function Banner({ text }: { text: string }) {
  const { colors } = useAppTheme();
  const enter = useEnter(320, Easing.out(Easing.quad));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        {
          backgroundColor: colors.primary,
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        },
      ]}
    >
      <AppText variant="label" tone="onPrimary" center>
        {text}
      </AppText>
    </Animated.View>
  );
}

/* ── Einführung: Tipp (einmalig, Tippen schließt) ─────────────── */

export function TipCard({ text, onClose }: { text: string; onClose: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const enter = useEnter(300, Easing.out(Easing.back(1.6)));
  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel={text}
        accessibilityHint={t("common.tapToClose")}
        onPress={onClose}
        style={[styles.tip, { backgroundColor: colors.surface, borderColor: "#F5B800" }]}
      >
        <AppText style={styles.tipIcon}>💡</AppText>
        <AppText variant="caption" style={styles.tipText}>
          {text}
        </AppText>
        {/* Zeigt, dass man die Karte wegtippen kann */}
        <Feather name="x" size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

/* ── Trickwürfe: Kopfzeile und Ergebnis ───────────────────── */

/** Bonus-Ziel (dritter Stern) als Text. */
function bonusText(t: ReturnType<typeof useI18n>["t"], bonus: TrickBonus) {
  return bonus === "swish" ? t("trick.goal.swish") : t("trick.goal.firstTry");
}

/** Kopfzeile einer Trick-Runde: Level, Versuch, Aufgabe und die Sterne-Ziele. */
export function TrickHud({
  title,
  attempt,
  task,
  bonus,
}: {
  title: string;
  attempt: number;
  task: string;
  bonus: TrickBonus;
}) {
  const { t } = useI18n();
  return (
    <HudSurface style={styles.trickHud}>
      <AppText variant="caption" tone="textMuted" center>
        {title} · {t("trick.attempt", { n: Math.max(attempt, 1) })}
      </AppText>
      <AppText variant="label" center numberOfLines={2}>
        {task}
      </AppText>
      <AppText variant="caption" tone="gold" center numberOfLines={1}>
        ★ {t("trick.goal.tries")} · ★ {bonusText(t, bonus)}
      </AppText>
    </HudSurface>
  );
}

/** Ein Stern, der nacheinander „aufploppt“. */
export function Star({ filled, delay, n }: { filled: boolean; delay: number; n: 1 | 2 | 3 }) {
  const pop = useEnter(380, Easing.out(Easing.back(2.4)), delay);
  // Jeder verdiente Stern „ploppt“ mit eigenem, höherem Ton
  useEffect(() => {
    if (!filled) return;
    const timer = setTimeout(() => sfx(`star${n}`), delay);
    return () => clearTimeout(timer);
  }, [filled, delay, n]);
  return (
    <Animated.View style={{ transform: [{ scale: pop }], opacity: pop }}>
      <AppText style={[styles.star, { opacity: filled ? 1 : 0.25 }]}>{filled ? "★" : "☆"}</AppText>
    </Animated.View>
  );
}

/** Eine Zeile der Sterne-Ziele im Ergebnis: geschafft ✓ oder offen. */
function GoalRow({ done, text }: { done: boolean; text: string }) {
  return (
    <AppText tone={done ? "text" : "textMuted"} style={styles.goalRow}>
      {done ? "★" : "☆"} {text}
    </AppText>
  );
}

/** Ergebnis eines geschafften Levels: Sterne, welche Ziele erreicht sind,
 *  weiter / nochmal / alle Level. */
export function TrickResult({
  title,
  stars,
  attempts,
  bonus,
  bonusDone,
  unlocked,
  fact,
  isLast,
  onNext,
  onRetry,
  onLevels,
}: {
  title: string;
  stars: number;
  attempts: number;
  bonus: TrickBonus;
  bonusDone: boolean;
  /** Name einer neu freigeschalteten Wurfspur. */
  unlocked?: string;
  /** „Wusstest du?“ zum geworfenen Gegenstand. */
  fact?: { name: string; text: string };
  isLast: boolean;
  onNext: () => void;
  onRetry: () => void;
  onLevels: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const enter = useEnter(300, Easing.out(Easing.quad));
  // Neue Wurfspur: kleine Fanfare, nachdem die Sterne aufgeploppt sind
  useEffect(() => {
    if (!unlocked) return;
    const timer = setTimeout(() => sfx("unlock"), 1100);
    return () => clearTimeout(timer);
  }, [unlocked]);
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.resultWrap,
        {
          backgroundColor: colors.overlay,
          opacity: enter,
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + Spacing.md,
        },
      ]}
    >
      <View style={[styles.resultCard, { backgroundColor: colors.surface }]}>
        {/* Kleine Handys / große Schrift: Inhalt scrollt, Knöpfe bleiben erreichbar */}
        <ScrollView contentContainerStyle={styles.resultInner} bounces={false} showsVerticalScrollIndicator={false}>
          <AppText variant="title" center accessibilityRole="header">
            {title}
          </AppText>
          <View style={styles.stars} accessible accessibilityLabel={t("common.starsOf", { n: stars })}>
            {[1, 2, 3].map((n) => (
              <Star key={n} n={n as 1 | 2 | 3} filled={n <= stars} delay={250 + n * 180} />
            ))}
          </View>
          <AppText tone="textSecondary" center>
            {attempts <= 1 ? t("trick.attemptsOne") : t("trick.attempts", { n: attempts })}
          </AppText>
          <View style={styles.goals}>
            <GoalRow done text={t("trick.goal.done")} />
            <GoalRow done={attempts <= 3} text={t("trick.goal.tries")} />
            <GoalRow done={bonusDone} text={bonusText(t, bonus)} />
          </View>
          {fact && (
            <View style={[styles.fact, { backgroundColor: colors.surfaceAlt }]}>
              <AppText variant="caption" tone="textSecondary">
                💡 {t("trick.factTitle")} · {fact.name}
              </AppText>
              <AppText variant="caption">{fact.text}</AppText>
            </View>
          )}
          {unlocked && (
            <AppText variant="label" tone="gold" center>
              🎁 {t("reward.new", { name: unlocked })}
            </AppText>
          )}
        </ScrollView>
        {/* Knöpfe immer sichtbar unten in der Karte */}
        <View style={[styles.resultButtons, styles.resultFooter]}>
          <Button title={isLast ? t("trick.levels") : t("trick.next")} icon="arrow-right" iconPosition="end" onPress={isLast ? onLevels : onNext} />
          <Button title={t("trick.retry")} variant="secondary" icon="rotate-ccw" onPress={onRetry} />
          {!isLast && <Button title={t("trick.levels")} variant="ghost" onPress={onLevels} />}
        </View>
      </View>
    </Animated.View>
  );
}

/* ── Kleiner Knopf oben (Fertig) ───────────────────────────── */

export function HudButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.hudButton,
        { backgroundColor: colors.hud, borderColor: colors.hudBorder },
        pressed && press.pressed,
      ]}
    >
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
}

const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
};

const styles = StyleSheet.create({
  flexShrink: { flexShrink: 1 },
  bold: { fontFamily: FontFamily.bold },
  tabular: { fontVariant: ["tabular-nums"] },
  surface: { borderRadius: Radius.pill, borderWidth: 1, ...shadow },

  scorePill: { alignItems: "center", paddingHorizontal: Spacing.md, paddingTop: 4, paddingBottom: 6, minWidth: 96 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  multChip: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999 },
  feverMeter: { alignSelf: "stretch", height: 3, borderRadius: 2, overflow: "hidden", marginTop: 2 },
  feverMeterFill: { height: "100%", borderRadius: 2 },

  fever: {
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: "#FFD54A",
    gap: 3,
    ...shadow,
  },
  feverTrack: { height: 3, borderRadius: 2, backgroundColor: "rgba(58,37,0,0.2)", overflow: "hidden" },
  feverFill: { height: 3, width: "100%", backgroundColor: "#E65100", transformOrigin: "left" },

  timerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  timerTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  timerFill: { height: "100%", borderRadius: 3 },
  timerText: { minWidth: 36, textAlign: "right", fontVariant: ["tabular-nums"] },

  binTarget: { position: "absolute" },

  itemWrap: { alignItems: "center", gap: 6 },
  // Plastischer: Blase links, dicker Rand unten wie ein Knopf
  itemTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingLeft: 6,
    paddingRight: Spacing.md,
    paddingVertical: 5,
    maxWidth: "92%",
    borderBottomWidth: 3,
  },
  itemBubble: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  itemEmoji: { fontSize: 22, lineHeight: 28 },
  itemText: { flexShrink: 1 },

  hint: { alignItems: "center" },
  hand: { fontSize: 24, marginBottom: -2 },
  hintText: {
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  learnWrap: { alignItems: "center" },
  learnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: 4,
    paddingVertical: 4,
    maxWidth: "92%",
  },
  learnBin: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },

  praise: { position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center", height: 80 },
  praiseText: { textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },

  float: { position: "absolute", width: 100 },
  floatText: {
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  banner: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    ...shadow,
  },

  trickHud: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.lg, flexShrink: 1, maxWidth: 260 },
  resultWrap: { alignItems: "center", justifyContent: "center", padding: Spacing.lg },
  resultCard: { width: "100%", maxWidth: 360, maxHeight: "100%", borderRadius: Radius.xl, overflow: "hidden" },
  resultInner: { padding: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.md },
  resultFooter: { marginTop: 0, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  stars: { flexDirection: "row", justifyContent: "center", gap: Spacing.sm },
  star: { fontSize: 48, lineHeight: 56, color: "#F5B800" },
  resultButtons: { gap: Spacing.sm, marginTop: Spacing.sm },
  goals: { gap: 2, alignSelf: "center" },
  fact: { gap: 2, padding: Spacing.sm, borderRadius: Radius.md },
  tip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    maxWidth: 340,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  tipIcon: { fontSize: 20 },
  tipText: { flexShrink: 1, fontSize: 14 },
  goalRow: { fontSize: 15 },

  hudButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
