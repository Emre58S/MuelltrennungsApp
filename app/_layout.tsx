// Datei: app/_layout.tsx

import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_500Medium,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_700Bold,
  AtkinsonHyperlegibleNext_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/atkinson-hyperlegible-next";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { AppSettingsProvider, useAppSettings } from "@/providers/app-settings";
import { installDevErrorReporter } from "@/utils/dev-error-reporter";

installDevErrorReporter();
SplashScreen.preventAutoHideAsync();

function RootStack({ fontsDone }: { fontsDone: boolean }) {
  const { ready, colors, scheme } = useAppSettings();
  const done = fontsDone && ready;

  useEffect(() => {
    if (done) SplashScreen.hideAsync();
  }, [done]);

  if (!done) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      />
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_500Medium,
    AtkinsonHyperlegibleNext_600SemiBold,
    AtkinsonHyperlegibleNext_700Bold,
    AtkinsonHyperlegibleNext_800ExtraBold,
  });

  return (
    <AppSettingsProvider>
      {/* Bei Schriftfehler trotzdem starten (dann mit Systemschrift). */}
      <RootStack fontsDone={fontsLoaded || !!fontError} />
    </AppSettingsProvider>
  );
}
