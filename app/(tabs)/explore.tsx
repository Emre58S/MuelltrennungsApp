// Datei: app/(tabs)/explore.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Category = "Restmüll" | "Biomüll" | "Papier" | "Gelber Sack" | "Glas";
type Mode = "runden" | "zeit" | "endlos";

type Item = { emoji: string; name: string; category: Category };

const ITEMS: Item[] = [
  { emoji: "🍌", name: "Bananenschale", category: "Biomüll" },
  { emoji: "☕", name: "Kaffeesatz", category: "Biomüll" },
  { emoji: "🥚", name: "Eierschale", category: "Biomüll" },
  { emoji: "🍂", name: "Laub", category: "Biomüll" },
  { emoji: "📰", name: "Zeitung", category: "Papier" },
  { emoji: "📦", name: "Sauberer Karton", category: "Papier" },
  { emoji: "✉️", name: "Briefumschlag", category: "Papier" },
  { emoji: "📓", name: "Schreibpapier", category: "Papier" },
  { emoji: "🥤", name: "Joghurtbecher", category: "Gelber Sack" },
  { emoji: "🥫", name: "Konservendose", category: "Gelber Sack" },
  { emoji: "🧴", name: "Shampooflasche (Plastik)", category: "Gelber Sack" },
  { emoji: "🧃", name: "Getränkekarton", category: "Gelber Sack" },
  { emoji: "🛍️", name: "Plastiktüte", category: "Gelber Sack" },
  { emoji: "🍾", name: "Weinflasche", category: "Glas" },
  { emoji: "🫙", name: "Marmeladenglas", category: "Glas" },
  { emoji: "🚬", name: "Zigarettenkippe", category: "Restmüll" },
  { emoji: "🍽️", name: "Kaputtes Geschirr", category: "Restmüll" },
  { emoji: "🩹", name: "Pflaster", category: "Restmüll" },
  { emoji: "💡", name: "Kaputte Glühbirne", category: "Restmüll" },
];

const CATEGORY_COLORS: Record<Category, string> = {
  Restmüll: "#4B5563",
  Biomüll: "#8B5E34",
  Papier: "#3B82F6",
  "Gelber Sack": "#F5C518",
  Glas: "#2ECC71",
};

const ROUND_COUNT = 10;
const TIME_LIMIT = 60;
const HIGHSCORE_PREFIX = "muell_sortieren_highscore_";
const SOUND_KEY = "muell_sortieren_sound_enabled";

function getRandomItem(exclude?: Item): Item {
  let next = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  while (exclude && next.name === exclude.name) {
    next = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  }
  return next;
}

function getRoundOptions(correct: Category): Category[] {
  const all: Category[] = [
    "Restmüll",
    "Biomüll",
    "Papier",
    "Gelber Sack",
    "Glas",
  ];
  const options = new Set<Category>([correct]);
  while (options.size < 4) {
    options.add(all[Math.floor(Math.random() * all.length)]);
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = (params.mode as Mode) || "runden";
  const highscoreKey = HIGHSCORE_PREFIX + mode;

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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(highscoreKey).then((value) => {
      if (value) setHighscore(parseInt(value, 10));
    });
  }, [highscoreKey]);

  useEffect(() => {
    AsyncStorage.getItem(SOUND_KEY).then((value) => {
      if (value !== null) setSoundEnabled(value === "true");
    });
  }, []);

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
    setRound((r) => r + 1);
  }, [round, currentItem, mode]);

  useEffect(() => {
    if (feedback) {
      const timeout = setTimeout(nextRound, 700);
      return () => clearTimeout(timeout);
    }
  }, [feedback, nextRound]);

  useEffect(() => {
    if (finished) {
      if (score > highscore) {
        setHighscore(score);
        setIsNewHighscore(true);
        AsyncStorage.setItem(highscoreKey, score.toString());
      } else {
        setIsNewHighscore(false);
      }
    }
  }, [finished]);

  const handleAnswer = (choice: Category) => {
    if (feedback || finished) return;
    if (choice === currentItem.category) {
      setScore((s) => s + 10);
      setFeedback("correct");
      if (soundEnabled) {
        correctSound.seekTo(0);
        correctSound.play();
      }
    } else {
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
    const item = getRandomItem();
    setCurrentItem(item);
    setOptions(getRoundOptions(item.category));
    setFeedback(null);
    setFinished(false);
  };

  const modeLabel =
    mode === "zeit"
      ? "Zeit-Modus"
      : mode === "endlos"
        ? "Endlos-Modus"
        : "Runden-Modus";

  if (finished) {
    return (
      <View style={styles.container}>
        <Text style={styles.emojiBig}>🏆</Text>
        <Text style={styles.title}>{modeLabel} beendet!</Text>
        <Text style={styles.scoreText}>{score} Punkte</Text>
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

  return (
    <View style={styles.container}>
      <Text style={styles.modeLabel}>{modeLabel}</Text>
      {mode === "runden" && (
        <Text style={styles.progress}>
          Runde {round} / {ROUND_COUNT}
        </Text>
      )}
      {mode === "zeit" && <Text style={styles.progress}>⏱️ {timeLeft}s</Text>}
      {mode === "endlos" && <Text style={styles.progress}>Runde {round}</Text>}
      <Text style={styles.score}>Punkte: {score}</Text>
      <Text style={styles.highscoreSmall}>Highscore: {highscore}</Text>

      <View style={styles.itemCard}>
        <Text style={styles.itemEmoji}>{currentItem.emoji}</Text>
        <Text style={styles.itemName}>{currentItem.name}</Text>
        {feedback === "correct" && (
          <Text style={styles.feedbackCorrect}>✅ Richtig!</Text>
        )}
        {feedback === "wrong" && (
          <Text style={styles.feedbackWrong}>
            ❌ Richtig wäre: {currentItem.category}
          </Text>
        )}
      </View>

      <View style={styles.options}>
        {options.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.optionButton,
              { backgroundColor: CATEGORY_COLORS[cat] },
            ]}
            onPress={() => handleAnswer(cat)}
            disabled={!!feedback}
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
    backgroundColor: "#0B1120",
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 24,
  },
  modeLabel: {
    color: "#9AA7C2",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  progress: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  score: { color: "#2ECC71", fontSize: 18, fontWeight: "800", marginTop: 4 },
  highscoreSmall: {
    color: "#7C8CA8",
    fontSize: 13,
    marginTop: 2,
    marginBottom: 24,
  },
  itemCard: {
    backgroundColor: "#151E32",
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    marginBottom: 32,
  },
  itemEmoji: { fontSize: 72, marginBottom: 16 },
  itemName: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  feedbackCorrect: {
    color: "#2ECC71",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackWrong: {
    color: "#EF4444",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "700",
  },
  options: { width: "100%", gap: 14 },
  optionButton: { borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  optionText: { color: "#0B1120", fontSize: 17, fontWeight: "800" },
  endButton: {
    marginTop: 20,
    backgroundColor: "#1E2A45",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  endButtonText: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
  emojiBig: { fontSize: 72, marginBottom: 12 },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  scoreText: {
    color: "#2ECC71",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  highscoreText: { color: "#9AA7C2", fontSize: 15, marginBottom: 32 },
  newHighscore: {
    color: "#F5C518",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: "#2ECC71",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginBottom: 14,
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  secondaryButton: {
    backgroundColor: "#1E2A45",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  secondaryButtonText: { color: "#9AA7C2", fontWeight: "700", fontSize: 16 },
});
