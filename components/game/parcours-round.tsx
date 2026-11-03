// Datei: components/game/parcours-round.tsx — Parcours-Runde (ROADMAP R5d)
// (Route: app/runde.tsx mit mode=parcours&level=N)
//
// Sortieren UND tricksen: Gegenstände aller Tonnen in der Reihenfolge des
// Tages (game/parcours.ts), die Zieltonne ergibt sich aus dem Gegenstand, der
// Parcours ist für jede Tonne gleich schwer (game/trick-levels.ts PARCOURS).
// Feste Zeit je Parcours, Punkte je Wurf: falsch 0 · richtig 1 · mit Trick 3 ·
// Swish +1. Werfen wie in der Trick-Runde, ein Wurf zur Zeit. Die Hindernisse
// hängen nur an der Rundenzeit der Szene – gleicher Wurf, gleiches Ergebnis.
import { type BinDef, getItemsForBins, STANDARD_BINS } from "@/game/bins";
import { computeLayout, shotLanding } from "@/game/layout";
import { type FreeShot, FULL_SWIPE_SHARE } from "@/game/logic";
import { itemMass, itemMaterial, MASS_FEEL } from "@/game/item-mass";
import { dailyParcoursId, decodeParcours, encodeParcours, type ParcoursRun, parcoursPoints, parcoursQueue, parseParcoursRun } from "@/game/parcours";
import {
  levelColliders,
  meetsRequirement,
  PARCOURS,
  type ParcoursLevel,
  parcoursLane,
} from "@/game/trick-levels";
import { type Item } from "@/constants/items";
import { ITEM_REASONS } from "@/i18n/item-reasons";
import { Radius, Spacing } from "@/constants/theme";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { fetchFriendParcoursRun, fetchRandomParcoursRun, leaderboardReady, submitParcoursRun } from "@/utils/leaderboard";
import { router } from "expo-router";
import { preloadSfx, refreshSfxSetting, sfx, sfxMaterial } from "@/utils/sfx";
import { usableSkin, usableTrail } from "@/game/rewards";
import {
  getBinSkin,
  getParcoursBest,
  getParcoursToday,
  getRewardProgress,
  getTrail,
  saveParcoursBest,
  saveParcoursToday,
  todayKey,
} from "@/utils/storage";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cancelSlowMotion, createFx } from "./fx";
import { SceneCanvas } from "./game-round";
import { FloatingText, type FloatText, ItemCard, LearnCard, ParcoursHud, RuleLines, TipCard } from "./hud";
import { useLater } from "./round-hooks";
import { type TipId, useTips } from "./tips";
import { beginThrow, createThrowInput, previewShot, releaseShot, stepClick } from "./throw-input";
import {
  createBus,
  type LandOutcome,
  queueBinEvent,
  queueBurst,
  queueThrow,
  setBinSkin,
  setLandHandler,
  setPreview,
  setShotGuide,
  setTrail,
  type ThrowSpec,
} from "./scene-bus";

type Phase = "ready" | "play" | "end";

export function ParcoursRound({
  level,
  friend,
  onExit,
  onRetry,
}: {
  level: ParcoursLevel;
  /** Freundes-Code: gegen dessen Lauf von heute antreten (statt Zufallsgegner). */
  friend?: string;
  onExit: () => void;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { scheme, colors } = useAppTheme();
  const { t, lang } = useI18n();
  const { reduceMotion, learnReason } = useAppSettings();
  const fx = useRef(createFx());
  const bus = useRef(createBus());
  useEffect(() => {
    fx.current.calm = reduceMotion;
  }, [reduceMotion]);

  const bins: BinDef[] = STANDARD_BINS;
  const { width: screenW, height: screenH } = useWindowDimensions();
  const layout = useMemo(() => computeLayout(screenW, screenH, bins.length), [screenW, screenH, bins.length]);
  const binXs = useMemo(() => layout.bins.map((b) => b.x), [layout]);
  // Gleiche Hindernisse für alle Spuren – nur Zieltonne/Pflicht wechseln je
  // Gegenstand (parcoursLane). Klappende Deckel gelten mit flapAll für alle.
  const trick = useMemo(
    () => ({
      props: level.props,
      colliders: levelColliders(level),
      binSlide:
        level.binSlide || level.binFlap
          ? { bin: 0, slide: level.binSlide, flap: level.binFlap, flapAll: level.flapAll }
          : undefined,
    }),
    [level],
  );
  const feelOf = (it: Item) => ({ loft: 1, drift: MASS_FEEL[itemMass(it)].drift });
  const binOf = (it: Item) => Math.max(0, bins.findIndex((b) => b.category === it.category)) as 0 | 1 | 2;

  // Gegenstände des Tages – für alle gleich (später: Ghost des Gegners)
  const [day] = useState(todayKey);
  const queue = useMemo(() => parcoursQueue(getItemsForBins(bins), day, level.id), [bins, day, level.id]);
  const indexRef = useRef(0);
  const [item, setItemState] = useState<Item | null>(null);
  const itemRef = useRef<Item | null>(null);
  const setItem = useCallback((next: Item | null) => {
    itemRef.current = next;
    setPreview(bus.current, next);
    setItemState(next);
  }, []);

  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  /** Rundenende (Date.now()-Zeit) – Timer laufen im Hintergrund nicht weiter. */
  const endsRef = useRef(0);
  /** Zeit um – laufender Wurf darf noch landen, dann Schluss. */
  const over = useRef(false);
  const busy = useRef(false);
  const thrownRef = useRef<Item | null>(null);
  /** Id des Wurfs in der Luft (0 = keiner) – späte oder doppelte Landungen zählen nicht. */
  const flightRef = useRef(0);
  const ids = useRef(0);
  const input = useRef(createThrowInput());
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const counts = useRef({ right: 0, tricks: 0, wrong: 0 });
  const [floats, setFloats] = useState<FloatText[]>([]);
  /** Lernkarte nach falscher Tonne: Gegenstand → richtige Tonne. */
  const [learn, setLearn] = useState<{ id: number; item: Item; bin: BinDef } | null>(null);
  const [result, setResult] = useState<{ points: number; right: number; tricks: number; wrong: number; best: number } | null>(null);
  const later = useLater();
  // Tipp wartet, solange die Lernkarte an seinem Platz steht
  const tips = useTips(learn !== null);
  const showTip = tips.show;

  // Belohnungen: gewählte Spur/Tonnen-Look, bisheriger Bestwert
  const bestRef = useRef(0);
  const [best, setBest] = useState(0);
  // Ghost: eigener bester Lauf von heute – nur vor dem Start übernommen
  const [ghost, setGhost] = useState<ParcoursRun | null>(null);
  const ghostRef = useRef<ParcoursRun | null>(null);
  /** Gegner von heute (Server) – null: eigener Lauf als Ghost. */
  const [rival, setRival] = useState<string | null>(null);
  /** Suche nach dem Gegner läuft (nur Hinweis auf der Startkarte). */
  const [searching, setSearching] = useState(false);
  /** Freund herausgefordert: hat heute noch nicht gespielt (Name) bzw. Lauf kam nicht an. */
  const [friendNoRun, setFriendNoRun] = useState<string | null>(null);
  const [friendLost, setFriendLost] = useState(false);
  /** Parcours des Tages – nur der hat eine Rangliste (Reiter „Parcours des Tages“). */
  const isDaily = dailyParcoursId(day, PARCOURS.map((p) => p.id)) === level.id;
  // Sperre gegen Doppeltippen (sonst zwei Ranglisten übereinander)
  const rankLock = useRef(0);
  /** Punkte des gespeicherten Laufs von heute – auch, wenn er erst nach dem Start geladen ist. */
  const todayRef = useRef(0);
  /** Eigener Lauf: Punktestand nach jedem Treffer (wird ggf. neuer Ghost). */
  const hits = useRef<[number, number][]>([]);
  useEffect(() => {
    Promise.all([getTrail(), getRewardProgress(), getBinSkin(), getParcoursBest(), getParcoursToday(level.id, day)])
      .then(([id, progress, skin, bests, today]) => {
        setTrail(bus.current, usableTrail(id, progress));
        setBinSkin(bus.current, usableSkin(skin, progress));
        bestRef.current = bests[level.id] ?? 0;
        setBest(bestRef.current);
        const run = parseParcoursRun(today);
        todayRef.current = run?.points ?? 0;
        if (phaseRef.current !== "ready") return;
        ghostRef.current = run;
        setGhost(ghostRef.current);
        // Trick-Battle: ein echter Gegner von heute (ähnlich stark) ersetzt den eigenen Ghost
        setSearching(true);
        // Freund herausgefordert: dessen Lauf von heute, sonst ein Zufallsgegner
        const search = friend
          ? fetchFriendParcoursRun(friend, level.id, day).then((found) => {
              if (found && !found.code) setFriendNoRun(found.name);
              if (!found) setFriendLost(true);
              return found?.code ? { name: found.name, code: found.code } : null;
            })
          : fetchRandomParcoursRun(level.id, day, run?.points ?? bestRef.current);
        return search.then((other) => {
          setSearching(false);
          const decoded = other ? decodeParcours(other.code) : null;
          // Nur vor dem Start übernehmen – danach fliegt schon der bisherige Ghost
          if (!other || !decoded || phaseRef.current !== "ready") return;
          ghostRef.current = decoded;
          setGhost(decoded);
          setRival(other.name);
        });
      })
      .catch(() => undefined);
  }, [level.id, day, friend]);

  useEffect(() => {
    refreshSfxSetting();
    preloadSfx();
  }, []);

  const float = useCallback((text: string, x: number, y: number, color = "#FFFFFF") => {
    setFloats((f) => [...f.slice(-4), { id: ++ids.current, x, y, text, color }]);
    const spoken = text.replace(/[★☆✨✓👆]/gu, "").trim();
    if (spoken) AccessibilityInfo.announceForAccessibility(spoken);
  }, []);

  /** Welt-x → Bildschirm-x (zwischen den Tonnen linear). */
  const screenX = (worldX: number) => {
    const first = layout.binTops[0];
    const last = layout.binTops[layout.binTops.length - 1];
    const x0 = binXs[0];
    const x1 = binXs[binXs.length - 1];
    const k = x1 !== x0 ? (worldX - x0) / (x1 - x0) : 0.5;
    return Math.min(Math.max(first.x + k * (last.x - first.x), 60), screenW - 60);
  };

  const finish = () => {
    if (phaseRef.current === "end") return;
    phaseRef.current = "end";
    const total = pointsRef.current;
    if (total > bestRef.current) saveParcoursBest(level.id, total).catch(() => undefined);
    // Online (Trick-Battle): jeder Lauf mit Punkten – der Server behält den besten
    if (total > 0) submitParcoursRun(level.id, day, encodeParcours({ points: total, hits: hits.current }), total);
    if (total > todayRef.current) {
      saveParcoursToday(level.id, { points: total, hits: hits.current } satisfies ParcoursRun, day).catch(() => undefined);
    }
    sfx(total > bestRef.current && total > 0 ? "perfect" : "comboUp");
    setItem(null);
    setLearn(null);
    tips.dismiss();
    later(() => {
      setPhase("end");
      setResult({ points: total, ...counts.current, best: bestRef.current });
    }, 500);
  };

  const timeUp = () => {
    if (over.current) return;
    over.current = true;
    setItem(null);
    float(t("parcours.timeUp"), screenW / 2, layout.binTops[0].y - 40, "#FFD54A");
    if (!busy.current) finish();
  };

  const start = () => {
    if (phaseRef.current !== "ready") return;
    phaseRef.current = "play";
    setPhase("play");
    sfx("comboUp");
    const ms = level.seconds * 1000;
    endsRef.current = Date.now() + ms;
    setEndsAt(endsRef.current);
    indexRef.current = 0;
    setItem(queue[0] ?? null);
    // Letzte 3 Sekunden ticken hörbar
    for (const s of [3, 2, 1]) later(() => !over.current && sfx("tick"), ms - s * 1000);
    later(timeUp, ms);
    // Hindernis einmal erklären
    const has = (kind: string) => level.props.some((p) => p.kind === kind);
    const tip: TipId = has("trampoline") ? "trampoline" : has("board") ? "board" : level.flapAll ? "flapAll" : "movingRing";
    later(() => showTip(tip), 900);
  };

  const throwShot = (shot: FreeShot) => {
    const current = itemRef.current;
    if (!current || busy.current || over.current || phaseRef.current !== "play") return;
    // Zeit schon um (z. B. App war im Hintergrund, Timer kam noch nicht)
    if (Date.now() >= endsRef.current) {
      // Spürbar: dieser Wisch zählt nicht mehr (eigener Stoß, nicht die Fehlwurf-Warnung)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
      timeUp();
      return;
    }
    busy.current = true;
    thrownRef.current = current;
    cancelSlowMotion(fx.current);
    const spec: ThrowSpec = {
      id: ++ids.current,
      item: current,
      binIndex: -1,
      hit: false,
      perfect: false,
      glow: false,
      land: shotLanding(layout, shot),
      strength: shot.strength,
      feel: feelOf(current),
      free: { accept: bins.map((b) => b.category === current.category), center: shot.perfect },
    };
    queueThrow(bus.current, spec);
    flightRef.current = spec.id;
    // Sicherheitsnetz: meldet die Szene keine Landung, zählt der Wurf als daneben
    later(() => {
      if (flightRef.current === spec.id) handlers.current.land(spec.id);
    }, 8000);
    setItem(null);
    sfx("throw");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  /** Warum es ohne Trick war – derselbe Hinweis wie in der Trick-Runde. */
  const noTrickText = (lane: ReturnType<typeof parcoursLane>, passed: number[]) => {
    const kindOf = (i: number) => level.props[i]?.kind;
    const missing = lane.requires.filter((i) => !passed.includes(i));
    const other = passed.filter((i) => !lane.requires.includes(i));
    if (missing.some((i) => kindOf(i) === "trampoline"))
      return t(other.some((i) => kindOf(i) === "trampoline") ? "trick.otherTrampoline" : "trick.noTrampoline");
    if (missing.some((i) => kindOf(i) === "board"))
      return t(other.some((i) => kindOf(i) === "board") ? "trick.otherHole" : "trick.noBoard");
    return t("trick.noTrick");
  };

  const handleLand = (id: number, outcome?: LandOutcome) => {
    if (id !== flightRef.current) return;
    flightRef.current = 0;
    busy.current = false;
    const thrown = thrownRef.current;
    if (!thrown) return;
    const correct = binOf(thrown);
    const lane = parcoursLane(level, correct);
    const bin = outcome?.bin ?? null;
    const passed = outcome?.props ?? [];
    const y = layout.binTops[0].y;
    if (bin === correct) {
      const isTrick = meetsRequirement(lane, passed);
      const clean = !!outcome?.clean;
      const gained = parcoursPoints({ correct: true, trick: isTrick, clean });
      pointsRef.current += gained;
      setPoints(pointsRef.current);
      const elapsed = level.seconds * 1000 - Math.max(0, endsRef.current - Date.now());
      hits.current.push([Math.round(elapsed), pointsRef.current]);
      counts.current.right += 1;
      const top = layout.binTops[bin];
      if (isTrick) {
        counts.current.tricks += 1;
        queueBinEvent(bus.current, bin, "perfect");
        queueBurst(bus.current, {
          id: ++ids.current,
          x: layout.bins[bin].x,
          y: 1.75,
          z: layout.bins[bin].z + 0.1,
          colors: ["#FFD54A", "#FFFFFF", bins[bin].colorLight],
          count: 18,
          power: 1,
          ring: true,
        });
        sfx("perfect");
        if (clean) sfx("swish");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        float(t(clean ? "parcours.plusSwish" : "parcours.plusTrick", { n: gained }), top.x, top.y, "#FFD54A");
      } else {
        queueBinEvent(bus.current, bin, "hit");
        sfx("plop");
        float(`${t("parcours.plus", { n: gained })} · ${noTrickText(lane, passed)}`, top.x, top.y);
      }
      sfxMaterial(itemMaterial(thrown));
    } else if (bin !== null) {
      // Falsche Tonne: 0 Punkte – Lernkarte (wohin es gehört), Zieltonne hüpft kurz
      counts.current.wrong += 1;
      queueBinEvent(bus.current, bin, "reject");
      const id = ++ids.current;
      setLearn({ id, item: thrown, bin: bins[correct] });
      // Mit Begründung bleibt die Karte etwas länger stehen (zum Lesen)
      later(() => setLearn((v) => (v?.id === id ? null : v)), learnReason ? 2300 : 1800);
      later(() => queueBinEvent(bus.current, correct, "peek"), 250);
      sfx("plop");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    } else {
      float(outcome?.near ? t("game.near") : t("game.miss"), screenX(outcome?.x ?? 0), y);
      sfx("plop");
    }
    if (over.current) {
      finish();
      return;
    }
    // Nach falscher Tonne kurze Lernpause (Karte lesen; wahlloses Werfen lohnt nicht)
    const wrong = bin !== null && bin !== correct;
    later(() => {
      if (over.current) return;
      indexRef.current += 1;
      setItem(queue[indexRef.current % queue.length] ?? null);
    }, wrong ? 1200 : 250);
  };

  // Gesten-Handler (aktuell halten, ohne die Geste neu zu bauen)
  const handlers = useRef({
    begin: () => {},
    aim: (_dx: number, _dy: number, _vy: number) => {},
    release: (_dx: number, _dy: number, _vy: number) => {},
    cancel: () => {},
    land: (_id: number, _outcome?: LandOutcome) => {},
    /** Zurück aus dem Hintergrund: abgelaufene Zeit sofort beenden. */
    resume: () => {},
  });
  const throwCtx = () => ({
    full: screenH * FULL_SWIPE_SHARE,
    binAngles: layout.binAngles,
    binXs,
    // Trampolin: kurze Würfe sind gewollt – sie sollen den Schwung nicht umlernen
    learn: !level.props.some((p) => p.kind === "trampoline"),
  });
  useLayoutEffect(() => {
    handlers.current = {
      begin: () => beginThrow(input.current, Date.now()),
      aim: (dx, dy, vy) => {
        if (busy.current || over.current || phaseRef.current !== "play") return;
        const shot = previewShot(input.current, Date.now(), dx, dy, vy, throwCtx());
        if (!input.current.aiming) return;
        setShotGuide(
          bus.current,
          shot && itemRef.current ? { ...shotLanding(layout, shot), strength: shot.strength, ...feelOf(itemRef.current) } : null,
        );
        if (stepClick(input.current, shot)) Haptics.selectionAsync().catch(() => undefined);
      },
      release: (dx, dy, vy) => {
        setShotGuide(bus.current, null);
        if (busy.current || over.current || phaseRef.current !== "play") return;
        const shot = releaseShot(input.current, dx, dy, vy, throwCtx());
        if (shot) {
          // Neuer Wurf: Lernkarte vom letzten Fehlwurf weg, sie verdeckt sonst den Flug
          setLearn(null);
          throwShot(shot);
        } else if (dy > 60) float(`👆 ${t("game.swipeHint")}`, screenW / 2, layout.binTops[0].y);
      },
      cancel: () => setShotGuide(bus.current, null),
      land: handleLand,
      resume: () => {
        if (phaseRef.current === "play" && Date.now() >= endsRef.current) timeUp();
      },
    };
  });
  useEffect(() => {
    const b = bus.current;
    setLandHandler(b, (id, outcome) => handlers.current.land(id, outcome));
    return () => setLandHandler(b, () => undefined);
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") handlers.current.resume();
    });
    return () => sub.remove();
  }, []);

  const onBegin = useCallback(() => handlers.current.begin(), []);
  const onAim = useCallback((dx: number, dy: number, vy: number) => handlers.current.aim(dx, dy, vy), []);
  const onRelease = useCallback((dx: number, dy: number, vy: number) => handlers.current.release(dx, dy, vy), []);
  const onCancel = useCallback(() => handlers.current.cancel(), []);
  const playing = phase === "play";
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(playing)
        .runOnJS(true)
        .minDistance(6)
        .onBegin(onBegin)
        .onUpdate((e) => onAim(e.translationX, e.translationY, e.velocityY))
        .onEnd((e) => onRelease(e.translationX, e.translationY, e.velocityY))
        .onFinalize(onCancel),
    [onBegin, onAim, onRelease, onCancel, playing],
  );
  /* eslint-enable react-hooks/refs */
  const onFloatDone = useCallback((id: number) => {
    setFloats((f) => f.filter((x) => x.id !== id));
  }, []);

  const ready = screenW > 0 && screenH > 0;
  const itemTagTop = layout.item.screen.y + screenW * 0.15 + 4;
  const tipTop = Math.max(0, ...layout.binRects.map((r) => r.y + r.h)) + 10;
  const title = t("parcours.title", { n: level.id });
  const bestLine = !result
    ? ""
    : result.points > result.best && result.points > 0
      ? t("parcours.newBest")
      : result.best > result.points
        ? t(result.best - result.points === 1 ? "parcours.gapOne" : "parcours.gap", {
            n: result.best,
            gap: result.best - result.points,
          })
        : result.best > 0
          ? t("parcours.sameBest", { n: result.best })
          : t("parcours.tryAgain");
  const ghostName = rival ?? t("ghost.name");
  const ghostGap = ghost && result ? ghost.points - result.points : 0;
  const ghostLine =
    !ghost || !result
      ? null
      : ghostGap < 0
        ? t("parcours.ghostWon", { name: ghostName, n: ghost.points })
        : ghostGap === 0
          ? t("parcours.ghostTie", { name: ghostName, n: ghost.points })
          : t(ghostGap === 1 ? "parcours.ghostBehindOne" : "parcours.ghostBehind", {
              name: ghostName,
              n: ghost.points,
              gap: ghostGap,
            });

  return (
    <GestureDetector gesture={gesture}>
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
            scene="haus"
            guide={false}
            openLids
            trick={trick}
            warmItems={queue}
          />
        )}
        {ready && (
          <>
            {floats.map((f) => (
              <FloatingText key={f.id} item={f} onDone={onFloatDone} />
            ))}
            <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + Spacing.sm }]}>
              <IconButton icon="x" label={t("common.close")} onPress={onExit} />
              <ParcoursHud title={title} task={t(level.task)} points={points} endsAt={endsAt} total={level.seconds} ghost={ghost} ghostName={ghostName} />
              <View style={styles.topSpacer} />
            </View>
            {item && playing && (
              <View pointerEvents="none" style={[styles.overlayRow, { top: itemTagTop }]}>
                {/* Strecke ohne direkte Doppelte: der Name reicht als key */}
                <ItemCard key={item.name} item={item} showHint={false} />
              </View>
            )}
          </>
        )}
        {ready && learn && playing && (
          <View pointerEvents="none" style={[styles.overlayRow, { top: tipTop }]}>
            <LearnCard
              key={learn.id}
              item={learn.item}
              bin={learn.bin}
              reason={learnReason ? ITEM_REASONS[learn.item.name]?.[lang] : undefined}
            />
          </View>
        )}
        {ready && tips.tip && playing && !learn && (
          <View pointerEvents="box-none" style={[styles.overlayRow, { top: tipTop }]}>
            <TipCard text={t(tips.tip.key)} onClose={tips.dismiss} />
          </View>
        )}
        {phase === "ready" && (
          <View pointerEvents="box-none" style={[styles.cover, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <AppText variant="title" center accessibilityRole="header">
                {title}
              </AppText>
              <AppText variant="label" center>
                {t(level.task)}
              </AppText>
              <RuleLines text={t("parcours.rules")} />
              <AppText variant="label" tone="textSecondary" center>
                {t("parcours.time", { n: level.seconds })}
                {best > 0 ? ` · ${t("parcours.best", { n: best })}` : ""}
              </AppText>
              {/* Während der Suche nur diese Zeile – sonst springt die Karte zweimal */}
              {searching && !rival && (
                <AppText variant="caption" tone="textMuted" center>
                  {friend ? `👫 ${t("friends.loading")}` : t("parcours.rivalSearch")}
                </AppText>
              )}
              {ghost && !searching && (
                <AppText variant="caption" tone="textSecondary" center>
                  {rival
                    ? t(friend ? "parcours.friendInfo" : "parcours.rivalInfo", {
                        name: rival,
                        points: t("parcours.points", { n: ghost.points }),
                      })
                    : `${t("parcours.ghostInfo")} (${t("parcours.points", { n: ghost.points })})`}
                </AppText>
              )}
              {friendNoRun && (
                <AppText variant="caption" tone="textSecondary" center>
                  👫 {t("friends.noRun", { name: friendNoRun })}
                </AppText>
              )}
              {friendLost && (
                <AppText variant="caption" tone="textSecondary" center>
                  👫 {t("friends.runLost")}
                </AppText>
              )}
              <Button title={t("duel.start")} icon="zap" size="lg" onPress={start} />
            </View>
          </View>
        )}
        {phase === "end" && result && (
          <View style={[styles.cover, styles.coverCenter, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <AppText variant="title" center accessibilityRole="header">
                {t("parcours.timeUp")}
              </AppText>
              <AppText variant="display" tone="gold" center>
                {t("parcours.points", { n: result.points })}
              </AppText>
              <AppText variant="body" center>
                {t("parcours.summary", { right: result.right, tricks: result.tricks })}
              </AppText>
              {result.wrong > 0 && (
                <AppText variant="caption" tone="textSecondary" center>
                  {t("parcours.wrongCount", { n: result.wrong })}
                </AppText>
              )}
              {/* Bestwert-Zeile entfällt, wenn der Ghost schon dasselbe sagt (Bestwert = Lauf von heute) */}
              {(!ghost || rival !== null || ghost.points !== result.best || result.points > result.best) && (
                <AppText
                  variant="label"
                  tone={result.points > result.best ? "gold" : "textSecondary"}
                  center
                  // Screenreader ohne Emoji (🏆)
                  accessibilityLabel={bestLine.replace("🏆", "").trim()}
                >
                  {bestLine}
                </AppText>
              )}
              {ghostLine !== null && ghost && (
                <AppText
                  variant="label"
                  tone={result.points > ghost.points ? "gold" : "textSecondary"}
                  center
                  // Screenreader ohne Emoji
                  accessibilityLabel={ghostLine.replace("👻", "").trim()}
                >
                  {ghostLine}
                </AppText>
              )}
              <Button title={t("trick.retry")} icon="rotate-ccw" onPress={onRetry} />
              {leaderboardReady && isDaily && result.points > 0 && (
                <Button
                  title={t("home.rank")}
                  icon="award"
                  variant="secondary"
                  onPress={() => {
                    if (Date.now() < rankLock.current) return;
                    rankLock.current = Date.now() + 900;
                    router.push({ pathname: "/rangliste", params: { tab: "parcours" } });
                  }}
                />
              )}
              <Button title={t("parcours.overview")} variant="secondary" onPress={onExit} />
            </View>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    position: "absolute",
    top: 0,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  topSpacer: { width: 48 },
  overlayRow: { position: "absolute", left: Spacing.md, right: Spacing.md, alignItems: "center" },
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.md,
  },
  coverCenter: { justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)" },
  card: { borderRadius: Radius.xxl, padding: Spacing.lg, gap: Spacing.md },
});
