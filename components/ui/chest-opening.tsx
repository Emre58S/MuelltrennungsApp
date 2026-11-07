// Datei: components/ui/chest-opening.tsx
//
// Truhen-Öffnen in einfach (nach Clash-Royale-Art): Die Truhe steht groß vor dunklem Grund, wackelt,
// der Deckel klappt auf, Licht und Funken springen heraus, dann zeigt eine Karte den Gewinn.
// „Weniger Bewegung“: keine Schüttel- und Funken-Bewegung, nur Aufklappen und Karte.

import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { press, tapHaptic } from "@/components/ui/press";
import { Radius, Spacing } from "@/constants/theme";
import { type TrailReward } from "@/game/rewards";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { sfx } from "@/utils/sfx";

type Result = { reward: TrailReward | null; xp: number; levelUp: number | null };

const W = 150;
const LID_H = 58;
const BODY_H = 62;
const WOOD = "#9A5B2B";
const WOOD_DARK = "#6E3F1B";
const GOLD = "#F2B632";
const SPARKS = 8;

export function ChestOpening({
  visible,
  result,
  onOpen,
  onClose,
  onChoose,
}: {
  visible: boolean;
  /** Ergebnis der gerade geöffneten Truhe (null, solange sie noch zu ist). */
  result: Result | null;
  /** Truhe wirklich öffnen (Speicher) – wird nach dem Wackeln einmal aufgerufen. */
  onOpen: () => Promise<boolean>;
  onClose: () => void;
  /** Bei neuer Wurfspur: zur Auswahl springen. */
  onChoose: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  const [shake] = useState(() => new Animated.Value(0));
  const [lid] = useState(() => new Animated.Value(0));
  const [burst] = useState(() => new Animated.Value(0));
  const [card] = useState(() => new Animated.Value(0));
  /** shake → wartet auf das Ergebnis → opening (Deckel, Licht) → done (Karte). */
  const [phase, setPhase] = useState<"shake" | "opening" | "done">("shake");
  const opened = useRef(false);

  // Start: wackeln, dann öffnen (einmal je Einblenden)
  useEffect(() => {
    if (!visible) return;
    opened.current = false;
    shake.setValue(0);
    lid.setValue(0);
    burst.setValue(0);
    card.setValue(0);
    const go = () => {
      opened.current = true;
      setPhase("opening");
      // Ohne Ergebnis (keine Truhe mehr, Speicherfehler) das Fenster wieder zumachen
      onOpen()
        .then((ok) => {
          if (!ok) onClose();
        })
        .catch(() => onClose());
    };
    if (reduceMotion) {
      const id = setTimeout(go, 150);
      return () => clearTimeout(id);
    }
    const step = (to: number) => Animated.timing(shake, { toValue: to, duration: 80, useNativeDriver: true });
    const anim = Animated.sequence([step(1), step(-1), step(1), step(-1), step(1), step(-1), step(0), Animated.delay(120)]);
    anim.start(({ finished }) => {
      if (finished) go();
    });
    return () => anim.stop();
    // onOpen/onClose kommen von außen und ändern sich bei jedem Render – nur das Einblenden zählt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Ergebnis da → Deckel auf, Licht und Funken, dann die Karte
  useEffect(() => {
    if (!visible || phase !== "opening" || !result) return;
    tapHaptic();
    const open = Animated.timing(lid, {
      toValue: 1,
      duration: reduceMotion ? 1 : 380,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    });
    const light = Animated.timing(burst, {
      toValue: 1,
      duration: reduceMotion ? 1 : 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const show = Animated.spring(card, { toValue: 1, friction: 5, useNativeDriver: true });
    const anim = Animated.sequence([open, Animated.parallel([light, Animated.sequence([Animated.delay(reduceMotion ? 0 : 250), show])])]);
    anim.start(({ finished }) => {
      if (finished) setPhase("done");
    });
    return () => anim.stop();
  }, [visible, phase, result, lid, burst, card, reduceMotion]);

  // Nächstes Mal wieder von vorn
  useEffect(() => {
    if (!visible) {
      const id = setTimeout(() => setPhase("shake"), 0);
      return () => clearTimeout(id);
    }
  }, [visible]);

  const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: ["-7deg", "7deg"] });
  const grow = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.05, 1, 1.05] });
  // Deckel klappt um die hintere Kante nach oben: Drehpunkt unten links
  const lidRotate = lid.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-62deg"] });
  const glowScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.6] });
  const glowOpacity = burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0.25] });
  const sparks = Array.from({ length: SPARKS }, (_, i) => {
    const a = (i / SPARKS) * Math.PI * 2;
    const r = 80 + (i % 2) * 36;
    return {
      key: i,
      tx: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * r] }),
      ty: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * r - 20] }),
      opacity: burst.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
    };
  });
  const lidPivot = [{ translateX: -W / 2 }, { translateY: LID_H / 2 }, { rotate: lidRotate }, { translateX: W / 2 }, { translateY: -LID_H / 2 }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={phase === "done" ? onClose : undefined}>
      <View style={styles.backdrop}>
        <View style={styles.stage}>
          {/* Licht hinter der Truhe */}
          <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
          {sparks.map((s) => (
            <Animated.Text
              key={s.key}
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.spark, { opacity: s.opacity, transform: [{ translateX: s.tx }, { translateY: s.ty }] }]}
            >
              ✨
            </Animated.Text>
          ))}
          <Animated.View style={{ width: W, height: LID_H + BODY_H, transform: [{ rotate }, { scale: grow }] }}>
            {/* Körper */}
            <View style={[styles.body, { top: LID_H }]}>
              <View style={[styles.band, { left: 26 }]} />
              <View style={[styles.band, { right: 26 }]} />
            </View>
            {/* Deckel */}
            <Animated.View style={[styles.lid, { transform: lidPivot }]}>
              <View style={[styles.band, { left: 26 }]} />
              <View style={[styles.band, { right: 26 }]} />
            </Animated.View>
            {/* Schloss: verschwindet beim Öffnen */}
            <Animated.View style={[styles.lock, { opacity: lid.interpolate({ inputRange: [0, 0.3], outputRange: [1, 0] }) }]} />
          </Animated.View>
        </View>

        <Animated.View
          pointerEvents={phase === "done" ? "auto" : "none"}
          style={[
            styles.card,
            { backgroundColor: colors.surface, opacity: card, transform: [{ scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
          ]}
          accessibilityLiveRegion="polite"
        >
          {result && (
            <>
              <AppText style={styles.big}>{result.reward ? "🎉" : "⭐"}</AppText>
              <AppText variant="title" center>
                {result.reward ? t("reward.new", { name: t(result.reward.name) }) : t("chest.xp", { xp: result.xp })}
              </AppText>
              {result.levelUp !== null && (
                <AppText variant="label" tone="textSecondary" center>
                  ⬆ {t("game.levelUp", { level: result.levelUp })}
                </AppText>
              )}
              {result.reward && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    sfx("tap");
                    tapHaptic();
                    onChoose();
                  }}
                  style={({ pressed }) => [styles.choose, { borderColor: colors.primary }, pressed && press.pressed]}
                >
                  <AppText variant="label" color={colors.primary}>
                    {t("chest.choose")} ›
                  </AppText>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                onPress={() => {
                  sfx("tap");
                  tapHaptic();
                  onClose();
                }}
                style={({ pressed }) => [styles.close, pressed && press.pressed]}
              >
                <AppText variant="label" color="#3A2A00">
                  {t("common.close")}
                </AppText>
              </Pressable>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,14,24,0.88)", alignItems: "center", justifyContent: "center", padding: Spacing.lg, gap: Spacing.lg },
  stage: { width: 260, height: 220, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "#FFD966" },
  spark: { position: "absolute", fontSize: 22 },
  body: {
    position: "absolute",
    left: 0,
    right: 0,
    height: BODY_H,
    backgroundColor: WOOD,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: WOOD_DARK,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: "hidden",
  },
  lid: {
    position: "absolute",
    top: 0,
    left: 0,
    width: W,
    height: LID_H,
    backgroundColor: WOOD,
    borderWidth: 3,
    borderColor: WOOD_DARK,
    borderTopLeftRadius: W / 2,
    borderTopRightRadius: W / 2,
    overflow: "hidden",
  },
  band: { position: "absolute", top: 0, bottom: 0, width: 14, backgroundColor: GOLD },
  lock: {
    position: "absolute",
    top: LID_H - 12,
    left: W / 2 - 15,
    width: 30,
    height: 32,
    borderRadius: 6,
    backgroundColor: GOLD,
    borderWidth: 3,
    borderColor: WOOD_DARK,
  },
  card: { width: "100%", maxWidth: 340, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: "center", gap: Spacing.sm },
  big: { fontSize: 44, lineHeight: 54 },
  choose: { borderWidth: 2, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 44, justifyContent: "center" },
  close: { backgroundColor: "#F5B800", borderRadius: Radius.pill, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, minHeight: 44, justifyContent: "center", marginTop: Spacing.xs },
});
