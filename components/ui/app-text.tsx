import { Text, type TextProps } from "react-native";

import { type ThemeColors, Type, type TypeVariant } from "@/constants/theme";
import { useAppTheme } from "@/providers/app-settings";

type Tone = "text" | "textSecondary" | "textMuted" | keyof ThemeColors;

export type AppTextProps = TextProps & {
  variant?: TypeVariant;
  /** Farbe aus dem Theme (Standard: text). */
  tone?: Tone;
  /** Feste Farbe – überschreibt tone (z. B. Text auf Tonnenfarbe). */
  color?: string;
  center?: boolean;
};

/** Text mit App-Schrift, Theme-Farbe und begrenzter Systemskalierung. */
export function AppText({
  variant = "body",
  tone = "text",
  color,
  center,
  style,
  maxFontSizeMultiplier = 1.6,
  ...rest
}: AppTextProps) {
  const { colors } = useAppTheme();

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        Type[variant],
        { color: color ?? colors[tone] },
        center && { textAlign: "center" },
        style,
      ]}
      {...rest}
    />
  );
}
