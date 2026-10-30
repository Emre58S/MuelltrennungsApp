// Datei: components/game/ghost-round.tsx — Ghost-Rennen (1 gegen 1 nacheinander)
// (Route: app/runde.tsx?mode=ghost)
//
// Die Tages-Strecke: 10 Gegenstände, für alle gleich. Dein bester Lauf von
// heute fliegt als durchsichtiger Ghost zur selben Sekunde mit – wie ein
// Geister-Fahrer im Rennspiel. Oben zeigen Punkte und Tauziehen den Live-Stand.
// Noch kein Lauf heute? Dann wirft ein Übungs-Ghost mit. Ist der neue Lauf
// besser, wird er der neue Ghost. Regeln und Wertung: game/ghost.ts.
// Herausforderung: Den eigenen Lauf als Code verschicken (Teilen-Menü); der
// Freund fügt ihn auf dem Startschirm ein und spielt gegen diesen Ghost –
// gleiche Strecke wie am Tag des Laufs. „Revanche“ behält die Herausforderung.
// Tagesbester: Der eigene beste Lauf geht (falls online) an den Server; der
// beste Lauf aller Spieler von heute lässt sich als Ghost wählen.

import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Countdown, PLAYER, ScoreChip, Tug } from "@/components/game/duel-round";
import { createFx, shake } from "@/components/game/fx";
import { SceneCanvas } from "@/components/game/game-round";
import { Banner, FloatingText, type FloatText, ItemCard } from "@/components/game/hud";
import {
  createBus,
  queueBinEvent,
  queueBurst,
  queueThrow,
  setLandHandler,
  setPreview,
  type ThrowSpec,
} from "@/components/game/scene-bus";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { type Item } from "@/constants/items";
import { Radius, Spacing } from "@/constants/theme";
import { getBinByCategory } from "@/game/bins";
import {
  beats,
  type Challenge,
  challengeRun,
  encodeRun,
  GHOST_ITEMS,
  ghostResult,
  type GhostResult,
  type GhostRun,
  type GhostThrow,
  ghostTug,
  makeRun,
  parseRun,
  practiceRun,
  roundRun,
} from "@/game/ghost";
import { readCode, trackFor } from "@/game/ghost-track";
import { itemMaterial } from "@/game/item-mass";
import { BIN_OPENING_Y, computeLayout } from "@/game/layout";
import { aimFromDrag } from "@/game/logic";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { type DayGhost, fetchDayGhost, getPlayer, submitGhostRun } from "@/utils/leaderboard";
import { playMusic } from "@/utils/music";
import { preloadSfx, refreshSfxSetting, sfx, sfxMaterial } from "@/utils/sfx";
import { getGhostBest, saveGhostBest, todayKey } from "@/utils/storage";

import { useLater } from "./round-hooks";

type Phase = "ready" | "countdown" | "play" | "end";

/** Nach dem letzten Wurf: so lange fliegt er noch, dann das Ergebnis (ms). */
const END_MS = 1100;

type EndInfo = { run: GhostRun; result: GhostResult; newBest: boolean };

/** Woher die Herausforderung kommt: Code eines Freundes oder Tagesbester. */
type ChallengeFrom = "code" | "top";

/** Eigenen besten Lauf von heute an den Server (still, falls offline). */
function sendBest(run: GhostRun, sign: string) {
  submitGhostRun(run.day, encodeRun(run, sign), run.correct, run.ms).catch(() => undefined);
}

/** Hält die Herausforderung über „Revanche“ hinweg; jede Runde frisch aufgebaut. */
export function GhostRound({
  code,
  onAgain,
  onExit,
}: {
  /** Code eines Freundes (aus dem Online-Bereich, dort schon geprüft). */
  code?: string;
  onAgain: () => void;
  onExit: () => void;
}) {
  const [challenge, setChallenge] = useState<{ ch: Challenge; from: ChallengeFrom } | null>(() => {
    const found = code ? readCode(code) : null;
    return found && typeof found !== "string" ? { ch: found, from: "code" } : null;
  });
  const [attempt, setAttempt] = useState(0);
  const restart = useCallback(() => setAttempt((a) => a + 1), []);
  const choose = useCallback((ch: Challenge | null, from: ChallengeFrom = "code") => {
    setChallenge(ch ? { ch, from } : null);
    setAttempt((a) => a + 1);
  }, []);
  return (
    <GhostRace
      key={attempt}
      challenge={challenge?.ch ?? null}
      from={challenge?.from ?? "code"}
      onChallenge={choose}
      onAgain={challenge ? restart : onAgain}
      onExit={onExit}
    />
  );
}

function GhostRace({
  challenge,
  from,
  onChallenge,
  onAgain,
  onExit,
}: {
  challenge: Challenge | null;
  from: ChallengeFrom;
  onChallenge: (ch: Challenge | null, from?: ChallengeFrom) => void;
  onAgain: () => void;
  onExit: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { scheme, colors } = useAppTheme();
  const { t, lang, itemName, formatNumber } = useI18n();
  const { reduceMotion } = useAppSettings();
  const fx = useRef(createFx());
  const bus = useRef(createBus());
  useEffect(() => {
    fx.current.calm = reduceMotion;
  }, [reduceMotion]);
  const [today] = useState(todayKey);
  const day = challenge?.day ?? today;
  const { scene, bins, queue, correctBins, sign } = useMemo(() => trackFor(day), [day]);
  const binOf = useCallback((it: Item) => bins.findIndex((b) => b.category === it.category), [bins]);
  const practice = useMemo(() => practiceRun(day, correctBins, bins.length), [day, correctBins, bins.length]);
  const friendRun = useMemo(
    () => (challenge ? challengeRun(challenge, correctBins, bins.length) : null),
    [challenge, correctBins, bins.length],
  );
  const { width: screenW, height: screenH } = useWindowDimensions();
  const layout = useMemo(() => computeLayout(screenW, screenH, bins.length), [screenW, screenH, bins.length]);
  const later = useLater();

  // Bester eigener Lauf von heute (oder null → Übungs-Ghost)
  const [best, setBest] = useState<GhostRun | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    getGhostBest()
      .then((raw) => setBest(parseRun(raw, today)))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [today]);
  // Tagesbester (nur beim eigenen Rennen): erst den eigenen Bestlauf senden, dann laden
  // Treffer und Zeit aus dem geprüften Code (run), nicht aus den Server-Zahlen
  const [top, setTop] = useState<{ ch: Challenge; info: DayGhost; run: GhostRun } | null>(null);
  useEffect(() => {
    if (challenge) return;
    let alive = true;
    getGhostBest()
      .then(async (raw) => {
        const own = parseRun(raw, today);
        if (own) await submitGhostRun(today, encodeRun(own, trackFor(today).sign), own.correct, own.ms);
        const info = await fetchDayGhost(today);
        const ch = info ? readCode(info.code) : null;
        if (!alive || !info || !ch || typeof ch === "string" || ch.day !== today) return;
        const { correctBins, bins: trackBins } = trackFor(today);
        const run = challengeRun(ch, correctBins, trackBins.length);
        if (run) setTop({ ch: { ...ch, name: info.name }, info, run });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [challenge, today]);
  const ghost = friendRun ?? best ?? practice;
  const friendName = challenge ? (challenge.name ?? t("ghost.friend")) : null;
  const ghostName = friendName ?? (best ? t("ghost.name") : t("ghost.practiceName"));

  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const goPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);
  const [count, setCount] = useState(3);
  const [index, setIndex] = useState(0);
  const [item, setItem] = useState<Item | null>(null);
  const [me, setMe] = useState(0);
  const [ghostScore, setGhostScore] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  /** Zeitpunkt des letzten eigenen Wurfs – die Uhr bleibt dort stehen. */
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const startRef = useRef(0);
  const myThrows = useRef<GhostThrow[]>([]);
  const ids = useRef(0);
  /** Eigene Würfe und Ghost-Würfe in der Luft (für die Landung). */
  const flying = useRef(new Map<number, { hit: boolean; bin: number; item: Item; ghost: boolean }>());
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);
  const [end, setEnd] = useState<EndInfo | null>(null);

  useEffect(() => {
    refreshSfxSetting();
    preloadSfx();
    playMusic("game");
  }, []);

  const showBanner = useCallback(
    (text: string, ms = 1600) => {
      const id = ++ids.current;
      setBanner({ id, text });
      AccessibilityInfo.announceForAccessibility(text.replace(/[^\p{L}\p{N}\s:,.!–-]/gu, "").trim());
      later(() => setBanner((b) => (b?.id === id ? null : b)), ms);
    },
    [later],
  );

  const showItem = (i: number) => {
    const next = queue[i] ?? null;
    setIndex(i);
    setItem(next);
    setPreview(bus.current, next);
  };

  /** Wurf des Ghosts – genau zu seiner Zeit, nur solange das Rennen läuft. */
  const ghostThrow = (g: GhostThrow) => {
    if (phaseRef.current !== "play") return;
    const it = queue[g.i];
    if (!it) return;
    const spec: ThrowSpec = { id: ++ids.current, item: it, binIndex: g.bin, hit: g.correct, perfect: false, glow: false, ghost: true };
    flying.current.set(spec.id, { hit: g.correct, bin: g.bin, item: it, ghost: true });
    queueThrow(bus.current, spec);
    if (g.correct) setGhostScore((n) => n + 1);
  };

  const start = () => {
    if (phaseRef.current !== "ready") return;
    goPhase("countdown");
    setCount(3);
    sfx("tick");
    later(() => {
      setCount(2);
      sfx("tick");
    }, 700);
    later(() => {
      setCount(1);
      sfx("tick");
    }, 1400);
    later(() => {
      goPhase("play");
      sfx("comboUp");
      const now = Date.now();
      startRef.current = now;
      setStartedAt(now);
      showItem(0);
      for (const g of ghost.throws) later(() => ghostThrow(g), g.ms);
    }, 2100);
  };

  const finish = () => {
    const run = makeRun(day, myThrows.current);
    // Nur Läufe auf der heutigen Strecke können der eigene Ghost werden
    const newBest = day === today && (!best || beats(run, best));
    if (newBest) {
      saveGhostBest(JSON.stringify(run)).catch(() => undefined);
      sendBest(run, sign);
    }
    // Gegen einen Freund auf 0,1 s genau werten – wie dessen Code (gleicher Sieger auf beiden Handys)
    setEnd({ run, result: friendRun ? ghostResult(roundRun(run), ghost) : ghostResult(run, ghost), newBest });
    setItem(null);
    setPreview(bus.current, null);
    goPhase("end");
    sfx("end");
    playMusic("menu");
  };

  /** Richtung zu jeder Tonne vom Startpunkt des Daumens aus (wie im Duell). */
  const anglesFrom = (x: number, y: number) =>
    layout.binTops.map((b) => (Math.atan2(b.x - x, y - b.y) * 180) / Math.PI);

  const handleThrow = (x0: number, y0: number, dx: number, dy: number, vy: number) => {
    if (phaseRef.current !== "play" || !item) return;
    const aim = aimFromDrag(dx, dy, anglesFrom(x0, y0));
    if (!aim) return;
    const current = item;
    const correct = bins[aim.binIndex].category === current.category;
    const now = Date.now();
    myThrows.current.push({ i: index, ms: now - startRef.current, bin: aim.binIndex, correct });
    const spec: ThrowSpec = {
      id: ++ids.current,
      item: current,
      binIndex: aim.binIndex,
      hit: correct,
      perfect: false,
      glow: false,
      power: Math.min(Math.max(0.8 + -vy / 5000, 0.8), 1.3),
    };
    flying.current.set(spec.id, { hit: correct, bin: aim.binIndex, item: current, ghost: false });
    queueThrow(bus.current, spec);
    sfx("throw");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (correct) {
      setMe((n) => n + 1);
      const top = layout.binTops[aim.binIndex];
      setFloats((f) => [...f.slice(-5), { id: ++ids.current, x: top.x, y: top.y, text: "+1", color: PLAYER[0].color }]);
    } else {
      // Lernmoment: sagen, wohin es gehört, richtige Tonne hüpft – weiter geht's
      const right = binOf(current);
      if (right >= 0) later(() => queueBinEvent(bus.current, right, "peek"), 250);
      const bin = getBinByCategory(current.category);
      if (bin) showBanner(t("duel.belongsIn", { item: itemName(current), bin: t(bin.labelKey) }), 1500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
    if (index + 1 < GHOST_ITEMS) showItem(index + 1);
    else {
      setItem(null);
      setPreview(bus.current, null);
      phaseRef.current = "end";
      // Fertig: Uhr anhalten, beim Ghost gleich seinen Endstand zeigen (wie im Ergebnis)
      setStoppedAt(now);
      setGhostScore(ghost.correct);
      later(finish, END_MS);
    }
  };
  const throwRef = useRef(handleThrow);
  useLayoutEffect(() => {
    throwRef.current = handleThrow;
  });

  // Landung: eigene Treffer jubeln, der Ghost bleibt leise (Tonne wackelt nur)
  useEffect(() => {
    const b = bus.current;
    setLandHandler(b, (id) => {
      const thrown = flying.current.get(id);
      if (!thrown) return;
      flying.current.delete(id);
      const { hit, bin, item: it, ghost: isGhost } = thrown;
      if (isGhost) {
        if (hit) queueBinEvent(b, bin, "bump");
        return;
      }
      queueBinEvent(b, bin, hit ? "hit" : "reject");
      if (hit) {
        // Landeklang je Material (Glas klirrt, Dose scheppert …)
        sfxMaterial(itemMaterial(it));
        sfx("perfect");
        shake(fx.current, 0.02);
        queueBurst(b, {
          id: ++ids.current,
          x: layout.bins[bin].x,
          y: BIN_OPENING_Y + 0.15,
          z: layout.bins[bin].z + 0.1,
          colors: [PLAYER[0].color, "#FFFFFF", "#FFD54A"],
          count: 22,
          power: 1.1,
          ring: true,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      } else sfx("plop");
    });
    return () => setLandHandler(b, () => undefined);
  }, [layout]);

  const askExit = () => {
    if (phaseRef.current === "end" || phaseRef.current === "ready") {
      onExit();
      return;
    }
    Alert.alert(t("ghost.quit.title"), t("ghost.quit.message"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("duel.quit.confirm"), style: "destructive", onPress: onExit },
    ]);
  };

  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(6)
        .onEnd((e) =>
          throwRef.current(
            e.absoluteX - e.translationX,
            e.absoluteY - e.translationY,
            e.translationX,
            e.translationY,
            e.velocityY,
          ),
        ),
    [],
  );
  /* eslint-enable react-hooks/refs */

  const ready = screenW > 0 && screenH > 0;
  const itemTagTop = layout.item.screen.y + screenW * 0.15 + 4;
  const onFloatDone = useCallback((id: number) => setFloats((f) => f.filter((x) => x.id !== id)), []);
  const sec = (ms: number) => `${formatNumber(Math.round(ms / 100) / 10)} s`;

  return (
    <View style={[styles.root, { width: screenW, height: screenH }]}>
      {ready && (
        <SceneCanvas
          width={screenW}
          height={screenH}
          layout={layout}
          bins={bins}
          scheme={scheme}
          fever={false}
          fx={fx}
          bus={bus}
          calm={reduceMotion}
          lang={lang}
          scene={scene}
          guide={false}
          warmItems={queue}
        />
      )}

      <GestureDetector gesture={gesture}>
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents={phase === "play" ? "auto" : "none"}
          accessible
          accessibilityLabel={t("ghost.swipe")}
        />
      </GestureDetector>

      {floats.map((f) => (
        <FloatingText key={f.id} item={f} onDone={onFloatDone} />
      ))}

      {/* Oben: du gegen den Ghost, Zeit und Tauziehen */}
      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + Spacing.sm }]}>
        <View pointerEvents="box-none" style={styles.topRow}>
          <IconButton icon="x" label={t("common.close")} onPress={askExit} />
          <ScoreChip p={0} points={me} hot={false} label={t("ghost.me")} calm={reduceMotion} />
          <View style={styles.counter}>
            <AppText variant="label" color="#FFFFFF" style={styles.shadow}>
              {phase === "play" || phase === "end" ? `${Math.min(index + 1, GHOST_ITEMS)}/${GHOST_ITEMS}` : "VS"}
            </AppText>
            {phase === "play" && <Clock since={startedAt} stop={stoppedAt} format={sec} />}
          </View>
          <ScoreChip p={1} points={ghostScore} hot={false} label={`👻 ${ghostName}`} calm={reduceMotion} />
        </View>
        <Tug value={ghostTug(me, ghostScore)} calm={reduceMotion} />
      </View>

      {banner && (
        <View pointerEvents="none" style={[styles.bannerWrap, { top: insets.top + 120 }]}>
          <Banner key={banner.id} text={banner.text} />
        </View>
      )}

      {item && phase === "play" && (
        <View pointerEvents="none" style={[styles.overlayRow, { top: itemTagTop }]}>
          <ItemCard key={`${index}-${item.name}`} item={item} showHint={false} />
        </View>
      )}

      {phase === "ready" && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
          style={[styles.cover, { paddingTop: insets.top + 90, paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={[styles.card, { backgroundColor: colors.surface }]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <AppText variant="title" style={styles.center}>
              👻 {t("ghost.title")}
            </AppText>
            <AppText variant="body" tone="textSecondary" style={styles.center}>
              {friendRun ? t("ghost.rulesFriend", { name: ghostName }) : t("ghost.rules")}
            </AppText>
            <View style={[styles.pill, { backgroundColor: PLAYER[1].color }]}>
              <AppText variant="label" color={PLAYER[1].on} style={styles.center}>
                {friendRun
                  ? t(from === "top" ? "ghost.top.info" : "ghost.challenge", {
                      name: ghostName,
                      correct: friendRun.correct,
                      total: GHOST_ITEMS,
                      time: sec(friendRun.ms),
                    })
                  : best
                    ? t("ghost.best", { correct: best.correct, total: GHOST_ITEMS, time: sec(best.ms) })
                    : t("ghost.practice")}
              </AppText>
            </View>
            {!friendRun && top && (
              <AppText variant="caption" tone="textSecondary" style={styles.center}>
                {top.info.isMe
                  ? t("ghost.top.me")
                  : t("ghost.top.info", {
                      name: top.info.name,
                      correct: top.run.correct,
                      total: GHOST_ITEMS,
                      time: sec(top.run.ms),
                    })}
              </AppText>
            )}
            {!friendRun && (
              <AppText variant="caption" tone="textSecondary" style={styles.center}>
                {t("ghost.codeWhere")}
              </AppText>
            )}
            {friendRun && day !== today && (
              <AppText variant="caption" tone="textSecondary" style={styles.center}>
                {t("ghost.trackFrom", { date: day.split("-").reverse().join(".") })}
              </AppText>
            )}
            <Button title={t("duel.start")} icon="zap" size="lg" disabled={!loaded} onPress={start} />
            {friendRun ? (
              <Button title={t("ghost.code.mine")} variant="secondary" onPress={() => onChallenge(null)} />
            ) : (
              top &&
              !top.info.isMe && (
                <Button
                  title={t("ghost.top.play", { name: top.info.name })}
                  icon="award"
                  variant="secondary"
                  onPress={() => onChallenge(top.ch, "top")}
                />
              )
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {phase === "countdown" && (
        <View pointerEvents="none" style={styles.countWrap}>
          <Countdown key={count} n={count} calm={reduceMotion} />
        </View>
      )}

      {phase === "end" && end && (
        <GhostEnd
          end={end}
          ghost={ghost}
          ghostName={ghostName}
          practice={!friendRun && !best}
          friend={friendRun ? ghostName : null}
          canSendBack={from === "code"}
          first={!best}
          track={sign}
          queue={queue}
          sec={sec}
          onAgain={onAgain}
          onMenu={onExit}
        />
      )}
    </View>
  );
}

/** Laufende Zeit – eigene kleine Anzeige, damit nicht die ganze Runde neu zeichnet. */
function Clock({ since, stop, format }: { since: number; stop: number | null; format: (ms: number) => string }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    if (stop !== null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [stop]);
  return (
    <AppText variant="caption" color="#FFFFFF" style={styles.shadow}>
      {format(Math.max(0, (stop ?? now) - since))}
    </AppText>
  );
}

function GhostEnd({
  end,
  ghost,
  ghostName,
  practice,
  friend,
  canSendBack,
  first,
  track,
  queue,
  sec,
  onAgain,
  onMenu,
}: {
  end: EndInfo;
  ghost: GhostRun;
  ghostName: string;
  practice: boolean;
  /** Name des Freundes bei einer Herausforderung, sonst null. */
  friend: string | null;
  /** Lauf an den Gegner zurückschicken? (nur bei Code eines Freundes) */
  canSendBack: boolean;
  /** Noch kein eigener Ghost von heute (erster Lauf wird gespeichert). */
  first: boolean;
  /** Strecken-Kennung für den Code (trackSign). */
  track: string;
  queue: Item[];
  sec: (ms: number) => string;
  onAgain: () => void;
  onMenu: () => void;
}) {
  const { t, itemName } = useI18n();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { run, result, newBest } = end;
  const title = friend
    ? t(result === "win" ? "ghost.winFriend" : result === "lose" ? "ghost.loseFriend" : "ghost.drawFriend", {
        name: friend,
      })
    : result === "win"
      ? t(practice ? "ghost.winPractice" : "ghost.win")
      : result === "lose"
        ? t("ghost.lose")
        : t("ghost.draw");
  // Eigenen Lauf als Code verschicken (bei einer Herausforderung = zurückschicken)
  const share = () => {
    getPlayer()
      .then((p) =>
        Share.share({
          message: t("ghost.shareText", {
            correct: run.correct,
            total: GHOST_ITEMS,
            time: sec(run.ms),
            code: encodeRun(run, track, p.named ? p.name : null),
          }),
        }),
      )
      .catch(() => undefined);
  };
  const learn = run.throws
    .filter((x) => !x.correct)
    .map((x) => queue[x.i])
    .filter((i): i is Item => !!i);
  const rows: [string, string, string][] = [
    [t("ghost.row.correct"), `${run.correct}/${GHOST_ITEMS}`, `${ghost.correct}/${GHOST_ITEMS}`],
    [t("ghost.row.time"), sec(run.ms), sec(ghost.ms)],
  ];
  const heads = [t("ghost.me"), `👻 ${ghostName}`];
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${title} ${run.correct} : ${ghost.correct}`);
  }, [title, run.correct, ghost.correct]);

  return (
    <View style={[styles.endRoot, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.endContent,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <AppText variant="display" style={styles.center}>
          {result === "win" ? "🏆" : result === "lose" ? "👻" : "🤝"}
        </AppText>
        <AppText variant="title" style={styles.center}>
          {title}
        </AppText>
        {newBest && (
          <View style={[styles.highlight, { backgroundColor: colors.goldSoft }]}>
            <AppText variant="body" color={colors.onGoldSoft} style={styles.center}>
              ⭐ {t(first ? "ghost.firstSaved" : "ghost.newBest")}
            </AppText>
          </View>
        )}

        <View style={[styles.table, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.tableRow}>
            <View style={styles.tableLabel} />
            {heads.map((h, p) => (
              <View key={h} style={[styles.tableHead, { backgroundColor: PLAYER[p].color }]}>
                <AppText variant="label" color={PLAYER[p].on} numberOfLines={1}>
                  {h}
                </AppText>
              </View>
            ))}
          </View>
          {rows.map(([label, l, r]) => (
            <View
              key={label}
              style={[styles.tableRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              accessible
              accessibilityLabel={`${label}: ${heads[0]} ${l}, ${heads[1]} ${r}`}
            >
              <AppText variant="body" tone="textSecondary" style={styles.tableLabel}>
                {label}
              </AppText>
              <AppText variant="bodyStrong" style={styles.tableCell}>
                {l}
              </AppText>
              <AppText variant="bodyStrong" style={styles.tableCell}>
                {r}
              </AppText>
            </View>
          ))}
        </View>

        {learn.length > 0 && (
          <View style={[styles.learn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="label">{t("duel.learn")}</AppText>
            {learn.map((it) => {
              const bin = getBinByCategory(it.category);
              return (
                <View key={it.name} style={styles.learnRow}>
                  <AppText variant="body">{it.emoji}</AppText>
                  <AppText variant="body" style={styles.flex}>
                    {itemName(it)}
                  </AppText>
                  {bin && (
                    <View style={[styles.binTag, { backgroundColor: bin.colorLight }]}>
                      <AppText variant="caption" color="#1A1A1A">
                        {t(bin.labelKey)}
                      </AppText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Button
          title={friend && canSendBack ? t("ghost.shareBack", { name: friend }) : t("ghost.share")}
          icon="share-2"
          size="lg"
          onPress={share}
        />
        <Button
          title={friend ? t("ghost.rematch") : t("ghost.again")}
          icon="refresh-cw"
          variant="secondary"
          onPress={onAgain}
        />
        <Button title={t("duel.menu")} variant="secondary" onPress={onMenu} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: "center" },
  shadow: { textAlign: "center", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 },
  top: { position: "absolute", top: 0, left: Spacing.md, right: Spacing.md, gap: Spacing.sm },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  counter: { minWidth: 52, alignItems: "center" },
  bannerWrap: { position: "absolute", left: 0, right: 0 },
  overlayRow: { position: "absolute", left: Spacing.md, right: Spacing.md, alignItems: "center", gap: Spacing.xs },
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.md,
  },
  card: { borderRadius: Radius.xxl, padding: Spacing.lg, gap: Spacing.md },
  cardScroll: { flexGrow: 0, borderRadius: Radius.xxl },
  pill: { borderRadius: Radius.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  row: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" },
  countWrap: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  endRoot: { ...StyleSheet.absoluteFill },
  endContent: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  table: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.sm },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, gap: Spacing.sm },
  tableLabel: { flex: 1.2 },
  tableHead: { flex: 1, alignItems: "center", borderRadius: Radius.sm, paddingVertical: Spacing.xs },
  tableCell: { flex: 1, textAlign: "center" },
  highlight: { borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.xs },
  learn: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, gap: Spacing.sm },
  learnRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  binTag: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
});
