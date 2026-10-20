// Datei: utils/sfx.ts — Sound-Manager
//
// Wann welcher Ton? (Sound-Design-Regeln)
//  aim      neue Tonne anvisiert          leise, sofort (Orientierung)
//  lid      Deckel geht auf               Vorfreude
//  whoosh   Wurf                          Tempo variiert mit Schwung
//  pop+munch Treffer                      befriedigend „Plopp + Mampf“
//  chimeN   Serie 1…6                     steigt in der Tonleiter → „noch einer!“
//  perfect  Perfekt-Wurf                  funkelt, ersetzt chime
//  boing+thud Fehler                      lustig-weich, nie strafend
//  fever    Fieber startet                Höhepunkt
//  tick     letzte 5 Sekunden             Spannung
//  levelup  Level-Aufstieg                Belohnung
//  wahwah   Runde verloren (Ohne Fehler)  mit Humor statt Frust
//  tap      Menü                          dezent
//
// Gegen Ermüdung: gleiche Sounds werden leicht in Tonhöhe/Tempo variiert.
// Die Sounds entstehen per Skript: scripts/generate-sfx.mjs

import { type AudioPlayer, createAudioPlayer } from "expo-audio";

import { getBoolean, StorageKeys } from "@/utils/storage";

const SOURCES = {
  aim: require("../assets/sounds/sfx/aim.wav"),
  lid: require("../assets/sounds/sfx/lid.wav"),
  whoosh: require("../assets/sounds/sfx/whoosh.wav"),
  pop: require("../assets/sounds/sfx/pop.wav"),
  munch: require("../assets/sounds/sfx/munch.wav"),
  chime1: require("../assets/sounds/sfx/chime1.wav"),
  chime2: require("../assets/sounds/sfx/chime2.wav"),
  chime3: require("../assets/sounds/sfx/chime3.wav"),
  chime4: require("../assets/sounds/sfx/chime4.wav"),
  chime5: require("../assets/sounds/sfx/chime5.wav"),
  chime6: require("../assets/sounds/sfx/chime6.wav"),
  perfect: require("../assets/sounds/sfx/perfect.wav"),
  boing: require("../assets/sounds/sfx/boing.wav"),
  thud: require("../assets/sounds/sfx/thud.wav"),
  fever: require("../assets/sounds/sfx/fever.wav"),
  tick: require("../assets/sounds/sfx/tick.wav"),
  levelup: require("../assets/sounds/sfx/levelup.wav"),
  wahwah: require("../assets/sounds/sfx/wahwah.wav"),
  tap: require("../assets/sounds/sfx/tap.wav"),
} as const;

export type SfxName = keyof typeof SOURCES;

/** Mischpult: Grundlautstärke + Variation (± Anteil der Tonhöhe). */
const MIX: Record<SfxName, { volume: number; vary: number }> = {
  aim: { volume: 0.25, vary: 0.04 },
  lid: { volume: 0.35, vary: 0.06 },
  whoosh: { volume: 0.45, vary: 0.08 },
  pop: { volume: 0.65, vary: 0.07 },
  munch: { volume: 0.55, vary: 0.08 },
  chime1: { volume: 0.5, vary: 0 },
  chime2: { volume: 0.5, vary: 0 },
  chime3: { volume: 0.5, vary: 0 },
  chime4: { volume: 0.5, vary: 0 },
  chime5: { volume: 0.5, vary: 0 },
  chime6: { volume: 0.5, vary: 0 },
  perfect: { volume: 0.6, vary: 0 },
  boing: { volume: 0.55, vary: 0.06 },
  thud: { volume: 0.5, vary: 0.1 },
  fever: { volume: 0.6, vary: 0 },
  tick: { volume: 0.4, vary: 0 },
  levelup: { volume: 0.6, vary: 0 },
  wahwah: { volume: 0.55, vary: 0 },
  tap: { volume: 0.3, vary: 0.05 },
};

const players = new Map<SfxName, AudioPlayer>();
let enabled = true;

function player(name: SfxName): AudioPlayer {
  let p = players.get(name);
  if (!p) {
    p = createAudioPlayer(SOURCES[name]);
    p.shouldCorrectPitch = false; // Tempo-Variation soll die Tonhöhe ändern
    players.set(name, p);
  }
  return p;
}

/** Einstellung „Töne“ neu einlesen (beim Start einer Runde / des Menüs). */
export async function refreshSfxSetting() {
  enabled = await getBoolean(StorageKeys.SOUND_ENABLED, true);
}

export function setSfxEnabled(value: boolean) {
  enabled = value;
}

/** Spielt einen Sound. `rate` verschiebt Tonhöhe/Tempo zusätzlich (z. B. Wurfschwung). */
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

/** Serien-Glöckchen: je länger die Serie, desto höher der Ton. */
export function sfxStreak(streak: number) {
  const step = Math.max(1, Math.min(6, streak)) as 1 | 2 | 3 | 4 | 5 | 6;
  sfx(`chime${step}`);
}

/** Vorladen, damit der erste Ton nicht verzögert kommt. */
export function preloadSfx(names: SfxName[] = Object.keys(SOURCES) as SfxName[]) {
  names.forEach((n) => player(n));
}
