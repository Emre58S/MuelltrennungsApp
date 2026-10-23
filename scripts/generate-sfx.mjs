// Datei: scripts/generate-sfx.mjs
// Erzeugt das ruhige Klangset per Synthese (WAV, 22,05 kHz, 16 Bit, mono).
// Aufruf:  node scripts/generate-sfx.mjs
//
// Leitbild: angenehm & dezent wie Marimba/Kalimba (Alto's Adventure,
// Monument Valley). Alle Töne liegen in C-Dur-Pentatonik → klingen
// miteinander immer harmonisch. Fehler = weicher, tiefer Ton (nie strafend).

import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sounds", "sfx");
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".wav")) unlinkSync(join(OUT, f));

const TAU = Math.PI * 2;
const buf = (sec) => new Float32Array(Math.round(sec * RATE));

let seed = 777;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

/** Sinus-Teilton mit exponentiellem Abklingen. */
function partial(out, { start = 0, f, vol, decay, attack = 0.002, dur = decay * 6 }) {
  const s0 = Math.round(start * RATE);
  const n = Math.round(dur * RATE);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / RATE;
    const env = t < attack ? t / attack : Math.exp(-(t - attack) / decay);
    out[s0 + i] += Math.sin(TAU * f * t) * vol * env;
  }
}

/** Marimba: Grundton + typische Obertöne (≈4× und ≈10×) + weicher Schlägel. */
function marimba(out, { start = 0, f, vol = 0.5, decay = 0.22 }) {
  partial(out, { start, f, vol, decay });
  partial(out, { start, f: f * 3.93, vol: vol * 0.18, decay: decay * 0.25 });
  partial(out, { start, f: f * 9.8, vol: vol * 0.05, decay: decay * 0.08 });
  mallet(out, { start, vol: vol * 0.15 });
}

/** Kalimba: warmer Grundton, leichter Oberton, längeres Ausklingen. */
function kalimba(out, { start = 0, f, vol = 0.45, decay = 0.4 }) {
  partial(out, { start, f, vol, decay });
  partial(out, { start, f: f * 2.0, vol: vol * 0.12, decay: decay * 0.4 });
  partial(out, { start, f: f * 5.4, vol: vol * 0.04, decay: decay * 0.1 });
}

/** Kurzer, weicher Anschlag (gefiltertes Rauschen). */
function mallet(out, { start = 0, vol = 0.1, dur = 0.012 }) {
  const s0 = Math.round(start * RATE);
  let low = 0;
  for (let i = 0; i < dur * RATE && s0 + i < out.length; i++) {
    low += 0.35 * (noise() - low);
    out[s0 + i] += low * vol * (1 - i / (dur * RATE));
  }
}

/** Luftzug: gefiltertes Rauschen mit Hüllkurve. */
function air(out, { dur, vol, peak = 0.4, lp0 = 0.04, lp1 = 0.2 }) {
  let low = 0;
  let prev = 0;
  for (let i = 0; i < out.length && i < dur * RATE; i++) {
    const p = i / (dur * RATE);
    const env = p < peak ? Math.sin((p / peak) * (Math.PI / 2)) : Math.cos(((p - peak) / (1 - peak)) * (Math.PI / 2));
    low += (lp0 + (lp1 - lp0) * p) * (noise() - low);
    const hp = low - prev * 0.7;
    prev = low;
    out[i] += hp * vol * env;
  }
}

function write(name, data, level = 0.8) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? level / peak : 1;
  const fade = Math.min(48, data.length >> 2);
  const pcm = Buffer.alloc(44 + data.length * 2);
  pcm.write("RIFF", 0);
  pcm.writeUInt32LE(36 + data.length * 2, 4);
  pcm.write("WAVEfmt ", 8);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20);
  pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(RATE, 24);
  pcm.writeUInt32LE(RATE * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36);
  pcm.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) => {
    let s = v * gain;
    if (i < fade) s *= i / fade;
    if (i > data.length - fade) s *= (data.length - i) / fade;
    pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(s * 32767))), 44 + i * 2);
  });
  writeFileSync(join(OUT, `${name}.wav`), pcm);
  console.log(`✓ ${name}.wav  ${(data.length / RATE).toFixed(2)} s`);
}

// C-Dur-Pentatonik, zwei Oktaven aufwärts
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

/* ── Sounds ─────────────────────────────────────────────────── */

// Zielen: kaum hörbares Holz-Tick (Orientierung, kein Lärm)
{
  const b = buf(0.06);
  partial(b, { f: 1800, vol: 0.4, decay: 0.008 });
  mallet(b, { vol: 0.2, dur: 0.006 });
  write("aim", b, 0.6);
}

// Wurf: weicher, kurzer Luftzug
{
  const b = buf(0.26);
  air(b, { dur: 0.26, vol: 1, peak: 0.35 });
  write("throw", b, 0.7);
}

// Treffer: dumpfes Holz-„Tock“ (Gegenstand landet in der Tonne)
{
  const b = buf(0.14);
  partial(b, { f: 196, vol: 0.6, decay: 0.035 });
  partial(b, { f: 392, vol: 0.15, decay: 0.015 });
  mallet(b, { vol: 0.25 });
  write("land", b, 0.75);
}

// Serien-Noten: jeder weitere Treffer eine Stufe höher → kleine Melodie
SCALE.forEach((f, i) => {
  const b = buf(0.6);
  marimba(b, { f, vol: 0.5, decay: 0.2 });
  write(`note${i + 1}`, b, 0.75);
});

// Perfekt: zwei helle Kalimba-Töne (Terz) – funkelnd, aber sanft
{
  const b = buf(0.9);
  kalimba(b, { f: 1318.51, vol: 0.4, decay: 0.32 });
  kalimba(b, { start: 0.07, f: 1567.98, vol: 0.4, decay: 0.32 });
  write("perfect", b, 0.75);
}

// Falsch: weicher, tiefer Doppelton abwärts (G3 → E3), gedämpft
{
  const b = buf(0.5);
  partial(b, { f: 196, vol: 0.5, decay: 0.09, attack: 0.008 });
  partial(b, { start: 0.12, f: 164.81, vol: 0.5, decay: 0.12, attack: 0.008 });
  partial(b, { start: 0.12, f: 329.63, vol: 0.08, decay: 0.05 });
  write("wrong", b, 0.65);
}

// Fieber: schnelles Kalimba-Arpeggio aufwärts + leiser Luftzug
{
  const b = buf(1.1);
  SCALE.forEach((f, i) => kalimba(b, { start: i * 0.055, f, vol: 0.35, decay: 0.3 }));
  write("fever", b, 0.75);
}

// Level-Aufstieg: warmes Arpeggio C–E–G–C mit Nachklang
{
  const b = buf(1.4);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => kalimba(b, { start: i * 0.11, f, vol: 0.45, decay: 0.5 }));
  write("levelup", b, 0.8);
}

// Rundenende: ruhiger Akkord (C–E–G), angenehmer Abschluss
{
  const b = buf(1.6);
  [261.63, 329.63, 392, 523.25].forEach((f, i) => kalimba(b, { start: i * 0.04, f, vol: 0.35, decay: 0.6 }));
  write("end", b, 0.75);
}

// Countdown-Tick (letzte Sekunden): leises Holz
{
  const b = buf(0.05);
  partial(b, { f: 1400, vol: 0.5, decay: 0.01 });
  write("tick", b, 0.55);
}

// Menü-Tipp
{
  const b = buf(0.05);
  partial(b, { f: 1046.5, vol: 0.4, decay: 0.012 });
  mallet(b, { vol: 0.1, dur: 0.005 });
  write("tap", b, 0.5);
}

/* ── Zielwurf (am Ende, damit die Töne oben unverändert bleiben) ── */

// Zielwurf-Swish: luftiges „Netz“-Rauschen, oben ein kleines Funkeln
{
  const b = buf(0.36);
  air(b, { dur: 0.32, vol: 1, peak: 0.22, lp0: 0.12, lp1: 0.45 });
  partial(b, { start: 0.05, f: 2093, vol: 0.12, decay: 0.08 });
  write("swish", b, 0.7);
}

// Rand-Treffer: hohles Kunststoff-„Klong“ (Tonhöhe folgt der Wucht per rate)
{
  const b = buf(0.3);
  partial(b, { f: 330, vol: 0.55, decay: 0.06 });
  partial(b, { f: 831, vol: 0.2, decay: 0.035 });
  partial(b, { f: 1479, vol: 0.06, decay: 0.015 });
  mallet(b, { vol: 0.3, dur: 0.008 });
  write("rim", b, 0.7);
}

// Deckel: tieferes, dumpfes „Tock“ (großes Kunststoffteil)
{
  const b = buf(0.24);
  partial(b, { f: 150, vol: 0.6, decay: 0.05 });
  partial(b, { f: 310, vol: 0.18, decay: 0.022 });
  mallet(b, { vol: 0.35, dur: 0.012 });
  write("lid", b, 0.7);
}

// Fehlwurf: weiches „Plopp“ mit fallender Tonhöhe – nie strafend
{
  const b = buf(0.16);
  let phase = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    const f = 180 + 260 * Math.exp(-t / 0.03);
    phase += (TAU * f) / RATE;
    b[i] += Math.sin(phase) * 0.6 * Math.exp(-t / 0.045);
  }
  write("plop", b, 0.6);
}

/* ── Trickwürfe ─────────────────────────────────────────────── */

// Trampolin: federndes „Boing“ (Tonhöhe steigt, leichtes Vibrato)
{
  const b = buf(0.42);
  let phase = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    const f = 190 + 330 * (1 - Math.exp(-t / 0.06)) + 14 * Math.sin(TAU * 22 * t);
    phase += (TAU * f) / RATE;
    b[i] += Math.sin(phase) * 0.55 * Math.exp(-t / 0.13) * Math.min(t / 0.004, 1);
  }
  write("boing", b, 0.65);
}

// Auto: dumpfes Blech-„Bong“ (unharmonische Teiltöne)
{
  const b = buf(0.45);
  partial(b, { f: 112, vol: 0.5, decay: 0.09 });
  partial(b, { f: 241, vol: 0.28, decay: 0.07 });
  partial(b, { f: 397, vol: 0.18, decay: 0.05 });
  partial(b, { f: 583, vol: 0.1, decay: 0.035 });
  mallet(b, { vol: 0.35, dur: 0.015 });
  write("car", b, 0.7);
}
