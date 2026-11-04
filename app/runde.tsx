// Datei: app/runde.tsx — Spielrunde (Route)
//
// Liest Modus/Tagesaufgabe aus den Parametern, lädt die XP und baut pro
// Runde eine frische GameRound auf (siehe components/game/game-round.tsx).
// mode=trick&level=N: ein Trickwurf-Level (components/game/trick-round.tsx),
// mode=trick&daily=1: der Tages-Trick.
// mode=parcours&level=N: Parcours-Runde – sortieren und tricksen (components/game/parcours-round.tsx).
// mode=ghost: Ghost-Rennen gegen den eigenen besten Lauf von heute.
// mode=sprint: Zeit-Sprint (30 s) gegen den eigenen besten Sprint von heute.
// mode=survival: Survival (ohne Fehler, immer schneller) – gleiche Runde, andere Art.
// station=2-3: eine Station der Kampagne (game/campaign.ts).
// bins=papier,rest: Freies Spiel mit genau diesen Tonnen (aus dem Pfad).
import { DuelRound } from "@/components/game/duel-round";
import { GameRound } from "@/components/game/game-round";
import { GhostRound } from "@/components/game/ghost-round";
import { ParcoursRound } from "@/components/game/parcours-round";
import { SprintRound } from "@/components/game/sprint-round";
import { TrickRound } from "@/components/game/trick-round";
import { getStation, nextStation, parseFreeBins, stationMode } from "@/game/campaign";
import { dailyTrick, PARCOURS, randomTrick, TRICK_LEVELS } from "@/game/trick-levels";
import { type GameMode } from "@/constants/modes";
import { useAppTheme } from "@/providers/app-settings";
import {
  flushThrowRecords,
  getLevelFromXP,
  getNumber,
  StorageKeys,
  todayKey,
} from "@/utils/storage";
import { cleanFriendCode } from "@/utils/leaderboard";
import { setAudioModeAsync } from "expo-audio";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { playMusic, refreshMusicSetting } from "@/utils/music";
import { perfMark } from "@/utils/perf-marks";
import { Profiler, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function GameScreen() {
  const {
    mode: rawMode,
    daily: rawDaily,
    level: rawLevel,
    code: rawCode,
    station: rawStation,
    bins: rawBins,
    random: rawRandom,
    friend: rawFriend,
  } = useLocalSearchParams<{
    random?: string;
    friend?: string;
    mode?: string;
    daily?: string;
    level?: string;
    code?: string;
    station?: string;
    bins?: string;
  }>();
  const freeBins = useMemo(() => parseFreeBins(rawBins), [rawBins]);
  const isTrick = rawMode === "trick";
  const isParcours = rawMode === "parcours";
  const isDuel = rawMode === "duel";
  const isGhost = rawMode === "ghost";
  const isSurvival = rawMode === "survival";
  const isSprint = rawMode === "sprint" || isSurvival;
  const [trickLevel, setTrickLevel] = useState(() => Number(rawLevel) || 1);
  // Zufalls-Trick: bei „Weiter“ jedes Mal ein neuer (geprüft lösbarer) Trick
  const isRandom = isTrick && rawRandom === "1";
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 1e9));
  // Tagesaufgabe: feste Items für alle, Ablauf wie „Üben“, endet nach 10 Würfen
  const daily = rawDaily === "1";
  // Zielwurf („aim“) ist ausgeblendet – alte Links landen im Üben
  const mode: GameMode = daily
    ? "endless"
    : rawMode === "survival" || rawMode === "time"
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
  // Kampagne: „Nächste Station“ wechselt hier, ohne die Seite neu zu öffnen
  const [stationId, setStationId] = useState(rawStation);
  const station = stationId ? getStation(stationId) : undefined;
  const nextId = station ? nextStation(station.id)?.id : undefined;
  const nextStationRound = () => {
    if (!nextId) return;
    setStationId(nextId);
    setXp(null);
    loadXp();
    setRound((r) => r + 1);
    playMusic("game");
  };
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
    if (isRandom) setRandomSeed(Math.floor(Math.random() * 1e9));
    else setTrickLevel((n) => Math.min(n + 1, TRICK_LEVELS.length));
    setRound((r) => r + 1);
  }, [isRandom]);
  const retryTrick = useCallback(() => {
    setRound((r) => r + 1);
    playMusic("game");
  }, []);
  // Ladeanzeige erst nach kurzer Zeit – meist ist alles sofort da, dann blitzt nichts
  const loading = !isTrick && !isParcours && !isDuel && !isGhost && !isSprint && (xp === null || level === null);
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
  const trick = isRandom
    ? randomTrick(randomSeed)
    : isTrick && daily
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
            key={`${round}-trick-${isRandom ? randomSeed : daily ? trickDay : trickLevel}`}
            level={trick}
            daily={daily}
            random={isRandom}
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
      {isParcours && (
        <ParcoursRound
          key={`${round}-parcours-${rawLevel}`}
          level={PARCOURS.find((p) => p.id === Number(rawLevel)) ?? PARCOURS[0]}
          friend={rawFriend ? (cleanFriendCode(rawFriend) ?? undefined) : undefined}
          onExit={goBack}
          onRetry={retryTrick}
        />
      )}
      {isDuel && <DuelRound key={`${round}-duel`} onAgain={retryTrick} onExit={goBack} />}
      {isSprint && (
        <SprintRound
          key={`${round}-${rawMode}`}
          kind={isSurvival ? "survival" : "sprint"}
          friend={rawFriend ? (cleanFriendCode(rawFriend) ?? undefined) : undefined}
          onAgain={retryTrick}
          onExit={goBack}
        />
      )}
      {isGhost && (
        <GhostRound
          key={`${round}-ghost`}
          // Code eines Freundes nur für die erste Runde (danach eigene Wahl)
          code={round === 0 ? rawCode : undefined}
          onAgain={retryTrick}
          onExit={goBack}
        />
      )}
      {!isTrick && !isParcours && !isDuel && !isGhost && !isSprint && xp !== null && level !== null && (
        // Profiler: Render-Dauer der Runde für die Hänger-Messung (nur Entwicklung)
        <Profiler id="runde" onRender={onRender}>
          <GameRound
            key={`${round}-${level}-${mode}-${daily}-${station?.id}`}
            mode={station ? stationMode(station) : mode}
            daily={daily}
            station={station}
            freeBins={freeBins}
            onNext={nextId ? nextStationRound : undefined}
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
