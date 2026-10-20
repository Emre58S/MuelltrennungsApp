// Datei: game/use-bin-voice.ts
// Lässt die Tonnen sprechen (expo-speech, offline, Gerätestimme):
// eigene Tonhöhe/Tempo pro Tonne, Deckel bewegt sich dabei (talkingIndex),
// optional dezente Untertitel. Häufigkeit regelt game/voice.ts.

import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";

import { type Language } from "@/i18n";
import { getBoolean, StorageKeys } from "@/utils/storage";

import { type BinDef } from "./bins";
import { PERSONAS, pickLine, shouldSpeak, type VoiceEvent } from "./voice";

export type Subtitle = { id: number; binIndex: number; text: string };

export function useBinVoice(bins: BinDef[], lang: Language) {
  const [talkingIndex, setTalkingIndex] = useState<number | null>(null);
  const [subtitle, setSubtitle] = useState<Subtitle | null>(null);
  const settings = useRef({ voice: true, subtitles: true });
  const last = useRef(0);
  const id = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      getBoolean(StorageKeys.VOICE_ENABLED, true),
      getBoolean(StorageKeys.SUBTITLES_ENABLED, true),
    ]).then(([voice, subtitles]) => {
      settings.current = { voice, subtitles };
    });
    return () => {
      Speech.stop();
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  const say = useCallback(
    (binIndex: number, event: VoiceEvent, vars: { item?: string; into?: string; n?: number } = {}) => {
      const bin = bins[binIndex];
      if (!bin) return;
      const since = Date.now() - last.current;
      if (!shouldSpeak(event, since)) return;

      const text = pickLine(lang, bin.key, event, vars);
      const persona = PERSONAS[bin.key];
      const myId = ++id.current;
      last.current = Date.now();

      const end = () => setTalkingIndex((cur) => (id.current === myId ? null : cur));

      if (settings.current.subtitles) {
        setSubtitle({ id: myId, binIndex, text });
        if (clearTimer.current) clearTimeout(clearTimer.current);
        clearTimer.current = setTimeout(
          () => setSubtitle((s) => (s?.id === myId ? null : s)),
          Math.max(1800, text.length * 70),
        );
      }

      if (settings.current.voice) {
        Speech.stop();
        Speech.speak(text, {
          language: lang === "de" ? "de-DE" : "en-US",
          pitch: persona.pitch,
          rate: persona.rate,
          onStart: () => setTalkingIndex(binIndex),
          onDone: end,
          onStopped: end,
          onError: end,
        });
      }
    },
    [bins, lang],
  );

  return { talkingIndex, subtitle, say };
}
