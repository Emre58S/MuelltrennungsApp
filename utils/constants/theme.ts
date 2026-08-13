import { Platform } from "react-native";

// ── Zentrale Farbpalette ──────────────────────────────────────────────
export const AppColors = {
  // Hintergründe
  bg: "#0B1120",
  card: "#151E32",
  cardLight: "#1E2A45",
  cardBorder: "#2A3A5C",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#9AA7C2",
  textMuted: "#7C8CA8",
  textSubtle: "#C4CDE0",

  // Akzentfarben
  green: "#2ECC71",
  blue: "#3B82F6",
  purple: "#A855F7",
  indigo: "#6366F1",
  yellow: "#F5C518",
  red: "#EF4444",
  orange: "#F59E0B",

  // Kategorie-Farben (Mülltonnen)
  biompiell: "#8B5E34",
  papier: "#3B82F6",
  gelberSack: "#F5C518",
  glas: "#2ECC71",
  restmuell: "#4B5563",
  sondermuell: "#EF4444",
} as const;

// ── Spacing ───────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ── Border Radius ─────────────────────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 20,
  pill: 99,
} as const;

// ── Font Sizes ────────────────────────────────────────────────────────
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

// ── Alte Colors-Struktur (Kompatibilität mit Tab-Layout) ──────────────
const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: AppColors.bg,
    tint: AppColors.green,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: AppColors.green,
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
