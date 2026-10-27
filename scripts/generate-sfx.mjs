// Datei: scripts/generate-sfx.mjs
// Erzeugt das Klangset per Synthese (WAV, 44,1 kHz, 16 Bit, mono).
// Aufruf:  node scripts/generate-sfx.mjs
//
// Leitbild: angenehm & dezent wie Marimba/Kalimba (Alto's Adventure,
// Monument Valley). Alle Töne liegen in C-Dur-Pentatonik → klingen
// miteinander immer harmonisch. Fehler = weicher, tiefer Ton (nie strafend).
//
// Qualität (v2): volle Abtastrate, Instrumente aus mehreren Schichten
// (Anschlag + Körper + Ausklang, leicht verstimmte Teiltöne) und ein kleiner
// Raumhall – voller und weniger „piepsig“. Dazu Landeklänge je Material
// (Glas, Papier, Plastik, Metall, Bio, Rest) und Belohnungs-Klänge.

import { Buffer } from "node:buffer";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 44100;
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

/* ── Bausteine ──────────────────────────────────────────────── */

/** Sinus-Teilton mit exponentiellem Abklingen (optional Tonhöhen-Gleiten). */
function partial(out, { start = 0, f, vol, decay, attack = 0.002, dur = decay * 6, glide = 0, glideTime = 0.05 }) {
  const s0 = Math.round(start * RATE);
  const n = Math.round(dur * RATE);
  let phase = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / RATE;
    const env = t < attack ? t / attack : Math.exp(-(t - attack) / decay);
    phase += (TAU * (f + glide * Math.exp(-t / glideTime))) / RATE;
    out[s0 + i] += Math.sin(phase) * vol * env;
  }
}

/** Kurzer Anschlag: gefiltertes Rauschen (`bright` 0…1 = dumpf … hell). */
function mallet(out, { start = 0, vol = 0.1, dur = 0.012, bright = 0.35 }) {
  const s0 = Math.round(start * RATE);
  let low = 0;
  const n = dur * RATE;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    low += bright * (noise() - low);
    out[s0 + i] += low * vol * (1 - i / n) ** 2;
  }
}

/** Marimba: Grundton (leicht doppelt, minimal verstimmt = wärmer) + typische
 *  Obertöne (≈4× und ≈10×) + weicher Schlägel. */
function marimba(out, { start = 0, f, vol = 0.5, decay = 0.22 }) {
  partial(out, { start, f, vol: vol * 0.7, decay });
  partial(out, { start, f: f * 1.003, vol: vol * 0.3, decay: decay * 0.9 });
  partial(out, { start, f: f * 3.93, vol: vol * 0.16, decay: decay * 0.25 });
  partial(out, { start, f: f * 9.8, vol: vol * 0.04, decay: decay * 0.08 });
  mallet(out, { start, vol: vol * 0.18, bright: 0.25 });
}

/** Kalimba: warmer Grundton, leichter Oberton, metallisches Funkeln, langer Ausklang. */
function kalimba(out, { start = 0, f, vol = 0.45, decay = 0.4 }) {
  partial(out, { start, f, vol: vol * 0.75, decay });
  partial(out, { start, f: f * 1.002, vol: vol * 0.25, decay: decay * 1.1 });
  partial(out, { start, f: f * 2.0, vol: vol * 0.1, decay: decay * 0.4 });
  partial(out, { start, f: f * 5.4, vol: vol * 0.05, decay: decay * 0.1 });
  mallet(out, { start, vol: vol * 0.08, dur: 0.006, bright: 0.6 });
}

/** Glöckchen: hohe, unharmonische Teiltöne (Funkeln, Glas). */
function bell(out, { start = 0, f, vol = 0.3, decay = 0.25 }) {
  [1, 2.76, 5.4, 8.93].forEach((k, i) =>
    partial(out, { start, f: f * k, vol: vol / (1 + i * 1.6), decay: decay / (1 + i * 0.8) }),
  );
}

/** Luftzug: gefiltertes Rauschen mit Hüllkurve. */
function air(out, { start = 0, dur, vol, peak = 0.4, lp0 = 0.04, lp1 = 0.2 }) {
  const s0 = Math.round(start * RATE);
  let low = 0;
  let prev = 0;
  for (let i = 0; i < dur * RATE && s0 + i < out.length; i++) {
    const p = i / (dur * RATE);
    const env = p < peak ? Math.sin((p / peak) * (Math.PI / 2)) : Math.cos(((p - peak) / (1 - peak)) * (Math.PI / 2));
    low += (lp0 + (lp1 - lp0) * p) * (noise() - low);
    const hp = low - prev * 0.7;
    prev = low;
    out[s0 + i] += hp * vol * env;
  }
}

/** Knistern: viele winzige Rausch-Klicks (Papier, Folie). */
function crackle(out, { start = 0, dur, count, vol = 0.3, bright = 0.6 }) {
  for (let k = 0; k < count; k++) {
    const at = start + ((noise() + 1) / 2) ** 1.4 * dur;
    mallet(out, { start: at, vol: vol * (0.4 + 0.6 * Math.abs(noise())), dur: 0.003 + Math.abs(noise()) * 0.006, bright });
  }
}

/** Kleiner Raumhall (Schroeder: 4 Kammfilter + 2 Allpässe), `mix` = Anteil. */
function reverb(data, { mix = 0.18, size = 1, damp = 0.3 } = {}) {
  const combs = [1116, 1188, 1277, 1356].map((d) => ({ d: Math.round(d * size), b: null, i: 0, f: 0 }));
  combs.forEach((c) => (c.b = new Float32Array(c.d)));
  const alls = [556, 441].map((d) => ({ d, b: new Float32Array(d), i: 0 }));
  const out = new Float32Array(data.length);
  for (let n = 0; n < data.length; n++) {
    const x = data[n];
    let wet = 0;
    for (const c of combs) {
      const y = c.b[c.i];
      c.f = y * (1 - damp) + c.f * damp;
      c.b[c.i] = x + c.f * 0.8;
      c.i = (c.i + 1) % c.d;
      wet += y;
    }
    wet *= 0.25;
    for (const a of alls) {
      const y = a.b[a.i];
      a.b[a.i] = wet + y * 0.5;
      a.i = (a.i + 1) % a.d;
      wet = y - wet * 0.5;
    }
    out[n] = x + wet * mix;
  }
  return out;
}

function write(name, data, { level = 0.8, room = 0.18 } = {}) {
  // Hall bekommt Platz zum Ausklingen
  const padded = new Float32Array(data.length + (room > 0 ? Math.round(0.35 * RATE) : 0));
  padded.set(data);
  const mixed = room > 0 ? reverb(padded, { mix: room }) : padded;
  let peak = 0;
  for (const v of mixed) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? level / peak : 1;
  const fadeIn = Math.min(48, mixed.length >> 2);
  const fadeOut = Math.min(Math.round(0.12 * RATE), mixed.length >> 2);
  const pcm = Buffer.alloc(44 + mixed.length * 2);
  pcm.write("RIFF", 0);
  pcm.writeUInt32LE(36 + mixed.length * 2, 4);
  pcm.write("WAVEfmt ", 8);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20);
  pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(RATE, 24);
  pcm.writeUInt32LE(RATE * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36);
  pcm.writeUInt32LE(mixed.length * 2, 40);
  mixed.forEach((v, i) => {
    let s = v * gain;
    if (i < fadeIn) s *= i / fadeIn;
    if (i > mixed.length - fadeOut) s *= (mixed.length - i) / fadeOut;
    pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(s * 32767))), 44 + i * 2);
  });
  writeFileSync(join(OUT, `${name}.wav`), pcm);
  console.log(`✓ ${name}.wav  ${(mixed.length / RATE).toFixed(2)} s`);
}

// C-Dur-Pentatonik, zwei Oktaven aufwärts
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

/* ── Grundklänge ────────────────────────────────────────────── */

// Zielen: kaum hörbares Holz-Tick (Orientierung, kein Lärm)
{
  const b = buf(0.06);
  partial(b, { f: 1800, vol: 0.4, decay: 0.008 });
  mallet(b, { vol: 0.2, dur: 0.006, bright: 0.5 });
  write("aim", b, { level: 0.6, room: 0 });
}

// Wurf: weicher Luftzug, der leicht ansteigt (Schwung)
{
  const b = buf(0.28);
  air(b, { dur: 0.28, vol: 1, peak: 0.3, lp0: 0.05, lp1: 0.28 });
  write("throw", b, { level: 0.7, room: 0.08 });
}

// Treffer (allgemein): dumpfes Holz-„Tock“ mit kurzem Körper
{
  const b = buf(0.16);
  partial(b, { f: 196, vol: 0.6, decay: 0.04, glide: 40, glideTime: 0.02 });
  partial(b, { f: 392, vol: 0.15, decay: 0.015 });
  mallet(b, { vol: 0.28, bright: 0.3 });
  write("land", b, { level: 0.75, room: 0.12 });
}

// Serien-Noten: jeder weitere Treffer eine Stufe höher → kleine Melodie
SCALE.forEach((f, i) => {
  const b = buf(0.6);
  marimba(b, { f, vol: 0.5, decay: 0.2 });
  write(`note${i + 1}`, b, { level: 0.75, room: 0.2 });
});

// Perfekt: zwei helle Kalimba-Töne (Terz) mit Funkeln
{
  const b = buf(0.9);
  kalimba(b, { f: 1318.51, vol: 0.4, decay: 0.32 });
  kalimba(b, { start: 0.07, f: 1567.98, vol: 0.4, decay: 0.32 });
  bell(b, { start: 0.12, f: 3135.96, vol: 0.08, decay: 0.2 });
  write("perfect", b, { level: 0.75, room: 0.25 });
}

// Falsch: weicher, tiefer Doppelton abwärts (G3 → E3), gedämpft
{
  const b = buf(0.5);
  partial(b, { f: 196, vol: 0.5, decay: 0.09, attack: 0.008 });
  partial(b, { start: 0.12, f: 164.81, vol: 0.5, decay: 0.12, attack: 0.008 });
  partial(b, { start: 0.12, f: 329.63, vol: 0.08, decay: 0.05 });
  write("wrong", b, { level: 0.65, room: 0.12 });
}

// Fieber: schnelles Kalimba-Arpeggio aufwärts
{
  const b = buf(1.1);
  SCALE.forEach((f, i) => kalimba(b, { start: i * 0.055, f, vol: 0.35, decay: 0.3 }));
  write("fever", b, { level: 0.75, room: 0.25 });
}

// Level-Aufstieg: warmes Arpeggio C–E–G–C mit Nachklang
{
  const b = buf(1.4);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => kalimba(b, { start: i * 0.11, f, vol: 0.45, decay: 0.5 }));
  write("levelup", b, { level: 0.8, room: 0.28 });
}

// Rundenende: ruhiger Akkord (C–E–G–C), angenehmer Abschluss
{
  const b = buf(1.6);
  [261.63, 329.63, 392, 523.25].forEach((f, i) => kalimba(b, { start: i * 0.04, f, vol: 0.35, decay: 0.6 }));
  write("end", b, { level: 0.75, room: 0.3 });
}

// Countdown-Tick (letzte Sekunden): Holz, leicht gespannt
{
  const b = buf(0.06);
  partial(b, { f: 1400, vol: 0.5, decay: 0.012 });
  mallet(b, { vol: 0.15, dur: 0.004, bright: 0.6 });
  write("tick", b, { level: 0.55, room: 0 });
}

// Menü-Tipp
{
  const b = buf(0.06);
  partial(b, { f: 1046.5, vol: 0.4, decay: 0.014 });
  mallet(b, { vol: 0.1, dur: 0.005, bright: 0.5 });
  write("tap", b, { level: 0.5, room: 0.06 });
}

/* ── Zielwurf ──────────────────────────────────────────────── */

// Swish: luftiges „Netz“-Rauschen, oben ein kleines Funkeln
{
  const b = buf(0.38);
  air(b, { dur: 0.32, vol: 1, peak: 0.22, lp0: 0.12, lp1: 0.45 });
  bell(b, { start: 0.05, f: 2093, vol: 0.1, decay: 0.12 });
  write("swish", b, { level: 0.7, room: 0.15 });
}

// Rand-Treffer: hohles Kunststoff-„Klong“ (Tonhöhe folgt der Wucht per rate)
{
  const b = buf(0.3);
  partial(b, { f: 330, vol: 0.55, decay: 0.06 });
  partial(b, { f: 831, vol: 0.2, decay: 0.035 });
  partial(b, { f: 1479, vol: 0.06, decay: 0.015 });
  mallet(b, { vol: 0.3, dur: 0.008, bright: 0.45 });
  write("rim", b, { level: 0.7, room: 0.12 });
}

// Deckel: tieferes, dumpfes „Tock“ (großes Kunststoffteil)
{
  const b = buf(0.24);
  partial(b, { f: 150, vol: 0.6, decay: 0.05 });
  partial(b, { f: 310, vol: 0.18, decay: 0.022 });
  mallet(b, { vol: 0.35, dur: 0.012, bright: 0.3 });
  write("lid", b, { level: 0.7, room: 0.12 });
}

// Fehlwurf: weiches „Plopp“ mit fallender Tonhöhe – nie strafend
{
  const b = buf(0.16);
  partial(b, { f: 180, vol: 0.6, decay: 0.045, glide: 260, glideTime: 0.03 });
  write("plop", b, { level: 0.6, room: 0.08 });
}

/* ── Landen je Material (was man wirft, hört man) ─────────────── */

// Glas: helles Klirren (unharmonisch, zwei leicht versetzte Anschläge)
{
  const b = buf(0.5);
  bell(b, { f: 2350, vol: 0.32, decay: 0.16 });
  bell(b, { start: 0.035, f: 3120, vol: 0.18, decay: 0.12 });
  mallet(b, { vol: 0.3, dur: 0.006, bright: 0.85 });
  partial(b, { f: 210, vol: 0.25, decay: 0.03 });
  write("matGlass", b, { level: 0.7, room: 0.18 });
}

// Papier: kurzes Rascheln
{
  const b = buf(0.3);
  air(b, { dur: 0.22, vol: 0.5, peak: 0.15, lp0: 0.25, lp1: 0.5 });
  crackle(b, { dur: 0.2, count: 26, vol: 0.35, bright: 0.7 });
  partial(b, { f: 160, vol: 0.2, decay: 0.03 });
  write("matPaper", b, { level: 0.65, room: 0.08 });
}

// Plastik: Knistern + hohles „Plopp“
{
  const b = buf(0.3);
  crackle(b, { dur: 0.12, count: 12, vol: 0.3, bright: 0.55 });
  partial(b, { start: 0.01, f: 420, vol: 0.45, decay: 0.035, glide: 180, glideTime: 0.015 });
  partial(b, { start: 0.01, f: 950, vol: 0.12, decay: 0.02 });
  write("matPlastic", b, { level: 0.65, room: 0.1 });
}

// Metall: kurzes Scheppern (Dose)
{
  const b = buf(0.5);
  [523, 1347, 2210, 3170].forEach((f, i) => partial(b, { f, vol: 0.32 / (1 + i * 0.7), decay: 0.12 / (1 + i * 0.5) }));
  mallet(b, { vol: 0.35, dur: 0.01, bright: 0.7 });
  partial(b, { f: 180, vol: 0.25, decay: 0.03 });
  write("matMetal", b, { level: 0.7, room: 0.15 });
}

// Bio: weicher, satter Plumps
{
  const b = buf(0.25);
  partial(b, { f: 95, vol: 0.7, decay: 0.06, glide: 70, glideTime: 0.02 });
  air(b, { dur: 0.08, vol: 0.25, peak: 0.1, lp0: 0.06, lp1: 0.1 });
  write("matBio", b, { level: 0.7, room: 0.08 });
}

// Restmüll: dumpfer Schlag
{
  const b = buf(0.22);
  partial(b, { f: 135, vol: 0.65, decay: 0.05, glide: 60, glideTime: 0.015 });
  mallet(b, { vol: 0.35, dur: 0.014, bright: 0.25 });
  write("matRest", b, { level: 0.7, room: 0.1 });
}

/* ── Belohnungen ───────────────────────────────────────────── */

// Sterne im Ergebnis: drei aufsteigende Funkel-Töne (E6, G6, C7)
[1318.51, 1567.98, 2093].forEach((f, i) => {
  const b = buf(0.7);
  kalimba(b, { f, vol: 0.4, decay: 0.3 });
  bell(b, { start: 0.02, f: f * 2, vol: 0.06, decay: 0.15 });
  write(`star${i + 1}`, b, { level: 0.72, room: 0.25 });
});

// Combo steigt: drei schnelle Töne aufwärts (G–C–E), per rate höher je Stufe
{
  const b = buf(0.6);
  [783.99, 1046.5, 1318.51].forEach((f, i) => marimba(b, { start: i * 0.05, f, vol: 0.42, decay: 0.16 }));
  write("comboUp", b, { level: 0.75, room: 0.2 });
}

// Neue Wurfspur freigeschaltet: kleine Fanfare + Glitzern
{
  const b = buf(1.6);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => kalimba(b, { start: i * 0.09, f, vol: 0.42, decay: 0.45 }));
  [1046.5, 1318.51, 1567.98].forEach((f) => kalimba(b, { start: 0.42, f, vol: 0.3, decay: 0.7 }));
  for (let k = 0; k < 8; k++) bell(b, { start: 0.45 + k * 0.06, f: 2093 * (1 + (k % 4) * 0.25), vol: 0.05, decay: 0.12 });
  write("unlock", b, { level: 0.8, room: 0.3 });
}
