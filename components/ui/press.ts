// Datei: components/ui/press.ts
// Einheitliche Rückmeldung beim Drücken: kurz etwas kleiner und heller,
// dazu ein leichtes Vibrieren. Überall gleich, damit sich jeder Knopf
// vertraut anfühlt.

import * as Haptics from "expo-haptics";
import { StyleSheet } from "react-native";

export const press = StyleSheet.create({
  /** Gedrückt: etwas kleiner, leicht durchscheinend. */
  pressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  /** Für große Flächen (Karten, breite Knöpfe): dezenter. */
  pressedLarge: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});

/** Leichtes Vibrieren beim Antippen. */
export function tapHaptic() {
  Haptics.selectionAsync().catch(() => undefined);
}
