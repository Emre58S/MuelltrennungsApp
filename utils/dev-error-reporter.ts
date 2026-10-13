// Datei: utils/dev-error-reporter.ts
// NUR ENTWICKLUNG: schickt console.error/warn und Abstürze an einen kleinen
// Empfänger auf dem Entwicklungs-PC (Port 8099), damit Fehler vom Handy
// direkt gelesen werden können. In Produktions-Builds komplett inaktiv.

import Constants from "expo-constants";

let url: string | null = null;

function format(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value).slice(0, 2000);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function devLog(kind: string, ...args: unknown[]) {
  if (!url) return;
  fetch(url, { method: "POST", body: `${kind} ${args.map(format).join(" ")}` }).catch(
    () => undefined,
  );
}

export function installDevErrorReporter() {
  if (!__DEV__ || url) return;
  const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "172.20.10.2";
  url = `http://${host}:8099/log`;

  const origError = console.error;
  console.error = (...args: unknown[]) => {
    devLog("ERROR", ...args);
    origError(...args);
  };
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    devLog("WARN", ...args);
    origWarn(...args);
  };

  const g = globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler: () => (e: unknown, fatal?: boolean) => void;
      setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void;
    };
  };
  const prev = g.ErrorUtils?.getGlobalHandler();
  g.ErrorUtils?.setGlobalHandler((e, fatal) => {
    devLog(fatal ? "FATAL" : "EXCEPTION", e);
    prev?.(e, fatal);
  });

  devLog("START", "Reporter aktiv");
}
