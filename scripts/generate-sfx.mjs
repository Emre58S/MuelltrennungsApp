// Datei: scripts/generate-sfx.mjs
// Erzeugt alle Spiel-Sounds per Klangsynthese als WAV (22,05 kHz, 16 Bit, mono).
// Aufruf:  node scripts/generate-sfx.mjs
// Vorteil: keine Lizenzfragen, alles stimmig aus einem Guss, leicht anpassbar.
//
// Sound-Design-Regeln (siehe utils/sfx.ts):
//  - jede Aktion bekommt innerhalb von ~50 ms ein Geräusch
//  - Erfolg = hell, aufsteigend; Fehler = lustig-weich (Boing), nie hart/strafend
//  - Serien steigen in der Tonleiter (Pentatonik) → „noch einer!“-Gefühl

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sounds", "sfx");
mkdirSync(OUT, { recursive: true });

/* ── Bausteine ─────────────────────────────────────────────── */

const TAU = Math.PI * 2;
const buf = (sec) => new Float32Array(Math.round(sec * RATE));

let seed = 12345;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

/** Hüllkurve: Anstieg a, Abklingen d (Sekunden), Kurvenform k. */
const env = (t, a, d, k = 3) => (t < a ? t / a : Math.exp(-((t - a) / d) * k));

/** Ton mit gleitender Frequenz (f0 → f1). */
function tone(out, { start = 0, dur, f0, f1 = f0, vol = 0.5, a = 0.004, d = dur, k = 3, wave = "sine", vib = 0, vibRate = 6 }) {
  let phase = 0;
  const n = Math.round(dur * RATE);
  const s0 = Math.round(start * RATE);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / RATE;
    const p = t / dur;
    const f = f0 * Math.pow(f1 / f0, p) * (1 + vib * Math.sin(TAU * vibRate * t));
    phase += (TAU * f) / RATE;
    let v;
    if (wave === "sine") v = Math.sin(phase);
    else if (wave === "tri") v = (2 / Math.PI) * Math.asin(Math.sin(phase));
    else v = Math.sin(phase) * 0.7 + Math.sin(phase * 2) * 0.2 + Math.sin(phase * 3) * 0.1; // weicher „Saw“
    out[s0 + i] += v * vol * env(t, a, d, k);
  }
}

/** Gefiltertes Rauschen (Tiefpass gleitend lp0 → lp1, 0..1). */
function hiss(out, { start = 0, dur, vol = 0.4, a = 0.01, d = dur, k = 3, lp0 = 0.3, lp1 = lp0, hp = 0 }) {
  let low = 0;
  let prev = 0;
  const n = Math.round(dur * RATE);
  const s0 = Math.round(start * RATE);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / RATE;
    const c = lp0 + (lp1 - lp0) * (t / dur);
    low += c * (noise() - low);
    const v = low - hp * prev;
    prev = low;
    out[s0 + i] += v * vol * env(t, a, d, k);
  }
}

/** Glocke: Grundton + unharmonische Obertöne. */
function bell(out, { start = 0, f, vol = 0.35, dur = 0.5 }) {
  tone(out, { start, dur, f0: f, vol, d: dur, k: 4 });
  tone(out, { start, dur: dur * 0.6, f0: f * 2.01, vol: vol * 0.35, d: dur * 0.5, k: 4 });
  tone(out, { start, dur: dur * 0.35, f0: f * 3.98, vol: vol * 0.12, d: dur * 0.3, k: 5 });
}

function write(name, data) {
  // Normalisieren auf -1 dBFS, sanftes Ein-/Ausblenden gegen Knacken
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const fade = Math.min(64, data.length >> 2);
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

/* ── Die Sounds ────────────────────────────────────────────── */

// Zielen: zarter Tick, wenn eine neue Tonne anvisiert wird
{
  const b = buf(0.07);
  tone(b, { dur: 0.07, f0: 1500, f1: 1200, vol: 0.5, d: 0.02, k: 3 });
  write("aim", b);
}

// Deckel öffnet sich: neugieriges „Blupp“ nach oben (Vorfreude)
{
  const b = buf(0.16);
  tone(b, { dur: 0.16, f0: 280, f1: 720, vol: 0.6, d: 0.1, k: 2.5 });
  hiss(b, { dur: 0.05, vol: 0.08, lp0: 0.5 });
  write("lid", b);
}

// Wurf: Luftzug
{
  const b = buf(0.36);
  hiss(b, { dur: 0.36, vol: 0.9, a: 0.12, d: 0.2, k: 3, lp0: 0.05, lp1: 0.35, hp: 0.6 });
  write("whoosh", b);
}

// Treffer: Korken-„Plopp“
{
  const b = buf(0.16);
  tone(b, { dur: 0.12, f0: 950, f1: 240, vol: 0.8, d: 0.08, k: 3 });
  hiss(b, { dur: 0.02, vol: 0.3, lp0: 0.8 });
  write("pop", b);
}

// Tonne kaut: zwei knusprige Bisse + leises Brummen („Mmh“)
{
  const b = buf(0.48);
  for (const s of [0, 0.17]) {
    hiss(b, { start: s, dur: 0.09, vol: 0.55, a: 0.003, d: 0.05, lp0: 0.6, hp: 0.4 });
    tone(b, { start: s, dur: 0.08, f0: 140, f1: 90, vol: 0.45, d: 0.06 });
  }
  tone(b, { start: 0.3, dur: 0.18, f0: 210, f1: 260, vol: 0.25, a: 0.03, d: 0.15, k: 2, wave: "soft", vib: 0.02 });
  write("munch", b);
}

// Serien-Glöckchen: Pentatonik aufsteigend (C6 D6 E6 G6 A6 C7)
[1046.5, 1174.7, 1318.5, 1568, 1760, 2093].forEach((f, i) => {
  const b = buf(0.4);
  bell(b, { f, vol: 0.5, dur: 0.4 });
  write(`chime${i + 1}`, b);
});

// Perfekt: funkelndes Arpeggio
{
  const b = buf(0.75);
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell(b, { start: i * 0.06, f, vol: 0.45, dur: 0.5 }));
  for (let i = 0; i < 10; i++) tone(b, { start: 0.2 + i * 0.04, dur: 0.06, f0: 3000 + i * 180, vol: 0.06, d: 0.03 });
  write("perfect", b);
}

// Falsch: weiches, lustiges „Boing“ (Feder) – nicht strafend
{
  const b = buf(0.55);
  tone(b, { dur: 0.55, f0: 170, f1: 120, vol: 0.7, a: 0.005, d: 0.4, k: 2.5, vib: 0.18, vibRate: 13 });
  tone(b, { dur: 0.3, f0: 340, f1: 240, vol: 0.18, d: 0.2, vib: 0.18, vibRate: 13 });
  write("boing", b);
}

// Aufprall auf dem Boden
{
  const b = buf(0.2);
  tone(b, { dur: 0.18, f0: 120, f1: 55, vol: 0.8, d: 0.1, k: 3 });
  hiss(b, { dur: 0.06, vol: 0.25, lp0: 0.25 });
  write("thud", b);
}

// Fieber: aufsteigendes Arpeggio + Luftzug
{
  const b = buf(1.1);
  [523.3, 659.3, 784, 1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) =>
    tone(b, { start: i * 0.07, dur: 0.3, f0: f, vol: 0.32, d: 0.2, wave: "tri" }),
  );
  hiss(b, { dur: 0.7, vol: 0.25, a: 0.4, d: 0.3, lp0: 0.05, lp1: 0.5, hp: 0.5 });
  write("fever", b);
}

// Countdown-Tick (letzte Sekunden)
{
  const b = buf(0.06);
  tone(b, { dur: 0.06, f0: 1900, vol: 0.6, d: 0.015, k: 3, wave: "tri" });
  write("tick", b);
}

// Level-Aufstieg: kleine Fanfare
{
  const b = buf(1.2);
  [
    [0, 784, 0.15],
    [0.14, 1046.5, 0.15],
    [0.28, 1318.5, 0.15],
    [0.42, 1568, 0.75],
  ].forEach(([s, f, d]) => {
    tone(b, { start: s, dur: d + 0.1, f0: f, vol: 0.35, a: 0.01, d, k: 2, wave: "tri" });
    tone(b, { start: s, dur: d + 0.1, f0: f / 2, vol: 0.15, a: 0.01, d, k: 2, wave: "soft" });
  });
  write("levelup", b);
}

// Runde verloren (Ohne-Fehler-Modus): lustige „Wah-wah“-Posaune
{
  const b = buf(1.5);
  [
    [0, 466.2, 0.28],
    [0.3, 440, 0.28],
    [0.6, 415.3, 0.28],
    [0.9, 392, 0.6],
  ].forEach(([s, f, d], i) =>
    tone(b, { start: s, dur: d, f0: f, f1: i === 3 ? f * 0.97 : f, vol: 0.5, a: 0.03, d, k: 1.5, wave: "soft", vib: i === 3 ? 0.03 : 0.01, vibRate: 7 }),
  );
  write("wahwah", b);
}

// Menü-Tipp
{
  const b = buf(0.05);
  tone(b, { dur: 0.05, f0: 900, f1: 700, vol: 0.4, d: 0.015 });
  write("tap", b);
}
