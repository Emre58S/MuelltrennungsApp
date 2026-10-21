// Datei: components/game/scene-bus.ts
// Imperative Brücke zwischen Spiel-Logik (React) und 3D-Szene (useFrame).
//
// Würfe, Konfetti und Tonnen-Reaktionen laufen NICHT über React-State: die
// Logik legt sie hier in Warteschlangen, die Szene holt sie im nächsten Frame
// ab und spielt sie in fest vorab angelegten Pools ab. So löst ein Wurf kein
// Neu-Rendern der 3D-Szene aus – auch nicht bei vielen Würfen pro Sekunde.
// Wie bei fx.ts wird das Objekt nur über die Funktionen hier verändert.

import { useSyncExternalStore } from "react";

import { type Item } from "@/constants/items";

import { type Burst } from "./effects";

export type BinEventType = "hit" | "perfect" | "reject" | "peek" | "bump";

/** Ergebnis eines physikalischen Wurfs (Zielwurf): in welcher Tonne er
 *  gelandet ist (oder null), ob ohne Anstoßen, und wo er liegt (Welt-x). */
export type LandOutcome = { bin: number | null; clean: boolean; x: number };

export type ThrowSpec = {
  id: number;
  item: Item;
  binIndex: number;
  hit: boolean;
  perfect: boolean;
  /** Goldene Spur (Perfekt oder Fieber). */
  glow: boolean;
  /** Wischstärke 0.8…1.3: höher = kräftiger, flacherer Wurf (Standard 1). */
  power?: number;
  /** Zielwurf: eigene Landestelle (Welt x/z auf Höhe der Öffnungen). */
  land?: { x: number; z: number };
  /** Zielwurf: echte Physik entscheidet, wo er landet; `accept` = welche
   *  Tonnen richtig wären (falsche spucken ihn wieder aus). */
  free?: { accept: boolean[] };
};

export type SceneBus = {
  /** Anvisierte Tonne (oder null). */
  aim: number | null;
  aimListeners: Set<() => void>;
  /** Schwebender Gegenstand (Vorschau). Die Szene tauscht das Modell selbst. */
  preview: Item | null;
  /** Pro Tonne: Anzahl fliegender Treffer (Deckel bleibt dafür offen). */
  incoming: number[];
  throws: ThrowSpec[];
  bursts: Burst[];
  binEvents: (BinEventType | null)[];
  /** Aktueller Deckel-Winkel pro Tonne (rad) – für die Wurf-Physik. */
  lids: number[];
  onLand: (id: number, outcome?: LandOutcome) => void;
};

export type BusRef = { readonly current: SceneBus };

export function createBus(): SceneBus {
  return {
    aim: null,
    aimListeners: new Set(),
    preview: null,
    incoming: [],
    throws: [],
    bursts: [],
    binEvents: [],
    lids: [],
    onLand: () => undefined,
  };
}

/** Alles zurücksetzen (z. B. beim Zurückkehren ins Menü); Abonnenten bleiben. */
export function resetBus(bus: SceneBus) {
  bus.throws = [];
  bus.bursts = [];
  bus.binEvents = [];
  bus.incoming = [];
  setAim(bus, null);
}

/* ── Zielen ─────────────────────────────────────────────────── */

export function setAim(bus: SceneBus, index: number | null) {
  if (bus.aim === index) return;
  bus.aim = index;
  bus.aimListeners.forEach((l) => l());
}

function subscribeAim(bus: BusRef, listener: () => void) {
  const set = bus.current.aimListeners;
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

function readAim(bus: BusRef) {
  return bus.current.aim;
}

/** Für HUD-Elemente (z. B. Tonnen-Schilder): rendert nur diese Komponente neu. */
export function useAim(bus: BusRef): number | null {
  return useSyncExternalStore(
    (listener) => subscribeAim(bus, listener),
    () => readAim(bus),
  );
}

/* ── Würfe ──────────────────────────────────────────────────── */

export function queueThrow(bus: SceneBus, spec: ThrowSpec) {
  bus.throws.push(spec);
  if (spec.hit) bus.incoming[spec.binIndex] = (bus.incoming[spec.binIndex] ?? 0) + 1;
}

export function takeThrows(bus: SceneBus): ThrowSpec[] {
  if (bus.throws.length === 0) return EMPTY;
  const list = bus.throws;
  bus.throws = [];
  return list;
}

/** Wurf ist angekommen: Tonne freigeben und die Spiel-Logik informieren. */
export function landThrow(bus: SceneBus, spec: ThrowSpec, outcome?: LandOutcome) {
  if (spec.hit) {
    bus.incoming[spec.binIndex] = Math.max(0, (bus.incoming[spec.binIndex] ?? 0) - 1);
  }
  bus.onLand(spec.id, outcome);
}

export function setLandHandler(
  bus: SceneBus,
  handler: (id: number, outcome?: LandOutcome) => void,
) {
  bus.onLand = handler;
}

/** Tonne meldet ihren Deckel-Winkel (für die Wurf-Physik). */
export function setLid(bus: SceneBus, index: number, angle: number) {
  bus.lids[index] = angle;
}

/* ── Konfetti ───────────────────────────────────────────────── */

export function queueBurst(bus: SceneBus, burst: Burst) {
  bus.bursts.push(burst);
}

export function takeBursts(bus: SceneBus): Burst[] {
  if (bus.bursts.length === 0) return EMPTY_BURSTS;
  const list = bus.bursts;
  bus.bursts = [];
  return list;
}

/* ── Tonnen-Reaktionen ─────────────────────────────────────── */

export function queueBinEvent(bus: SceneBus, index: number, type: BinEventType) {
  bus.binEvents[index] = type;
}

export function takeBinEvent(bus: SceneBus, index: number): BinEventType | null {
  const type = bus.binEvents[index] ?? null;
  if (type) bus.binEvents[index] = null;
  return type;
}

export function isBinActive(bus: SceneBus, index: number): boolean {
  return bus.aim === index || (bus.incoming[index] ?? 0) > 0;
}

const EMPTY: ThrowSpec[] = [];
const EMPTY_BURSTS: Burst[] = [];

/* ── Vorschau ──────────────────────────────────────────────── */

/** Nächsten Gegenstand zeigen – ohne Neu-Rendern der 3D-Szene. */
export function setPreview(bus: SceneBus, item: Item | null) {
  bus.preview = item;
}
