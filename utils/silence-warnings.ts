// Datei: utils/silence-warnings.ts
// Blendet bekannte, harmlose Warnungen aus Bibliotheken aus – damit echte
// Fehler im Terminal nicht zwischen Dutzenden gleicher Hinweise untergehen.
// Bewusst nur exakte, geprüfte Texte (nichts aus unserem eigenen Code):
//  - THREE.Clock: React Three Fiber nutzt intern noch THREE.Clock (three r185
//    markiert es als veraltet). Behebt sich mit einem R3F-Update.
//  - WEBGL_lose_context / EXT_color_buffer_float: expo-gl bietet diese WebGL-
//    Erweiterungen nicht an; three.js kommt ohne sie aus.

import { LogBox } from "react-native";

const HARMLESS = [
  "THREE.Clock: This module has been deprecated",
  "WEBGL_lose_context extension not supported",
  "EXT_color_buffer_float extension not supported",
];

const isHarmless = (args: unknown[]) =>
  typeof args[0] === "string" && HARMLESS.some((text) => (args[0] as string).includes(text));

export function silenceKnownWarnings() {
  LogBox.ignoreLogs(HARMLESS);
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (isHarmless(args)) return;
    warn(...args);
  };
}
