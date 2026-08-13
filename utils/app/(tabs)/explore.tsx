// Datei: app/(tabs)/explore.tsx — Game Screen mit XP, Streak, Combo, Facts
import { useAudioPlayer } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppColors, FontSize, Radius, Spacing } from "@/constants/theme";
import {
  type Category,
  type Item,
  CATEGORY_COLORS,
  getRandomItem,
  getRoundOptions,
} from "@/constants/items";
import {
  addXP,
  getBoolean,
  getNumber,
  setNumber,
  getHighscoreKey,
  updateStreak,
  StorageKeys,
} from "@/utils/storage";

type Mode = "runden" | "zeit" | "endlos";

const ROUND_COUNT = 10;
const TIME_LIMIT = 60;

export default function GameScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = (params.mode as Mode) || "runden";
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
  const [options, setOptions] = useState<Category[]>(() =>
    getRoundOptions(currentItem.category),
  );
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [finished, setFinished] = useState(false);
  const [combo, setCombo] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [showFact, setShowFact] = useState<string | null>(null);
  const [streakUpdated, setStreakUpdated] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load highscore + sound setting
  useEffect(() => {
    getNumber(highscoreKey).then(setHighscore);
    getBoolean(StorageKeys.SOUND_ENABLED, true).then(setSoundEnabled);
  }, [highscoreKey]);

  // Timer für Zeit-Modus
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
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [mode, finished]);

  const nextRound = useCallback(() => {
    if (mode === "runden" && round >= ROUND_COUNT) {
      setFinished(true);
      return;
    }
    const nextItem = getRandomItem(currentItem);
    setCurrentItem(nextItem);
    setOptions(getRoundOptions(nextItem.category));
    setFeedback(null);
    setShowFact(null);
    setRound((r) => r + 1);
  }, [round, currentItem, mode]);

  useEffect(() => {
    if (feedback) {
      const delay = showFact ? 1800 : 700;
      const timeout = setTimeout(nextRound, delay);
      return () => clearTimeout(timeout);
    }
  }, [feedback, nextRound, showFact]);

  // Spiel beendet: Highscore + XP + Streak speichern
  useEffect(() => {
    if (finished) {
      (async () => {
        if (score > highscore) {
          setHighscore(score);
          setIsNewHighscore(true);
          await setNumber(highscoreKey, score);
        } else {
          setIsNewHighscore(false);
        }

        // XP addieren
        const xpResult = await addXP(earnedXP);

        // Streak aktualisieren (nur 1× pro Spiel)
        if (!streakUpdated) {
          await updateStreak();
          setStreakUpdated(true);
        }
      })();
    }
  }, [finished]);

  const handleAnswer = (choice: Category) => {
    if (feedback || finished) return;

    if (choice === currentItem.category) {
      const newCombo = combo + 1;
      setCombo(newCombo);

      // Punkte: Basis + Combo-Bonus
      const comboBonus = newCombo >= 3 ? 5 : 0;
      const points = 10 + comboBonus;
      setScore((s) => s + points);

      // XP: 10 Base + 5 Combo
      const xp = 10 + comboBonus;
      setEarnedXP((e) => e + xp);

      setFeedback("correct");
      if (soundEnabled) {
        correctSound.seekTo(0);
        correctSound.play();
      }

      // Lern-Fakt anzeigen (30% Chance)
      if (currentItem.fact && Math.random() < 0.3) {
        setShowFact(currentItem.fact);
      }
    } else {
      setCombo(0);
      setFeedback("wrong");
      if (soundEnabled) {
        wrongSound.seekTo(0);
        wrongSound.play();
      }
    }
  };

  const restart = () => {
    setRound(1);
    setScore(0);
    setTimeLeft(TIME_LIMIT);
    setCombo(0);
    setEarnedXP(0);
    const item = getRandomItem();
    setCurrentItem(item);
    setOptions(getRoundOptions(item.category));
    setFeedback(null);
    setShowFact(null);
    setFinished(false);
  };

  const modeLabel =
    mode === "zeit"
      ? "Zeit-Modus"
      : mode === "endlos"
        ? "Endlos-Modus"
        : "Runden-Modus";

  // ── End Screen ────────────────────────────────────────────────────
  if (finished) {
    return (
      <View style={styles.container}>
        <Text style={styles.emojiBig}>🏆</Text>
        <Text style={styles.title}>{modeLabel} beendet!</Text>
        <Text style={styles.scoreText}>{score} Punkte</Text>
        <Text style={styles.xpEarned}>+{earnedXP} XP verdient</Text>
        {isNewHighscore ? (
          <Text style={styles.newHighscore}>🎉 Neuer Highscore!</Text>
        ) : (
          <Text style={styles.highscoreText}>Highscore: {highscore}</Text>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={restart}>
          <Text style={styles.primaryButtonText}>Nochmal spielen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/(tabs)")}
        >
          <Text style={styles.secondaryButtonText}>Zurück zum Menü</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Game Screen ───────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.modeLabel}>{modeLabel}</Text>

      {mode === "runden" && (
        <Text style={styles.progress}>
          Runde {round} / {ROUND_COUNT}
        </Text>
      )}
      {mode === "zeit" && (
        <Text
          style={[styles.progress, timeLeft <= 10 && { color: AppColors.red }]}
        >
          ⏱️ {timeLeft}s
        </Text>
      )}
      {mode === "endlos" && <Text style={styles.progress}>Runde {round}</Text>}

      {/* Score + Combo Row */}
      <View style={styles.scoreRow}>
        <Text style={styles.score}>⭐ {score}</Text>
        {combo >= 3 && (
          <Text style={styles.comboText}>🔥 {combo}× Combo!</Text>
        )}
      </View>
      <Text style={styles.highscoreSmall}>Highscore: {highscore}</Text>

      {/* Item Card */}
      <View style={styles.itemCard}>
        <Text style={styles.itemEmoji}>{currentItem.emoji}</Text>
        <Text style={styles.itemName}>{currentItem.name}</Text>
        {feedback === "correct" && (
          <Text style={styles.feedbackCorrect}>✅ Richtig! +10 XP</Text>
        )}
        {feedback === "wrong" && (
          <Text style={styles.feedbackWrong}>
            ❌ Richtig wäre: {currentItem.category}
          </Text>
        )}
        {showFact && <Text style={styles.factText}>💡 {showFact}</Text>}
      </View>

      {/* Answer Options */}
      <View style={styles.options}>
        {options.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.optionButton,
              { backgroundColor: CATEGORY_COLORS[cat] },
              feedback && cat === currentItem.category && styles.optionCorrect,
            ]}
            onPress={() => handleAnswer(cat)}
            disabled={!!feedback}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === "endlos" && (
        <TouchableOpacity
          style={styles.endButton}
          onPress={() => setFinished(true)}
        >
          <Text style={styles.endButtonText}>Beenden</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.bg,
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: Spacing.lg,
  },
  modeLabel: {
    color: AppColors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  progress: {
    color: AppColors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  score: {
    color: AppColors.green,
    fontSize: FontSize.xl,
    fontWeight: "800",
  },
  comboText: {
    color: AppColors.orange,
    fontSize: FontSize.base,
    fontWeight: "800",
  },
  highscoreSmall: {
    color: AppColors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  itemCard: {
    backgroundColor: AppColors.card,
    borderRadius: Spacing.lg,
    paddingVertical: 36,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    width: "100%",
    marginBottom: Spacing.xl,
  },
  itemEmoji: { fontSize: 72, marginBottom: Spacing.md },
  itemName: {
    color: AppColors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: "700",
  },
  feedbackCorrect: {
    color: AppColors.green,
    marginTop: Spacing.md,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  feedbackWrong: {
    color: AppColors.red,
    marginTop: Spacing.md,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  factText: {
    color: AppColors.yellow,
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    fontWeight: "600",
    textAlign: "center",
    fontStyle: "italic",
  },
  options: { width: "100%", gap: Spacing.md - 2 },
  optionButton: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl - 14,
    alignItems: "center",
  },
  optionCorrect: {
    borderWidth: 2,
    borderColor: AppColors.green,
  },
  optionText: {
    color: AppColors.bg,
    fontSize: 17,
    fontWeight: "800",
  },
  endButton: {
    marginTop: Spacing.lg - 4,
    backgroundColor: AppColors.cardLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.xl,
  },
  endButtonText: {
    color: AppColors.red,
    fontWeight: "700",
    fontSize: FontSize.base,
  },
  // End Screen
  emojiBig: { fontSize: 72, marginBottom: Spacing.sm },
  title: {
    color: AppColors.textPrimary,
    fontSize: FontSize.title - 4,
    fontWeight: "800",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  scoreText: {
    color: AppColors.green,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  xpEarned: {
    color: AppColors.yellow,
    fontSize: FontSize.base,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  highscoreText: {
    color: AppColors.textSecondary,
    fontSize: FontSize.base,
    marginBottom: Spacing.xl,
  },
  newHighscore: {
    color: AppColors.yellow,
    fontSize: FontSize.lg,
    fontWeight: "800",
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    backgroundColor: AppColors.green,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: 40,
    marginBottom: Spacing.md - 2,
  },
  primaryButtonText: {
    color: AppColors.textPrimary,
    fontWeight: "700",
    fontSize: FontSize.lg,
  },
  secondaryButton: {
    backgroundColor: AppColors.cardLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: 40,
  },
  secondaryButtonText: {
    color: AppColors.textSecondary,
    fontWeight: "700",
    fontSize: FontSize.lg,
  },
});
