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
//
// Gleiche Töne werden minimal variiert (gegen Ermüdung).
// Die Töne entstehen per Skript: scripts/generate-sfx.mjs

import { type AudioPlayer, createAudioPlayer } from "expo-audio";

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
  fever: { volume: 0.45, vary: 0 },
  levelup: { volume: 0.5, vary: 0 },
  end: { volume: 0.45, vary: 0 },
  tick: { volume: 0.3, vary: 0 },
  tap: { volume: 0.25, vary: 0.03 },
};

/** Mehrere Player pro Ton, reihum: bei schnellen Würfen überlappen Töne,
 *  statt dass ein noch laufender Ton abgeschnitten oder verschluckt wird. */
const POOL_SIZE = 3;
const players = new Map<SfxName, { list: AudioPlayer[]; next: number }>();
let enabled = true;

function player(name: SfxName): AudioPlayer {
  let pool = players.get(name);
  if (!pool) {
    pool = {
      list: Array.from({ length: POOL_SIZE }, () => {
        const p = createAudioPlayer(SOURCES[name]);
        p.shouldCorrectPitch = false;
        return p;
      }),
      next: 0,
    };
    players.set(name, pool);
  }
  const p = pool.list[pool.next];
  pool.next = (pool.next + 1) % POOL_SIZE;
  return p;
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
  try {
    const p = player(name);
    const mix = MIX[name];
    const rate = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * mix.vary);
    p.volume = Math.min(1, mix.volume * (opts.volume ?? 1));
    p.setPlaybackRate(Math.min(2, Math.max(0.5, rate)));
    p.seekTo(0);
    p.play();
  } catch {
    // Sound ist Bonus – Spiel läuft weiter.
  }
}

/** Treffer-Melodie: jede Stufe der Serie eine Note höher (bis Note 8). */
export function sfxStreak(streak: number) {
  const step = Math.max(1, Math.min(8, streak)) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  sfx(`note${step}`);
}

export function preloadSfx(names: SfxName[] = Object.keys(SOURCES) as SfxName[]) {
  names.forEach((n) => player(n));
}
