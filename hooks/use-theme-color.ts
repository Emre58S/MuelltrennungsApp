// Datei: hooks/use-theme-color.ts

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type ThemeName = "light" | "dark";

export function useThemeColor(
  props: {
    light?: string;
    dark?: string;
  },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) {
  const colorScheme = useColorScheme();

  // "unspecified" wird hier automatisch auf "light" zurückgeführt.
  const theme: ThemeName = colorScheme === "dark" ? "dark" : "light";

  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}
