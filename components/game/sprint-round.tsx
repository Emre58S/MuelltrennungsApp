// Datei: components/game/sprint-round.tsx — Zeit-Sprint (R4a) und Survival (R4b)
// (Route: app/runde.tsx?mode=sprint bzw. mode=survival)
//
// Survival (kind="survival"): kein Fehler erlaubt, jeder Gegenstand hat nur
// kurz Zeit (Balken unter dem Gegenstand), das Tempo steigt bis zum
// Höchsttempo. Falsch oder zu langsam = Runde vorbei; oben läuft die Zeit
// hoch. Regeln: game/survival.ts. Sonst alles wie beim Zeit-Sprint:
//
// Zufallsgegner (R4d): Jeder fertige Lauf geht als Code an den Server
// (supabase/online.sql). Gibt es heute einen Lauf eines anderen Spielers mit
// ähnlich vielen Treffern, fliegt er als Gegner mit (umschaltbar auf den eigenen
// Ghost). Ohne Netz oder Server: wie bisher gegen den eigenen Ghost.
//
// 30 Sekunden, so viele richtig wie möglich. Die Gegenstände kommen heute für
// alle in derselben Reihenfolge; dein bester Sprint von heute fliegt als
// durchsichtiger Ghost zur selben Sekunde mit (noch keiner → Übungs-Ghost).
// Oben zeigen Punkte, Restzeit und Tauziehen den Live-Stand. Mehr richtig
// gewinnt. Regeln und Wertung: game/sprint.ts. Aufbau wie das Ghost-Rennen
// (ghost-round.tsx); Zufallsgegner, Freunde und Rangliste folgen (R4d–f).

import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  ScrollView,
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
import { type GhostRun, type GhostThrow, ghostTug } from "@/game/ghost";
import { sprintTrackFor } from "@/game/ghost-track";
import { itemMaterial } from "@/game/item-mass";
import { BIN_OPENING_Y, computeLayout } from "@/game/layout";
import { aimFromDrag } from "@/game/logic";
import {
  decodeSprint,
  encodeSprint,
  parseSprint,
  practiceSprint,
  SPRINT_MS,
  sprintResult,
  type SprintResult,
  sprintRun,
} from "@/game/sprint";
import { itemLimit, practiceSurvival, SURVIVAL_MAX_MS, survivalResult, survivalRun } from "@/game/survival";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { fetchRandomRun, leaderboardReady, submitOnlineRun } from "@/utils/leaderboard";
import { playMusic } from "@/utils/music";
import { preloadSfx, refreshSfxSetting, sfx, sfxMaterial } from "@/utils/sfx";
import { getSprintBest, getSurvivalBest, saveSprintBest, saveSurvivalBest, todayKey } from "@/utils/storage";

import { useLater } from "./round-hooks";

type Phase = "ready" | "countdown" | "play" | "end";

/** Nach dem Ablauf der Zeit: so lange fliegen die letzten Würfe noch (ms). */
const END_MS = 1100;
/** Kurze Pause nach jedem Wurf – wahlloses Dauerwischen lohnt sich nicht (ms). */
const THROW_GAP_MS = 400;
/** Survival: nur gegen Doppelwischen – die Zeit je Gegenstand ist ohnehin knapp (ms). */
const SURVIVAL_GAP_MS = 150;
/** Nach einem Fehlwurf: so lange bleibt Zeit für den Lern-Hinweis (ms). */
const WRONG_PAUSE_MS = 1500;

/** Survival: nach dem Ausscheiden Zeit zum Lesen des Lern-Hinweises (ms). */
const OUT_MS = 1800;

type EndInfo = { run: GhostRun; result: SprintResult; newBest: boolean };

export type SprintKind = "sprint" | "survival";

const KIND = {
  sprint: { emoji: "⏱️", getBest: getSprintBest, saveBest: saveSprintBest },
  survival: { emoji: "🛡️", getBest: getSurvivalBest, saveBest: saveSurvivalBest },
} as const;

export function SprintRound({
  kind = "sprint",
  onAgain,
  onExit,
}: {
  kind?: SprintKind;
  onAgain: () => void;
  onExit: () => void;
}) {
  const survival = kind === "survival";
  const insets = useSafeAreaInsets();
  const { scheme, colors } = useAppTheme();
  const { t, lang, itemName } = useI18n();
  const { reduceMotion } = useAppSettings();
  const fx = useRef(createFx());
  const bus = useRef(createBus());
  useEffect(() => {
    fx.current.calm = reduceMotion;
  }, [reduceMotion]);
  const [day] = useState(todayKey);
  const { scene, bins, queue, correctBins } = useMemo(() => sprintTrackFor(day, kind), [day, kind]);
  const binOf = useCallback((it: Item) => bins.findIndex((b) => b.category === it.category), [bins]);
  const practice = useMemo(
    () => (survival ? practiceSurvival : practiceSprint)(day, correctBins, bins.length),
    [survival, day, correctBins, bins.length],
  );
  const { width: screenW, height: screenH } = useWindowDimensions();
  const layout = useMemo(() => computeLayout(screenW, screenH, bins.length), [screenW, screenH, bins.length]);
  const later = useLater();

  // Bester eigener Lauf dieser Art von heute (oder null → Übungs-Ghost)
  const [best, setBest] = useState<GhostRun | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    KIND[kind]
      .getBest()
      .then((raw) => setBest(parseSprint(raw, day)))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [day, kind]);
  const phaseRef = useRef<Phase>("ready");
  // Zufallsgegner: ähnlich stark wie der eigene Bestlauf (sonst wie der Übungs-Ghost)
  const [rival, setRival] = useState<{ name: string; run: GhostRun } | null>(null);
  const [vsOwn, setVsOwn] = useState(false);
  /** Suche läuft noch (nur mit eingerichtetem Server) – ruhiger Hinweis statt Springen. */
  const [searching, setSearching] = useState(leaderboardReady);
  useEffect(() => {
    if (!loaded) return;
    let alive = true;
    fetchRandomRun(kind, day, (best ?? practice).correct)
      .then((found) => {
        const throws = found ? decodeSprint(found.code, correctBins, bins.length) : null;
        // Nur vor dem Start übernehmen – danach fliegt schon der bisherige Ghost
        if (!alive || !found || !throws || phaseRef.current !== "ready") return;
        const run = survival ? survivalRun(day, throws, found.ms) : sprintRun(day, throws);
        if (run.throws.length > 0) setRival({ name: found.name, run });
      })
      .catch(() => undefined)
      .finally(() => alive && setSearching(false));
    return () => {
      alive = false;
    };
    // Nur einmal nach dem Laden suchen – nicht nach jedem neuen Bestwert
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  const vsRival = !!rival && !vsOwn;
  const ghost = vsRival ? rival.run : (best ?? practice);
  const ghostName = vsRival ? rival.name : best ? t("ghost.name") : t("ghost.practiceName");

  const [phase, setPhase] = useState<Phase>("ready");
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
  /** Ende der Runde – die Uhr bleibt dort stehen. */
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  /** Survival: Zeit für den aktuellen Gegenstand (Balken). */
  const [limit, setLimit] = useState(0);
  /** Survival: zählt jeden neuen Gegenstand – ein alter Zu-langsam-Timer greift nicht mehr. */
  const itemSeq = useRef(0);
  /** Survival: Zeitpunkt des Ausscheidens (ms ab Start). */
  const outAt = useRef(0);
  const startRef = useRef(0);
  const myThrows = useRef<GhostThrow[]>([]);
  /** Vor diesem Zeitpunkt zählt kein neuer Wurf (THROW_GAP_MS). */
  const lockUntil = useRef(0);
  /** „Lauf beenden?“ ist offen – läuft die Zeit dabei ab, wird nichts gespeichert. */
  const quitting = useRef(false);
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

  // Die Strecke ist lang genug – zur Sicherheit beginnt sie sonst von vorn
  /** `at` = ms seit dem Start (Survival: bestimmt die Zeit für den Gegenstand). */
  const showItem = (i: number, at = 0) => {
    const next = queue[i % queue.length] ?? null;
    setIndex(i);
    setItem(next);
    setPreview(bus.current, next);
    if (survival && next) {
      // Wer zu lange wartet, scheidet aus
      const seq = ++itemSeq.current;
      const ms = itemLimit(at);
      setLimit(ms);
      later(() => itemSeq.current === seq && out("slow", next), ms);
    }
  };

  /** Wurf des Ghosts – genau zu seiner Zeit, nur solange der Sprint läuft. */
  const ghostThrow = (g: GhostThrow) => {
    if (phaseRef.current !== "play") return;
    const it = queue[g.i % queue.length];
    if (!it) return;
    const spec: ThrowSpec = { id: ++ids.current, item: it, binIndex: g.bin, hit: g.correct, perfect: false, glow: false, ghost: true };
    flying.current.set(spec.id, { hit: g.correct, bin: g.bin, item: it, ghost: true });
    queueThrow(bus.current, spec);
    if (g.correct) setGhostScore((n) => n + 1);
  };

  const finish = () => {
    const run = survival ? survivalRun(day, myThrows.current, outAt.current) : sprintRun(day, myThrows.current);
    const newBest = !quitting.current && run.correct > 0 && (!best || run.correct > best.correct);
    if (newBest) KIND[kind].saveBest(JSON.stringify(run)).catch(() => undefined);
    if (!quitting.current) submitOnlineRun(kind, day, encodeSprint(run), run.correct, run.ms).catch(() => undefined);
    setEnd({ run, result: (survival ? survivalResult : sprintResult)(run, ghost), newBest });
    goPhase("end");
    sfx("end");
    playMusic("menu");
  };

  /** Zeit um: keine Würfe mehr, beim Ghost gleich seinen Endstand zeigen. */
  const timeUp = () => {
    if (phaseRef.current !== "play") return;
    phaseRef.current = "end";
    setStoppedAt(Date.now());
    setItem(null);
    setPreview(bus.current, null);
    setGhostScore(ghost.correct);
    showBanner(`⏱️ ${t("sprint.timeUp")}`, END_MS);
    later(finish, END_MS);
  };

  /** Survival vorbei: falsch (Hinweis zeigt schon handleThrow), zu langsam oder geschafft. */
  const out = (reason: "wrong" | "slow" | "max", missed?: Item) => {
    if (phaseRef.current !== "play") return;
    phaseRef.current = "end";
    const now = Date.now();
    outAt.current = now - startRef.current;
    itemSeq.current += 1;
    setStoppedAt(now);
    setItem(null);
    setPreview(bus.current, null);
    setGhostScore(ghost.correct);
    if (reason === "slow") {
      // Auch hier lernen: wohin der Gegenstand gehört, richtige Tonne hüpft
      const bin = missed ? getBinByCategory(missed.category) : undefined;
      const right = missed ? binOf(missed) : -1;
      if (right >= 0) queueBinEvent(bus.current, right, "peek");
      showBanner(
        `⏳ ${t("survival.slow")}${bin && missed ? ` · ${t("duel.belongsIn", { item: itemName(missed), bin: t(bin.labelKey) })}` : ""}`,
        OUT_MS,
      );
      sfx("plop");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
    if (reason === "max") showBanner(`🏁 ${t("survival.max")}`, OUT_MS);
    later(finish, OUT_MS);
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
      showItem(0, 0);
      for (const g of ghost.throws) later(() => ghostThrow(g), g.ms);
      if (survival) {
        // Ghost raus: Bescheid geben – jeder weitere Treffer zählt fürs Ergebnis
        if (ghost.ms < SURVIVAL_MAX_MS)
          later(() => phaseRef.current === "play" && showBanner(`👻 ${t("survival.ghostOut", { name: ghostName })}`), ghost.ms + 300);
        later(() => out("max"), SURVIVAL_MAX_MS);
        return;
      }
      // Die letzten 3 Sekunden ticken hörbar
      for (const s of [3, 2, 1]) later(() => phaseRef.current === "play" && sfx("tick"), SPRINT_MS - s * 1000);
      later(timeUp, SPRINT_MS);
    }, 2100);
  };

  /** Richtung zu jeder Tonne vom Startpunkt des Daumens aus (wie im Duell). */
  const anglesFrom = (x: number, y: number) =>
    layout.binTops.map((b) => (Math.atan2(b.x - x, y - b.y) * 180) / Math.PI);

  const handleThrow = (x0: number, y0: number, dx: number, dy: number, vy: number) => {
    if (phaseRef.current !== "play" || !item || Date.now() < lockUntil.current) return;
    const aim = aimFromDrag(dx, dy, anglesFrom(x0, y0));
    if (!aim) return;
    const current = item;
    const correct = bins[aim.binIndex].category === current.category;
    const now = Date.now();
    // Der Zeit-um-Timer kann ein paar ms später kommen – solche Würfe zählen nicht
    if (!survival && now - startRef.current > SPRINT_MS) return;
    lockUntil.current = now + (survival ? SURVIVAL_GAP_MS : THROW_GAP_MS);
    itemSeq.current += 1;
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
      if (bin) showBanner(t("duel.belongsIn", { item: itemName(current), bin: t(bin.labelKey) }), survival ? OUT_MS : 1500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      if (survival) {
        out("wrong");
        return;
      }
      // Kurz durchatmen: Hinweis lesen, dann kommt der nächste Gegenstand
      setItem(null);
      setPreview(bus.current, null);
      const next = index + 1;
      later(() => phaseRef.current === "play" && showItem(next), WRONG_PAUSE_MS);
      return;
    }
    showItem(index + 1, now - startRef.current);
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
    quitting.current = true;
    Alert.alert(t("ghost.quit.title"), t("ghost.quit.message"), [
      { text: t("common.cancel"), style: "cancel", onPress: () => (quitting.current = false) },
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

      {/* Oben: du gegen den Ghost, Restzeit und Tauziehen */}
      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + Spacing.sm }]}>
        <View pointerEvents="box-none" style={styles.topRow}>
          <IconButton icon="x" label={t("common.close")} onPress={askExit} />
          <ScoreChip p={0} points={me} hot={false} label={t("ghost.me")} calm={reduceMotion} />
          <View style={styles.counter}>
            {phase === "play" || phase === "end" ? (
              <RoundClock
                since={startedAt}
                stop={stoppedAt}
                total={survival ? undefined : SPRINT_MS}
                warn={colors.warning}
                label={(n) => t(survival ? "survival.elapsed" : "sprint.timeLeft", { n })}
              />
            ) : (
              <AppText variant="label" color="#FFFFFF" style={styles.shadow}>
                VS
              </AppText>
            )}
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
          {survival && limit > 0 && <ItemTimer key={`t${index}`} ms={limit} color={PLAYER[0].color} />}
        </View>
      )}

      {phase === "ready" && (
        <View
          pointerEvents="box-none"
          style={[styles.cover, { paddingTop: insets.top + 90, paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <AppText variant="title" style={styles.center}>
              {KIND[kind].emoji} {t(`${kind}.title`)}
            </AppText>
            <AppText variant="body" tone="textSecondary" style={styles.center}>
              {t(`${kind}.rules`)}
            </AppText>
            <View style={[styles.pill, { backgroundColor: PLAYER[1].color }]}>
              <AppText variant="label" color={PLAYER[1].on} style={styles.center}>
                {vsRival
                  ? `🌍 ${t("online.rival", { name: rival.name, correct: rival.run.correct })}`
                  : best
                    ? t(`${kind}.best`, { correct: best.correct })
                    : t(`${kind}.practice`)}
              </AppText>
            </View>
            {searching && !rival && (
              <AppText variant="caption" tone="textSecondary" style={styles.center}>
                🌍 {t("online.searching")}
              </AppText>
            )}
            {rival && (
              <Button
                title={
                  vsOwn
                    ? t("online.playRival", { name: rival.name })
                    : best
                      ? t("ghost.code.mine")
                      : t("online.vsPractice")
                }
                icon={vsOwn ? "globe" : "user"}
                variant="secondary"
                onPress={() => setVsOwn((v) => !v)}
              />
            )}
            <Button title={t("duel.start")} icon="zap" size="lg" disabled={!loaded} onPress={start} />
          </View>
        </View>
      )}

      {phase === "countdown" && (
        <View pointerEvents="none" style={styles.countWrap}>
          <Countdown key={count} n={count} calm={reduceMotion} />
        </View>
      )}

      {phase === "end" && end && (
        <SprintEnd
          kind={kind}
          end={end}
          ghost={ghost}
          ghostName={ghostName}
          practice={!vsRival && !best}
          rival={vsRival ? rival.name : null}
          first={!best}
          vsOther={vsRival}
          queue={queue}
          onAgain={onAgain}
          onMenu={onExit}
        />
      )}
    </View>
  );
}

/** Uhr in Sekunden – eigene kleine Anzeige, damit nicht die ganze Runde neu zeichnet.
 *  Mit `total`: Restzeit, die letzten 5 Sekunden in Warnfarbe; sonst laufende Zeit. */
function RoundClock({
  since,
  stop,
  total,
  warn,
  label,
}: {
  since: number;
  stop: number | null;
  total?: number;
  warn: string;
  label: (n: number) => string;
}) {
  const [now, setNow] = useState(since);
  const ms = Math.max(0, (stop ?? now) - since);
  const shown = total === undefined ? Math.floor(ms / 1000) : Math.max(0, Math.ceil((total - ms) / 1000));
  const done = stop !== null || (total !== undefined && shown === 0);
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [done]);
  return (
    <View accessible accessibilityLabel={label(shown)}>
      <AppText variant="title" color={total !== undefined && shown <= 5 ? warn : "#FFFFFF"} style={styles.shadow}>
        {shown} s
      </AppText>
    </View>
  );
}

/** Survival: Balken unter dem Gegenstand, der in `ms` leer läuft (nativ animiert). */
function ItemTimer({ ms, color }: { ms: number; color: string }) {
  const [k] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const anim = Animated.timing(k, { toValue: 0, duration: ms, easing: Easing.linear, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [k, ms]);
  return (
    <View style={styles.timerTrack}>
      <Animated.View style={[styles.timerFill, { backgroundColor: color, transform: [{ scaleX: k }] }]} />
    </View>
  );
}

function SprintEnd({
  kind,
  end,
  ghost,
  ghostName,
  practice,
  rival,
  first,
  vsOther,
  queue,
  onAgain,
  onMenu,
}: {
  kind: SprintKind;
  /** Name des Zufallsgegners, sonst null (eigener oder Übungs-Ghost). */
  rival: string | null;
  end: EndInfo;
  ghost: GhostRun;
  ghostName: string;
  practice: boolean;
  /** Noch kein eigener Lauf dieser Art von heute (erster Lauf wird gespeichert). */
  first: boolean;
  /** Gegen einen Zufallsgegner gespielt – dann kommt beim nächsten Mal wieder einer. */
  vsOther: boolean;
  queue: Item[];
  onAgain: () => void;
  onMenu: () => void;
}) {
  const { t, itemName, formatNumber } = useI18n();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { run, result, newBest } = end;
  const sec = (ms: number) => `${formatNumber(Math.round(ms / 100) / 10)} s`;
  const title = rival
    ? t(result === "win" ? "ghost.winFriend" : result === "lose" ? "ghost.loseFriend" : "ghost.drawFriend", {
        name: rival,
      })
    : result === "win"
      ? t(practice ? "ghost.winPractice" : "ghost.win")
      : result === "lose"
        ? t("ghost.lose")
        : t("ghost.draw");
  // Jeder Gegenstand nur einmal (die Strecke wiederholt sich)
  const learn = [
    ...new Map(
      run.throws
        .filter((x) => !x.correct)
        .map((x) => queue[x.i % queue.length])
        .filter((i): i is Item => !!i)
        .map((i) => [i.name, i]),
    ).values(),
  ];
  const rows: [string, string | number, string | number][] = [
    [t("ghost.row.correct"), run.correct, ghost.correct],
    kind === "survival"
      ? [t("survival.row.time"), sec(run.ms), sec(ghost.ms)]
      : [t("sprint.row.throws"), run.throws.length, ghost.throws.length],
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
              ⭐ {t(vsOther ? "online.newBest" : first ? `${kind}.firstSaved` : `${kind}.newBest`)}
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

        <Button title={t("ghost.again")} icon="refresh-cw" size="lg" onPress={onAgain} />
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
  pill: { borderRadius: Radius.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
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
  timerTrack: {
    width: 120,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  timerFill: { width: "100%", height: "100%", borderRadius: 3, transformOrigin: "left" },
  binTag: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
});
