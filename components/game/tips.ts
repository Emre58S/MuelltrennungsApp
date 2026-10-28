// Datei: components/game/tips.ts
// Einführung im Spiel: Jeder Tipp erscheint genau einmal – dann, wenn er
// gebraucht wird (erster Wind, erster schwerer Gegenstand, nach Würfen ohne
// Halten …). Gesehene Tipps werden gespeichert. Immer nur einer zur Zeit; ein
// weiterer wartet, bis der erste weg ist.

import { useCallback, useEffect, useRef, useState } from "react";

import { type TranslationKey } from "@/i18n";
import { getSeenTips, markTipSeen } from "@/utils/storage";

export type TipId =
  | "hold"
  | "heavy"
  | "light"
  | "combo"
  | "wind"
  | "movingBin"
  | "windmill"
  | "movingRing"
  | "spin"
  | "stars"
  | "decoy"
  | "sonder"
  | "sign"
  | "lamp"
  | "fence";

/** So lange (ms) bleibt ein Tipp stehen (Tippen schließt ihn früher). */
const TIP_MS = 4500;

/** `paused`: Tipp ist gerade verdeckt (z. B. von der Lernkarte) – die
 *  Anzeigezeit beginnt erst danach neu. */
export function useTips(paused = false) {
  /** Schon gesehene Tipps (null = wird noch geladen). */
  const seen = useRef<Set<string> | null>(null);
  /** Angefragte Tipps, die noch warten (Laden läuft oder ein Tipp ist offen). */
  const waiting = useRef<TipId[]>([]);
  const showing = useRef(false);
  const [tip, setTip] = useState<{ id: TipId; key: TranslationKey } | null>(null);

  /** Nächsten wartenden, noch nicht gesehenen Tipp zeigen. */
  const next = useCallback(() => {
    const known = seen.current;
    if (!known || showing.current) return;
    const id = waiting.current.find((w) => !known.has(w));
    waiting.current = waiting.current.filter((w) => w !== id && !known.has(w));
    if (!id) return;
    known.add(id);
    markTipSeen(id).catch(() => undefined);
    showing.current = true;
    setTip({ id, key: `tip.${id}` as TranslationKey });
  }, []);

  useEffect(() => {
    let active = true;
    getSeenTips()
      .catch(() => [] as string[])
      .then((list) => {
        if (!active) return;
        seen.current = new Set(list);
        next();
      });
    return () => {
      active = false;
    };
  }, [next]);

  /** Tipp zeigen, falls noch nie gesehen (sonst nichts). */
  const show = useCallback(
    (id: TipId) => {
      if (seen.current?.has(id) || waiting.current.includes(id)) return;
      waiting.current.push(id);
      next();
    },
    [next],
  );

  /** Tipp schließen; ein wartender kommt kurz danach dran. */
  const dismiss = useCallback(() => {
    showing.current = false;
    setTip(null);
    if (waiting.current.length) setTimeout(next, 400);
  }, [next]);

  // Nach einer Weile von selbst ausblenden
  useEffect(() => {
    if (!tip || paused) return;
    const timer = setTimeout(dismiss, TIP_MS);
    return () => clearTimeout(timer);
  }, [tip, paused, dismiss]);

  return { tip, show, dismiss };
}
