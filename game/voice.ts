// Datei: game/voice.ts — sprechende Tonnen
//
// Jede Tonne hat eine Persönlichkeit (Stimme + Sprüche). Regeln, damit es
// witzig bleibt und nicht nervt:
//  - Fehler:  IMMER ein Spruch – mit der richtigen Tonne (Lerneffekt!)
//  - Treffer: nur ab und zu (≈ jeder 4.), Perfekt öfter
//  - Serie 5/10/15/…: Lob
//  - Nichts tun (9 s): sanfter Stups
//  - Mindestabstand zwischen Sprüchen, kein Spruch doppelt hintereinander

import { type BinKey } from "@/constants/theme";
import { type Language } from "@/i18n";

export type VoiceEvent = "wrong" | "correct" | "perfect" | "streak" | "idle";

export type Persona = {
  name: string;
  /** Tonhöhe/Tempo für expo-speech (1 = normal). */
  pitch: number;
  rate: number;
};

export const PERSONAS: Record<BinKey, Persona> = {
  bio: { name: "Bio-Berta", pitch: 0.95, rate: 0.95 },
  gelb: { name: "Gelber Gustav", pitch: 1.5, rate: 1.08 },
  rest: { name: "Rudi Rest", pitch: 0.62, rate: 0.88 },
  papier: { name: "Paula Papier", pitch: 1.22, rate: 1.0 },
  glas: { name: "Glas-Gerd", pitch: 1.0, rate: 0.9 },
  sonder: { name: "Sonder-Sam", pitch: 0.8, rate: 0.95 },
};

type Lines = Record<VoiceEvent, string[]>;

// {item} = Gegenstand, {into} = „in den Biomüll“ usw., {n} = Serienlänge
const DE: Partial<Record<BinKey, Lines>> & { any: Lines } = {
  bio: {
    wrong: ["Igitt, {item}? Das schmeckt mir nicht! Ab {into}.", "Nee, nee! {item} gehört {into}."],
    correct: ["Mmmh, lecker!", "Danke, das schmeckt!", "Kompost-Party!"],
    perfect: ["Was für ein Wurf! Mmmh!"],
    streak: ["{n} in Folge! Du bist ja ein Feinschmecker!"],
    idle: ["Hallo? Ich hab Hunger!"],
  },
  gelb: {
    wrong: ["Hihi, falsch! {item} will {into}!", "Ups! {item}? Das muss {into}."],
    correct: ["Juhuu!", "Volltreffer!", "Mehr davon!"],
    perfect: ["Wow, genau rein!"],
    streak: ["{n} in Folge! Der Wahnsinn!"],
    idle: ["Na los, wirf was! Ich bin bereit!"],
  },
  rest: {
    wrong: ["Hmpf. {item} gehört nicht zu mir. Ab {into}!", "Junge, Junge. {item} kommt {into}."],
    correct: ["Passt.", "Na also.", "Gut gemacht."],
    perfect: ["Hm. Nicht schlecht. Gar nicht schlecht."],
    streak: ["{n} in Folge. Respekt."],
    idle: ["Wird das heute noch was?"],
  },
  papier: {
    wrong: ["Moment mal! {item} gehört {into}.", "Falsche Seite aufgeschlagen! {item} kommt {into}."],
    correct: ["Ausgezeichnet!", "Eins mit Sternchen!"],
    perfect: ["Lehrbuchwurf!"],
    streak: ["{n} in Folge! Das kommt in die Chronik!"],
    idle: ["Ich warte. Mit einem guten Buch."],
  },
  glas: {
    wrong: ["Vorsicht bitte! {item} ist nichts für mich. Lieber {into}.", "Oh là là, {item}? Das gehört {into}."],
    correct: ["Wunderbar!", "Klirr! Perfekt."],
    perfect: ["Formvollendet!"],
    streak: ["{n} in Folge! Bravo!"],
    idle: ["Ich stehe hier. Elegant. Und leer."],
  },
  any: {
    wrong: ["Falsch! {item} gehört {into}."],
    correct: ["Richtig!"],
    perfect: ["Perfekt!"],
    streak: ["{n} in Folge!"],
    idle: ["Wohin damit?"],
  },
};

const EN: Partial<Record<BinKey, Lines>> & { any: Lines } = {
  bio: {
    wrong: ["Yuck, {item}? That's not tasty! Put it {into}.", "Nope! {item} goes {into}."],
    correct: ["Mmm, yummy!", "Thanks, delicious!", "Compost party!"],
    perfect: ["What a throw! Mmm!"],
    streak: ["{n} in a row! You're a gourmet!"],
    idle: ["Hello? I'm hungry!"],
  },
  gelb: {
    wrong: ["Hehe, wrong! {item} wants to go {into}!", "Oops! {item}? That goes {into}."],
    correct: ["Woohoo!", "Bullseye!", "More, please!"],
    perfect: ["Wow, right in!"],
    streak: ["{n} in a row! Amazing!"],
    idle: ["Come on, throw something! I'm ready!"],
  },
  rest: {
    wrong: ["Hmph. {item} isn't mine. Put it {into}!", "Oh boy. {item} goes {into}."],
    correct: ["Fine.", "There you go.", "Well done."],
    perfect: ["Hm. Not bad. Not bad at all."],
    streak: ["{n} in a row. Respect."],
    idle: ["Any time today?"],
  },
  papier: {
    wrong: ["Wait a minute! {item} goes {into}.", "Wrong page! {item} belongs {into}."],
    correct: ["Excellent!", "Top marks!"],
    perfect: ["Textbook throw!"],
    streak: ["{n} in a row! That's going in the history books!"],
    idle: ["I'll wait. With a good book."],
  },
  glas: {
    wrong: ["Careful, please! {item} isn't for me. Try {into}.", "Oh my, {item}? That goes {into}."],
    correct: ["Wonderful!", "Clink! Perfect."],
    perfect: ["Simply elegant!"],
    streak: ["{n} in a row! Bravo!"],
    idle: ["I'm standing here. Elegant. And empty."],
  },
  any: {
    wrong: ["Wrong! {item} goes {into}."],
    correct: ["Correct!"],
    perfect: ["Perfect!"],
    streak: ["{n} in a row!"],
    idle: ["Where does it go?"],
  },
};

const LINES: Record<Language, typeof DE> = { de: DE, en: EN };

let lastLine = "";

/** Zufälliger Spruch einer Tonne – nie zweimal derselbe hintereinander. */
export function pickLine(
  lang: Language,
  bin: BinKey,
  event: VoiceEvent,
  vars: { item?: string; into?: string; n?: number } = {},
): string {
  const table = LINES[lang];
  const pool = (table[bin] ?? table.any)[event];
  const options = pool.length > 1 ? pool.filter((l) => l !== lastLine) : pool;
  const line = options[Math.floor(Math.random() * options.length)];
  lastLine = line;
  return line
    .replaceAll("{item}", vars.item ?? "")
    .replaceAll("{into}", vars.into ?? "")
    .replaceAll("{n}", String(vars.n ?? ""));
}

/** Soll bei diesem Ereignis gesprochen werden? (Häufigkeit gegen Nerven) */
export function shouldSpeak(event: VoiceEvent, msSinceLast: number): boolean {
  switch (event) {
    case "wrong":
      return true;
    case "streak":
      return msSinceLast > 1500;
    case "perfect":
      return msSinceLast > 2500 && Math.random() < 0.6;
    case "correct":
      return msSinceLast > 6000 && Math.random() < 0.25;
    case "idle":
      return msSinceLast > 9000;
  }
}
