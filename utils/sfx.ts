// Datei: utils/sfx.ts — dezentes Sound-Feedback
//
// Wann welcher Ton? Pro Aktion höchstens 1–2 leise Töne:
//  aim      neue Tonne anvisiert      kaum hörbares Holz-Tick
//  throw    Wurf                      weicher Luftzug
//  land     Gegenstand in der Tonne   dumpfes „Tock“
//  noteN    Treffer 1…8 in Folge      Marimba, steigt in der Pentatonik → Melodie
//  perfect  Perfekt-Wurf              zwei helle Kalimba-Töne
//  wrong    falsche Tonne             weicher, tiefer Doppelton (nie strafend)
//  fever    Fieber startet            Kalimba-Arpeggio
//  levelup  Level-Aufstieg            warmes Arpeggio
//  end      Rundenende                ruhiger Akkord
//  tick     letzte 5 Sekunden         leises Holz
//  tap      Menü                      dezent
//  swish    Zielwurf ohne Berührung   luftiges Netz-Rauschen
//  rim/lid  Abprallen (Zielwurf)      Kunststoff-„Klong“ / dumpfes „Tock“
//  plop     Zielwurf daneben          weich, nie strafend
//  boing    Trampolin (Trickwürfe)    federnd
//  car      Autodach (Trickwürfe)     dumpfes Blech
//
// Gleiche Töne werden minimal variiert (gegen Ermüdung).
// Die Töne entstehen per Skript: scripts/generate-sfx.mjs

import { type AudioPlayer, createAudioPlayer } from "expo-audio";

import { perfMark } from "@/utils/perf-marks";
import { type Material } from "@/game/item-mass";
import { getBoolean, StorageKeys } from "@/utils/storage";

const SOURCES = {
  aim: require("../assets/sounds/sfx/aim.wav"),
  throw: require("../assets/sounds/sfx/throw.wav"),
  land: require("../assets/sounds/sfx/land.wav"),
  note1: require("../assets/sounds/sfx/note1.wav"),
  note2: require("../assets/sounds/sfx/note2.wav"),
  note3: require("../assets/sounds/sfx/note3.wav"),
  note4: require("../assets/sounds/sfx/note4.wav"),
  note5: require("../assets/sounds/sfx/note5.wav"),
  note6: require("../assets/sounds/sfx/note6.wav"),
  note7: require("../assets/sounds/sfx/note7.wav"),
  note8: require("../assets/sounds/sfx/note8.wav"),
  perfect: require("../assets/sounds/sfx/perfect.wav"),
  wrong: require("../assets/sounds/sfx/wrong.wav"),
  fever: require("../assets/sounds/sfx/fever.wav"),
  levelup: require("../assets/sounds/sfx/levelup.wav"),
  end: require("../assets/sounds/sfx/end.wav"),
  tick: require("../assets/sounds/sfx/tick.wav"),
  tap: require("../assets/sounds/sfx/tap.wav"),
  swish: require("../assets/sounds/sfx/swish.wav"),
  rim: require("../assets/sounds/sfx/rim.wav"),
  lid: require("../assets/sounds/sfx/lid.wav"),
  plop: require("../assets/sounds/sfx/plop.wav"),
  matGlass: require("../assets/sounds/sfx/matGlass.wav"),
  matPaper: require("../assets/sounds/sfx/matPaper.wav"),
  matPlastic: require("../assets/sounds/sfx/matPlastic.wav"),
  matMetal: require("../assets/sounds/sfx/matMetal.wav"),
  matBio: require("../assets/sounds/sfx/matBio.wav"),
  matRest: require("../assets/sounds/sfx/matRest.wav"),
  star1: require("../assets/sounds/sfx/star1.wav"),
  star2: require("../assets/sounds/sfx/star2.wav"),
  star3: require("../assets/sounds/sfx/star3.wav"),
  comboUp: require("../assets/sounds/sfx/comboUp.wav"),
  unlock: require("../assets/sounds/sfx/unlock.wav"),
} as const;

export type SfxName = keyof typeof SOURCES;

/** Mischpult: bewusst leise, Treffer-Melodie steht im Vordergrund. */
const MIX: Record<SfxName, { volume: number; vary: number }> = {
  aim: { volume: 0.18, vary: 0.03 },
  throw: { volume: 0.3, vary: 0.06 },
  land: { volume: 0.4, vary: 0.05 },
  note1: { volume: 0.45, vary: 0 },
  note2: { volume: 0.45, vary: 0 },
  note3: { volume: 0.45, vary: 0 },
  note4: { volume: 0.45, vary: 0 },
  note5: { volume: 0.45, vary: 0 },
  note6: { volume: 0.45, vary: 0 },
  note7: { volume: 0.45, vary: 0 },
  note8: { volume: 0.45, vary: 0 },
  perfect: { volume: 0.45, vary: 0 },
  wrong: { volume: 0.4, vary: 0.02 },
  fever: { volume: 0.55, vary: 0 }, // wichtiger Moment – war zu leise
  levelup: { volume: 0.5, vary: 0 },
  end: { volume: 0.5, vary: 0 },
  tick: { volume: 0.3, vary: 0 },
  tap: { volume: 0.25, vary: 0.03 },
  swish: { volume: 0.5, vary: 0.04 },
  rim: { volume: 0.5, vary: 0.05 },
  lid: { volume: 0.5, vary: 0.05 },
  plop: { volume: 0.4, vary: 0.05 },
  matGlass: { volume: 0.42, vary: 0.06 },
  matPaper: { volume: 0.45, vary: 0.08 },
  matPlastic: { volume: 0.42, vary: 0.07 },
  matMetal: { volume: 0.4, vary: 0.06 },
  matBio: { volume: 0.5, vary: 0.06 },
  matRest: { volume: 0.48, vary: 0.06 },
  star1: { volume: 0.4, vary: 0 }, // Sterne lagen über „Perfekt“ und Level-Aufstieg
  star2: { volume: 0.4, vary: 0 },
  star3: { volume: 0.4, vary: 0 },
  comboUp: { volume: 0.5, vary: 0 },
  unlock: { volume: 0.55, vary: 0 },
};

/** Mehrere Player pro Ton, reihum: bei schnellen Würfen überlappen Töne,
 *  statt dass ein noch laufender Ton abgeschnitten oder verschluckt wird. */
const POOL_SIZE: Partial<Record<SfxName, number>> = {
  throw: 3,
  land: 3,
  aim: 2,
  wrong: 2,
  note1: 2,
  note2: 2,
  note3: 2,
  note4: 2,
  note5: 2,
  note6: 2,
  note7: 2,
  note8: 2,
  rim: 3,
  lid: 2,
  matGlass: 2,
  matPaper: 2,
  matPlastic: 2,
  matMetal: 2,
  matBio: 2,
  matRest: 2,
};
/** Ein Player mit zuletzt gesetzter Lautstärke/Tonhöhe: jeder Aufruf ans
 *  Handy-System kostet Zeit auf dem Thread, auf dem auch die 3D-Szene läuft. */
type Voice = { p: AudioPlayer; volume: number; rate: number };

const players = new Map<SfxName, { list: Voice[]; next: number }>();
let enabled = true;

function player(name: SfxName): Voice {
  let pool = players.get(name);
  if (!pool) {
    pool = {
      list: Array.from({ length: POOL_SIZE[name] ?? 1 }, () => {
        // Audio-Sitzung aktiv lassen: Sonst schaltet iOS sie nach jedem Ton ab,
        // und das nächste play() schaltet sie synchron wieder ein – das hielt
        // das Spiel bei jedem Wurf 40–90 ms an. Statusmeldungen selten (die
        // Töne sind kürzer als 1 s; niemand hört hier zu).
        const p = createAudioPlayer(SOURCES[name], {
          keepAudioSessionActive: true,
          updateInterval: 2000,
        });
        p.shouldCorrectPitch = false;
        return { p, volume: -1, rate: -1 };
      }),
      next: 0,
    };
    players.set(name, pool);
  }
  const v = pool.list[pool.next];
  pool.next = (pool.next + 1) % pool.list.length;
  return v;
}

/** Einstellung „Töne“ neu einlesen (beim Start einer Runde / des Menüs). */
export async function refreshSfxSetting() {
  enabled = await getBoolean(StorageKeys.SOUND_ENABLED, true);
}

export function setSfxEnabled(value: boolean) {
  enabled = value;
}

export function sfx(name: SfxName, opts: { rate?: number; volume?: number } = {}) {
  if (!enabled) return;
  const start = __DEV__ ? performance.now() : 0;
  try {
    const v = player(name);
    const mix = MIX[name];
    const rate = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * mix.vary);
    // Auf hörbare Stufen runden: gleiche Werte werden nicht erneut gesetzt
    const volume = Math.round(Math.min(1, mix.volume * (opts.volume ?? 1)) * 20) / 20;
    const speed = Math.round(Math.min(2, Math.max(0.5, rate)) * 50) / 50;
    if (volume !== v.volume) {
      v.p.volume = volume;
      v.volume = volume;
    }
    if (speed !== v.rate) {
      v.p.setPlaybackRate(speed);
      v.rate = speed;
    }
    v.p.seekTo(0);
    v.p.play();
  } catch {
    // Sound ist Bonus – Spiel läuft weiter.
  }
  if (__DEV__) perfMark(`ton:${name}`, performance.now() - start);
}

/** Treffer-Melodie: jede Stufe der Serie eine Note höher (bis Note 8). */
/** Landeklang je Material des Gegenstands (Glas klirrt, Papier raschelt …). */
export function sfxMaterial(material: Material, opts: { rate?: number; volume?: number } = {}) {
  sfx(MATERIAL_SOUND[material], opts);
}

const MATERIAL_SOUND: Record<Material, SfxName> = {
  glas: "matGlass",
  papier: "matPaper",
  plastik: "matPlastic",
  metall: "matMetal",
  bio: "matBio",
  rest: "matRest",
};

export function sfxStreak(streak: number) {
  const step = Math.max(1, Math.min(8, streak)) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  sfx(`note${step}`);
}

export function preloadSfx(names: SfxName[] = Object.keys(SOURCES) as SfxName[]) {
  names.forEach((n) => player(n));
}
