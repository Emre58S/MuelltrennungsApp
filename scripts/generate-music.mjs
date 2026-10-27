// Datei: scripts/generate-music.mjs
// Hintergrundmusik per Synthese: drei nahtlose Schleifen in C-Dur (wie die
// Effekte), damit nichts schräg klingt (WAV, 22,05 kHz, mono – klein genug).
// Aufruf:  node scripts/generate-music.mjs
//
//  - menu:      ruhig (84 BPM): weiche Fläche, Kalimba-Arpeggio, sanfter Bass
//  - game:      lebendiger (104 BPM): Marimba-Arpeggio, Bass, leiser Shaker
//  - endspurt:  schneller und spannender (128 BPM): wie game, dichter
//
// Nahtlos: Jede Schleife wird zweimal hintereinander gespielt und mit Hall
// gerechnet; gespeichert wird die zweite Runde – so klingt der Hall vom
// Ende in den Anfang hinein, und beim Wiederholen gibt es keinen Knacks.

import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createSynth } from "./synth.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sounds", "music");
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".wav")) unlinkSync(join(OUT, f));

const { RATE, TAU, partial, marimba, kalimba, mallet, reverb, write } = createSynth({ rate: 22050, out: OUT });

/** Halbtöne → Frequenz (C4 = 0). */
const note = (semi) => 261.63 * 2 ** (semi / 12);

// Akkorde (Halbtöne über C4): C – Am – F – G, je zwei Takte
const CHORDS = [
  [0, 4, 7], // C
  [-3, 0, 4], // Am
  [-7, -3, 0], // F
  [-5, -1, 2], // G
];

/** Weiche Fläche: Sinus-Akkord mit langsamem Ein- und Ausblenden. */
function pad(out, { start, dur, semis, vol }) {
  const s0 = Math.round(start * RATE);
  const n = Math.round(dur * RATE);
  for (const semi of semis) {
    const f = note(semi - 12);
    for (let i = 0; i < n && s0 + i < out.length; i++) {
      const t = i / RATE;
      const env = Math.min(t / 0.5, 1) * Math.min((dur - t) / 0.6, 1);
      out[s0 + i] += (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2.003 * t)) * vol * Math.max(env, 0);
    }
  }
}

/** Weicher Bass-Ton (Sinus + etwas Oberton). */
function bass(out, { start, semi, vol, decay = 0.35 }) {
  partial(out, { start, f: note(semi - 24), vol, decay, attack: 0.01 });
  partial(out, { start, f: note(semi - 12), vol: vol * 0.25, decay: decay * 0.6, attack: 0.01 });
}

/** Leiser Shaker (kurzes, helles Rauschen). */
function shaker(out, { start, vol }) {
  mallet(out, { start, vol, dur: 0.03, bright: 0.9 });
}

/** Weicher „Bauch“-Schlag. */
function kick(out, { start, vol }) {
  partial(out, { start, f: 55, vol, decay: 0.12, glide: 80, glideTime: 0.03, attack: 0.003 });
}

/** Eine Schleife (8 Takte) zweimal rendern, Hall drauf, zweite Runde nehmen. */
function render(name, { bpm, room, level, play }) {
  const beat = 60 / bpm;
  const loop = 8 * 4 * beat;
  const twice = new Float32Array(Math.round(loop * 2 * RATE));
  for (const offset of [0, loop]) play(twice, { offset, beat });
  const wet = reverb(twice, { mix: room, size: 1.3, damp: 0.35 });
  const one = wet.slice(Math.round(loop * RATE), Math.round(loop * RATE) + Math.round(loop * RATE));
  write(name, one, { level, loop: true });
}

// Arpeggio-Muster je Takt (Index in den Akkord, oktaviert)
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];

render("menu", {
  bpm: 84,
  room: 0.32,
  level: 0.7,
  play(out, { offset, beat }) {
    for (let bar = 0; bar < 8; bar++) {
      const chord = CHORDS[bar >> 1];
      const t0 = offset + bar * 4 * beat;
      if (bar % 2 === 0) pad(out, { start: t0, dur: 8 * beat, semis: chord, vol: 0.06 });
      bass(out, { start: t0, semi: chord[0], vol: 0.22, decay: 0.6 });
      bass(out, { start: t0 + 2 * beat, semi: chord[0], vol: 0.14, decay: 0.5 });
      // Kalimba-Arpeggio in Achteln, jeder zweite Takt eine Oktave höher
      ARP.forEach((k, i) => {
        const semi = chord[k] + 12 + (bar % 2) * 12 * (i % 4 === 3 ? 1 : 0);
        kalimba(out, { start: t0 + (i * beat) / 2, f: note(semi), vol: i % 2 ? 0.07 : 0.1, decay: 0.45 });
      });
    }
  },
});

render("game", {
  bpm: 104,
  room: 0.22,
  level: 0.72,
  play(out, { offset, beat }) {
    for (let bar = 0; bar < 8; bar++) {
      const chord = CHORDS[bar >> 1];
      const t0 = offset + bar * 4 * beat;
      if (bar % 2 === 0) pad(out, { start: t0, dur: 8 * beat, semis: chord, vol: 0.04 });
      for (let b = 0; b < 4; b++) {
        kick(out, { start: t0 + b * beat, vol: b % 2 ? 0.12 : 0.2 });
        shaker(out, { start: t0 + (b + 0.5) * beat, vol: 0.06 });
      }
      bass(out, { start: t0, semi: chord[0], vol: 0.24, decay: 0.3 });
      bass(out, { start: t0 + 1.5 * beat, semi: chord[0], vol: 0.16, decay: 0.2 });
      bass(out, { start: t0 + 2.5 * beat, semi: chord[2] - 12, vol: 0.16, decay: 0.2 });
      ARP.forEach((k, i) => {
        marimba(out, { start: t0 + (i * beat) / 2, f: note(chord[k] + 12), vol: i % 2 ? 0.08 : 0.12, decay: 0.18 });
      });
    }
  },
});

render("endspurt", {
  bpm: 128,
  room: 0.18,
  level: 0.75,
  play(out, { offset, beat }) {
    for (let bar = 0; bar < 8; bar++) {
      const chord = CHORDS[bar >> 1];
      const t0 = offset + bar * 4 * beat;
      for (let b = 0; b < 4; b++) {
        kick(out, { start: t0 + b * beat, vol: 0.22 });
        for (let s = 1; s < 4; s++) shaker(out, { start: t0 + (b + s / 4) * beat, vol: s === 2 ? 0.07 : 0.04 });
      }
      // Treibender Bass in Achteln
      for (let e = 0; e < 8; e++)
        bass(out, { start: t0 + (e * beat) / 2, semi: e % 4 === 3 ? chord[2] - 12 : chord[0], vol: 0.15, decay: 0.14 });
      // Arpeggio in Sechzehnteln, aufwärts
      for (let s = 0; s < 16; s++) {
        const k = [0, 1, 2, 1][s % 4];
        marimba(out, { start: t0 + (s * beat) / 4, f: note(chord[k] + 12 + (s >= 8 ? 12 : 0)), vol: 0.07, decay: 0.12 });
      }
    }
  },
});
