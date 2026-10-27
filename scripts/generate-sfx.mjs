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
// Bausteine: scripts/synth.mjs (gemeinsam mit der Musik).

import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createSynth } from "./synth.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sounds", "sfx");
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".wav")) unlinkSync(join(OUT, f));

const { buf, partial, mallet, marimba, kalimba, bell, air, crackle, write } = createSynth({ rate: 44100, out: OUT });

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
