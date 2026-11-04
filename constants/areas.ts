// Datei: constants/areas.ts
//
// Die drei Bereiche der App und ihre Tonnen-Farben: Pfad (grün), Online (blau),
// Regal (gelb). Kopf, Reiter, Chips und die untere Leiste nehmen ihre Farbe von
// hier, damit man immer sieht, in welchem Bereich man ist.

import { type Feather } from "@expo/vector-icons";
import { type ComponentProps } from "react";

export type AreaKey = "pfad" | "online" | "regal";

export type Area = {
  key: AreaKey;
  route: "/kampagne" | "/online" | "/sammlung";
  icon: ComponentProps<typeof Feather>["name"];
  /** Tonnen-Farbe (Flächen, gewählter Reiter). */
  fill: string;
  /** Dunkler Ton für Text auf hellem Grund. */
  sign: string;
  /** Schrift/Symbole auf `fill`. */
  on: string;
  /** Verlauf des Seitenkopfs (dunkel → hell). */
  sky: readonly [string, string, string];
};

export const AREAS: Record<AreaKey, Area> = {
  pfad: {
    key: "pfad",
    route: "/kampagne",
    icon: "map",
    fill: "#2FA86E",
    sign: "#1E7A4C",
    on: "#FFFFFF",
    sky: ["#1E7A4C", "#2FA86E", "#3FB87F"],
  },
  online: {
    key: "online",
    route: "/online",
    icon: "globe",
    fill: "#3D82D9",
    sign: "#245E9E",
    on: "#FFFFFF",
    sky: ["#245E9E", "#3D82D9", "#5A97E0"],
  },
  regal: {
    key: "regal",
    route: "/sammlung",
    icon: "book-open",
    fill: "#E3A92E",
    sign: "#7A5600",
    on: "#2B1D00",
    sky: ["#C98F14", "#E3A92E", "#F0C463"],
  },
};

export const AREA_ORDER: readonly AreaKey[] = ["pfad", "online", "regal"];
