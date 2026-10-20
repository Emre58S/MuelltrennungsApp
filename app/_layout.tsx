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
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { AppSettingsProvider, useAppSettings } from "@/providers/app-settings";
import { installDevErrorReporter } from "@/utils/dev-error-reporter";
import { silenceKnownWarnings } from "@/utils/silence-warnings";

// Filter zuletzt einhängen: er liegt dann außen und hält harmlose
// Bibliotheks-Warnungen auf, bevor der Reporter sie an den PC schickt.
installDevErrorReporter();
silenceKnownWarnings();
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
    // Gesten-Wurzel für die ganze App (Menü und Spiel nutzen Wisch-Gesten).
    <GestureHandlerRootView style={styles.root}>
      <AppSettingsProvider>
        {/* Bei Schriftfehler trotzdem starten (dann mit Systemschrift). */}
        <RootStack fontsDone={fontsLoaded || !!fontError} />
      </AppSettingsProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
