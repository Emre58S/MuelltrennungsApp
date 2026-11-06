// Datei: components/nav/shell-context.ts
//
// Die Hülle (app/bereiche.tsx) legt Pfad, Online und Regal nebeneinander. Die
// Seiten darin fragen hier, ob sie in der Hülle stehen: dann kein Zurück-Pfeil,
// Platz für die untere Leiste, und Sprünge in einen anderen Bereich wechseln
// den Reiter, statt eine Seite zu öffnen.

import { createContext, useContext } from "react";

import { type AreaKey } from "@/constants/areas";

export type Shell = {
  inShell: boolean;
  /** Höhe der unteren Leiste (inkl. Sicherheitsabstand), die der Inhalt frei lässt. */
  bottomInset: number;
  /** In einen anderen Bereich wechseln, optional gleich in einen seiner Reiter (z. B. Regal → „today“). */
  goArea: (key: AreaKey, tab?: string) => void;
  /** Zuletzt gewünschter Reiter je Bereich; `n` zählt hoch, damit derselbe Wunsch erneut wirkt. */
  tabs: Partial<Record<AreaKey, { tab: string; n: number }>>;
  /** Zählt hoch, sobald ein Bereich (wieder) gewählt wird – die Seite springt dann nach oben. */
  topSignal: Record<AreaKey, number>;
  /** Wartet eine verdiente, noch nicht geöffnete Truhe? Eine Quelle für Leiste, Reiter und Karte. */
  chestWaiting: boolean;
  setChestWaiting: (waiting: boolean) => void;
};

const OUTSIDE: Shell = { inShell: false, bottomInset: 0, goArea: () => undefined,
  tabs: {},
  topSignal: { pfad: 0, online: 0, regal: 0 },
  chestWaiting: false,
  setChestWaiting: () => undefined,
};

export const ShellContext = createContext<Shell>(OUTSIDE);

export const useShell = () => useContext(ShellContext);
