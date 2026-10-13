import { Platform, type TextStyle } from "react-native";

/* ═════════════════════════════════════════════════════════════
 * DESIGN-SYSTEM v2 — „Klar & freundlich“
 *
 * Leitlinien (siehe Planung):
 *  - Zielgruppe: alle, die mit Mülltrennung unsicher sind – oft ohne
 *    (gute) Deutschkenntnisse. → Ruhig, klar, große Schrift, Icons zuerst.
 *  - Farbe hat Bedeutung: Grün = richtig/Aktion, Orange = „noch nicht ganz“
 *    (kein Alarm-Rot), Tonnenfarben = echte deutsche Tonnen.
 *  - Alle Text/Hintergrund-Paare sind auf WCAG 2.1 AA (≥ 4.5:1) geprüft.
 *  - Mindestschriftgröße 12, Fließtext 17, Tippflächen ≥ 48.
 * ═════════════════════════════════════════════════════════════ */

export type ColorScheme = "light" | "dark";

export type ThemeColors = {
  // Flächen
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  overlay: string;
  hud: string;
  hudBorder: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;

  // Aktion / Erfolg
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;

  // „Noch nicht ganz“ (statt Fehler-Rot)
  warning: string;
  warningSoft: string;
  onWarningSoft: string;

  // Belohnung (XP, Bestwert)
  gold: string;
  goldSoft: string;
  onGoldSoft: string;

  info: string;
  infoSoft: string;

  // Nur für wirklich destruktive Aktionen (Daten löschen)
  danger: string;
};

const light: ThemeColors = {
  bg: "#F6F4EE",
  surface: "#FFFFFF",
  surfaceAlt: "#EEEBE3",
  border: "#DDD8CC",
  overlay: "rgba(27,36,32,0.45)",
  hud: "rgba(255,255,255,0.94)",
  hudBorder: "rgba(27,36,32,0.10)",

  text: "#1B2420",
  textSecondary: "#4A5650",
  textMuted: "#5F6B65",

  primary: "#1E7A4C",
  primaryPressed: "#17633D",
  onPrimary: "#FFFFFF",
  primarySoft: "#DDF0E4",
  onPrimarySoft: "#145536",

  warning: "#A65300",
  warningSoft: "#FCEBD7",
  onWarningSoft: "#7A3D00",

  gold: "#7A5600",
  goldSoft: "#F8EDCF",
  onGoldSoft: "#7A5600",

  info: "#245E9E",
  infoSoft: "#E1ECF8",

  danger: "#B3261E",
};

const dark: ThemeColors = {
  bg: "#101614",
  surface: "#19211E",
  surfaceAlt: "#222C28",
  border: "#2E3A35",
  overlay: "rgba(0,0,0,0.55)",
  hud: "rgba(16,22,20,0.90)",
  hudBorder: "rgba(255,255,255,0.12)",

  text: "#EEF3F0",
  textSecondary: "#B7C2BC",
  textMuted: "#94A09A",

  primary: "#4CC38A",
  primaryPressed: "#3DA874",
  onPrimary: "#06281A",
  primarySoft: "#1B3A2B",
  onPrimarySoft: "#BDEBD2",

  warning: "#F0A04B",
  warningSoft: "#3A2A16",
  onWarningSoft: "#F8D2A6",

  gold: "#E8C46A",
  goldSoft: "#3A321B",
  onGoldSoft: "#F3DFA8",

  info: "#86B7F0",
  infoSoft: "#1C2B3D",

  danger: "#F28B82",
};

export const Palettes: Record<ColorScheme, ThemeColors> = { light, dark };

// ── Tonnen (wie die echten deutschen Tonnen) ──────────────────────────

export type BinKey = "bio" | "gelb" | "rest" | "papier" | "glas" | "sonder";

export const BinColors: Record<
  BinKey,
  { fill: string; on: string; icon: string }
> = {
  bio: { fill: "#7A5230", on: "#FFFFFF", icon: "🍂" },
  gelb: { fill: "#E8B500", on: "#2A2200", icon: "🧴" },
  rest: { fill: "#4A5560", on: "#FFFFFF", icon: "🗑️" },
  papier: { fill: "#245E9E", on: "#FFFFFF", icon: "📰" },
  glas: { fill: "#2E7D4F", on: "#FFFFFF", icon: "🍾" },
  sonder: { fill: "#B3261E", on: "#FFFFFF", icon: "🔋" },
};

// ── Schrift: Atkinson Hyperlegible Next ───────────────────────────────
// Vom Braille Institute für maximale Unterscheidbarkeit der Zeichen
// entwickelt (I/l/1, O/0, Umlaute) – hilft Menschen, die Deutsch oder das
// lateinische Alphabet noch lernen. Eine Familie, wenige Stärken.

export const FontFamily = {
  regular: "AtkinsonHyperlegibleNext_400Regular",
  medium: "AtkinsonHyperlegibleNext_500Medium",
  semibold: "AtkinsonHyperlegibleNext_600SemiBold",
  bold: "AtkinsonHyperlegibleNext_700Bold",
  extrabold: "AtkinsonHyperlegibleNext_800ExtraBold",
} as const;

export type TypeVariant =
  | "display"
  | "title"
  | "heading"
  | "body"
  | "bodyStrong"
  | "label"
  | "caption"
  | "overline"
  | "number";

export const Type: Record<TypeVariant, TextStyle> = {
  display: { fontFamily: FontFamily.extrabold, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: FontFamily.extrabold, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: FontFamily.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: FontFamily.regular, fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24 },
  label: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
  },
  number: { fontFamily: FontFamily.extrabold, fontSize: 24, lineHeight: 28 },
};

// ── Spacing / Radius / Größen ─────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/** Mindestgröße für Tippflächen (WCAG / Material: 48dp). */
export const TOUCH_MIN = 48;

export const Shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 2 },
});

/* ═════════════════════════════════════════════════════════════
 * ALT – wird schrittweise ersetzt (login, register, tutorial,
 * alte Template-Komponenten). Nicht in neuem Code verwenden.
 * ═════════════════════════════════════════════════════════════ */

export const AppColors = {
  bg: "#0B1120",
  card: "#151E32",
  cardLight: "#1E2A45",
  cardBorder: "#2A3A5C",
  textPrimary: "#FFFFFF",
  textSecondary: "#9AA7C2",
  textMuted: "#7C8CA8",
  textSubtle: "#C4CDE0",
  green: "#2ECC71",
  blue: "#3B82F6",
  purple: "#A855F7",
  indigo: "#6366F1",
  yellow: "#F5C518",
  red: "#EF4444",
  orange: "#F59E0B",
  biompiell: "#8B5E34",
  papier: "#3B82F6",
  gelberSack: "#F5C518",
  glas: "#2ECC71",
  restmuell: "#4B5563",
  sondermuell: "#EF4444",
} as const;

export const FontSize = {
  xs: 12,
  sm: 13,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  xxl: 22,
  title: 28,
  hero: 32,
} as const;

export const Colors = {
  light: {
    text: light.text,
    background: light.bg,
    tint: light.primary,
    icon: light.textMuted,
    tabIconDefault: light.textMuted,
    tabIconSelected: light.primary,
  },
  dark: {
    text: dark.text,
    background: dark.bg,
    tint: dark.primary,
    icon: dark.textMuted,
    tabIconDefault: dark.textMuted,
    tabIconSelected: dark.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
