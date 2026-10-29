// Datei: components/game/trick-round.tsx — ein Trickwurf-Level
// (Route: app/runde.tsx mit mode=trick)
//
// Werfen wie im Zielwurf (schnell wischen = Tempo, halten = Flugbahn),
// dazu Reifen aus game/trick-levels.ts. Ein Wurf zur
// Zeit: der nächste Gegenstand kommt erst nach der Landung – so ist klar,
// welcher Wurf was ausgelöst hat. Kein Zufall in der Physik: gleicher Wurf,
// gleiches Ergebnis. Beim Halten zeigt eine Vorschau die ersten ~60 % des Flugs.
import { type BinDef, getItemsForBins, STANDARD_BINS } from "@/game/bins";
import { computeLayout, shotLanding } from "@/game/layout";
import {
  type FreeShot,
  FULL_SWIPE_SHARE,
  pickItem,
  recentLimit,
} from "@/game/logic";
import { itemMass, itemMaterial, MASS_FEEL } from "@/game/item-mass";
import {
  bonusMet,
  hasWind,
  levelColliders,
  meetsRequirement,
  starsFor,
  TRICK_LEVELS,
  type TrickLevel,
} from "@/game/trick-levels";
import { type Item } from "@/constants/items";
import { Spacing } from "@/constants/theme";
import { IconButton } from "@/components/ui/icon-button";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { preloadSfx, refreshSfxSetting, sfx, sfxMaterial } from "@/utils/sfx";
import { newlyUnlocked, type Progress, unlockMessageKey, usableSkin, usableTrail } from "@/game/rewards";
import { dailyBoard, submitScore, trickScore } from "@/utils/leaderboard";
import {
  getRewardProgress,
  getBinSkin,
  getTrail,
  getTrickStars,
  saveTrickDaily,
  saveTrickStars,
} from "@/utils/storage";
import * as Haptics from "expo-haptics";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cancelSlowMotion, createFx, hitStop, shake } from "./fx";
import { SceneCanvas } from "./game-round";
import {
  FloatingText,
  type FloatText,
  ChoiceCards,
  ItemCard,
  TipCard,
  TrickHud,
  TrickResult,
} from "./hud";
import { useLater } from "./round-hooks";
import { useTips } from "./tips";
import {
  beginThrow,
  createThrowInput,
  FLICK_SPEED,
  previewShot,
  releaseShot,
  stepClick,
} from "./throw-input";
import {
  createBus,
  type LandOutcome,
  queueBinEvent,
  queueBurst,
  queueThrow,
  setLandHandler,
  setPreview,
  setShotGuide,
  setBinSkin,
  setTrail,
  type ThrowSpec,
} from "./scene-bus";

/** Ab diesem Level (und im Tages-Trick): vor jedem Wurf aus drei Karten den
 *  Gegenstand für die Zieltonne wählen – falsch gewählt zählt als Fehlversuch.
 *  So steckt das Sortieren in jedem Wurf, und jeder Wurf bleibt ein Trick. */
const CHOICE_FROM = 5;
/** So lange bleibt eine falsch gewählte Karte stehen (Lernmoment). */
const WRONG_PICK_MS = 1400;

export function TrickRound({
  level,
  onExit,
  onNext,
  onRetry,
  daily = false,
}: {
  level: TrickLevel;
  onExit: () => void;
  onNext: () => void;
  onRetry: () => void;
  /** Tages-Trick: eigene Wertung, kein „Nächstes Level“. */
  daily?: boolean;
}) {
  const isLast = daily || level.id === TRICK_LEVELS[TRICK_LEVELS.length - 1].id;
  const insets = useSafeAreaInsets();
  const { scheme } = useAppTheme();
  const { t, lang, itemName, itemFact } = useI18n();
  const { reduceMotion } = useAppSettings();
  const fx = useRef(createFx());
  const bus = useRef(createBus());
  useEffect(() => {
    fx.current.calm = reduceMotion;
  }, [reduceMotion]);

  const bins: BinDef[] = STANDARD_BINS;
  const target = bins[level.target];
  const pool = useMemo(() => getItemsForBins([target]), [target]);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const layout = useMemo(
    () => computeLayout(screenW, screenH, bins.length),
    [screenW, screenH, bins.length],
  );
  const binXs = useMemo(() => layout.bins.map((b) => b.x), [layout]);
  const trick = useMemo(
    () => ({
      props: level.props,
      colliders: levelColliders(level),
      binSlide: level.binSlide ? { bin: level.target, slide: level.binSlide } : undefined,
    }),
    [level],
  );
  /** Gewicht im Trickmodus: gleicher Bogen (die Reifen hängen an der Wurfkurve),
   *  aber leichte Sachen treibt der Wind weiter ab. */
  const feelOf = (it: Item) => ({ loft: 1, drift: MASS_FEEL[itemMass(it)].drift });

  // Gegenstände aus der Zieltonne, ohne direkte Wiederholung. Ab CHOICE_FROM
  // (und im Tages-Trick) liegen davor drei Karten: der richtige plus je einer
  // aus den anderen Tonnen.
  // (veränderliche Listen wie der „picker“ der Spielrunde – dürfen beim ersten Render gelesen werden)
  const choosing = daily || level.id >= CHOICE_FROM;
  const otherPools = useMemo(
    () => (choosing ? bins.filter((b) => b !== target).map((b) => getItemsForBins([b])) : []),
    [choosing, bins, target],
  );
  const [recent] = useState<string[]>(() => []);
  const draw = useCallback(() => {
    const item = pickItem(pool, () => 1, recent);
    if (item) {
      recent.push(item.name);
      while (recent.length > recentLimit(pool.length)) recent.shift();
    }
    return item;
  }, [pool, recent]);
  /** Drei Karten in zufälliger Reihenfolge (der richtige ist nicht immer gleich platziert). */
  const drawChoice = useCallback((): Item[] => {
    const list = [draw(), ...otherPools.map((p) => pickItem(p, () => 1, []))].filter(
      (x): x is Item => x !== null,
    );
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [draw, otherPools]);
  const [choice, setChoice] = useState<Item[] | null>(() => (choosing ? drawChoice() : null));
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  /** Je Auswahl neu: Karten blenden jedes Mal frisch ein. */
  const [choiceId, setChoiceId] = useState(0);
  const [item, setItemState] = useState<Item | null>(() => (choosing ? null : draw()));
  // Alle Modelle vorab aufbauen – auch die der anderen Tonnen (sonst ruckelt der erste)
  const [warmItems] = useState(() => [...pool, ...otherPools.flat()]);
  const itemRef = useRef<Item | null>(item);
  const setItem = useCallback((next: Item | null) => {
    itemRef.current = next;
    setPreview(bus.current, next);
    setItemState(next);
  }, []);
  useLayoutEffect(() => {
    setPreview(bus.current, itemRef.current);
  }, []);

  const busy = useRef(false);
  /** Zuletzt geworfener Gegenstand (ein Wurf zur Zeit). */
  const thrownRef = useRef<Item | null>(null);
  const done = useRef(false);
  const ids = useRef(0);
  /** Wurf-Eingabe: schnell wischen oder halten (Vorschau). */
  const input = useRef(createThrowInput());
  const attemptsRef = useRef(0);
  /** Angezeigter Versuch: der laufende bzw. der nächste nach einem Fehlwurf. */
  const [attempt, setAttempt] = useState(1);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [result, setResult] = useState<{
    stars: number;
    attempts: number;
    bonus: boolean;
    unlocked?: string;
    fact?: { name: string; text: string };
  } | null>(null);
  const [hasThrown, setHasThrown] = useState(false);
  const later = useLater();
  // Einführung: je Hindernis einmal erklären; Halten-Tipp nach Fehlwürfen ohne Vorschau
  const tips = useTips();
  const showTip = tips.show;
  // Belohnungen: gewählte Spur, Fortschritt und bisherige Sterne dieses Levels
  const rewardProgress = useRef<Progress>({ stars: 0, level: 0 });
  const levelStars = useRef(0);
  useEffect(() => {
    Promise.all([getTrail(), getRewardProgress(), getTrickStars(), getBinSkin()])
      .then(([id, progress, stars, skin]) => {
        rewardProgress.current = progress;
        levelStars.current = stars[level.id] ?? 0;
        setTrail(bus.current, usableTrail(id, progress));
        setBinSkin(bus.current, usableSkin(skin, progress));
      })
      .catch(() => undefined);
  }, [level.id]);
  const heldEver = useRef(false);
  const missesNoHold = useRef(0);
  // Erste Auswahl: kurz erklären, wie es geht
  useEffect(() => {
    if (choice) showTip("decoy");
  }, [choice, showTip]);
  useEffect(() => {
    const has = (kind: string) => level.props.some((p) => p.kind === kind);
    const ring = level.props.find((p) => p.kind === "ring");
    const motion = ring?.kind === "ring" ? ring.motion : undefined;
    const id = hasWind(level)
      ? "wind"
      : level.binSlide
        ? "movingBin"
        : has("sign")
          ? "sign"
          : has("lamp")
          ? "lamp"
          : has("fence")
          ? "fence"
          : has("windmill")
          ? "windmill"
          : motion?.kind === "spin"
            ? "spin"
            : motion
              ? "movingRing"
              : "stars";
    const timer = setTimeout(() => showTip(id), 900);
    return () => clearTimeout(timer);
  }, [level, showTip]);

  useEffect(() => {
    refreshSfxSetting();
    preloadSfx();
  }, []);

  const float = useCallback((text: string, x: number, y: number, color = "#FFFFFF") => {
    setFloats((f) => [...f.slice(-4), { id: ++ids.current, x, y, text, color }]);
    // VoiceOver: schwebende Rückmeldungen auch vorlesen (ohne Zierzeichen)
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

  const throwShot = (shot: FreeShot) => {
    const current = itemRef.current;
    if (!current || busy.current || done.current) return;
    busy.current = true;
    thrownRef.current = current;
    // Versuch zählt nur für Gegenstände der Zieltonne (falsch Sortiertes zählt bei der Landung)
    if (current.category === target.category) {
      attemptsRef.current += 1;
      setAttempt(attemptsRef.current);
    }
    if (!hasThrown) setHasThrown(true);
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
    // Ein Wurf zur Zeit: der nächste Gegenstand erst nach der Landung
    setItem(null);
    sfx("throw");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  /** Geschafft; `clean` = ohne jede Berührung hinein (Swish). */
  const succeed = (clean: boolean) => {
    done.current = true;
    const attempts = attemptsRef.current;
    const bonus = bonusMet(level.bonus, { attempts, clean });
    const stars = starsFor(attempts, bonus);
    (daily ? saveTrickDaily(stars) : saveTrickStars(level.id, stars)).catch(() => undefined);
    // Tages-Trick: Rangliste (mehr Sterne, dann weniger Versuche)
    if (daily) submitScore(dailyBoard("tagestrick"), trickScore(stars, attempts)).catch(() => undefined);
    // Neue Belohnung (Spur/Sticker) durch die Sterne? (Tages-Trick zählt nicht)
    const before = rewardProgress.current;
    const gained = daily ? 0 : Math.max(0, stars - levelStars.current);
    const unlocked = newlyUnlocked(before, { ...before, stars: before.stars + gained })[0];
    const top = layout.binTops[level.target];
    queueBinEvent(bus.current, level.target, "perfect");
    queueBurst(bus.current, {
      id: ++ids.current,
      x: layout.bins[level.target].x,
      y: 1.75,
      z: layout.bins[level.target].z + 0.1,
      colors: ["#FFD54A", "#FFFFFF", target.colorLight, "#FFB300"],
      count: 32,
      power: 1.3,
      ring: true,
    });
    hitStop(fx.current, 90);
    shake(fx.current, 0.035);
    sfx("perfect");
    sfx("swish");
    if (thrownRef.current) sfxMaterial(itemMaterial(thrownRef.current));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    float("★".repeat(stars), top.x, top.y, "#FFD54A");
    // Swish: ohne Berührung (Reifen durchfliegen zählt nicht als Berührung)
    if (clean) later(() => float(t("trick.swish"), top.x, top.y + 40, "#FFFFFF"), 250);
    // „Wusstest du?“ zum geworfenen Gegenstand
    const thrown = thrownRef.current;
    const fact = thrown ? itemFact(thrown) : undefined;
    const tip = thrown && fact ? { name: itemName(thrown), text: fact } : undefined;
    later(
      () => setResult({ stars, attempts, bonus, unlocked: unlocked && t(unlockMessageKey(unlocked), { name: t(unlocked.name) }), fact: tip }),
      1000,
    );
  };

  /** Nächster Wurf: drei Karten zur Auswahl oder direkt ein Gegenstand. */
  const next = () => {
    if (done.current) return;
    if (choosing) {
      setChoice(drawChoice());
      setChoiceId((n) => n + 1);
    }
    else setItem(draw());
  };

  /** Karte gewählt: richtig → werfen; falsch → zählt als Fehlversuch, die
   *  Tonne, in die er gehört, hüpft, und es gibt drei neue Karten. */
  const pick = (picked: Item) => {
    if (done.current || wrongPick !== null) return;
    if (picked.category === target.category) {
      setChoice(null);
      setItem(picked);
      sfx("tap");
      return;
    }
    attemptsRef.current += 1;
    setAttempt(attemptsRef.current + 1);
    setWrongPick(picked.name);
    const right = bins.findIndex((b) => b.category === picked.category);
    if (right >= 0) queueBinEvent(bus.current, right, "peek");
    // Hinweis steht auf der Karte selbst; VoiceOver liest ihn vor
    AccessibilityInfo.announceForAccessibility(
      t("trick.pickWrong", {
        name: itemName(picked),
        bin: t(bins[right]?.labelKey ?? target.labelKey),
      }),
    );
    sfx("wrong");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    later(() => {
      setWrongPick(null);
      next();
    }, WRONG_PICK_MS);
  };

  const handleLand = (_id: number, outcome?: LandOutcome) => {
    busy.current = false;
    const bin = outcome?.bin ?? null;
    const y = layout.binTops[0].y;
    if (bin === level.target && meetsRequirement(level, outcome?.props ?? [])) {
      succeed(!!outcome?.clean);
      return;
    }
    if (bin === level.target) {
      // In der richtigen Tonne – aber ohne den verlangten Trick
      const needsSign = level.requires.some((i) => level.props[i]?.kind === "sign");
      const rings = level.requires.filter((i) => level.props[i]?.kind === "ring").length;
      float(
        t(needsSign ? "trick.noSign" : rings > 1 ? "trick.noTrickBoth" : "trick.noTrick"),
        screenX(binXs[bin]),
        y,
      );
      sfx("plop");
    } else if (bin !== null) {
      queueBinEvent(bus.current, bin, "reject");
      float(t("trick.wrongBin"), screenX(binXs[bin]), y);
      sfx("plop");
    } else {
      const text = outcome?.near ? t("game.near") : t("game.miss");
      float(text, screenX(outcome?.x ?? 0), y);
      sfx("plop");
    }
    setAttempt(attemptsRef.current + 1);
    // Zweimal daneben, nie gehalten: zeigen, dass Halten die Flugbahn zeigt
    if (!heldEver.current && ++missesNoHold.current >= 2) tips.show("hold");
    later(next, 350);
  };

  // Gesten-Handler (aktuell halten, ohne die Geste neu zu bauen)
  const handlers = useRef({
    begin: () => {},
    aim: (_dx: number, _dy: number, _vy: number) => {},
    release: (_dx: number, _dy: number, _vy: number) => {},
    cancel: () => {},
    land: (_id: number, _outcome?: LandOutcome) => {},
  });
  // Wie im Zielwurf: schnell wischen = normaler Wurf, halten = Flugbahn.
  // Keine Pech-Hilfe hier: sie zöge Würfe zur Tonne – am Reifen vorbei.
  const throwCtx = () => ({
    full: screenH * FULL_SWIPE_SHARE,
    binAngles: layout.binAngles,
    binXs,
  });
  useLayoutEffect(() => {
    handlers.current = {
      begin: () => beginThrow(input.current, Date.now()),
      aim: (dx, dy, vy) => {
        if (busy.current || done.current) return;
        // Länger gehalten: so würde der Wurf jetzt fliegen (Weite klickt leise mit)
        const shot = previewShot(input.current, Date.now(), dx, dy, vy, throwCtx());
        if (!input.current.aiming) return;
        heldEver.current = true;
        setShotGuide(
          bus.current,
          shot && itemRef.current
            ? { ...shotLanding(layout, shot), strength: shot.strength, ...feelOf(itemRef.current) }
            : null,
        );
        if (stepClick(input.current, shot)) Haptics.selectionAsync().catch(() => undefined);
      },
      release: (dx, dy, vy) => {
        setShotGuide(bus.current, null);
        if (busy.current || done.current) return;
        const aiming = input.current.aiming && -vy < FLICK_SPEED;
        const shot = releaseShot(input.current, dx, dy, vy, throwCtx());
        if (shot && __DEV__)
          // Zum Nachjustieren (landet im Metro-Log)
          console.log(
            `[wurf] trick ${aiming ? "halten" : "wisch"} länge=${Math.round(Math.hypot(dx, dy))}px tempo=${Math.round(-vy)} kraft=${shot.strength.toFixed(2)} weite=${shot.depth.toFixed(2)}`,
          );
        if (shot) throwShot(shot);
        // Nach unten gewischt? Kurz erklären, wie es geht
        else if (dy > 60) float(`👆 ${t("game.swipeHint")}`, screenW / 2, layout.binTops[0].y);
      },
      cancel: () => {
        setShotGuide(bus.current, null);
      },
      land: handleLand,
    };
  });
  useEffect(() => {
    const b = bus.current;
    setLandHandler(b, (id, outcome) => handlers.current.land(id, outcome));
    return () => setLandHandler(b, () => undefined);
  }, []);

  const onBegin = useCallback(() => handlers.current.begin(), []);
  const onAim = useCallback(
    (dx: number, dy: number, vy: number) => handlers.current.aim(dx, dy, vy),
    [],
  );
  const onRelease = useCallback(
    (dx: number, dy: number, vy: number) => handlers.current.release(dx, dy, vy),
    [],
  );
  const onCancel = useCallback(() => handlers.current.cancel(), []);
  const finished = result !== null;
  /* eslint-disable react-hooks/refs */
  // Während der Auswahl nicht werfen (die Karten nehmen das Tippen an)
  const picking = choice !== null;
  const gesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(!finished && !picking)
      .runOnJS(true)
      .minDistance(6)
      .onBegin(onBegin)
      .onUpdate((e) => onAim(e.translationX, e.translationY, e.velocityY))
      .onEnd((e) => onRelease(e.translationX, e.translationY, e.velocityY))
      .onFinalize(onCancel);
  }, [onBegin, onAim, onRelease, onCancel, finished, picking]);
  /* eslint-enable react-hooks/refs */
  const onFloatDone = useCallback((id: number) => {
    setFloats((f) => f.filter((x) => x.id !== id));
  }, []);

  const ready = screenW > 0 && screenH > 0;
  const itemTagTop = layout.item.screen.y + screenW * 0.15 + 4;
  const wrongItem = choice?.find((c) => c.name === wrongPick);
  const wrongBin = wrongItem ? bins.find((b) => b.category === wrongItem.category) : undefined;
  const wrongPickNote = wrongBin ? t("trick.goesIn", { bin: t(wrongBin.labelKey) }) : undefined;
  // Auswahl-Karten dort, wo sonst der Gegenstand schwebt
  const choiceTop = layout.item.screen.y - 56;
  // Tipps knapp unter den Tonnen – im Bild, aber nicht über dem Wurf
  const tipTop = Math.max(0, ...layout.binRects.map((r) => r.y + r.h)) + 10;
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
            warmItems={warmItems}
          />
        )}
        {ready && (
          <>
            {floats.map((f) => (
              <FloatingText key={f.id} item={f} onDone={onFloatDone} />
            ))}
            <View
              pointerEvents="box-none"
              style={[styles.top, { paddingTop: insets.top + Spacing.sm }]}
            >
              <IconButton icon="x" label={t("common.close")} onPress={onExit} />
              <TrickHud
                title={daily ? t("tricks.daily") : t("tricks.level", { n: level.id })}
                attempt={attempt}
                task={choice ? t("trick.pickTask", { bin: t(target.labelKey) }) : t(level.task)}
                bonus={level.bonus}
              />
              <View style={styles.topSpacer} />
            </View>
            {choice && !finished && (
              <View pointerEvents="box-none" style={[styles.overlayRow, { top: choiceTop }]}>
                <ChoiceCards
                  key={choiceId}
                  items={choice}
                  wrong={wrongPick}
                  wrongNote={wrongPickNote}
                  onPick={pick}
                />
              </View>
            )}
            {item && !finished && (
              <View pointerEvents="none" style={[styles.overlayRow, { top: itemTagTop }]}>
                <ItemCard key={item.name} item={item} showHint={!hasThrown} hint={t("trick.hint")}
                  mass={hasWind(level) ? itemMass(item) : undefined}
                />
              </View>
            )}
          </>
        )}
        {ready && tips.tip && !finished && (
          <View pointerEvents="box-none" style={[styles.overlayRow, { top: tipTop }]}>
            <TipCard text={t(tips.tip.key)} onClose={tips.dismiss} />
          </View>
        )}
        {result && (
          <TrickResult
            stars={result.stars}
            attempts={result.attempts}
            bonus={level.bonus}
            bonusDone={result.bonus}
            unlocked={result.unlocked}
            fact={result.fact}
            title={daily || !isLast ? t("trick.done") : t("trick.allDone")}
            isLast={isLast}
            onNext={onNext}
            onRetry={onRetry}
            onLevels={onExit}
          />
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
  overlayRow: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    alignItems: "center",
  },
});
