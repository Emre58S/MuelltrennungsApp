import { type Item, BINS, getRandomItem } from "@/constants/items";
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
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Mode = "runden" | "zeit" | "endlos";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const ROUND_COUNT = 10;
const TIME_LIMIT = 60;

// Größere Tonnen für bessere Treffergenauigkeit
const BIN_TOP_Y = 105;
const BIN_SIZE = Math.min(110, (SCREEN_W - 24) / BINS.length - 6);
const BIN_GAP = (SCREEN_W - BINS.length * BIN_SIZE) / (BINS.length + 1);

const ITEM_START_X = SCREEN_W / 2 - 60;
const ITEM_START_Y = SCREEN_H - 260;
const THROW_MIN_DISTANCE = 50;
const FLIGHT_DURATION = 420;
const VELOCITY_WEIGHT = 0.05; // schwächer gewichtet als vorher (0.15)

function getBinCenterX(index: number) {
  return BIN_GAP + index * (BIN_SIZE + BIN_GAP) + BIN_SIZE / 2;
}

function computeTargetIndex(translationX: number, velocityX: number): number {
  const projectedX =
    ITEM_START_X + 60 + translationX + velocityX * VELOCITY_WEIGHT;
  const clampedX = Math.max(BIN_GAP, Math.min(SCREEN_W - BIN_GAP, projectedX));

  let closestIndex = 0;
  let closestDistance = Infinity;

  for (let i = 0; i < BINS.length; i++) {
    const distance = Math.abs(getBinCenterX(i) - clampedX);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode =
    params.mode === "zeit" ||
    params.mode === "endlos" ||
    params.mode === "runden"
      ? params.mode
      : "runden";
  const highscoreKey = getHighscoreKey(mode);

  const correctSound = useAudioPlayer(
    require("../../assets/sounds/correct.mp3"),
  );
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
  const [isThrowing, setIsThrowing] = useState(false);
  const [aimIndex, setAimIndex] = useState<number>(-1);
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; emoji: string }[]
  >([]);

  const particleId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const itemX = useSharedValue(ITEM_START_X);
  const itemY = useSharedValue(0);
  const itemScale = useSharedValue(1);
  const itemOpacity = useSharedValue(1);
  const itemRotation = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const bgFlash = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    getNumber(highscoreKey).then(setHighscore);
    getBoolean(StorageKeys.SOUND_ENABLED, true).then(setSoundEnabled);
  }, [highscoreKey]);

  useEffect(() => {
    if (mode === "runden") {
      progressWidth.value = withTiming((round / ROUND_COUNT) * 100, {
        duration: 400,
      });
    }
  }, [round, mode, progressWidth]);

  useEffect(() => {
    if (mode === "zeit" && !finished) {
      timerRef.current = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setFinished(true);
            return 0;
          }
          return time - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [mode, finished]);

  const spawnParticles = useCallback((x: number, y: number) => {
    const emojis = ["✨", "⭐", "💫", "🌟", "♻️"];
    const newParticles = Array.from({ length: 6 }, () => ({
      id: particleId.current++,
      x: x + (Math.random() - 0.5) * 90,
      y: y + (Math.random() - 0.5) * 70,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }));

    setParticles((old) => [...old, ...newParticles]);
    setTimeout(() => {
      setParticles((old) =>
        old.filter(
          (particle) =>
            !newParticles.some((newParticle) => newParticle.id === particle.id),
        ),
      );
    }, 800);
  }, []);

  const resetItemPosition = useCallback(() => {
    dragX.value = 0;
    dragY.value = 0;
    itemX.value = ITEM_START_X;
    itemY.value = 0;
    itemScale.value = withSpring(1);
    itemOpacity.value = withTiming(1, { duration: 200 });
    itemRotation.value = withSpring(0);
    setAimIndex(-1);
  }, [dragX, dragY, itemX, itemY, itemScale, itemOpacity, itemRotation]);

  const nextRound = useCallback(() => {
    if (mode === "runden" && round >= ROUND_COUNT) {
      setFinished(true);
      return;
    }

    setCurrentItem(getRandomItem(currentItem));
    setFeedback(null);
    setShowFact(null);
    setIsThrowing(false);
    resetItemPosition();
    setRound((oldRound) => oldRound + 1);
  }, [round, currentItem, mode, resetItemPosition]);

  useEffect(() => {
    if (!finished) return;

    (async () => {
      if (score > highscore) {
        setHighscore(score);
        setIsNewHighscore(true);
        await setNumber(highscoreKey, score);
      } else {
        setIsNewHighscore(false);
      }

      await addXP(earnedXP);

      if (!streakUpdated) {
        await updateStreak();
        setStreakUpdated(true);
      }
    })();
  }, [finished, score, highscore, earnedXP, highscoreKey, streakUpdated]);

  const evaluateThrow = useCallback(
    (targetBinIndex: number) => {
      try {
        if (finished) return;

        const bin = BINS[targetBinIndex];
        if (!bin) throw new Error(`Kein Bin für Index ${targetBinIndex}`);
        if (!currentItem || !currentItem.category) {
          throw new Error("currentItem ungültig");
        }

        const isCorrect = bin.category === currentItem.category;
        const binCenterX = getBinCenterX(targetBinIndex);

        console.log(
          "Item:",
          currentItem.category,
          "Ziel-Bin:",
          bin.category,
          "Treffer:",
          isCorrect,
        );

        if (isCorrect) {
          const newCombo = combo + 1;
          const comboBonus = newCombo >= 5 ? 10 : newCombo >= 3 ? 5 : 0;

          setCombo(newCombo);
          setScore((oldScore) => oldScore + 10 + comboBonus);
          setEarnedXP((oldXP) => oldXP + 10 + comboBonus);
          setFeedback("correct");

          bgFlash.value = withSequence(
            withTiming(1, { duration: 80 }),
            withTiming(0, { duration: 300 }),
          );

          spawnParticles(binCenterX, BIN_TOP_Y + BIN_SIZE / 2);

          if (soundEnabled) {
            correctSound.seekTo(0);
            correctSound.play();
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          if (currentItem.fact && Math.random() < 0.35) {
            setShowFact(currentItem.fact);
          }

          setTimeout(nextRound, 900);
        } else {
          setCombo(0);
          setFeedback("wrong");

          bgFlash.value = withSequence(
            withTiming(-1, { duration: 80 }),
            withTiming(0, { duration: 400 }),
          );

          if (soundEnabled) {
            wrongSound.seekTo(0);
            wrongSound.play();
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

          setTimeout(() => {
            setFeedback(null);
            setIsThrowing(false);
            resetItemPosition();
          }, 1000);
        }
      } catch (error) {
        console.error("Fehler in evaluateThrow:", error);
        setFeedback(null);
        setIsThrowing(false);
        resetItemPosition();
      }
    },
    [
      finished,
      currentItem,
      combo,
      soundEnabled,
      correctSound,
      wrongSound,
      spawnParticles,
      nextRound,
      resetItemPosition,
      bgFlash,
    ],
  );

  const startThrow = useCallback(
    (targetBinIndex: number) => {
      if (isThrowing || feedback || finished) return;

      setIsThrowing(true);

      const targetCenterX = getBinCenterX(targetBinIndex);

      itemX.value = withTiming(targetCenterX - 60, {
        duration: FLIGHT_DURATION,
      });
      itemY.value = withTiming(-(ITEM_START_Y - BIN_TOP_Y - BIN_SIZE / 2), {
        duration: FLIGHT_DURATION,
      });
      itemRotation.value = withTiming(360, { duration: FLIGHT_DURATION });
      itemScale.value = withSequence(
        withTiming(1.1, { duration: FLIGHT_DURATION * 0.4 }),
        withTiming(0.7, { duration: FLIGHT_DURATION * 0.6 }),
      );
      dragX.value = withTiming(0, { duration: FLIGHT_DURATION });
      dragY.value = withTiming(0, { duration: FLIGHT_DURATION });
      itemOpacity.value = withTiming(0, { duration: FLIGHT_DURATION });

      setTimeout(() => {
        evaluateThrow(targetBinIndex);
      }, FLIGHT_DURATION + 20);
    },
    [
      isThrowing,
      feedback,
      finished,
      itemX,
      itemY,
      itemRotation,
      itemScale,
      dragX,
      dragY,
      itemOpacity,
      evaluateThrow,
    ],
  );

  // Live-Zielvorschau während des Ziehens
  const updateAimPreview = useCallback(
    (translationX: number, translationY: number) => {
      if (-translationY > 20) {
        const index = computeTargetIndex(translationX, 0);
        setAimIndex(index);
      } else {
        setAimIndex(-1);
      }
    },
    [],
  );

  const handleSwipeEnd = useCallback(
    (
      translationX: number,
      translationY: number,
      velocityX: number,
      velocityY: number,
    ) => {
      try {
        const swipedUpEnough = -translationY > THROW_MIN_DISTANCE;
        const flungUpEnough = velocityY < -250;

        if (!swipedUpEnough && !flungUpEnough) {
          dragX.value = withSpring(0, { damping: 12 });
          dragY.value = withSpring(0, { damping: 12 });
          itemRotation.value = withSpring(0);
          setAimIndex(-1);
          return;
        }

        const targetIndex = computeTargetIndex(translationX, velocityX);
        setAimIndex(-1);
        startThrow(targetIndex);
      } catch (error) {
        console.error("Fehler in handleSwipeEnd:", error);
      }
    },
    [dragX, dragY, itemRotation, startThrow],
  );

  const throwGesture = Gesture.Pan()
    .onUpdate((event) => {
      dragX.value = event.translationX;
      dragY.value = event.translationY;
      itemRotation.value = event.translationX * 0.08;
      runOnJS(updateAimPreview)(event.translationX, event.translationY);
    })
    .onEnd((event) => {
      runOnJS(handleSwipeEnd)(
        event.translationX,
        event.translationY,
        event.velocityX,
        event.velocityY,
      );
    });

  const itemAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: itemX.value - ITEM_START_X + dragX.value },
      { translateY: itemY.value + dragY.value },
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
    setRound(1);
    setScore(0);
    setTimeLeft(TIME_LIMIT);
    setCombo(0);
    setEarnedXP(0);
    setFeedback(null);
    setShowFact(null);
    setFinished(false);
    setIsThrowing(false);
    setStreakUpdated(false);
    setCurrentItem(getRandomItem());
    resetItemPosition();
    progressWidth.value = withTiming(0, { duration: 200 });
  };

  const modeLabel =
    mode === "zeit" ? "⏱️ ZEIT" : mode === "endlos" ? "♾️ ENDLOS" : "🔢 RUNDEN";

  if (finished) {
    return (
      <View style={styles.container}>
        <Animated.View
          entering={ZoomIn.duration(400)}
          style={styles.endContent}
        >
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

          <TouchableOpacity
            style={styles.playAgain}
            onPress={restart}
            activeOpacity={0.85}
          >
            <Text style={styles.playAgainText}>🔄 Nochmal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.backBtnText}>Zurück</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Animated.View
        style={[styles.flashOverlay, bgFlashStyle]}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.modeTag}>{modeLabel}</Text>
          <View style={styles.scoreChip}>
            <Text style={styles.scoreText}>⭐ {score}</Text>
          </View>
        </View>

        {mode === "runden" && (
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
            <Text style={styles.progressLabel}>
              {round}/{ROUND_COUNT}
            </Text>
          </View>
        )}

        {mode === "zeit" && (
          <View style={styles.timerBar}>
            <View
              style={[
                styles.timerFill,
                { width: `${(timeLeft / TIME_LIMIT) * 100}%` },
              ]}
            />
            <Text style={styles.timerLabel}>{timeLeft}s</Text>
          </View>
        )}

        {mode === "endlos" && (
          <Text style={styles.roundLabel}>Runde {round}</Text>
        )}

        {combo >= 3 && (
          <Animated.View entering={ZoomIn} style={styles.comboBadge}>
            <Text style={styles.comboText}>🔥 {combo}× Combo!</Text>
          </Animated.View>
        )}
      </View>

      {/* Mülltonnen-Reihe: echte Tonnen-Optik in Kategoriefarbe */}
      <View style={styles.binsRow}>
        {BINS.map((bin, index) => {
          const isAimed = aimIndex === index;
          return (
            <View
              key={bin.category}
              style={[
                styles.binCard,
                {
                  width: BIN_SIZE,
                  height: BIN_SIZE,
                  backgroundColor: bin.color,
                  borderColor: isAimed ? "#FFFFFF" : bin.colorLight,
                  borderWidth: isAimed ? 3 : 2,
                  transform: [{ scale: isAimed ? 1.08 : 1 }],
                },
              ]}
            >
              <Text style={styles.binIcon}>🗑️</Text>
              <Text style={styles.binLabel} numberOfLines={1}>
                {bin.label}
              </Text>
            </View>
          );
        })}
      </View>

      {feedback === "correct" && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut}
          style={styles.feedbackBox}
        >
          <Text style={styles.feedbackGood}>✅ Richtig!</Text>
        </Animated.View>
      )}

      {feedback === "wrong" && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut}
          style={styles.feedbackBox}
        >
          <Text style={styles.feedbackBad}>❌ → {currentItem.category}</Text>
        </Animated.View>
      )}

      {showFact && (
        <Animated.View entering={SlideInUp.delay(200)} style={styles.factBox}>
          <Text style={styles.factText}>💡 {showFact}</Text>
        </Animated.View>
      )}

      {particles.map((particle) => (
        <Animated.Text
          key={particle.id}
          entering={ZoomIn.duration(200)}
          exiting={FadeOut.duration(500)}
          style={[styles.particle, { left: particle.x, top: particle.y }]}
        >
          {particle.emoji}
        </Animated.Text>
      ))}

      {!feedback && !isThrowing && round <= 2 && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>⬆️ Wische nach oben, um zu werfen</Text>
        </View>
      )}

      <View
        style={[styles.itemZone, { top: ITEM_START_Y, left: ITEM_START_X }]}
      >
        <GestureDetector gesture={throwGesture}>
          <Animated.View style={[styles.itemCard, itemAnimStyle]}>
            <Text style={styles.itemEmoji}>{currentItem.emoji}</Text>
            <Text style={styles.itemName}>{currentItem.name}</Text>
          </Animated.View>
        </GestureDetector>
      </View>

      {mode === "endlos" && (
        <TouchableOpacity
          style={styles.endBtn}
          onPress={() => setFinished(true)}
        >
          <Text style={styles.endBtnText}>Beenden</Text>
        </TouchableOpacity>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.bg },
  flashOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  header: {
    paddingTop: 55,
    paddingHorizontal: 16,
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
  scoreText: { color: AppColors.green, fontSize: 16, fontWeight: "900" },
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
  comboBadge: {
    marginTop: 6,
    backgroundColor: "#FF6D0044",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: AppColors.orange,
  },
  comboText: { color: AppColors.orange, fontSize: 15, fontWeight: "900" },

  binsRow: {
    position: "absolute",
    top: BIN_TOP_Y,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: BIN_GAP,
    zIndex: 5,
  },
  binCard: {
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  binIcon: { fontSize: 30 },
  binLabel: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
    paddingHorizontal: 2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 3,
  },

  itemZone: { position: "absolute", zIndex: 20 },
  itemCard: {
    backgroundColor: AppColors.card,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    width: 120,
    borderWidth: 1.5,
    borderColor: AppColors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  itemEmoji: { fontSize: 48, marginBottom: 8 },
  itemName: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
  },

  feedbackBox: {
    position: "absolute",
    top: 260,
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
    top: 305,
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
    top: BIN_TOP_Y + BIN_SIZE + 20,
    alignSelf: "center",
    zIndex: 5,
  },
  hintText: { color: AppColors.textMuted, fontSize: 13, fontWeight: "600" },
  particle: { position: "absolute", fontSize: 22, zIndex: 40 },

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

  endContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  endEmoji: { fontSize: 80, marginBottom: 12 },
  endTitle: { color: "#FFF", fontSize: 36, fontWeight: "900", marginBottom: 4 },
  endXP: {
    color: AppColors.yellow,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  newHS: {
    color: AppColors.yellow,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 32,
  },
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
  backBtnText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: "700",
  },
});
