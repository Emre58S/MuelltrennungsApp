// Datei: scripts/synth.mjs
// Gemeinsame Klang-Bausteine für Effekte (generate-sfx.mjs) und Musik
// (generate-music.mjs): Teiltöne, Marimba, Kalimba, Glöckchen, Luft,
// Knistern, Raumhall und WAV schreiben – damit alles nach einem Spiel klingt.

import { Buffer } from "node:buffer";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

/** Bausteine für eine Abtastrate; `write` legt WAVs in `out` ab. */
export function createSynth({ rate: RATE, out: OUT }) {
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

  /** WAV schreiben. `loop`: nahtlose Schleife – kein Nachhall-Anhang, kein
   *  Ein-/Ausblenden (der Hall ist dann schon eingerechnet). */
  function write(name, data, { level = 0.8, room = 0.18, loop = false } = {}) {
    // Hall bekommt Platz zum Ausklingen
    const padded = new Float32Array(data.length + (room > 0 && !loop ? Math.round(0.35 * RATE) : 0));
    padded.set(data);
    const mixed = room > 0 && !loop ? reverb(padded, { mix: room }) : padded;
    let peak = 0;
    for (const v of mixed) peak = Math.max(peak, Math.abs(v));
    const gain = peak > 0 ? level / peak : 1;
    const fadeIn = loop ? 0 : Math.min(48, mixed.length >> 2);
    const fadeOut = loop ? 0 : Math.min(Math.round(0.12 * RATE), mixed.length >> 2);
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



  return { RATE, TAU, buf, noise, partial, mallet, marimba, kalimba, bell, air, crackle, reverb, write };
}
