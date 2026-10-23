// Datei: app/(tabs)/runde.tsx — Spielrunde (Route)
//
// Liest Modus/Tagesaufgabe aus den Parametern, lädt die XP und baut pro
// Runde eine frische GameRound auf (siehe components/game/game-round.tsx).
// mode=trick&level=N: ein Trickwurf-Level (components/game/trick-round.tsx).
import { GameRound } from "@/components/game/game-round";
import { TrickRound } from "@/components/game/trick-round";
import { TRICK_LEVELS } from "@/game/trick-levels";
import { type GameMode } from "@/constants/modes";
import { useAppTheme } from "@/providers/app-settings";
import {
  flushThrowRecords,
  getLevelFromXP,
  getNumber,
  StorageKeys,
} from "@/utils/storage";
import { setAudioModeAsync } from "expo-audio";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { perfMark } from "@/utils/perf-marks";
import { Profiler, useCallback, useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function GameScreen() {
  const {
    mode: rawMode,
    daily: rawDaily,
    level: rawLevel,
  } = useLocalSearchParams<{
    mode?: string;
    daily?: string;
    level?: string;
  }>();
  const isTrick = rawMode === "trick";
  const [trickLevel, setTrickLevel] = useState(() => Number(rawLevel) || 1);
  // Tagesaufgabe: feste Items für alle, Ablauf wie „Üben“, endet nach 10 Würfen
  const daily = rawDaily === "1";
  const mode: GameMode = daily
    ? "endless"
    : rawMode === "survival" || rawMode === "time" || rawMode === "aim"
      ? rawMode
      : "endless";
  const router = useRouter();
  const { colors } = useAppTheme();
  const [xp, setXp] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  // Erst gesammelte Würfe schreiben, dann XP lesen (sonst veraltetes Level).
  const loadXp = useCallback(() => {
    flushThrowRecords()
      .then(() => getNumber(StorageKeys.TOTAL_XP))
      .then(setXp)
      .catch(() => setXp(0));
  }, []);
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);
  // Beim Verlassen abbauen; beim erneuten Öffnen eine neue Runde erzeugen.
  useFocusEffect(
    useCallback(() => {
      setRound((r) => r + 1);
      loadXp();
      return () => {
        setXp(null);
      };
    }, [loadXp]),
  );
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);
  const playAgain = useCallback(() => {
    setXp(null);
    loadXp();
    setRound((r) => r + 1);
  }, [loadXp]);
  const level = xp !== null ? getLevelFromXP(xp) : null;
  const nextTrick = useCallback(() => {
    setTrickLevel((n) => Math.min(n + 1, TRICK_LEVELS.length));
    setRound((r) => r + 1);
  }, []);
  const retryTrick = useCallback(() => setRound((r) => r + 1), []);
  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: colors.bg }]}
    >
      {isTrick && (
        <Profiler id="runde" onRender={onRender}>
          <TrickRound
            key={`${round}-trick-${trickLevel}`}
            levelId={trickLevel}
            onExit={goBack}
            onNext={nextTrick}
            onRetry={retryTrick}
          />
        </Profiler>
      )}
      {!isTrick && xp !== null && level !== null && (
        // Profiler: Render-Dauer der Runde für die Hänger-Messung (nur Entwicklung)
        <Profiler id="runde" onRender={onRender}>
          <GameRound
            key={`${round}-${level}-${mode}-${daily}`}
            mode={mode}
            daily={daily}
            level={level}
            startXp={xp}
            onAgain={playAgain}
            onExit={goBack}
          />
        </Profiler>
      )}
    </GestureHandlerRootView>
  );
}

function onRender(_id: string, phase: string, duration: number) {
  perfMark(`render(${phase})`, duration);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
