// Datei: constants/mode-themes.ts
// Eigene Farbwelt für jeden Spielmodus (Menü-Hintergründe).
// Alle Text/Hintergrund-Paare sind auf WCAG AA (≥ 4.5:1) ausgelegt.

import { type GameMode } from "@/constants/modes";
import { type ColorScheme } from "@/constants/theme";

export type ModeTheme = {
  /** Grundfläche der Karte. */
  bg: string;
  /** Dekor-Farben (nur Hintergrund, nie unter Text mit geringem Kontrast). */
  deco1: string;
  deco2: string;
  /** Kräftige Akzentfarbe (Icon-Kreis, Badge, Rand). */
  accent: string;
  /** Text/Icon auf der Akzentfarbe. */
  onAccent: string;
  /** Text auf der Kartenfläche. */
  text: string;
  textSecondary: string;
};

export const ModeThemes: Record<ColorScheme, Record<GameMode, ModeTheme>> = {
  light: {
    // Üben: ruhige Wiese
    endless: {
      bg: "#E3F3E8",
      deco1: "#C4E6D0",
      deco2: "#A3D6B6",
      accent: "#1E7A4C",
      onAccent: "#FFFFFF",
      text: "#12361F",
      textSecondary: "#2E5A42",
    },
    // Ohne Fehler: Schutzschild / Radar
    survival: {
      bg: "#E1ECF8",
      deco1: "#BCD5F0",
      deco2: "#92BAE6",
      accent: "#245E9E",
      onAccent: "#FFFFFF",
      text: "#12304F",
      textSecondary: "#1F3A57",
    },
    // Gegen die Zeit: Uhr / Gold
    time: {
      bg: "#FBEFD3",
      deco1: "#F4DB98",
      deco2: "#E9C060",
      accent: "#7A5600",
      onAccent: "#FFFFFF",
      text: "#3B2A00",
      textSecondary: "#5C4300",
    },
    // Zielwurf: Korb / Orange
    aim: {
      bg: "#FCE9DE",
      deco1: "#F6CDB3",
      deco2: "#EEAA80",
      accent: "#A8441A",
      onAccent: "#FFFFFF",
      text: "#43190A",
      textSecondary: "#62301A",
    },
  },
  dark: {
    endless: {
      bg: "#16301F",
      deco1: "#1F4A31",
      deco2: "#2A6044",
      accent: "#4CC38A",
      onAccent: "#06281A",
      text: "#EAF7EF",
      textSecondary: "#BFE0CD",
    },
    survival: {
      bg: "#172A42",
      deco1: "#1F3B5E",
      deco2: "#2B4F7C",
      accent: "#86B7F0",
      onAccent: "#0B1F36",
      text: "#E8F1FC",
      textSecondary: "#B6CCE6",
    },
    time: {
      bg: "#352C12",
      deco1: "#4A3D17",
      deco2: "#6B5720",
      accent: "#E8C46A",
      onAccent: "#2A2000",
      text: "#FBF1D3",
      textSecondary: "#E0D2A4",
    },
    aim: {
      bg: "#3A1E12",
      deco1: "#552C19",
      deco2: "#753D22",
      accent: "#F29A6B",
      onAccent: "#2E1206",
      text: "#FCEBE2",
      textSecondary: "#E8C6B4",
    },
  },
};
