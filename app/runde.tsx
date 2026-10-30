// Datei: app/runde.tsx — Spielrunde (Route)
//
// Liest Modus/Tagesaufgabe aus den Parametern, lädt die XP und baut pro
// Runde eine frische GameRound auf (siehe components/game/game-round.tsx).
// mode=trick&level=N: ein Trickwurf-Level (components/game/trick-round.tsx),
// mode=trick&daily=1: der Tages-Trick.
// mode=ghost: Ghost-Rennen gegen den eigenen besten Lauf von heute.
import { DuelRound } from "@/components/game/duel-round";
import { GameRound } from "@/components/game/game-round";
import { GhostRound } from "@/components/game/ghost-round";
import { TrickRound } from "@/components/game/trick-round";
import { dailyTrick, TRICK_LEVELS } from "@/game/trick-levels";
import { type GameMode } from "@/constants/modes";
import { useAppTheme } from "@/providers/app-settings";
import {
  flushThrowRecords,
  getLevelFromXP,
  getNumber,
  StorageKeys,
  todayKey,
} from "@/utils/storage";
import { setAudioModeAsync } from "expo-audio";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { playMusic, refreshMusicSetting } from "@/utils/music";
import { perfMark } from "@/utils/perf-marks";
import { Profiler, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function GameScreen() {
  const {
    mode: rawMode,
    daily: rawDaily,
    level: rawLevel,
    code: rawCode,
  } = useLocalSearchParams<{
    mode?: string;
    daily?: string;
    level?: string;
    code?: string;
  }>();
  const isTrick = rawMode === "trick";
  const isDuel = rawMode === "duel";
  const isGhost = rawMode === "ghost";
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
      // Lebendigere Runden-Musik
      refreshMusicSetting().then(() => playMusic("game"));
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
    // Am Ende lief die Menü-Musik – die neue Runde startet wieder mit Spielmusik
    playMusic("game");
  }, [loadXp]);
  const level = xp !== null ? getLevelFromXP(xp) : null;
  const nextTrick = useCallback(() => {
    setTrickLevel((n) => Math.min(n + 1, TRICK_LEVELS.length));
    setRound((r) => r + 1);
  }, []);
  const retryTrick = useCallback(() => {
    setRound((r) => r + 1);
    playMusic("game");
  }, []);
  // Ladeanzeige erst nach kurzer Zeit – meist ist alles sofort da, dann blitzt nichts
  const loading = !isTrick && !isDuel && !isGhost && (xp === null || level === null);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setSlow(true), 250);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [loading]);

  // Tages-Trick (für alle gleich) oder ein Level der Liste
  const [trickDay] = useState(todayKey);
  const trick = isTrick && daily
    ? dailyTrick(trickDay)
    : (TRICK_LEVELS.find((l) => l.id === trickLevel) ?? TRICK_LEVELS[0]);
  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: colors.bg }]}
    >
      {/* Wischen im Spiel darf nicht als „Zurück“-Geste vom Rand zählen */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      {isTrick && (
        <Profiler id="runde" onRender={onRender}>
          <TrickRound
            key={`${round}-trick-${daily ? trickDay : trickLevel}`}
            level={trick}
            daily={daily}
            onExit={goBack}
            onNext={nextTrick}
            onRetry={retryTrick}
          />
        </Profiler>
      )}
      {loading && slow && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      {isDuel && <DuelRound key={`${round}-duel`} onAgain={retryTrick} onExit={goBack} />}
      {isGhost && (
        <GhostRound
          key={`${round}-ghost`}
          // Code eines Freundes nur für die erste Runde (danach eigene Wahl)
          code={round === 0 ? rawCode : undefined}
          onAgain={retryTrick}
          onExit={goBack}
        />
      )}
      {!isTrick && !isDuel && !isGhost && xp !== null && level !== null && (
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
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
