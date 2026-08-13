// Datei: app/(tabs)/explore.tsx — Premium Drag & Drop mit Glow + Particles
import {
  type Item,
  BINS,
  getRandomItem
} from "@/constants/items";
import { AppColors, Radius } from "@/constants/theme";
import {
  StorageKeys,
  addXP,
  getBoolean,
  getHighscoreKey,
  getNumber,
  setNumber,
  updateStreak,
} from "@/utils/storage";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  ZoomIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";

type Mode = "runden" | "zeit" | "endlos";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const ROUND_COUNT = 10;
const TIME_LIMIT = 60;

// Layout
const BIN_COLS = 3;
const BIN_GAP = 10;
const BIN_PADDING = 16;
const BIN_W = (SCREEN_W - BIN_PADDING * 2 - BIN_GAP * (BIN_COLS - 1)) / BIN_COLS;
const BIN_H = 90;
const BINS_Y = SCREEN_H - 260;
const ITEM_CENTER_X = SCREEN_W / 2 - 70;
const ITEM_CENTER_Y = 180;

function getBinPosition(index: number) {
  const row = Math.floor(index / BIN_COLS);
  const col = index % BIN_COLS;
  return {
    x: BIN_PADDING + col * (BIN_W + BIN_GAP),
    y: BINS_Y + row * (BIN_H + BIN_GAP),
  };
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = (params.mode as Mode) || "runden";
  const highscoreKey = getHighscoreKey(mode);

  const correctSound = useAudioPlayer(require("../../assets/sounds/correct.mp3"));
  const wrongSound = useAudioPlayer(require("../../assets/sounds/wrong.mp3"));
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [highscore, setHighscore] = useState(0);
  const [isNewHighscore, setIsNewHighscore] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [currentItem, setCurrentItem] = useState<Item>(() => getRandomItem());
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [finished, setFinished] = useState(false);
  const [combo, setCombo] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [showFact, setShowFact] = useState<string | null>(null);
  const [streakUpdated, setStreakUpdated] = useState(false);
  const [activeBin, setActiveBin] = useState<number>(-1);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  const particleId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animated values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const itemScale = useSharedValue(1);
  const itemOpacity = useSharedValue(1);
  const itemRotation = useSharedValue(0);
  const floatY = useSharedValue(0);
  const bgFlash = useSharedValue(0);
  const binScales = BINS.map(() => useSharedValue(1));
  const binGlows = BINS.map(() => useSharedValue(0));
  const progressWidth = useSharedValue(0);

  // Floating animation
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1200 }),
        withTiming(6, { duration: 1200 }),
      ),
      -1,
      true,
    );
  }, []);

  useEffect(() => {
    getNumber(highscoreKey).then(setHighscore);
    getBoolean(StorageKeys.SOUND_ENABLED, true).then(setSoundEnabled);
  }, [highscoreKey]);

  // Progress bar
  useEffect(() => {
    if (mode === "runden") {
      progressWidth.value = withTiming((round / ROUND_COUNT) * 100, { duration: 400 });
    }
  }, [round, mode]);

  // Timer
  useEffect(() => {
    if (mode === "zeit" && !finished) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setFinished(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [mode, finished]);

  const spawnParticles = useCallback((x: number, y: number) => {
    const emojis = ["✨", "⭐", "💫", "🌟", "♻️"];
    const newParticles = Array.from({ length: 6 }, () => ({
      id: particleId.current++,
      x: x + (Math.random() - 0.5) * 100,
      y: y + (Math.random() - 0.5) * 80,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }));
    setParticles((p) => [...p, ...newParticles]);
    setTimeout(() => {
      setParticles((p) => p.filter((pp) => !newParticles.find((np) => np.id === pp.id)));
    }, 800);
  }, []);

  const resetItem = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    itemScale.value = withSpring(1);
    itemOpacity.value = withTiming(1, { duration: 200 });
    itemRotation.value = withSpring(0);
  }, []);

  const nextRound = useCallback(() => {
    if (mode === "runden" && round >= ROUND_COUNT) {
      setFinished(true);
      return;
    }
    const next = getRandomItem(currentItem);
    setCurrentItem(next);
    setFeedback(null);
    setShowFact(null);
    setActiveBin(-1);
    resetItem();
    setRound((r) => r + 1);
  }, [round, currentItem, mode, resetItem]);

  useEffect(() => {
    if (finished) {
      (async () => {
        if (score > highscore) {
          setHighscore(score);
          setIsNewHighscore(true);
          await setNumber(highscoreKey, score);
        } else { setIsNewHighscore(false); }
        await addXP(earnedXP);
        if (!streakUpdated) { await updateStreak(); setStreakUpdated(true); }
      })();
    }
  }, [finished]);

  const handleDrop = useCallback((binIndex: number) => {
    if (feedback || finished) return;
    const bin = BINS[binIndex];
    const isCorrect = bin.category === currentItem.category;
    const binPos = getBinPosition(binIndex);

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      const comboBonus = newCombo >= 3 ? 5 : newCombo >= 5 ? 10 : 0;
      setScore((s) => s + 10 + comboBonus);
      setEarnedXP((e) => e + 10 + comboBonus);
      setFeedback("correct");

      // Item shrinks into bin
      itemScale.value = withTiming(0, { duration: 250 });
      itemOpacity.value = withTiming(0, { duration: 250 });
      itemRotation.value = withTiming(360, { duration: 300 });

      // Bin bounce + glow
      binScales[binIndex].value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withSpring(1, { damping: 6, stiffness: 200 }),
      );
      binGlows[binIndex].value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 600 }),
      );

      // Screen flash green
      bgFlash.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 300 }),
      );

      // Particles!
      spawnParticles(binPos.x + BIN_W / 2, binPos.y);

      if (soundEnabled) { correctSound.seekTo(0); correctSound.play(); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (currentItem.fact && Math.random() < 0.35) {
        setShowFact(currentItem.fact);
      }
      setTimeout(nextRound, showFact ? 1600 : 900);
    } else {
      setCombo(0);
      setFeedback("wrong");

      // Bin shake
      binScales[binIndex].value = withSequence(
        withTiming(0.85, { duration: 50 }),
        withTiming(1.15, { duration: 50 }),
        withTiming(0.9, { duration: 50 }),
        withSpring(1, { damping: 8 }),
      );

      // Screen flash red
      bgFlash.value = withSequence(
        withTiming(-1, { duration: 80 }),
        withTiming(0, { duration: 400 }),
      );

      // Item bounce back
      translateX.value = withSpring(0, { damping: 10, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 10, stiffness: 150 });
      itemScale.value = withSpring(1);
      itemRotation.value = withSequence(
        withTiming(-15, { duration: 50 }),
        withTiming(15, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withSpring(0),
      );

      if (soundEnabled) { wrongSound.seekTo(0); wrongSound.play(); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      setTimeout(() => setFeedback(null), 1000);
    }
  }, [feedback, finished, currentItem, combo, soundEnabled, nextRound, showFact]);

  const checkBinHit = useCallback((absX: number, absY: number): number => {
    for (let i = 0; i < BINS.length; i++) {
      const pos = getBinPosition(i);
      if (absX >= pos.x && absX <= pos.x + BIN_W && absY >= pos.y && absY <= pos.y + BIN_H) {
        return i;
      }
    }
    return -1;
  }, []);

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      itemScale.value = withSpring(1.15);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      itemRotation.value = e.translationX * 0.05;
      const absX = ITEM_CENTER_X + 70 + e.translationX;
      const absY = ITEM_CENTER_Y + 50 + e.translationY;
      const hit = checkBinHit(absX, absY);
      runOnJS(setActiveBin)(hit);
    })
    .onEnd((e) => {
      itemScale.value = withSpring(1);
      const absX = ITEM_CENTER_X + 70 + e.translationX;
      const absY = ITEM_CENTER_Y + 50 + e.translationY;
      const hit = checkBinHit(absX, absY);
      if (hit >= 0) {
        runOnJS(handleDrop)(hit);
      } else {
        translateX.value = withSpring(0, { damping: 12 });
        translateY.value = withSpring(0, { damping: 12 });
        itemRotation.value = withSpring(0);
        runOnJS(setActiveBin)(-1);
      }
    });

  const itemAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + floatY.value },
      { scale: itemScale.value },
      { rotate: `${itemRotation.value}deg` },
    ],
    opacity: itemOpacity.value,
  }));

  const bgFlashStyle = useAnimatedStyle(() => ({
    backgroundColor:
      bgFlash.value > 0
        ? `rgba(0, 230, 118, ${bgFlash.value * 0.15})`
        : bgFlash.value < 0
          ? `rgba(255, 82, 82, ${Math.abs(bgFlash.value) * 0.15})`
          : "transparent",
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const restart = () => {
    setRound(1); setScore(0); setTimeLeft(TIME_LIMIT);
    setCombo(0); setEarnedXP(0); setFeedback(null);
    setShowFact(null); setFinished(false); setActiveBin(-1);
    setCurrentItem(getRandomItem()); resetItem();
    progressWidth.value = withTiming(0, { duration: 200 });
  };

  const modeLabel = mode === "zeit" ? "⏱️ ZEIT" : mode === "endlos" ? "♾️ ENDLOS" : "🔢 RUNDEN";

  // ── End Screen ────────────────────────────────────────────────────
  if (finished) {
    return (
      <View style={styles.container}>
        <Animated.View entering={ZoomIn.duration(400)} style={styles.endContent}>
          <Text style={styles.endEmoji}>🏆</Text>
          <Text style={styles.endTitle}>{score} Punkte</Text>
          <Text style={styles.endXP}>+{earnedXP} XP verdient</Text>
          {isNewHighscore ? (
            <Animated.Text entering={ZoomIn.delay(300)} style={styles.newHS}>
              🎉 Neuer Highscore!
            </Animated.Text>
          ) : (
            <Text style={styles.oldHS}>Highscore: {highscore}</Text>
          )}
          <TouchableOpacity style={styles.playAgain} onPress={restart} activeOpacity={0.85}>
            <Text style={styles.playAgainText}>🔄 Nochmal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(tabs)")}>
            <Text style={styles.backBtnText}>Zurück</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── Game Screen ───────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* BG Flash overlay */}
      <Animated.View style={[styles.flashOverlay, bgFlashStyle]} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.modeTag}>{modeLabel}</Text>
          <View style={styles.scoreChip}>
            <Text style={styles.scoreText}>⭐ {score}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        {mode === "runden" && (
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
            <Text style={styles.progressLabel}>{round}/{ROUND_COUNT}</Text>
          </View>
        )}
        {mode === "zeit" && (
          <View style={styles.timerBar}>
            <View style={[styles.timerFill, { width: `${(timeLeft / TIME_LIMIT) * 100}%` }]} />
            <Text style={styles.timerLabel}>{timeLeft}s</Text>
          </View>
        )}
        {mode === "endlos" && (
          <Text style={styles.roundLabel}>Runde {round}</Text>
        )}

        {/* Combo */}
        {combo >= 3 && (
          <Animated.View entering={ZoomIn} style={styles.comboBadge}>
            <Text style={styles.comboText}>🔥 {combo}× Combo!</Text>
          </Animated.View>
        )}
      </View>

      {/* Draggable Item */}
      <View style={[styles.itemZone, { top: ITEM_CENTER_Y - 10, left: ITEM_CENTER_X }]}>
        <GestureDetector gesture={dragGesture}>
          <Animated.View style={[styles.itemCard, itemAnimStyle]}>
            <Text style={styles.itemEmoji}>{currentItem.emoji}</Text>
            <Text style={styles.itemName}>{currentItem.name}</Text>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Feedback */}
      {feedback === "correct" && (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut} style={styles.feedbackBox}>
          <Text style={styles.feedbackGood}>✅ Richtig!</Text>
        </Animated.View>
      )}
      {feedback === "wrong" && (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut} style={styles.feedbackBox}>
          <Text style={styles.feedbackBad}>❌ → {currentItem.category}</Text>
        </Animated.View>
      )}
      {showFact && (
        <Animated.View entering={SlideInUp.delay(200)} style={styles.factBox}>
          <Text style={styles.factText}>💡 {showFact}</Text>
        </Animated.View>
      )}

      {/* Particles */}
      {particles.map((p) => (
        <Animated.Text
          key={p.id}
          entering={ZoomIn.duration(200)}
          exiting={FadeOut.duration(500)}
          style={[styles.particle, { left: p.x, top: p.y }]}
        >
          {p.emoji}
        </Animated.Text>
      ))}

      {/* Instruction */}
      {!feedback && combo < 1 && round <= 2 && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>⬇️ Ziehe in die richtige Tonne</Text>
        </View>
      )}

      {/* Bins */}
      {BINS.map((bin, i) => {
        const pos = getBinPosition(i);
        const isActive = activeBin === i;

        const binStyle = useAnimatedStyle(() => ({
          transform: [{ scale: binScales[i].value }],
          shadowOpacity: binGlows[i].value * 0.8,
          shadowRadius: binGlows[i].value * 20,
        }));

        return (
          <Animated.View
            key={bin.category}
            style={[
              styles.bin,
              {
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: BIN_W,
                height: BIN_H,
                backgroundColor: isActive ? bin.colorLight : bin.color,
                borderColor: isActive ? "#FFFFFF" : bin.colorLight,
                borderWidth: isActive ? 3 : 1.5,
                shadowColor: bin.colorLight,
              },
              binStyle,
            ]}
          >
            <Text style={styles.binIcon}>{bin.binEmoji}</Text>
            <Text style={styles.binLabel}>{bin.label}</Text>
            {isActive && <View style={[styles.binGlow, { backgroundColor: bin.glow }]} />}
          </Animated.View>
        );
      })}

      {/* Endlos: Beenden */}
      {mode === "endlos" && (
        <TouchableOpacity style={styles.endBtn} onPress={() => setFinished(true)}>
          <Text style={styles.endBtnText}>Beenden</Text>
        </TouchableOpacity>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  // Header
  header: {
    paddingTop: 55,
    paddingHorizontal: BIN_PADDING,
    alignItems: "center",
    zIndex: 5,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
  },
  modeTag: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
    backgroundColor: AppColors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  scoreChip: {
    backgroundColor: AppColors.card,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  scoreText: {
    color: AppColors.green,
    fontSize: 16,
    fontWeight: "900",
  },
  // Progress
  progressBar: {
    width: "100%",
    height: 24,
    backgroundColor: AppColors.card,
    borderRadius: Radius.pill,
    overflow: "hidden",
    justifyContent: "center",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: AppColors.green,
    borderRadius: Radius.pill,
  },
  progressLabel: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    zIndex: 2,
  },
  timerBar: {
    width: "100%",
    height: 24,
    backgroundColor: AppColors.card,
    borderRadius: Radius.pill,
    overflow: "hidden",
    justifyContent: "center",
  },
  timerFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: AppColors.orange,
    borderRadius: Radius.pill,
  },
  timerLabel: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    zIndex: 2,
  },
  roundLabel: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  // Combo
  comboBadge: {
    marginTop: 6,
    backgroundColor: "#FF6D0044",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: AppColors.orange,
  },
  comboText: {
    color: AppColors.orange,
    fontSize: 15,
    fontWeight: "900",
  },
  // Item
  itemZone: {
    position: "absolute",
    zIndex: 20,
  },
  itemCard: {
    backgroundColor: AppColors.card,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    width: 140,
    borderWidth: 1.5,
    borderColor: AppColors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  itemEmoji: { fontSize: 52, marginBottom: 8 },
  itemName: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 17,
  },
  // Feedback
  feedbackBox: {
    position: "absolute",
    top: 150,
    alignSelf: "center",
    zIndex: 30,
  },
  feedbackGood: {
    color: AppColors.green,
    fontSize: 20,
    fontWeight: "900",
    backgroundColor: "#00E67622",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: AppColors.green,
    overflow: "hidden",
  },
  feedbackBad: {
    color: AppColors.red,
    fontSize: 18,
    fontWeight: "900",
    backgroundColor: "#FF525222",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: AppColors.red,
    overflow: "hidden",
  },
  factBox: {
    position: "absolute",
    top: 195,
    left: 24,
    right: 24,
    alignItems: "center",
    zIndex: 30,
  },
  factText: {
    color: AppColors.yellow,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    fontStyle: "italic",
    backgroundColor: AppColors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD74044",
    overflow: "hidden",
  },
  hintBox: {
    position: "absolute",
    top: 155,
    alignSelf: "center",
    zIndex: 5,
  },
  hintText: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  // Particles
  particle: {
    position: "absolute",
    fontSize: 22,
    zIndex: 40,
  },
  // Bins
  bin: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  binIcon: { fontSize: 28 },
  binLabel: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  binGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    opacity: 0.4,
  },
  // End
  endBtn: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: AppColors.card,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: AppColors.red,
  },
  endBtnText: { color: AppColors.red, fontWeight: "700", fontSize: 14 },
  // End Screen
  endContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  endEmoji: { fontSize: 80, marginBottom: 12 },
  endTitle: { color: "#FFF", fontSize: 36, fontWeight: "900", marginBottom: 4 },
  endXP: { color: AppColors.yellow, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  newHS: { color: AppColors.yellow, fontSize: 22, fontWeight: "900", marginBottom: 32 },
  oldHS: { color: AppColors.textMuted, fontSize: 16, marginBottom: 32 },
  playAgain: {
    backgroundColor: AppColors.green,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 12,
  },
  playAgainText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  backBtn: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  backBtnText: { color: AppColors.textSecondary, fontSize: 16, fontWeight: "700" },
});
