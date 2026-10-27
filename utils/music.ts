// Datei: utils/music.ts
// Hintergrundmusik (Schleifen aus scripts/generate-music.mjs): Menü ruhig,
// Runde lebendiger, Endspurt schneller. Wechsel blenden sanft über. Leise
// gemischt, damit die Effekte vorn bleiben. Eigener Schalter in den
// Einstellungen („Musik“), unabhängig von „Töne“.

import { type AudioPlayer, createAudioPlayer } from "expo-audio";

import { getBoolean, StorageKeys } from "@/utils/storage";

const TRACKS = {
  menu: require("../assets/sounds/music/menu.wav"),
  game: require("../assets/sounds/music/game.wav"),
  endspurt: require("../assets/sounds/music/endspurt.wav"),
} as const;

export type Track = keyof typeof TRACKS;

/** Lautstärke je Stück (Effekte liegen bei 0,3–0,5). */
const VOLUME: Record<Track, number> = { menu: 0.28, game: 0.22, endspurt: 0.26 };
/** Überblenden (ms) und Schrittweite. */
const FADE_MS = 700;
const STEP_MS = 50;

let enabled = true;
/** Was gerade laufen soll (auch wenn die Musik aus ist – für das Einschalten). */
let wanted: Track | null = null;
let current: { name: Track; player: AudioPlayer } | null = null;
const players = new Map<Track, AudioPlayer>();
const fades = new Map<AudioPlayer, ReturnType<typeof setInterval>>();

function playerFor(name: Track): AudioPlayer {
  let p = players.get(name);
  if (!p) {
    p = createAudioPlayer(TRACKS[name], { keepAudioSessionActive: true, updateInterval: 5000 });
    p.loop = true;
    p.volume = 0;
    players.set(name, p);
  }
  return p;
}

/** Lautstärke weich auf `to` bringen; bei 0 danach anhalten. */
function fade(p: AudioPlayer, to: number) {
  const running = fades.get(p);
  if (running) clearInterval(running);
  const from = p.volume;
  const steps = Math.max(1, Math.round(FADE_MS / STEP_MS));
  let k = 0;
  const timer = setInterval(() => {
    k += 1;
    p.volume = from + (to - from) * (k / steps);
    if (k >= steps) {
      clearInterval(timer);
      fades.delete(p);
      if (to === 0) p.pause();
    }
  }, STEP_MS);
  fades.set(p, timer);
}

/** Stück spielen (bzw. weiterlaufen lassen, wenn es schon läuft). */
export function playMusic(name: Track) {
  wanted = name;
  if (!enabled) return;
  if (current?.name === name) return;
  try {
    if (current) fade(current.player, 0);
    const p = playerFor(name);
    p.seekTo(0);
    p.play();
    fade(p, VOLUME[name]);
    current = { name, player: p };
  } catch {
    // Musik ist Bonus – Spiel läuft weiter.
  }
}

/** Musik ausblenden (z. B. beim Verlassen). */
export function stopMusic() {
  wanted = null;
  if (current) fade(current.player, 0);
  current = null;
}

/** Schalter „Musik“: sofort aus- bzw. wieder einblenden. */
export function setMusicEnabled(value: boolean) {
  if (value === enabled) return;
  enabled = value;
  if (!value) {
    const keep = wanted;
    stopMusic();
    wanted = keep;
  } else if (wanted) {
    const next = wanted;
    current = null;
    playMusic(next);
  }
}

/** Einstellung neu einlesen (beim Start von Menü bzw. Runde). */
export async function refreshMusicSetting() {
  setMusicEnabled(await getBoolean(StorageKeys.MUSIC_ENABLED, true));
}
